import React, { useState, useEffect } from 'react';
import { 
  FileEdit, 
  X, 
  Save, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  FolderOpen,
  Calendar,
  Layers,
  FileText
} from 'lucide-react';

export default function DocumentEditModal({ isOpen, document: doc, onClose, onSaved, onShowToast }) {
  const [formData, setFormData] = useState({
    title: '',
    doc_number: '',
    category_id: 1,
    year: new Date().getFullYear(),
    version: '1.0',
    description: '',
    status: 'published',
    is_active: true
  });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    // Fetch categories
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setCategories(data);
      })
      .catch(err => console.warn('Gagal memuat kategori:', err));
  }, []);

  useEffect(() => {
    if (doc) {
      setFormData({
        title: doc.title || '',
        doc_number: doc.doc_number || '',
        category_id: doc.category_id || 1,
        year: doc.year || new Date().getFullYear(),
        version: doc.version || '1.0',
        description: doc.description || '',
        status: doc.status || 'published',
        is_active: doc.is_active !== undefined ? doc.is_active : true
      });
      setErrorMsg(null);
    }
  }, [doc]);

  if (!isOpen || !doc) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setErrorMsg('Judul dokumen wajib diisi.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const selectedCat = categories.find(c => Number(c.id) === Number(formData.category_id));
      const payload = {
        ...formData,
        category_id: Number(formData.category_id),
        category_name: selectedCat ? selectedCat.name : undefined,
        year: Number(formData.year)
      };

      const res = await fetch(`/api/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memperbarui metadata dokumen');
      }

      onShowToast(`Metadata "${formData.title}" berhasil diperbarui!`);
      onSaved();
      onClose();
    } catch (err) {
      console.error('Update doc error:', err);
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pdf-modal-overlay" style={{ zIndex: 1200 }}>
      <div 
        className="sirena-card"
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '1.75rem',
          position: 'relative',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          animation: 'fadeIn 0.2s ease-out',
          overflowY: 'auto'
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={loading}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--text-light)',
            padding: '4px',
            borderRadius: '6px'
          }}
          title="Tutup Modal"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div 
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: '#f3e8ff',
              color: 'var(--primary-purple)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <FileEdit size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.18rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
              Edit Metadata Dokumen
            </h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>
              ID: {doc.id} • {doc.page_count || 1} Halaman
            </span>
          </div>
        </div>

        {errorMsg && (
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              padding: '0.75rem',
              backgroundColor: '#fef2f2',
              color: '#991b1b',
              borderRadius: '8px',
              border: '1px solid #fecaca',
              fontSize: '0.83rem',
              marginBottom: '1rem'
            }}
          >
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Judul Dokumen */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
              Judul Dokumen <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input 
              type="text"
              required
              className="catalog-search-input"
              style={{ width: '100%', fontSize: '0.88rem', borderRadius: '8px' }}
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Contoh: Kebijakan SPMI STIKOM Yos Sudarso"
            />
          </div>

          {/* Nomor Dokumen & Kategori */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                Nomor Dokumen / SK
              </label>
              <input 
                type="text"
                className="catalog-search-input"
                style={{ width: '100%', fontSize: '0.88rem', borderRadius: '8px' }}
                value={formData.doc_number}
                onChange={(e) => setFormData({ ...formData, doc_number: e.target.value })}
                placeholder="SK-01/SPMI/2024"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                Kategori SPMI
              </label>
              <select 
                className="filter-select"
                style={{ width: '100%', padding: '0.55rem', borderRadius: '8px' }}
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              >
                {categories.length > 0 ? (
                  categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))
                ) : (
                  <>
                    <option value="1">Kebijakan SPMI</option>
                    <option value="2">Manual Mutu</option>
                    <option value="3">Standar SPMI</option>
                    <option value="4">SOP (Prosedur Operasional)</option>
                    <option value="5">Pedoman SDM & Akademik</option>
                    <option value="6">Formulir & Instrumen</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Tahun, Versi, Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                Tahun
              </label>
              <input 
                type="number"
                min="2000"
                max="2099"
                className="catalog-search-input"
                style={{ width: '100%', fontSize: '0.88rem', borderRadius: '8px' }}
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                Versi
              </label>
              <input 
                type="text"
                className="catalog-search-input"
                style={{ width: '100%', fontSize: '0.88rem', borderRadius: '8px' }}
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                placeholder="1.0"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                Status Dokumen
              </label>
              <select 
                className="filter-select"
                style={{ width: '100%', padding: '0.55rem', borderRadius: '8px' }}
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="superseded">Digantikan</option>
                <option value="archived">Diarsipkan</option>
              </select>
            </div>
          </div>

          {/* Deskripsi */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
              Deskripsi / Ringkasan Dokumen
            </label>
            <textarea 
              rows={3}
              className="catalog-search-input"
              style={{ width: '100%', fontSize: '0.85rem', borderRadius: '8px', resize: 'vertical' }}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Ringkasan isi dan tujuan dokumen..."
            />
          </div>

          {/* Status Aktif Switch */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0' }}>
            <input 
              type="checkbox"
              id="is_active_checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              style={{ width: 16, height: 16, accentColor: 'var(--primary-purple)', cursor: 'pointer' }}
            />
            <label htmlFor="is_active_checkbox" style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer' }}>
              Status Aktif (Ditampilkan dalam pencarian semantik & RAG)
            </label>
          </div>

          {/* Footer Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn-feedback"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-purple-primary"
              style={{ opacity: loading ? 0.8 : 1 }}
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save size={15} />
                  Simpan Perubahan
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
