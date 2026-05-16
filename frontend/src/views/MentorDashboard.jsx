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
  const [loggingId, setLoggingId] = useState(null)
  const [outcomeForm, setOutcomeForm] = useState({ type: 'project_completed', details: '' })

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
    if (!outcomeForm.details) return toast.error('Please describe the outcome')
    try {
      await api.logOutcome({ relationship_id: relId, type: outcomeForm.type, details: outcomeForm.details })
      toast.success('Outcome logged!')
      setLoggingId(null)
      setOutcomeForm({ type: 'project_completed', details: '' })
      // Reload assignments to show new outcome
      api.getMatches({ type: 'mentor_company' })
        .then(matches => {
          const mine = matches.filter(m =>
            m.from_entity?.id === user.id && m.status === 'assigned'
          )
          setAssignments(mine)
        })
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

                {loggingId === a.id ? (
                  <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', marginTop: '12px' }}>
                    <div className="form-group mb-8">
                      <label className="form-label">Outcome Type</label>
                      <select className="form-control" value={outcomeForm.type} onChange={e => setOutcomeForm(f => ({ ...f, type: e.target.value }))}>
                        <option value="skills_gained">Skills Gained</option>
                        <option value="project_completed">Project Completed</option>
                        <option value="job_landed">Job Landed</option>
                        <option value="connection_made">Connection Made</option>
                      </select>
                    </div>
                    <div className="form-group mb-8">
                      <label className="form-label">Details</label>
                      <input className="form-control" value={outcomeForm.details} onChange={e => setOutcomeForm(f => ({ ...f, details: e.target.value }))} placeholder="Describe the outcome..." />
                    </div>
                    <div className="flex gap-8">
                      <button className="btn btn-primary btn-sm" onClick={() => handleLogOutcome(a.id)}>Save</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => { setLoggingId(null); setOutcomeForm({ type: 'project_completed', details: '' }) }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-8">
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {a.engagement?.hours || 0}h mentored · {a.engagement?.meetings || 0} meetings
                    </div>
                    <button className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }}
                      onClick={() => setLoggingId(a.id)}>
                      + Log Outcome
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
