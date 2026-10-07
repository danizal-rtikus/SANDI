import React, { useState } from 'react';
import { 
  Search, 
  Sparkles, 
  FileText, 
  ExternalLink, 
  ThumbsUp, 
  ThumbsDown, 
  Bookmark, 
  CheckCircle2, 
  Clock, 
  SlidersHorizontal,
  ChevronRight,
  HelpCircle
} from 'lucide-react';

const samplePrompts = [
  "aturan pemberian reward dan insentif publikasi dosen",
  "syarat angka kredit kenaikan jabatan ke Lektor 200",
  "berapa standar beban kerja mengajar SKS dosen per semester?",
  "prosedur audit mutu internal AMI dan siklus PPEPP",
  "tugas pokok dan wewenang Lembaga Penjaminan Mutu (LPM)"
];

export const highlightQuery = (text, query) => {
  if (!query || !text) return text;
  const words = query.trim().split(/\s+/).filter(w => w.length > 2);
  if (words.length === 0) return text;

  try {
    const regex = new RegExp(`(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => 
      regex.test(part) ? (
        <mark key={i} style={{ background: '#fef08a', color: '#1e293b', padding: '0 2px', borderRadius: '3px' }}>
          {part}
        </mark>
      ) : part
    );
  } catch (e) {
    return text;
  }
};

export default function SemanticSearch({ onOpenViewer, onShowToast }) {
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [year, setYear] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [ragAnswer, setRagAnswer] = useState(null);
  const [searchMeta, setSearchMeta] = useState(null);
  const [feedbackSent, setFeedbackSent] = useState({});

  const handleSearch = async (e, customQuery) => {
    if (e) e.preventDefault();
    const activeQuery = customQuery !== undefined ? customQuery : query;
    if (!activeQuery.trim()) return;

    setLoading(true);
    setRagAnswer(null);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: activeQuery,
          filters: {
            categoryId: categoryId ? Number(categoryId) : null,
            year: year ? Number(year) : null
          },
          topK: 8
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Pencarian gagal');

      setResults(data.results || []);
      setSearchMeta({
        searchId: data.searchId,
        latencyMs: data.latencyMs,
        resultsCount: data.resultsCount,
        answered: data.answered
      });

      // Panggil generasi jawaban RAG jika ada hasil
      if (data.results && data.results.length > 0) {
        fetch('/api/answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: activeQuery,
            results: data.results
          })
        })
          .then(r => r.json())
          .then(ansData => {
            setRagAnswer(ansData);
          })
          .catch(console.error);
      }
    } catch (err) {
      console.error(err);
      onShowToast(`Kesalahan: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (searchLogId, chunkId, isHelpful) => {
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchLogId,
          chunkId,
          isHelpful
        })
      });
      setFeedbackSent(prev => ({ ...prev, [chunkId]: isHelpful ? 'yes' : 'no' }));
      onShowToast(isHelpful ? 'Terima kasih atas umpan balik positif Anda!' : 'Umpan balik dicatat untuk penyempurnaan dokumen.');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div>
      {/* Hero Welcome Banner */}
      <div className="hero-banner">
        <div className="hero-badge">
          <Sparkles size={14} />
          Pencarian Berbasis Makna & Pemahaman Konteks (RAG)
        </div>
        <h1 className="hero-title">
          Temukan Aturan & Dokumen SPMI Secara Presisi
        </h1>
        <p className="hero-desc">
          Ketik pertanyaan Anda dengan bahasa alami sehari-hari. SANDI akan memahami maksud Anda, memetakan ke pasal & halaman yang tepat, serta memberikan rujukan nomor dokumen SPMI STIKOM Yos Sudarso.
        </p>
      </div>

      {/* Search Input Box */}
      <div className="search-card-container">
        <form onSubmit={handleSearch}>
          <div className="search-input-group">
            <Search size={22} color="var(--brand-primary)" style={{ marginLeft: 6 }} />
            <input 
              type="text"
              className="search-input"
              placeholder="Contoh: kalau dalam pemberian reward dosen berprestasi itu diatur dimana?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button 
              type="submit" 
              className="search-submit-btn" 
              disabled={loading || !query.trim()}
            >
              {loading ? (
                <>Menganalisis Dokumen...</>
              ) : (
                <>
                  <Search size={18} />
                  Cari Dokumen
                </>
              )}
            </button>
          </div>
        </form>

        {/* Suggestion Prompt Chips */}
        <div className="sample-queries-wrap">
          <span className="sample-queries-label">Pertanyaan Populer:</span>
          {samplePrompts.map((p, idx) => (
            <button 
              key={idx} 
              className="sample-query-chip"
              onClick={() => {
                setQuery(p);
                handleSearch(null, p);
              }}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Filters Bar */}
        <div className="search-filters-bar">
          <div className="filters-group">
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Filter Pencarian:
            </span>
            <select 
              className="filter-select"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Semua Kategori Dokumen</option>
              <option value="1">Kebijakan SPMI</option>
              <option value="2">Manual Mutu</option>
              <option value="3">Standar SPMI</option>
              <option value="4">SOP (Prosedur Operasional)</option>
              <option value="5">Pedoman SDM & Akademik</option>
              <option value="6">Formulir & Instrumen</option>
            </select>

            <select 
              className="filter-select"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            >
              <option value="">Semua Tahun</option>
              <option value="2024">Tahun 2024</option>
              <option value="2023">Tahun 2023</option>
              <option value="2022">Tahun 2022</option>
            </select>
          </div>

          {searchMeta && (
            <div className="results-latency">
              <Clock size={13} style={{ display: 'inline', marginRight: 4 }} />
              Waktu retrieval: <strong>{searchMeta.latencyMs} ms</strong>
            </div>
          )}
        </div>
      </div>

      {/* RAG Answer Summary Card (FR-30, FR-31) */}
      {ragAnswer && (
        <div className="rag-answer-box">
          <div className="rag-header">
            <div className="rag-title-badge">
              <Sparkles size={18} />
              Ringkasan Cerdas RAG (STIKOM Yos Sudarso SPMI)
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Didukung oleh AI retrieval-grounded
            </span>
          </div>

          <div className="rag-content">
            {ragAnswer.answer}
          </div>

          {ragAnswer.citations && ragAnswer.citations.length > 0 && (
            <div className="rag-citations-list">
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                Sitasi Terkait:
              </span>
              {ragAnswer.citations.map((c, i) => (
                <button 
                  key={i} 
                  className="citation-chip"
                  onClick={() => onOpenViewer(c.documentId, c.pageNumber, query, c.documentTitle, c.snippet)}
                  title="Klik untuk membuka PDF tepat pada halaman ini"
                >
                  <FileText size={13} color="var(--brand-primary)" />
                  [{c.documentTitle}, hlm. {c.pageNumber}]
                  <ChevronRight size={13} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Results Header */}
      {results && (
        <div className="results-header-info">
          <div className="results-count-title">
            Hasil Temuan Dokumen ({results.length})
          </div>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Diurutkan berdasarkan skor kemiripan semantik tertinggi
          </span>
        </div>
      )}

      {/* Results List */}
      {results && results.length > 0 ? (
        <div className="results-list">
          {results.map((r) => {
            const isHelpful = feedbackSent[r.chunkId];
            const similarityPercent = Math.round(r.similarity * 100);

            return (
              <div key={r.chunkId} className="result-card">
                <div className="result-card-header">
                  <div className="result-doc-info">
                    <h3 className="result-doc-title">{r.documentTitle}</h3>
                    <div className="result-meta-badges">
                      <span className="badge badge-category">
                        {r.category}
                      </span>
                      <span className="badge badge-page">
                        Halaman {r.pageNumber}
                      </span>
                      <span className={`badge ${similarityPercent >= 70 ? 'badge-similarity-high' : 'badge-similarity-med'}`}>
                        {similarityPercent}% Relevansi
                      </span>
                    </div>
                  </div>

                  <button 
                    className="btn-open-pdf"
                    onClick={() => onOpenViewer(r.documentId, r.pageNumber, query, r.documentTitle, r.snippet)}
                    title="Buka PDF langsung ke halaman ini"
                  >
                    <ExternalLink size={15} />
                    Buka PDF (hlm. {r.pageNumber})
                  </button>
                </div>

                {r.sectionTitle && (
                  <div className="result-section-title">
                    <Bookmark size={14} />
                    {r.sectionTitle}
                  </div>
                )}

                <div className="result-snippet">
                  {highlightQuery(r.snippet, query)}
                </div>

                <div className="result-card-footer">
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Terverifikasi dalam Arsip SPMI Institusi
                  </span>

                  <div className="feedback-actions">
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: 4 }}>
                      Apakah hasil ini relevan?
                    </span>
                    <button 
                      className={`btn-feedback ${isHelpful === 'yes' ? 'active-yes' : ''}`}
                      onClick={() => handleFeedback(searchMeta?.searchId, r.chunkId, true)}
                      title="Hasil sangat membantu"
                    >
                      <ThumbsUp size={13} />
                      Ya
                    </button>
                    <button 
                      className={`btn-feedback ${isHelpful === 'no' ? 'active-no' : ''}`}
                      onClick={() => handleFeedback(searchMeta?.searchId, r.chunkId, false)}
                      title="Kurang relevan"
                    >
                      <ThumbsDown size={13} />
                      Kurang
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : results && results.length === 0 ? (
        <div className="empty-state-card">
          <HelpCircle className="empty-icon" />
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>
            Informasi Tidak Ditemukan
          </h3>
          <p style={{ maxWidth: '500px', margin: '0 auto', fontSize: '0.9rem' }}>
            Tidak ada dokumen SPMI yang cocok dengan pertanyaan ini di atas ambang batas kemiripan. Pertanyaan ini telah dicatat ke dasbor analitik untuk dilengkapi oleh tim penjaminan mutu.
          </p>
        </div>
      ) : null}
    </div>
  );
}
