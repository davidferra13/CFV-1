#!/usr/bin/env python3
"""Bootstrap an AnythingLLM workspace for ChefFlow and install a live MemPalace skill.

This script is intentionally pragmatic:
- it creates or reuses an AnythingLLM API key from the local desktop SQLite DB
- it creates or updates a dedicated ChefFlow workspace
- it uploads a curated bundled knowledge pack from the repo into that workspace
- it installs a custom agent skill that queries the active MemPalace palace2 corpus

The knowledge pack is docs-heavy on purpose. Live historical/codebase recall comes from
the MemPalace agent skill so we avoid flooding AnythingLLM with every transient repo file.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import secrets
import shutil
import sqlite3
import sys
import time
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable

import requests


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_STORAGE_DIR = Path.home() / "AppData" / "Roaming" / "anythingllm-desktop" / "storage"
DEFAULT_ANYTHINGLLM_BASE_URL = "http://127.0.0.1:3001/api"
DEFAULT_WORKSPACE_NAME = "ChefFlow Palace"
DEFAULT_WORKSPACE_SLUG = "chef-flow-palace"
DEFAULT_MAX_CHARS = 220_000

ROOT_FILES = {
    "README.md",
    "CLAUDE.md",
    "MEMORY.md",
    "package.json",
    "tsconfig.json",
    "next.config.js",
    "tailwind.config.ts",
    "middleware.ts",
    ".env.example",
    ".env.local.example",
}

INCLUDE_DIRS = (
    "docs",
    "project-map",
    "prompts",
    "memory",
    "config",
    "types",
    "database",
    "scripts",
)

INCLUDE_PREFIXES = (
    "lib/ai",
    "lib/openclaw",
    "app/api",
)

EXCLUDE_DIR_NAMES = {
    ".git",
    ".next",
    ".next-dev",
    "node_modules",
    "test-results",
    "public",
    "logs",
    "screenshots",
    "builds",
    "results",
    "storage",
    "graphify",
    "graphify-out",
    "coverage",
    ".claude",
    "tmp",
    ".openclaw-build",
    ".openclaw-temp",
    ".openclaw-deploy",
}

EXCLUDE_SUFFIXES = {
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".ico",
    ".svg",
    ".mp4",
    ".mov",
    ".pdf",
    ".zip",
    ".gz",
    ".tar",
    ".sqlite",
    ".sqlite3",
    ".db",
    ".tsbuildinfo",
    ".woff",
    ".woff2",
    ".ttf",
    ".eot",
    ".mp3",
    ".wav",
    ".ogg",
    ".wasm",
}

EXCLUDE_NAME_PARTS = (
    ".tmp-",
    "tmp-",
    ".next-",
    ".log",
    ".err",
    ".out",
    ".pid",
)


@dataclass(frozen=True)
class SelectedFile:
    group: str
    rel_path: str
    absolute_path: Path


@dataclass(frozen=True)
class Bundle:
    title: str
    description: str
    content: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--storage-dir", default=str(DEFAULT_STORAGE_DIR))
    parser.add_argument("--base-url", default=DEFAULT_ANYTHINGLLM_BASE_URL)
    parser.add_argument("--workspace-name", default=DEFAULT_WORKSPACE_NAME)
    parser.add_argument("--workspace-slug", default=DEFAULT_WORKSPACE_SLUG)
    parser.add_argument("--max-chars", type=int, default=DEFAULT_MAX_CHARS)
    parser.add_argument("--skip-skill", action="store_true")
    parser.add_argument("--skip-upload", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def slugify(value: str) -> str:
    cleaned = []
    previous_dash = False
    for char in value.lower():
        if char.isalnum():
            cleaned.append(char)
            previous_dash = False
            continue
        if previous_dash:
            continue
        cleaned.append("-")
        previous_dash = True
    return "".join(cleaned).strip("-")


def group_for_rel_path(rel_path: str) -> str:
    if rel_path.startswith("lib/ai/"):
        return "lib-ai"
    if rel_path.startswith("lib/openclaw/"):
        return "lib-openclaw"
    if rel_path.startswith("app/api/"):
        return "app-api"
    return rel_path.split("/", 1)[0]


def should_include_path(path: Path) -> bool:
    if any(part in EXCLUDE_DIR_NAMES for part in path.parts):
        return False
    if path.suffix.lower() in EXCLUDE_SUFFIXES:
        return False
    lowered_name = path.name.lower()
    if any(part in lowered_name for part in EXCLUDE_NAME_PARTS):
        return False
    return True


def iter_selected_files() -> list[SelectedFile]:
    selected: list[SelectedFile] = []
    seen: set[str] = set()

    for include_dir in INCLUDE_DIRS:
        root = REPO_ROOT / include_dir
        if not root.exists():
            continue
        for file_path in root.rglob("*"):
            if not file_path.is_file() or not should_include_path(file_path):
                continue
            rel_path = file_path.relative_to(REPO_ROOT).as_posix()
            if rel_path in seen:
                continue
            seen.add(rel_path)
            selected.append(
                SelectedFile(
                    group=group_for_rel_path(rel_path),
                    rel_path=rel_path,
                    absolute_path=file_path,
                )
            )

    for prefix in INCLUDE_PREFIXES:
        root = REPO_ROOT / prefix
        if not root.exists():
            continue
        for file_path in root.rglob("*"):
            if not file_path.is_file() or not should_include_path(file_path):
                continue
            rel_path = file_path.relative_to(REPO_ROOT).as_posix()
            if rel_path in seen:
                continue
            seen.add(rel_path)
            selected.append(
                SelectedFile(
                    group=group_for_rel_path(rel_path),
                    rel_path=rel_path,
                    absolute_path=file_path,
                )
            )

    for name in sorted(ROOT_FILES):
        file_path = REPO_ROOT / name
        if not file_path.exists() or not file_path.is_file() or not should_include_path(file_path):
            continue
        rel_path = file_path.relative_to(REPO_ROOT).as_posix()
        if rel_path in seen:
            continue
        seen.add(rel_path)
        selected.append(
            SelectedFile(
                group="root",
                rel_path=rel_path,
                absolute_path=file_path,
            )
        )

    return sorted(selected, key=lambda item: (item.group, item.rel_path))


def read_text(path: Path) -> str:
    for encoding in ("utf-8", "utf-8-sig", "cp1252", "latin-1"):
        try:
            return path.read_text(encoding=encoding)
        except UnicodeDecodeError:
            continue
    return path.read_text(encoding="utf-8", errors="replace")


def build_bundles(selected_files: Iterable[SelectedFile], max_chars: int) -> list[Bundle]:
    generated_at = datetime.now().isoformat(timespec="seconds")
    bundles: list[Bundle] = [
        Bundle(
            title="ChefFlow Palace - Overview",
            description="Bootstrapped ChefFlow knowledge workspace overview and usage notes.",
            content=(
                "ChefFlow Palace workspace\n"
                f"Generated: {generated_at}\n\n"
                "Purpose:\n"
                "- Ground AnythingLLM on the highest-signal ChefFlow repo knowledge.\n"
                "- Keep deep historical recall in a live MemPalace custom skill pointed at palace2.\n\n"
                "What is loaded here:\n"
                "- Docs, specs, project maps, prompts, memory notes, config, database migrations, scripts.\n"
                "- Focused code surfaces: lib/ai, lib/openclaw, app/api.\n"
                "- Root contract files like README.md, CLAUDE.md, package.json, tsconfig.json.\n\n"
                "How to use this workspace:\n"
                "- Ask normal product, architecture, workflow, or implementation questions directly.\n"
                "- For recovered context, prior agent sessions, historical audits, or conversation memory, use @agent so it can call the ChefFlow MemPalace Search skill.\n"
                "- Treat answers from docs/code as primary. Treat MemPalace as recovery and evidence when the answer depends on prior work or buried context.\n"
            ),
        )
    ]

    grouped: dict[str, list[SelectedFile]] = {}
    for item in selected_files:
        grouped.setdefault(item.group, []).append(item)

    for group, items in sorted(grouped.items()):
        bundle_index = 1
        header = (
            f"ChefFlow knowledge bundle\n"
            f"Group: {group}\n"
            f"Generated: {generated_at}\n"
            "Each file section begins with `### FILE:`.\n\n"
        )
        current_sections: list[str] = [header]
        current_length = len(header)
        current_files = 0

        def flush() -> None:
            nonlocal bundle_index, current_sections, current_length, current_files
            if current_files == 0:
                return
            bundles.append(
                Bundle(
                    title=f"ChefFlow Bundle - {group} - {bundle_index:03d}",
                    description=f"ChefFlow {group} bundle {bundle_index:03d} generated from {current_files} file sections.",
                    content="".join(current_sections),
                )
            )
            bundle_index += 1
            current_sections = [header]
            current_length = len(header)
            current_files = 0

        for item in items:
            content = read_text(item.absolute_path).strip()
            if not content:
                continue
            section = (
                f"### FILE: {item.rel_path}\n"
                f"{content}\n\n"
            )
            if current_files > 0 and current_length + len(section) > max_chars:
                flush()
            current_sections.append(section)
            current_length += len(section)
            current_files += 1

        flush()

    return bundles


class AnythingLLMClient:
    def __init__(self, base_url: str, storage_dir: Path, dry_run: bool = False) -> None:
        self.base_url = base_url.rstrip("/")
        self.storage_dir = storage_dir
        self.dry_run = dry_run
        self.api_key = self._ensure_api_key()
        self.session = requests.Session()
        self.session.headers.update({"Authorization": f"Bearer {self.api_key}"})

    @property
    def db_path(self) -> Path:
        return self.storage_dir / "anythingllm.db"

    def _ensure_api_key(self) -> str:
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        con = sqlite3.connect(self.db_path)
        cur = con.cursor()
        cur.execute("SELECT secret FROM api_keys ORDER BY id ASC LIMIT 1")
        row = cur.fetchone()
        if row and row[0]:
            con.close()
            return row[0]

        secret = "cfv1-" + secrets.token_urlsafe(24)
        cur.execute("INSERT INTO api_keys (secret, createdBy) VALUES (?, ?)", (secret, None))
        con.commit()
        con.close()
        return secret

    def request(self, method: str, path: str, **kwargs):
        if self.dry_run:
            return {"dry_run": True, "method": method, "path": path}
        timeout = kwargs.pop("timeout", 120)
        response = self.session.request(
            method=method,
            url=f"{self.base_url}{path}",
            timeout=timeout,
            **kwargs,
        )
        response.raise_for_status()
        if not response.text:
            return {}
        return response.json()

    def list_workspaces(self) -> list[dict]:
        payload = self.request("GET", "/v1/workspaces")
        return payload.get("workspaces", [])

    def ensure_workspace(self, name: str, slug: str) -> dict:
        for workspace in self.list_workspaces():
            if workspace.get("name") == name:
                return workspace
            if workspace.get("slug") == slug:
                return workspace
        payload = self.request(
            "POST",
            "/v1/workspace/new",
            json={
                "name": name,
                "similarityThreshold": 0.35,
                "openAiTemp": 0.2,
                "openAiHistory": 20,
                "openAiPrompt": (
                    "You are ChefFlow Palace, a grounded knowledge assistant for the ChefFlow codebase and operating model. "
                    "Prefer workspace documents and cite file paths or document names when possible. "
                    "If the answer depends on historical session context or recovered memory, tell the user to use @agent with the ChefFlow MemPalace Search skill."
                ),
                "queryRefusalResponse": "I do not have grounded ChefFlow evidence for that yet.",
                "chatMode": "chat",
                "topN": 8,
            },
        )
        return payload.get("workspace", {})

    def update_workspace(self, slug: str, **kwargs) -> dict:
        return self.request("POST", f"/v1/workspace/{slug}/update", json=kwargs)

    def list_documents(self) -> list[dict]:
        payload = self.request("GET", "/v1/documents")
        return list(flatten_document_tree(payload.get("localFiles")))

    def remove_documents(self, names: list[str]) -> None:
        if not names:
            return
        self.request("DELETE", "/v1/system/remove-documents", json={"names": names})

    def upload_raw_text(self, bundle: Bundle) -> dict:
        return self.request(
            "POST",
            "/v1/document/raw-text",
            json={
                "textContent": bundle.content,
                "metadata": {
                    "title": bundle.title,
                    "docAuthor": "ChefFlow bootstrap",
                    "description": bundle.description,
                    "docSource": "ChefFlow AnythingLLM bootstrap",
                },
            },
            timeout=300,
        )

    def update_embeddings(self, workspace_slug: str, adds: list[str]) -> dict:
        return self.request(
            "POST",
            f"/v1/workspace/{workspace_slug}/update-embeddings",
            json={"adds": adds, "deletes": []},
            timeout=900,
        )

    def chat(self, workspace_slug: str, message: str) -> dict:
        return self.request(
            "POST",
            f"/v1/workspace/{workspace_slug}/chat",
            json={"message": message, "mode": "query", "reset": False},
        )


def flatten_document_tree(node) -> Iterable[dict]:
    if not node:
        return []
    if node.get("type") == "file":
        return [node]
    items = []
    for child in node.get("items", []):
        items.extend(flatten_document_tree(child))
    return items


def normalize_document_location(storage_dir: Path, location: str) -> str:
    cleaned = str(location or "").strip()
    if not cleaned:
        return ""
    try:
        path = Path(cleaned)
        return path.relative_to(storage_dir / "documents").as_posix()
    except ValueError:
        return cleaned.replace("\\", "/")


def chunked(items: list[str], size: int) -> Iterable[list[str]]:
    for start in range(0, len(items), size):
        yield items[start : start + size]


def install_skill(storage_dir: Path, dry_run: bool = False) -> Path:
    source_dir = REPO_ROOT / "anythingllm" / "agent-skills" / "chef-flow-mempalace-search"
    destination_dir = storage_dir / "plugins" / "agent-skills" / "chef-flow-mempalace-search"
    if dry_run:
        return destination_dir
    destination_dir.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(source_dir, destination_dir, dirs_exist_ok=True)
    return destination_dir


def main() -> int:
    args = parse_args()
    storage_dir = Path(args.storage_dir)
    workspace_slug = slugify(args.workspace_slug or args.workspace_name)

    client = AnythingLLMClient(args.base_url, storage_dir, dry_run=args.dry_run)

    print(f"[1/5] Using AnythingLLM storage at {storage_dir}")
    print(f"[1/5] API key ready with prefix {client.api_key[:12]}")

    if not args.skip_skill:
        skill_dir = install_skill(storage_dir, dry_run=args.dry_run)
        print(f"[2/5] Installed MemPalace skill into {skill_dir}")
    else:
        print("[2/5] Skipped MemPalace skill install")

    workspace = client.ensure_workspace(args.workspace_name, workspace_slug)
    if workspace:
        workspace_slug = workspace.get("slug", workspace_slug)
    client.update_workspace(
        workspace_slug,
        name=args.workspace_name,
        openAiTemp=0.2,
        openAiHistory=20,
        similarityThreshold=0.35,
        topN=8,
        openAiPrompt=(
            "You are ChefFlow Palace, a grounded knowledge assistant for the ChefFlow codebase and operating model. "
            "Prefer workspace documents and cite file paths or document names when possible. "
            "If the answer depends on historical session context or recovered memory, tell the user to use @agent with the ChefFlow MemPalace Search skill."
        ),
    )
    print(f"[3/5] Workspace ready: {args.workspace_name} ({workspace_slug})")

    selected_files = iter_selected_files()
    bundles = build_bundles(selected_files, max_chars=args.max_chars)
    print(f"[4/5] Built {len(bundles)} upload bundles from {len(selected_files)} curated files")

    if not args.skip_upload:
        existing = client.list_documents()
        generated_names = [
            doc["name"]
            for doc in existing
            if str(doc.get("docSource", "")) == "ChefFlow AnythingLLM bootstrap"
        ]
        if generated_names:
            print(f"[4/5] Removing {len(generated_names)} previous generated documents")
            client.remove_documents(generated_names)
            time.sleep(0.5)

        uploaded_locations: list[str] = []
        for index, bundle in enumerate(bundles, start=1):
            result = client.upload_raw_text(bundle)
            location = (result.get("documents") or [{}])[0].get("location", "")
            relative_location = normalize_document_location(storage_dir, location)
            uploaded_locations.append(relative_location)
            print(f"[4/5] Uploaded {index}/{len(bundles)}: {bundle.title} -> {relative_location}")

        for index, batch in enumerate(chunked(uploaded_locations, 1), start=1):
            if not batch:
                continue
            attempts = 0
            while True:
                attempts += 1
                try:
                    client.update_embeddings(workspace_slug, batch)
                    print(
                        f"[4/5] Attached {index}/{len(uploaded_locations)}: {batch[0]}"
                    )
                    break
                except requests.RequestException as exc:
                    if attempts >= 3:
                        raise
                    wait_seconds = attempts * 5
                    print(
                        f"[4/5] Attach retry {attempts} for {batch[0]} after error: {exc}. Waiting {wait_seconds}s"
                    )
                    time.sleep(wait_seconds)
    else:
        print("[4/5] Skipped workspace document upload")

    if args.dry_run:
        print("[5/5] Dry run complete")
        return 0

    probe = client.chat(workspace_slug, "What is ChefFlow?")
    answer = str(probe.get("textResponse", "")).strip()
    sources = probe.get("sources") or []
    print(f"[5/5] Probe answer length: {len(answer)} chars")
    print(f"[5/5] Probe sources returned: {len(sources)}")
    if answer:
        preview = answer.replace("\n", " ")[:280]
        print(f"[5/5] Probe preview: {preview}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
