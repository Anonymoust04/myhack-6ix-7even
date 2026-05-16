import { useState, useEffect } from 'react'
import { api } from '../api.js'

/**
 * MatchExplainerModal — visualises the 3-stage AI matching pipeline
 * for a single relationship. Opens when user clicks "How did AI match this?"
 */
export default function MatchExplainerModal({ relationshipId, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!relationshipId) return
    setLoading(true)
    api.explainMatch(relationshipId)
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [relationshipId])

  if (!relationshipId) return null

  const fromName = data?.from_entity?.name || 'You'
  const toName = data?.to_entity?.name || ''
  const stages = data?.pipeline

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
          maxWidth: '680px', width: '100%', maxHeight: '90vh', overflow: 'auto',
          background: 'var(--bg-card)', padding: '28px',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--blue-light)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
              🤖 AI Match Pipeline
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {fromName} <span style={{ color: 'var(--text-muted)' }}>→</span> {toName}
            </div>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            style={{ padding: '4px 10px' }}
          >
            ✕
          </button>
        </div>

        {loading && (
          <div className="loading-state">
            <div className="spinner" />
            <span>Reconstructing pipeline...</span>
          </div>
        )}

        {error && (
          <div className="empty-state">
            <div className="empty-icon">⚠️</div>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && stages && (
          <>
            {/* Stage 1: Pre-filter */}
            <StageCard
              number="1"
              title="Structured Pre-Filter"
              subtitle="Match on skills, interests, location, experience"
              accent={stages.stage_1_pre_filter.passed > 0 ? 'green' : 'amber'}
              metric={`${stages.stage_1_pre_filter.passed} / ${stages.stage_1_pre_filter.total} signals matched`}
            >
              <div style={{ display: 'grid', gap: '8px', marginTop: '12px' }}>
                {stages.stage_1_pre_filter.signals.map((sig, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex', alignItems: 'start', gap: '10px',
                      padding: '10px 12px', borderRadius: '8px',
                      background: sig.matched ? 'rgba(52,168,83,0.08)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${sig.matched ? 'rgba(52,168,83,0.2)' : 'var(--border)'}`,
                    }}
                  >
                    <span style={{ fontSize: '14px', flexShrink: 0 }}>
                      {sig.matched ? '✓' : '✗'}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
                        {sig.name}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {sig.detail}
                      </div>
                      {sig.overlap.length > 0 && (
                        <div className="match-tags" style={{ marginTop: '6px', marginBottom: 0 }}>
                          {sig.overlap.map((v, j) => (
                            <span key={j} className="tag" style={{ fontSize: '11px' }}>{v}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </StageCard>

            {/* Stage 2: Vector similarity */}
            <StageCard
              number="2"
              title="Vector Similarity"
              subtitle={stages.stage_2_vector_similarity.method}
              accent={stages.stage_2_vector_similarity.score >= 0.7 ? 'green' : stages.stage_2_vector_similarity.score >= 0.5 ? 'amber' : 'red'}
              metric={`${stages.stage_2_vector_similarity.score_percent}% similar`}
            >
              <SimilarityBar percent={stages.stage_2_vector_similarity.score_percent} />
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '10px', lineHeight: 1.5 }}>
                Both profiles were embedded into 768-dimensional vectors via Gemini.
                Firestore's native vector search found this candidate among the top-K nearest neighbours.
              </div>
            </StageCard>

            {/* Stage 3: LLM scoring */}
            <StageCard
              number="3"
              title="LLM Reasoning"
              subtitle={stages.stage_3_llm_scoring.model}
              accent={stages.stage_3_llm_scoring.score >= 0.8 ? 'green' : stages.stage_3_llm_scoring.score >= 0.65 ? 'amber' : 'red'}
              metric={`${stages.stage_3_llm_scoring.score_percent}% fit`}
            >
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: '10px' }}>
                {stages.stage_3_llm_scoring.reasoning}
              </div>

              {stages.stage_3_llm_scoring.fit_factors?.length > 0 && (
                <div style={{ marginTop: '14px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '6px', letterSpacing: '0.5px' }}>
                    Fit Factors
                  </div>
                  <div className="fit-factors">
                    {stages.stage_3_llm_scoring.fit_factors.map((f, i) => (
                      <span key={i} className="fit-tag">✓ {f.replace(/_/g, ' ')}</span>
                    ))}
                  </div>
                </div>
              )}

              {stages.stage_3_llm_scoring.warnings?.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '6px', letterSpacing: '0.5px' }}>
                    Considerations
                  </div>
                  <div className="fit-factors">
                    {stages.stage_3_llm_scoring.warnings.map((w, i) => (
                      <span key={i} className="warning-tag">⚠ {w}</span>
                    ))}
                  </div>
                </div>
              )}
            </StageCard>
          </>
        )}
      </div>
    </div>
  )
}

function StageCard({ number, title, subtitle, accent, metric, children }) {
  const accentColors = {
    green: { bg: 'rgba(52,168,83,0.1)', border: 'rgba(52,168,83,0.3)', text: 'var(--green)' },
    amber: { bg: 'rgba(251,188,4,0.1)', border: 'rgba(251,188,4,0.3)', text: 'var(--amber)' },
    red:   { bg: 'rgba(234,67,53,0.1)', border: 'rgba(234,67,53,0.3)', text: 'var(--red)' },
  }
  const c = accentColors[accent] || accentColors.amber

  return (
    <div
      style={{
        border: '1px solid var(--border)', borderRadius: '12px',
        padding: '16px', marginBottom: '14px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
        <div
          style={{
            width: '28px', height: '28px', borderRadius: '50%',
            background: c.bg, border: `1px solid ${c.border}`,
            color: c.text, fontWeight: 700, fontSize: '13px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {number}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {title}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{subtitle}</div>
        </div>
        <div
          style={{
            padding: '4px 10px', borderRadius: '20px',
            background: c.bg, border: `1px solid ${c.border}`,
            color: c.text, fontSize: '12px', fontWeight: 700,
            whiteSpace: 'nowrap',
          }}
        >
          {metric}
        </div>
      </div>
      {children}
    </div>
  )
}

function SimilarityBar({ percent }) {
  const clamped = Math.max(0, Math.min(100, percent))
  return (
    <div style={{ marginTop: '12px' }}>
      <div
        style={{
          height: '8px', borderRadius: '4px',
          background: 'rgba(255,255,255,0.05)', overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%', width: `${clamped}%`,
            background: 'var(--gradient-brand)',
            transition: 'width 0.5s ease',
          }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '10px', color: 'var(--text-muted)' }}>
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
    </div>
  )
}
