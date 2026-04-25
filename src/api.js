// src/api.js — Centralised API client
// All frontend pages import from here — change BASE_URL once to point to your server
export const BASE_URL = import.meta.env.PROD ? '/api' : 'http://localhost:5000/api'
export const SERVER_URL = import.meta.env.PROD ? '' : 'http://localhost:5000'

function getToken() {
  return localStorage.getItem('swasthyasync_token')
}

async function request(method, path, body) {
  const token = getToken()
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`${BASE_URL}${path}`, opts)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  return res.json()
}

// Upload a PDF file (multipart/form-data)
async function uploadPdf(path, file, fieldName = 'result_pdf') {
  const token = getToken()
  const form = new FormData()
  form.append(fieldName, file)
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'Upload failed')
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
  createBed: (data) => request('POST', '/beds', data),
  updateBed: (id, data) => request('PATCH', `/beds/${id}`, data),
  assignBed: (id, data) => request('PATCH', `/beds/${id}`, data),
  updateDischargeStep: (id, data) => request('PATCH', `/beds/${id}/discharge`, data),
  releaseBed: (id) => request('PATCH', `/beds/${id}`, { status: 'available', patient_id: null, doctor_id: null, diagnosis: null, has_alert: false }),
  deleteBed: (id) => request('DELETE', `/beds/${id}`),

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
  uploadLabPDF: (id, formData) => request('POST', `/lab/${id}/upload-result`, formData, true),
  sendLabEmail: (id, formData) => request('POST', `/lab/${id}/email-result`, formData, true),

  // Radiology
  getRadiology: (params = {}) => request('GET', `/radiology?${new URLSearchParams(params)}`),
  createRadiology: (data) => request('POST', '/radiology', data),
  updateRadiology: (id, data) => request('PATCH', `/radiology/${id}`, data),
  uploadRadiologyResult: (id, file) => uploadPdf(`/radiology/${id}/upload-result`, file),

  // Pharmacy
  getPharmacy: (params = {}) => request('GET', `/pharmacy?${new URLSearchParams(params)}`),
  createPharmacy: (data) => request('POST', '/pharmacy', data),
  updatePharmacy: (id, data) => request('PATCH', `/pharmacy/${id}`, data),
  processPharmacySale: (data) => request('POST', '/pharmacy/sale', data),

  // Billing
  getBilling: (params = {}) => request('GET', `/billing?${new URLSearchParams(params)}`),
  createBilling: (data) => request('POST', '/billing', data),
  updateBilling: (id, data) => request('PATCH', `/billing/${id}`, data),

  // Dashboard
  getDashboardStats: () => request('GET', '/dashboard/stats'),

  // Hospital Profile
  getHospital: () => request('GET', '/hospital'),
  updateHospital: (data) => request('PATCH', '/hospital', data),

  // Discharge Summary Templates
  getDischargeTemplates: (params = {}) => request('GET', `/discharge-templates?${new URLSearchParams(params)}`),
  getDischargeTemplate: (id) => request('GET', `/discharge-templates/${id}`),
  createDischargeTemplate: (data) => request('POST', '/discharge-templates', data), // Note: Manual FormData in component
  updateDischargeTemplate: (id, data) => request('PATCH', `/discharge-templates/${id}`, data),
  deleteDischargeTemplate: (id) => request('DELETE', `/discharge-templates/${id}`),

  // Discharge Summary Instances (Filled versions)
  getPatientDischargeSummaries: (patientId) => request('GET', `/discharge-summaries/patient/${patientId}`),
  createDischargeSummary: (data) => request('POST', '/discharge-summaries', data),
  saveDischargeSummaryAnnotations: (id, data) => request('PATCH', `/discharge-summaries/${id}`, data),
  getDischargeSummaryInstance: (id) => request('GET', `/discharge-summaries/${id}`),

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
