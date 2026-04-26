import React, { useState } from 'react'
import Landing from './Landing.jsx'
import Quiz from './Quiz.jsx'
import InitScreen from './InitScreen.jsx'
import Chat from './Chat.jsx'

const API_KEY = import.meta.env.VITE_API_KEY


// Inject API key globally so api.js can use it
window.__ECHOES_API_KEY__ = API_KEY

// Override fetch to inject auth header for OpenAI calls
const _origFetch = window.fetch
window.fetch = function(url, opts = {}) {
  if (typeof url === 'string' && url.includes('openai.com') && window.__ECHOES_API_KEY__) {
    opts = { ...opts, headers: { ...opts.headers, 'Authorization': `Bearer ${window.__ECHOES_API_KEY__}` } }
  }
  return _origFetch(url, opts)
}

export default function App() {
  const [screen, setScreen] = useState('landing')
  const [answers, setAnswers] = useState({})
  const [tempKey, setTempKey] = useState('')
  const [keyError, setKeyError] = useState('')

  const handleStart = () => {
    setScreen('quiz')
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

  if (screen === 'quiz') return <Quiz onComplete={handleQuizComplete} />

  if (screen === 'init') return <InitScreen onReady={() => setScreen('chat')} />

  if (screen === 'chat') return <Chat answers={answers} />

  return null
}
