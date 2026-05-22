import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const PLANS = [
  { label: '1 month', months: 1, price: '15 000', priceNum: 15000, popular: false },
  { label: '3 months', months: 3, price: '25 000', priceNum: 25000, popular: true },
  { label: '1 year', months: 12, price: '100 000', priceNum: 100000, popular: false },
]

const CARD_INFO = {
  bank: 'Kapitalbank',
  card: '5614 6835 1507 9812',
  name: 'SARVARJON XOLIQOV',
}

export default function Premium() {
  const { user, fetchUser } = useAuth()
  const navigate = useNavigate()
  const [selected, setSelected] = useState(null)
  const [sent, setSent] = useState(false)

  useEffect(() => { fetchUser() }, [])

  const handleSent = () => {
    setSent(true)
  }

  const handlePayme = () => {
    const card = CARD_INFO.card.replace(/\s/g, '')
    const amount = PLANS[selected].priceNum
    navigator.clipboard.writeText(card).catch(() => {})
    const paymeUrl = `payme://transfer/card/${card}?amount=${amount}`
    const fallbackUrl = `https://payme.uz`
    window.location.href = paymeUrl
    setTimeout(() => {
      if (document.hidden) return
      window.open(fallbackUrl, '_blank')
    }, 500)
  }

  if (user?.isPremium) {
    return (
      <div className="admin-page">
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '20px' }}>
          <h1>⭐ Premium</h1>
          <div className="premium-badge" style={{ background: 'linear-gradient(135deg, #9b59b6, #8e44ad)', color: '#fff', borderRadius: 12, padding: 20, margin: '20px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 10 }}>⭐</div>
            <h2 style={{ margin: 0 }}>Premium Active</h2>
            <p style={{ opacity: 0.8, marginTop: 8 }}>Thanks for supporting Grand Chat!</p>
          </div>

          <h3>Premium Settings</h3>

          <div className="card" style={{ padding: 16, marginBottom: 12 }}>
            <label>Hide online status (show fake last seen)</label>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Set a custom time that always shows as your last seen</div>
          </div>

          <div className="card" style={{ padding: 16, marginBottom: 12 }}>
            <label>Premium icon</label>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Upload a custom photo/icon that appears next to your name</div>
          </div>

          <div className="card" style={{ padding: 16, marginBottom: 12 }}>
            <label>Chat background</label>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Set a custom wallpaper (cosmos, space, etc.)</div>
          </div>

          <button className="btn btn-outline" onClick={() => navigate('/')} style={{ marginTop: 20 }}>Back to Chats</button>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '20px' }}>
        <h1>⭐ Grand Chat Premium</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
          Get exclusive features and support the project
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 24 }}>
          {PLANS.map((p, i) => (
            <div key={i} onClick={() => setSelected(i)}
              style={{
                flex: 1, minWidth: 150, padding: 20, borderRadius: 12, cursor: 'pointer', textAlign: 'center',
                border: selected === i ? '2px solid #9b59b6' : '2px solid var(--border-color)',
                background: selected === i ? 'rgba(155,89,182,0.08)' : 'var(--bg-secondary)',
                position: 'relative',
              }}>
              {p.popular && (
                <span style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: '#9b59b6', color: '#fff', fontSize: 10, padding: '2px 10px', borderRadius: 10 }}>
                  BEST
                </span>
              )}
              <div style={{ fontSize: 24, fontWeight: 600, color: '#9b59b6' }}>{p.price}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>sum</div>
              <div style={{ fontSize: 14, marginTop: 8, fontWeight: 500 }}>{p.label}</div>
            </div>
          ))}
        </div>

        {selected !== null && !sent && (
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ marginTop: 0 }}>💳 Payment Details</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Transfer the amount to this card and click "I Paid"</p>
            <div style={{ background: 'var(--bg-tertiary)', borderRadius: 8, padding: 16, margin: '12px 0' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Bank: {CARD_INFO.bank}</div>
              <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: 2, margin: '8px 0', fontFamily: 'monospace' }}>{CARD_INFO.card}</div>
              <div style={{ fontSize: 13 }}>{CARD_INFO.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Amount: <b>{PLANS[selected].price} sum</b></div>
            </div>
            <button className="btn btn-primary" onClick={handlePayme} style={{ width: '100%', marginTop: 8 }}>
              💳 Pay via Payme
            </button>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '8px 0', textAlign: 'center' }}>
              Card number copied to clipboard. After payment click below:
            </p>
            <button className="btn btn-outline" onClick={handleSent} style={{ width: '100%' }}>
              ✅ I Paid — Notify Admin
            </button>
          </div>
        )}

        {sent && (
          <div className="card" style={{ padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 10 }}>✅</div>
            <h3 style={{ marginTop: 0 }}>Request Sent!</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Admin will activate your Premium after confirming the payment.</p>
            <button className="btn btn-outline" onClick={() => { setSelected(null); setSent(false) }} style={{ marginTop: 12 }}>Back</button>
          </div>
        )}

        <h3 style={{ marginTop: 32 }}>Premium Features</h3>
        <ul style={{ lineHeight: 2, fontSize: 14 }}>
          <li>⭐ Premium star next to your name</li>
          <li>🖼 Custom premium icon (upload your photo)</li>
          <li>🌌 Custom chat backgrounds (cosmos, space)</li>
          <li>🔒 Hide online status (fake last seen)</li>
          <li>🥇 Exclusive premium badges</li>
          <li>🚀 And more coming soon!</li>
        </ul>

        <button className="btn btn-outline" onClick={() => navigate('/')} style={{ marginTop: 20 }}>Back to Chats</button>
      </div>
    </div>
  )
}
