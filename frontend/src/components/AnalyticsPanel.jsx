import { useState } from 'react'
import { api } from '../api.js'
import toast from 'react-hot-toast'

export default function AnalyticsPanel() {
  const [insights, setInsights] = useState(null)
  const [dataPoints, setDataPoints] = useState(0)
  const [loading, setLoading] = useState(false)

  const handleFetch = async () => {
    setLoading(true)
    try {
      const res = await api.getAnalytics()
      setInsights(res.insights)
      setDataPoints(res.data_points || 0)
    } catch (err) {
      const isQuotaError = (err) => err.message.includes('quota') || err.message.includes('429') || err.message.includes('ResourceExhausted')
      if (isQuotaError(err)) {
        toast.error('Gemini quota reached. Wait a minute and try again, or enable billing.')
      } else {
        toast.error(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="section-title mb-8">Ecosystem Analytics</div>
      <div className="section-subtitle">AI-generated insights from completed programme relationships</div>

      {!insights && (
        <div className="card" style={{ maxWidth: 480 }}>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Gemini analyses all completed relationships and outcomes to surface actionable patterns
            for improving future cohorts.
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {['Completion rates by skill', 'Mentor effectiveness', 'Programme fit patterns', 'Cohort improvements'].map(t => (
              <span key={t} className="fit-tag">{t}</span>
            ))}
          </div>
          <button className="btn btn-primary" onClick={handleFetch} disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading
              ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Generating insights...</>
              : '🤖 Generate Analytics Insights'
            }
          </button>
        </div>
      )}

      {insights && (
        <div className="fade-in">
          <div className="ai-summary-box mb-16">
            <div className="ai-summary-label">
              <span className="ai-icon">🤖</span>
              AI Insights · {dataPoints} completed relationship{dataPoints !== 1 ? 's' : ''} analysed
            </div>
          </div>
          <div className="analytics-insights">{insights}</div>
          <button className="btn btn-secondary mt-16" onClick={handleFetch} disabled={loading}>
            {loading ? 'Refreshing...' : '↻ Refresh Insights'}
          </button>
        </div>
      )}
    </div>
  )
}
