import React, { useEffect, useState } from 'react'
import { CLONES } from './config.js'

export default function InitScreen({ onReady }) {
  const [visible, setVisible] = useState([])
  const [status, setStatus] = useState('Analyzing identity...')

  useEffect(() => {
    const steps = [
      { delay: 600,  fn: () => { setVisible(['001']); setStatus('Building The Original...') } },
      { delay: 1400,  fn: () => { setVisible(v => [...v, '002']); setStatus('Building The Ambitious...') } },
      { delay: 2250, fn: () => { setVisible(v => [...v, '003']); setStatus('Building The Loner...') } },
      { delay: 3100, fn: () => { setVisible(v => [...v, '004']); setStatus('Building The Ancient...') } },
      { delay: 3725, fn: () => { setVisible(v => [...v, '005']); setStatus('Building The Future...') } },
      { delay: 4350, fn: () => { setVisible(v => [...v, '006']); setStatus('Building The Opposite...') } },
      { delay: 5500, fn: () => setStatus('All 6 clones initialized.') },
      { delay: 5750, fn: onReady },
    ]
    const timers = steps.map(s => setTimeout(s.fn, s.delay))
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100vh', gap: '2rem', padding: '2rem',
    }}>
      <div style={{ fontSize: '0.6rem', letterSpacing: '0.25em', color: 'var(--muted)', textTransform: 'uppercase' }}>
        INITIALIZING
      </div>
      <div style={{
        fontFamily: "'Syne', sans-serif", fontSize: '1.6rem', fontWeight: 700, color: 'var(--text)',
      }}>
        Building your parallel selves
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem',
        maxWidth: 460, width: '100%',
      }}>
        {CLONES.map(c => (
          <div key={c.id} style={{
            padding: '0.85rem', border: `1px solid ${visible.includes(c.id) ? c.color : 'var(--border)'}`,
            borderRadius: 2, background: visible.includes(c.id) ? `${c.color}08` : 'var(--bg2)',
            opacity: visible.includes(c.id) ? 1 : 0.25,
            transition: 'all 0.5s ease',
          }}>
            <div style={{ fontSize: '0.58rem', letterSpacing: '0.12em', color: c.color, marginBottom: 4 }}>{c.id}</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '0.75rem', fontWeight: 600, color: c.color }}>{c.short}</div>
            <div style={{ fontSize: '0.6rem', color: 'var(--muted)', marginTop: 2, lineHeight: 1.4 }}>{c.desc}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: '0.68rem', color: 'var(--muted)', letterSpacing: '0.08em', minHeight: 20 }}>
        {status}
      </div>
    </div>
  )
}
