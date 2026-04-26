import React, { useState, useEffect, useRef, useCallback } from 'react'
import { CLONES, TENSION } from './config.js'
import { buildSystemPrompt } from './promptBuilder.js'
import { streamCloneResponse } from './api.js'

const sleep = ms => new Promise(r => setTimeout(r, ms))

// Clone color map for pill styling
const CLONE_COLORS = Object.fromEntries(CLONES.map(c => [c.id, c.color]))

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

// Renders message text, turning @001-@006 into colored pills
function MessageText({ text }) {
  if (!text) return <span style={{ opacity: 0.4, fontStyle: 'italic' }}>...</span>
  const parts = text.split(/(@00[1-6])/g)
  return (
    <>
      {parts.map((part, i) => {
        const match = part.match(/^@(00[1-6])$/)
        if (match) {
          const id = match[1]
          const color = CLONE_COLORS[id] || '#7c6af7'
          return (
            <span key={i} style={{
              display: 'inline-flex', alignItems: 'center',
              background: `${color}22`, border: `1px solid ${color}55`,
              color: color, borderRadius: 999,
              padding: '1px 7px', fontSize: '0.72rem', fontWeight: 700,
              margin: '0 1px', fontFamily: "'Space Mono', monospace",
              letterSpacing: '0.03em', verticalAlign: 'middle',
            }}>
              {part}
            </span>
          )
        }
        return part
      })}
    </>
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
          <MessageText text={msg.text} />
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
          <MessageText text={msg.text} />
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

// Discord/Snapchat-style mention input
function MentionInput({ value, onChange, onKeyDown, inputRef, placeholder }) {
  const editableRef = useRef(null)

  // Clear the div when value resets to '' (after send)
  useEffect(() => {
    if (value === '' && editableRef.current) {
      editableRef.current.innerHTML = ''
    }
  }, [value])

  // Expose focus() via inputRef
  useEffect(() => {
    if (inputRef) inputRef.current = { focus: () => editableRef.current?.focus() }
  }, [inputRef])

  const getPlainText = () => {
    const nodes = editableRef.current?.childNodes || []
    let text = ''
    for (const node of nodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent.replace(/\u200B/g, '')
      } else if (node.dataset?.mention) {
        text += `@${node.dataset.mention}`
      } else {
        text += node.textContent.replace(/\u200B/g, '')
      }
    }
    return text
  }

  const handleInput = () => {
    const sel = window.getSelection()
    const range = sel?.getRangeAt(0)
    const textNode = range?.startContainer

    if (textNode?.nodeType === Node.TEXT_NODE) {
      const match = textNode.textContent.match(/@(00[1-6])/)
      if (match) {
        const id = match[1]
        const color = CLONE_COLORS[id] || '#7c6af7'

        // Remove the @00x text
        textNode.textContent = textNode.textContent.replace(match[0], '')

        // Build pill
        const pill = document.createElement('span')
        pill.dataset.mention = id
        pill.contentEditable = 'false'
        pill.textContent = `@${id}`
        pill.style.cssText = `
          display: inline-flex; align-items: center;
          background: ${color}22;
          border: 1px solid ${color}66;
          color: ${color};
          border-radius: 999px;
          padding: 1px 8px;
          font-size: 0.75rem;
          font-weight: 700;
          margin: 0 2px;
          cursor: default;
          user-select: none;
          font-family: 'Space Mono', monospace;
          letter-spacing: 0.04em;
          vertical-align: middle;
        `

        // Insert pill at cursor
        range.insertNode(pill)

        // Move cursor after pill with a zero-width space
        const spacer = document.createTextNode('\u200B')
        pill.after(spacer)
        const newRange = document.createRange()
        newRange.setStartAfter(spacer)
        newRange.collapse(true)
        sel.removeAllRanges()
        sel.addRange(newRange)
      }
    }

    onChange(getPlainText())
  }

  return (
    <div
      ref={editableRef}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      onKeyDown={onKeyDown}
      data-placeholder={placeholder}
      style={{
        flex: 1,
        background: 'var(--bg3)',
        border: '1px solid var(--border2)',
        borderRadius: 20,
        padding: '0.65rem 1.1rem',
        color: 'var(--text)',
        fontFamily: "'Space Mono', monospace",
        fontSize: '0.78rem',
        lineHeight: 1.55,
        outline: 'none',
        minHeight: '2.2rem',
        maxHeight: 110,
        overflowY: 'auto',
        transition: 'border-color 0.15s',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        position: 'relative',
      }}
      onFocus={e => e.currentTarget.style.borderColor = 'rgba(124,106,247,0.5)'}
      onBlur={e => e.currentTarget.style.borderColor = 'var(--border2)'}
    />
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
  const stopped = useRef(false)
  // FIX: use a ref so triggerReactions can call the latest fireClone without circular deps
  const fireCloneRef = useRef(null)

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

  // FIX: use fireCloneRef to avoid stale closure — empty deps array is now safe
  const triggerReactions = useCallback(async (speakerId, spokenText) => {
    if (!introsComplete.current) return
    for (const c of CLONES) {
      if (c.id === speakerId) continue
      if (stopped.current) return
      const prob = TENSION[`${speakerId}-${c.id}`] || 0.1
      if (Math.random() < prob) {
        await sleep(8000 + Math.random() * 7000)
        if (stopped.current) return
        // FIX: escape quotes so they don't break the prompt string
        const safeText = spokenText.replace(/"/g, "'").slice(0, 120)
        await fireCloneRef.current?.(c.id, `@${speakerId} just said: "${safeText}". React briefly, use @ when addressing clones — under 45 words.`)
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
      return { role: 'assistant', content: `[${m.cloneId} ${clone?.short}]: ${m.text}` }
    })
  }, [])

  const fireClone = useCallback(async (cloneId, extraInstruction = null) => {
    if (stopped.current) return
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

  // FIX: keep fireCloneRef in sync with the latest fireClone
  useEffect(() => {
    fireCloneRef.current = fireClone
  }, [fireClone])

  const resetAutonomousTimer = useCallback(() => {
    if (autonomousTimer.current) clearTimeout(autonomousTimer.current)
    autonomousTimer.current = setTimeout(() => {
      if (stopped.current) return
      const idle = CLONES.filter(c => !typing[c.id])
      if (idle.length === 0) return
      const randomClone = idle[Math.floor(Math.random() * idle.length)]
      fireClone(randomClone.id, "The conversation has gone quiet. Say something — a thought or question to another clone. Use @ when addressing them. Under 40 words.")
      resetAutonomousTimer()
    }, 20000 + Math.random() * 17000)
  }, [fireClone, typing])

  useEffect(() => {
    addSystemMsg('All 6 versions of you are online')
    introsComplete.current = true
    return () => { if (autonomousTimer.current) clearTimeout(autonomousTimer.current) }
  }, [])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || busy) return

    if (/^stop/i.test(text)) {
      stopped.current = true
      setInput('')
      setMessages(prev => [...prev, { id: Date.now(), isUser: true, text }])
      if (autonomousTimer.current) clearTimeout(autonomousTimer.current)
      addSystemMsg('Conversation paused')
      return
    }

    stopped.current = false
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
        if (!stopped.current) await fireClone(primaryId)
        await sleep(700)
        for (const c of CLONES) {
          if (c.id === primaryId) continue
          if (stopped.current) break
          const prob = (TENSION[`${primaryId}-${c.id}`] || 0.2) * 1.5
          if (Math.random() < prob) {
            const lastPrimary = [...historyRef.current].reverse().find(m => m.cloneId === primaryId)
            await sleep(2000 + Math.random() * 2000)
            if (!stopped.current) await fireClone(c.id,
              lastPrimary
                // FIX: escape quotes in the prompt
                ? `@${primaryId} just said: "${lastPrimary.text.replace(/"/g, "'").slice(0, 120)}". React briefly, use @ when addressing clones — under 45 words.`
                : null
            )
          }
        }
      } else {
        const shuffled = [...CLONES].sort(() => Math.random() - 0.5)
        for (const c of shuffled) {
          if (stopped.current) break
          await sleep(2500 + Math.random() * 2500)
          if (!stopped.current) fireClone(c.id)
        }
        await sleep(4000)
      }
    } finally {
      setBusy(false)
      resetAutonomousTimer()
    }
  }, [input, busy, fireClone, scrollToBottom, resetAutonomousTimer, addSystemMsg])

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
                  if (!busy && !stopped.current) {
                    setBusy(true)
                    fireClone(c.id, "You've been quiet. Say something on your mind — under 60 words. Use @ when addressing other clones.")
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
          Tap a clone to nudge them.<br />Use @001–@006 to address one.<br />Type "stop" to pause.
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
            [contenteditable]:empty:before {
              content: attr(data-placeholder);
              color: var(--muted);
              pointer-events: none;
            }
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
          <MentionInput
            value={input}
            onChange={setInput}
            onKeyDown={handleKeyDown}
            inputRef={inputRef}
            placeholder="Message all clones, or @001 to address one specifically…"
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