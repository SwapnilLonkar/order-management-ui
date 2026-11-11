import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import type { Role } from '../api/types'

export default function AuthPage() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('CUSTOMER')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === 'login') {
        await login(username, password)
      } else {
        await register(username, password, role)
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Something went wrong. Try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Order Management</h1>
        <p className="muted">
          {mode === 'login'
            ? 'Sign in to manage products, customers and orders.'
            : 'Create an account to get started.'}
        </p>
        <label>
          Username
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        </label>
        {mode === 'register' && (
          <label>
            I am a
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              <option value="CUSTOMER">Customer — I buy products</option>
              <option value="SELLER">Seller — I sell products</option>
            </select>
          </label>
        )}
        {error && <div className="error">{error}</div>}
        <button type="submit" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Register'}
        </button>
        <button
          type="button"
          className="link-button"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login')
            setError(null)
          }}
        >
          {mode === 'login'
            ? 'No account yet? Register'
            : 'Already have an account? Sign in'}
        </button>
      </form>
    </div>
  )
}
