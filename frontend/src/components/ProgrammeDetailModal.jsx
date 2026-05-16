import { useState, useEffect } from 'react'
import { api } from '../api.js'

/**
 * ProgrammeDetailModal — full-page view of a programme.
 * Shows description, focus, dates, capacity, mentors with overlapping expertise,
 * and the cohort of registered participants.
 */
export default function ProgrammeDetailModal({ programmeId, onClose, onRegister, registering, currentUserId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!programmeId) return
    setLoading(true)
    setError(null)
    api.getProgrammeDetail(programmeId)
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [programmeId])

  if (!programmeId) return null

  const prog = data?.programme
  const stats = data?.stats || {}
  const alreadyRegistered = data?.participants?.some(
    p => p.id === currentUserId && ['registered', 'approved', 'assigned'].includes(p.status)
  )

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '24px',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          maxWidth: '720px', width: '100%', maxHeight: '90vh', overflow: 'auto',
          background: 'var(--bg-card)', padding: '28px',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', color: 'var(--blue-light)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
              {prog?.type || 'Programme'}
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {prog?.name || '—'}
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose} style={{ padding: '4px 10px' }}>✕</button>
        </div>

        {loading && (
          <div className="loading-state"><div className="spinner" /><span>Loading programme...</span></div>
        )}

        {error && (
          <div className="empty-state"><div className="empty-icon">⚠️</div><p>{error}</p></div>
        )}

        {!loading && !error && prog && (
          <>
            {/* Meta row */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              {prog.location && <span>📍 {prog.location}</span>}
              {prog.difficulty && <span>📊 {prog.difficulty}</span>}
              {prog.dates?.start && <span>📅 {prog.dates.start}{prog.dates.end ? ` – ${prog.dates.end}` : ''}</span>}
              {prog.capacity && <span>👥 {stats.registered_count || 0} / {prog.capacity} spots</span>}
            </div>

            {/* Description */}
            {prog.description && (
              <div style={{ marginBottom: '20px', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {prog.description}
              </div>
            )}

            {/* Focus tags */}
            {prog.focus?.length > 0 && (
              <Section title="Focus Areas">
                <div className="match-tags">
                  {prog.focus.map((f, i) => <span key={i} className="tag">{f}</span>)}
                </div>
              </Section>
            )}

            {/* Required skills */}
            {prog.required_skills?.length > 0 && (
              <Section title="Required Skills">
                <div className="match-tags">
                  {prog.required_skills.map((f, i) => <span key={i} className="tag">{f}</span>)}
                </div>
              </Section>
            )}

            {/* Relevant mentors */}
            <Section title={`Mentors with Relevant Expertise (${data.mentors?.length || 0})`}>
              {data.mentors?.length > 0 ? (
                <div style={{ display: 'grid', gap: '8px' }}>
                  {data.mentors.map(m => (
                    <div key={m.id} style={{
                      padding: '10px 12px', borderRadius: '8px',
                      background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{m.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{m.years} yrs</div>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        Matches: {m.matching_focus.join(', ')}
                      </div>
                      <div className="match-tags" style={{ marginBottom: 0 }}>
                        {m.expertise.slice(0, 4).map((e, i) => <span key={i} className="tag" style={{ fontSize: '11px' }}>{e}</span>)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No mentors with overlapping expertise yet.</div>
              )}
            </Section>

            {/* Cohort */}
            <Section title={`Cohort — Who Else Is Here (${stats.registered_count || 0})`}>
              {data.participants?.filter(p => ['registered', 'approved', 'assigned'].includes(p.status)).length > 0 ? (
                <div style={{ display: 'grid', gap: '8px' }}>
                  {data.participants.filter(p => ['registered', 'approved', 'assigned'].includes(p.status)).map(p => (
                    <div key={p.id} style={{
                      padding: '10px 12px', borderRadius: '8px',
                      background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {p.name}
                          {p.id === currentUserId && <span style={{ marginLeft: '6px', fontSize: '11px', color: 'var(--blue-light)' }}>(you)</span>}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {p.type} · {p.experience_level} · {p.location || 'Remote'}
                        </div>
                      </div>
                      {p.skills?.length > 0 && (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '50%', justifyContent: 'flex-end' }}>
                          {p.skills.slice(0, 2).map((s, i) => <span key={i} className="tag" style={{ fontSize: '10px', padding: '2px 6px' }}>{s}</span>)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Be the first to register!</div>
              )}
            </Section>

            {/* Register CTA */}
            {onRegister && !alreadyRegistered && (
              <button className="btn btn-primary w-full" style={{ justifyContent: 'center', marginTop: '16px' }}
                disabled={registering}
                onClick={onRegister}>
                {registering ? 'Registering...' : '+ Register for this programme'}
              </button>
            )}
            {alreadyRegistered && (
              <div style={{ marginTop: '16px', textAlign: 'center' }}>
                <span className="status-badge assigned">✓ You're registered</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{
        fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase',
        letterSpacing: '0.5px', fontWeight: 600, marginBottom: '10px',
      }}>
        {title}
      </div>
      {children}
    </div>
  )
}
