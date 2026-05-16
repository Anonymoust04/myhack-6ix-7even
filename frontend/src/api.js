/**
 * API client — thin wrapper around fetch() pointing at Django backend.
 * Vite proxy forwards /api/* → http://localhost:8000/api/*
 */

const BASE = '/api'

async function request(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (body) opts.body = JSON.stringify(body)

  const res = await fetch(`${BASE}${path}`, opts)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || data.detail || `Error ${res.status}`)
  return data
}

export const api = {
  // Participants
  registerParticipant:     (data)            => request('POST', '/register-participant', data),
  getRecommendations:      (participantId)   => request('GET',  `/recommendations/${participantId}`),
  getMentorRecommendations: (mentorId)       => request('GET',  `/mentor-recommendations/${mentorId}`),
  registerProgramme:       (data)            => request('POST', '/register-programme', data),
  myProgrammes:            (participantId)   => request('GET',  `/my-programmes/${participantId}`),

  // Admin
  createProgramme:       (data)   => request('POST', '/create-programme', data),
  uploadMentors:         (data)   => request('POST', '/upload-mentors', data),
  uploadCompanies:       (data)   => request('POST', '/upload-companies', data),
  runMatching:           (data)   => request('POST', '/run-matching', data),
  getMatches:            (params) => request('GET',  `/matches${params ? '?' + new URLSearchParams(params).toString() : ''}`),
  assign:                (data)   => request('POST', '/assign', data),
  approveRegistration:   (data)   => request('POST', '/approve-registration', data),
  getPendingRegistrations: ()     => request('GET',  '/pending-registrations'),
  getAnalytics:          ()       => request('GET',  '/analytics'),

  // Shared
  getRelationship: (id)   => request('GET',  `/relationship/${id}`),
  logOutcome:      (data) => request('POST', '/outcomes', data),

  // Lists
  listProgrammes: () => request('GET', '/programmes'),
  listMentors:    () => request('GET', '/mentors'),
  listCompanies:  () => request('GET', '/companies'),

  // Profiles
  getParticipantProfile: (id) => request('GET', `/participant/${id}`),
  getMentorProfile:      (id) => request('GET', `/mentor/${id}`),

  // Account lookup
  findAccount: (name, role) => request('GET', `/find-account?name=${encodeURIComponent(name)}&role=${role}`),

  // Match explainer
  explainMatch: (relId) => request('GET', `/explain-match/${relId}`),

  // Programme detail
  getProgrammeDetail: (programmeId) => request('GET', `/programme/${programmeId}`),

  // Mentor connection flow
  requestMentor:     (data) => request('POST', '/request-mentor', data),
  respondToRequest:  (data) => request('POST', '/respond-to-request', data),
  sendMessage:       (data) => request('POST', '/send-message', data),
  submitMatchFeedback: (data) => request('POST', '/match-feedback', data),
}
