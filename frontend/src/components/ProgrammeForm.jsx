import { useState } from 'react'
import { api } from '../api.js'
import toast from 'react-hot-toast'

export default function ProgrammeForm({ onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '', type: 'hackathon', focus: '', difficulty: 'beginner',
    location: '', start: '', end: '', capacity: '50', description: '',
  })

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.createProgramme({
        name: form.name,
        type: form.type,
        focus: form.focus.split(',').map(s => s.trim()).filter(Boolean),
        difficulty: form.difficulty,
        location: form.location,
        dates: { start: form.start, end: form.end },
        capacity: parseInt(form.capacity) || 50,
        description: form.description,
      })
      onSuccess?.()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card fade-in mb-24">
      <div className="section-title mb-16" style={{ fontSize: '16px' }}>Create New Programme</div>
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Programme Name *</label>
          <input className="form-control" name="name" value={form.name} onChange={handleChange}
            placeholder="AI Fintech Hackathon 2026" required />
        </div>
        <div className="form-group">
          <label className="form-label">Type</label>
          <select className="form-control" name="type" value={form.type} onChange={handleChange}>
            <option value="hackathon">Hackathon</option>
            <option value="bootcamp">Bootcamp</option>
            <option value="accelerator">Accelerator</option>
            <option value="workshop">Workshop</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Focus Areas</label>
        <input className="form-control" name="focus" value={form.focus} onChange={handleChange}
          placeholder="AI, fintech, machine learning" />
        <div className="tag-input-hint">Comma-separated</div>
      </div>

      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Difficulty Level</label>
          <select className="form-control" name="difficulty" value={form.difficulty} onChange={handleChange}>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Location</label>
          <input className="form-control" name="location" value={form.location} onChange={handleChange}
            placeholder="Kuala Lumpur" />
        </div>
      </div>

      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Start Date</label>
          <input className="form-control" type="date" name="start" value={form.start} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label className="form-label">End Date</label>
          <input className="form-control" type="date" name="end" value={form.end} onChange={handleChange} />
        </div>
      </div>

      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Capacity</label>
          <input className="form-control" type="number" name="capacity" value={form.capacity} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label className="form-label">Description</label>
          <input className="form-control" name="description" value={form.description} onChange={handleChange}
            placeholder="Brief description..." />
        </div>
      </div>

      <div className="flex gap-8 mt-8" style={{ justifyContent: 'flex-end' }}>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Creating...' : '+ Create Programme'}
        </button>
      </div>
    </form>
  )
}
