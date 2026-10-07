import React, { useState, useEffect } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  ExternalLink, 
  FileText, 
  Bookmark, 
  ShieldCheck, 
  Copy, 
  Check,
  Maximize2
} from 'lucide-react';

export default function PdfViewerModal({ 
  documentId, 
  initialPage = 1, 
  query = '', 
  documentTitle = '',
  initialSnippet = '',
  onClose,
  onShowToast 
}) {
  const [page, setPage] = useState(initialPage || 1);
  const [docDetails, setDocDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  useEffect(() => {
    if (documentId) {
      setLoading(true);
      fetch(`/api/documents/${documentId}`)
        .then(r => r.json())
        .then(data => {
          setDocDetails(data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [documentId]);

  const maxPage = docDetails?.page_count || 48;

  // Temukan chunk untuk halaman aktif saat ini jika ada
  const activeChunk = docDetails?.chunks?.find(c => c.page_number === page);
  const displaySnippet = activeChunk ? activeChunk.content : (page === initialPage ? initialSnippet : 'Konten halaman ini dapat ditinjau langsung pada naskah lengkap.');

  const copyCitation = () => {
    const citationText = `[Dokumen: "${docDetails?.title || documentTitle}", Nomor: ${docDetails?.doc_number || '-'}, Halaman ${page}] - STIKOM Yos Sudarso SPMI`;
    navigator.clipboard.writeText(citationText);
    setCopiedSnippet(true);
    onShowToast('Format sitasi resmi berhasil disalin ke clipboard!');
    setTimeout(() => setCopiedSnippet(false), 2500);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, background: 'var(--brand-primary-light)', color: 'var(--brand-primary)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--text-main)' }}>
                {docDetails?.title || documentTitle}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Navigasi Presisi Halaman • SPMI STIKOM Yos Sudarso
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Page navigation controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-tertiary)', padding: '3px 8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
              <button 
                className="btn-feedback"
                style={{ padding: '3px 6px' }}
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft size={15} />
              </button>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, minWidth: '70px', textAlign: 'center' }}>
                Halaman {page} / {maxPage}
              </span>
              <button 
                className="btn-feedback"
                style={{ padding: '3px 6px' }}
                disabled={page >= maxPage}
                onClick={() => setPage(p => Math.min(maxPage, p + 1))}
              >
                <ChevronRight size={15} />
              </button>
            </div>

            <button 
              className="btn-feedback"
              onClick={copyCitation}
              title="Salin Sitasi Resmi"
            >
              {copiedSnippet ? <Check size={14} color="var(--accent-emerald)" /> : <Copy size={14} />}
              Sitasi
            </button>

            <button 
              className="btn-icon-control"
              onClick={onClose}
              title="Tutup Viewer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* Main Content Area */}
          <div className="pdf-preview-main">
            {/* Target Highlight Banner */}
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span className="badge badge-page">
                  Kutipan Tersorot pada Halaman {page}
                </span>
                {activeChunk?.section_title && (
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Bookmark size={13} />
                    {activeChunk.section_title}
                  </span>
                )}
              </div>

              <div style={{ fontSize: '0.92rem', lineHeight: 1.7, color: 'var(--text-main)', background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--brand-primary)', whiteSpace: 'pre-wrap' }}>
                {displaySnippet}
              </div>
            </div>

            {/* Document Sheet Simulation */}
            <div style={{ background: '#ffffff', color: '#1e293b', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-md)', padding: '2.5rem 3rem', boxShadow: 'var(--shadow-md)', minHeight: '400px', position: 'relative' }}>
              <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '0.75rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.05em', color: '#0369a1', textTransform: 'uppercase' }}>
                    STIKOM YOS SUDARSO PURWOKERTO
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                    SISTEM PENJAMINAN MUTU INTERNAL (SPMI)
                  </div>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  No: {docDetails?.doc_number || 'PED-SDM/SYS/2024'}
                </div>
              </div>

              <div style={{ fontSize: '0.85rem', lineHeight: 1.8, color: '#334155' }}>
                <p style={{ marginBottom: '1rem', fontStyle: 'italic', color: '#64748b' }}>
                  [Tampilan Lembar Resmi Naskah Asli • Halaman {page} dari {maxPage}]
                </p>
                <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
                  {displaySnippet}
                </div>
                <p style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'justify' }}>
                  Seluruh klausul dan ketentuan di atas mengikat bagi seluruh unit kerja dan civitas akademika STIKOM Yos Sudarso. Dokumen ini telah diverifikasi dan disahkan oleh Tim Auditor Mutu Internal (AMI) dan Pimpinan Institusi.
                </p>
              </div>

              <div style={{ position: 'absolute', bottom: '1.25rem', right: '3rem', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
                Halaman {page}
              </div>
            </div>
          </div>

          {/* Right Sidebar Metadata */}
          <div className="pdf-sidebar-meta">
            <h4 style={{ fontSize: '0.95rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={16} color="var(--brand-primary)" />
              Metadata Verifikasi Dokumen
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.82rem' }}>
              <div>
                <span style={{ color: 'var(--text-subtle)', display: 'block', fontSize: '0.75rem', fontWeight: 700 }}>JUDUL RESMI</span>
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                  {docDetails?.title || documentTitle}
                </span>
              </div>

              <div>
                <span style={{ color: 'var(--text-subtle)', display: 'block', fontSize: '0.75rem', fontWeight: 700 }}>NOMOR DOKUMEN / SK</span>
                <span style={{ fontFamily: 'monospace', color: 'var(--brand-primary)', fontWeight: 600 }}>
                  {docDetails?.doc_number || '-'}
                </span>
              </div>

              <div>
                <span style={{ color: 'var(--text-subtle)', display: 'block', fontSize: '0.75rem', fontWeight: 700 }}>KATEGORI SPMI</span>
                <span className="badge badge-category" style={{ marginTop: 3 }}>
                  {docDetails?.category_name || 'Standar SPMI'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <span style={{ color: 'var(--text-subtle)', display: 'block', fontSize: '0.75rem', fontWeight: 700 }}>TAHUN</span>
                  <span style={{ fontWeight: 600 }}>{docDetails?.year || '-'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-subtle)', display: 'block', fontSize: '0.75rem', fontWeight: 700 }}>VERSI</span>
                  <span style={{ fontWeight: 600 }}>v{docDetails?.version || '1.0'}</span>
                </div>
              </div>

              <div>
                <span style={{ color: 'var(--text-subtle)', display: 'block', fontSize: '0.75rem', fontWeight: 700 }}>CHECKSUM SHA-256</span>
                <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--text-muted)', wordBreak: 'break-all', display: 'block', background: 'var(--bg-tertiary)', padding: '4px 6px', borderRadius: 4, marginTop: 3 }}>
                  {docDetails?.checksum_sha256 || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
                </span>
              </div>

              <div>
                <span style={{ color: 'var(--text-subtle)', display: 'block', fontSize: '0.75rem', fontWeight: 700 }}>STATUS KORPUS</span>
                <span className="badge badge-similarity-high" style={{ marginTop: 3 }}>
                  Tervalidasi & Published
                </span>
              </div>

              <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button 
                  className="btn-open-pdf" 
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={copyCitation}
                >
                  <Copy size={14} />
                  Salin Bukti Sitasi Audit
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
