#!/usr/bin/env python3
"""MemPalace persist bridge - add content to the palace from ChefFlow.

Used by lib/ai/mempalace-persist.ts to store Remy conversation summaries.

Usage:
  py scripts/mempalace-persist.py --wing remy-sessions --room conversation-summaries --content "..." [--source "remy:abc123"]
"""

import sys
import json
import argparse
import hashlib
from datetime import datetime


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--wing", required=True)
    parser.add_argument("--room", required=True)
    parser.add_argument("--content", required=True)
    parser.add_argument("--source", default="chefflow")
    args = parser.parse_args()

    try:
        import chromadb
        from mempalace.config import DEFAULT_PALACE_PATH

        client = chromadb.PersistentClient(path=DEFAULT_PALACE_PATH)
        col = client.get_or_create_collection("mempalace_drawers")

        # Generate a unique drawer ID
        content_hash = hashlib.sha256(args.content.encode()).hexdigest()[:12]
        drawer_id = f"drawer_{args.wing}_{args.room}_{content_hash}"

        # Check for duplicates (same content hash)
        existing = col.get(ids=[drawer_id])
        if existing and existing["ids"]:
            json.dump({"status": "duplicate", "id": drawer_id}, sys.stdout)
            return

        col.add(
            ids=[drawer_id],
            documents=[args.content],
            metadatas=[{
                "wing": args.wing,
                "room": args.room,
                "source_file": args.source,
                "added_by": "chefflow",
                "filed_at": datetime.now().isoformat(),
            }],
        )

        json.dump({"status": "ok", "id": drawer_id}, sys.stdout)

    except Exception as e:
        json.dump({"status": "error", "error": str(e)}, sys.stdout)
        sys.exit(1)


if __name__ == "__main__":
    main()
