import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../App.jsx'
import { api } from '../api.js'
import toast from 'react-hot-toast'
import MatchExplainerModal from '../components/MatchExplainerModal.jsx'

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
  const [activeTab, setActiveTab] = useState('participants')
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(true)
  const [loggingId, setLoggingId] = useState(null)
  const [outcomeForm, setOutcomeForm] = useState({ type: 'project_completed', details: '' })
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [explainingRelId, setExplainingRelId] = useState(null)
  const [respondingTo, setRespondingTo] = useState(null)
  const [messageDraft, setMessageDraft] = useState({})
  const [sendingTo, setSendingTo] = useState(null)

  useEffect(() => {
    if (!user?.id) return
    api.getMentorRecommendations(user.id)
      .then(data => {
        setRecommendations(data.recommendations || [])
      })
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [user?.id])

  const reloadRecommendations = async () => {
    if (!user?.id) return
    const data = await api.getMentorRecommendations(user.id)
    setRecommendations(data.recommendations || [])
  }

  const handleRespond = async (relId, responseStatus) => {
    setRespondingTo(relId + responseStatus)
    try {
      await api.respondToRequest({ relationship_id: relId, response: responseStatus })
      toast.success(responseStatus === 'accepted' ? 'Connected with participant!' : 'Request declined')
      await reloadRecommendations()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setRespondingTo(null)
    }
  }

  const handleSendMessage = async (relId) => {
    const text = (messageDraft[relId] || '').trim()
    if (!text) return
    setSendingTo(relId)
    try {
      await api.sendMessage({ relationship_id: relId, sender: 'mentor', text })
      setMessageDraft(d => ({ ...d, [relId]: '' }))
      await reloadRecommendations()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSendingTo(null)
    }
  }

  const loadProfile = async () => {
    if (profile || !user?.id) return
    setProfileLoading(true)
    try {
      const data = await api.getMentorProfile(user.id)
      setProfile(data)
    } catch (err) {
      toast.error('Failed to load profile: ' + err.message)
    } finally {
      setProfileLoading(false)
    }
  }

  const handleLogOutcome = async (relId) => {
    if (!outcomeForm.details) return toast.error('Please describe the outcome')
    try {
      await api.logOutcome({ relationship_id: relId, type: outcomeForm.type, details: outcomeForm.details })
      toast.success('Outcome logged!')
      setLoggingId(null)
      setOutcomeForm({ type: 'project_completed', details: '' })
      // Reload recommendations
      api.getMentorRecommendations(user.id)
        .then(data => {
          setRecommendations(data.recommendations || [])
        })
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="app-shell">
      <Navbar />
      <MatchExplainerModal relationshipId={explainingRelId} onClose={() => setExplainingRelId(null)} />
      <div className="container" style={{ padding: '32px 24px', maxWidth: '860px', margin: '0 auto' }}>
        <div className="page-header">
          <div className="page-title">Mentor Dashboard</div>
          <div className="page-subtitle">Your matched and assigned participants</div>
        </div>

        <div className="tabs" style={{ marginBottom: '32px' }}>
          <button className={`tab ${activeTab === 'participants' ? 'active' : ''}`} onClick={() => setActiveTab('participants')}>
            🎓 Participants
          </button>
          <button className={`tab ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => { setActiveTab('profile'); loadProfile() }}>
            👤 Profile
          </button>
        </div>

        {activeTab === 'participants' && (loading ? (
          <div className="loading-state"><div className="spinner" /></div>
        ) : recommendations.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🧑‍🏫</div>
            <p>No participant matches yet.</p>
          </div>
        ) : (
          <div className="fade-in">
            <div className="section-title mb-8">Your Participants ({recommendations.length})</div>
            <div className="section-subtitle">Participants matched to your expertise</div>

            {recommendations.map(rec => {
              const statusLabel = {
                accepted: 'Connected',
                requested: 'Pending',
                assigned: 'Assigned',
                recommended: 'Recommended',
                declined: 'Declined',
              }[rec.status] || rec.status
              const statusClass = rec.status === 'accepted' || rec.status === 'assigned' ? 'assigned' : rec.status === 'requested' ? 'pending' : 'recommended'
              return (
                <div key={rec.id} className="match-card">
                  <div className="match-card-header">
                    <div>
                      <div className="match-card-title">
                        🎓 {rec.participant?.name}
                      </div>
                      <div className="match-card-meta">
                        {rec.participant?.type} • {rec.participant?.experience_level}
                        {rec.participant?.location && ` • ${rec.participant.location}`}
                      </div>
                    </div>
                    <span className={`score-pill ${statusClass}`}>
                      {statusLabel} • {Math.round(rec.match_score * 100)}%
                    </span>
                  </div>

                  {rec.participant?.skills && (
                    <div style={{ marginBottom: '12px' }}>
                      <div className="text-xs text-muted font-semibold mb-6" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Skills
                      </div>
                      <div className="match-tags">
                        {rec.participant.skills.slice(0, 4).map((s, i) => (
                          <span key={i} className="tag">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="match-reasoning"><strong>Why:</strong> {rec.reasoning}</div>

                  {rec.fit_factors?.length > 0 && (
                    <div className="fit-factors">
                      {rec.fit_factors.map(f => <span key={f} className="fit-tag">✓ {f.replace(/_/g, ' ')}</span>)}
                    </div>
                  )}

                  {rec.outcomes?.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <div className="text-xs text-muted font-semibold mb-8" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Logged Outcomes
                      </div>
                      {rec.outcomes.map((o, i) => (
                        <div key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                          ✓ {o.type?.replace(/_/g, ' ')}: {o.details}
                        </div>
                      ))}
                    </div>
                  )}

                  {rec.status === 'requested' && (
                    <div style={{ background: 'rgba(251,188,4,0.06)', padding: '12px', borderRadius: '8px', marginBottom: '12px', border: '1px solid rgba(251,188,4,0.2)' }}>
                      <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '8px', fontWeight: 500 }}>
                        🔔 {rec.participant?.name} wants to connect with you
                      </div>
                      <div className="flex gap-8">
                        <button className="btn btn-success btn-sm" disabled={!!respondingTo}
                          onClick={() => handleRespond(rec.id, 'accepted')}>
                          {respondingTo === rec.id + 'accepted' ? '...' : '✓ Accept'}
                        </button>
                        <button className="btn btn-danger btn-sm" disabled={!!respondingTo}
                          onClick={() => handleRespond(rec.id, 'declined')}>
                          {respondingTo === rec.id + 'declined' ? '...' : '✗ Decline'}
                        </button>
                      </div>
                    </div>
                  )}

                  {rec.status === 'accepted' && (
                    <div style={{ background: 'rgba(52,168,83,0.06)', padding: '12px', borderRadius: '8px', marginBottom: '12px', border: '1px solid rgba(52,168,83,0.2)' }}>
                      <div className="text-xs text-muted font-semibold mb-8" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        💬 Messages
                      </div>
                      {rec.messages?.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px', maxHeight: '200px', overflowY: 'auto' }}>
                          {rec.messages.map((m, i) => (
                            <div key={i} style={{
                              alignSelf: m.sender === 'mentor' ? 'flex-end' : 'flex-start',
                              maxWidth: '80%',
                              background: m.sender === 'mentor' ? 'var(--blue-glow)' : 'rgba(255,255,255,0.04)',
                              border: `1px solid ${m.sender === 'mentor' ? 'rgba(66,133,244,0.2)' : 'var(--border)'}`,
                              padding: '6px 10px', borderRadius: '10px', fontSize: '13px',
                              color: 'var(--text-primary)',
                            }}>
                              {m.text}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>No messages yet — start the conversation.</div>
                      )}
                      <div className="flex gap-8">
                        <input className="form-control" placeholder="Write a message..." style={{ flex: 1 }}
                          value={messageDraft[rec.id] || ''}
                          onChange={e => setMessageDraft(d => ({ ...d, [rec.id]: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter') handleSendMessage(rec.id) }} />
                        <button className="btn btn-primary btn-sm" disabled={sendingTo === rec.id || !messageDraft[rec.id]?.trim()}
                          onClick={() => handleSendMessage(rec.id)}>Send</button>
                      </div>
                    </div>
                  )}

                  {loggingId === rec.id ? (
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
                        <button className="btn btn-primary btn-sm" onClick={() => handleLogOutcome(rec.id)}>Save</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setLoggingId(null); setOutcomeForm({ type: 'project_completed', details: '' }) }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-8 items-center">
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {rec.engagement?.hours || 0}h mentored · {rec.engagement?.meetings || 0} meetings
                      </div>
                      <button className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }}
                        onClick={() => setExplainingRelId(rec.id)}>
                        🤖 How was this matched?
                      </button>
                      <button className="btn btn-secondary btn-sm"
                        onClick={() => setLoggingId(rec.id)}>
                        + Log Outcome
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}

        {activeTab === 'profile' && (
          <div className="fade-in">
            <div className="section-title mb-8">Your Profile</div>
            <div className="section-subtitle">The information AI uses to match you with participants</div>

            {profileLoading && (
              <div className="loading-state">
                <div className="spinner" />
                <span>Loading profile...</span>
              </div>
            )}

            {!profileLoading && profile && (
              <div className="card">
                <div style={{ display: 'grid', gap: '20px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 600 }}>Name</div>
                    <div style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: 500 }}>{profile.name}</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 600 }}>Years Experience</div>
                      <div style={{ color: 'var(--text-primary)' }}>{profile.years || '—'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 600 }}>Availability</div>
                      <div style={{ color: 'var(--text-primary)' }}>{profile.availability || '—'}</div>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 600 }}>Expertise</div>
                    {profile.expertise?.length ? (
                      <div className="match-tags">
                        {profile.expertise.map((s, i) => <span key={i} className="tag">{s}</span>)}
                      </div>
                    ) : <div style={{ color: 'var(--text-muted)' }}>—</div>}
                  </div>

                  {profile.bio && (
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 600 }}>Bio</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', fontStyle: 'italic' }}>{profile.bio}</div>
                    </div>
                  )}

                  {profile.location && (
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 600 }}>Location</div>
                      <div style={{ color: 'var(--text-primary)' }}>{profile.location}</div>
                    </div>
                  )}

                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    Profile ID: <code style={{ color: 'var(--text-secondary)' }}>{profile.id}</code>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
