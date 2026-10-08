import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  ExternalLink, 
  RefreshCw, 
  Search, 
  ShieldCheck, 
  Hash, 
  Calendar, 
  Eye, 
  CheckCircle, 
  AlertTriangle,
  FolderOpen,
  FileEdit,
  Trash2
} from 'lucide-react';
import DocumentEditModal from './DocumentEditModal';
import DocumentDeleteModal from './DocumentDeleteModal';

export default function DocumentArchive({ onOpenViewer, onShowToast, userRole }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedDocDetails, setSelectedDocDetails] = useState(null);
  const [reindexingId, setReindexingId] = useState(null);

  // Modals state for admin
  const [editingDoc, setEditingDoc] = useState(null);
  const [deletingDoc, setDeletingDoc] = useState(null);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/documents');
      const data = await res.json();
      setDocuments(data || []);
    } catch (err) {
      console.error(err);
      onShowToast('Gagal memuat arsip dokumen');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleReindex = async (docId, title) => {
    setReindexingId(docId);
    try {
      const res = await fetch(`/api/documents/${docId}/reindex`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onShowToast(`Indeksasi ulang "${title}" berhasil diselesaikan!`);
      fetchDocuments();
    } catch (err) {
      onShowToast(`Gagal reindex: ${err.message}`);
    } finally {
      setReindexingId(null);
    }
  };

  const handleToggleActive = async (docId, currentActive) => {
    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentActive })
      });
      if (res.ok) {
        onShowToast(`Status dokumen berhasil diperbarui`);
        fetchDocuments();
      }
    } catch (err) {
      onShowToast('Gagal memperbarui status dokumen');
    }
  };

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (doc.doc_number && doc.doc_number.toLowerCase().includes(searchFilter.toLowerCase()));
    const matchesCat = !categoryFilter || String(doc.category_id) === String(categoryFilter);
    return matchesSearch && matchesCat;
  });

  const isAdmin = userRole === 'admin';

  return (
    <div>
      <div className="dashboard-header-block">
        <div>
          <div className="dashboard-heading-title">
            Koleksi & Repositori Dokumen SPMI
            <span className="heading-tag-purple">
              LPM — Lembaga Penjaminan Mutu
            </span>
          </div>
          <div className="dashboard-heading-desc">
            Daftar seluruh dokumen kebijakan, standar, manual, SOP, dan pedoman resmi STIKOM Yos Sudarso yang terdaftar dan terindeks dalam korpus sistem pencarian cerdas.
          </div>
        </div>

        <button 
          className="btn-feedback" 
          onClick={fetchDocuments}
          title="Muat Ulang Dokumen"
          style={{ padding: '0.5rem 0.85rem' }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Segarkan Data
        </button>
      </div>

      {/* Toolbar */}
      <div className="sirena-card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
        <div className="catalog-toolbar" style={{ margin: 0 }}>
        <div style={{ display: 'flex', gap: '0.75rem', flex: 1 }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
            <Search size={16} color="var(--text-subtle)" style={{ position: 'absolute', left: 12, top: 12 }} />
            <input 
              type="text" 
              className="catalog-search-input"
              style={{ width: '100%', paddingLeft: '2.25rem' }}
              placeholder="Cari judul atau nomor dokumen..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />
          </div>

          <select 
            className="filter-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">Semua Kategori</option>
            <option value="1">Kebijakan SPMI</option>
            <option value="2">Manual Mutu</option>
            <option value="3">Standar SPMI</option>
            <option value="4">SOP (Prosedur Operasional)</option>
            <option value="5">Pedoman SDM & Akademik</option>
            <option value="6">Formulir & Instrumen</option>
          </select>
        </div>
      </div>
    </div>

      {/* Table */}
      <div className="catalog-table-wrap">
        <table className="table-custom">
          <thead>
            <tr>
              <th>Judul & Nomor Dokumen</th>
              <th>Kategori</th>
              <th>Tahun / Versi</th>
              <th>Halaman</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredDocs.length > 0 ? (
              filteredDocs.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                      <FileText size={18} color="var(--brand-primary)" style={{ flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.92rem' }}>
                          {doc.title}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                          <span>{doc.doc_number || 'Tanpa No. Reg'}</span>
                          <span>•</span>
                          <span title={`Checksum SHA-256: ${doc.checksum_sha256}`}>
                            SHA: {doc.checksum_sha256 ? doc.checksum_sha256.substring(0, 10) + '...' : '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-category">
                      {doc.category_name || 'Umum'}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{doc.year || '-'}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginLeft: 6 }}>
                      (v{doc.version || '1.0'})
                    </span>
                  </td>
                  <td>
                    <strong>{doc.page_count || 1}</strong> hlm
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', display: 'block' }}>
                      {doc.chunks?.length || 0} chunks
                    </span>
                  </td>
                  <td>
                    {doc.status === 'published' && doc.is_active ? (
                      <span className="badge badge-similarity-high">
                        <CheckCircle size={11} />
                        Aktif
                      </span>
                    ) : doc.status === 'superseded' ? (
                      <span className="badge" style={{ background: '#f1f5f9', color: '#64748b' }}>
                        Digantikan
                      </span>
                    ) : (
                      <span className="badge badge-similarity-med">
                        {doc.status}
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      {/* Tombol Lihat: Selalu tersedia untuk semua role */}
                      <button 
                        className="btn-feedback"
                        onClick={() => onOpenViewer(doc.id, 1, '', doc.title, doc.description)}
                        title="Buka Dokumen di Viewer"
                      >
                        <Eye size={13} />
                        Lihat
                      </button>

                      {/* Tombol Edit, Reindex, Hapus: Khusus role Admin */}
                      {isAdmin && (
                        <>
                          <button 
                            className="btn-feedback"
                            onClick={() => setEditingDoc(doc)}
                            title="Edit Metadata Dokumen"
                          >
                            <FileEdit size={13} />
                            Edit
                          </button>

                          <button 
                            className="btn-feedback"
                            disabled={reindexingId === doc.id}
                            onClick={() => handleReindex(doc.id, doc.title)}
                            title="Indeks Ulang Vektor Dokumen"
                          >
                            <RefreshCw size={13} className={reindexingId === doc.id ? 'animate-spin' : ''} />
                            Reindex
                          </button>

                          <button 
                            className="btn-feedback"
                            onClick={() => setDeletingDoc(doc)}
                            title="Hapus Dokumen Secara Permanen"
                            style={{ color: '#dc2626' }}
                          >
                            <Trash2 size={13} />
                            Hapus
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '2.5rem' }}>
                  Tidak ada dokumen yang sesuai dengan kata kunci pencarian.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Edit Dokumen (Admin) */}
      {editingDoc && (
        <DocumentEditModal
          isOpen={!!editingDoc}
          document={editingDoc}
          onClose={() => setEditingDoc(null)}
          onSaved={fetchDocuments}
          onShowToast={onShowToast}
        />
      )}

      {/* Modal Hapus Dokumen (Admin) */}
      {deletingDoc && (
        <DocumentDeleteModal
          isOpen={!!deletingDoc}
          document={deletingDoc}
          onClose={() => setDeletingDoc(null)}
          onDeleted={fetchDocuments}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
}
