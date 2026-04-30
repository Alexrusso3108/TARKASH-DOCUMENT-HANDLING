import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, Plus, X, Loader, UploadCloud, FileText, ExternalLink, CheckCircle, ScanLine, Download, Mail } from 'lucide-react'
import { api, SERVER_URL } from '../api'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useAuth } from '../context/AuthContext'

const STATUS_STYLES = {
  'Scheduled':   { bg: 'var(--gray-100)',             color: 'var(--gray-600)',  label: 'Scheduled' },
  'In Progress': { bg: 'rgba(99,102,241,0.1)',         color: '#4338ca',         label: 'In Progress' },
  'Reported':    { bg: 'rgba(16,185,129,0.1)',         color: '#059669',         label: 'Report Ready' },
  'Cancelled':   { bg: 'rgba(239,68,68,0.08)',         color: '#dc2626',         label: 'Cancelled' },
}

const PRIORITY_STYLES = {
  'Stat':    { bg: 'rgba(239,68,68,0.1)',  color: '#dc2626', label: 'STAT' },
  'Urgent':  { bg: 'rgba(245,158,11,0.1)', color: '#b45309', label: 'Urgent' },
  'Routine': { bg: 'var(--gray-100)',       color: 'var(--gray-600)', label: 'Routine' },
}

