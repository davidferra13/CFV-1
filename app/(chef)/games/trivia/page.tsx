'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { generateTriviaQuestions, type TriviaQuestion } from '@/lib/games/trivia-actions'

const TOPIC_CHIPS = [
  'Mother Sauces',
  'Knife Skills',
  'French Cuisine',
  'Food Science',
  'Fermentation',
  'Pastry & Baking',
  'World Cuisine',
  'Food History',
  'Spices & Herbs',
  'Food Safety',
  'Famous Chefs',
  'Italian Cooking',
  'Molecular Gastronomy',
  'Butchery & Cuts',
  'Wine Pairing',
]
const DIFFICULTIES = ['easy', 'medium', 'hard'] as const
const TIME_PER_QUESTION = 15 // seconds

type GamePhase = 'setup' | 'loading' | 'playing' | 'result' | 'error'

const LOADING_MESSAGES = [
  'Remy is cooking up your questions...',
  'Simmering the trivia...',
  'Plating the questions...',
  'Adding a pinch of difficulty...',
  'Almost ready to serve...',
  'Remy is perfecting the garnish...',
]

function LoadingState({ onCancel }: { onCancel: () => void }) {
  const [elapsed, setElapsed] = useState(0)
  const [msgIdx, setMsgIdx] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const cycle = setInterval(() => setMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length), 4000)
    return () => clearInterval(cycle)
  }, [])

  return (
    <div className="py-16 text-center space-y-4">
      <div className="mb-2 text-4xl animate-bounce">🧑‍🍳</div>
      <p className="text-muted-foreground transition-all">{LOADING_MESSAGES[msgIdx]}</p>
      <div className="flex items-center justify-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-2 w-2 rounded-full bg-brand-500 animate-pulse"
            style={{ animationDelay: `${i * 200}ms` }}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground/60">{elapsed}s elapsed</p>
      {elapsed >= 10 && (
        <p className="text-xs text-muted-foreground/80">
          Ollama is still generating — this can take up to a minute for detailed questions.
        </p>
      )}
      <button
        onClick={onCancel}
        className="mt-2 rounded-lg border px-5 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
      >
        Cancel
      </button>
    </div>
  )
}

