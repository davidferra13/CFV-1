'use client'
import { useState, useCallback } from 'react'

interface UndoableAction<T> {
  description: string
  state: T
}

export function useUndoStack<T>(initialState: T) {
  const [current, setCurrent] = useState<T>(initialState)
  const [history, setHistory] = useState<UndoableAction<T>[]>([])

  const push = useCallback((description: string, newState: T) => {
    setHistory(prev => [...prev, { description, state: current }])
    setCurrent(newState)
  }, [current])

  const undo = useCallback(() => {
    if (history.length === 0) return null
    const prev = history[history.length - 1]
    setHistory(h => h.slice(0, -1))
    setCurrent(prev.state)
    return prev.description
  }, [history])

  const canUndo = history.length > 0

  return { current, push, undo, canUndo }
}
