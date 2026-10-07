import React, { useState, useEffect, useMemo } from 'react';
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
  AlignLeft,
  FileCheck,
  Highlighter
} from 'lucide-react';

const INDO_STOPWORDS = new Set([
  'apa', 'apakah', 'bagaimana', 'dimana', 'kapan', 'siapa', 'mengapa', 'kenapa',
  'yang', 'di', 'ke', 'dari', 'pada', 'dalam', 'untuk', 'dengan', 'dan', 'atau',
  'ini', 'itu', 'adalah', 'yaitu', 'ada', 'bisa', 'dapat', 'akan', 'telah', 'sudah',
  'jika', 'kalau', 'maka', 'tentang', 'terkait', 'oleh', 'secara', 'sebagai', 'serta',
  'aturan', 'diatur', 'bagaimanakah', 'dimanakah', 'tersebut', 'stikom', 'yos', 'sudarso'
]);

function extractKeywords(queryStr) {
  if (!queryStr) return [];
  const tokens = queryStr
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const keywords = tokens.filter(t => t.length > 2 && !INDO_STOPWORDS.has(t));
  return [...new Set(keywords)];
}

function highlightKeywords(text, keywords) {
  if (!text || !keywords || keywords.length === 0) return text;
  try {
    const escaped = keywords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, idx) => {
      if (regex.test(part)) {
        return (
          <mark key={idx} className="doc-highlight-mark">
            {part}
          </mark>
        );
      }
      return part;
    });
  } catch (e) {
    return text;
  }
}

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
  const [viewMode, setViewMode] = useState('pdf'); // 'pdf' | 'transcript'
  const [docDetails, setDocDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedCitation, setCopiedCitation] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

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

  const rawTitle = docDetails?.title || documentTitle || '';
  const cleanTitle = rawTitle.replace(/^\d+[\s._-]+/, '');
  const maxPage = docDetails?.page_count || 1;

  // Ekstraksi kata kunci penelusuran
  const keywords = useMemo(() => extractKeywords(query), [query]);
  const primarySearchTerm = keywords.slice(0, 3).join(' ');

  // Temukan chunk/potongan teks untuk halaman saat ini
  const activeChunk = docDetails?.chunks?.find(c => c.page_number === page);
  const displaySnippet = activeChunk?.content || (page === initialPage ? initialSnippet : 'Konten naskah pada halaman ini dapat ditelaah langsung pada panel PDF asli di sebelah kiri.');

  // URL PDF dengan parameter loncat ke halaman & search query bawaan peramban
  const pdfUrl = primarySearchTerm
    ? `/api/documents/${documentId}/file#page=${page}&search=${encodeURIComponent(primarySearchTerm)}&view=FitH`
    : `/api/documents/${documentId}/file#page=${page}&view=FitH`;

  const copyCitation = () => {
    const docNum = docDetails?.doc_number ? `No. ${docDetails.doc_number}` : 'SPMI-SYS';
    const citationText = `[STIKOM Yos Sudarso] ${cleanTitle}, Dokumen ${docNum}, Hlm. ${page}. Kategori: ${docDetails?.category_name || 'SPMI'}.`;
    navigator.clipboard.writeText(citationText);
    setCopiedCitation(true);
    if (onShowToast) onShowToast('Format sitasi borang akreditasi berhasil disalin!');
    setTimeout(() => setCopiedCitation(false), 2500);
  };

  const copyPageText = () => {
    navigator.clipboard.writeText(displaySnippet);
    setCopiedText(true);
    if (onShowToast) onShowToast('Teks naskah halaman berhasil disalin!');
    setTimeout(() => setCopiedText(false), 2500);
  };

  const openNewTab = () => {
    window.open(`/api/documents/${documentId}/file#page=${page}`, '_blank');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          {/* Identitas Dokumen Kiri */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
            <div style={{ 
              width: 36, 
              height: 36, 
              background: '#0f172a', 
              color: '#ffffff', 
              borderRadius: 'var(--radius-md)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <FileText size={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ 
                fontWeight: 700, 
                fontSize: '0.98rem', 
                color: 'var(--text-main)', 
                overflow: 'hidden', 
                textOverflow: 'ellipsis', 
                whiteSpace: 'nowrap' 
              }} title={cleanTitle}>
                {cleanTitle}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                STIKOM Yos Sudarso Purwokerto • Repositori Penjaminan Mutu Internal
              </div>
            </div>
          </div>

          {/* Mode Switcher */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            background: 'var(--bg-subtle)', 
            padding: 3, 
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)'
          }}>
            <button 
              className={`pdf-mode-pill ${viewMode === 'pdf' ? 'active' : ''}`}
              onClick={() => setViewMode('pdf')}
              title="Tampilkan Berkas Asli PDF"
            >
              <FileCheck size={14} />
              <span>Naskah Asli PDF</span>
            </button>
            <button 
              className={`pdf-mode-pill ${viewMode === 'transcript' ? 'active' : ''}`}
              onClick={() => setViewMode('transcript')}
              title="Tampilkan Transkrip Teks"
            >
              <AlignLeft size={14} />
              <span>Transkrip Teks</span>
            </button>
          </div>

          {/* Navigasi Halaman & Aksi Kanan */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 4, 
              background: 'var(--bg-subtle)', 
              padding: '3px 8px', 
              borderRadius: 'var(--radius-md)', 
              border: '1px solid var(--border-color)' 
            }}>
              <button 
                className="btn-feedback"
                style={{ padding: '3px 6px' }}
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                title="Halaman Sebelumnya"
              >
                <ChevronLeft size={15} />
              </button>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, minWidth: '78px', textAlign: 'center', color: 'var(--text-main)' }}>
                Hlm. {page} / {maxPage}
              </span>
              <button 
                className="btn-feedback"
                style={{ padding: '3px 6px' }}
                disabled={page >= maxPage}
                onClick={() => setPage(p => Math.min(maxPage, p + 1))}
                title="Halaman Selanjutnya"
              >
                <ChevronRight size={15} />
              </button>
            </div>

            <button 
              className="btn-feedback"
              onClick={openNewTab}
              title="Buka Dokumen PDF Penuh di Tab Baru"
              style={{ padding: '5px 10px' }}
            >
              <ExternalLink size={14} />
              <span>Tab Baru</span>
            </button>

            <button 
              className="btn-icon-control"
              onClick={onClose}
              title="Tutup Pratinjau Dokumen"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* Panel Kiri: Embedded PDF Asli atau Transkrip */}
          <div className="pdf-preview-main">
            {viewMode === 'pdf' ? (
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <iframe 
                  key={`${documentId}-${page}-${primarySearchTerm}`}
                  src={pdfUrl} 
                  className="pdf-embed-frame"
                  title={`Naskah Asli ${cleanTitle} Halaman ${page}`}
                />
                <div style={{ 
                  background: '#0f172a', 
                  color: '#94a3b8', 
                  fontSize: '0.73rem', 
                  padding: '6px 14px', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center' 
                }}>
                  <span>Menampilkan lembar PDF resmi • STIKOM Yos Sudarso</span>
                  {keywords.length > 0 ? (
                    <span style={{ color: '#fef08a' }}>
                      Sorotan Otomatis: {keywords.join(', ')}
                    </span>
                  ) : (
                    <span>Navigasikan halaman via bilah atas atau kontrol PDF peramban</span>
                  )}
                </div>
              </div>
            ) : (
              /* Transkrip Naskah */
              <div className="pdf-transcript-view">
                <div style={{ 
                  borderBottom: '2px solid #0f172a', 
                  paddingBottom: '0.75rem', 
                  marginBottom: '1.25rem', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-end' 
                }}>
                  <div>
                    <div style={{ fontSize: '0.74rem', fontWeight: 800, letterSpacing: '0.05em', color: '#0369a1', textTransform: 'uppercase' }}>
                      STIKOM YOS SUDARSO PURWOKERTO
                    </div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>
                      SISTEM PENJAMINAN MUTU INTERNAL (SPMI)
                    </div>
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600 }}>
                    Halaman {page} dari {maxPage}
                  </div>
                </div>

                {activeChunk?.section_title && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 6, 
                    fontSize: '0.86rem', 
                    fontWeight: 700, 
                    color: '#0f172a', 
                    marginBottom: '1rem',
                    background: '#f8fafc',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #e2e8f0'
                  }}>
                    <Bookmark size={14} color="#0284c7" />
                    <span>{activeChunk.section_title}</span>
                  </div>
                )}

                <div style={{ 
                  fontSize: '0.88rem', 
                  lineHeight: 1.8, 
                  color: '#334155', 
                  whiteSpace: 'pre-wrap', 
                  background: '#f8fafc', 
                  padding: '1.5rem', 
                  borderRadius: 6, 
                  border: '1px solid #e2e8f0',
                  marginBottom: '1.25rem'
                }}>
                  {highlightKeywords(displaySnippet, keywords)}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button 
                    className="btn-dossier-action btn-dossier-secondary"
                    style={{ width: 'auto', padding: '6px 14px' }}
                    onClick={copyPageText}
                  >
                    {copiedText ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                    <span>{copiedText ? 'Teks Berhasil Disalin' : 'Salin Teks Halaman Ini'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Panel Kanan: Verifikasi Legalitas & Kutipan */}
          <div className="pdf-sidebar-meta">
            {/* Header Sidebar */}
            <div>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 6, 
                fontSize: '0.92rem', 
                fontWeight: 700, 
                color: 'var(--text-main)', 
                marginBottom: '0.2rem' 
              }}>
                <ShieldCheck size={17} color="#0284c7" />
                <span>Verifikasi Dokumen SPMI</span>
              </div>
              <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                Metadata legalitas & bukti otentikasi naskah
              </div>
            </div>

            {/* Keyword Focus Bar jika ada kata kunci pencarian */}
            {keywords.length > 0 && (
              <div className="keyword-focus-bar">
                <Highlighter size={13} />
                <span style={{ fontWeight: 700 }}>Kata Kunci:</span>
                {keywords.map((kw, i) => (
                  <span key={i} className="keyword-chip">{kw}</span>
                ))}
              </div>
            )}

            {/* Kartu Metadata Resmi */}
            <div className="dossier-meta-card">
              <div className="dossier-meta-item">
                <span className="dossier-label">Judul Resmi Dokumen</span>
                <span className="dossier-val">{cleanTitle}</span>
              </div>

              <div className="dossier-meta-item">
                <span className="dossier-label">Nomor Ketetapan / SK</span>
                <span className="dossier-val" style={{ fontFamily: 'monospace', color: '#0369a1' }}>
                  {docDetails?.doc_number || 'Tercatat dalam Sistem SPMI'}
                </span>
              </div>

              <div className="dossier-meta-item">
                <span className="dossier-label">Kategori Dokumen Mutu</span>
                <div>
                  <span className="badge badge-category" style={{ display: 'inline-block', marginTop: 2 }}>
                    {docDetails?.category_name || 'Standar SPMI'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="dossier-meta-item">
                  <span className="dossier-label">Tahun Penerbitan</span>
                  <span className="dossier-val">{docDetails?.year || '-'}</span>
                </div>
                <div className="dossier-meta-item">
                  <span className="dossier-label">Edisi / Versi</span>
                  <span className="dossier-val">Edisi v{docDetails?.version || '1.0'}</span>
                </div>
              </div>

              <div className="dossier-meta-item">
                <span className="dossier-label">Status Keabsahan</span>
                <div>
                  <span className="badge badge-similarity-high" style={{ display: 'inline-block', marginTop: 2 }}>
                    Aktif & Diberlakukan
                  </span>
                </div>
              </div>
            </div>

            {/* Kutipan Klausul Kunci dengan Highlight Otomatis */}
            <div>
              <div style={{ 
                fontSize: '0.75rem', 
                fontWeight: 700, 
                color: 'var(--text-muted)', 
                textTransform: 'uppercase', 
                letterSpacing: '0.04em', 
                marginBottom: '0.45rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span>Kutipan Klausul Relevan</span>
                <span style={{ fontSize: '0.72rem', color: '#0284c7', textTransform: 'none', fontWeight: 600 }}>
                  Halaman {page}
                </span>
              </div>
              <div className="dossier-quote-box">
                {highlightKeywords(displaySnippet, keywords)}
              </div>
            </div>

            {/* Tombol Aksi Auditor */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: 'auto' }}>
              <button 
                type="button"
                className="btn-dossier-action btn-dossier-primary"
                onClick={copyCitation}
              >
                {copiedCitation ? <Check size={15} color="#4ade80" /> : <Copy size={15} />}
                <span>{copiedCitation ? 'Sitasi Tersalin!' : 'Salin Sitasi Borang Akreditasi'}</span>
              </button>

              <button 
                type="button"
                className="btn-dossier-action btn-dossier-secondary"
                onClick={() => window.open(`/api/documents/${documentId}/file`, '_blank')}
              >
                <Download size={15} />
                <span>Unduh Berkas Asli (PDF)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
