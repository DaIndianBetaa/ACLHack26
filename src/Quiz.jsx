import React, { useState, useEffect, useRef } from 'react'
import { QUESTIONS } from './config.js'

export default function Quiz({ onComplete }) {
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState({})
  const [selected, setSelected] = useState(null)
  const [shortVal, setShortVal] = useState('')
  const [animating, setAnimating] = useState(false)
  const taRef = useRef(null)

  const q = QUESTIONS[current]
  const isLast = current === QUESTIONS.length - 1
  const canProceed = q.type === 'mcq' ? selected !== null : shortVal.trim().length >= 3

  useEffect(() => {
    setSelected(answers[q.id + '_idx'] ?? null)
    setShortVal(answers[q.id] || '')
    if (q.type === 'short' && taRef.current) {
      setTimeout(() => taRef.current?.focus(), 60)
    }
  }, [current])

  const handleSelect = (opt, idx) => {
    setSelected(idx)
    setAnswers(a => ({ ...a, [q.id]: opt, [q.id + '_idx']: idx }))
  }

  const handleShort = (e) => {
    setShortVal(e.target.value)
    setAnswers(a => ({ ...a, [q.id]: e.target.value }))
  }

  const handleNext = () => {
    if (!canProceed || animating) return
    if (isLast) {
      onComplete(answers)
      return
    }
    setAnimating(true)
    setTimeout(() => {
      setCurrent(c => c + 1)
      setAnimating(false)
    }, 180)
  }

  const pct = ((current) / QUESTIONS.length) * 100

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      maxWidth: 620, margin: '0 auto', width: '100%', padding: '2rem',
      justifyContent: 'center', gap: '2rem',
    }}>
      {/* Progress */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--muted)', textTransform: 'uppercase' }}>
            QUESTION {current + 1} / {QUESTIONS.length}
          </span>
          <span style={{ fontSize: '0.6rem', color: 'var(--muted)', letterSpacing: '0.1em' }}>
            {Math.round(pct)}%
          </span>
        </div>
        <div style={{ height: 2, background: 'var(--border)', borderRadius: 1 }}>
          <div style={{
            height: '100%', borderRadius: 1, transition: 'width 0.4s ease',
            background: 'linear-gradient(90deg, #7c6af7, #e879f9)',
            width: pct + '%',
          }} />
        </div>
      </div>

      {/* Question */}
      <div style={{
        fontFamily: "'Syne', sans-serif", fontSize: 'clamp(1.1rem, 3vw, 1.45rem)',
        fontWeight: 600, lineHeight: 1.45, color: 'var(--text)',
        opacity: animating ? 0 : 1, transform: animating ? 'translateY(8px)' : 'none',
        transition: 'opacity 0.18s, transform 0.18s',
      }}>
        {q.label}
      </div>

      {/* Input */}
      <div style={{ opacity: animating ? 0 : 1, transition: 'opacity 0.18s' }}>
        {q.type === 'mcq' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {q.opts.map((opt, i) => (
              <button key={i} onClick={() => handleSelect(opt, i)} style={{
                padding: '0.8rem 1rem', background: selected === i ? 'rgba(124,106,247,0.1)' : 'var(--bg2)',
                border: `1px solid ${selected === i ? '#7c6af7' : 'var(--border2)'}`,
                borderRadius: 2, cursor: 'pointer', textAlign: 'left',
                fontFamily: "'Space Mono', monospace", fontSize: '0.75rem',
                color: selected === i ? '#7c6af7' : 'var(--muted2)', lineHeight: 1.55,
                transition: 'all 0.12s',
              }}
                onMouseEnter={e => { if (selected !== i) { e.currentTarget.style.borderColor = 'rgba(124,106,247,0.4)'; e.currentTarget.style.color = 'var(--text)' } }}
                onMouseLeave={e => { if (selected !== i) { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--muted2)' } }}
              >
                {opt}
              </button>
            ))}
          </div>
        ) : (
          <textarea
            ref={taRef}
            value={shortVal}
            onChange={handleShort}
            onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleNext() }}
            placeholder={q.placeholder}
            rows={4}
            style={{
              width: '100%', padding: '0.85rem 1rem', background: 'var(--bg2)',
              border: '1px solid var(--border2)', borderRadius: 2,
              color: 'var(--text)', fontFamily: "'Space Mono', monospace",
              fontSize: '0.8rem', lineHeight: 1.75, resize: 'none', outline: 'none',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => e.target.style.borderColor = '#7c6af7'}
            onBlur={e => e.target.style.borderColor = 'var(--border2)'}
          />
        )}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {current > 0 ? (
          <button onClick={() => setCurrent(c => c - 1)} style={{
            padding: '0.55rem 1rem', background: 'transparent', border: '1px solid var(--border)',
            borderRadius: 2, color: 'var(--muted)', fontSize: '0.65rem', letterSpacing: '0.12em',
            cursor: 'pointer', textTransform: 'uppercase', transition: 'all 0.15s',
          }}
            onMouseEnter={e => { e.target.style.borderColor = 'var(--border2)'; e.target.style.color = 'var(--muted2)' }}
            onMouseLeave={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--muted)' }}
          >← BACK</button>
        ) : <div />}

        <button onClick={handleNext} disabled={!canProceed} style={{
          padding: '0.65rem 1.8rem', background: canProceed ? 'rgba(124,106,247,0.12)' : 'transparent',
          border: `1px solid ${canProceed ? 'rgba(124,106,247,0.5)' : 'var(--border)'}`,
          borderRadius: 2, color: canProceed ? '#7c6af7' : 'var(--muted)',
          fontSize: '0.7rem', letterSpacing: '0.14em', textTransform: 'uppercase',
          cursor: canProceed ? 'pointer' : 'not-allowed', transition: 'all 0.15s',
        }}>
          {isLast ? 'INITIALIZE CLONES →' : 'NEXT →'}
        </button>
      </div>
    </div>
  )
}
