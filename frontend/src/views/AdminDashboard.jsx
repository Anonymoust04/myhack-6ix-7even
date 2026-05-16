import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../App.jsx'
import { api } from '../api.js'
import toast from 'react-hot-toast'
import ProgrammeForm from '../components/ProgrammeForm.jsx'
import AnalyticsPanel from '../components/AnalyticsPanel.jsx'

const TABS = ['Programmes', 'Upload Mentors', 'Review Matches', 'Analytics']

function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  return (
    <nav className="navbar">
      <div className="navbar-brand"><div className="logo-dot" />EcoLink AI</div>
      <div className="navbar-right">
        <span className="role-badge admin">Admin</span>
        <button className="btn btn-secondary btn-sm" onClick={() => { logout(); navigate('/login') }}>Sign out</button>
      </div>
    </nav>
  )
}

// ── Programmes Tab ─────────────────────────────────────────────────────────
function ProgrammesTab() {
  const [programmes, setProgrammes] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    api.listProgrammes()
      .then(setProgrammes)
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreated = () => { setShowForm(false); load(); toast.success('Programme created!') }

  return (
    <div>
      <div className="flex justify-between items-center mb-24">
        <div>
          <div className="section-title">Programmes</div>
          <div className="section-subtitle">{programmes.length} programmes in the ecosystem</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(s => !s)}>
          {showForm ? 'Cancel' : '+ New Programme'}
        </button>
      </div>

      {showForm && <ProgrammeForm onSuccess={handleCreated} />}

      {loading ? <div className="loading-state"><div className="spinner" /></div> : (
        <div className="card">
          {programmes.length === 0
            ? <div className="empty-state"><div className="empty-icon">📋</div><p>No programmes yet. Create one above.</p></div>
            : (
              <table className="data-table">
                <thead><tr><th>Name</th><th>Type</th><th>Focus</th><th>Difficulty</th><th>Location</th><th>Capacity</th></tr></thead>
                <tbody>
                  {programmes.map(p => (
                    <tr key={p.id}>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{p.name}</td>
                      <td><span className="status-badge recommended">{p.type}</span></td>
                      <td style={{ maxWidth: 200 }}>{p.focus?.join(', ')}</td>
                      <td>{p.difficulty}</td>
                      <td>{p.location}</td>
                      <td>{p.capacity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>
      )}
    </div>
  )
}

// ── Upload Mentors Tab ─────────────────────────────────────────────────────
function UploadMentorsTab() {
  const [mentors, setMentors] = useState([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', expertise: '', years: '', availability: '', bio: '' })

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleUpload = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        mentors: [{
          name: form.name,
          expertise: form.expertise.split(',').map(s => s.trim()).filter(Boolean),
          years: parseInt(form.years) || 0,
          availability: form.availability,
          bio: form.bio,
        }]
      }
      const res = await api.uploadMentors(payload)
      toast.success(`${res.created} mentor(s) uploaded!`)
      setForm({ name: '', expertise: '', years: '', availability: '', bio: '' })
      const updated = await api.listMentors()
      setMentors(updated)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    api.listMentors().then(setMentors).catch(() => {})
  }, [])

  return (
    <div>
      <div className="section-title mb-8">Upload Mentors</div>
      <div className="section-subtitle">Add mentors to the ecosystem for matching</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
        <form onSubmit={handleUpload} className="card">
          <div className="section-title mb-16" style={{ fontSize: '16px' }}>Add Mentor</div>
          <div className="form-group">
            <label className="form-label">Name *</label>
            <input className="form-control" name="name" value={form.name} onChange={handleChange} placeholder="Dr. Jane Smith" required />
          </div>
          <div className="form-group">
            <label className="form-label">Expertise</label>
            <input className="form-control" name="expertise" value={form.expertise} onChange={handleChange} placeholder="AI, fintech, regulatory" />
            <div className="tag-input-hint">Comma-separated</div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Years Experience</label>
              <input className="form-control" name="years" type="number" value={form.years} onChange={handleChange} placeholder="10" />
            </div>
            <div className="form-group">
              <label className="form-label">Availability</label>
              <input className="form-control" name="availability" value={form.availability} onChange={handleChange} placeholder="Q2 2026" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Bio</label>
            <input className="form-control" name="bio" value={form.bio} onChange={handleChange} placeholder="Brief background..." />
          </div>
          <button type="submit" className="btn btn-primary w-full" disabled={loading} style={{ justifyContent: 'center' }}>
            {loading ? 'Uploading...' : 'Upload Mentor'}
          </button>
        </form>
        <div>
          <div className="section-title mb-16" style={{ fontSize: '16px' }}>Mentors ({mentors.length})</div>
          {mentors.map(m => (
            <div key={m.id} className="card" style={{ marginBottom: '10px' }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{m.name}</div>
              <div className="text-sm text-muted">{m.expertise?.join(' · ')} · {m.years}y</div>
            </div>
          ))}
          {mentors.length === 0 && <div className="text-sm text-muted">No mentors yet.</div>}
        </div>
      </div>
    </div>
  )
}

// ── Review Matches Tab ──────────────────────────────────────────────────────
function ReviewMatchesTab() {
  const [matches, setMatches] = useState([])
  const [filter, setFilter] = useState('recommended')
  const [loading, setLoading] = useState(true)
  const [pendingRegs, setPendingRegs] = useState([])
  const [acting, setActing] = useState(null)
  const [names, setNames] = useState({})
  const [expandedMatch, setExpandedMatch] = useState(null)

  const getEntityName = (entity) => {
    if (!entity) return 'Unknown'
    return entity.name || entity.id?.slice(0, 12) + '...' || 'Unknown'
  }

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      api.getMatches({ status: filter }),
      api.getPendingRegistrations(),
    ]).then(([m, regs]) => {
      setMatches(m)
      setPendingRegs(regs)
    })
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [filter])

  useEffect(() => { load() }, [load])

  const handleAssign = async (id, status) => {
    setActing(id)
    try {
      await api.assign({ relationship_id: id, status })
      toast.success(`Match ${status}`)
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setActing(null)
    }
  }

  const handleApproveReg = async (id, status) => {
    setActing(id)
    try {
      await api.approveRegistration({ request_id: id, status })
      toast.success(`Registration ${status}`)
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setActing(null)
    }
  }

  return (
    <div>
      {expandedMatch && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setExpandedMatch(null)}>
          <div className="card" style={{ maxWidth: '600px', maxHeight: '80vh', overflow: 'auto', background: 'var(--bg-primary)', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Match Details</div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>From</div>
              <div style={{ fontSize: '15px', fontWeight: 500 }}>{getEntityName(expandedMatch.from_entity)}</div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>To</div>
              <div style={{ fontSize: '15px', fontWeight: 500 }}>{getEntityName(expandedMatch.to_entity)}</div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>Match Score</div>
              <span className={`score-pill ${expandedMatch.match_score >= 0.8 ? 'high' : expandedMatch.match_score >= 0.65 ? 'medium' : 'low'}`}>
                {Math.round((expandedMatch.match_score || 0) * 100)}%
              </span>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>Reasoning</div>
              <div style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>{expandedMatch.reasoning}</div>
            </div>
            {expandedMatch.fit_factors?.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>Fit Factors</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {expandedMatch.fit_factors.map(f => <span key={f} className="fit-tag">{f.replace(/_/g, ' ')}</span>)}
                </div>
              </div>
            )}
            <button className="btn btn-secondary" onClick={() => setExpandedMatch(null)} style={{ width: '100%', justifyContent: 'center' }}>Close</button>
          </div>
        </div>
      )}

      <div className="section-title mb-8">Review Matches</div>
      <div className="section-subtitle">Approve or reject AI-generated relationship recommendations</div>

      {/* Filter tabs */}
      <div className="flex gap-8 mb-16">
        {['recommended', 'assigned', 'rejected'].map(s => (
          <button key={s} className={`btn ${filter === s ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}`}
            onClick={() => setFilter(s)}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Pending registrations */}
      {pendingRegs.length > 0 && (
        <div className="mb-24">
          <div className="section-title mb-8" style={{ fontSize: '15px' }}>
            Pending Registrations ({pendingRegs.length})
          </div>
          <div className="card">
            <table className="data-table">
              <thead><tr><th>From</th><th>To Programme</th><th>Requested</th><th>Actions</th></tr></thead>
              <tbody>
                {pendingRegs.map(req => (
                  <tr key={req.id}>
                    <td>{getEntityName(req.from_entity)}</td>
                    <td>{getEntityName(req.to_entity)}</td>
                    <td style={{ fontSize: 11 }}>{new Date(req.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className="flex gap-8">
                        <button className="btn btn-success btn-sm" disabled={acting === req.id}
                          onClick={() => handleApproveReg(req.id, 'approved')}>Approve</button>
                        <button className="btn btn-danger btn-sm" disabled={acting === req.id}
                          onClick={() => handleApproveReg(req.id, 'rejected')}>Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Matches table */}
      {loading ? <div className="loading-state"><div className="spinner" /></div> : (
        <div className="card">
          {matches.length === 0
            ? <div className="empty-state"><div className="empty-icon">🔍</div><p>No {filter} matches. Matches are generated automatically when participants and mentors sign up.</p></div>
            : (
              <table className="data-table">
                <thead>
                  <tr><th>From</th><th>To</th><th>Type</th><th>Score</th><th>Reasoning</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {matches.map(m => (
                    <tr key={m.id}>
                      <td style={{ color: 'var(--text-primary)' }}>{getEntityName(m.from_entity)}</td>
                      <td style={{ color: 'var(--text-primary)' }}>{getEntityName(m.to_entity)}</td>
                      <td><span className="text-xs text-muted">{m.type?.replace('_', ' → ')}</span></td>
                      <td>
                        <span className={`score-pill ${m.match_score >= 0.8 ? 'high' : m.match_score >= 0.65 ? 'medium' : 'low'}`}>
                          {Math.round((m.match_score || 0) * 100)}%
                        </span>
                      </td>
                      <td style={{ maxWidth: 300, fontSize: 12, color: 'var(--blue-light)', cursor: 'pointer' }}
                        onClick={() => setExpandedMatch(m)}>
                        {m.reasoning?.slice(0, 120)}... <span style={{ fontSize: 10 }}>📖</span>
                      </td>
                      <td>
                        {m.status === 'recommended' && (
                          <div className="flex gap-8">
                            <button className="btn btn-success btn-sm" disabled={acting === m.id}
                              onClick={() => handleAssign(m.id, 'assigned')}>Assign</button>
                            <button className="btn btn-danger btn-sm" disabled={acting === m.id}
                              onClick={() => handleAssign(m.id, 'rejected')}>Reject</button>
                          </div>
                        )}
                        {m.status !== 'recommended' && <span className={`status-badge ${m.status}`}>{m.status}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>
      )}
    </div>
  )
}

// ── Main Admin Dashboard ────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState(0)

  return (
    <div className="app-shell">
      <Navbar />
      <div className="container" style={{ padding: '32px 24px', maxWidth: '1100px', margin: '0 auto' }}>
        <div className="page-header">
          <div className="page-title">Admin Dashboard</div>
          <div className="page-subtitle">Manage programmes and review AI-generated matches</div>
        </div>

        <div className="tabs">
          {TABS.map((t, i) => (
            <button key={t} className={`tab ${activeTab === i ? 'active' : ''}`} onClick={() => setActiveTab(i)}>
              {t}
            </button>
          ))}
        </div>

        <div className="fade-in" key={activeTab}>
          {activeTab === 0 && <ProgrammesTab />}
          {activeTab === 1 && <UploadMentorsTab />}
          {activeTab === 2 && <ReviewMatchesTab />}
          {activeTab === 3 && <AnalyticsPanel />}
        </div>
      </div>
    </div>
  )
}
