import React, { useState, useEffect, useRef, useCallback } from 'react'
import { CLONES, TENSION } from './config.js'
import { buildSystemPrompt } from './promptBuilder.js'
import { streamCloneResponse } from './api.js'

const sleep = ms => new Promise(r => setTimeout(r, ms))

const CLONE_COLORS = Object.fromEntries(CLONES.map(c => [c.id, c.color]))
const USER_COLOR = '#c6c3dbff'

const MAX_REACTIONS_PER_ROUND = 2
const REACTION_COOLDOWN_MS = 12000

// Converts #rrggbb to "r, g, b" for use in rgba()
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}

function Avatar({ clone, size = 32 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `rgba(${hexToRgb(clone.color)}, 0.13)`,
      border: `1.5px solid rgba(${hexToRgb(clone.color)}, 0.35)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      fontSize: size * 0.28, fontFamily: "'Syne', sans-serif", fontWeight: 700, color: clone.color,
    }}>
      {clone.id}
    </div>
  )
}

function UserAvatar({ size = 32 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'rgba(255,255,255,0.08)',
      border: '1.5px solid rgba(255,255,255,0.25)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      fontSize: size * 0.28, fontFamily: "'Syne', sans-serif", fontWeight: 700,
      color: 'rgba(255,255,255,0.7)',
    }}>
      you
    </div>
  )
}

// Renders message text, turning @001-@006 into colored pills and @you into grey/white pill
function MessageText({ text }) {
  if (!text) return <span style={{ opacity: 0.4, fontStyle: 'italic' }}>...</span>
  const parts = text.split(/(@00[1-6]|@you)/g)
  return (
    <>
      {parts.map((part, i) => {
        const cloneMatch = part.match(/^@(00[1-6])$/)
        const userMatch = part === '@you'

        if (cloneMatch) {
          const id = cloneMatch[1]
          const color = CLONE_COLORS[id] || USER_COLOR
          return (
            <span key={i} style={{
              display: 'inline-flex', alignItems: 'center',
              background: `rgba(${hexToRgb(color)}, 0.13)`,
              border: `1px solid rgba(${hexToRgb(color)}, 0.4)`,
              color, borderRadius: 999,
              padding: '1px 7px', fontSize: '0.72rem', fontWeight: 700,
              margin: '0 1px', fontFamily: "'Space Mono', monospace",
              letterSpacing: '0.03em', verticalAlign: 'middle',
            }}>
              {part}
            </span>
          )
        }

        if (userMatch) {
          return (
            <span key={i} style={{
              display: 'inline-flex', alignItems: 'center',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'rgba(255,255,255,0.75)',
              borderRadius: 999,
              padding: '1px 7px', fontSize: '0.72rem', fontWeight: 700,
              margin: '0 1px', fontFamily: "'Space Mono', monospace",
              letterSpacing: '0.03em', verticalAlign: 'middle',
            }}>
              @you
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
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flexDirection: 'row-reverse', padding: '2px 0' }}>
        <UserAvatar size={30} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: '72%', alignItems: 'flex-end' }}>
          <div style={{
            fontSize: '0.58rem', letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.5)', paddingRight: 4,
          }}>
            you
          </div>
          <div style={{
            padding: '10px 14px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '18px 18px 4px 18px',
            fontSize: '0.82rem', lineHeight: 1.65, color: 'var(--text)', whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            <MessageText text={msg.text} />
          </div>
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

// Discord/Snapchat-style mention input using contentEditable (ai method to help further enchance UI/UX)
// Converts @001-@006 and @you into styled pills as you type
function MentionInput({ value, onChange, onKeyDown, inputRef, placeholder }) {
  const editableRef = useRef(null)

  // When input value resets to '' (after send), clear the div
  useEffect(() => {
    if (value === '' && editableRef.current) {
      editableRef.current.innerHTML = ''
    }
  }, [value])

  // Expose focus() to parent via inputRef
  useEffect(() => {
    if (inputRef) inputRef.current = { focus: () => editableRef.current?.focus() }
  }, [inputRef])

  // Walks all child nodes to reconstruct plain text, replacing pill spans with @id
  const getPlainText = () => {
    const nodes = editableRef.current?.childNodes || []
    let text = ''
    for (const node of nodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent.replace(/\u200B/g, '') // strip zero-width spaces
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
      const match = textNode.textContent.match(/@(00[1-6]|you)/)
      if (match) {
        const id = match[1]
        const isUser = id === 'you'
        const color = isUser ? null : (CLONE_COLORS[id] || USER_COLOR)
        const label = `@${id}`

        // Remove the typed @xxx from the text node
        textNode.textContent = textNode.textContent.replace(match[0], '')

        // Build the pill DOM element
        const pill = document.createElement('span')
        pill.dataset.mention = id
        pill.contentEditable = 'false'
        pill.textContent = label

        if (isUser) {
          pill.style.cssText = `
            display: inline-flex; align-items: center;
            background: rgba(255,255,255,0.08);
            border: 1px solid rgba(255,255,255,0.2);
            color: rgba(255,255,255,0.75);
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
        } else {
          pill.style.cssText = `
            display: inline-flex; align-items: center;
            background: rgba(${hexToRgb(color)}, 0.13);
            border: 1px solid rgba(${hexToRgb(color)}, 0.4);
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
        }

        // Insert pill at cursor position
        range.insertNode(pill)

        // Add zero-width space after pill so cursor moves past it
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
  const fireCloneRef = useRef(null)
  const lastReactionTime = useRef(0)
  const reactionCount = useRef(0)
  const hasInit = useRef(false)

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
    const now = Date.now()
    if (now - lastReactionTime.current < REACTION_COOLDOWN_MS) return
    if (reactionCount.current >= MAX_REACTIONS_PER_ROUND) return

    for (const c of CLONES) {
      if (c.id === speakerId) continue
      if (stopped.current) return
      if (reactionCount.current >= MAX_REACTIONS_PER_ROUND) return

      const prob = TENSION[`${speakerId}-${c.id}`] || 0.1
      if (Math.random() < prob) {
        await sleep(8000 + Math.random() * 7000)
        if (stopped.current) return
        if (reactionCount.current >= MAX_REACTIONS_PER_ROUND) return

        reactionCount.current += 1
        lastReactionTime.current = Date.now()
        const safeText = spokenText.replace(/"/g, "'").slice(0, 120)
        await fireCloneRef.current?.(c.id, `@${speakerId} just said: "${safeText}". React briefly, use @ when addressing clones or @you for the real user — under 45 words.`)
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
      return { role: 'assistant', content: m.text }
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
      reactionCount.current = 0
      fireClone(randomClone.id, "The conversation has gone quiet. Say something — a thought or question to another clone. Use @ when addressing them, or @you for the real user. Under 40 words.")
      resetAutonomousTimer()
    }, 20000 + Math.random() * 17000)
  }, [fireClone, typing])

  useEffect(() => {
    if (hasInit.current) return
    hasInit.current = true
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
    reactionCount.current = 0
    lastReactionTime.current = 0

    setBusy(true)
    setInput('')
    inputRef.current?.focus()

    setMessages(prev => [...prev, { id: Date.now(), isUser: true, text }])
    historyRef.current.push({ isUser: true, text })
    scrollToBottom()

    setBusy(false)
    resetAutonomousTimer()

    const mentionMatch = text.match(/@(00[1-6])/)
    const primaryId = mentionMatch?.[1] || null

    if (primaryId) {
      if (!stopped.current) await fireClone(primaryId)
      for (const c of CLONES) {
        if (c.id === primaryId) continue
        if (stopped.current) break
        const prob = (TENSION[`${primaryId}-${c.id}`] || 0.2) * 1.5
        if (Math.random() < prob) {
          const lastPrimary = [...historyRef.current].reverse().find(m => m.cloneId === primaryId)
          await sleep(2000 + Math.random() * 2000)
          if (!stopped.current) await fireClone(c.id,
            lastPrimary
              ? `@${primaryId} just said: "${lastPrimary.text.replace(/"/g, "'").slice(0, 120)}". React briefly, use @ when addressing clones or @you for the real user — under 45 words.`
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

        {/* User row in sidebar */}
        <div style={{
          padding: '0.65rem 0.9rem',
          borderLeft: '2px solid rgba(255,255,255,0.25)',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(255,255,255,0.6)',
            }} />
            <span style={{ fontSize: '0.62rem', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
              you
            </span>
          </div>
          <div style={{
            fontFamily: "'Syne', sans-serif", fontSize: '0.78rem', fontWeight: 600,
            color: 'rgba(255,255,255,0.75)', marginBottom: 1,
          }}>
            The Real One
          </div>
          <div style={{ fontSize: '0.6rem', color: 'var(--muted)', lineHeight: 1.35 }}>
            active
          </div>
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
                  if (!stopped.current) {
                    reactionCount.current = 0
                    fireClone(c.id, "You've been quiet. Say something on your mind — under 60 words. Use @ when addressing other clones, or @you for the real user.")
                      .catch(() => {})
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
          Tap a clone to nudge them.<br />Use @001–@006 or @you.<br />Type "stop" to pause.
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
            placeholder="Message all clones, or @001 to address one…"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            style={{
              padding: '0.65rem 1.4rem', flexShrink: 0,
              background: input.trim() ? 'rgba(124,106,247,0.18)' : 'transparent',
              border: `1px solid ${input.trim() ? 'rgba(124,106,247,0.5)' : 'var(--border)'}`,
              borderRadius: 20, color: input.trim() ? '#7c6af7' : 'var(--muted)',
              fontFamily: "'Space Mono', monospace", fontSize: '0.7rem',
              letterSpacing: '0.1em', cursor: input.trim() ? 'pointer' : 'not-allowed',
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