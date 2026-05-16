import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../App.jsx'

// Demo accounts for quick login during presentation
const DEMO_ACCOUNTS = [
  { label: '🎓 Participant',  role: 'participant', id: 'demo_participant', name: 'Sarah Tan (Demo)' },
  { label: '⚙️ Admin',        role: 'admin',       id: 'demo_admin',       name: 'Admin (Demo)' },
  { label: '🧑‍🏫 Mentor',     role: 'mentor',      id: 'demo_mentor',      name: 'Priya Ramasamy (Demo)' },
]

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [role, setRole] = useState('participant')
  const [id, setId] = useState('')

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

        <div className="auth-divider">or log in with entity ID</div>

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
            <input className="form-control" placeholder="e.g. part_abc123" value={id}
              onChange={e => setId(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary w-full" style={{ justifyContent: 'center' }}>
            Sign In
          </button>
        </form>

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
