import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useSocket } from '../context/SocketContext'
import api from '../utils/api'
import CallModal from '../components/CallModal'

const BG_PATTERNS = [
  { name: 'None', value: '' },
  { name: 'Stars', value: 'radial-gradient(circle at 20% 50%, rgba(42,171,238,0.05) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(42,171,238,0.08) 0%, transparent 50%), radial-gradient(circle at 50% 80%, rgba(42,171,238,0.05) 0%, transparent 50%)' },
  { name: 'Dark Waves', value: 'linear-gradient(135deg, rgba(42,171,238,0.08) 0%, transparent 50%, rgba(42,171,238,0.04) 100%)' },
  { name: 'Gradient Blue', value: 'linear-gradient(135deg, #0c1f33 0%, #0d1117 50%, #162b40 100%)' },
  { name: 'Subtle Grid', value: 'linear-gradient(rgba(42,171,238,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(42,171,238,0.03) 1px, transparent 1px)' },
  { name: 'Warm', value: 'linear-gradient(135deg, #1a1410 0%, #0d1117 50%, #1a1410 100%)' },
]

const COLORS = ['#2AABEE', '#E53935', '#43A047', '#FB8C00', '#8E24AA', '#00ACC1', '#F4511E', '#3949AB']

const TELEGRAM_STICKERS = [
  '\uD83D\uDE00', '\uD83D\uDE02', '\uD83D\uDE0D', '\uD83D\uDE0E', '\uD83D\uDE12',
  '\uD83D\uDE18', '\uD83D\uDE22', '\uD83D\uDE29', '\u2764\uFE0F', '\uD83D\uDC4D',
  '\uD83D\uDC4E', '\uD83D\uDC4C', '\uD83D\uDC4F', '\uD83C\uDF89', '\uD83D\uDE80',
  '\uD83C\uDF1F', '\uD83D\uDCAA', '\uD83D\uDE4C', '\uD83E\uDD1F', '\uD83E\uDD1D'
]

const badgeStyles = (badge) => {
  const map = {
    'verified': { icon: '✅', bg: 'rgba(42,171,238,0.15)', color: '#2aabee', border: '1px solid rgba(42,171,238,0.3)' },
    'samurai': { icon: '⚔️', bg: 'rgba(156,39,176,0.15)', color: '#9c27b0', border: '1px solid rgba(156,39,176,0.3)' },
    'real madrid': { icon: '👑', bg: 'rgba(255,193,7,0.15)', color: '#ffc107', border: '1px solid rgba(255,193,7,0.3)' },
    'barcelona': { icon: '🔵', bg: 'rgba(21,101,192,0.15)', color: '#1565c0', border: '1px solid rgba(21,101,192,0.3)' },
    'mercedes': { icon: '⭐', bg: 'rgba(200,200,200,0.2)', color: '#e0e0e0', border: '1px solid rgba(200,200,200,0.3)' },
    'bmw': { icon: '🌀', bg: 'rgba(52,152,219,0.15)', color: '#3498db', border: '1px solid rgba(52,152,219,0.3)' },
  }
  const key = Object.keys(map).find(k => badge.toLowerCase().includes(k))
  return key ? map[key] : { icon: '🏅', bg: 'rgba(42,171,238,0.1)', color: 'var(--primary)', border: '1px solid rgba(42,171,238,0.2)' }
}

