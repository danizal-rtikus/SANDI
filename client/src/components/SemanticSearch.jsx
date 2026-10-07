import React, { useState } from 'react';
import { 
  Search, 
  BookOpenCheck,
  ShieldCheck, 
  FileText, 
  ExternalLink, 
  ThumbsUp, 
  ThumbsDown, 
  Bookmark, 
  CheckCircle2, 
  Clock, 
  SlidersHorizontal,
  ChevronRight,
  HelpCircle,
  Copy,
  Check,
  Loader2
} from 'lucide-react';



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

export const renderStructuredAnswer = (rawText) => {
  if (!rawText) return null;

  // Split by markdown h3 sections (### Section)
  const sections = rawText.split(/(?=###\s+)/g);

  return (
    <div className="rag-structured-body">
      {sections.map((sec, idx) => {
        const lines = sec.trim().split('\n').filter(Boolean);
        if (lines.length === 0) return null;
        const firstLine = lines[0].trim();
        const isHeading = firstLine.startsWith('### ');
        const headingTitle = isHeading ? firstLine.replace('### ', '').trim() : null;
        const contentLines = isHeading ? lines.slice(1) : lines;

        return (
          <div key={idx} className="rag-section-card">
            {headingTitle && (
              <div className="rag-section-header">
                <span className="rag-section-tag">{headingTitle}</span>
              </div>
            )}
            <div className="rag-section-content">
              {contentLines.map((line, lIdx) => {
                const trimmed = line.trim();
                if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                  return (
                    <div key={lIdx} className="rag-bullet-item">
                      <span className="rag-bullet-dot">•</span>
                      <span>{trimmed.substring(2)}</span>
                    </div>
                  );
                }
                if (trimmed.startsWith('> ')) {
                  return (
                    <blockquote key={lIdx} className="rag-blockquote">
                      {trimmed.substring(2)}
                    </blockquote>
                  );
                }
                return (
                  <p key={lIdx} className="rag-paragraph">
                    {trimmed}
                  </p>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default function SemanticSearch({ onOpenViewer, onShowToast, initialQuery = '' }) {
  const [query, setQuery] = useState(initialQuery || '');
  const [categoryId, setCategoryId] = useState('');
  const [year, setYear] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [results, setResults] = useState(null);
  const [ragAnswer, setRagAnswer] = useState(null);
  const [searchMeta, setSearchMeta] = useState(null);
  const [feedbackSent, setFeedbackSent] = useState({});
  const [copiedAnswer, setCopiedAnswer] = useState(false);
  const [popularQueries, setPopularQueries] = useState([
    "Apa luas lingkup penjaminan mutu SPMI di STIKOM Yos Sudarso?",
    "Statuta dan landasan hukum yang dirujuk dalam Kebijakan SPMI",
    "Bagaimana prosedur audit mutu internal (AMI) dan siklus PPEPP?"
  ]);

  const handleCopyAnswer = () => {
    if (!ragAnswer?.answer) return;
    navigator.clipboard.writeText(ragAnswer.answer);
    setCopiedAnswer(true);
    onShowToast('Hasil telaah dokumen berhasil disalin ke clipboard');
    setTimeout(() => setCopiedAnswer(false), 2500);
  };

  React.useEffect(() => {
    fetch('/api/suggested-queries')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setPopularQueries(data);
        }
      })
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      setQuery(initialQuery);
      handleSearch(null, initialQuery);
    }
  }, [initialQuery]);

  const handleSearch = async (e, customQuery) => {
    if (e) e.preventDefault();
    const activeQuery = customQuery !== undefined ? customQuery : query;
    if (!activeQuery.trim()) return;

    setLoading(true);
    setRagAnswer(null);
    setIsSynthesizing(false);

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
        setIsSynthesizing(true);
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
          .catch(err => {
            console.error('Error generating answer:', err);
          })
          .finally(() => {
            setIsSynthesizing(false);
          });
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
          <ShieldCheck size={14} />
          SANDI: Navigasi Dokumen Mutu Internal
        </div>
        <h1 className="hero-title">
          Penelusuran Aturan & Dokumen SPMI Presisi
        </h1>
        <p className="hero-desc">
          Ketik pertanyaan Anda terkait ketentuan atau standar mutu kampus. Sistem memetakan secara langsung ke pasal, nomor dokumen resmi, dan nomor halaman naskah asli di lingkungan STIKOM Yos Sudarso.
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
          {popularQueries.map((p, idx) => (
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

      {/* Audit Progress Steps & Skeleton Loader (Opsi B) */}
      {isSynthesizing && !ragAnswer && (
        <div className="rag-skeleton-card">
          <div className="rag-skeleton-header">
            <div className="rag-skeleton-title-wrap">
              <div className="rag-skeleton-badge">
                <Loader2 size={17} className="spin-slow" />
                <span>Menyusun Telaah Dokumen SPMI...</span>
              </div>
              <span className="rag-skeleton-subtitle">
                Sistem sedang membedah klausul regulasi dan merumuskan telaah objektif naskah STIKOM Yos Sudarso
              </span>
            </div>
          </div>

          {/* Audit Progress Steps */}
          <div className="rag-steps-box">
            <div className="rag-step-item done">
              <CheckCircle2 size={15} color="#16a34a" />
              <span>
                Penelusuran {searchMeta?.resultsCount || results?.length || 8} naskah dokumen SPMI selesai ({searchMeta?.latencyMs || 230} ms)
              </span>
            </div>
            <div className="rag-step-item active">
              <Loader2 size={14} className="spin-slow" color="#0284c7" />
              <span>Menelaah pasal resmi & menyintesis ketetapan formal...</span>
            </div>
          </div>

          {/* Skeleton Lines with Shimmer */}
          <div className="rag-skeleton-content">
            <div className="skeleton-section-block">
              <div className="skeleton-badge-line" />
              <div className="skeleton-line skeleton-w-full" />
              <div className="skeleton-line skeleton-w-85" />
            </div>

            <div className="skeleton-section-block">
              <div className="skeleton-badge-line" />
              <div className="skeleton-line skeleton-w-95" />
              <div className="skeleton-line skeleton-w-75" />
              <div className="skeleton-line skeleton-w-80" />
            </div>

            <div className="skeleton-chips-block">
              <div className="skeleton-chip" />
              <div className="skeleton-chip" />
              <div className="skeleton-chip" />
            </div>
          </div>
        </div>
      )}

      {/* RAG Answer Summary Card (FR-30, FR-31) */}
      {ragAnswer && (
        <div className="rag-answer-box-pro">
          <div className="rag-header-pro">
            <div className="rag-header-left">
              <div className="rag-title-badge-pro">
                <BookOpenCheck size={19} />
                <span>Hasil Telaah Regulasi & Dokumen SPMI</span>
              </div>
              <span className="rag-subtitle-pro">
                Disintesis secara objektif dan faktual dari naskah resmi STIKOM Yos Sudarso
              </span>
            </div>

            <button 
              type="button"
              className="btn-copy-rag-pro"
              onClick={handleCopyAnswer}
              title="Salin hasil telaah ini ke clipboard"
            >
              {copiedAnswer ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
              <span>{copiedAnswer ? 'Tersalin!' : 'Salin Telaah'}</span>
            </button>
          </div>

          <div className="rag-content-pro">
            {renderStructuredAnswer(ragAnswer.answer)}
          </div>

          {ragAnswer.citations && ragAnswer.citations.length > 0 && (
            <div className="rag-citations-box-pro">
              <div className="rag-citations-heading">
                <FileText size={14} />
                <span>Naskah Asli Terverifikasi (Klik untuk membuka lembar PDF):</span>
              </div>
              <div className="rag-citations-chips-wrap">
                {ragAnswer.citations.map((c, i) => {
                  const cleanTitle = (c.documentTitle || '').replace(/^\d+[\s._-]+/, '');
                  return (
                    <button 
                      key={i} 
                      className="citation-chip-pro"
                      onClick={() => onOpenViewer(c.documentId, c.pageNumber, query, cleanTitle, c.snippet)}
                      title={`Buka ${cleanTitle} tepat pada Halaman ${c.pageNumber}`}
                    >
                      <span className="citation-chip-title">{cleanTitle}</span>
                      <span className="citation-chip-divider">•</span>
                      <span className="citation-chip-page">Hlm. {c.pageNumber}</span>
                      <ChevronRight size={13} className="citation-chip-arrow" />
                    </button>
                  );
                })}
              </div>
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
