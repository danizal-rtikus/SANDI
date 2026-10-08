import React, { useState } from 'react';
import { 
  Trash2, 
  AlertTriangle, 
  X, 
  Loader2 
} from 'lucide-react';

export default function DocumentDeleteModal({ isOpen, document: doc, onClose, onDeleted, onShowToast }) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  if (!isOpen || !doc) return null;

  const handleDelete = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menghapus dokumen');
      }

      onShowToast(`Dokumen "${doc.title}" berhasil dihapus.`);
      onDeleted();
      onClose();
    } catch (err) {
      console.error('Delete doc error:', err);
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pdf-modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      <div 
        className="sirena-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '460px',
          background: 'var(--bg-card, #ffffff)',
          padding: '1.75rem',
          position: 'relative',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          animation: 'fadeIn 0.2s ease-out'
        }}
      >
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

        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div 
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: '#fef2f2',
              color: '#dc2626',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
              border: '1px solid #fee2e2'
            }}
          >
            <AlertTriangle size={26} />
          </div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.4rem 0', color: 'var(--text-main)' }}>
            Hapus Dokumen SPMI?
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-subtle)', margin: 0, lineHeight: 1.45 }}>
            Apakah Anda yakin ingin menghapus dokumen ini secara permanen?
          </p>
        </div>

        {/* Document card preview */}
        <div 
          style={{
            background: 'var(--surface-color)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '0.85rem 1rem',
            marginBottom: '1.25rem'
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '0.25rem' }}>
            {doc.title}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-subtle)' }}>
            {doc.doc_number || 'Tanpa No. Reg'} • {doc.category_name || 'Umum'} • {doc.page_count || 1} Halaman
          </div>
        </div>

        <div 
          style={{
            fontSize: '0.8rem',
            color: '#b91c1c',
            backgroundColor: '#fef2f2',
            padding: '0.75rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            border: '1px solid #fecaca',
            lineHeight: 1.4
          }}
        >
          ⚠️ <strong>Peringatan:</strong> Seluruh berkas PDF, potongan teks (chunks), dan indeks vektor embedding AI terkait dokumen ini akan dihapus secara permanen.
        </div>

        {errorMsg && (
          <div style={{ color: '#dc2626', fontSize: '0.82rem', marginBottom: '1rem', textAlign: 'center' }}>
            {errorMsg}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="btn-feedback"
            style={{ flex: 1, justifyContent: 'center', padding: '0.65rem' }}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            style={{
              flex: 1,
              justifyContent: 'center',
              padding: '0.65rem',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.88rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer',
              opacity: loading ? 0.8 : 1
            }}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Menghapus...
              </>
            ) : (
              <>
                <Trash2 size={16} />
                Ya, Hapus
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
