import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../App.jsx'
import { api } from '../api.js'
import toast from 'react-hot-toast'

const STEPS = ['Role', 'Profile', 'Done']

export default function Signup() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)

  const [role, setRole] = useState('participant')
  const [form, setForm] = useState({
    name: '', type: 'student',
    skills: '', interests: '', goals: '',
    experience_level: 'beginner', location: '',
    expertise: '', years: '', availability: '', bio: '',
  })
  const [createdId, setCreatedId] = useState(null)
  const [signupResult, setSignupResult] = useState(null)

  const handleRoleSelect = (r) => { setRole(r); setStep(1) }

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const parseList = (str) => str.split(',').map(s => s.trim()).filter(Boolean)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (role === 'participant') {
        if (!form.name || !form.location) return toast.error('Name and location are required')
        const payload = {
          name: form.name,
          type: form.type,
          skills: parseList(form.skills),
          interests: parseList(form.interests),
          goals: parseList(form.goals),
          experience_level: form.experience_level,
          location: form.location,
        }
        const res = await api.registerParticipant(payload)
        setCreatedId(res.id)
        setSignupResult(res)
        toast.success('Profile created!')
      } else if (role === 'mentor') {
        if (!form.name || !form.years) return toast.error('Name and years experience are required')
        const payload = {
          mentors: [{
            name: form.name,
            expertise: parseList(form.expertise),
            years: parseInt(form.years) || 0,
            availability: form.availability,
            bio: form.bio,
          }]
        }
        const res = await api.uploadMentors(payload)
        setCreatedId(res.ids[0])
        setSignupResult(res)
        toast.success('Mentor profile created!')
      }
      setStep(2)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEnterApp = () => {
    login({ role, id: createdId, name: form.name })
    navigate(`/${role}`)
  }

  return (
    <div className="page-center">
      <div className="card-glass fade-in" style={{ width: '100%', maxWidth: '520px' }}>
        <div className="auth-logo">
          <div className="auth-logo-text">⬡ EcoLink AI</div>
          <div className="auth-logo-sub">Join the ecosystem</div>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '28px' }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{
              flex: 1, height: '3px', borderRadius: '2px',
              background: i <= step ? 'var(--gradient-brand)' : 'var(--border)',
              transition: 'background 0.3s ease',
            }} />
          ))}
        </div>

        {/* Step 0: Role selection */}
        {step === 0 && (
          <div className="fade-in">
            <div className="section-title mb-8">What describes you?</div>
            <div className="section-subtitle">Choose your role to get started</div>
            <div className="role-selector" style={{ gridTemplateColumns: '1fr 1fr' }}>
              {[
                { r: 'participant', icon: '🎓', label: 'Participant' },
                { r: 'mentor',     icon: '🧑‍🏫', label: 'Mentor' },
              ].map(({ r, icon, label }) => (
                <div key={r} className={`role-option ${role === r ? 'selected' : ''}`}
                  onClick={() => handleRoleSelect(r)}>
                  <span className="role-icon">{icon}</span>
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <div className="text-xs text-muted mt-16" style={{ textAlign: 'center' }}>
              Admins are invited by programme organisers. <Link to="/login">Sign in instead</Link>
            </div>
          </div>
        )}

        {/* Step 1: Profile form */}
        {step === 1 && role === 'participant' && (
          <form onSubmit={handleSubmit} className="fade-in">
            <div className="section-title mb-8">Your Profile</div>
            <div className="section-subtitle">Help us match you to the right opportunities</div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="form-control" name="name" value={form.name} onChange={handleChange} placeholder="Sarah Tan" required />
              </div>
              <div className="form-group">
                <label className="form-label">Location *</label>
                <input className="form-control" name="location" value={form.location} onChange={handleChange} placeholder="Kuala Lumpur" required />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">I am a...</label>
                <select className="form-control" name="type" value={form.type} onChange={handleChange}>
                  <option value="student">Student</option>
                  <option value="worker">Working Professional</option>
                  <option value="freelancer">Freelancer</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Experience Level</label>
                <select className="form-control" name="experience_level" value={form.experience_level} onChange={handleChange}>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Skills</label>
              <input className="form-control" name="skills" value={form.skills} onChange={handleChange}
                placeholder="Python, data analysis, machine learning" />
              <div className="tag-input-hint">Separate with commas</div>
            </div>

            <div className="form-group">
              <label className="form-label">Interests</label>
              <input className="form-control" name="interests" value={form.interests} onChange={handleChange}
                placeholder="AI, fintech, sustainability" />
              <div className="tag-input-hint">Separate with commas</div>
            </div>

            <div className="form-group">
              <label className="form-label">Goals</label>
              <input className="form-control" name="goals" value={form.goals} onChange={handleChange}
                placeholder="Learn startup building, find co-founder, build projects" />
              <div className="tag-input-hint">Separate with commas</div>
            </div>

            <div className="flex gap-8 mt-8">
              <button type="button" className="btn btn-secondary" onClick={() => setStep(0)}>Back</button>
              <button type="submit" className="btn btn-primary w-full" disabled={loading} style={{ justifyContent: 'center' }}>
                {loading ? 'Creating profile...' : 'Create Profile →'}
              </button>
            </div>
          </form>
        )}

        {/* Step 1: Mentor form */}
        {step === 1 && role === 'mentor' && (
          <form onSubmit={handleSubmit} className="fade-in">
            <div className="section-title mb-8">Your Mentor Profile</div>
            <div className="section-subtitle">Help us match you with companies and participants</div>

            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className="form-control" name="name" value={form.name} onChange={handleChange} placeholder="Dr. Jane Smith" required />
            </div>

            <div className="form-group">
              <label className="form-label">Expertise</label>
              <input className="form-control" name="expertise" value={form.expertise} onChange={handleChange}
                placeholder="AI, fintech, regulatory compliance" />
              <div className="tag-input-hint">Separate with commas</div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Years Experience *</label>
                <input className="form-control" type="number" name="years" value={form.years} onChange={handleChange} placeholder="10" required />
              </div>
              <div className="form-group">
                <label className="form-label">Availability</label>
                <input className="form-control" name="availability" value={form.availability} onChange={handleChange} placeholder="Q2-Q3 2026" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Bio</label>
              <input className="form-control" name="bio" value={form.bio} onChange={handleChange} placeholder="Brief background and why you mentor..." />
            </div>

            <div className="flex gap-8 mt-8">
              <button type="button" className="btn btn-secondary" onClick={() => setStep(0)}>Back</button>
              <button type="submit" className="btn btn-primary w-full" disabled={loading} style={{ justifyContent: 'center' }}>
                {loading ? 'Creating profile...' : 'Create Profile →'}
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Success */}
        {step === 2 && (
          <div className="fade-in">
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div style={{ fontSize: '56px', marginBottom: '16px' }}>🎉</div>
              <div className="section-title mb-8">You're in!</div>
              <div className="section-subtitle">
                Your profile has been created. AI has matched you with opportunities below.
              </div>
            </div>

            {role === 'participant' && (
              <>
                {signupResult?.programme_matches && signupResult.programme_matches.length > 0 && (
                  <>
                    <div className="section-subtitle mb-12" style={{ textAlign: 'left', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>📚 Recommended Programmes</div>
                    <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
                      {signupResult.programme_matches.slice(0, 3).map(m => (
                        <div key={m.id} className="match-card" style={{ padding: '12px', border: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                            <div>
                              <div style={{ fontWeight: '600', marginBottom: '4px' }}>{m.programme?.name}</div>
                              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                {m.programme?.focus?.join(', ')}
                              </div>
                            </div>
                            <div style={{ background: 'var(--brand)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
                              {(m.match_score * 100).toFixed(0)}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {signupResult?.mentor_matches && signupResult.mentor_matches.length > 0 && (
                  <>
                    <div className="section-subtitle mb-12" style={{ textAlign: 'left', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>👥 Recommended Mentors</div>
                    <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
                      {signupResult.mentor_matches.slice(0, 2).map(m => (
                        <div key={m.id} className="match-card" style={{ padding: '12px', border: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                            <div>
                              <div style={{ fontWeight: '600', marginBottom: '4px' }}>{m.mentor?.name}</div>
                              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                {m.mentor?.expertise?.join(', ')} • {m.mentor?.years} yrs
                              </div>
                            </div>
                            <div style={{ background: 'var(--brand)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
                              {(m.match_score * 100).toFixed(0)}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {(!signupResult?.programme_matches || signupResult.programme_matches.length === 0) && (!signupResult?.mentor_matches || signupResult.mentor_matches.length === 0) && (
                  <div className="ai-summary-box" style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div className="section-subtitle">Your matches are being generated. Check your dashboard!</div>
                  </div>
                )}
              </>
            )}

            {role === 'mentor' && (
              <>
                {signupResult?.mentor_matches && signupResult.mentor_matches.length > 0 && (
                  <>
                    <div className="section-subtitle mb-12" style={{ textAlign: 'left', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>🎓 Recommended Participants</div>
                    <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
                      {signupResult.mentor_matches.slice(0, 3).map(m => (
                        <div key={m.id} className="match-card" style={{ padding: '12px', border: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                            <div>
                              <div style={{ fontWeight: '600', marginBottom: '4px' }}>{m.participant?.name}</div>
                              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                {m.participant?.skills?.slice(0, 2).join(', ')} • {m.participant?.experience_level}
                              </div>
                            </div>
                            <div style={{ background: 'var(--brand)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
                              {(m.match_score * 100).toFixed(0)}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {(!signupResult?.mentor_matches || signupResult.mentor_matches.length === 0) && (
                  <div className="ai-summary-box" style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div className="section-subtitle">Your matches are being generated. Check your dashboard!</div>
                  </div>
                )}
              </>
            )}

            <button className="btn btn-primary w-full" onClick={handleEnterApp} style={{ justifyContent: 'center' }}>
              View My Dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
