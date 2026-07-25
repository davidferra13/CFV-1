// Split a SQL file into statements, respecting strings, line comments and
// $tag$ ... $tag$ bodies (function bodies are full of semicolons).
export function splitStatements(sql) {
  const out = []
  let buf = ''
  let i = 0
  let quote = null // "'" | '"' | the active dollar tag

  while (i < sql.length) {
    const ch = sql[i]

    if (quote === null) {
      const dollar = sql.slice(i).match(/^\$[a-z_]*\$/i)
      if (dollar) {
        quote = dollar[0]
        buf += quote
        i += quote.length
        continue
      }
      if (ch === "'" || ch === '"') {
        quote = ch
        buf += ch
        i++
        continue
      }
      if (ch === '-' && sql[i + 1] === '-') {
        const end = sql.indexOf('\n', i)
        const stop = end === -1 ? sql.length : end
        buf += sql.slice(i, stop)
        i = stop
        continue
      }
      if (ch === ';') {
        out.push(buf + ';')
        buf = ''
        i++
        continue
      }
    } else if (quote === "'" || quote === '"') {
      if (ch === quote) quote = null
      buf += ch
      i++
      continue
    } else if (sql.startsWith(quote, i)) {
      buf += quote
      i += quote.length
      quote = null
      continue
    }

    buf += ch
    i++
  }
  if (buf.trim()) out.push(buf)
  return out
}