const RADIOLOGY_CATALOG = {
  'Chest X-Ray (PA View)': { modality: 'X-Ray', bodyPart: 'Chest', fields: [
    { id: 'heart_size', label: 'Heart Size', type: 'select', options: ['Normal', 'Enlarged', 'Cardiomegaly'] },
    { id: 'lung_fields', label: 'Lung Fields', type: 'select', options: ['Clear', 'Infiltrates', 'Consolidation', 'Pleural Effusion', 'Pneumothorax'] },
    { id: 'mediastinum', label: 'Mediastinum', type: 'select', options: ['Normal', 'Widened', 'Shifted'] },
    { id: 'bones', label: 'Bones', type: 'select', options: ['Normal', 'Fracture', 'Osteopenia'] },
    { id: 'impression', label: 'Impression', type: 'textarea' }
  ]},
  'Chest X-Ray (Lateral View)': { modality: 'X-Ray', bodyPart: 'Chest', fields: [
    { id: 'retrosternal', label: 'Retrosternal Space', type: 'select', options: ['Clear', 'Opacified'] },
    { id: 'retrocardiac', label: 'Retrocardiac Space', type: 'select', options: ['Clear', 'Opacified'] },
    { id: 'impression', label: 'Impression', type: 'textarea' }
  ]},
  'Abdomen X-Ray (Erect)': { modality: 'X-Ray', bodyPart: 'Abdomen', fields: [
    { id: 'bowel_gas', label: 'Bowel Gas Pattern', type: 'select', options: ['Normal', 'Dilated Loops', 'Air-Fluid Levels', 'Absent'] },
    { id: 'free_air', label: 'Free Air', type: 'select', options: ['Absent', 'Present'] },
    { id: 'calcifications', label: 'Calcifications', type: 'text' },
    { id: 'impression', label: 'Impression', type: 'textarea' }
  ]},
  'Skull X-Ray': { modality: 'X-Ray', bodyPart: 'Head', fields: [
    { id: 'vault', label: 'Skull Vault', type: 'select', options: ['Normal', 'Fracture', 'Lytic Lesion'] },
    { id: 'sutures', label: 'Sutures', type: 'select', options: ['Normal', 'Widened', 'Fused'] },
    { id: 'impression', label: 'Impression', type: 'textarea' }
  ]},
  'Spine X-Ray (Cervical)': { modality: 'X-Ray', bodyPart: 'Spine', fields: [
    { id: 'alignment', label: 'Alignment', type: 'select', options: ['Normal', 'Spondylolisthesis', 'Subluxation'] },
    { id: 'disc_spaces', label: 'Disc Spaces', type: 'select', options: ['Normal', 'Reduced', 'Osteophytes'] },
    { id: 'fracture', label: 'Fracture', type: 'select', options: ['None', 'Present'] },
    { id: 'impression', label: 'Impression', type: 'textarea' }
  ]},
  'Spine X-Ray (Lumbar)': { modality: 'X-Ray', bodyPart: 'Spine', fields: [
    { id: 'alignment', label: 'Alignment', type: 'select', options: ['Normal', 'Scoliosis', 'Spondylolisthesis'] },
    { id: 'disc_spaces', label: 'Disc Spaces', type: 'select', options: ['Normal', 'Reduced', 'Osteophytes'] },
    { id: 'sacroiliac', label: 'Sacroiliac Joints', type: 'select', options: ['Normal', 'Sclerosis', 'Widened'] },
    { id: 'impression', label: 'Impression', type: 'textarea' }
  ]},
  'Pelvis X-Ray': { modality: 'X-Ray', bodyPart: 'Pelvis', fields: [
    { id: 'hip_joints', label: 'Hip Joints', type: 'select', options: ['Normal', 'Osteoarthritis', 'Fracture', 'Dislocation'] },
    { id: 'sacroiliac', label: 'Sacroiliac Joints', type: 'select', options: ['Normal', 'Sclerosis'] },
    { id: 'impression', label: 'Impression', type: 'textarea' }
  ]},
  'Knee X-Ray': { modality: 'X-Ray', bodyPart: 'Knee', fields: [
    { id: 'joint_space', label: 'Joint Space', type: 'select', options: ['Normal', 'Reduced', 'Osteophytes'] },
    { id: 'alignment', label: 'Alignment', type: 'select', options: ['Normal', 'Varus', 'Valgus'] },
    { id: 'effusion', label: 'Effusion', type: 'select', options: ['Absent', 'Present'] },
    { id: 'impression', label: 'Impression', type: 'textarea' }
  ]},
  'Hand X-Ray': { modality: 'X-Ray', bodyPart: 'Hand', fields: [
    { id: 'bones', label: 'Bones', type: 'select', options: ['Normal', 'Fracture', 'Dislocation', 'Osteopenia'] },
    { id: 'joints', label: 'Joints', type: 'select', options: ['Normal', 'Arthritis', 'Erosions'] },
    { id: 'impression', label: 'Impression', type: 'textarea' }
  ]},
  'CT Brain (Plain)': { modality: 'CT Scan', bodyPart: 'Brain', fields: [
    { id: 'hemorrhage', label: 'Hemorrhage', type: 'select', options: ['None', 'Intraparenchymal', 'Subdural', 'Epidural', 'Subarachnoid'] },
    { id: 'midline_shift', label: 'Midline Shift', type: 'select', options: ['None', 'Present'] },
    { id: 'ventricles', label: 'Ventricles', type: 'select', options: ['Normal', 'Dilated', 'Compressed'] },
    { id: 'mass_effect', label: 'Mass Effect', type: 'select', options: ['None', 'Present'] },
    { id: 'impression', label: 'Impression', type: 'textarea' }
  ]},
  'CT Brain (Contrast)': { modality: 'CT Scan', bodyPart: 'Brain', fields: [
    { id: 'enhancement', label: 'Abnormal Enhancement', type: 'select', options: ['None', 'Ring Enhancement', 'Nodular', 'Diffuse'] },
    { id: 'mass', label: 'Mass Lesion', type: 'select', options: ['None', 'Present'] },
    { id: 'impression', label: 'Impression', type: 'textarea' }
  ]},
  'CT Chest (Plain)': { modality: 'CT Scan', bodyPart: 'Chest', fields: [
    { id: 'lungs', label: 'Lung Parenchyma', type: 'select', options: ['Normal', 'Nodules', 'Consolidation', 'Ground Glass', 'Fibrosis'] },
    { id: 'pleura', label: 'Pleura', type: 'select', options: ['Normal', 'Effusion', 'Thickening', 'Pneumothorax'] },
    { id: 'mediastinum', label: 'Mediastinum', type: 'select', options: ['Normal', 'Lymphadenopathy', 'Mass'] },
    { id: 'impression', label: 'Impression', type: 'textarea' }
  ]},
  'CT Abdomen & Pelvis (Contrast)': { modality: 'CT Scan', bodyPart: 'Abdomen', fields: [
    { id: 'liver', label: 'Liver', type: 'select', options: ['Normal', 'Fatty', 'Cirrhotic', 'Lesion'] },
    { id: 'spleen', label: 'Spleen', type: 'select', options: ['Normal', 'Enlarged', 'Lesion'] },
    { id: 'kidneys', label: 'Kidneys', type: 'select', options: ['Normal', 'Calculi', 'Hydronephrosis', 'Mass'] },
    { id: 'pancreas', label: 'Pancreas', type: 'select', options: ['Normal', 'Pancreatitis', 'Mass'] },
    { id: 'bowel', label: 'Bowel', type: 'select', options: ['Normal', 'Obstruction', 'Inflammation', 'Perforation'] },
    { id: 'impression', label: 'Impression', type: 'textarea' }
  ]},
  'CT KUB (Kidney, Ureter, Bladder)': { modality: 'CT Scan', bodyPart: 'Abdomen', fields: [
    { id: 'kidneys', label: 'Kidneys', type: 'select', options: ['Normal', 'Calculi', 'Hydronephrosis', 'Atrophy'] },
    { id: 'ureters', label: 'Ureters', type: 'select', options: ['Normal', 'Calculi', 'Dilated'] },
    { id: 'bladder', label: 'Bladder', type: 'select', options: ['Normal', 'Calculi', 'Wall Thickening'] },
    { id: 'impression', label: 'Impression', type: 'textarea' }
  ]},
  'MRI Brain (Plain)': { modality: 'MRI', bodyPart: 'Brain', fields: [
    { id: 't1_findings', label: 'T1 Findings', type: 'text' },
    { id: 't2_findings', label: 'T2/FLAIR Findings', type: 'text' },
    { id: 'dwi_findings', label: 'DWI Findings', type: 'text' },
    { id: 'mass_lesion', label: 'Mass Lesion', type: 'select', options: ['None', 'Present'] },
    { id: 'impression', label: 'Impression', type: 'textarea' }
  ]},
  'MRI Brain (Contrast)': { modality: 'MRI', bodyPart: 'Brain', fields: [
    { id: 'enhancement', label: 'Enhancement Pattern', type: 'select', options: ['None', 'Ring', 'Nodular', 'Leptomeningeal'] },
    { id: 'mass', label: 'Mass Characteristics', type: 'text' },
    { id: 'impression', label: 'Impression', type: 'textarea' }
  ]},
  'MRI Spine (Cervical)': { modality: 'MRI', bodyPart: 'Spine', fields: [
    { id: 'alignment', label: 'Alignment', type: 'select', options: ['Normal', 'Spondylolisthesis', 'Subluxation'] },
    { id: 'cord_signal', label: 'Cord Signal', type: 'select', options: ['Normal', 'Abnormal T2 Hyperintensity', 'Compression'] },
    { id: 'disc_bulge', label: 'Disc Bulge/Herniation', type: 'text' },
    { id: 'canal_stenosis', label: 'Canal Stenosis', type: 'select', options: ['None', 'Mild', 'Moderate', 'Severe'] },
    { id: 'impression', label: 'Impression', type: 'textarea' }
  ]},
  'MRI Spine (Lumbar)': { modality: 'MRI', bodyPart: 'Spine', fields: [
    { id: 'alignment', label: 'Alignment', type: 'select', options: ['Normal', 'Scoliosis', 'Spondylolisthesis'] },
    { id: 'disc_degeneration', label: 'Disc Degeneration', type: 'text' },
    { id: 'disc_herniation', label: 'Disc Herniation', type: 'text' },
    { id: 'canal_stenosis', label: 'Canal Stenosis', type: 'select', options: ['None', 'Mild', 'Moderate', 'Severe'] },
    { id: 'nerve_root', label: 'Nerve Root Compression', type: 'text' },
    { id: 'impression', label: 'Impression', type: 'textarea' }
  ]},
  'MRI Knee': { modality: 'MRI', bodyPart: 'Knee', fields: [
    { id: 'meniscus', label: 'Meniscus', type: 'select', options: ['Normal', 'Medial Tear', 'Lateral Tear', 'Both Torn'] },
    { id: 'acl', label: 'ACL', type: 'select', options: ['Intact', 'Partial Tear', 'Complete Tear'] },
    { id: 'pcl', label: 'PCL', type: 'select', options: ['Intact', 'Partial Tear', 'Complete Tear'] },
    { id: 'cartilage', label: 'Articular Cartilage', type: 'select', options: ['Normal', 'Thinning', 'Defect'] },
    { id: 'effusion', label: 'Joint Effusion', type: 'select', options: ['None', 'Mild', 'Moderate', 'Large'] },
    { id: 'impression', label: 'Impression', type: 'textarea' }
  ]},
  'USG Abdomen (Whole)': { modality: 'Ultrasound', bodyPart: 'Abdomen', fields: [
    { id: 'liver', label: 'Liver', type: 'select', options: ['Normal', 'Fatty', 'Cirrhotic', 'Lesion', 'Hepatomegaly'] },
    { id: 'gb', label: 'Gallbladder', type: 'select', options: ['Normal', 'Calculi', 'Wall Thickening', 'Polyp'] },
    { id: 'pancreas', label: 'Pancreas', type: 'select', options: ['Normal', 'Bulky', 'Calcification', 'Mass'] },
    { id: 'spleen', label: 'Spleen', type: 'select', options: ['Normal', 'Enlarged', 'Lesion'] },
    { id: 'kidneys', label: 'Kidneys', type: 'select', options: ['Normal', 'Calculi', 'Hydronephrosis', 'Cyst'] },
    { id: 'bladder', label: 'Bladder', type: 'select', options: ['Normal', 'Calculi', 'Wall Thickening'] },
    { id: 'impression', label: 'Impression', type: 'textarea' }
  ]},
  'USG Pelvis (Female)': { modality: 'Ultrasound', bodyPart: 'Pelvis', fields: [
    { id: 'uterus', label: 'Uterus', type: 'select', options: ['Normal', 'Bulky', 'Fibroid', 'Endometrial Thickening'] },
    { id: 'ovaries', label: 'Ovaries', type: 'select', options: ['Normal', 'Cyst', 'Mass', 'PCOS'] },
    { id: 'adnexa', label: 'Adnexa', type: 'select', options: ['Normal', 'Mass', 'Free Fluid'] },
    { id: 'impression', label: 'Impression', type: 'textarea' }
  ]},
  'USG Obstetric (First Trimester)': { modality: 'Ultrasound', bodyPart: 'Pelvis', fields: [
    { id: 'gestational_sac', label: 'Gestational Sac', type: 'select', options: ['Present', 'Absent'] },
    { id: 'fetal_pole', label: 'Fetal Pole', type: 'select', options: ['Present', 'Absent'] },
    { id: 'cardiac_activity', label: 'Cardiac Activity', type: 'select', options: ['Present', 'Absent'] },
    { id: 'gestational_age', label: 'Gestational Age', type: 'text' },
    { id: 'impression', label: 'Impression', type: 'textarea' }
  ]},
  'USG Obstetric (Anomaly Scan)': { modality: 'Ultrasound', bodyPart: 'Pelvis', fields: [
    { id: 'fetal_biometry', label: 'Fetal Biometry', type: 'text' },
    { id: 'gestational_age', label: 'Gestational Age', type: 'text' },
    { id: 'placenta', label: 'Placenta', type: 'select', options: ['Anterior', 'Posterior', 'Fundal', 'Low Lying', 'Previa'] },
    { id: 'liquor', label: 'Liquor', type: 'select', options: ['Normal', 'Oligohydramnios', 'Polyhydramnios'] },
    { id: 'anomalies', label: 'Anomalies', type: 'select', options: ['None Detected', 'Present'] },
    { id: 'impression', label: 'Impression', type: 'textarea' }
  ]},
  'USG Thyroid': { modality: 'Ultrasound', bodyPart: 'Neck', fields: [
    { id: 'size', label: 'Thyroid Size', type: 'select', options: ['Normal', 'Enlarged', 'Atrophic'] },
    { id: 'echotexture', label: 'Echotexture', type: 'select', options: ['Normal', 'Heterogeneous', 'Nodular'] },
    { id: 'nodules', label: 'Nodules', type: 'text' },
    { id: 'lymph_nodes', label: 'Lymph Nodes', type: 'select', options: ['Normal', 'Enlarged'] },
    { id: 'impression', label: 'Impression', type: 'textarea' }
  ]},
  'USG Breast': { modality: 'Ultrasound', bodyPart: 'Chest', fields: [
    { id: 'parenchyma', label: 'Breast Parenchyma', type: 'select', options: ['Normal', 'Heterogeneous'] },
    { id: 'mass', label: 'Mass/Lesion', type: 'select', options: ['None', 'Cyst', 'Solid Mass', 'Complex'] },
    { id: 'lymph_nodes', label: 'Axillary Lymph Nodes', type: 'select', options: ['Normal', 'Enlarged'] },
    { id: 'impression', label: 'Impression', type: 'textarea' }
  ]},
  'Mammography (Bilateral)': { modality: 'Mammography', bodyPart: 'Chest', fields: [
    { id: 'density', label: 'Breast Density', type: 'select', options: ['A - Almost Fatty', 'B - Scattered Fibroglandular', 'C - Heterogeneously Dense', 'D - Extremely Dense'] },
    { id: 'mass', label: 'Mass', type: 'select', options: ['None', 'Present'] },
    { id: 'calcifications', label: 'Calcifications', type: 'select', options: ['None', 'Benign', 'Suspicious'] },
    { id: 'birads', label: 'BI-RADS Category', type: 'select', options: ['0 - Incomplete', '1 - Negative', '2 - Benign', '3 - Probably Benign', '4 - Suspicious', '5 - Highly Suggestive', '6 - Known Malignancy'] },
    { id: 'impression', label: 'Impression', type: 'textarea' }
  ]},
  'DEXA Scan (Bone Density)': { modality: 'DEXA Scan', bodyPart: 'Whole Body', fields: [
    { id: 'lumbar_tscore', label: 'Lumbar Spine T-Score', type: 'text' },
    { id: 'femur_tscore', label: 'Femoral Neck T-Score', type: 'text' },
    { id: 'diagnosis', label: 'Diagnosis', type: 'select', options: ['Normal', 'Osteopenia', 'Osteoporosis'] },
    { id: 'fracture_risk', label: 'Fracture Risk', type: 'select', options: ['Low', 'Moderate', 'High'] },
    { id: 'impression', label: 'Impression', type: 'textarea' }
  ]},
  'Echocardiography (2D Echo)': { modality: 'Ultrasound', bodyPart: 'Cardiac', fields: [
    { id: 'lv_function', label: 'LV Function', type: 'select', options: ['Normal', 'Mild Dysfunction', 'Moderate Dysfunction', 'Severe Dysfunction'] },
    { id: 'ef', label: 'Ejection Fraction (%)', type: 'text' },
    { id: 'rwma', label: 'RWMA', type: 'select', options: ['None', 'Present'] },
    { id: 'valves', label: 'Valvular Abnormality', type: 'select', options: ['None', 'Mitral Regurgitation', 'Aortic Stenosis', 'Tricuspid Regurgitation'] },
    { id: 'pericardium', label: 'Pericardium', type: 'select', options: ['Normal', 'Effusion'] },
    { id: 'impression', label: 'Impression', type: 'textarea' }
  ]},
  'Doppler Study (Lower Limb Venous)': { modality: 'Ultrasound', bodyPart: 'Vascular', fields: [
    { id: 'dvt', label: 'Deep Vein Thrombosis', type: 'select', options: ['None', 'Present'] },
    { id: 'location', label: 'Location if DVT', type: 'text' },
    { id: 'flow', label: 'Flow Pattern', type: 'select', options: ['Normal', 'Abnormal'] },
    { id: 'impression', label: 'Impression', type: 'textarea' }
  ]},
  'Doppler Study (Carotid)': { modality: 'Ultrasound', bodyPart: 'Vascular', fields: [
    { id: 'stenosis', label: 'Stenosis', type: 'select', options: ['None', '<50%', '50-69%', '70-99%', 'Occluded'] },
    { id: 'plaque', label: 'Plaque', type: 'select', options: ['None', 'Present'] },
    { id: 'flow_velocity', label: 'Peak Systolic Velocity', type: 'text' },
    { id: 'impression', label: 'Impression', type: 'textarea' }
  ]},
  'Barium Swallow': { modality: 'Fluoroscopy', bodyPart: 'Chest', fields: [
    { id: 'swallowing', label: 'Swallowing Mechanism', type: 'select', options: ['Normal', 'Dysphagia', 'Aspiration'] },
    { id: 'esophagus', label: 'Esophagus', type: 'select', options: ['Normal', 'Stricture', 'Dilatation', 'Mass'] },
    { id: 'impression', label: 'Impression', type: 'textarea' }
  ]},
  'Barium Meal Follow Through': { modality: 'Fluoroscopy', bodyPart: 'Abdomen', fields: [
    { id: 'stomach', label: 'Stomach', type: 'select', options: ['Normal', 'Ulcer', 'Mass', 'Outlet Obstruction'] },
    { id: 'small_bowel', label: 'Small Bowel', type: 'select', options: ['Normal', 'Stricture', 'Dilatation', 'Filling Defect'] },
    { id: 'impression', label: 'Impression', type: 'textarea' }
  ]},
  'IVP (Intravenous Pyelography)': { modality: 'Fluoroscopy', bodyPart: 'Abdomen', fields: [
    { id: 'kidneys', label: 'Kidneys', type: 'select', options: ['Normal', 'Non-functioning', 'Delayed Excretion'] },
    { id: 'pcs', label: 'Pelvicalyceal System', type: 'select', options: ['Normal', 'Dilated', 'Filling Defect'] },
    { id: 'ureters', label: 'Ureters', type: 'select', options: ['Normal', 'Dilated', 'Stricture', 'Calculus'] },
    { id: 'bladder', label: 'Bladder', type: 'select', options: ['Normal', 'Filling Defect', 'Irregular'] },
    { id: 'impression', label: 'Impression', type: 'textarea' }
  ]},
  'PET-CT Scan (Whole Body)': { modality: 'PET Scan', bodyPart: 'Whole Body', fields: [
    { id: 'primary_lesion', label: 'Primary Lesion', type: 'text' },
    { id: 'suv_max', label: 'SUV Max', type: 'text' },
    { id: 'lymph_nodes', label: 'Lymph Node Involvement', type: 'select', options: ['None', 'Present'] },
    { id: 'metastasis', label: 'Distant Metastasis', type: 'select', options: ['None', 'Present'] },
    { id: 'impression', label: 'Impression', type: 'textarea' }
  ]}
}

