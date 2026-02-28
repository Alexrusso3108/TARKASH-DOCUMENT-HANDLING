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
import Doctors from './pages/Doctors'
import ClinicalNotes from './pages/ClinicalNotes'
import Laboratory from './pages/Laboratory'
import Pharmacy from './pages/Pharmacy'
import Billing from './pages/Billing'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import StaffManagement from './pages/StaffManagement'
import FormTemplates from './pages/FormTemplates'
import PatientForms from './pages/PatientForms'

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
        <Route path="patients" element={<Patients />} />
        <Route path="ipd" element={<IPD />} />
        <Route path="opd" element={<OPD />} />
        <Route path="doctors" element={<Doctors />} />
        <Route path="clinical-notes" element={<ClinicalNotes />} />
        <Route path="laboratory" element={<Laboratory />} />
        <Route path="pharmacy" element={<Pharmacy />} />
        <Route path="billing" element={<Billing />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />

        {/* Admin-only */}
        <Route path="staff" element={<AdminRoute><StaffManagement /></AdminRoute>} />

        {/* Forms */}
        <Route path="form-templates" element={<AdminRoute><FormTemplates /></AdminRoute>} />
        <Route path="patient-forms" element={<PatientForms />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
