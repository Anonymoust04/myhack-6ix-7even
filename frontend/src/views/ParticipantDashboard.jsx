import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../App.jsx'
import { api } from '../api.js'
import toast from 'react-hot-toast'
import MatchCard from '../components/MatchCard.jsx'
import MatchExplainerModal from '../components/MatchExplainerModal.jsx'
import ProgrammeDetailModal from '../components/ProgrammeDetailModal.jsx'

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
  const [progSearch, setProgSearch] = useState('')
  const [progFilters, setProgFilters] = useState({ location: '', difficulty: '', focus: '' })
  const [mentorSearch, setMentorSearch] = useState('')
  const [mentorFilters, setMentorFilters] = useState({ expertise: '', location: '' })
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [explainingRelId, setExplainingRelId] = useState(null)
  const [requestingMentor, setRequestingMentor] = useState(null)
  const [feedbackPending, setFeedbackPending] = useState(null)
  const [detailProgrammeId, setDetailProgrammeId] = useState(null)
  const [messageDraft, setMessageDraft] = useState({})
  const [sendingTo, setSendingTo] = useState(null)

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

  const reloadRecommendations = async () => {
    if (!user?.id) return
    const recs = await api.getRecommendations(user.id)
    setData(recs)
  }

  const handleRequestMentor = async (mentorId, relId) => {
    if (!user?.id) return
    setRequestingMentor(relId || mentorId)
    try {
      await api.requestMentor({ participant_id: user.id, mentor_id: mentorId })
      toast.success('Mentor request sent! 🎉')
      await reloadRecommendations()
    } catch (err) {
      toast.error(err.message || 'Could not send request')
    } finally {
      setRequestingMentor(null)
    }
  }

  const handleSendMessage = async (relId) => {
    const text = (messageDraft[relId] || '').trim()
    if (!text) return
    setSendingTo(relId)
    try {
      await api.sendMessage({ relationship_id: relId, sender: 'participant', text })
      setMessageDraft(d => ({ ...d, [relId]: '' }))
      await reloadRecommendations()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSendingTo(null)
    }
  }

  const handleFeedback = async (relId, thumbs) => {
    setFeedbackPending(relId + thumbs)
    try {
      await api.submitMatchFeedback({ relationship_id: relId, sender: 'participant', thumbs })
      toast.success(thumbs === 'up' ? 'Thanks — glad it was useful!' : 'Got it — we\'ll improve future matches')
      await reloadRecommendations()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setFeedbackPending(null)
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
      <MatchExplainerModal relationshipId={explainingRelId} onClose={() => setExplainingRelId(null)} />
      <ProgrammeDetailModal
        programmeId={detailProgrammeId}
        onClose={() => setDetailProgrammeId(null)}
        currentUserId={user?.id}
        onRegister={detailProgrammeId ? () => handleRegister(detailProgrammeId, `detail-${detailProgrammeId}`).then(() => setDetailProgrammeId(null)) : undefined}
        registering={registering === `detail-${detailProgrammeId}`}
      />
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
                    onExplain={() => setExplainingRelId(rec.id)}
                    onFeedback={(thumbs) => handleFeedback(rec.id, thumbs)}
                    feedbackPending={feedbackPending === rec.id + 'up' ? 'up' : feedbackPending === rec.id + 'down' ? 'down' : null}
                    onOpenDetail={() => setDetailProgrammeId(rec.to_entity.id)}
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

                    {data.mentor_recommendations?.map(rec => {
                      const myFeedback = rec.feedback?.find(f => f.sender === 'participant')
                      return (
                        <div key={rec.id} className="match-card">
                          <div className="match-header">
                            <div className="match-title">{rec.mentor?.name}</div>
                            <div className="flex gap-8 items-center">
                              {rec.status === 'requested' && <span className="status-badge pending">Requested</span>}
                              {rec.status === 'accepted' && <span className="status-badge assigned">Connected ✓</span>}
                              <div className="match-score">{Math.round(rec.match_score * 100)}%</div>
                            </div>
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

                          {rec.status === 'accepted' && (
                            <div style={{ background: 'rgba(52,168,83,0.06)', padding: '12px', borderRadius: '8px', marginTop: '12px', border: '1px solid rgba(52,168,83,0.2)' }}>
                              <div className="text-xs text-muted font-semibold mb-8" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                💬 Messages
                              </div>
                              {rec.messages?.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px', maxHeight: '200px', overflowY: 'auto' }}>
                                  {rec.messages.map((m, i) => (
                                    <div key={i} style={{
                                      alignSelf: m.sender === 'participant' ? 'flex-end' : 'flex-start',
                                      maxWidth: '80%',
                                      background: m.sender === 'participant' ? 'var(--blue-glow)' : 'rgba(255,255,255,0.04)',
                                      border: `1px solid ${m.sender === 'participant' ? 'rgba(66,133,244,0.2)' : 'var(--border)'}`,
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

                          <div className="flex gap-8 items-center" style={{ marginTop: '12px', flexWrap: 'wrap' }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => setExplainingRelId(rec.id)}>
                              🤖 How was this matched?
                            </button>
                            {!myFeedback && (
                              <div className="flex gap-8">
                                <button className="btn btn-secondary btn-sm" disabled={feedbackPending === rec.id + 'up'}
                                  onClick={() => handleFeedback(rec.id, 'up')} title="Useful match">👍</button>
                                <button className="btn btn-secondary btn-sm" disabled={feedbackPending === rec.id + 'down'}
                                  onClick={() => handleFeedback(rec.id, 'down')} title="Not a good match">👎</button>
                              </div>
                            )}
                            {myFeedback && (
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                You said {myFeedback.thumbs === 'up' ? '👍' : '👎'}
                              </span>
                            )}
                            {rec.status === 'recommended' && (
                              <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }}
                                disabled={requestingMentor === rec.id}
                                onClick={() => handleRequestMentor(rec.mentor.id, rec.id)}>
                                {requestingMentor === rec.id ? 'Sending...' : '+ Request Mentor'}
                              </button>
                            )}
                            {rec.status === 'requested' && (
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                                Awaiting mentor response
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* All Programmes Tab */}
        {activeTab === 'programmes' && (() => {
          const locations = [...new Set(allProgrammes.map(p => p.location).filter(Boolean))].sort()
          const difficulties = [...new Set(allProgrammes.map(p => p.difficulty).filter(Boolean))].sort()
          const focuses = [...new Set(allProgrammes.flatMap(p => p.focus || []))].sort()
          const filteredProgs = allProgrammes.filter(p => {
            if (progSearch && !(`${p.name} ${p.description || ''}`.toLowerCase().includes(progSearch.toLowerCase()))) return false
            if (progFilters.location && p.location !== progFilters.location) return false
            if (progFilters.difficulty && p.difficulty !== progFilters.difficulty) return false
            if (progFilters.focus && !(p.focus || []).includes(progFilters.focus)) return false
            return true
          })
          const hasFilters = progSearch || progFilters.location || progFilters.difficulty || progFilters.focus
          return (
          <div className="fade-in">
            <div className="section-title mb-8">All Programmes</div>
            <div className="section-subtitle">Browse all available programmes and sign up</div>

            {!browseLoading && allProgrammes.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <input className="form-control" placeholder="🔍 Search programmes..."
                  value={progSearch} onChange={e => setProgSearch(e.target.value)}
                  style={{ marginBottom: '10px' }} />
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <FilterDropdown label="Location" value={progFilters.location} options={locations}
                    onChange={v => setProgFilters(f => ({ ...f, location: v }))} />
                  <FilterDropdown label="Difficulty" value={progFilters.difficulty} options={difficulties}
                    onChange={v => setProgFilters(f => ({ ...f, difficulty: v }))} />
                  <FilterDropdown label="Focus" value={progFilters.focus} options={focuses}
                    onChange={v => setProgFilters(f => ({ ...f, focus: v }))} />
                  {hasFilters && (
                    <button className="btn btn-secondary btn-sm"
                      onClick={() => { setProgSearch(''); setProgFilters({ location: '', difficulty: '', focus: '' }) }}>
                      Clear
                    </button>
                  )}
                  <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-muted)' }}>
                    {filteredProgs.length} of {allProgrammes.length}
                  </span>
                </div>
              </div>
            )}

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
            ) : filteredProgs.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <p>No programmes match your filters.</p>
              </div>
            ) : (
              <div>
                {filteredProgs.map(prog => (
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
                    <div className="flex gap-8" style={{ marginTop: '12px' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setDetailProgrammeId(prog.id)}
                      >
                        👁 View details
                      </button>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleRegister(prog.id, `browse-${prog.id}`)}
                        disabled={registering === `browse-${prog.id}`}
                      >
                        {registering === `browse-${prog.id}` ? 'Registering...' : '+ Register'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          )
        })()}

        {/* All Mentors Tab */}
        {activeTab === 'mentors' && (() => {
          const expertiseOpts = [...new Set(allMentors.flatMap(m => m.expertise || []))].sort()
          const locationOpts = [...new Set(allMentors.map(m => m.location).filter(Boolean))].sort()
          const filteredMentors = allMentors.filter(m => {
            if (mentorSearch && !(`${m.name} ${m.bio || ''}`.toLowerCase().includes(mentorSearch.toLowerCase()))) return false
            if (mentorFilters.expertise && !(m.expertise || []).includes(mentorFilters.expertise)) return false
            if (mentorFilters.location && m.location !== mentorFilters.location) return false
            return true
          })
          const hasFilters = mentorSearch || mentorFilters.expertise || mentorFilters.location
          return (
          <div className="fade-in">
            <div className="section-title mb-8">All Mentors</div>
            <div className="section-subtitle">Browse all available mentors and connect</div>

            {!browseLoading && allMentors.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <input className="form-control" placeholder="🔍 Search mentors..."
                  value={mentorSearch} onChange={e => setMentorSearch(e.target.value)}
                  style={{ marginBottom: '10px' }} />
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <FilterDropdown label="Expertise" value={mentorFilters.expertise} options={expertiseOpts}
                    onChange={v => setMentorFilters(f => ({ ...f, expertise: v }))} />
                  <FilterDropdown label="Location" value={mentorFilters.location} options={locationOpts}
                    onChange={v => setMentorFilters(f => ({ ...f, location: v }))} />
                  {hasFilters && (
                    <button className="btn btn-secondary btn-sm"
                      onClick={() => { setMentorSearch(''); setMentorFilters({ expertise: '', location: '' }) }}>
                      Clear
                    </button>
                  )}
                  <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-muted)' }}>
                    {filteredMentors.length} of {allMentors.length}
                  </span>
                </div>
              </div>
            )}

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
            ) : filteredMentors.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <p>No mentors match your filters.</p>
              </div>
            ) : (
              <div>
                {filteredMentors.map(mentor => (
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
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ marginTop: '12px' }}
                      disabled={requestingMentor === mentor.id}
                      onClick={() => handleRequestMentor(mentor.id)}
                    >
                      {requestingMentor === mentor.id ? 'Sending...' : '+ Request Mentor'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          )
        })()}

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
                      <tr key={rel.id} style={{ cursor: 'pointer' }} onClick={() => setDetailProgrammeId(rel.to_entity?.id)}>
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

function FilterDropdown({ label, value, options, onChange }) {
  return (
    <select
      className="form-control"
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ width: 'auto', padding: '6px 10px', fontSize: '12px' }}
    >
      <option value="">All {label}</option>
      {options.map(opt => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  )
}
