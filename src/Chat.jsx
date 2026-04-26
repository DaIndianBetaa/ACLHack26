import React, { useState, useEffect, useRef, useCallback } from 'react'
import { CLONES, TENSION } from './config.js'
import { buildSystemPrompt } from './promptBuilder.js'
import { streamCloneResponse } from './api.js'

const sleep = ms => new Promise(r => setTimeout(r, ms))

function Avatar({ clone, size = 32 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `${clone.color}22`, border: `1.5px solid ${clone.color}55`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      fontSize: size * 0.28, fontFamily: "'Syne', sans-serif", fontWeight: 700, color: clone.color,
    }}>
      {clone.id}
    </div>
  )
}

function TypingBubble({ clone }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, padding: '2px 0' }}>
      <Avatar clone={clone} size={28} />
      <div style={{
        padding: '8px 14px', background: 'var(--bg3)', border: '1px solid var(--border)',
        borderRadius: '18px 18px 18px 4px', display: 'flex', alignItems: 'center', gap: 4,
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 5, height: 5, borderRadius: '50%', background: clone.color,
            animation: `bounce 1s ${i * 0.15}s infinite`,
          }} />
        ))}
      </div>
    </div>
  )
}

function Message({ msg, clones }) {
  const clone = clones.find(c => c.id === msg.cloneId)
  const isUser = msg.isUser

  if (isUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '2px 0' }}>
        <div style={{
          maxWidth: '72%', padding: '10px 14px',
          background: 'rgba(124,106,247,0.15)', border: '1px solid rgba(124,106,247,0.25)',
          borderRadius: '18px 18px 4px 18px',
          fontSize: '0.82rem', lineHeight: 1.65, color: 'var(--text)', whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {msg.text}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, padding: '2px 0' }}>
      <Avatar clone={clone} size={30} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: '72%' }}>
        <div style={{
          fontSize: '0.58rem', letterSpacing: '0.1em', textTransform: 'uppercase',
          color: clone.color, paddingLeft: 4,
        }}>
          {clone.id} {clone.short}
        </div>
        <div style={{
          padding: '10px 14px', background: 'var(--bg3)', border: '1px solid var(--border)',
          borderRadius: '18px 18px 18px 4px',
          fontSize: '0.82rem', lineHeight: 1.65, color: 'var(--text)', whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {msg.text || <span style={{ opacity: 0.4, fontStyle: 'italic' }}>...</span>}
        </div>
      </div>
    </div>
  )
}

function SystemMsg({ text }) {
  return (
    <div style={{
      textAlign: 'center', fontSize: '0.6rem', color: 'var(--muted)',
      letterSpacing: '0.1em', padding: '0.6rem 0',
    }}>
      — {text} —
    </div>
  )
}