const MODALITIES = ['X-Ray', 'CT Scan', 'MRI', 'Ultrasound', 'PET Scan', 'Mammography', 'Fluoroscopy', 'Nuclear Medicine', 'DEXA Scan', 'Angiography']
const BODY_PARTS = ['Chest', 'Abdomen', 'Pelvis', 'Head', 'Brain', 'Spine', 'Neck', 'Shoulder', 'Knee', 'Hip', 'Hand', 'Foot', 'Whole Body', 'Cardiac', 'Vascular']

// ─── PDF Upload Button ────────────────────────────────────────────────────────
function PdfUploadBtn({ orderId, existingPath, onUploaded, uploadFn }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState(null)
  const inputRef = useRef()

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') { setError('Only PDF files are allowed'); return }
    setUploading(true); setError(null)
    try {
      const updated = await uploadFn(orderId, file)
      onUploaded(updated)
    } catch (err) { setError(err.message) }
    finally { setUploading(false); e.target.value = '' }
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleFile} />
      {existingPath ? (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <a
            href={`${SERVER_URL}${existingPath}`} target="_blank" rel="noopener noreferrer"
            className="btn btn-sm btn-teal" style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}
          >
            <ExternalLink size={13} /> View Report PDF
          </a>
          <button
            className="btn btn-sm btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}
            onClick={() => inputRef.current.click()} disabled={uploading}
          >
            {uploading ? <Loader size={12} className="spin" /> : <UploadCloud size={12} />}
            {uploading ? 'Uploading…' : 'Replace PDF'}
          </button>
        </div>
      ) : (
        <button
          className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
          onClick={() => inputRef.current.click()} disabled={uploading}
        >
          {uploading ? <Loader size={14} className="spin" /> : <UploadCloud size={14} />}
          {uploading ? 'Uploading…' : 'Upload Radiology Report PDF'}
        </button>
      )}
      {error && <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.375rem' }}>⚠ {error}</div>}
    </div>
  )
}

