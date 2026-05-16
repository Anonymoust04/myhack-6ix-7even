/**
 * MatchCard — displays a single AI-recommended programme match.
 *
 * Props:
 *   match      — relationship object with match_score, reasoning, fit_factors, warnings, programme
 *   onRegister — callback when user clicks Register
 *   registering — bool, shows loading state on this card's button
 *   onExplain  — callback when user clicks "How was this matched?"
 */
export default function MatchCard({ match, onRegister, registering, onExplain, onFeedback, feedbackPending, onOpenDetail }) {
  const myFeedback = match.feedback?.find(f => f.sender === 'participant')
  const score = match.match_score || 0
  const scoreClass = score >= 0.8 ? 'high' : score >= 0.65 ? 'medium' : 'low'
  const scorePercent = Math.round(score * 100)
  const prog = match.programme || {}

  return (
    <div className="match-card fade-in">
      <div className="match-card-header">
        <div>
          <div className="match-card-title">
            {prog.type === 'hackathon'    ? '⚡' :
             prog.type === 'bootcamp'     ? '🚀' :
             prog.type === 'accelerator'  ? '📈' : '🎓'}
            {' '}{prog.name || match.to_entity?.id}
          </div>
          <div className="match-card-meta">
            {prog.type && <span style={{ textTransform: 'capitalize' }}>{prog.type}</span>}
            {prog.location && <> · {prog.location}</>}
            {prog.difficulty && <> · <span style={{ textTransform: 'capitalize' }}>{prog.difficulty}</span></>}
            {prog.dates?.start && <> · {prog.dates.start}</>}
          </div>
        </div>
        <div className="flex items-center gap-8">
          <div className={`score-pill ${scoreClass}`}>
            {scorePercent >= 80 ? '✦' : scorePercent >= 65 ? '◆' : '◇'} {scorePercent}% fit
          </div>
        </div>
      </div>

      {/* Reasoning */}
      <div className="match-reasoning">{match.reasoning}</div>

      {/* Fit factors */}
      {match.fit_factors?.length > 0 && (
        <div className="fit-factors">
          {match.fit_factors.map(f => (
            <span key={f} className="fit-tag">✓ {f.replace(/_/g, ' ')}</span>
          ))}
          {match.warnings?.map(w => (
            <span key={w} className="warning-tag">⚠ {w}</span>
          ))}
        </div>
      )}

      {/* Focus tags */}
      {prog.focus?.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
          {prog.focus.map(f => (
            <span key={f} style={{
              padding: '2px 8px', borderRadius: '20px', fontSize: '11px',
              background: 'rgba(139,92,246,0.1)', color: 'var(--purple)',
              border: '1px solid rgba(139,92,246,0.2)',
            }}>{f}</span>
          ))}
        </div>
      )}

      {/* Action row */}
      <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {prog.capacity && `Capacity: ${prog.capacity} participants`}
        </div>
        <div className="flex gap-8 items-center" style={{ flexWrap: 'wrap' }}>
          {onOpenDetail && (
            <button className="btn btn-secondary btn-sm" onClick={onOpenDetail}>
              👁 View details
            </button>
          )}
          {onExplain && (
            <button className="btn btn-secondary btn-sm" onClick={onExplain}>
              🤖 How was this matched?
            </button>
          )}
          {onFeedback && !myFeedback && (
            <div className="flex gap-8">
              <button className="btn btn-secondary btn-sm" disabled={feedbackPending === 'up'}
                onClick={() => onFeedback('up')} title="Useful match">👍</button>
              <button className="btn btn-secondary btn-sm" disabled={feedbackPending === 'down'}
                onClick={() => onFeedback('down')} title="Not a good match">👎</button>
            </div>
          )}
          {myFeedback && (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              You said {myFeedback.thumbs === 'up' ? '👍' : '👎'}
            </span>
          )}
          {match.status === 'recommended' && (
            <button className="btn btn-primary btn-sm" onClick={onRegister} disabled={registering}>
              {registering ? 'Registering...' : 'Register →'}
            </button>
          )}
          {match.status === 'registered' && (
            <span className="status-badge pending">Pending approval</span>
          )}
          {match.status === 'approved' && (
            <span className="status-badge assigned">Enrolled ✓</span>
          )}
        </div>
      </div>
    </div>
  )
}