export default function Chat({ answers }) {
  const [messages, setMessages] = useState([])
  const [typing, setTyping] = useState({})
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [statuses, setStatuses] = useState(() =>
    Object.fromEntries(CLONES.map(c => [c.id, 'watching']))
  )

  const threadRef = useRef(null)
  const historyRef = useRef([])
  const autonomousTimer = useRef(null)
  const inputRef = useRef(null)
  const introsComplete = useRef(false)

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight
    }, 30)
  }, [])

  const setStatus = useCallback((id, s) =>
    setStatuses(prev => ({ ...prev, [id]: s })), [])

  const addSystemMsg = useCallback((text) => {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), isSystem: true, text }])
    scrollToBottom()
  }, [scrollToBottom])

  const startStream = useCallback((cloneId) => {
    const msgId = `${cloneId}-${Date.now()}`
    setMessages(prev => [...prev, { id: msgId, cloneId, text: '', streaming: true }])
    setTyping(prev => ({ ...prev, [cloneId]: true }))
    setStatus(cloneId, 'typing')
    return msgId
  }, [setStatus])

  const updateStream = useCallback((msgId, text) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, text } : m))
    scrollToBottom()
  }, [scrollToBottom])

  const triggerReactions = useCallback(async (speakerId, spokenText) => {
    if (!introsComplete.current) return
    for (const c of CLONES) {
      if (c.id === speakerId) continue
      const prob = TENSION[`${speakerId}-${c.id}`] || 0.1
      if (Math.random() < prob) {
        await sleep(6000 + Math.random() * 5000)
        await fireClone(c.id, `${speakerId} just said: "${spokenText}". React briefly — under 45 words.`)
      }
    }
  }, [])

  const finalizeStream = useCallback((msgId, cloneId, text) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, text, streaming: false } : m))
    setTyping(prev => ({ ...prev, [cloneId]: false }))
    setStatus(cloneId, 'active')
    historyRef.current.push({ cloneId, text, isUser: false })
    scrollToBottom()
    triggerReactions(cloneId, text)
  }, [setStatus, scrollToBottom, triggerReactions])

  const buildHistory = useCallback((maxItems = 14) => {
    return historyRef.current.slice(-maxItems).map(m => {
      if (m.isUser) return { role: 'user', content: m.text }
      const clone = CLONES.find(c => c.id === m.cloneId)
      return { role: 'user', content: `[${m.cloneId} ${clone?.short}]: ${m.text}` }
    })
  }, [])

  const fireClone = useCallback(async (cloneId, extraInstruction = null) => {
    const sysPrompt = buildSystemPrompt(cloneId, answers)
    const hist = buildHistory()
    const msgs = extraInstruction
      ? [...hist, { role: 'user', content: extraInstruction }]
      : hist.length
        ? hist
        : [{ role: 'user', content: 'You just appeared in this group chat. Say something.' }]

    const msgId = startStream(cloneId)

    await streamCloneResponse({
      systemPrompt: sysPrompt,
      messages: msgs,
      onToken: (text) => updateStream(msgId, text),
      onDone: (text) => finalizeStream(msgId, cloneId, text),
      onError: (err) => {
        console.error(`Clone ${cloneId} error:`, err)
        setMessages(prev => prev.map(m => m.id === msgId
          ? { ...m, text: '[offline]', streaming: false }
          : m))
        setTyping(prev => ({ ...prev, [cloneId]: false }))
        setStatus(cloneId, 'watching')
      },
    })
  }, [answers, buildHistory, startStream, updateStream, finalizeStream, setStatus])

  const resetAutonomousTimer = useCallback(() => {
    if (autonomousTimer.current) clearTimeout(autonomousTimer.current)
    autonomousTimer.current = setTimeout(() => {
      const idle = CLONES.filter(c => !typing[c.id])
      if (idle.length === 0) return
      const randomClone = idle[Math.floor(Math.random() * idle.length)]
      fireClone(randomClone.id, "The conversation has gone quiet. Say something unprompted — a new thought, reaction, or question to another clone. Under 40 words.")
      resetAutonomousTimer()
    }, 20000 + Math.random() * 17000)
  }, [fireClone, typing])

  // On mount — show system message only, wait for user to speak first
  useEffect(() => {
    addSystemMsg('All 6 versions of you are online')
    introsComplete.current = true
    return () => { if (autonomousTimer.current) clearTimeout(autonomousTimer.current) }
  }, [])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || busy) return
    setBusy(true)
    setInput('')
    inputRef.current?.focus()

    setMessages(prev => [...prev, { id: Date.now(), isUser: true, text }])
    historyRef.current.push({ isUser: true, text })
    scrollToBottom()
    resetAutonomousTimer()

    try {
      const mentionMatch = text.match(/@(00[1-6])/)
      const primaryId = mentionMatch?.[1] || null

      if (primaryId) {
        await fireClone(primaryId)
        await sleep(700)
        for (const c of CLONES) {
          if (c.id === primaryId) continue
          const prob = (TENSION[`${primaryId}-${c.id}`] || 0.2) * 1.5
          if (Math.random() < prob) {
            const lastPrimary = [...historyRef.current].reverse().find(m => m.cloneId === primaryId)
            await sleep(1500 + Math.random() * 1500)
            await fireClone(c.id,
              lastPrimary
                ? `${primaryId} just said: "${lastPrimary.text}". React briefly — under 45 words.`
                : null
            )
          }
        }
      } else {
        const shuffled = [...CLONES].sort(() => Math.random() - 0.5)
        for (const c of shuffled) {
          await sleep(1500 + Math.random() * 2000)
          fireClone(c.id)
        }
        await sleep(4000)
      }
    } finally {
      setBusy(false)
      resetAutonomousTimer()
    }
  }, [input, busy, fireClone, scrollToBottom, resetAutonomousTimer])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* Sidebar */}
      <div style={{
        width: 200, flexShrink: 0, background: 'var(--bg2)',
        borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '1rem', borderBottom: '1px solid var(--border)',
          fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '1.15rem',
          letterSpacing: '-0.02em',
          background: 'linear-gradient(135deg, #7c6af7, #e879f9)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>
          Within
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0' }}>
          {CLONES.map(c => {
            const s = statuses[c.id]
            return (
              <div key={c.id} style={{
                padding: '0.65rem 0.9rem',
                borderLeft: `2px solid ${s !== 'watching' ? c.color : 'transparent'}`,
                cursor: 'pointer', transition: 'background 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                onClick={() => {
                  if (!busy) {
                    setBusy(true)
                    fireClone(c.id, "You've been quiet. Say something on your mind — under 60 words.")
                      .then(() => setBusy(false))
                      .catch(() => setBusy(false))
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                    background: s === 'active' ? '#34d399' : s === 'typing' ? '#f59e0b' : c.color,
                    opacity: s === 'watching' ? 0.35 : 1,
                    animation: s === 'typing' ? 'blink 0.8s infinite' : 'none',
                  }} />
                  <span style={{ fontSize: '0.62rem', letterSpacing: '0.08em', color: c.color, textTransform: 'uppercase' }}>
                    {c.id}
                  </span>
                </div>
                <div style={{
                  fontFamily: "'Syne', sans-serif", fontSize: '0.78rem', fontWeight: 600,
                  color: s !== 'watching' ? c.color : 'var(--muted2)', marginBottom: 1,
                }}>
                  {c.short}
                </div>
                <div style={{ fontSize: '0.6rem', color: 'var(--muted)', lineHeight: 1.35 }}>
                  {s === 'typing' ? 'typing...' : s === 'active' ? 'active' : 'watching'}
                </div>
              </div>
            )
          })}
        </div>

        <div style={{
          padding: '0.75rem', borderTop: '1px solid var(--border)',
          fontSize: '0.58rem', color: 'var(--muted)', lineHeight: 1.6,
        }}>
          Tap a clone to nudge them.<br />Use @001–@006 to address one.
        </div>
      </div>

      {/* Main chat */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div
          ref={threadRef}
          style={{
            flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem',
            display: 'flex', flexDirection: 'column', gap: '0.65rem',
          }}
        >
          <style>{`
            @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)} }
            @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
            @keyframes fadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
          `}</style>

          {messages.map(msg => {
            if (msg.isSystem) return <SystemMsg key={msg.id} text={msg.text} />
            return (
              <div key={msg.id} style={{ animation: 'fadeUp 0.25s ease' }}>
                <Message msg={msg} clones={CLONES} />
              </div>
            )
          })}
        </div>

        <div style={{
          padding: '0.85rem 1.25rem', borderTop: '1px solid var(--border)',
          background: 'var(--bg2)', display: 'flex', gap: '0.65rem', alignItems: 'flex-end',
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message all clones, or @001 to address one specifically…"
            rows={1}
            style={{
              flex: 1, background: 'var(--bg3)', border: '1px solid var(--border2)',
              borderRadius: 20, padding: '0.65rem 1.1rem', color: 'var(--text)',
              fontFamily: "'Space Mono', monospace", fontSize: '0.78rem',
              lineHeight: 1.55, resize: 'none', outline: 'none',
              maxHeight: 110, overflow: 'auto', transition: 'border-color 0.15s',
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(124,106,247,0.5)'}
            onBlur={e => e.target.style.borderColor = 'var(--border2)'}
            onInput={e => {
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 110) + 'px'
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || busy}
            style={{
              padding: '0.65rem 1.4rem', flexShrink: 0,
              background: input.trim() && !busy ? 'rgba(124,106,247,0.18)' : 'transparent',
              border: `1px solid ${input.trim() && !busy ? 'rgba(124,106,247,0.5)' : 'var(--border)'}`,
              borderRadius: 20, color: input.trim() && !busy ? '#7c6af7' : 'var(--muted)',
              fontFamily: "'Space Mono', monospace", fontSize: '0.7rem',
              letterSpacing: '0.1em', cursor: input.trim() && !busy ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s',
            }}
          >
            SEND
          </button>
        </div>
      </div>
    </div>
  )
}