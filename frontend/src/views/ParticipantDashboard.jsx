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
  const [activeTab, setActiveTab] = useState('recommendations')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState(null)
  const [myProgrammes, setMyProgrammes] = useState([])
  const [allProgrammes, setAllProgrammes] = useState([])
  const [allMentors, setAllMentors] = useState([])
  const [browseLoading, setBrowseLoading] = useState(false)
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)

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

  const loadBrowseData = async () => {
    if (allProgrammes.length > 0 && allMentors.length > 0) return
    setBrowseLoading(true)
    try {
      const [progs, mentors] = await Promise.all([
        api.listProgrammes(),
        api.listMentors(),
      ])
      setAllProgrammes(progs)
      setAllMentors(mentors)
    } catch (err) {
      toast.error('Failed to load browse data: ' + err.message)
    } finally {
      setBrowseLoading(false)
    }
  }

  const loadProfile = async () => {
    if (profile || !user?.id) return
    setProfileLoading(true)
    try {
      const data = await api.getParticipantProfile(user.id)
      setProfile(data)
    } catch (err) {
      toast.error('Failed to load profile: ' + err.message)
    } finally {
      setProfileLoading(false)
    }
  }

  const handleRegister = async (programmeId, relId) => {
    if (!user?.id) {
      toast.error('User not logged in')
      return
    }
    setRegistering(relId)
    try {
      await api.registerProgramme({ participant_id: user.id, programme_id: programmeId })
      toast.success('You\'re registered! 🎉')

      // Reload programmes to move card from browse to "My Programmes"
      const [recs, progs] = await Promise.all([
        api.getRecommendations(user.id),
        api.myProgrammes(user.id),
      ])
      setData(recs)
      setMyProgrammes(progs)

      // Auto-switch to "My Programmes" tab
      setActiveTab('registered')
    } catch (err) {
      console.error('Registration error:', err)
      toast.error(err.message || 'Registration failed')
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
          <div className="page-subtitle">Discover opportunities and mentors</div>
        </div>

        {/* Tabs */}
        <div className="tabs" style={{ marginBottom: '32px' }}>
          <button className={`tab ${activeTab === 'recommendations' ? 'active' : ''}`} onClick={() => setActiveTab('recommendations')}>
            ⭐ For You
          </button>
          <button className={`tab ${activeTab === 'programmes' ? 'active' : ''}`} onClick={() => { setActiveTab('programmes'); loadBrowseData() }}>
            📚 All Programmes
          </button>
          <button className={`tab ${activeTab === 'mentors' ? 'active' : ''}`} onClick={() => { setActiveTab('mentors'); loadBrowseData() }}>
            👥 All Mentors
          </button>
          <button className={`tab ${activeTab === 'registered' ? 'active' : ''}`} onClick={() => setActiveTab('registered')}>
            ✅ My Programmes
          </button>
          <button className={`tab ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => { setActiveTab('profile'); loadProfile() }}>
            👤 Profile
          </button>
        </div>

        {/* For You Tab */}
        {activeTab === 'recommendations' && (
          <>
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

                {/* Programme Recommendations */}
                <div className="section-title mb-8">Recommended Programmes</div>
                <div className="section-subtitle">
                  {data.recommendations?.length
                    ? `${data.recommendations.length} programmes matched to your profile`
                    : 'No matches yet.'}
                </div>

                {data.recommendations?.length === 0 && (
                  <div className="empty-state">
                    <div className="empty-icon">🔍</div>
                    <p>No programme recommendations yet.</p>
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

                {/* Mentor Recommendations */}
                {data.mentor_recommendations && (
                  <div className="mt-24">
                    <div className="section-title mb-8">Recommended Mentors</div>
                    <div className="section-subtitle">
                      {data.mentor_recommendations?.length
                        ? `${data.mentor_recommendations.length} mentors matched to your profile`
                        : 'No mentor matches yet.'}
                    </div>

                    {data.mentor_recommendations?.length === 0 && (
                      <div className="empty-state">
                        <div className="empty-icon">👥</div>
                        <p>No mentor recommendations yet.</p>
                      </div>
                    )}

                    {data.mentor_recommendations?.map(rec => (
                      <div key={rec.id} className="match-card">
                        <div className="match-header">
                          <div className="match-title">{rec.mentor?.name}</div>
                          <div className="match-score">{Math.round(rec.match_score * 100)}%</div>
                        </div>
                        <div className="match-tags">
                          {rec.mentor?.expertise?.slice(0, 3).map((e, i) => (
                            <span key={i} className="tag">{e}</span>
                          ))}
                          {rec.mentor?.years && <span className="tag">📅 {rec.mentor.years} yrs</span>}
                        </div>
                        <div className="match-reasoning">
                          <strong>Why:</strong> {rec.reasoning}
                        </div>
                        {rec.fit_factors?.length > 0 && (
                          <div className="match-factors">
                            {rec.fit_factors.map((f, i) => (
                              <span key={i} className="factor">✓ {f}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* All Programmes Tab */}
        {activeTab === 'programmes' && (
          <div className="fade-in">
            <div className="section-title mb-8">All Programmes</div>
            <div className="section-subtitle">Browse all available programmes and sign up</div>

            {browseLoading ? (
              <div className="loading-state">
                <div className="spinner" />
                <span>Loading programmes...</span>
              </div>
            ) : allProgrammes.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📚</div>
                <p>No programmes available.</p>
              </div>
            ) : (
              <div>
                {allProgrammes.map(prog => (
                  <div key={prog.id} className="match-card">
                    <div className="match-header">
                      <div>
                        <div className="match-title">{prog.name}</div>
                        <div className="match-card-meta">
                          {prog.type} • {prog.difficulty} • {prog.location}
                        </div>
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        👥 {prog.capacity} spots
                      </span>
                    </div>
                    <div style={{ marginBottom: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {prog.description}
                    </div>
                    {prog.focus && (
                      <div className="match-tags">
                        {prog.focus.map((f, i) => (
                          <span key={i} className="tag">{f}</span>
                        ))}
                      </div>
                    )}
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleRegister(prog.id, `browse-${prog.id}`)}
                      disabled={registering === `browse-${prog.id}`}
                      style={{ marginTop: '12px' }}
                    >
                      {registering === `browse-${prog.id}` ? 'Registering...' : '+ Register'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* All Mentors Tab */}
        {activeTab === 'mentors' && (
          <div className="fade-in">
            <div className="section-title mb-8">All Mentors</div>
            <div className="section-subtitle">Browse all available mentors and connect</div>

            {browseLoading ? (
              <div className="loading-state">
                <div className="spinner" />
                <span>Loading mentors...</span>
              </div>
            ) : allMentors.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">👥</div>
                <p>No mentors available.</p>
              </div>
            ) : (
              <div>
                {allMentors.map(mentor => (
                  <div key={mentor.id} className="match-card">
                    <div className="match-header">
                      <div>
                        <div className="match-title">{mentor.name}</div>
                        <div className="match-card-meta">
                          {mentor.years} years experience • {mentor.location || 'Remote'}
                        </div>
                      </div>
                    </div>
                    {mentor.bio && (
                      <div style={{ marginBottom: '12px', fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        {mentor.bio}
                      </div>
                    )}
                    {mentor.availability && (
                      <div style={{ marginBottom: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        📅 Available: {mentor.availability}
                      </div>
                    )}
                    {mentor.expertise && (
                      <div className="match-tags">
                        {mentor.expertise.map((e, i) => (
                          <span key={i} className="tag">{e}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* My Programmes Tab */}
        {activeTab === 'registered' && (
          <div className="fade-in">
            <div className="section-title mb-8">My Programmes</div>
            <div className="section-subtitle">Programmes you've registered for or been assigned to</div>

            {myProgrammes.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">✅</div>
                <p>You haven't registered for any programmes yet.</p>
              </div>
            ) : (
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
            )}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="fade-in">
            <div className="section-title mb-8">Your Profile</div>
            <div className="section-subtitle">The information AI uses to match you</div>

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
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 600 }}>Type</div>
                      <div style={{ color: 'var(--text-primary)' }}>{profile.type || '—'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 600 }}>Experience Level</div>
                      <div style={{ color: 'var(--text-primary)' }}>{profile.experience_level || '—'}</div>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 600 }}>Location</div>
                    <div style={{ color: 'var(--text-primary)' }}>{profile.location || '—'}</div>
                  </div>

                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 600 }}>Skills</div>
                    {profile.skills?.length ? (
                      <div className="match-tags">
                        {profile.skills.map((s, i) => <span key={i} className="tag">{s}</span>)}
                      </div>
                    ) : <div style={{ color: 'var(--text-muted)' }}>—</div>}
                  </div>

                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 600 }}>Interests</div>
                    {profile.interests?.length ? (
                      <div className="match-tags">
                        {profile.interests.map((s, i) => <span key={i} className="tag">{s}</span>)}
                      </div>
                    ) : <div style={{ color: 'var(--text-muted)' }}>—</div>}
                  </div>

                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 600 }}>Goals</div>
                    {profile.goals?.length ? (
                      <div className="match-tags">
                        {profile.goals.map((s, i) => <span key={i} className="tag">{s}</span>)}
                      </div>
                    ) : <div style={{ color: 'var(--text-muted)' }}>—</div>}
                  </div>

                  {profile.ai_summary && (
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 600 }}>AI Summary</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6' }}>{profile.ai_summary}</div>
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
