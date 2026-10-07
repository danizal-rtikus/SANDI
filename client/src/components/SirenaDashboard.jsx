import React, { useState } from 'react';
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
  FileCheck
} from 'lucide-react';

export default function SirenaDashboard({ onNavigateTab, onOpenViewer, onDirectSearch }) {
  const [quickQuery, setQuickQuery] = useState('');

  const handleQuickSubmit = (e) => {
    e.preventDefault();
    if (quickQuery.trim()) {
      onDirectSearch(quickQuery);
    }
  };

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

      {/* 4 KPI Metric Cards from Image 2 */}
      <div className="sirena-metrics-grid">
        {/* Card 1: Purple */}
        <div className="sirena-metric-card">
          <div className="metric-icon-box metric-icon-purple">
            <BookOpen size={18} />
          </div>
          <div>
            <div className="metric-title-label">DOKUMEN MUTU SPMI</div>
            <div className="metric-value-num">5</div>
            <div className="metric-sub-note">5 dokumen resmi terbit</div>
          </div>
        </div>

        {/* Card 2: Blue */}
        <div className="sirena-metric-card">
          <div className="metric-icon-box metric-icon-blue">
            <Layers size={18} />
          </div>
          <div>
            <div className="metric-title-label">TOTAL CHUNK KORPUS</div>
            <div className="metric-value-num">12</div>
            <div className="metric-sub-note">12 vektor pgvector aktif</div>
          </div>
        </div>

        {/* Card 3: Emerald */}
        <div className="sirena-metric-card">
          <div className="metric-icon-box metric-icon-emerald">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <div className="metric-title-label">PERTANYAAN TERJAWAB</div>
            <div className="metric-value-num">92%</div>
            <div className="metric-sub-note">Tingkat kepuasan dosen & asesor</div>
          </div>
        </div>

        {/* Card 4: Teal */}
        <div className="sirena-metric-card">
          <div className="metric-icon-box metric-icon-teal">
            <Users size={18} />
          </div>
          <div>
            <div className="metric-title-label">CIVITAS AKTIF</div>
            <div className="metric-value-num">10</div>
            <div className="metric-sub-note">Dosen & auditor terdaftar</div>
          </div>
        </div>
      </div>

      {/* Quick Search Card on Dashboard */}
      <div className="sirena-card">
        <div className="sirena-card-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Search size={18} color="var(--primary-purple)" />
            <span>Pencarian Cepat Dokumen & Regulasi SPMI (SIRENA-RAG)</span>
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
              Lihat Semua &gt;
            </span>
          </div>

          <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
              <CheckCircle2 size={24} />
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
              Seluruh Dokumen SPMI Siap Ditelusuri
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4, maxWidth: '380px', margin: '4px auto 0' }}>
              Semua kebijakan, standar mutu, dan pedoman SDM telah dipetakan halamannya dan siap digunakan oleh dosen maupun asesor audit mutu.
            </div>
          </div>
        </div>

        {/* Right Column: Kelengkapan Dokumen per Kategori */}
        <div className="sirena-card" style={{ margin: 0 }}>
          <div className="sirena-card-title">
            <span>Kelengkapan Korpus per Kategori</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Target: 100% Terindeks
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 600, marginBottom: 4 }}>
                <span>Kebijakan SPMI</span>
                <span style={{ color: 'var(--primary-purple)' }}>1 Dokumen (100%)</span>
              </div>
              <div style={{ height: 6, background: 'var(--bg-subtle)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: '100%', height: '100%', background: 'var(--primary-purple)' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 600, marginBottom: 4 }}>
                <span>Manual Mutu (Siklus PPEPP)</span>
                <span style={{ color: '#10b981' }}>1 Dokumen (100%)</span>
              </div>
              <div style={{ height: 6, background: 'var(--bg-subtle)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: '100%', height: '100%', background: '#10b981' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 600, marginBottom: 4 }}>
                <span>Standar SPMI (Pembelajaran OBE)</span>
                <span style={{ color: '#0284c7' }}>1 Dokumen (100%)</span>
              </div>
              <div style={{ height: 6, background: 'var(--bg-subtle)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: '100%', height: '100%', background: '#0284c7' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 600, marginBottom: 4 }}>
                <span>Pedoman SDM & Tata Tertib</span>
                <span style={{ color: '#f59e0b' }}>1 Dokumen (100%)</span>
              </div>
              <div style={{ height: 6, background: 'var(--bg-subtle)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: '100%', height: '100%', background: '#f59e0b' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 600, marginBottom: 4 }}>
                <span>SOP Kenaikan Jabatan Fungsional</span>
                <span style={{ color: 'var(--primary-purple)' }}>1 Dokumen (100%)</span>
              </div>
              <div style={{ height: 6, background: 'var(--bg-subtle)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: '100%', height: '100%', background: 'var(--primary-purple)' }} />
              </div>
            </div>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#ede9fe', color: '#6d28d9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>
              DF
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Dhany Faizal Racma melakukan penelusuran regulasi reward publikasi dosen
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Ditemukan di Buku Pedoman SDM hlm. 14 • Latensi: 110ms
              </div>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-light)' }}>
              Baru saja
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>
              AS
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Asesor Akreditasi meninjau SOP Usulan Kenaikan Jabatan Fungsional Dosen
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Dibuka langsung di Halaman 5 (Verifikasi Berkas Tim PAK)
              </div>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-light)' }}>
              2 jam lalu
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.5rem 0' }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>
              LM
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Lembaga Penjaminan Mutu (LPM) memverifikasi Siklus PPEPP Standar Mutu
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Manual Mutu SPMI 2023 tervalidasi dan aktif
              </div>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-light)' }}>
              Kemarin
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
