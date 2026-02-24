'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

/* ── types ─────────────────────────────────────────── */
type Cell = '🍳' | '🧑‍🍳' | null // player = 🍳, Remy = 🧑‍🍳
type Board = Cell[]

const SIZES = [3, 4, 5] as const
type GridSize = (typeof SIZES)[number]

const REMY_TAUNTS = [
  'Not bad, chef... but can you keep up?',
  'Hmm, interesting move.',
  'Remy sees your strategy...',
  "That's a bold choice!",
  'You call that a move? Just kidding.',
  'Mise en place, my friend.',
  'Corner pocket? Classic.',
  'Let me think... got it!',
  'Oui oui, my turn!',
]

function getWinLines(size: GridSize): number[][] {
  const lines: number[][] = []
  // rows
  for (let r = 0; r < size; r++) {
    const row = []
    for (let c = 0; c < size; c++) row.push(r * size + c)
    lines.push(row)
  }
  // cols
  for (let c = 0; c < size; c++) {
    const col = []
    for (let r = 0; r < size; r++) col.push(r * size + c)
    lines.push(col)
  }
  // diags
  const d1 = [],
    d2 = []
  for (let i = 0; i < size; i++) {
    d1.push(i * size + i)
    d2.push(i * size + (size - 1 - i))
  }
  lines.push(d1, d2)
  return lines
}

function checkWinner(board: Board, size: GridSize): { winner: Cell; line: number[] } | null {
  const lines = getWinLines(size)
  for (const line of lines) {
    const first = board[line[0]]
    if (first && line.every((i) => board[i] === first)) {
      return { winner: first, line }
    }
  }
  return null
}

/* ── Remy AI (minimax for 3x3, heuristic for 4x4/5x5) ── */

function minimax(
  board: Board,
  size: GridSize,
  isMax: boolean,
  depth: number,
  alpha: number,
  beta: number
): number {
  const result = checkWinner(board, size)
  if (result) return result.winner === '🧑‍🍳' ? 10 - depth : depth - 10
  if (board.every((c) => c !== null)) return 0

  if (isMax) {
    let best = -Infinity
    for (let i = 0; i < board.length; i++) {
      if (board[i] !== null) continue
      board[i] = '🧑‍🍳'
      best = Math.max(best, minimax(board, size, false, depth + 1, alpha, beta))
      board[i] = null
      alpha = Math.max(alpha, best)
      if (beta <= alpha) break
    }
    return best
  } else {
    let best = Infinity
    for (let i = 0; i < board.length; i++) {
      if (board[i] !== null) continue
      board[i] = '🍳'
      best = Math.min(best, minimax(board, size, true, depth + 1, alpha, beta))
      board[i] = null
      beta = Math.min(beta, best)
      if (beta <= alpha) break
    }
    return best
  }
}

function remyMove3x3(board: Board): number {
  let bestScore = -Infinity
  let bestMove = -1
  const copy = [...board]
  for (let i = 0; i < copy.length; i++) {
    if (copy[i] !== null) continue
    copy[i] = '🧑‍🍳'
    const s = minimax(copy, 3, false, 0, -Infinity, Infinity)
    copy[i] = null
    if (s > bestScore) {
      bestScore = s
      bestMove = i
    }
  }
  return bestMove
}

function remyMoveLarge(board: Board, size: GridSize): number {
  const lines = getWinLines(size)
  const empty = board.map((c, i) => (c === null ? i : -1)).filter((i) => i >= 0)
  if (empty.length === 0) return -1

  // 1. Win if possible
  for (const i of empty) {
    board[i] = '🧑‍🍳'
    if (checkWinner(board, size)?.winner === '🧑‍🍳') {
      board[i] = null
      return i
    }
    board[i] = null
  }
  // 2. Block player win
  for (const i of empty) {
    board[i] = '🍳'
    if (checkWinner(board, size)?.winner === '🍳') {
      board[i] = null
      return i
    }
    board[i] = null
  }
  // 3. Center
  const center = Math.floor(size / 2) * size + Math.floor(size / 2)
  if (board[center] === null) return center
  // 4. Score each move by how many lines it helps/blocks
  let bestScore = -Infinity
  let bestMove = empty[0]
  for (const i of empty) {
    let sc = 0
    for (const line of lines) {
      if (!line.includes(i)) continue
      const remyCount = line.filter((j) => board[j] === '🧑‍🍳').length
      const playerCount = line.filter((j) => board[j] === '🍳').length
      if (playerCount === 0) sc += remyCount * 2
      if (remyCount === 0) sc += playerCount
    }
    // slight randomness to keep it fun
    sc += Math.random() * 0.5
    if (sc > bestScore) {
      bestScore = sc
      bestMove = i
    }
  }
  return bestMove
}

function getRemyMove(board: Board, size: GridSize): number {
  if (size === 3) return remyMove3x3(board)
  return remyMoveLarge(board, size)
}

