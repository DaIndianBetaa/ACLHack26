import React, { useState } from 'react'
import Landing from './Landing.jsx'
import Quiz from './Quiz.jsx'
import InitScreen from './InitScreen.jsx'
import Chat from './Chat.jsx'

const API_KEY = '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'


// Inject API key globally so api.js can use it
if (API_KEY && API_KEY !== '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') {
  window.__ECHOES_API_KEY__ = API_KEY
}

// Override fetch to inject auth header for Anthropic calls
const _origFetch = window.fetch
window.fetch = function(url, opts = {}) {
  if (typeof url === 'string' && url.includes('anthropic.com') && window.__ECHOES_API_KEY__) {
    opts = { ...opts, headers: { ...opts.headers, 'x-api-key': window.__ECHOES_API_KEY__, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' } }
  }
  return _origFetch(url, opts)
}

export default function App() {
  const [screen, setScreen] = useState('landing')
  const [answers, setAnswers] = useState({})
  const [tempKey, setTempKey] = useState('')
  const [keyError, setKeyError] = useState('')

  const handleStart = () => {
    setScreen('quiz-key')
  }

  const handleKeySubmit = () => {
    const k = tempKey.trim()
    if (!k.startsWith('sk-ant-')) {
      setKeyError('Key should start with sk-ant-')
      return
    }
    window.__ECHOES_API_KEY__ = k
    setScreen('quiz')
  }

  const handleQuizComplete = (a) => {
    setAnswers(a)
    setScreen('init')
  }

  if (screen === 'landing') return <Landing onStart={handleStart} />

  if (screen === 'api-key') return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100vh', gap: '1.5rem', padding: '2rem', maxWidth: 480, margin: '0 auto',
    }}>
      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '1.3rem', fontWeight: 700, color: 'var(--text)' }}>
        Enter your Anthropic API Key
      </div>
      <p style={{ fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.8, textAlign: 'center' }}>
        ECHOES calls the Claude API directly from your browser.<br />
        Your key is never stored — it lives only in this session.
      </p>
      <input
        type="password"
        value={tempKey}
        onChange={e => { setTempKey(e.target.value); setKeyError('') }}
        onKeyDown={e => e.key === 'Enter' && handleKeySubmit()}
        placeholder="sk-ant-api03-..."
        style={{
          width: '100%', padding: '0.8rem 1rem', background: 'var(--bg2)',
          border: `1px solid ${keyError ? '#f87171' : 'var(--border2)'}`, borderRadius: 2,
          color: 'var(--text)', fontFamily: "'Space Mono', monospace", fontSize: '0.78rem',
          outline: 'none',
        }}
      />
      {keyError && <div style={{ fontSize: '0.68rem', color: '#f87171' }}>{keyError}</div>}
      <button onClick={handleKeySubmit} style={{
        padding: '0.7rem 2rem', background: 'rgba(124,106,247,0.12)',
        border: '1px solid rgba(124,106,247,0.4)', borderRadius: 2,
        color: '#7c6af7', fontFamily: "'Space Mono', monospace", fontSize: '0.7rem',
        letterSpacing: '0.14em', cursor: 'pointer',
      }}>
        CONTINUE →
      </button>
      <p style={{ fontSize: '0.6rem', color: 'var(--muted)', textAlign: 'center', lineHeight: 1.7 }}>
        Or hardcode your key in <code style={{ color: 'var(--muted2)' }}>src/App.jsx</code> to skip this step.
      </p>
    </div>
  )

  if (screen === 'quiz') return <Quiz onComplete={handleQuizComplete} />

  if (screen === 'init') return <InitScreen onReady={() => setScreen('chat')} />

  if (screen === 'chat') return <Chat answers={answers} />

  return null
}
