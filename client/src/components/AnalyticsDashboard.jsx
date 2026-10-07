import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Layers, 
  Search, 
  Smile, 
  AlertOctagon, 
  Clock, 
  CheckCircle2, 
  RefreshCw,
  HelpCircle,
  ShieldCheck,
  TrendingUp,
  BarChart2
} from 'lucide-react';

export default function AnalyticsDashboard({ onShowToast }) {
  const [summary, setSummary] = useState(null);
  const [unanswered, setUnanswered] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [s, u] = await Promise.all([
        fetch('/api/analytics/summary').then(r => r.json()),
        fetch('/api/analytics/unanswered').then(r => r.json())
      ]);
      setSummary(s);
      setUnanswered(u || []);
    } catch (err) {
      console.error(err);
      if (onShowToast) onShowToast('Gagal memuat data analitik');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return (
    <div>
      {/* Header Block matching SIRENA Image 2 */}
      <div className="dashboard-header-block">
        <div>
          <div className="dashboard-heading-title">
            Dasbor Analitik & Audit Mutu Pencarian
            <span className="heading-tag-purple">
              LPM — Penjaminan Mutu Internal
            </span>
          </div>
          <div className="dashboard-heading-desc">
            Statistik evaluasi penelusuran dokumen SPMI, tingkat kepuasan civitas akademika, dan identifikasi pertanyaan yang belum terjawab sebagai masukan tim LPM.
          </div>
        </div>

        <button 
          className="btn-feedback"
          onClick={fetchAnalytics}
          title="Segarkan Data Analitik"
          style={{ padding: '0.5rem 0.85rem' }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Segarkan Data
        </button>
      </div>

      {/* 4 KPI Metric Cards in SIRENA Style */}
      <div className="sirena-metrics-grid">
        {/* Card 1: Purple */}
        <div className="sirena-metric-card">
          <div className="metric-icon-box metric-icon-purple">
            <FileText size={18} />
          </div>
          <div>
            <div className="metric-title-label">DOKUMEN TERBIT AKTIF</div>
            <div className="metric-value-num">{summary?.totalDocs ?? 5}</div>
            <div className="metric-sub-note">Dokumen resmi tervalidasi</div>
          </div>
        </div>

        {/* Card 2: Blue */}
        <div className="sirena-metric-card">
          <div className="metric-icon-box metric-icon-blue">
            <Layers size={18} />
          </div>
          <div>
            <div className="metric-title-label">TOTAL CHUNK KORPUS</div>
            <div className="metric-value-num">{summary?.totalChunks ?? 9}</div>
            <div className="metric-sub-note">pgvector HNSW terindeks</div>
          </div>
        </div>

        {/* Card 3: Emerald */}
        <div className="sirena-metric-card">
          <div className="metric-icon-box metric-icon-emerald">
            <Search size={18} />
          </div>
          <div>
            <div className="metric-title-label">PENCARIAN DILAKUKAN</div>
            <div className="metric-value-num">{summary?.totalQueries ?? 4}</div>
            <div className="metric-sub-note">Kueri dosen & asesor</div>
          </div>
        </div>

        {/* Card 4: Teal */}
        <div className="sirena-metric-card">
          <div className="metric-icon-box metric-icon-teal">
            <TrendingUp size={18} />
          </div>
          <div>
            <div className="metric-title-label">RASIO KEPUASAN PENGGUNA</div>
            <div className="metric-value-num" style={{ color: '#059669' }}>
              {summary?.satisfactionRate ?? 100}%
            </div>
            <div className="metric-sub-note">Umpan balik positif tercatat</div>
          </div>
        </div>
      </div>

      {/* Two Column Grid matching SIRENA Image 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.75rem' }}>
        {/* Left Column: Pertanyaan Tanpa Hasil */}
        <div className="sirena-card" style={{ margin: 0 }}>
          <div className="sirena-card-title">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertOctagon size={18} color="var(--accent-amber)" />
              <span>Pertanyaan Tanpa Hasil (Unanswered Queries)</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {unanswered.length} Masukan Tim Mutu
            </span>
          </div>

          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
            Pertanyaan yang diajukan dosen/asesor dengan relevansi di bawah ambang batas (*threshold*), berguna sebagai prioritas penyusunan/pelengkap dokumen SPMI baru.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {unanswered && unanswered.length > 0 ? (
              unanswered.map((u, i) => (
                <div key={i} style={{ padding: '0.85rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--accent-amber)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                      "{u.query_text}"
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 3 }}>
                      Skor tertinggi: {u.top_score ? Math.round(u.top_score * 100) + '%' : '0%'}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-light)', fontWeight: 600 }}>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('id-ID') : '-'}
                  </span>
                </div>
              ))
            ) : (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <CheckCircle2 size={28} color="#16a34a" style={{ margin: '0 auto 0.5rem' }} />
                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Semua Pertanyaan Terjawab</div>
                <div style={{ fontSize: '0.75rem', marginTop: 2 }}>Belum ada pertanyaan tanpa hasil yang tercatat.</div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Log Riwayat Pencarian Terbaru */}
        <div className="sirena-card" style={{ margin: 0 }}>
          <div className="sirena-card-title">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={18} color="var(--primary-purple)" />
              <span>Log Riwayat Pencarian Terbaru</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Real-time Audit Log
            </span>
          </div>

          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
            Aktivitas penelusuran terakhir beserta durasi latensi eksekusi semantik pgvector.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {summary?.recentQueries && summary.recentQueries.length > 0 ? (
              summary.recentQueries.slice(0, 5).map((l, i) => (
                <div key={i} style={{ padding: '0.85rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ maxWidth: '75%' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      "{l.query_text}"
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 3 }}>
                      {l.results_count} hasil ditemukan • Latensi: {l.latency_ms || 120}ms
                    </div>
                  </div>
                  <span className={`badge ${l.answered ? 'badge-similarity-high' : 'badge-category'}`}>
                    {l.top_score ? Math.round(l.top_score * 100) + '%' : (l.answered ? '88%' : 'N/A')}
                  </span>
                </div>
              ))
            ) : (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Belum ada aktivitas pencarian yang tercatat.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
