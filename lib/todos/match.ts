export type TodoMatchCandidate = {
  id: string
  text: string
  completed: boolean
}

export function findTodoMatch(
  todos: TodoMatchCandidate[],
  query: string
): TodoMatchCandidate | null {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery || todos.length === 0) {
    return null
  }

  const exact = todos.find((todo) => todo.text.toLowerCase().includes(normalizedQuery))
  if (exact) {
    return exact
  }

  const words = normalizedQuery.split(/\s+/).filter((word) => word.length > 2)
  if (words.length === 0) {
    return null
  }

  let best: TodoMatchCandidate | null = null
  let bestScore = 0

  for (const todo of todos) {
    const normalizedText = todo.text.toLowerCase()
    const score = words.filter((word) => normalizedText.includes(word)).length
    if (score > bestScore) {
      bestScore = score
      best = todo
    }
  }

  return bestScore > 0 ? best : null
}
