#!/usr/bin/env python3
"""Query the live MemPalace corpus for the AnythingLLM custom skill."""

from __future__ import annotations

import argparse
import json
import os
import sys


def build_where_filter(wing: str | None, room: str | None):
    conditions = []
    if wing:
        conditions.append({"wing": wing})
    if room:
        conditions.append({"room": room})
    if not conditions:
        return None
    if len(conditions) == 1:
        return conditions[0]
    return {"$and": conditions}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--query", required=True)
    parser.add_argument("--limit", type=int, default=5)
    parser.add_argument("--wing", default=None)
    parser.add_argument("--room", default=None)
    parser.add_argument(
        "--palace-path",
        default=os.path.expanduser(r"~\.mempalace\palace2"),
    )
    args = parser.parse_args()

    try:
        import chromadb

        client = chromadb.PersistentClient(path=args.palace_path)
        collection = client.get_collection("mempalace_drawers")
        results = collection.query(
            query_texts=[args.query],
            n_results=max(1, min(args.limit, 12)),
            include=["documents", "metadatas", "distances"],
            where=build_where_filter(args.wing, args.room),
        )

        output = []
        documents = (results.get("documents") or [[]])[0]
        metadatas = (results.get("metadatas") or [[]])[0]
        distances = (results.get("distances") or [[]])[0]

        for index, document in enumerate(documents):
            metadata = metadatas[index] if index < len(metadatas) else {}
            distance = distances[index] if index < len(distances) else None
            excerpt = str(document or "").strip().replace("\r\n", "\n")
            if len(excerpt) > 1200:
                excerpt = excerpt[:1200].rstrip() + "..."
            similarity = round(1 - distance, 3) if distance is not None else 0
            output.append(
                {
                    "content": excerpt,
                    "wing": metadata.get("wing", ""),
                    "room": metadata.get("room", ""),
                    "source": metadata.get("source_file", ""),
                    "filedAt": metadata.get("filed_at", ""),
                    "similarity": similarity,
                }
            )

        json.dump({"query": args.query, "results": output}, sys.stdout)
        return 0
    except Exception as exc:  # pragma: no cover - runtime-only path
        json.dump({"query": args.query, "results": [], "error": str(exc)}, sys.stdout)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
