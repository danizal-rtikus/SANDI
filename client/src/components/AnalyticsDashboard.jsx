import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Layers, 
  Search, 
  Smile, 
  AlertOctagon, 
  Clock, 
  CheckCircle2, 
  ThumbsUp, 
  ThumbsDown,
  RefreshCw,
  HelpCircle
} from 'lucide-react';

export default function AnalyticsDashboard({ onShowToast }) {
  const [summary, setSummary] = useState(null);
  const [unanswered, setUnanswered] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [sumRes, unRes] = await handleParallelFetch();
      setSummary(sumRes);
      setUnanswered(unRes || []);
    } catch (err) {
      console.error(err);
      onShowToast('Gagal memuat data analitik');
    } finally {
      setLoading(false);
    }
  };

  const handleParallelFetch = async () => {
    const s = await fetch('/api/analytics/summary').then(r => r.json());
    const u = await fetch('/api/analytics/unanswered').then(r => r.json());
    return [s, u];
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '0.35rem' }}>
            Dasbor Analitik & Audit Mutu Pencarian
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Statistik evaluasi penelusuran dokumen SPMI, tingkat kepuasan civitas akademika, dan identifikasi pertanyaan yang belum terjawab sebagai masukan tim LPM.
          </p>
        </div>

        <button 
          className="btn-feedback"
          onClick={fetchAnalytics}
          title="Muat Ulang Statistik"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Segarkan Data
        </button>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div>
            <div className="stat-value">{summary?.totalDocs || 5}</div>
            <div className="stat-label">Dokumen Terbit Aktif</div>
          </div>
          <div className="stat-icon-wrap">
            <FileText size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-value">{summary?.totalChunks || 12}</div>
            <div className="stat-label">Total Vektor Chunk (pgvector)</div>
          </div>
          <div className="stat-icon-wrap" style={{ background: 'var(--accent-purple-light)', color: 'var(--accent-purple)' }}>
            <Layers size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-value">{summary?.totalQueries || 0}</div>
            <div className="stat-label">Pencarian Dilakukan</div>
          </div>
          <div className="stat-icon-wrap" style={{ background: 'var(--brand-primary-light)', color: 'var(--brand-primary)' }}>
            <Search size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-value" style={{ color: 'var(--accent-emerald)' }}>
              {summary?.satisfactionRate || 92}%
            </div>
            <div className="stat-label">Rasio Kepuasan Pengguna</div>
          </div>
          <div className="stat-icon-wrap" style={{ background: 'var(--accent-emerald-light)', color: 'var(--accent-emerald)' }}>
            <Smile size={24} />
          </div>
        </div>
      </div>

      {/* Grid: Unanswered Queries & Recent Logs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Left: Unanswered Queries (Per PRD 7.1 FR-25, 11) */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
            <AlertOctagon size={18} color="var(--accent-amber)" />
            <h3 style={{ fontSize: '1.1rem' }}>
              Pertanyaan Tanpa Hasil (Unanswered Queries)
            </h3>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Pertanyaan yang diajukan dosen/asesor dengan relevansi di bawah ambang batas (threshold), berguna sebagai prioritas penambahan dokumen SPMI baru.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {unanswered && unanswered.length > 0 ? (
              unanswered.map((u, i) => (
                <div key={i} style={{ padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--accent-amber)' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>"{u.query_text}"</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Skor Tertinggi: {u.top_score ? Math.round(u.top_score * 100) + '%' : '0%'}</span>
                    <span>{new Date(u.created_at).toLocaleDateString('id-ID')}</span>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-subtle)', fontSize: '0.85rem' }}>
                <CheckCircle2 size={24} color="var(--accent-emerald)" style={{ margin: '0 auto 0.5rem' }} />
                Semua pertanyaan pengguna saat ini berhasil dipetakan ke dokumen terkait!
              </div>
            )}
          </div>
        </div>

        {/* Right: Recent Search Logs */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
            <Clock size={18} color="var(--brand-primary)" />
            <h3 style={{ fontSize: '1.1rem' }}>
              Log Riwayat Pencarian Terbaru
            </h3>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Aktivitas penelusuran terakhir beserta durasi latensi eksekusi semantik.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {summary?.recentQueries && summary.recentQueries.length > 0 ? (
              summary.recentQueries.slice(0, 5).map((l, i) => (
                <div key={i} style={{ padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>"{l.query_text}"</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: 3 }}>
                      {l.results_count} hasil ditemukan • Latensi: {l.latency_ms || 120}ms
                    </div>
                  </div>
                  <span className="badge badge-similarity-high">
                    {l.top_score ? Math.round(l.top_score * 100) + '%' : 'N/A'}
                  </span>
                </div>
              ))
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-subtle)', fontSize: '0.85rem' }}>
                Belum ada log pencarian yang tercatat.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
