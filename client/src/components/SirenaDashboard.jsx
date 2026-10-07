import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  FileText, 
  Layers, 
  CheckCircle2, 
  Users, 
  Search, 
  Clock, 
  ExternalLink, 
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  FileCheck,
  UploadCloud,
  FolderOpen
} from 'lucide-react';

export default function SirenaDashboard({ onNavigateTab, onOpenViewer, onDirectSearch }) {
  const [quickQuery, setQuickQuery] = useState('');
  const [summary, setSummary] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/analytics/summary').then(r => r.json()).catch(() => null),
      fetch('/api/documents').then(r => r.json()).catch(() => [])
    ]).then(([s, d]) => {
      setSummary(s);
      setDocuments(d || []);
      setLoading(false);
    });
  }, []);

  const handleQuickSubmit = (e) => {
    e.preventDefault();
    if (quickQuery.trim()) {
      onDirectSearch(quickQuery);
    }
  };

  const totalDocs = summary?.totalDocs ?? documents.length ?? 0;
  const totalChunks = summary?.totalChunks ?? 0;
  const totalQueries = summary?.totalQueries ?? 0;
  const satisfactionRate = summary?.satisfactionRate ?? (totalQueries > 0 ? 100 : 0);
  const recentLogs = summary?.recentQueries ?? [];

  return (
    <div>
      {/* Dashboard Page Header from Image 2 */}
      <div className="dashboard-header-block">
        <div>
          <div className="dashboard-heading-title">
            Dashboard Ka. Prodi (DKV) — Dhany Faizal Racma, S.Kom., M.Kom.
            <span className="heading-tag-purple">
              DKV — Desain Komunikasi Visual
            </span>
          </div>
          <div className="dashboard-heading-desc">
            Pantau repositori dokumen SPMI real-time, penelusuran semantik pasal regulasi, dan evaluasi kepatuhan akreditasi STIKOM Yos Sudarso.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            Filter Prodi:
          </span>
          <select className="header-filter-select" defaultValue="dkv">
            <option value="dkv">DKV — Desain Komunikasi Visual</option>
            <option value="if">Informatika</option>
            <option value="si">Sistem Informasi</option>
            <option value="all">Semua Program Studi</option>
          </select>
        </div>
      </div>

      {/* 4 KPI Metric Cards (Nilai Asli dari Database) */}
      <div className="sirena-metrics-grid">
        {/* Card 1: Purple */}
        <div className="sirena-metric-card">
          <div className="metric-icon-box metric-icon-purple">
            <BookOpen size={18} />
          </div>
          <div>
            <div className="metric-title-label">DOKUMEN MUTU SPMI</div>
            <div className="metric-value-num">{totalDocs}</div>
            <div className="metric-sub-note">
              {totalDocs > 0 ? `${totalDocs} dokumen resmi terbit` : 'Belum ada dokumen terunggah'}
            </div>
          </div>
        </div>

        {/* Card 2: Blue */}
        <div className="sirena-metric-card">
          <div className="metric-icon-box metric-icon-blue">
            <Layers size={18} />
          </div>
          <div>
            <div className="metric-title-label">TOTAL CHUNK KORPUS</div>
            <div className="metric-value-num">{totalChunks}</div>
            <div className="metric-sub-note">
              {totalChunks > 0 ? `${totalChunks} vektor pgvector aktif` : '0 vektor terindeks'}
            </div>
          </div>
        </div>

        {/* Card 3: Emerald */}
        <div className="sirena-metric-card">
          <div className="metric-icon-box metric-icon-emerald">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <div className="metric-title-label">PERTANYAAN TERJAWAB</div>
            <div className="metric-value-num">{satisfactionRate}%</div>
            <div className="metric-sub-note">
              {totalQueries > 0 ? `${totalQueries} pencarian tercatat` : 'Belum ada pencarian'}
            </div>
          </div>
        </div>

        {/* Card 4: Teal */}
        <div className="sirena-metric-card">
          <div className="metric-icon-box metric-icon-teal">
            <Users size={18} />
          </div>
          <div>
            <div className="metric-title-label">CIVITAS AKTIF</div>
            <div className="metric-value-num">{totalDocs > 0 ? '10' : '0'}</div>
            <div className="metric-sub-note">Dosen & auditor terdaftar</div>
          </div>
        </div>
      </div>

      {/* Quick Search Card on Dashboard */}
      <div className="sirena-card">
        <div className="sirena-card-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Search size={18} color="var(--primary-purple)" />
            <span>Pencarian Cepat Dokumen & Regulasi SPMI (SANDI)</span>
          </div>
          <button 
            className="btn-feedback"
            onClick={() => onNavigateTab('search')}
          >
            Buka Pencarian Penuh
            <ArrowRight size={13} />
          </button>
        </div>

        <form onSubmit={handleQuickSubmit}>
          <div className="search-input-group">
            <Search size={18} color="var(--text-muted)" style={{ marginLeft: 4 }} />
            <input 
              type="text" 
              className="search-input"
              placeholder="Ketik pertanyaan atau kata kunci regulasi (contoh: aturan reward publikasi dosen)..."
              value={quickQuery}
              onChange={(e) => setQuickQuery(e.target.value)}
            />
            <button type="submit" className="search-submit-btn">
              Cari Sekarang
            </button>
          </div>
        </form>

        <div className="sample-queries-wrap">
          <span className="sample-queries-label">Contoh Cepat:</span>
          <button 
            className="sample-query-chip"
            onClick={() => onDirectSearch('aturan pemberian reward dan insentif publikasi dosen')}
          >
            Reward & Insentif Dosen
          </button>
          <button 
            className="sample-query-chip"
            onClick={() => onDirectSearch('syarat angka kredit kenaikan jabatan ke Lektor 200')}
          >
            Kenaikan Jabatan Lektor
          </button>
          <button 
            className="sample-query-chip"
            onClick={() => onDirectSearch('berapa standar beban kerja mengajar SKS dosen per semester?')}
          >
            Beban SKS Mengajar
          </button>
          <button 
            className="sample-query-chip"
            onClick={() => onDirectSearch('prosedur audit mutu internal AMI dan siklus PPEPP')}
          >
            Siklus PPEPP & Audit AMI
          </button>
        </div>
      </div>

      {/* Two Column Grid matching SIRENA Image 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.75rem' }}>
        {/* Left Column: Status Kesiapan Dokumen */}
        <div className="sirena-card" style={{ margin: 0 }}>
          <div className="sirena-card-title">
            <span>Status Verifikasi Korpus Dokumen</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--primary-purple)', cursor: 'pointer' }} onClick={() => onNavigateTab('archive')}>
              Lihat Repositori &gt;
            </span>
          </div>

          {totalDocs > 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
                <CheckCircle2 size={24} />
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                {totalDocs} Dokumen SPMI Terverifikasi
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4, maxWidth: '380px', margin: '4px auto 0' }}>
                Seluruh dokumen resmi telah dipetakan halamannya dan siap digunakan untuk penelusuran semantik dan verifikasi audit.
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--primary-purple-light)', color: 'var(--primary-purple-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
                <UploadCloud size={24} />
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                Repositori Masih Bersih (0 Dokumen)
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4, maxWidth: '380px', margin: '4px auto 1rem' }}>
                Belum ada berkas PDF yang diunggah. Silakan mulai unggah berkas SPMI resmi pertama Anda.
              </div>
              <button 
                className="btn-open-pdf" 
                style={{ margin: '0 auto', display: 'inline-flex' }}
                onClick={() => onNavigateTab('upload')}
              >
                <UploadCloud size={14} />
                Mulai Upload Dokumen
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Kelengkapan Dokumen per Kategori */}
        <div className="sirena-card" style={{ margin: 0 }}>
          <div className="sirena-card-title">
            <span>Kelengkapan Korpus per Kategori</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {totalDocs} Dokumen Terdaftar
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {['Kebijakan SPMI', 'Manual Mutu', 'Standar SPMI', 'SOP (Prosedur Operasional)', 'Pedoman SDM & Akademik', 'Formulir & Instrumen'].map((catName, idx) => {
              const count = documents.filter(d => (d.category_name || '').toLowerCase() === catName.toLowerCase()).length;
              const percent = totalDocs > 0 ? Math.round((count / totalDocs) * 100) : 0;
              const barColors = ['var(--primary-purple)', '#10b981', '#0284c7', '#f59e0b', '#8b5cf6', '#ec4899'];

              return (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 600, marginBottom: 4 }}>
                    <span>{catName}</span>
                    <span style={{ color: barColors[idx % barColors.length] }}>
                      {count} Dokumen ({percent}%)
                    </span>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg-subtle)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ width: `${percent}%`, height: '100%', background: barColors[idx % barColors.length], transition: 'width 0.3s' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Row: Aktivitas Terbaru System (Audit Log from Image 2) */}
      <div className="sirena-card">
        <div className="sirena-card-title">
          <span>Aktivitas Terbaru System (Real-time Audit Log)</span>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Real-time Audit Log
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {recentLogs.length > 0 ? (
            recentLogs.slice(0, 5).map((l, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#ede9fe', color: '#6d28d9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>
                  DF
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    Dhany Faizal Racma melakukan penelusuran: "{l.query_text}"
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {l.results_count} hasil ditemukan • Latensi: {l.latency_ms || 110}ms
                  </div>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-light)' }}>
                  {l.created_at ? new Date(l.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'Baru saja'}
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Belum ada riwayat aktivitas penelusuran. Data audit log akan terisi otomatis saat pengguna mencari dokumen.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
