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
  Loader2,
  Scale,
  FileSearch,
  ChevronDown,
  ChevronUp
} from 'lucide-react';



export const highlightQuery = (text, query) => {
  if (!query || !text) return text;
  const rawWords = query.trim().toLowerCase().match(/\b[a-z0-9_-]+\b/g) || [];
  const STOPWORDS = new Set([
    'yang', 'di', 'ke', 'dari', 'pada', 'dalam', 'untuk', 'dengan', 'dan', 'atau',
    'ini', 'itu', 'adalah', 'yaitu', 'ada', 'bisa', 'dapat', 'akan', 'telah', 'sudah'
  ]);
  const words = rawWords.filter(w => w.length > 2 && !STOPWORDS.has(w));
  if (words.length === 0) return text;

  try {
    const escaped = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    // Batas kata utuh \b mencegah kesalahan sorot parsial seperti per-aturan atau de-skripsi
    const regex = new RegExp(`\\b(${escaped})\\b`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => 
      regex.test(part) ? (
        <mark key={i} style={{ background: '#fef08a', color: '#1e293b', padding: '0 2px', borderRadius: '3px', fontWeight: 600 }}>
          {part}
        </mark>
      ) : part
    );
  } catch (e) {
    return text;
  }
};

export const renderStructuredAnswer = (rawText, isStreaming = false) => {
  if (!rawText && !isStreaming) return null;

  // Split by markdown h3 sections (### Section)
  const sections = (rawText || '').split(/(?=###\s+)/g).filter(Boolean);

  if (sections.length === 0 && isStreaming) {
    return (
      <div className="rag-structured-body">
        <div className="rag-section-card">
          <div className="rag-section-content">
            <p className="rag-paragraph" style={{ color: 'var(--text-muted)' }}>
              Menghubungkan ke SumoPod AI... <span className="rag-cursor-blink">▍</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rag-structured-body">
      {sections.map((sec, idx) => {
        const isLastSection = idx === sections.length - 1;
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
                const isLastLine = isLastSection && lIdx === contentLines.length - 1;
                const trimmed = line.trim();
                if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                  return (
                    <div key={lIdx} className="rag-bullet-item">
                      <span className="rag-bullet-dot">•</span>
                      <span>
                        {trimmed.substring(2)}
                        {isLastLine && isStreaming && <span className="rag-cursor-blink">▍</span>}
                      </span>
                    </div>
                  );
                }
                if (trimmed.startsWith('> ')) {
                  return (
                    <blockquote key={lIdx} className="rag-blockquote">
                      {trimmed.substring(2)}
                      {isLastLine && isStreaming && <span className="rag-cursor-blink">▍</span>}
                    </blockquote>
                  );
                }
                return (
                  <p key={lIdx} className="rag-paragraph">
                    {trimmed}
                    {isLastLine && isStreaming && <span className="rag-cursor-blink">▍</span>}
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
  const [showThinking, setShowThinking] = useState(true);
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

      // Panggil generasi jawaban RAG streaming jika ada hasil
      if (data.results && data.results.length > 0) {
        setIsSynthesizing(true);
        setRagAnswer({
          query: activeQuery,
          answer: '',
          thinking: '',
          citations: data.results.slice(0, 5).map(r => ({
            documentId: r.documentId,
            documentTitle: r.documentTitle,
            pageNumber: r.pageNumber,
            snippet: r.snippet
          })),
          isStreaming: true,
          isThinking: true
        });

        try {
          const streamRes = await fetch('/api/answer/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: activeQuery,
              results: data.results
            })
          });

          if (!streamRes.ok || !streamRes.body) {
            throw new Error('Streaming tidak didukung, menggunakan fallback');
          }

          const reader = streamRes.body.getReader();
          const decoder = new TextDecoder('utf-8');
          let accumulatedAnswer = '';
          let accumulatedThinking = '';
          let currentCitations = [];
          let textBuffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            textBuffer += decoder.decode(value, { stream: true });
            const lines = textBuffer.split('\n');
            textBuffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith('data: ')) continue;
              const jsonStr = trimmed.slice(6);
              try {
                const parsed = JSON.parse(jsonStr);
                if (parsed.type === 'citations') {
                  currentCitations = parsed.citations || [];
                  setRagAnswer(prev => ({
                    ...(prev || {}),
                    query: activeQuery,
                    citations: currentCitations
                  }));
                } else if (parsed.type === 'thinking') {
                  accumulatedThinking += parsed.token;
                  setRagAnswer(prev => ({
                    ...(prev || {}),
                    query: activeQuery,
                    thinking: accumulatedThinking,
                    citations: currentCitations.length > 0 ? currentCitations : (prev?.citations || []),
                    isThinking: true,
                    isStreaming: true
                  }));
                } else if (parsed.type === 'token') {
                  accumulatedAnswer += parsed.token;
                  setRagAnswer(prev => ({
                    ...(prev || {}),
                    query: activeQuery,
                    answer: accumulatedAnswer,
                    thinking: accumulatedThinking,
                    citations: currentCitations.length > 0 ? currentCitations : (prev?.citations || []),
                    isThinking: false,
                    isStreaming: true
                  }));
                } else if (parsed.type === 'done') {
                  accumulatedAnswer = parsed.answer || accumulatedAnswer;
                  setRagAnswer(prev => ({
                    ...(prev || {}),
                    query: activeQuery,
                    answer: accumulatedAnswer,
                    thinking: parsed.thinking || accumulatedThinking,
                    citations: parsed.citations || currentCitations || (prev?.citations || []),
                    isThinking: false,
                    isStreaming: false
                  }));
                }
              } catch (parseErr) {
                // Abaikan potongan JSON parsial
              }
            }
          }
        } catch (streamErr) {
          console.warn('Streaming error, fallback ke endpoint statis /api/answer:', streamErr);
          try {
            const fallbackRes = await fetch('/api/answer', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                query: activeQuery,
                results: data.results
              })
            });
            const ansData = await fallbackRes.json();
            setRagAnswer(ansData);
          } catch (fbErr) {
            console.error('Error in static answer fallback:', fbErr);
          }
        } finally {
          setIsSynthesizing(false);
          setRagAnswer(prev => (prev ? { ...prev, isStreaming: false, isThinking: false } : null));
        }
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

      {/* RAG Answer Box Pro - Langsung Muncul Dinamis (Tanpa Skeleton Lama) */}
      {(ragAnswer || isSynthesizing) && (
        <div className="rag-answer-box-pro">
          <div className="rag-header-pro">
            <div className="rag-header-left">
              <div className="rag-title-badge-pro">
                <BookOpenCheck size={19} />
                <span>Hasil Telaah Regulasi & Dokumen SPMI</span>
                {ragAnswer?.isThinking && (
                  <span className="rag-streaming-pulse">
                    <Scale size={13} /> Menelaah naskah...
                  </span>
                )}
                {ragAnswer?.isStreaming && !ragAnswer?.isThinking && (
                  <span className="rag-streaming-pulse">
                    <span className="pulse-dot"></span> Menyusun laporan...
                  </span>
                )}
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
              disabled={ragAnswer?.isStreaming || isSynthesizing}
            >
              {copiedAnswer ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
              <span>{copiedAnswer ? 'Tersalin!' : 'Salin Telaah'}</span>
            </button>
          </div>

          {/* Catatan Penelaahan Regulasi SPMI (DeepSeek Reasoner) */}
          {ragAnswer?.thinking && (
            <div className="rag-thinking-card">
              <button 
                type="button" 
                className="rag-thinking-header" 
                onClick={() => setShowThinking(!showThinking)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Scale size={14} color="#7c3aed" />
                  <span className="rag-thinking-title">
                    {ragAnswer.isThinking ? 'Catatan Penelaahan Regulasi & Landasan Hukum (Sedang berjalan...)' : 'Catatan Penelaahan Regulasi SPMI (Selesai)'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  <span>{showThinking ? 'Sembunyikan' : 'Buka catatan telaah'}</span>
                  {showThinking ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </button>
              {showThinking && (
                <div className="rag-thinking-body">
                  {ragAnswer.thinking}
                  {ragAnswer.isThinking && <span className="rag-cursor-blink">▍</span>}
                </div>
              )}
            </div>
          )}

          {/* Content Body */}
          <div className="rag-content-pro">
            {ragAnswer?.answer ? (
              renderStructuredAnswer(ragAnswer.answer, ragAnswer.isStreaming)
            ) : (
              <div className="rag-synthesizing-loader">
                <Loader2 size={16} className="spin-slow" color="#7c3aed" />
                <span>Membedah pasal & menyusun ketetapan resmi...</span>
                <span className="rag-cursor-blink">▍</span>
              </div>
            )}
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