export default function TicTacToe() {
  const [size, setSize] = useState<GridSize>(3)
  const [board, setBoard] = useState<Board>(() => Array(9).fill(null))
  const [isPlayerTurn, setIsPlayerTurn] = useState(true)
  const [winner, setWinner] = useState<Cell | 'draw' | null>(null)
  const [winLine, setWinLine] = useState<number[]>([])
  const [taunt, setTaunt] = useState('')
  const [playerWins, setPlayerWins] = useState(0)
  const [remyWins, setRemyWins] = useState(0)
  const [draws, setDraws] = useState(0)
  const [thinking, setThinking] = useState(false)

  const resetBoard = useCallback(
    (s: GridSize = size) => {
      setBoard(Array(s * s).fill(null))
      setIsPlayerTurn(true)
      setWinner(null)
      setWinLine([])
      setTaunt('')
      setThinking(false)
    },
    [size]
  )

  const changeSize = (s: GridSize) => {
    setSize(s)
    resetBoard(s)
  }

  // Remy's turn
  useEffect(() => {
    if (isPlayerTurn || winner) return
    setThinking(true)
    setTaunt(REMY_TAUNTS[Math.floor(Math.random() * REMY_TAUNTS.length)])

    const timer = setTimeout(
      () => {
        const copy = [...board]
        const move = getRemyMove(copy, size)
        if (move === -1) return
        copy[move] = '🧑‍🍳'
        setBoard(copy)
        setThinking(false)

        const result = checkWinner(copy, size)
        if (result) {
          setWinner(result.winner)
          setWinLine(result.line)
          if (result.winner === '🧑‍🍳') {
            setRemyWins((w) => w + 1)
            setTaunt('Better luck next time, chef!')
          }
        } else if (copy.every((c) => c !== null)) {
          setWinner('draw')
          setDraws((d) => d + 1)
          setTaunt("A draw! You're keeping up!")
        } else {
          setIsPlayerTurn(true)
        }
      },
      400 + Math.random() * 400
    ) // thinking delay for fun

    return () => clearTimeout(timer)
  }, [isPlayerTurn, winner, board, size])

  const handleClick = (i: number) => {
    if (!isPlayerTurn || board[i] || winner || thinking) return
    const copy = [...board]
    copy[i] = '🍳'
    setBoard(copy)

    const result = checkWinner(copy, size)
    if (result) {
      setWinner(result.winner)
      setWinLine(result.line)
      if (result.winner === '🍳') {
        setPlayerWins((w) => w + 1)
        setTaunt('You got me! Well played, chef!')
      }
    } else if (copy.every((c) => c !== null)) {
      setWinner('draw')
      setDraws((d) => d + 1)
      setTaunt('A draw! Evenly matched!')
    } else {
      setIsPlayerTurn(false)
    }
  }

  const cellSize =
    size === 3
      ? 'w-24 h-24 text-4xl'
      : size === 4
        ? 'w-[72px] h-[72px] text-3xl'
        : 'w-14 h-14 text-2xl'

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/games" className="text-sm text-muted-foreground hover:text-foreground">
          &larr; Back to Arcade
        </Link>
        <div className="text-xs text-muted-foreground">
          You: {playerWins} &middot; Remy: {remyWins} &middot; Draws: {draws}
        </div>
      </div>

      <h1 className="mb-2 text-center text-2xl font-bold">Tic-Tac-Toe vs Remy</h1>
      <p className="mb-4 text-center text-sm text-muted-foreground">
        You&apos;re 🍳 &middot; Remy is 🧑‍🍳
      </p>

      {/* Size picker */}
      <div className="mb-4 flex justify-center gap-2">
        {SIZES.map((s) => (
          <button
            key={s}
            onClick={() => changeSize(s)}
            className={`rounded-lg border px-4 py-1.5 text-sm font-medium transition-colors ${
              size === s
                ? 'border-brand-500 bg-brand-9500/10 text-brand-500'
                : 'border-border hover:border-brand-500/50'
            }`}
          >
            {s}x{s}
          </button>
        ))}
      </div>

      {/* Remy taunt */}
      {taunt && (
        <div className="mb-3 text-center text-sm italic text-muted-foreground">
          🧑‍🍳 &ldquo;{taunt}&rdquo;
        </div>
      )}

      {/* Thinking indicator */}
      {thinking && !winner && (
        <div className="mb-3 text-center text-sm text-brand-500 animate-pulse">
          Remy is thinking...
        </div>
      )}

      {/* Board */}
      <div className="flex justify-center">
        <div
          className="grid gap-1.5"
          style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
        >
          {board.map((cell, i) => {
            const isWinCell = winLine.includes(i)
            return (
              <button
                key={i}
                onClick={() => handleClick(i)}
                disabled={!!cell || !!winner || !isPlayerTurn || thinking}
                className={`${cellSize} flex items-center justify-center rounded-lg border-2 transition-all ${
                  isWinCell
                    ? 'border-brand-500 bg-brand-9500/15 scale-105'
                    : cell
                      ? 'border-border bg-card'
                      : 'border-border bg-card hover:border-brand-500/50 hover:bg-brand-9500/5 cursor-pointer'
                }`}
              >
                {cell && (
                  <span className={`transition-all ${isWinCell ? 'animate-bounce' : ''}`}>
                    {cell}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Game over */}
      {winner && (
        <div className="mt-6 text-center space-y-3">
          <div className="text-xl font-bold">
            {winner === '🍳' && '🎉 You win!'}
            {winner === '🧑‍🍳' && '🧑‍🍳 Remy wins!'}
            {winner === 'draw' && "🤝 It's a draw!"}
          </div>
          <button
            onClick={() => resetBoard()}
            className="rounded-lg bg-brand-9500 px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-600"
          >
            Play Again
          </button>
        </div>
      )}

      <div className="mt-6 text-center text-xs text-muted-foreground">
        Pick your grid size above &middot; Remy gets smarter on 3x3
      </div>
    </div>
  )
}
