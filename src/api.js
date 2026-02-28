// src/api.js — Centralised API client
// All frontend pages import from here — change BASE_URL once to point to your server

const BASE_URL = 'http://localhost:5000/api'

async function request(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`${BASE_URL}${path}`, opts)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  return res.json()
}

export const api = {
  // Patients
  getPatients: (params = {}) => request('GET', `/patients?${new URLSearchParams(params)}`),
  getPatient: (id) => request('GET', `/patients/${id}`),
  createPatient: (data) => request('POST', '/patients', data),
  updatePatient: (id, data) => request('PATCH', `/patients/${id}`, data),
  deletePatient: (id) => request('DELETE', `/patients/${id}`),

  // Doctors
  getDoctors: (params = {}) => request('GET', `/doctors?${new URLSearchParams(params)}`),
  getDoctor: (id) => request('GET', `/doctors/${id}`),
  createDoctor: (data) => request('POST', '/doctors', data),
  updateDoctor: (id, data) => request('PATCH', `/doctors/${id}`, data),
  deleteDoctor: (id) => request('DELETE', `/doctors/${id}`),

  // Beds / IPD
  getBeds: (params = {}) => request('GET', `/beds?${new URLSearchParams(params)}`),
  updateBed: (id, data) => request('PATCH', `/beds/${id}`, data),
  assignBed: (id, data) => request('PATCH', `/beds/${id}`, data),
  releaseBed: (id) => request('PATCH', `/beds/${id}`, { status: 'available', patient_id: null, doctor_id: null, diagnosis: null, has_alert: false }),

  // OPD
  getOPD: (params = {}) => request('GET', `/opd?${new URLSearchParams(params)}`),
  createOPD: (data) => request('POST', '/opd', data),
  updateOPD: (id, data) => request('PATCH', `/opd/${id}`, data),

  // Clinical Notes
  getNotes: (params = {}) => request('GET', `/notes?${new URLSearchParams(params)}`),
  createNote: (data) => request('POST', '/notes', data),
  updateNote: (id, data) => request('PATCH', `/notes/${id}`, data),

  // Lab
  getLab: (params = {}) => request('GET', `/lab?${new URLSearchParams(params)}`),
  createLab: (data) => request('POST', '/lab', data),
  updateLab: (id, data) => request('PATCH', `/lab/${id}`, data),

  // Pharmacy
  getPharmacy: (params = {}) => request('GET', `/pharmacy?${new URLSearchParams(params)}`),
  createPharmacy: (data) => request('POST', '/pharmacy', data),
  updatePharmacy: (id, data) => request('PATCH', `/pharmacy/${id}`, data),

  // Billing
  getBilling: (params = {}) => request('GET', `/billing?${new URLSearchParams(params)}`),
  createBilling: (data) => request('POST', '/billing', data),
  updateBilling: (id, data) => request('PATCH', `/billing/${id}`, data),

  // Dashboard
  getDashboardStats: () => request('GET', '/dashboard/stats'),

  // Reports
  getReports: () => request('GET', '/reports'),

  // Hospital Forms — Templates
  getFormTemplates: (params = {}) => request('GET', `/forms/templates?${new URLSearchParams(params)}`),
  deleteFormTemplate: (id) => request('DELETE', `/forms/templates/${id}`),

  // Hospital Forms — Patient Instances
  getPatientForms: (patientId) => request('GET', `/forms/patient/${patientId}`),
  createPatientForm: (data) => request('POST', '/forms/patient', data),
  savePatientFormAnnotations: (id, data) => request('PATCH', `/forms/patient/${id}`, data),
  getPatientFormInstance: (id) => request('GET', `/forms/patient-instance/${id}`),
}
