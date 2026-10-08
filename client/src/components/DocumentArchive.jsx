import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
  RefreshCw, 
  Search, 
  Eye, 
  CheckCircle, 
  FolderOpen, 
  FileEdit, 
  Trash2,
  BookOpen,
  Target,
  Workflow,
  Users,
  FileCheck2,
  X,
  Layers
} from 'lucide-react';
import DocumentEditModal from './DocumentEditModal';
import DocumentDeleteModal from './DocumentDeleteModal';

const CATEGORIES = [
  { id: 'all', name: 'Semua Dokumen', icon: FolderOpen, desc: 'Seluruh koleksi dokumen kebijakan, manual, standar, SOP, dan pedoman SPMI STIKOM Yos Sudarso' },
  { id: '1', name: 'Kebijakan SPMI', icon: FileText, desc: 'Dokumen arah kebijakan pokok penjaminan mutu, Statuta, dan Rencana Strategis (Renstra)' },
  { id: '2', name: 'Manual Mutu', icon: BookOpen, desc: 'Pedoman tata kelola dan implementasi siklus PPEPP penjaminan mutu internal' },
  { id: '3', name: 'Standar SPMI', icon: Target, desc: 'Tolak ukur dan kriteria mutu pembelajaran, penelitian, pengabdian masyarakat, dan tata kelola' },
  { id: '4', name: 'SOP (Prosedur)', icon: Workflow, desc: 'Standar Operasional Prosedur teknis pelaksanaan kegiatan akademik dan administratif' },
  { id: '5', name: 'Pedoman SDM & Akademik', icon: Users, desc: 'Pedoman kode etik, kualifikasi dosen/tendik, kenaikan jabatan, dan tata tertib' },
  { id: '6', name: 'Formulir & Instrumen', icon: FileCheck2, desc: 'Instrumen evaluasi, borang audit mutu internal (AMI), dan verifikasi mutu' }
];

export default function DocumentArchive({ onOpenViewer, onShowToast, userRole }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
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

  // Hitung jumlah dokumen per kategori secara dinamis
  const categoryCounts = useMemo(() => {
    const counts = { all: documents.length };
    CATEGORIES.forEach(cat => {
      if (cat.id !== 'all') {
        counts[cat.id] = documents.filter(doc => String(doc.category_id) === String(cat.id)).length;
      }
    });
    return counts;
  }, [documents]);

  // Filter dokumen berdasarkan Tab Kategori aktif dan Search Bar
  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      const matchesCategory = activeCategory === 'all' || String(doc.category_id) === String(activeCategory);
      const matchesSearch = !searchFilter.trim() || 
        doc.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
        (doc.doc_number && doc.doc_number.toLowerCase().includes(searchFilter.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [documents, activeCategory, searchFilter]);

  const activeCategoryObj = CATEGORIES.find(c => c.id === activeCategory) || CATEGORIES[0];
  const ActiveIcon = activeCategoryObj.icon;
  const isAdmin = userRole === 'admin';

  return (
    <div>
      {/* Header Block */}
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

      {/* Category Pill Tabs */}
      <div className="category-tabs-container">
        {CATEGORIES.map(cat => {
          const IconComp = cat.icon;
          const count = categoryCounts[cat.id] || 0;
          const isActive = activeCategory === cat.id;

          return (
            <button
              key={cat.id}
              className={`category-tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              <IconComp size={15} />
              <span>{cat.name}</span>
              <span className="category-tab-count">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Contextual Category Info Banner */}
      <div className="category-banner-info">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <ActiveIcon size={17} style={{ flexShrink: 0 }} />
          <span>
            <strong>{activeCategoryObj.name}:</strong> {activeCategoryObj.desc}
          </span>
        </div>
        <div style={{ fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
          {filteredDocs.length} dari {documents.length} Dokumen
        </div>
      </div>

      {/* Search Bar & Stats */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '440px' }}>
          <Search 
            size={16} 
            color="var(--text-subtle)" 
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} 
          />
          <input 
            type="text" 
            className="catalog-search-input"
            style={{ width: '100%', paddingLeft: '2.3rem', paddingRight: searchFilter ? '2.3rem' : '0.8rem' }}
            placeholder={activeCategory === 'all' ? "Cari judul atau nomor dokumen..." : `Cari di ${activeCategoryObj.name}...`}
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
          />
          {searchFilter && (
            <button 
              onClick={() => setSearchFilter('')}
              style={{ 
                position: 'absolute', 
                right: 10, 
                top: '50%', 
                transform: 'translateY(-50%)', 
                background: 'transparent', 
                border: 'none', 
                cursor: 'pointer', 
                color: 'var(--text-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px'
              }}
              title="Hapus filter pencarian"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          Menampilkan <strong style={{ color: 'var(--text-main)' }}>{filteredDocs.length}</strong> dokumen
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
                      <FileText size={18} color="var(--primary-purple)" style={{ flexShrink: 0, marginTop: 2 }} />
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
                <td colSpan="6" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <ActiveIcon size={32} color="var(--text-light)" />
                    <span style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                      Tidak ada dokumen yang ditemukan
                    </span>
                    <span style={{ fontSize: '0.82rem' }}>
                      {searchFilter 
                        ? `Tidak ada dokumen yang sesuai dengan kata kunci "${searchFilter}" pada tab ${activeCategoryObj.name}.`
                        : `Belum ada dokumen yang terdaftar dalam kategori ${activeCategoryObj.name}.`}
                    </span>
                  </div>
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