// ─── New Radiology Order Modal ────────────────────────────────────────────────
function NewRadiologyModal({ onClose, onSave, patients, doctors }) {
  const [form, setForm] = useState({
    patient_id: '', study_type: '', modality: '', body_part: '',
    requested_by: '', priority: 'Routine', clinical_indication: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)
  const h = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.patient_id || !form.study_type) { setError('Patient and study type are required.'); return }
    setSaving(true); setError(null)
    try { const order = await api.createRadiology(form); onSave(order); onClose() }
    catch (e) { setError(e.message) } finally { setSaving(false) }
  }

  const handleStudyChange = (e) => {
    const studyType = e.target.value
    h('study_type', studyType)
    if (RADIOLOGY_CATALOG[studyType]) {
      h('modality', RADIOLOGY_CATALOG[studyType].modality)
      h('body_part', RADIOLOGY_CATALOG[studyType].bodyPart)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div>
            <h4 style={{ color: 'var(--gray-900)', fontWeight: 700 }}>New Radiology Order</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: 2 }}>Order an imaging study for a patient</p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.08)', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: 'var(--radius-lg)', marginBottom: '1rem', fontSize: '0.875rem' }}>
              ⚠ {error}
            </div>
          )}
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Patient *</label>
              <select className="form-input form-select" value={form.patient_id} onChange={e => h('patient_id', e.target.value)}>
                <option value="">Select patient</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Requested By</label>
              <select className="form-input form-select" value={form.requested_by} onChange={e => h('requested_by', e.target.value)}>
                <option value="">Select doctor</option>
                {doctors.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Study Type *</label>
              <select className="form-input form-select" value={form.study_type} onChange={handleStudyChange}>
                <option value="">Select radiology study...</option>
                {Object.keys(RADIOLOGY_CATALOG).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Modality</label>
              <select className="form-input form-select" value={form.modality} onChange={e => h('modality', e.target.value)}>
                <option value="">Select modality</option>
                {MODALITIES.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Body Part / Region</label>
              <select className="form-input form-select" value={form.body_part} onChange={e => h('body_part', e.target.value)}>
                <option value="">Select body part</option>
                {BODY_PARTS.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-input form-select" value={form.priority} onChange={e => h('priority', e.target.value)}>
                <option>Routine</option><option>Urgent</option><option>Stat</option>
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Clinical Indication</label>
              <textarea className="form-input form-textarea" placeholder="Reason for the imaging study, clinical symptoms, working diagnosis..." value={form.clinical_indication} onChange={e => h('clinical_indication', e.target.value)} style={{ minHeight: 80 }} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader size={14} className="spin" /> : <ScanLine size={14} />} Order Study
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Order Detail Panel ───────────────────────────────────────────────────────
function OrderPanel({ order, onClose, onUpdated }) {
  const { isAdmin } = useAuth()
  const [findings, setFindings] = useState({})
  const [saving, setSaving] = useState(false)
  const [emailing, setEmailing] = useState(false)
  const [hospitalInfo, setHospitalInfo] = useState(null)
  const [logoBase64, setLogoBase64] = useState(null)
  const [headerBase64, setHeaderBase64] = useState(null)
  const isReported = order.status === 'Reported'
  const isEditable = !isReported || isAdmin
  const studyConfig = RADIOLOGY_CATALOG[order.study_type] || null

  useEffect(() => {
    if (order.radiologist_notes && isReported) {
      try { setFindings(JSON.parse(order.radiologist_notes)) } catch(e) { /* fallback */ }
    }
  }, [order, isReported])

  useEffect(() => {
    const loadImg = (url, setter) => {
      if (!url) return
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = img.naturalWidth
          canvas.height = img.naturalHeight
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0)
          setter(canvas.toDataURL('image/png'))
        } catch (e) { console.warn('Base64 conversion failed:', e) }
      }
      img.onerror = () => console.warn('Could not load image for PDF', url)
      img.src = `${SERVER_URL}${url}?t=${Date.now()}` // Cache buster
    }

    api.getHospital().then(h => {
      setHospitalInfo(h)
      // Pre-load images as base64 for PDF embedding
      loadImg(h.report_logo, setLogoBase64)
      loadImg(h.report_header_image, setHeaderBase64)
    }).catch(() => {})
  }, [])

  const generatePDF = (orderData, findingsObj, download = true) => {
    try {
      if (!studyConfig) { alert('Study configuration not found for PDF generation.'); return; }
      
      const doc = new jsPDF()
      const pageW = doc.internal.pageSize.getWidth()
      const pageH = doc.internal.pageSize.getHeight()
      const margin = 15
      const h = hospitalInfo
      let cursorY = margin

      // ═══════════════════════════════════════════════════════
      // HEADER — Hospital branding
      // ═══════════════════════════════════════════════════════
      const drawHeader = () => {
        let y = margin
        let textStartX = margin

        if (h?.report_print_mode === 'image') {
          if (headerBase64) {
            try {
              // Calculate height maintaining aspect ratio, full width
              const props = doc.getImageProperties(headerBase64)
              const imgW = pageW
              const imgH = (props.height * imgW) / props.width
              doc.addImage(headerBase64, 'PNG', 0, 0, imgW, imgH)
              return imgH + 5 // Return new cursorY below header
            } catch (e) {
              console.warn('Could not embed header image in PDF:', e)
            }
          }
          // If image mode but image not loaded/missing, just leave space
          return y + 25 
        }

        // Standard Text/Logo mode
        // Logo
        if (logoBase64) {
          try {
            const logoH = 22
            const logoW = 40
            doc.addImage(logoBase64, 'PNG', margin, y - 2, logoW, logoH)
            textStartX = margin + logoW + 5
          } catch (e) {
            console.warn('Could not embed logo in PDF:', e)
          }
        }

        if (h && h.report_header_text) {
          const headerLines = h.report_header_text.split('\n').filter(l => l.trim())
          headerLines.forEach((line, i) => {
            if (i === 0) {
              doc.setFontSize(14)
              doc.setTextColor(30, 58, 138)
              doc.setFont('helvetica', 'bold')
            } else {
              doc.setFontSize(8.5)
              doc.setTextColor(80, 80, 80)
              doc.setFont('helvetica', 'normal')
            }
            doc.text(line, textStartX, y + (i === 0 ? 5 : 7 + i * 4))
          })
          y += Math.max(22, 7 + headerLines.length * 4)

          // Tagline
          if (h.report_tagline) {
            doc.setFontSize(7.5)
            doc.setTextColor(79, 70, 229)
            doc.setFont('helvetica', 'italic')
            doc.text(h.report_tagline, textStartX, y + 2)
            y += 6
          }
        } else {
          // Fallback header if no branding configured
          doc.setFontSize(18)
          doc.setTextColor(30, 58, 138)
          doc.setFont('helvetica', 'bold')
          doc.text(h?.name || 'RADIOLOGY REPORT', textStartX, y + 10)
          y += 15
        }

        // Divider line
        y += 3
        doc.setDrawColor(79, 70, 229)
        doc.setLineWidth(0.8)
        doc.line(margin, y, pageW - margin, y)
        doc.setDrawColor(200, 200, 200)
        doc.setLineWidth(0.3)
        doc.line(margin, y + 1.5, pageW - margin, y + 1.5)

        return y + 6
      }

      cursorY = drawHeader()

      // ═══════════════════════════════════════════════════════
      // REPORT TITLE LINE
      // ═══════════════════════════════════════════════════════
      doc.setFontSize(11)
      doc.setTextColor(79, 70, 229)
      doc.setFont('helvetica', 'bold')
      doc.text('RADIOLOGY REPORT', pageW / 2, cursorY, { align: 'center' })
      cursorY += 8

      // ═══════════════════════════════════════════════════════
      // PATIENT INFO BOX
      // ═══════════════════════════════════════════════════════
      doc.setFillColor(248, 250, 252)
      doc.roundedRect(margin, cursorY - 2, pageW - margin * 2, 20, 2, 2, 'F')

      doc.setFontSize(9)
      doc.setTextColor(60, 60, 60)
      doc.setFont('helvetica', 'normal')
      doc.text(`Patient Name: `, margin + 4, cursorY + 5)
      doc.setFont('helvetica', 'bold')
      doc.text(`${orderData.patient_name || 'N/A'}`, margin + 32, cursorY + 5)

      doc.setFont('helvetica', 'normal')
      doc.text(`Patient ID: ${orderData.patient_code || 'N/A'}`, margin + 4, cursorY + 12)
      doc.text(`Referring Doctor: ${orderData.requested_by || 'Self Referral'}`, pageW / 2, cursorY + 5)
      doc.text(`Report Date: ${new Date().toLocaleString('en-IN')}`, pageW / 2, cursorY + 12)
      cursorY += 24

      // ═══════════════════════════════════════════════════════
      // STUDY DETAILS BOX
      // ═══════════════════════════════════════════════════════
      doc.setFillColor(245, 247, 250)
      doc.roundedRect(margin, cursorY, pageW - margin * 2, 18, 2, 2, 'F')
      
      doc.setFontSize(10)
      doc.setTextColor(20, 20, 20)
      doc.setFont('helvetica', 'bold')
      doc.text(`Study: ${orderData.study_type}`, margin + 4, cursorY + 7)
      
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(60, 60, 60)
      doc.text(`Modality: ${orderData.modality || 'N/A'}`, margin + 4, cursorY + 13)
      doc.text(`Body Part: ${orderData.body_part || 'N/A'}`, pageW / 2, cursorY + 13)
      cursorY += 22

      // ═══════════════════════════════════════════════════════
      // CLINICAL INDICATION
      // ═══════════════════════════════════════════════════════
      if (orderData.clinical_indication) {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(79, 70, 229)
        doc.text('CLINICAL INDICATION:', margin, cursorY)
        cursorY += 6
        
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(60, 60, 60)
        const indicationLines = doc.splitTextToSize(orderData.clinical_indication, pageW - margin * 2 - 5)
        doc.text(indicationLines, margin, cursorY)
        cursorY += (indicationLines.length * 5) + 6
      }

      // ═══════════════════════════════════════════════════════
      // FINDINGS TABLE
      // ═══════════════════════════════════════════════════════
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(79, 70, 229)
      doc.text('FINDINGS:', margin, cursorY)
      cursorY += 6

      const findingsData = []
      studyConfig.fields.forEach(field => {
        const value = findingsObj[field.id] || 'Not documented'
        if (field.type !== 'textarea') {
          findingsData.push([field.label, value])
        }
      })

      if (findingsData.length > 0) {
        autoTable(doc, {
          startY: cursorY,
          head: [['Parameter', 'Finding']],
          body: findingsData,
          theme: 'grid',
          margin: { left: margin, right: margin, bottom: 35 },
          headStyles: { 
            fillColor: [79, 70, 229], 
            textColor: [255, 255, 255], 
            fontStyle: 'bold',
            fontSize: 9
          },
          styles: { fontSize: 9, cellPadding: 3.5 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: {
            0: { cellWidth: 60, fontStyle: 'bold', textColor: [40, 40, 40] },
            1: { cellWidth: 'auto' }
          }
        })
        cursorY = doc.lastAutoTable.finalY + 10
      }

      // ═══════════════════════════════════════════════════════
      // IMPRESSION SECTION
      // ═══════════════════════════════════════════════════════
      const impressionField = studyConfig.fields.find(f => f.id === 'impression')
      if (impressionField && findingsObj[impressionField.id]) {
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(79, 70, 229)
        doc.text('IMPRESSION:', margin, cursorY)
        cursorY += 6
        
        doc.setFontSize(9.5)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(20, 20, 20)
        const impressionLines = doc.splitTextToSize(findingsObj[impressionField.id], pageW - margin * 2 - 5)
        doc.text(impressionLines, margin, cursorY)
        cursorY += impressionLines.length * 5 + 10
      }

      // ═══════════════════════════════════════════════════════
      // SIGNATURE SECTION
      // ═══════════════════════════════════════════════════════
      if (cursorY < pageH - 45) {
        cursorY = Math.max(cursorY, pageH - 40)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(80, 80, 80)
        doc.text('Radiologist Signature: _____________________', pageW - margin - 70, cursorY)
        doc.setFontSize(8)
        doc.setTextColor(100, 100, 100)
        doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, pageW - margin - 70, cursorY + 6)
      }

      const patientName = orderData.patient_name || orderData.patient_id || 'Patient'
      if (download && typeof doc.save === 'function') {
        doc.save(`${patientName.replace(/[^a-z0-9]/gi, '_')}_${orderData.study_type.replace(/[^a-z0-9]/gi, '_')}.pdf`)
      }
      return doc
    } catch (err) {
      console.error('PDF Generation Error:', err)
      alert('Could not generate PDF: ' + err.message)
    }
  }

  const handleSendEmail = async () => {
    const email = order.patient_email || prompt('Enter patient email:', '')
    if (!email) return

    setEmailing(true)
    try {
      const doc = generatePDF(order, findings, false)
      if (!doc) throw new Error('PDF Generation failed')
      
      const pdfBlob = doc.output('blob')
      const formData = new FormData()
      formData.append('report_pdf', pdfBlob)
      formData.append('email', email)
      formData.append('patient_name', order.patient_name)
      formData.append('study_type', order.study_type)

      await api.sendRadiologyEmail(order.id, formData)
      alert('Report sent successfully to ' + email)
    } catch (e) {
      console.error(e)
      alert('Error sending email: ' + e.message)
    } finally {
      setEmailing(false)
    }
  }

  const handleSaveFindings = async () => {
    setSaving(true)
    try {
      const jsonStr = JSON.stringify(findings)
      const updated = await api.updateRadiology(order.id, { 
        radiologist_notes: jsonStr, 
        status: 'Reported', 
        completed_at: new Date().toISOString() 
      })
      const merged = { ...order, ...updated, radiologist_notes: jsonStr, status: 'Reported' }
      onUpdated(merged)
      generatePDF(merged, findings)
      onClose()
    } catch (e) {
      alert('Error saving findings: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const renderField = (field) => {
    const value = findings[field.id] || ''
    
    if (field.type === 'select') {
      return (
        <select 
          className="form-input form-select" 
          style={{ fontSize: '0.8rem' }}
          value={value}
          disabled={!isEditable}
          onChange={e => setFindings(f => ({ ...f, [field.id]: e.target.value }))}
        >
          <option value="">Select...</option>
          {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      )
    } else if (field.type === 'textarea') {
      return (
        <textarea 
          className="form-input form-textarea" 
          style={{ fontSize: '0.8rem', minHeight: 100 }}
          placeholder="Enter detailed impression..."
          value={value}
          disabled={!isEditable}
          onChange={e => setFindings(f => ({ ...f, [field.id]: e.target.value }))}
        />
      )
    } else {
      return (
        <input 
          className="form-input" 
          style={{ fontSize: '0.8rem' }}
          type="text"
          placeholder="Enter value..."
          value={value}
          disabled={!isEditable}
          onChange={e => setFindings(f => ({ ...f, [field.id]: e.target.value }))}
        />
      )
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 200, display: 'flex', justifyContent: 'flex-end' }} onClick={onClose}>
      <div style={{ width: 600, background: '#fff', height: '100%', overflow: 'auto', boxShadow: 'var(--shadow-2xl)', padding: '2rem', animation: 'slideInRight 250ms cubic-bezier(0.4,0,0.2,1)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div>
            <h4 style={{ color: 'var(--gray-900)', fontWeight: 700 }}>Radiology Report</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>
              #{order.id} · {order.ordered_at ? new Date(order.ordered_at).toLocaleDateString('en-IN') : '—'}
            </p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Patient card */}
        <div style={{ background: 'linear-gradient(135deg, var(--primary-50), rgba(99,102,241,0.04))', borderRadius: 'var(--radius-xl)', padding: '1.25rem', marginBottom: '1.5rem', border: '1px solid var(--primary-100)' }}>
          <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--gray-900)', marginBottom: '0.25rem' }}>{order.patient_name}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{order.patient_code}</div>
          <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ background: PRIORITY_STYLES[order.priority]?.bg, color: PRIORITY_STYLES[order.priority]?.color, fontSize: '0.65rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: 999, textTransform: 'uppercase' }}>
              {order.priority}
            </span>
            <span style={{ background: STATUS_STYLES[order.status]?.bg || 'var(--gray-100)', color: STATUS_STYLES[order.status]?.color || 'var(--gray-600)', fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 999 }}>
              {STATUS_STYLES[order.status]?.label || order.status}
            </span>
          </div>
        </div>

        {/* Study Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[
            ['Study Type',           order.study_type],
            ['Modality',             order.modality],
            ['Body Part / Region',   order.body_part],
            ['Requested By',         order.requested_by],
            ['Ordered At',           order.ordered_at   ? new Date(order.ordered_at).toLocaleString('en-IN')   : '—'],
            ['Completed At',         order.completed_at ? new Date(order.completed_at).toLocaleString('en-IN') : 'Pending'],
          ].map(([label, val]) => (
            <div key={label} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--gray-100)', display: 'flex', gap: '1rem' }}>
              <span style={{ width: 140, fontSize: '0.8rem', color: 'var(--gray-400)', fontWeight: 600, flexShrink: 0 }}>{label}</span>
              <span style={{ fontSize: '0.875rem', color: 'var(--gray-700)' }}>{val || '—'}</span>
            </div>
          ))}
          {order.clinical_indication && (
            <div style={{ padding: '0.875rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gray-150)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-500)', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Clinical Indication</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--gray-700)' }}>{order.clinical_indication}</div>
            </div>
          )}
        </div>

        {/* Findings Entry Form */}
        {studyConfig && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h5 style={{ fontWeight: 700, margin: '0 0 1rem', color: 'var(--primary-700)', fontSize: '0.9375rem' }}>Radiologist Findings</h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {studyConfig.fields.map(field => (
                <div key={field.id} className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.375rem' }}>{field.label}</label>
                  {renderField(field)}
                </div>
              ))}
            </div>
            {isEditable && (
              <button 
                className="btn btn-primary w-full" 
                style={{ marginTop: '1.25rem', justifyContent: 'center' }}
                onClick={handleSaveFindings}
                disabled={saving}
              >
                {saving ? <Loader size={14} className="spin"/> : <CheckCircle size={14}/>} 
                {isReported ? 'Update Findings & Regenerate PDF' : 'Save Findings & Generate PDF Report'}
              </button>
            )}
            {isReported && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
                <button 
                  className="btn btn-secondary w-full" 
                  style={{ justifyContent: 'center' }} 
                  onClick={() => generatePDF(order, findings)}
                >
                  <Download size={14} /> Download PDF
                </button>
                <button 
                  className="btn btn-primary w-full" 
                  style={{ justifyContent: 'center', background: '#3b82f6', borderColor: '#3b82f6' }} 
                  onClick={handleSendEmail}
                  disabled={emailing}
                >
                  {emailing ? <Loader size={14} className="spin" /> : <Mail size={14} />} Send Email
                </button>
              </div>
            )}
          </div>
        )}

        {/* PDF Upload */}
        <div style={{ borderTop: '1px solid var(--gray-100)', paddingTop: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={14} /> Radiology Report PDF
          </div>
          <PdfUploadBtn
            orderId={order.id}
            existingPath={order.result_pdf_path}
            uploadFn={api.uploadRadiologyResult}
            onUploaded={onUpdated}
          />
        </div>

        <button className="btn btn-secondary w-full" style={{ marginTop: '1.5rem', justifyContent: 'center' }} onClick={onClose}>Close</button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Radiology() {
  const [orders,       setOrders]       = useState([])
  const [doctors,      setDoctors]      = useState([])
  const [patients,     setPatients]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showModal,    setShowModal]    = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const params = {}
      if (statusFilter !== 'All') params.status = statusFilter
      if (search) params.search = search
      const data = await api.getRadiology(params)
      setOrders(data)
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }, [search, statusFilter])

  useEffect(() => {
    const t = setTimeout(fetchData, 300)
    return () => clearTimeout(t)
  }, [fetchData])

  useEffect(() => {
    api.getDoctors().then(setDoctors).catch(() => {})
    api.getPatients().then(setPatients).catch(() => {})
  }, [])

  const handleSave    = (o) => setOrders(prev => [o, ...prev])
  const handleUpdated = (updated) => {
    setOrders(prev => prev.map(o => o.id === updated.id ? { ...o, ...updated } : o))
    setSelectedOrder(prev => prev ? { ...prev, ...updated } : prev)
  }

  return (
    <>
    <div className="animate-fadeInUp">
      <div className="page-header">
        <div>
          <h1 className="page-title">Radiology</h1>
          <p className="page-subtitle">Imaging orders, study tracking, and report management</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={15} /> New Radiology Order
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-4" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Orders',   val: orders.length,                                        color: 'var(--gray-700)', bg: 'var(--gray-50)' },
          { label: 'Scheduled',      val: orders.filter(o => o.status === 'Scheduled').length,   color: '#b45309',         bg: 'rgba(245,158,11,0.06)' },
          { label: 'In Progress',    val: orders.filter(o => o.status === 'In Progress').length,  color: '#4338ca',         bg: 'rgba(99,102,241,0.08)' },
          { label: 'Reports Ready',  val: orders.filter(o => o.status === 'Reported').length,    color: '#059669',         bg: 'rgba(16,185,129,0.06)' },
        ].map((s, i) => (
          <div key={i} style={{ background: s.bg, borderRadius: 'var(--radius-xl)', padding: '1.25rem', border: '1px solid rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: s.color, letterSpacing: '-0.04em', lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginTop: '0.375rem', fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
          <input className="form-input" style={{ paddingLeft: '2.25rem' }} placeholder="Search by patient or study type..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['All', 'Scheduled', 'In Progress', 'Reported', 'Cancelled'].map(f => (
            <button key={f} className={`btn btn-sm ${statusFilter === f ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setStatusFilter(f)}>
              {STATUS_STYLES[f]?.label || f}
            </button>
          ))}
        </div>
      </div>

      {error && <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.06)', color: '#dc2626', borderRadius: 'var(--radius-lg)', marginBottom: '1.25rem', fontSize: '0.875rem' }}>⚠ {error}</div>}

      {/* Table */}
      <div className="card">
        <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Order ID</th><th>Patient</th><th>Study Type</th><th>Modality</th>
                <th>Body Part</th><th>Requested By</th><th>Priority</th><th>Ordered At</th><th>Status</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-400)' }}><Loader size={20} className="spin" style={{ display: 'inline-block' }} /></td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-400)' }}>No radiology orders found</td></tr>
              ) : orders.map(o => (
                <tr key={o.id}>
                  <td><span style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: 'var(--gray-500)' }}>#{o.id}</span></td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--gray-800)' }}>{o.patient_name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>{o.patient_code}</div>
                  </td>
                  <td>
                    <span style={{ background: 'rgba(99,102,241,0.08)', color: 'var(--primary-700)', fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 4 }}>
                      {o.study_type}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>{o.modality || '—'}</td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>{o.body_part || '—'}</td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--gray-600)' }}>{o.requested_by || '—'}</td>
                  <td>
                    <span style={{ background: PRIORITY_STYLES[o.priority]?.bg || 'var(--gray-100)', color: PRIORITY_STYLES[o.priority]?.color || 'var(--gray-600)', fontSize: '0.65rem', fontWeight: 800, padding: '0.2rem 0.5rem', borderRadius: 999, letterSpacing: '0.06em' }}>
                      {PRIORITY_STYLES[o.priority]?.label || o.priority}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--gray-400)', whiteSpace: 'nowrap' }}>
                    {o.ordered_at ? new Date(o.ordered_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                  </td>
                  <td>
                    <span style={{ background: STATUS_STYLES[o.status]?.bg || 'var(--gray-100)', color: STATUS_STYLES[o.status]?.color || 'var(--gray-600)', fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: 999 }}>
                      {STATUS_STYLES[o.status]?.label || o.status}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-sm btn-secondary" style={{ padding: '0.3rem 0.625rem', fontSize: '0.75rem' }} onClick={() => setSelectedOrder(o)}>
                      {o.result_pdf_path ? <><FileText size={11} /> PDF</> : o.status === 'Reported' ? <><CheckCircle size={11} /> Report</> : 'View'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card-footer">
          <span style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>Showing {orders.length} radiology orders</span>
        </div>
      </div>

    </div>
    {selectedOrder && <OrderPanel order={selectedOrder} onClose={() => setSelectedOrder(null)} onUpdated={handleUpdated} />}
    {showModal && <NewRadiologyModal onClose={() => setShowModal(false)} onSave={handleSave} patients={patients} doctors={doctors} />}
    </>
  )
}