export default function TriviaGame() {
  const [phase, setPhase] = useState<GamePhase>('setup')
  const [topic, setTopic] = useState('')
  const [customTopic, setCustomTopic] = useState('')
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [questions, setQuestions] = useState<TriviaQuestion[]>([])
  const [currentQ, setCurrentQ] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION)
  const [errorMsg, setErrorMsg] = useState('')
  const [highScore, setHighScore] = useState(0)
  const previousIdsRef = useRef<string[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval>>()
  const cancelledRef = useRef(false)

  useEffect(() => {
    const saved = localStorage.getItem('chefflow-trivia-hi')
    if (saved) setHighScore(Number(saved))
    const savedIds = localStorage.getItem('chefflow-trivia-seen')
    if (savedIds) previousIdsRef.current = JSON.parse(savedIds)
  }, [])

  const startGame = useCallback(async () => {
    const chosenTopic = topic || customTopic
    if (!chosenTopic.trim()) return
    cancelledRef.current = false
    setPhase('loading')
    setScore(0)
    setStreak(0)
    setBestStreak(0)
    setCurrentQ(0)
    setSelected(null)
    setShowAnswer(false)

    try {
      const result = await generateTriviaQuestions(chosenTopic, difficulty, previousIdsRef.current)

      // User cancelled while Ollama was thinking — discard the result
      if (cancelledRef.current) return

      if (result.error === 'ollama-offline') {
        setErrorMsg('Remy needs Ollama to generate trivia. Start Ollama and try again!')
        setPhase('error')
        return
      }
      if (result.error || result.questions.length === 0) {
        setErrorMsg(result.error || 'Failed to generate questions. Try again!')
        setPhase('error')
        return
      }

      // save seen IDs
      const newIds = result.questions.map((q) => q.id)
      previousIdsRef.current = [...previousIdsRef.current, ...newIds].slice(-100)
      localStorage.setItem('chefflow-trivia-seen', JSON.stringify(previousIdsRef.current))

      setQuestions(result.questions)
      setTimeLeft(TIME_PER_QUESTION)
      setPhase('playing')
    } catch (err) {
      // User cancelled while Ollama was thinking — swallow the error
      if (cancelledRef.current) return
      console.error('[trivia] Failed to call server action:', err)
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed')) {
        setErrorMsg(
          'Could not reach the server. Make sure the dev server is running and try again.'
        )
      } else {
        setErrorMsg(`Something went wrong: ${msg}`)
      }
      setPhase('error')
    }
  }, [topic, customTopic, difficulty])

  // timer
  useEffect(() => {
    if (phase !== 'playing' || showAnswer) return
    setTimeLeft(TIME_PER_QUESTION)
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          // time's up — show answer as wrong
          setShowAnswer(true)
          setStreak(0)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [phase, currentQ, showAnswer])

  const handleAnswer = (idx: number) => {
    if (showAnswer) return
    clearInterval(timerRef.current)
    setSelected(idx)
    setShowAnswer(true)
    const q = questions[currentQ]
    if (idx === q.correctIndex) {
      const points = difficulty === 'hard' ? 30 : difficulty === 'medium' ? 20 : 10
      const timeBonus = Math.floor(timeLeft / 3) * 5
      setScore((s) => s + points + timeBonus)
      setStreak((s) => {
        const ns = s + 1
        setBestStreak((b) => Math.max(b, ns))
        return ns
      })
    } else {
      setStreak(0)
    }
  }

  const nextQuestion = () => {
    if (currentQ + 1 >= questions.length) {
      // game over — use updater to read the true current score,
      // since setScore from handleAnswer may not have flushed yet
      setScore((currentScore) => {
        if (currentScore > Number(localStorage.getItem('chefflow-trivia-hi') || '0')) {
          localStorage.setItem('chefflow-trivia-hi', String(currentScore))
          setHighScore(currentScore)
        }
        return currentScore
      })
      setPhase('result')
      return
    }
    setCurrentQ((c) => c + 1)
    setSelected(null)
    setShowAnswer(false)
  }

  const q = questions[currentQ]

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/games" className="text-sm text-muted-foreground hover:text-foreground">
          &larr; Back to Arcade
        </Link>
        <div className="text-sm text-muted-foreground">
          High Score: <span className="font-bold text-brand-500">{highScore}</span>
        </div>
      </div>

      <h1 className="mb-6 text-center text-2xl font-bold">Remy&apos;s Kitchen Trivia</h1>

      {/* SETUP PHASE */}
      {phase === 'setup' && (
        <div className="space-y-6">
          <div>
            <label className="mb-2 block text-sm font-medium">Pick a topic</label>
            <div className="flex flex-wrap gap-2">
              {TOPIC_CHIPS.map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTopic(t)
                    setCustomTopic('')
                  }}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    topic === t
                      ? 'border-brand-500 bg-brand-500/10 text-brand-500'
                      : 'border-border hover:border-brand-500/50'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="mt-3">
              <input
                type="text"
                placeholder="Or type your own topic..."
                value={customTopic}
                onChange={(e) => {
                  setCustomTopic(e.target.value)
                  setTopic('')
                }}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Difficulty</label>
            <div className="flex gap-2">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium capitalize transition-colors ${
                    difficulty === d
                      ? 'border-brand-500 bg-brand-500/10 text-brand-500'
                      : 'border-border hover:border-brand-500/50'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={startGame}
            disabled={!topic && !customTopic.trim()}
            className="w-full rounded-lg bg-brand-500 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Let&apos;s Go!
          </button>
        </div>
      )}

      {/* LOADING */}
      {phase === 'loading' && (
        <LoadingState
          onCancel={() => {
            cancelledRef.current = true
            setPhase('setup')
          }}
        />
      )}

      {/* ERROR */}
      {phase === 'error' && (
        <div className="py-12 text-center">
          <div className="mb-4 text-4xl">😔</div>
          <p className="mb-4 text-muted-foreground">{errorMsg}</p>
          <button
            onClick={() => setPhase('setup')}
            className="rounded-lg border px-6 py-2 text-sm hover:bg-muted"
          >
            Try Again
          </button>
        </div>
      )}

      {/* PLAYING */}
      {phase === 'playing' && q && (
        <div className="space-y-4">
          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {currentQ + 1}/{questions.length}
            </span>
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-brand-500 transition-all"
                style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
              />
            </div>
            <span className="text-xs font-medium text-muted-foreground">{score} pts</span>
          </div>

          {/* Timer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {streak > 1 && (
                <span className="text-sm font-bold text-brand-500">🔥 {streak} streak</span>
              )}
            </div>
            <div
              className={`text-sm font-bold ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-muted-foreground'}`}
            >
              {timeLeft}s
            </div>
          </div>

          {/* Question */}
          <div className="rounded-xl border bg-card p-5">
            <p className="text-lg font-medium leading-relaxed">{q.question}</p>
          </div>

          {/* Choices */}
          <div className="grid gap-2">
            {q.choices.map((choice, i) => {
              let bg = 'border-border hover:border-brand-500/50'
              if (showAnswer) {
                if (i === q.correctIndex) bg = 'border-green-500 bg-green-500/10 text-green-700'
                else if (i === selected) bg = 'border-red-500 bg-red-500/10 text-red-700'
                else bg = 'border-border opacity-50'
              } else if (selected === i) {
                bg = 'border-brand-500 bg-brand-500/10'
              }
              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  disabled={showAnswer}
                  className={`rounded-lg border p-3 text-left text-sm transition-all ${bg}`}
                >
                  <span className="mr-2 font-bold text-muted-foreground">
                    {String.fromCharCode(65 + i)}.
                  </span>
                  {choice}
                </button>
              )
            })}
          </div>

          {/* Fun fact + next */}
          {showAnswer && (
            <div className="space-y-3">
              <div className="rounded-lg bg-brand-500/5 border border-brand-500/20 p-3 text-sm">
                <span className="font-medium">💡 Fun fact:</span> {q.funFact}
              </div>
              <button
                onClick={nextQuestion}
                className="w-full rounded-lg bg-brand-500 py-2.5 text-sm font-bold text-white hover:bg-brand-600"
              >
                {currentQ + 1 >= questions.length ? 'See Results' : 'Next Question'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* RESULTS */}
      {phase === 'result' && (
        <div className="py-8 text-center space-y-6">
          <div className="text-5xl">{score >= 150 ? '🏆' : score >= 75 ? '🌟' : '👨‍🍳'}</div>
          <div>
            <div className="text-3xl font-bold text-brand-500">{score} points</div>
            <div className="mt-1 text-muted-foreground">
              Best streak: <span className="font-bold">{bestStreak}</span>
              {bestStreak >= 5 && ' 🔥'}
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={startGame}
              className="rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-600"
            >
              Play Again
            </button>
            <button
              onClick={() => {
                setPhase('setup')
                setTopic('')
                setCustomTopic('')
              }}
              className="rounded-lg border px-6 py-2.5 text-sm font-medium hover:bg-muted"
            >
              New Topic
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
