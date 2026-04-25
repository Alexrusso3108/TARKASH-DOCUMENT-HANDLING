import { useState } from 'react'
import { Plus, Package, Check, Star } from 'lucide-react'

const PACKAGES = [
  { id: '1', name: 'Comprehensive Master Health Checkup', category: 'Health Checkup', price: 4999, popular: true, services: ['Complete Blood Count (CBC)', 'Lipid Profile', 'Liver Function Test', 'Kidney Function Test', 'ECG', 'Chest X-Ray', 'Physician Consultation'] },
  { id: '2', name: 'Cardiac Care Package', category: 'Specialized', price: 3500, popular: false, services: ['ECG', 'ECHO Cardiography', 'TMT (Treadmill Test)', 'Cardiologist Consultation', 'Lipid Profile'] },
  { id: '3', name: 'Maternal Health Package', category: 'Maternity', price: 15000, popular: true, services: ['Antenatal Screenings', 'USG Scans', 'Obstetrician Consultations (9 Months)', 'Nutrition Counseling'] },
]

export default function HealthPackages() {
  return (
    <div className="animate-fadeInUp">
      <div className="page-header">
        <div>
          <h1 className="page-title">Health Packages</h1>
          <p className="page-subtitle">Standardized health checkup and specialized care packages</p>
        </div>
        <button className="btn btn-primary"><Plus size={15} /> Create Package</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {PACKAGES.map(p => (
          <div key={p.id} className="card" style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
            {p.popular && (
              <div style={{ position: 'absolute', top: -10, right: 20, background: 'var(--primary-600)', color: '#fff', fontSize: '0.65rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: 999, display: 'flex', alignItems: 'center', gap: '0.25rem', boxShadow: '0 4px 10px rgba(79,70,229,0.3)' }}>
                <Star size={10} fill="#fff" /> POPULAR
              </div>
            )}
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--gray-100)', flex: 1 }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, background: 'var(--gray-100)', color: 'var(--gray-600)', padding: '0.2rem 0.6rem', borderRadius: 999, textTransform: 'uppercase' }}>{p.category}</span>
              <h3 style={{ fontWeight: 800, color: 'var(--gray-900)', marginTop: '1rem', fontSize: '1.25rem', lineHeight: 1.3 }}>{p.name}</h3>
              <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {p.services.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--gray-600)' }}>
                    <Check size={14} color="var(--primary-500)" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span style={{ lineHeight: 1.4 }}>{s}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ padding: '1.25rem 1.5rem', background: 'var(--gray-50)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase' }}>Package Fee</div>
                <div style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--primary-700)' }}>₹{p.price.toLocaleString('en-IN')}</div>
              </div>
              <button className="btn btn-secondary btn-sm" style={{ fontWeight: 700 }}>Book Package</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
