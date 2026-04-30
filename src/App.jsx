import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import DashboardLayout from './layouts/DashboardLayout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import Patients from './pages/Patients'
import IPD from './pages/IPD'
import OPD from './pages/OPD'
import Appointments from './pages/Appointments'
import QueueManagement from './pages/QueueManagement'
import Emergency from './pages/Emergency'
import MedicalRecords from './pages/MedicalRecords'
import QRRegistration from './pages/QRRegistration'
import BarcodePrinting from './pages/BarcodePrinting'
import PatientMerge from './pages/PatientMerge'
import HealthPackages from './pages/HealthPackages'
import WardManagement from './pages/WardManagement'
import NursingStation from './pages/NursingStation'
import Doctors from './pages/Doctors'
import CPOE from './pages/CPOE'
import ClinicalNotes from './pages/ClinicalNotes'
import Laboratory from './pages/Laboratory'
import Radiology from './pages/Radiology'
import Pharmacy from './pages/Pharmacy'
import Billing from './pages/Billing'
import IPBilling from './pages/IPBilling'
import TPA from './pages/TPA'
import OperationTheatre from './pages/OperationTheatre'
import BloodBank from './pages/BloodBank'
import Inventory from './pages/Inventory'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import StaffManagement from './pages/StaffManagement'
import FormTemplates from './pages/FormTemplates'
import PatientForms from './pages/PatientForms'
import DischargeSummaryTemplates from './pages/DischargeSummaryTemplates'
import AuditLog from './pages/AuditLog'

/** Redirects unauthenticated users to login */
function PrivateRoute({ children }) {
  const { isLoggedIn, loading } = useAuth()
  if (loading) return null          // brief flash while token is verified
  return isLoggedIn ? children : <Navigate to="/login" replace />
}

/** Blocks non-admins */
function AdminRoute({ children }) {
  const { isAdmin, isLoggedIn, loading } = useAuth()
  if (loading) return null
  if (!isLoggedIn) return <Navigate to="/login" replace />
  return isAdmin ? children : <Navigate to="/app/dashboard" replace />
}

/** Placeholder for modules not yet fully built */
function ComingSoon({ title }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: 'linear-gradient(135deg, var(--primary-100), var(--primary-200))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '2rem',
      }}>🏗️</div>
      <h2 style={{ color: 'var(--gray-800)', fontWeight: 700 }}>{title || 'Module Coming Soon'}</h2>
      <p style={{ color: 'var(--gray-400)', fontSize: '0.9375rem', textAlign: 'center', maxWidth: 400 }}>
        This SwasthyaSync module is currently being built. Check back soon!
      </p>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected App */}
      <Route
        path="/app"
        element={<PrivateRoute><DashboardLayout /></PrivateRoute>}
      >
        <Route index element={<Navigate to="/app/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />

        {/* Patient Management */}
        <Route path="patients" element={<Patients />} />
        <Route path="appointments" element={<Appointments />} />
        <Route path="queue" element={<QueueManagement />} />
        <Route path="qr-register" element={<QRRegistration />} />
        <Route path="barcode" element={<BarcodePrinting />} />
        <Route path="patient-merge" element={<PatientMerge />} />
        <Route path="medical-records" element={<MedicalRecords />} />
        <Route path="packages" element={<HealthPackages />} />
        <Route path="package-mgmt" element={<HealthPackages />} />

        {/* Clinical */}
        <Route path="ipd" element={<IPD />} />
        <Route path="opd" element={<OPD />} />
        <Route path="wards" element={<WardManagement />} />
        <Route path="nursing" element={<NursingStation />} />
        <Route path="emergency" element={<Emergency />} />
        <Route path="cpoe" element={<CPOE />} />
        <Route path="doctors" element={<Doctors />} />
        <Route path="clinical-notes" element={<ClinicalNotes />} />
        <Route path="discharge-templates" element={<DischargeSummaryTemplates />} />
        <Route path="patient-forms" element={<PatientForms />} />

        {/* Diagnostics */}
        <Route path="laboratory" element={<Laboratory />} />
        <Route path="radiology" element={<Radiology />} />
        <Route path="blood-bank" element={<BloodBank />} />

        {/* Operations */}
        <Route path="operation-theatre" element={<OperationTheatre />} />
        <Route path="pharmacy" element={<Pharmacy />} />
        <Route path="inventory" element={<Inventory />} />

        {/* Finance */}
        <Route path="billing" element={<Billing />} />
        <Route path="ip-billing" element={<IPBilling />} />
        <Route path="tpa-insurance" element={<TPA />} />

        {/* Reports & System */}
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />

        {/* Admin-only */}
        <Route path="staff"          element={<AdminRoute><StaffManagement /></AdminRoute>} />
        <Route path="form-templates" element={<AdminRoute><FormTemplates /></AdminRoute>} />
        <Route path="audit-log"      element={<AdminRoute><AuditLog /></AdminRoute>} />
        <Route path="modules"        element={<AdminRoute><ComingSoon title="Module Overview" /></AdminRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
