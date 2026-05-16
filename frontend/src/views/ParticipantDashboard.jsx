import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../App.jsx'
import { api } from '../api.js'
import toast from 'react-hot-toast'
import MatchCard from '../components/MatchCard.jsx'

function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <div className="logo-dot" />
        EcoLink AI
      </div>
      <div className="navbar-right">
        <span className="role-badge participant">Participant</span>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{user?.name}</span>
        <button className="btn btn-secondary btn-sm" onClick={() => { logout(); navigate('/login') }}>
          Sign out
        </button>
      </div>
    </nav>
  )
}

export default function ParticipantDashboard() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState(null)
  const [myProgrammes, setMyProgrammes] = useState([])

  useEffect(() => {
    if (!user?.id) return
    Promise.all([
      api.getRecommendations(user.id),
      api.myProgrammes(user.id),
    ]).then(([recs, progs]) => {
      setData(recs)
      setMyProgrammes(progs)
    }).catch(err => {
      toast.error('Failed to load recommendations: ' + err.message)
    }).finally(() => setLoading(false))
  }, [user?.id])

  const handleRegister = async (programmeId, relId) => {
    setRegistering(relId)
    try {
      await api.registerProgramme({ participant_id: user.id, programme_id: programmeId })
      toast.success('Registration request submitted! Waiting for admin approval.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setRegistering(null)
    }
  }

  return (
    <div className="app-shell">
      <Navbar />
      <div className="container" style={{ padding: '32px 24px', maxWidth: '860px', margin: '0 auto' }}>

        {/* Header */}
        <div className="page-header">
          <div className="page-title">Welcome, {user?.name?.split(' ')[0] || 'there'} 👋</div>
          <div className="page-subtitle">Here are your AI-matched programme recommendations</div>
        </div>

        {loading && (
          <div className="loading-state">
            <div className="spinner" />
            <span>AI is loading your personalised matches...</span>
          </div>
        )}

        {!loading && data && (
          <div className="fade-in">
            {/* AI Summary */}
            {data.summary && (
              <div className="ai-summary-box">
                <div className="ai-summary-label">
                  <span className="ai-icon">🤖</span> Your AI Match Summary
                </div>
                <div className="ai-summary-text">{data.summary}</div>
              </div>
            )}

            {/* Recommendations */}
            <div className="section-title mb-8">Recommended Programmes</div>
            <div className="section-subtitle">
              {data.recommendations?.length
                ? `${data.recommendations.length} programmes matched to your profile`
                : 'No matches yet — the admin may need to run matching first.'}
            </div>

            {data.recommendations?.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <p>No recommendations yet. Check back after the admin runs matching.</p>
              </div>
            )}

            {data.recommendations?.map(rec => (
              <MatchCard
                key={rec.id}
                match={rec}
                onRegister={() => handleRegister(rec.to_entity.id, rec.id)}
                registering={registering === rec.id}
              />
            ))}

            {/* My Programmes */}
            {myProgrammes.length > 0 && (
              <div className="mt-24">
                <div className="section-title mb-8">My Programmes</div>
                <div className="section-subtitle">Programmes you've registered for or been assigned to</div>
                <div className="card">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Programme</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myProgrammes.map(rel => (
                        <tr key={rel.id}>
                          <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                            {rel.programme?.name || rel.to_entity?.id}
                          </td>
                          <td>{rel.programme?.type || '—'}</td>
                          <td><span className={`status-badge ${rel.status}`}>{rel.status}</span></td>
                          <td>{rel.match_score ? `${Math.round(rel.match_score * 100)}%` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
