import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '', displayName: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmPassword) {
      return setError('Passwords do not match')
    }
    if (form.password.length < 6) {
      return setError('Password must be at least 6 characters')
    }

    setLoading(true)
    try {
      await register(form.username, form.email, form.password, form.displayName || form.username)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <h1>Grand Chat</h1>
          <p>Create your account</p>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input type="text" name="username" value={form.username} onChange={handleChange} placeholder="Choose a username" required minLength={3} />
          </div>

          <div className="form-group">
            <label>Display Name</label>
            <input type="text" name="displayName" value={form.displayName} onChange={handleChange} placeholder="Your display name (optional)" />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="Enter your email" required />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input type="password" name="password" value={form.password} onChange={handleChange} placeholder="Create a password" required minLength={6} />
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} placeholder="Confirm your password" required />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  )
}
