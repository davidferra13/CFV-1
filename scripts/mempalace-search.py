#!/usr/bin/env python3
"""MemPalace search bridge for ChefFlow.

Outputs JSON to stdout. Used by lib/ai/mempalace-bridge.ts.
Exit 0 on success, 1 on error (with JSON error object).

Usage:
  py scripts/mempalace-search.py "what does Mrs. Chen like" [--limit 5] [--wing chefflow-conversations]
"""

import sys
import json
import argparse

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("query", help="Search query")
    parser.add_argument("--limit", type=int, default=5)
    parser.add_argument("--wing", type=str, default=None)
    parser.add_argument("--room", type=str, default=None)
    args = parser.parse_args()

    try:
        import chromadb
        from mempalace.config import DEFAULT_PALACE_PATH

        palace_path = DEFAULT_PALACE_PATH
        client = chromadb.PersistentClient(path=palace_path)
        col = client.get_collection("mempalace_drawers")

        where_filter = None
        conditions = []
        if args.wing:
            conditions.append({"wing": args.wing})
        if args.room:
            conditions.append({"room": args.room})
        if len(conditions) == 1:
            where_filter = conditions[0]
        elif len(conditions) > 1:
            where_filter = {"$and": conditions}

        results = col.query(
            query_texts=[args.query],
            n_results=args.limit,
            include=["documents", "metadatas", "distances"],
            where=where_filter,
        )

        output = []
        if results and results["documents"] and results["documents"][0]:
            for i, doc in enumerate(results["documents"][0]):
                meta = results["metadatas"][0][i] if results["metadatas"] else {}
                dist = results["distances"][0][i] if results["distances"] else None
                similarity = round(1 - dist, 3) if dist is not None else 0
                output.append({
                    "content": doc[:500],  # Cap content length for context budget
                    "wing": meta.get("wing", ""),
                    "room": meta.get("room", ""),
                    "source": meta.get("source_file", ""),
                    "filedAt": meta.get("filed_at", ""),
                    "similarity": similarity,
                })

        json.dump({"results": output, "query": args.query}, sys.stdout)

    except ImportError:
        json.dump({"error": "mempalace not installed", "results": []}, sys.stdout)
        sys.exit(1)
    except Exception as e:
        json.dump({"error": str(e), "results": []}, sys.stdout)
        sys.exit(1)

if __name__ == "__main__":
    main()
