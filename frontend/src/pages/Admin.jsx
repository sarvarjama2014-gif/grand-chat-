import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'

const badgeStyles = (badge) => {
  const map = {
    'verified': { icon: '✅', img: '/badges/verified.svg', bg: 'rgba(42,171,238,0.15)', color: '#2aabee' },
    'samurai': { icon: '⚔️', img: '/badges/samurai.png', bg: 'rgba(156,39,176,0.15)', color: '#9c27b0' },
    'real madrid': { icon: '👑', img: '/badges/real-madrid.svg', bg: 'rgba(255,193,7,0.15)', color: '#ffc107' },
    'barcelona': { icon: '🔵', img: '/badges/barcelona.svg', bg: 'rgba(21,101,192,0.15)', color: '#1565c0' },
    'mercedes': { icon: '⭐', img: '/badges/mercedes.svg', bg: 'rgba(200,200,200,0.2)', color: '#e0e0e0' },
    'bmw': { icon: '🌀', img: '/badges/bmw.svg', bg: 'rgba(52,152,219,0.15)', color: '#3498db' },
    'amg': { icon: '🚗', img: '/badges/amg.jpg', bg: 'rgba(0,0,0,0.15)', color: '#000' },
    'muslim warrior': { icon: '⚔️', img: '/badges/muslim-warrior.jpg', bg: 'rgba(0,100,0,0.15)', color: '#006400' },
    'arab warrior': { icon: '🛡️', img: '/badges/arab-warrior.png', bg: 'rgba(139,69,19,0.15)', color: '#8b4513' },
    'street': { icon: '🔥', img: '/badges/bape.png', bg: 'rgba(255,0,0,0.15)', color: '#ff0000' },
  }
  const key = Object.keys(map).find(k => badge.toLowerCase().includes(k))
  return key ? map[key] : { icon: '🏅', bg: 'rgba(42,171,238,0.1)', color: 'var(--primary)' }
}

