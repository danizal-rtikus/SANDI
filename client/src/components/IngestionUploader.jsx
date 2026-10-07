import React, { useState } from 'react';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Cpu, 
  Layers, 
  FileCheck,
  ArrowRight
} from 'lucide-react';

export default function IngestionUploader({ onShowToast, onDocumentUploaded }) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [docNumber, setDocNumber] = useState('');
  const [categoryId, setCategoryId] = useState('1');
  const [year, setYear] = useState(new Date().getFullYear());
  const [version, setVersion] = useState('1.0');
  const [access, setAccess] = useState('publik_internal');
  const [description, setDescription] = useState('');
  
  const [isUploading, setIsUploading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0); // 0: Idle, 1: Uploading/SHA-256, 2: Extracting, 3: Chunking, 4: Embedding, 5: Ready
  const [uploadResult, setUploadResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      if (selected.type !== 'application/pdf') {
        onShowToast('Format berkas harus berupa dokumen PDF (.pdf)');
        return;
      }
      setFile(selected);
      if (!title) {
        // Auto-fill title from filename
        const cleanName = selected.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');
        setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      onShowToast('Silakan pilih berkas PDF terlebih dahulu');
      return;
    }
    if (!title.trim()) {
      onShowToast('Judul dokumen wajib diisi');
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);
    setUploadResult(null);
    setCurrentStep(1); // Uploading & Checksum

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('doc_number', docNumber);
      formData.append('category_id', categoryId);
      formData.append('year', year);
      formData.append('version', version);
      formData.append('access', access);
      formData.append('description', description);

      // Simulasi progress step pipeline
      setTimeout(() => setCurrentStep(2), 500); // Extracting
      setTimeout(() => setCurrentStep(3), 1100); // Chunking
      setTimeout(() => setCurrentStep(4), 1800); // Embedding

      const res = await fetch('/api/documents', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memproses berkas PDF');
      }

      setCurrentStep(5); // Ready
      setUploadResult(data);
      onShowToast(`Dokumen "${title}" berhasil diindeks (${data.pageCount} halaman, ${data.chunkCount} chunk)!`);
      if (onDocumentUploaded) onDocumentUploaded();

      // Reset form
      setFile(null);
      setTitle('');
      setDocNumber('');
      setDescription('');
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message);
      setCurrentStep(0);
      onShowToast(`Gagal: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.6rem', marginBottom: '0.35rem' }}>
          Pipeline Ingest & Indeksasi Dokumen SPMI
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Unggah naskah kebijakan, standar, atau SOP mutu terbaru. Pipeline otomatis akan mengekstrak teks tiap halaman, mendeteksi noise/scan, melakukan chunking token, dan meng-generate vektor embedding (768 dimensi).
        </p>
      </div>

      <div className="upload-grid-container">
        {/* Left: Upload Form */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: '1.75rem', boxShadow: 'var(--shadow-sm)' }}>
          <form onSubmit={handleSubmit}>
            {/* File Dropzone */}
            <div className="form-group">
              <label className="form-label">Berkas Dokumen PDF (Maks. 50 MB)</label>
              <div 
                className="dropzone-box"
                onClick={() => document.getElementById('pdf-input-field').click()}
              >
                <input 
                  id="pdf-input-field"
                  type="file" 
                  accept="application/pdf" 
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                <UploadCloud size={40} color="var(--brand-primary)" style={{ margin: '0 auto 0.75rem' }} />
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                  {file ? file.name : 'Pilih atau Seret Berkas PDF ke Sini'}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  {file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB • Klik untuk mengganti` : 'Mendukung teks PDF digital resmi perguruan tinggi'}
                </div>
              </div>
            </div>

            {/* Metadata Fields */}
            <div className="form-group">
              <label className="form-label">Judul Resmi Dokumen *</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Contoh: Standar Penilaian Pembelajaran Mahasiswa"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Nomor Dokumen / SK</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="STD-PMB/SYS/2024/005"
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Kategori Dokumen</label>
                <select 
                  className="form-select"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="1">Kebijakan SPMI</option>
                  <option value="2">Manual Mutu</option>
                  <option value="3">Standar SPMI</option>
                  <option value="4">SOP (Prosedur Operasional)</option>
                  <option value="5">Pedoman SDM & Akademik</option>
                  <option value="6">Formulir & Instrumen</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Tahun Berlaku</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Versi Dokumen</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Aksesibilitas</label>
                <select 
                  className="form-select"
                  value={access}
                  onChange={(e) => setAccess(e.target.value)}
                >
                  <option value="publik_internal">Publik Internal</option>
                  <option value="internal_terbatas">Internal Terbatas</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Ringkasan / Ruang Lingkup Dokumen</label>
              <textarea 
                className="form-textarea" 
                rows="3"
                placeholder="Jelaskan secara ringkas isi dan sasaran dokumen penjaminan mutu ini..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {errorMsg && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.75rem', background: 'var(--accent-rose-light)', color: 'var(--accent-rose)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.82rem' }}>
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <button 
              type="submit" 
              className="search-submit-btn" 
              style={{ width: '100%', justifyContent: 'center' }}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Memproses Pipeline Dokumen...
                </>
              ) : (
                <>
                  <UploadCloud size={18} />
                  Mulai Proses Ingest & Indeksasi
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right: Pipeline Visualizer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: '1.75rem', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Cpu size={18} color="var(--brand-primary)" />
              Status Pipeline Pemrosesan Otomatis
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Step 1 */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, opacity: currentStep >= 1 ? 1 : 0.4 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: currentStep >= 1 ? 'var(--brand-primary)' : 'var(--bg-tertiary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, flexShrink: 0 }}>
                  1
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Validasi & Checksum SHA-256 (FR-02)</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Menghitung sidik jari kriptografi berkas untuk mencegah duplikasi konten.</div>
                </div>
              </div>

              {/* Step 2 */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, opacity: currentStep >= 2 ? 1 : 0.4 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: currentStep >= 2 ? 'var(--brand-primary)' : 'var(--bg-tertiary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, flexShrink: 0 }}>
                  2
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Ekstraksi Halaman & Deteksi Noise (FR-03, FR-04)</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Mengekstrak teks halaman per halaman dan mendeteksi apakah berkas adalah hasil scan.</div>
                </div>
              </div>

              {/* Step 3 */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, opacity: currentStep >= 3 ? 1 : 0.4 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: currentStep >= 3 ? 'var(--brand-primary)' : 'var(--bg-tertiary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, flexShrink: 0 }}>
                  3
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Pembersihan Teks & Chunking Kontekstual (FR-06)</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Memecah per ~700 token dengan overlap ~80 token serta menyematkan konteks judul dokumen.</div>
                </div>
              </div>

              {/* Step 4 */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, opacity: currentStep >= 4 ? 1 : 0.4 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: currentStep >= 4 ? 'var(--brand-primary)' : 'var(--bg-tertiary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, flexShrink: 0 }}>
                  4
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Batch Embedding Gemini 768-Dim (FR-08)</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Mengubah tiap teks chunk menjadi vektor numerik untuk pencarian makna (pgvector).</div>
                </div>
              </div>

              {/* Step 5 */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, opacity: currentStep >= 5 ? 1 : 0.4 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: currentStep >= 5 ? 'var(--accent-emerald)' : 'var(--bg-tertiary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, flexShrink: 0 }}>
                  <CheckCircle2 size={16} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: currentStep >= 5 ? 'var(--accent-emerald)' : 'inherit' }}>
                    Selesai & Siap Dicari (Ready)
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Dokumen berstatus `published` dan dapat langsung diakses pada pencarian semantik.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Result Card when complete */}
          {uploadResult && (
            <div style={{ background: 'var(--accent-emerald-light)', border: '1px solid var(--accent-emerald)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', color: 'var(--accent-emerald)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, marginBottom: 4 }}>
                <CheckCircle2 size={18} />
                Indeksasi Berhasil!
              </div>
              <div style={{ fontSize: '0.85rem' }}>
                Total <strong>{uploadResult.pageCount} halaman</strong> diekstrak dan dibagi menjadi <strong>{uploadResult.chunkCount} potongan chunks</strong> dengan vektor embedding yang siap ditelusuri.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
