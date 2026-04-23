const { execFileSync } = require("node:child_process");
const path = require("node:path");

function parseLimit(limit) {
  const numeric = Number.parseInt(String(limit || "5"), 10);
  if (Number.isNaN(numeric)) return 5;
  return Math.max(1, Math.min(numeric, 12));
}

function clean(value) {
  return String(value || "").trim();
}

function formatResults(query, results) {
  if (!Array.isArray(results) || results.length === 0) {
    return `No MemPalace matches found for "${query}".`;
  }

  const lines = [`MemPalace matches for "${query}":`];
  for (let i = 0; i < results.length; i += 1) {
    const result = results[i];
    const similarity = typeof result.similarity === "number" ? result.similarity.toFixed(3) : "n/a";
    lines.push(
      `${i + 1}. wing=${result.wing || "?"} room=${result.room || "?"} similarity=${similarity} source=${result.source || "?"}`
    );
    lines.push(result.content || "(empty)");
  }
  return lines.join("\n");
}

module.exports.runtime = {
  handler: async function ({ query, wing, room, limit }) {
    try {
      const normalizedQuery = clean(query);
      if (!normalizedQuery) {
        return "MemPalace search needs a non-empty query.";
      }

      const pythonExe = clean(this.runtimeArgs.PYTHON_EXE) || "py";
      const palacePath = clean(this.runtimeArgs.PALACE_PATH);
      const scriptPath = path.join(__dirname, "mempalace_query.py");
      const args = [
        scriptPath,
        "--query",
        normalizedQuery,
        "--limit",
        String(parseLimit(limit)),
      ];

      if (palacePath) {
        args.push("--palace-path", palacePath);
      }

      if (clean(wing)) {
        args.push("--wing", clean(wing));
      }

      if (clean(room)) {
        args.push("--room", clean(room));
      }

      this.introspect(`Searching MemPalace for "${normalizedQuery}"`);
      const stdout = execFileSync(pythonExe, args, {
        cwd: __dirname,
        encoding: "utf8",
        timeout: 10_000,
        windowsHide: true,
      });
      const parsed = JSON.parse(stdout);
      if (parsed.error) {
        return `MemPalace search failed: ${parsed.error}`;
      }
      return formatResults(normalizedQuery, parsed.results || []);
    } catch (error) {
      return `MemPalace skill error: ${error.message}`;
    }
  },
};
