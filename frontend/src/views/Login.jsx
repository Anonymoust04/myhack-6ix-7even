import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../App.jsx'
import { api } from '../api.js'
import toast from 'react-hot-toast'

// Demo accounts for quick login during presentation
const DEMO_ACCOUNTS = [
  { label: '🎓 Participant',  role: 'participant', id: 'demo_participant', name: 'Sarah Tan (Demo)' },
  { label: '⚙️ Admin',        role: 'admin',       id: 'demo_admin',       name: 'Admin (Demo)' },
  { label: '🧑‍🏫 Mentor',     role: 'mentor',      id: 'demo_mentor',      name: 'Priya Ramasamy (Demo)' },
]

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('find') // 'find' | 'id'
  const [role, setRole] = useState('participant')
  const [id, setId] = useState('')
  const [searchName, setSearchName] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [searching, setSearching] = useState(false)

  const handleDemoLogin = (account) => {
    login(account)
    navigate(`/${account.role}`)
  }

  const handleLogin = (e) => {
    e.preventDefault()
    const trimmed = id.trim()
    if (!trimmed) return
    const user = { role, id: trimmed, name: `User (${trimmed.slice(0, 8)}...)` }
    login(user)
    navigate(`/${role}`)
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchName.trim()) return
    if (role === 'admin') return toast.error('Admin uses demo login above')
    setSearching(true)
    try {
      const res = await api.findAccount(searchName, role)
      setSearchResults(res.matches || [])
      if (!res.matches?.length) toast.error('No accounts found with that name')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSearching(false)
    }
  }

  const handlePickAccount = (account) => {
    login({ role, id: account.id, name: account.name })
    navigate(`/${role}`)
  }

  return (
    <div className="page-center">
      <div className="card-glass auth-card fade-in">
        <div className="auth-logo">
          <div className="auth-logo-text">⬡ EcoLink AI</div>
          <div className="auth-logo-sub">Ecosystem Matching Platform</div>
        </div>

        {/* Demo quick-login */}
        <div className="mb-16">
          <div className="text-xs text-muted mb-8" style={{ textAlign: 'center', letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: 600 }}>
            Demo Accounts
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {DEMO_ACCOUNTS.map((acc) => (
              <button key={acc.role} className="btn btn-secondary w-full" style={{ justifyContent: 'center' }}
                onClick={() => handleDemoLogin(acc)}>
                {acc.label} — {acc.name}
              </button>
            ))}
          </div>
        </div>

        <div className="auth-divider">or sign in to your account</div>

        {/* Mode toggle */}
        <div className="tabs" style={{ marginBottom: '16px' }}>
          <button className={`tab ${mode === 'find' ? 'active' : ''}`} onClick={() => { setMode('find'); setSearchResults(null) }}>
            🔍 Find by Name
          </button>
          <button className={`tab ${mode === 'id' ? 'active' : ''}`} onClick={() => { setMode('id'); setSearchResults(null) }}>
            🔑 Entity ID
          </button>
        </div>

        {mode === 'find' && (
          <form onSubmit={handleSearch}>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-control" value={role} onChange={e => { setRole(e.target.value); setSearchResults(null) }}>
                <option value="participant">Participant</option>
                <option value="mentor">Mentor</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Your Name</label>
              <input className="form-control" placeholder="e.g. Sarah Tan" value={searchName}
                onChange={e => setSearchName(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary w-full" style={{ justifyContent: 'center' }} disabled={searching}>
              {searching ? 'Searching...' : 'Find My Account'}
            </button>

            {searchResults && searchResults.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <div className="text-xs text-muted mb-8" style={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                  Pick your account ({searchResults.length} found)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {searchResults.map((acc) => (
                    <button key={acc.id} className="btn btn-secondary w-full" style={{ justifyContent: 'space-between' }}
                      onClick={() => handlePickAccount(acc)}>
                      <span>{acc.name}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{acc.id.slice(0, 8)}...</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form>
        )}

        {mode === 'id' && (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-control" value={role} onChange={e => setRole(e.target.value)}>
                <option value="participant">Participant</option>
                <option value="admin">Admin</option>
                <option value="mentor">Mentor</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Entity ID (from Firestore)</label>
              <input className="form-control" placeholder="e.g. DDJcbCgBbKNwxm9rUeUl" value={id}
                onChange={e => setId(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary w-full" style={{ justifyContent: 'center' }}>
              Sign In
            </button>
          </form>
        )}

        <div className="auth-divider mt-16">New to EcoLink?</div>
        <Link to="/signup">
          <button className="btn btn-secondary w-full" style={{ justifyContent: 'center' }}>
            Create Account
          </button>
        </Link>
      </div>
    </div>
  )
}
