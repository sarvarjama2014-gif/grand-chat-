import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import api from '../utils/api'

export default function Profile() {
  const { user, updateUser, logout } = useAuth()
  const { dark, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [tab, setTab] = useState('profile')
  const [privacy, setPrivacy] = useState(JSON.parse(localStorage.getItem('privacy') || '{"online":true,"photo":true,"lastseen":true}'))

  const fileInputRef = useRef(null)

  const handleSave = async () => {
    setSaving(true); setMessage('')
    try {
      const { data } = await api.put('/users/profile', { displayName, bio })
      updateUser(data)
      setMessage('Profile updated!')
    } catch { setMessage('Error saving profile') }
    finally { setSaving(false) }
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData(); fd.append('avatar', file)
    try {
      const { data } = await api.put('/users/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      updateUser({ ...user, avatar: data.avatar })
      setMessage('Avatar updated!')
    } catch { setMessage('Error uploading avatar') }
  }

  const handleLogout = () => { logout(); navigate('/login') }

  const togglePrivacy = (key) => {
    const next = { ...privacy, [key]: !privacy[key] }
    setPrivacy(next); localStorage.setItem('privacy', JSON.stringify(next))
  }

  if (!user) return null

  return (
    <div className="settings-page">
      <div className="settings-header">
        <button className="tbtn" onClick={() => navigate('/')}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
        </button>
        <h2>Settings</h2>
      </div>

      <div className="settings-tabs">
        <button className={`set-tab ${tab === 'profile' ? 'active' : ''}`} onClick={() => setTab('profile')}>Profile</button>
        <button className={`set-tab ${tab === 'privacy' ? 'active' : ''}`} onClick={() => setTab('privacy')}>Privacy</button>
        <button className={`set-tab ${tab === 'appearance' ? 'active' : ''}`} onClick={() => setTab('appearance')}>Appearance</button>
        <button className={`set-tab ${tab === 'account' ? 'active' : ''}`} onClick={() => setTab('account')}>Account</button>
      </div>

      <div className="settings-body">
        {message && (
          <div className="set-msg">{message}</div>
        )}

        {tab === 'profile' && (
          <div className="set-section">
            <div className="set-avatar-row">
              <div className="set-avatar" onClick={() => fileInputRef.current?.click()}>
                {user.avatar ? <img src={user.avatar} alt="" /> : (user.displayName || user.username).charAt(0).toUpperCase()}
              </div>
              <div>
                <h3>{user.displayName || user.username}</h3>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>@{user.username}</span>
              </div>
            </div>
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleAvatarUpload} />

            <div className="set-field">
              <label>Display Name</label>
              <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} />
            </div>
            <div className="set-field">
              <label>Bio</label>
              <input type="text" value={bio} onChange={e => setBio(e.target.value)} placeholder="About yourself..." maxLength={200} />
            </div>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Profile'}</button>
          </div>
        )}

        {tab === 'privacy' && (
          <div className="set-section">
            <h3 className="set-section-title">Privacy Settings</h3>
            <div className="set-toggle" onClick={() => togglePrivacy('online')}>
              <span>Online Status</span>
              <div className={`toggle ${privacy.online ? 'on' : ''}`}><div className="toggle-knob" /></div>
            </div>
            <div className="set-toggle" onClick={() => togglePrivacy('photo')}>
              <span>Profile Photo</span>
              <div className={`toggle ${privacy.photo ? 'on' : ''}`}><div className="toggle-knob" /></div>
            </div>
            <div className="set-toggle" onClick={() => togglePrivacy('lastseen')}>
              <span>Last Seen & Online</span>
              <div className={`toggle ${privacy.lastseen ? 'on' : ''}`}><div className="toggle-knob" /></div>
            </div>
            <p className="set-note">These settings are saved locally for now.</p>
          </div>
        )}

        {tab === 'appearance' && (
          <div className="set-section">
            <h3 className="set-section-title">Appearance</h3>
            <div className="set-toggle" onClick={toggleTheme}>
              <span>Dark Mode</span>
              <div className={`toggle ${dark ? 'on' : ''}`}><div className="toggle-knob" /></div>
            </div>
            <p className="set-note" style={{ marginTop: 16 }}>You can also change the chat background from the chat window (⋮ menu).</p>
          </div>
        )}

        {tab === 'account' && (
          <div className="set-section">
            <h3 className="set-section-title">Account</h3>
            <div className="set-field">
              <label>Username</label>
              <input type="text" value={user.username} disabled style={{ opacity: 0.6 }} />
            </div>
            <div className="set-field">
              <label>Email</label>
              <input type="email" value={user.email} disabled style={{ opacity: 0.6 }} />
            </div>
            <div style={{ marginTop: 20 }}>
              <button className="btn btn-danger" onClick={handleLogout}>Sign Out</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
