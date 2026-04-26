import React from 'react'

export default function Landing({ onStart }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100vh', gap: '1.5rem',
      textAlign: 'center', padding: '2rem', position: 'relative', overflow: 'hidden',
    }}>
      {/* Glow */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(124,106,247,0.10) 0%, transparent 70%)',
      }} />

      <div style={{
        fontFamily: "'Syne', sans-serif", fontSize: 'clamp(3.5rem, 12vw, 7rem)',
        fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1,
        background: 'linear-gradient(135deg, #7c6af7 0%, #e879f9 50%, #38bdf8 100%)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
      }}>Within</div>

      <div style={{ fontSize: '0.65rem', letterSpacing: '0.28em', color: 'var(--muted)', textTransform: 'uppercase' }}>
        every choice &nbsp;·&nbsp; 6 clones &nbsp;·&nbsp; all you
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--muted2)', maxWidth: 380, lineHeight: 1.9, marginTop: '0.5rem' }}>
        Answer 15 questions. Six clones of you are generated.<br />
        They all live in one group chat — with each other, and with you.
      </p>

      <button
        onClick={onStart}
        style={{
          marginTop: '1rem', padding: '0.9rem 2.8rem',
          background: 'transparent', border: '1px solid rgba(124,106,247,0.5)',
          borderRadius: 2, color: '#7c6af7', fontSize: '0.72rem',
          letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => { e.target.style.background = 'rgba(124,106,247,0.1)'; e.target.style.borderColor = '#7c6af7' }}
        onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'rgba(124,106,247,0.5)' }}
      >
        BEGIN CLONING
      </button>
    </div>
  )
}
