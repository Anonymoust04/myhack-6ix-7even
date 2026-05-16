import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../App.jsx'
import { api } from '../api.js'
import toast from 'react-hot-toast'

function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  return (
    <nav className="navbar">
      <div className="navbar-brand"><div className="logo-dot" />EcoLink AI</div>
      <div className="navbar-right">
        <span className="role-badge mentor">Mentor</span>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{user?.name}</span>
        <button className="btn btn-secondary btn-sm" onClick={() => { logout(); navigate('/login') }}>Sign out</button>
      </div>
    </nav>
  )
}

export default function MentorDashboard() {
  const { user } = useAuth()
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    api.getMatches({ type: 'mentor_company' })
      .then(matches => {
        const mine = matches.filter(m =>
          m.from_entity?.id === user.id && m.status === 'assigned'
        )
        setAssignments(mine)
      })
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [user?.id])

  const handleLogOutcome = async (relId) => {
    const details = prompt('Describe the outcome (e.g. "Completed pitch deck review")')
    if (!details) return
    try {
      await api.logOutcome({ relationship_id: relId, type: 'project_completed', details })
      toast.success('Outcome logged!')
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="app-shell">
      <Navbar />
      <div className="container" style={{ padding: '32px 24px', maxWidth: '860px', margin: '0 auto' }}>
        <div className="page-header">
          <div className="page-title">Mentor Dashboard</div>
          <div className="page-subtitle">Your assigned companies and participants</div>
        </div>

        {loading ? (
          <div className="loading-state"><div className="spinner" /></div>
        ) : assignments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🧑‍🏫</div>
            <p>No assignments yet. The admin will assign you to companies after running matching.</p>
          </div>
        ) : (
          <div className="fade-in">
            <div className="section-title mb-8">Your Assignments ({assignments.length})</div>
            <div className="section-subtitle">Companies and participants you've been matched with</div>

            {assignments.map(a => (
              <div key={a.id} className="match-card">
                <div className="match-card-header">
                  <div>
                    <div className="match-card-title">
                      {a.to_entity?.type === 'company' ? '🏢' : '🎓'} {a.to_entity?.id}
                    </div>
                    <div className="match-card-meta">{a.type?.replace('_', ' → ')}</div>
                  </div>
                  <span className="score-pill high">Assigned</span>
                </div>

                <div className="match-reasoning">{a.reasoning}</div>

                <div className="fit-factors">
                  {a.fit_factors?.map(f => <span key={f} className="fit-tag">{f.replace(/_/g, ' ')}</span>)}
                </div>

                {a.outcomes?.length > 0 && (
                  <div style={{ marginBottom: '12px' }}>
                    <div className="text-xs text-muted font-semibold mb-8" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Logged Outcomes
                    </div>
                    {a.outcomes.map((o, i) => (
                      <div key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        ✓ {o.type?.replace(/_/g, ' ')}: {o.details}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-8">
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {a.engagement?.hours || 0}h mentored · {a.engagement?.meetings || 0} meetings
                  </div>
                  <button className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }}
                    onClick={() => handleLogOutcome(a.id)}>
                    + Log Outcome
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
