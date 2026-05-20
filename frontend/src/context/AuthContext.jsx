import { createContext, useContext, useState, useEffect } from 'react'
import api from '../utils/api'

const AuthContext = createContext()

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    if (token && savedUser) {
      setUser(JSON.parse(savedUser))
      fetchUser()
    } else {
      setLoading(false)
    }
  }, [])

  const fetchUser = async () => {
    try {
      const { data } = await api.get('/auth/me')
      setUser(data)
      localStorage.setItem('user', JSON.stringify(data))
    } catch (error) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password })
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
    return data
  }

  const register = async (username, email, password, displayName) => {
    const { data } = await api.post('/auth/register', { username, email, password, displayName })
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
    return data
  }

  const logout = () => {
    try {
      const t = localStorage.getItem('token');
      fetch('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${t}` } }).catch(() => {})
    } catch(e) {}
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  const updateUser = (userData) => {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, fetchUser }}>
      {children}
    </AuthContext.Provider>
  )
}
