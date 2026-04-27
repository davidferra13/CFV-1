/**
 * Persona Vault - filesystem-based persona storage and deduplication.
 * Stores processed personas with content hashing to prevent duplicates.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID, createHash } from "node:crypto";

const VAULT_DIR = join(import.meta.dirname, "..", "system", "persona-vault");

function ensureVaultDir() {
  if (!existsSync(VAULT_DIR)) mkdirSync(VAULT_DIR, { recursive: true });
}

function contentHash(content) {
  return createHash("sha256").update(content.trim()).digest("hex").slice(0, 16);
}

function indexPath() {
  return join(VAULT_DIR, "index.json");
}

function readIndex() {
  const p = indexPath();
  if (!existsSync(p)) return [];
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return [];
  }
}

function writeIndex(entries) {
  ensureVaultDir();
  writeFileSync(indexPath(), JSON.stringify(entries, null, 2) + "\n", "utf8");
}

export function vaultStore({ content, persona_type, persona_name, author, source_file }) {
  ensureVaultDir();
  const hash = contentHash(content);
  const index = readIndex();

  // Deduplicate by content hash
  const existing = index.find((e) => e.content_hash === hash);
  if (existing) {
    return { id: existing.id, content_hash: hash, deduplicated: true };
  }

  const id = randomUUID();
  const entry = {
    id,
    content_hash: hash,
    persona_type: persona_type || "unknown",
    persona_name: persona_name || "unknown",
    author: author || { type: "system" },
    source_file: source_file || null,
    stored_at: new Date().toISOString(),
    chars: content.trim().length,
  };

  // Write persona content file
  writeFileSync(join(VAULT_DIR, `${id}.txt`), content, "utf8");

  // Update index
  index.push(entry);
  writeIndex(index);

  return { id, content_hash: hash, deduplicated: false };
}

export function vaultIndex() {
  return readIndex();
}

export function vaultGet(id) {
  const contentPath = join(VAULT_DIR, `${id}.txt`);
  if (!existsSync(contentPath)) return null;
  const index = readIndex();
  const meta = index.find((e) => e.id === id) || null;
  return {
    ...meta,
    content: readFileSync(contentPath, "utf8"),
  };
}

export function vaultStats() {
  const index = readIndex();
  const byType = {};
  for (const entry of index) {
    const t = entry.author?.type || "unknown";
    byType[t] = (byType[t] || 0) + 1;
  }
  return {
    total: index.length,
    human: byType.human || 0,
    ai: byType.ai || byType.system || 0,
    byType,
  };
}