export default function Chat() {
  const { user, logout } = useAuth()
  const { dark, toggleTheme } = useTheme()
  const { socket } = useSocket()
  const navigate = useNavigate()

  const [chats, setChats] = useState([])
  const [activeChat, setActiveChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [messageText, setMessageText] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showSearch, setShowSearch] = useState(false)
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [showUserSearch, setShowUserSearch] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [groupMembers, setGroupMembers] = useState([])
  const [availableUsers, setAvailableUsers] = useState([])
  const [typing, setTyping] = useState({})
  const [recording, setRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [callUser, setCallUser] = useState(null)
  const [incomingCall, setIncomingCall] = useState(null)
  const [bgPattern, setBgPattern] = useState(() => localStorage.getItem('chatBg') || '')
  const [bgImage, setBgImage] = useState(() => localStorage.getItem('chatBgImage') || '')
  const [showBgMenu, setShowBgMenu] = useState(false)
  const [showChatMenu, setShowChatMenu] = useState(false)
  const [showStickers, setShowStickers] = useState(false)
  const [showUserProfile, setShowUserProfile] = useState(false)
  const [newChatQuery, setNewChatQuery] = useState('')
  const [newChatResults, setNewChatResults] = useState([])
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem('accentColor') || '#2AABEE')
  const [showColorPicker, setShowColorPicker] = useState(false)

  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const bgInputRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const recordingTimerRef = useRef(null)
  const sidebarRef = useRef(null)

  useEffect(() => {
    document.documentElement.style.setProperty('--primary', accentColor)
    localStorage.setItem('accentColor', accentColor)
  }, [accentColor])

  useEffect(() => { localStorage.setItem('chatBg', bgPattern) }, [bgPattern])
  useEffect(() => { localStorage.setItem('chatBgImage', bgImage) }, [bgImage])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => { loadChats() }, [])
  useEffect(() => { scrollToBottom() }, [messages])

  useEffect(() => {
    if (!socket) return
    const handlers = {
      'message-received': (message) => {
        if (activeChat && message.chat === activeChat._id && message.sender?._id !== user._id) setMessages(prev => [...prev, message])
        loadChats()
      },
      'new-message': () => loadChats(),
      'user-typing': (data) => {
        if (data.chatId === activeChat?._id) {
          setTyping(prev => ({ ...prev, [data.userId]: data.username }))
          setTimeout(() => setTyping(prev => { const n = { ...prev }; delete n[data.userId]; return n }), 3000)
        }
      },
      'user-stop-typing': (data) => setTyping(prev => { const n = { ...prev }; delete n[data.userId]; return n }),
      'incoming-call': (data) => setIncomingCall(data),
      'call-accepted': (data) => {
        setCallUser(prev => prev ? { ...prev, signal: data.signal, accepted: true } : prev);
      },
      'call-rejected': () => { setCallUser(null); alert('Call rejected') },
      'call-ended': () => { setCallUser(null); setIncomingCall(null) },
      'ice-candidate': (data) => {
        setCallUser(prev => prev ? { ...prev, iceCandidate: data.candidate } : prev);
      },
    }
    Object.entries(handlers).forEach(([ev, fn]) => socket.on(ev, fn))
    return () => Object.keys(handlers).forEach(ev => socket.off(ev))
  }, [socket, activeChat])

  const loadChats = async () => { try { const { data } = await api.get('/chats'); setChats(data) } catch (e) { console.error(e) } }

  const loadMessages = async (chatId, page = 1) => {
    try {
      const { data } = await api.get(`/messages/${chatId}?page=${page}`)
      setMessages(prev => page === 1 ? data.messages : [...data.messages, ...prev])
    } catch (e) { console.error(e) }
  }

  const selectChat = async (chat) => {
    setActiveChat(chat); setMessages([])
    await loadMessages(chat._id)
    if (socket) socket.emit('join-chat', chat._id)
    if (window.innerWidth <= 768) sidebarRef.current?.classList.add('hidden')
  }

  const handleSearch = async (q) => {
    setSearchQuery(q)
    if (q.length < 2) { setSearchResults([]); setShowSearch(false); return }
    try { const { data } = await api.get(`/users/search?q=${q}`); setSearchResults(data); setShowSearch(true) } catch (e) { console.error(e) }
  }

  const startChat = async (participantId) => {
    try {
      const { data } = await api.post('/chats', { participantId })
      setShowSearch(false); setSearchQuery(''); setSearchResults([])
      await loadChats(); selectChat(data)
    } catch (e) { console.error(e) }
  }

  const sendMessage = async () => {
    if (!messageText.trim() || !activeChat) return
    const content = messageText.trim()
    setMessageText('')
    try {
      if (socket) {
        socket.emit('send-message', { chatId: activeChat._id, content }, (res) => {
          if (res.success) { setMessages(prev => [...prev, res.message]); loadChats() }
        })
      }
    } catch (e) { console.error(e) }
  }

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }

  const handleTyping = () => {
    if (!socket || !activeChat) return
    socket.emit('typing', { chatId: activeChat._id })
    clearTimeout(window.typingTimeout)
    window.typingTimeout = setTimeout(() => socket.emit('stop-typing', { chatId: activeChat._id }), 1000)
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !activeChat) return
    const fd = new FormData()
    fd.append('file', file); fd.append('chatId', activeChat._id)
    try {
      const { data } = await api.post('/messages', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setMessages(prev => [...prev, data]); loadChats()
      if (socket) socket.emit('new-message', { chatId: activeChat._id, message: data })
    } catch (e) { console.error(e) }
    e.target.value = ''
  }

  const handleBgImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      setBgImage(event.target.result)
      setBgPattern('')
      setShowBgMenu(false)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      mediaRecorderRef.current = mr; audioChunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      mr.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const fd = new FormData()
        fd.append('file', blob, 'voice.webm'); fd.append('chatId', activeChat._id); fd.append('messageType', 'voice')
        try {
          const { data } = await api.post('/messages', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
          setMessages(prev => [...prev, data]); loadChats()
          if (socket) socket.emit('new-message', { chatId: activeChat._id, message: data })
        } catch (e) { console.error(e) }
        stream.getTracks().forEach(t => t.stop())
      }
      mr.start(); setRecording(true); setRecordingTime(0)
      recordingTimerRef.current = setInterval(() => setRecordingTime(p => p + 1), 1000)
    } catch (e) { console.error(e) }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop()
    setRecording(false); clearInterval(recordingTimerRef.current)
  }

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  const formatDate = (d) => {
    const date = new Date(d); const now = new Date(); const diff = now - date; const days = Math.floor(diff / 86400000)
    if (days === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (days === 1) return 'Yesterday'
    if (days < 7) return date.toLocaleDateString([], { weekday: 'short' })
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  const getChatName = (chat) => {
    if (chat.isGroup) return chat.groupName
    const other = chat.participants?.find(p => p._id !== user._id)
    return other ? other.displayName || other.username.replace(/^@/, '') : 'Deleted User'
  }

  const getChatAvatar = (chat) => {
    if (chat.isGroup) return null
    return chat.participants?.find(p => p._id !== user._id)?.avatar || null
  }

  const getChatInitials = (chat) => getChatName(chat).charAt(0).toUpperCase()

  const loadGroupUsers = async () => { try { const { data } = await api.get('/users/search?q='); setAvailableUsers(data) } catch (e) { console.error(e) } }
  const openGroupModal = () => { setShowGroupModal(true); setGroupName(''); setGroupMembers([user._id]); loadGroupUsers() }
  const toggleGroupMember = (uid) => setGroupMembers(p => p.includes(uid) ? p.filter(id => id !== uid) : [...p, uid])

  const createGroup = async () => {
    if (!groupName.trim() || groupMembers.length < 2) return
    try {
      const { data } = await api.post('/chats/group', { groupName: groupName.trim(), participants: groupMembers.filter(id => id !== user._id) })
      setShowGroupModal(false); await loadChats(); selectChat(data)
    } catch (e) { console.error(e) }
  }

  const handleCall = (chat) => {
    const otherUser = chat.participants?.find(p => p._id !== user._id)
    if (!otherUser) return
    setCallUser({
      userId: otherUser._id,
      username: otherUser.displayName || otherUser.username,
      avatar: otherUser.avatar,
      peerUser: otherUser._id,
      outgoing: true,
      socket
    })
  }

  const acceptCall = () => {
    if (!incomingCall || !socket) return
    setCallUser({
      userId: incomingCall.from,
      username: incomingCall.fromDisplayName,
      avatar: incomingCall.fromAvatar,
      peerUser: incomingCall.from,
      incomingSignal: incomingCall.signal,
      socket
    }); setIncomingCall(null)
  }

  const rejectCall = () => { if (incomingCall && socket) { socket.emit('reject-call', { to: incomingCall.from }); setIncomingCall(null) } }
  const endCall = () => { if (callUser && socket) { socket.emit('end-call', { to: callUser.userId }); setCallUser(null) } }
  const endCallWithSocket = () => { if (callUser && (callUser.socket || socket)) { (callUser.socket || socket).emit('end-call', { to: callUser.userId }); setCallUser(null) } }
  const handleLogout = () => { logout(); navigate('/login') }

  const sendSticker = (emoji) => {
    if (!activeChat) return
    setMessageText(emoji); setShowStickers(false)
    setTimeout(() => sendMessage(), 100)
  }

  const otherUser = activeChat ? activeChat.participants?.find(p => p._id !== user._id) : null

  return (
    <div className="chat-layout">
      <style>{`
        :root { --primary: ${accentColor}; }
        .mobile-back { display: none; }
        @media (max-width: 768px) {
          .sidebar.hidden { display: none; }
          .mobile-back { display: flex !important; }
        }
        .messages-container {
          background: ${bgImage ? `url(${bgImage})` : (bgPattern || (dark ? '#0D1117' : '#E8EAED'))} !important;
          background-size: ${bgImage ? 'cover' : (bgPattern?.includes('1px') ? '20px 20px' : '100% 100%')} !important;
          background-position: center !important;
        }
      `}</style>

      {/* Sidebar */}
      <div className="sidebar" ref={sidebarRef}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="brand-icon">G</div>
            <span>Grand Chat</span>
          </div>
          <div className="sidebar-header-actions">
            <button className="tbtn" onClick={() => setShowUserSearch(true)} title="New Chat">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            </button>
            <button className="tbtn" onClick={openGroupModal} title="New Group">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
            </button>
          </div>
        </div>

        <div className="search-bar">
          <span className="search-icon">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
          </span>
          <input type="text" placeholder="Search chats..." value={searchQuery}
            onChange={(e) => { handleSearch(e.target.value); }} />
        </div>

        {showSearch && searchResults.length > 0 && (
          <div className="inline-search-results">
            {searchResults.map(u => (
              <div key={u._id} className="inline-search-item" onClick={() => startChat(u._id)}>
                <div className="iavatar">{u.avatar ? <img src={u.avatar} alt="" /> : (u.displayName || u.username.replace(/^@/, '')).charAt(0).toUpperCase()}</div>
                <div>
                  <div className="chat-name">{u.displayName || u.username.replace(/^@/, '')}</div>
                  <div className="chat-preview">@{u.username.replace(/^@/, '')}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="chat-list">
          {chats.length === 0 ? (
            <div className="no-chats">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="var(--text-muted)"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/></svg>
              <p>No chats yet</p>
              <span>Search for users to start messaging</span>
            </div>
          ) : (
            chats.map(chat => (
              <div key={chat._id} className={`chat-item ${activeChat?._id === chat._id ? 'active' : ''}`} onClick={() => selectChat(chat)}>
                <div className={`iavatar ${chat.isGroup ? 'igroup' : ''}`} style={{ background: chat.isGroup ? 'var(--primary)' : undefined }}>
                  {getChatAvatar(chat) ? <img src={getChatAvatar(chat)} alt="" /> : getChatInitials(chat)}
                </div>
                <div className="chat-info">
                  <div className="chat-name">{getChatName(chat)}{!chat.isGroup && chat.participants?.find(p => p._id !== user._id)?.badges?.length > 0 && (
                    chat.participants.find(p => p._id !== user._id).badges.slice(0, 2).map((b, i) => {
                      const s = badgeStyles(b)
                      return <span key={i} style={{ fontSize: 11, marginLeft: i === 0 ? 4 : 0 }}>{s.icon || b}</span>
                    })
                  )}</div>
                  <div className="chat-preview">
                    {chat.lastMessage ? (
                      chat.lastMessage.messageType === 'image' ? '\uD83D\uDDBC Photo' :
                      chat.lastMessage.messageType === 'video' ? '\uD83C\uDFA5 Video' :
                      chat.lastMessage.messageType === 'file' ? '\uD83D\uDCC4 File' :
                      chat.lastMessage.messageType === 'voice' ? '\uD83C\uDFA4 Voice' :
                      chat.lastMessage.content?.slice(0, 40)
                    ) : ''}
                  </div>
                </div>
                <div className="chat-time">{chat.lastMessage ? formatDate(chat.lastMessage.createdAt) : ''}</div>
              </div>
            ))
          )}
        </div>

        <div className="sidebar-footer">
          <button className="tbtn" onClick={() => navigate('/profile')} title="Settings">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
          </button>
          <button className="tbtn" onClick={toggleTheme} title="Theme">
            {dark ? <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/></svg> :
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M20 8.69V4h-4.69L12 .69 8.69 4H4v4.69L.69 12 4 15.31V20h4.69L12 23.31 15.31 20H20v-4.69L23.31 12 20 8.69zM12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm0-10c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z"/></svg>
            }
          </button>
          {user?.isAdmin && (
            <button className="tbtn" onClick={() => navigate('/admin')} title="Admin Panel">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
            </button>
          )}
          <button className="tbtn" onClick={handleLogout} title="Log out">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
          </button>
        </div>
      </div>

      {/* Chat Window */}
      {activeChat ? (
        <div className="chat-window active">
          <div className="chat-window-header">
            <button className="tbtn mobile-back" onClick={() => sidebarRef.current?.classList.remove('hidden')}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
            </button>
            <div className="iavatar" style={{ background: activeChat.isGroup ? 'var(--primary)' : undefined, cursor: !activeChat.isGroup ? 'pointer' : 'default' }}
              onClick={() => { if (!activeChat.isGroup && otherUser) setShowUserProfile(true) }}>
              {getChatAvatar(activeChat) ? <img src={getChatAvatar(activeChat)} alt="" /> : getChatInitials(activeChat)}
            </div>
            <div className="chat-window-info" style={{ cursor: !activeChat.isGroup ? 'pointer' : 'default' }}
              onClick={() => { if (!activeChat.isGroup && otherUser) setShowUserProfile(true) }}>
              <h3>{getChatName(activeChat)} {!activeChat.isGroup && otherUser?.badges?.length > 0 && (
                otherUser.badges.slice(0, 3).map((b, i) => {
                  const s = badgeStyles(b)
                  return <span key={i} style={{ fontSize: 14, marginLeft: 2 }}>{s.icon || b}</span>
                })
              )}</h3>
              <span className="status-text">
                {typing[Object.keys(typing)[0]]
                  ? `typing...`
                  : otherUser?.isOnline
                    ? 'online'
                    : activeChat.isGroup
                      ? `${activeChat.participants?.length || 0} members`
                      : ''}
              </span>
            </div>
            <div className="chat-window-actions">
              <button className="tbtn" onClick={() => handleCall(activeChat)} title="Call">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
              </button>
              <button className="tbtn" onClick={() => setShowBgMenu(!showBgMenu)} title="Chat Background">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
              </button>
              <div style={{ position: 'relative' }}>
                <button className="tbtn" onClick={() => setShowChatMenu(p => !p)} title="More">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
                </button>
                {showChatMenu && (
                  <div className="chat-menu-dropdown">
                    <button className="chat-menu-item" onClick={() => { setShowUserProfile(true); setShowChatMenu(false) }}>
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                      Profile
                    </button>
                    <button className="chat-menu-item danger" onClick={async () => { if (confirm('Clear all messages in this chat?')) { await api.delete(`/messages/chat/${activeChat._id}`); setMessages([]); loadChats() } setShowChatMenu(false) }}>
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                      Clear Chat
                    </button>
                    <button className="chat-menu-item danger" onClick={async () => { if (confirm('Delete this chat? This cannot be undone.')) { await api.delete(`/chats/${activeChat._id}`); setActiveChat(null); setMessages([]); loadChats() } setShowChatMenu(false) }}>
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                      Delete Chat
                    </button>
                    <div className="chat-menu-divider" />
                    <button className="chat-menu-item" onClick={() => { toggleTheme(); setShowChatMenu(false) }}>
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M20 8.69V4h-4.69L12 .69 8.69 4H4v4.69L.69 12 4 15.31V20h4.69L12 23.31 15.31 20H20v-4.69L23.31 12 20 8.69z"/></svg>
                      {dark ? 'Light Mode' : 'Dark Mode'}
                    </button>
                    <button className="chat-menu-item" onClick={() => { setShowBgMenu(true); setShowChatMenu(false) }}>
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
                      Change Background
                    </button>
                    <button className="chat-menu-item" onClick={() => { handleLogout(); setShowChatMenu(false) }}>
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
                      Log out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {showBgMenu && (
            <div className="bg-menu">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Chat Background</span>
                <button className="tbtn tbtn-sm" onClick={() => setShowBgMenu(false)}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                </button>
              </div>
              <div className="bg-grid">
                {BG_PATTERNS.map(p => (
                  <button key={p.name} className={`bg-opt ${bgPattern === p.value && !bgImage ? 'active' : ''}`}
                    onClick={() => { setBgPattern(p.value); setBgImage(''); setShowBgMenu(false) }}
                    style={p.value ? { background: p.value } : { background: dark ? '#0D1117' : '#E8EAED' }}>
                    {p.name === 'None' ? 'X' : ''}
                  </button>
                ))}
                <button className="bg-opt" onClick={() => bgInputRef.current?.click()}
                  style={{ fontSize: 18, border: '2px dashed var(--text-muted)', color: 'var(--text-muted)' }}>
                  +
                </button>
              </div>
              <input type="file" ref={bgInputRef} onChange={handleBgImageUpload} accept="image/*" style={{ display: 'none' }} />
              {bgImage && (
                <button className="btn btn-sm btn-outline" style={{ marginTop: 8, width: '100%' }}
                  onClick={() => { setBgImage(''); setBgPattern(''); setShowBgMenu(false) }}>
                  Remove Background
                </button>
              )}
              <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>Accent Color</div>
              <div className="color-grid">
                {COLORS.map(c => (
                  <button key={c} className={`color-dot ${accentColor === c ? 'active' : ''}`}
                    style={{ background: c }} onClick={() => { setAccentColor(c); setShowBgMenu(false) }} />
                ))}
              </div>
            </div>
          )}

          <div className="messages-container">
            {messages.length === 0 && (
              <div className="chat-start-msg">
                <div className="iavatar iavatar-lg">
                  {getChatAvatar(activeChat) ? <img src={getChatAvatar(activeChat)} alt="" /> : getChatInitials(activeChat)}
                </div>
                <h3>{getChatName(activeChat)}</h3>
                <p>{activeChat.isGroup ? 'Group created' : 'Say hello!'}</p>
              </div>
            )}
            {messages.map((msg, idx) => {
              const isSelf = msg.sender?._id === user._id
              return (
                <div key={msg._id || idx} className={`msg ${isSelf ? 'msg-self' : 'msg-other'}`}>
                  {activeChat.isGroup && !isSelf && (
                    <div className="msg-sender">{msg.sender?.displayName || msg.sender?.username?.replace(/^@/, '')}</div>
                  )}
                  {msg.messageType === 'text' && <div className="msg-text">{msg.content}</div>}
                  {msg.messageType === 'image' && <img className="msg-media" src={msg.fileUrl} alt="" loading="lazy" />}
                  {msg.messageType === 'video' && <video className="msg-media" src={msg.fileUrl} controls />}
                  {msg.messageType === 'voice' && (
                    <div className="msg-voice-row">
                      <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>
                      <audio src={msg.fileUrl} controls style={{ height: 36 }} />
                    </div>
                  )}
                  {msg.messageType === 'file' && (
                    <div className="msg-file-row">
                      <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z"/></svg>
                      <div>
                        <div style={{ fontSize: 13 }}>{msg.fileName}</div>
                        <a href={msg.fileUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: isSelf ? 'rgba(255,255,255,0.7)' : 'var(--primary)' }}>Open</a>
                      </div>
                    </div>
                  )}
                  <div className="msg-meta">
                    <span>{formatDate(msg.createdAt)}</span>
                    {isSelf && (
                      <span className="msg-check">
                        {msg.readBy?.length > 1 ? '\u2714\u2714' : '\u2714'}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
            {Object.keys(typing).length > 0 && (
              <div className="msg msg-other" style={{ padding: '6px 12px' }}>
                <div className="typing-dots">
                  <span /><span /><span />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {recording ? (
            <div className="voice-bar-container">
              <span className="voice-timer">{formatTime(recordingTime)}</span>
              <div className="voice-waveform">
                {Array.from({ length: 30 }).map((_, i) => (
                  <div key={i} className="vw-bar" style={{ animationDelay: `${i * 0.08}s`, height: `${6 + Math.random() * 24}px` }} />
                ))}
              </div>
              <button className="voice-cancel" onClick={stopRecording}>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
              </button>
            </div>
          ) : (
            <div className="msg-input">
              <button className="tbtn" onClick={() => setShowStickers(!showStickers)} title="Stickers">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/></svg>
              </button>
              <button className="tbtn" onClick={startRecording} title="Voice">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-2.3-3.3c0 1.34 1.21 2.3 2.3 2.3 1.09 0 2.3-.96 2.3-2.3H9.7zm10.3-.7h-1.7c0 3.41-2.72 6.23-6 6.72V21h-2v-3.28c-3.28-.48-6-3.3-6-6.72H4c0 3.86 3.13 7.1 7 7.44V21h2v-3.28c3.87-.34 7-3.58 7-7.44z"/></svg>
              </button>
              <button className="tbtn" onClick={() => fileInputRef.current?.click()} title="Attach">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/></svg>
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} accept="image/*,video/*,.pdf,.doc,.docx,.txt" />
              <input type="text" className="msg-input-field" value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={handleKeyDown} onInput={handleTyping}
                placeholder="Message" />
              <button className="tbtn tbtn-send" onClick={sendMessage} disabled={!messageText.trim()}
                style={{ color: messageText.trim() ? 'var(--primary)' : 'var(--text-muted)' }}>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
              </button>
            </div>
          )}

          {showStickers && (
            <div className="sticker-grid">
              {TELEGRAM_STICKERS.map((s, i) => (
                <button key={i} className="sticker-btn" onClick={() => sendSticker(s)}>{s}</button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="welcome-screen">
          <div className="welcome-logo">G</div>
          <h2>Grand Chat</h2>
          <p>Select a chat to start messaging</p>
        </div>
      )}

      {incomingCall && <CallModal caller={incomingCall} onAccept={acceptCall} onReject={rejectCall} incoming socket={socket} peerUser={incomingCall.from} />}
      {callUser && <CallModal user={callUser} onEnd={endCallWithSocket} socket={callUser.socket || socket} peerUser={callUser.peerUser} />}

      {/* User Profile Modal */}
      {showUserProfile && otherUser && (
        <div className="modal-overlay" onClick={() => setShowUserProfile(false)}>
          <div className="user-profile-modal" onClick={e => e.stopPropagation()}>
            <div className="up-avatar" onClick={() => setShowUserProfile(false)}>
              {otherUser.avatar ? <img src={otherUser.avatar} alt="" /> : (otherUser.displayName || otherUser.username.replace(/^@/, '')).charAt(0).toUpperCase()}
            </div>
            <h3>{otherUser.displayName || otherUser.username.replace(/^@/, '')}</h3>
            {otherUser.badges?.length > 0 && (
              <div className="up-badges" style={{ marginTop: 8, display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap' }}>
                {otherUser.badges.map((b, i) => {
                  const badgeStyle = badgeStyles(b)
                  return (
                    <span key={i} style={{
                      padding: badgeStyle.pad || '2px 8px',
                      borderRadius: 6, fontSize: 12, fontWeight: 600,
                      background: badgeStyle.bg, color: badgeStyle.color,
                      border: badgeStyle.border || 'none',
                      display: 'inline-flex', alignItems: 'center', gap: 2
                    }}>
                      {badgeStyle.icon && <span>{badgeStyle.icon}</span>}
                      {b === '✅' ? '' : b}
                    </span>
                  )
                })}
              </div>
            )}
            <div className="up-username">@{otherUser.username.replace(/^@/, '')}</div>
            {otherUser.bio && <div className="up-bio">{otherUser.bio}</div>}
            <div className="up-status">
              <span className={`badge ${otherUser.isOnline ? 'badge-success' : ''}`} style={{ background: otherUser.isOnline ? 'rgba(67,160,71,0.15)' : 'var(--bg-tertiary)', color: otherUser.isOnline ? 'var(--success)' : 'var(--text-muted)' }}>
                {otherUser.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="up-actions">
              <button className="tbtn" onClick={() => { handleCall(activeChat); setShowUserProfile(false) }} title="Call" style={{ width: 48, height: 48, fontSize: 24 }}>
                📞
              </button>
            </div>
          </div>
        </div>
      )}

      {showGroupModal && (
        <div className="modal-overlay" onClick={() => setShowGroupModal(false)}>
          <div className="user-profile-modal" onClick={e => e.stopPropagation()} style={{ maxHeight: '80vh', overflow: 'auto' }}>
            <h3 style={{ textAlign: 'center', marginBottom: 16 }}>New Group</h3>
            <input type="text" placeholder="Group name..." value={groupName}
              onChange={e => setGroupName(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--bg-tertiary)', color: 'var(--text)', fontSize: 14, marginBottom: 12, boxSizing: 'border-box' }} />
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>Members ({groupMembers.length}):</p>
            <div style={{ maxHeight: 200, overflow: 'auto' }}>
              {availableUsers.filter(u => u._id !== user._id).map(u => (
                <div key={u._id} className="admin-nav-item" onClick={() => toggleGroupMember(u._id)}
                  style={{ padding: '8px 12px', cursor: 'pointer', background: groupMembers.includes(u._id) ? 'rgba(42,171,238,0.1)' : undefined }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="chat-avatar" style={{ width: 28, height: 28, fontSize: 12 }}>
                      {u.avatar ? <img src={u.avatar} alt="" /> : (u.displayName || u.username).charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: 13 }}>{u.displayName || u.username}</span>
                    {groupMembers.includes(u._id) && <span style={{ marginLeft: 'auto', color: 'var(--primary)' }}>✓</span>}
                  </div>
                </div>
              ))}
            </div>
            <button className="btn btn-primary" onClick={createGroup} disabled={!groupName.trim() || groupMembers.length < 2}
              style={{ marginTop: 12 }}>
              Create Group
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