export default function Admin() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [tab, setTab] = useState('overview')
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedUser, setSelectedUser] = useState(null)
  const [userActivity, setUserActivity] = useState(null)
  const [chats, setChats] = useState([])
  const [chatsPage, setChatsPage] = useState(1)
  const [chatsTotalPages, setChatsTotalPages] = useState(1)
  const [chatMessages, setChatMessages] = useState(null)
  const [viewingChat, setViewingChat] = useState(null)
  const messagesEndRef = useRef(null)
  const [badgeUser, setBadgeUser] = useState(null)
  const [badgeInput, setBadgeInput] = useState('')
  const AVAILABLE_BADGES = ['Verified', 'Samurai', 'Real Madrid', 'Barcelona', 'Mercedes', 'BMW', 'AMG', 'Muslim Warrior', 'Arab Warrior', 'Street']

  useEffect(() => {
    loadStats()
    loadUsers()
  }, [page])

  useEffect(() => {
    if (tab === 'conversations') loadChats()
  }, [tab, chatsPage])

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatMessages])

  const loadStats = async () => {
    try {
      const { data } = await api.get('/admin/stats')
      setStats(data)
    } catch (err) {
      console.error(err)
    }
  }

  const loadUsers = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/admin/users?page=${page}`)
      setUsers(data.users)
      setTotalPages(data.totalPages)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadChats = async () => {
    try {
      const { data } = await api.get(`/admin/chats?page=${chatsPage}`)
      setChats(data.chats)
      setChatsTotalPages(data.totalPages)
    } catch (err) {
      console.error(err)
    }
  }

  const viewChatMessages = async (chatId) => {
    try {
      const { data } = await api.get(`/admin/chat-messages/${chatId}`)
      setViewingChat(data.chat)
      setChatMessages(data.messages)
    } catch (err) {
      console.error(err)
    }
  }

  const toggleBan = async (userId) => {
    try {
      await api.put(`/admin/ban/${userId}`)
      loadUsers()
      loadStats()
    } catch (err) {
      alert(err.response?.data?.message || 'Error')
    }
  }

  const deleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return
    try {
      await api.delete(`/admin/user/${userId}`)
      loadUsers()
      loadStats()
    } catch (err) {
      alert(err.response?.data?.message || 'Error')
    }
  }

  const viewActivity = async (userId) => {
    try {
      const { data } = await api.get(`/admin/user-activity/${userId}`)
      setSelectedUser(data.user)
      setUserActivity(data.stats)
      setTab('activity')
    } catch (err) {
      console.error(err)
    }
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString()
  }

  if (!user || !user.isAdmin) {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <h2>Access Denied</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '16px 0' }}>Only the owner can access the admin panel.</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>Go Home</button>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-layout" style={{ height: '100vh', overflow: 'hidden' }}>
      <div className="admin-sidebar">
        <div className="admin-sidebar-header">
          <h2>Grand Chat</h2>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Admin Panel</p>
        </div>
        <div className="admin-nav">
          <div className={`admin-nav-item ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>
            📊 Overview
          </div>
          <div className={`admin-nav-item ${tab === 'conversations' ? 'active' : ''}`} onClick={() => setTab('conversations')}>
            💬 Conversations
          </div>
          <div className={`admin-nav-item ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>
            👥 Users
          </div>
          {tab === 'activity' && (
            <div className="admin-nav-item active" onClick={() => setTab('overview')}>
              📋 Activity
            </div>
          )}
        </div>
        <div style={{ padding: 16, borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div className="chat-avatar" style={{ width: 32, height: 32, fontSize: 14 }}>
              {(user.displayName || user.username).charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{user.displayName || user.username}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Owner</div>
            </div>
          </div>
          <button className="btn btn-outline btn-sm" style={{ width: '100%' }} onClick={() => navigate('/')}>
            Back to Chat
          </button>
        </div>
      </div>

      <div className="admin-content" style={{ height: '100vh', overflow: 'auto' }}>
        {tab === 'overview' && (
          <>
            <h1>Overview</h1>
            {stats && (
              <div className="stats-grid">
                <div className="stat-card">
                  <h3>{stats.totalUsers}</h3>
                  <p>Total Users</p>
                </div>
                <div className="stat-card">
                  <h3>{stats.onlineUsers}</h3>
                  <p>Online Now</p>
                </div>
                <div className="stat-card">
                  <h3>{stats.totalChats}</h3>
                  <p>Total Chats</p>
                </div>
                <div className="stat-card">
                  <h3>{stats.totalMessages}</h3>
                  <p>Total Messages</p>
                </div>
                <div className="stat-card">
                  <h3>{stats.groups}</h3>
                  <p>Groups</p>
                </div>
                <div className="stat-card">
                  <h3>{stats.bannedUsers}</h3>
                  <p>Banned Users</p>
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'conversations' && (
          <>
            <h1>Conversations</h1>
            {viewingChat ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <button className="btn-action" onClick={() => { setViewingChat(null); setChatMessages(null) }}
                    style={{ background: 'rgba(42,171,238,0.12)', color: '#2aabee' }}>
                    ← Back
                  </button>
                  <span style={{ fontWeight: 500 }}>
                    {viewingChat.isGroup
                      ? viewingChat.groupName
                      : viewingChat.participants?.map(p => p.displayName || p.username).join(', ')}
                  </span>
                </div>
                <div className="chat-messages-view" style={{
                  background: 'var(--bg-secondary)', borderRadius: 12, padding: 16,
                  maxHeight: 'calc(100vh - 200px)', overflow: 'auto'
                }}>
                  {chatMessages?.map(msg => {
                    const sender = typeof msg.sender === 'object' ? msg.sender : null
                    return (
                      <div key={msg._id} style={{
                        display: 'flex', gap: 8, marginBottom: 12,
                        alignItems: 'flex-start', padding: 8, borderRadius: 8,
                        background: 'var(--bg-tertiary)'
                      }}>
                        <div className="chat-avatar" style={{ width: 28, height: 28, fontSize: 12, minWidth: 28 }}>
                          {sender?.avatar ? <img src={sender.avatar} alt="" /> : (sender?.displayName || sender?.username || '?').charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)' }}>
                              {sender?.displayName || sender?.username || 'Unknown'}
                            </span>
                            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                              {formatDate(msg.createdAt)}
                            </span>
                          </div>
                          <div style={{ fontSize: 13, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {msg.content || (msg.fileUrl ? `📎 ${msg.fileName || 'File'}` : '')}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </>
            ) : (
              <>
                {chats.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)' }}>No conversations yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {chats.map(chat => (
                      <div key={chat._id} className="admin-nav-item" onClick={() => viewChatMessages(chat._id)}
                        style={{ cursor: 'pointer', padding: 12, borderRadius: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                          <div className="chat-avatar" style={{ width: 36, height: 36, fontSize: 15, minWidth: 36, background: chat.isGroup ? 'var(--primary)' : undefined }}>
                            {chat.isGroup ? (chat.groupName?.charAt(0) || 'G') : (chat.participants?.[0]?.username?.charAt(0)?.toUpperCase() || '?')}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 500 }}>
                              {chat.isGroup ? chat.groupName : chat.participants?.map(p => p.displayName || p.username).join(', ') || 'Chat'}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {chat.lastMessage?.content || 'No messages'}
                            </div>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            {chat.lastMessage ? formatDate(chat.lastMessage.createdAt) : formatDate(chat.createdAt)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {chatsTotalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
                    <button className="btn btn-sm btn-outline" disabled={chatsPage === 1} onClick={() => setChatsPage(p => p - 1)}>Previous</button>
                    <span style={{ display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: 14, color: 'var(--text-secondary)' }}>
                      Page {chatsPage} of {chatsTotalPages}
                    </span>
                    <button className="btn btn-sm btn-outline" disabled={chatsPage === chatsTotalPages} onClick={() => setChatsPage(p => p + 1)}>Next</button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {tab === 'users' && (
          <>
            <h1>Users</h1>
            {loading ? (
              <div className="loading-screen" style={{ height: 200 }}><div className="spinner" /></div>
            ) : (
              <>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Status</th>
                      <th>Role</th>
                      <th>Joined</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u._id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className="chat-avatar" style={{ width: 32, height: 32, fontSize: 14 }}>
                              {u.avatar ? <img src={u.avatar} alt="" /> : (u.displayName || u.username).charAt(0).toUpperCase()}
                            </div>
                            <span>{u.displayName || u.username}</span>
                          </div>
                        </td>
                        <td>@{u.username}</td>
                        <td>{u.email}</td>
                        <td>
                          <span className={`badge ${u.isOnline ? 'badge-success' : ''}`} style={{ background: u.isOnline ? 'rgba(67,160,71,0.15)' : 'var(--bg-tertiary)', color: u.isOnline ? 'var(--success)' : 'var(--text-muted)' }}>
                            {u.isOnline ? 'Online' : 'Offline'}
                          </span>
                          {u.isBanned && <span className="badge badge-danger" style={{ marginLeft: 4 }}>Banned</span>}
                        </td>
                        <td>
                          {u.isAdmin ? (
                            <span className="badge" style={{ background: 'rgba(42,171,238,0.15)', color: 'var(--primary)' }}>Owner</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>User</span>
                          )}
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{formatDate(u.createdAt)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            <button className="btn-action" onClick={() => viewActivity(u._id)} style={{ background: 'rgba(42,171,238,0.12)', color: '#2aabee' }}>
                              Activity
                            </button>
                            <button className="btn-action" onClick={() => setBadgeUser(u)}
                              style={{ background: (u.badges?.length || 0) > 0 ? 'rgba(156,39,176,0.15)' : 'var(--bg-tertiary)', color: (u.badges?.length || 0) > 0 ? '#9c27b0' : 'var(--text-muted)' }}>
                              {u.badges?.length || 0 > 0 ? u.badges.slice(0, 2).join('') : 'Badges'}
                            </button>
                            {!u.isAdmin && (
                              <>
                                <button className="btn-action" onClick={() => toggleBan(u._id)}
                                  style={{ background: u.isBanned ? 'rgba(67,160,71,0.15)' : 'rgba(251,140,0,0.15)', color: u.isBanned ? '#43a047' : '#fb8c00' }}>
                                  {u.isBanned ? 'Unban' : 'Ban'}
                                </button>
                                <button className="btn-action" onClick={() => deleteUser(u._id)}
                                  style={{ background: 'rgba(229,57,53,0.12)', color: '#e53935' }}>
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
                    <button className="btn btn-sm btn-outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
                    <span style={{ display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: 14, color: 'var(--text-secondary)' }}>
                      Page {page} of {totalPages}
                    </span>
                    <button className="btn btn-sm btn-outline" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {tab === 'activity' && selectedUser && userActivity && (
          <>
            <h1>User Activity</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div className="chat-avatar" style={{ width: 48, height: 48, fontSize: 18 }}>
                {selectedUser.avatar ? <img src={selectedUser.avatar} alt="" /> : (selectedUser.displayName || selectedUser.username).charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 style={{ fontSize: 20, margin: 0 }}>{selectedUser.displayName || selectedUser.username}</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>@{selectedUser.username}</p>
              </div>
            </div>
            <div className="stats-grid">
              <div className="stat-card">
                <h3>{userActivity.totalMessages}</h3>
                <p>Messages Sent</p>
              </div>
              <div className="stat-card">
                <h3>{userActivity.totalChats}</h3>
                <p>Active Chats</p>
              </div>
              <div className="stat-card">
                <h3>{selectedUser.isOnline ? 'Online' : 'Offline'}</h3>
                <p>Current Status</p>
              </div>
              <div className="stat-card">
                <h3>{formatDate(userActivity.lastSeen)}</h3>
                <p>Last Seen</p>
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Account created: {formatDate(userActivity.createdAt)}</p>
            </div>
          </>
        )}
      </div>

      {badgeUser && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={() => setBadgeUser(null)}>
          <div style={{
            background: 'var(--bg-secondary)', borderRadius: 16, padding: 24,
            maxWidth: 400, width: '90%', maxHeight: '80vh', overflow: 'auto'
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, marginBottom: 4 }}>{badgeUser.displayName || badgeUser.username}</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Current badges: {badgeUser.badges?.length > 0 ? badgeUser.badges.map((b, i) => {
                const s = badgeStyles(b)
                if (s.img) return <img key={i} src={s.img} alt="" style={{ width: 18, height: 18, margin: '0 2px', verticalAlign: 'middle' }} />
                return <span key={i} style={{ margin: '0 1px' }}>{s.icon || b}</span>
              }) : 'none'}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              {AVAILABLE_BADGES.map(b => {
                const has = badgeUser.badges?.includes(b)
                const s = badgeStyles(b)
                return (
                  <button key={b} onClick={() => {
                    const updated = has
                      ? badgeUser.badges.filter(x => x !== b)
                      : [...(badgeUser.badges || []), b]
                    setBadgeUser({ ...badgeUser, badges: updated })
                  }} style={{
                    padding: '6px 10px', border: has ? '2px solid var(--primary)' : '1px solid var(--border)',
                    borderRadius: 8, cursor: 'pointer', background: has ? 'rgba(42,171,238,0.1)' : 'var(--bg-tertiary)',
                    display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 13
                  }}>
                    {s.img ? <img src={s.img} alt="" style={{ width: 18, height: 18 }} /> : <span style={{ fontSize: 18 }}>{s.icon}</span>}
                  </button>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="text" value={badgeInput} onChange={e => setBadgeInput(e.target.value)}
                placeholder="Custom badge text..." style={{
                  flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--bg-tertiary)', color: 'var(--text)', fontSize: 13
                }} />
              <button className="btn-action" onClick={() => {
                if (badgeInput.trim()) {
                  const updated = [...(badgeUser.badges || []), badgeInput.trim()]
                  setBadgeUser({ ...badgeUser, badges: updated })
                  setBadgeInput('')
                }
              }} style={{ background: 'rgba(42,171,238,0.12)', color: '#2aabee' }}>
                Add
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              <button className="btn btn-sm btn-outline" onClick={() => setBadgeUser(null)}>Cancel</button>
              <button className="btn btn-sm btn-primary" onClick={async () => {
                try {
                  await api.put(`/admin/badges/${badgeUser._id}`, { badges: badgeUser.badges || [] })
                  loadUsers()
                  setBadgeUser(null)
                } catch (err) {
                  alert('Error saving badges')
                }
              }} style={{ width: 'auto' }}>Save Badges</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}