import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'

export default function Admin() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [tab, setTab] = useState('overview')
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedUser, setSelectedUser] = useState(null)
  const [userActivity, setUserActivity] = useState(null)

  useEffect(() => {
    loadStats()
    loadUsers()
  }, [page])

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
    <div className="admin-layout">
      <div className="admin-sidebar">
        <div className="admin-sidebar-header">
          <h2>Grand Chat</h2>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Admin Panel</p>
        </div>
        <div className="admin-nav">
          <div className={`admin-nav-item ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>
            \uD83D\uDCCA Overview
          </div>
          <div className={`admin-nav-item ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>
            \uD83D\uDC65 Users
          </div>
          {selectedUser && (
            <div className={`admin-nav-item ${tab === 'activity' ? 'active' : ''}`} onClick={() => setTab('activity')}>
              \uD83D\uDCCB Activity
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

      <div className="admin-content">
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
                             {!u.isAdmin && (
                               <>
                                 <button
                                   className="btn-action"
                                   onClick={() => toggleBan(u._id)}
                                   style={{ background: u.isBanned ? 'rgba(67,160,71,0.15)' : 'rgba(251,140,0,0.15)', color: u.isBanned ? '#43a047' : '#fb8c00' }}
                                 >
                                   {u.isBanned ? 'Unban' : 'Ban'}
                                 </button>
                                 <button
                                   className="btn-action"
                                   onClick={() => deleteUser(u._id)}
                                   style={{ background: 'rgba(229,57,53,0.12)', color: '#e53935' }}
                                 >
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
                    <button className="btn btn-sm btn-outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                      Previous
                    </button>
                    <span style={{ display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: 14, color: 'var(--text-secondary)' }}>
                      Page {page} of {totalPages}
                    </span>
                    <button className="btn btn-sm btn-outline" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                      Next
                    </button>
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
              <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                Account created: {formatDate(userActivity.createdAt)}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
