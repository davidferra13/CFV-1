#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const skillDirs = [
  path.join(root, ".claude", "skills"),
  path.join(root, ".agents", "skills"),
  path.join(process.env.USERPROFILE || "", ".codex", "skills"),
  path.join(process.env.USERPROFILE || "", ".codex", "skills", ".system"),
];

const docsToScan = ["AGENTS.md", "CLAUDE.md"]
  .map((file) => path.join(root, file))
  .filter((file) => fs.existsSync(file));

function hasSkillFile(dir) {
  return fs.existsSync(path.join(dir, "SKILL.md")) || fs.existsSync(path.join(dir, "skill.md"));
}

function readSkills(baseDir) {
  if (!fs.existsSync(baseDir)) return [];
  return fs
    .readdirSync(baseDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() || entry.isSymbolicLink())
    .filter((entry) => hasSkillFile(path.join(baseDir, entry.name)))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

const sources = skillDirs.map((dir) => ({
  dir,
  skills: readSkills(dir),
}));

const allSkills = new Set(sources.flatMap((source) => source.skills));
const referenced = new Set();
const nonSkillRefs = new Set([
  "active",
  "blocked",
  "done",
  "finish-check",
  "in-flight",
  "status",
]);
const skillRefPattern = /`([a-z0-9][a-z0-9-]{1,80})`/gi;

for (const doc of docsToScan) {
  const text = fs.readFileSync(doc, "utf8");
  for (const match of text.matchAll(skillRefPattern)) {
    referenced.add(match[1]);
  }
}

const missing = [...referenced]
  .filter((name) => !nonSkillRefs.has(name))
  .filter((name) => name.includes("-") || ["omninet"].includes(name))
  .filter((name) => !allSkills.has(name))
  .sort((a, b) => a.localeCompare(b));

console.log("# Skill Inventory");
for (const source of sources) {
  const relative = path.relative(root, source.dir) || source.dir;
  console.log(`\n## ${relative}`);
  if (source.skills.length === 0) {
    console.log("(none)");
    continue;
  }
  for (const skill of source.skills) console.log(`- ${skill}`);
}

console.log("\n## Missing referenced skills");
if (missing.length === 0) {
  console.log("(none)");
} else {
  for (const skill of missing) console.log(`- ${skill}`);
}
