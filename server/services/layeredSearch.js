import { cosineSimilarity } from './ai.js';

// ==============================================================================
// Layer 1: Normalisasi Query & Glosarium Akademik Kampus STIKOM Yos Sudarso
// ==============================================================================
export const STOPWORDS = new Set([
  'yang', 'di', 'ke', 'dari', 'pada', 'dalam', 'untuk', 'dengan', 'dan', 'atau',
  'ini', 'itu', 'adalah', 'yaitu', 'ada', 'bisa', 'dapat', 'akan', 'telah', 'sudah',
  'jika', 'kalau', 'maka', 'tentang', 'terkait', 'oleh', 'secara', 'sebagai', 'serta',
  'apa', 'apakah', 'bagaimana', 'dimana', 'siapa', 'mengapa', 'kapan', 'stikom', 
  'yos', 'sudarso', 'purwokerto', 'mohon', 'tolong', 'info', 'informasi', 'naskah'
]);

// Kata administratif umum yang memiliki bobot informasi rendah
export const GENERIC_ADMIN_WORDS = new Set([
  'aturan', 'peraturan', 'ketentuan', 'pedoman', 'standar', 'dokumen', 
  'surat', 'kode', 'sistem', 'buku', 'panduan', 'kebijakan', 'tata', 'tertib'
]);

// Glosarium Istilah Akademik Resmi STIKOM Yos Sudarso
export const CAMPUS_GLOSSARY = {
  'pmb': ['penerimaan mahasiswa baru', 'mahasiswa baru', 'calon mahasiswa', 'pendaftar'],
  'mahasiswa baru': ['pmb', 'penerimaan mahasiswa baru', 'calon mahasiswa baru', 'jumlah pendaftar'],
  'penerimaan mahasiswa baru': ['pmb', 'mahasiswa baru', 'calon mahasiswa baru', 'jumlah pendaftar'],
  'skripsi': ['tugas akhir', 'ta', 'pendadaran', 'komprehensif', 'bimbingan skripsi', 'pengajuan judul'],
  'ta': ['skripsi', 'tugas akhir', 'pendadaran'],
  'tugas akhir': ['skripsi', 'ta', 'pendadaran', 'komprehensif'],
  'pendadaran': ['ujian skripsi', 'tugas akhir', 'sidang akhir'],
  'reward': ['penghargaan publikasi', 'bantuan dana publikasi', 'insentif karya ilmiah', 'insentif', 'reward'],
  'insentif': ['penghargaan publikasi', 'bantuan dana publikasi', 'insentif karya ilmiah', 'reward', 'insentif penelitian'],
  'lektor': ['jabatan fungsional', 'jafung', 'asisten ahli', 'lektor kepala', 'angka kredit', 'pak'],
  'jafung': ['jabatan fungsional', 'lektor', 'asisten ahli', 'lektor kepala', 'angka kredit', 'pak'],
  'jabatan dosen': ['jabatan fungsional', 'jafung', 'lektor', 'asisten ahli', 'angka kredit'],
  'pangkat': ['jabatan fungsional', 'jafung', 'lektor', 'asisten ahli', 'angka kredit', 'pak'],
  'ami': ['audit mutu internal', 'ami', 'siklus ppepp', 'evaluasi diri', 'auditor', 'temu balik'],
  'audit mutu': ['audit mutu internal', 'ami', 'siklus ppepp', 'auditor mutu'],
  'ppepp': ['penetapan', 'pelaksanaan', 'evaluasi', 'pengendalian', 'peningkatan', 'ppepp'],
  'visi misi': ['vmts', 'visi keilmuan', 'renstra', 'tujuan sasaran', 'visi misi'],
  'vmts': ['visi misi', 'visi keilmuan', 'tujuan sasaran', 'renstra'],
  'kurikulum': ['rps', 'cpmk', 'cpl', 'mata kuliah', 'kurikulum', 'obe', 'evaluasi pembelajaran'],
  'rps': ['rencana pembelajaran semester', 'rps', 'cpmk', 'cpl', 'kurikulum'],
  'sarpras': ['sarana', 'prasarana', 'laboratorium', 'studio', 'ruang perkuliahan', 'fasilitas'],
  'pkm': ['pengabdian kepada masyarakat', 'pkm', 'desa binaan', 'hibah pkm'],
  'penelitian': ['publikasi', 'jurnal', 'hki', 'paten', 'prosiding', 'penelitian', 'hibah penelitian'],
  'kekaryawanan': ['peraturan yayasan', 'status dosen', 'gaji', 'remunerasi', 'hak dosen']
};

/**
 * Normalisasi kueri pengguna & ekspansi sinonim glosarium
 */
export function normalizeAndExpandQuery(rawQuery = '') {
  const lowerQuery = rawQuery.toLowerCase();
  const rawTokens = lowerQuery.match(/\b[a-z0-9_-]+\b/g) || [];
  
  // Saring stopwords
  const cleanTokens = rawTokens.filter(t => t.length > 2 && !STOPWORDS.has(t));
  const effectiveTokens = cleanTokens.length > 0 ? cleanTokens : rawTokens.filter(t => t.length > 1);

  // Pisahkan kata subjek spesifik vs administratif umum
  const specificTokens = effectiveTokens.filter(t => !GENERIC_ADMIN_WORDS.has(t));

  // Kumpulkan ekspansi istilah glosarium kampus
  const expandedTerms = new Set([...effectiveTokens]);

  // Cek frasa & kata glosarium kampus dengan batasan kata \b agar tidak salah mencocokkan substring (seperti 'ta' di 'terakhir')
  for (const [key, synonyms] of Object.entries(CAMPUS_GLOSSARY)) {
    const keyPattern = key.includes(' ') ? key : `\\b${key}\\b`;
    if (new RegExp(keyPattern, 'i').test(lowerQuery)) {
      synonyms.forEach(s => expandedTerms.add(s));
    }
  }

  // Cek kata per kata
  for (const token of effectiveTokens) {
    if (CAMPUS_GLOSSARY[token]) {
      CAMPUS_GLOSSARY[token].forEach(s => expandedTerms.add(s));
    }
  }

  return {
    rawQuery,
    effectiveTokens,
    specificTokens,
    expandedTerms: Array.from(expandedTerms)
  };
}

// ==============================================================================
// Layer 2: Hybrid Dual-Engine Retrieval (Lexical BM25 Strict + Dense Vector)
// ==============================================================================

/**
 * Jalur A: Lexical Scoring dengan Strict Word Boundary (\b...\b), Proximity, Exact Phrase & Title Boost
 */
export function scoreChunkLexical(chunk, doc, queryInfo) {
  const lowerContent = (chunk.content || '').toLowerCase();
  const lowerSection = (chunk.section_title || '').toLowerCase();
  const lowerTitle = (doc.title || '').toLowerCase();

  let matchedSpecificCount = 0;
  let matchedGeneralCount = 0;

  // 1. Pencocokan kata spesifik & kata umum di konten teks & section chunk
  for (const term of queryInfo.expandedTerms) {
    const isMultiWord = term.includes(' ');
    const pattern = isMultiWord 
      ? term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') 
      : `\\b${term}\\b`;
    
    const regex = new RegExp(pattern, 'i');
    let hit = false;

    if (regex.test(lowerContent)) hit = true;
    else if (regex.test(lowerSection)) hit = true;

    if (hit) {
      if (queryInfo.specificTokens.includes(term) || !GENERIC_ADMIN_WORDS.has(term)) {
        matchedSpecificCount++;
      } else {
        matchedGeneralCount++;
      }
    }
  }

  // Eliminasi False Positive fatal: Jika pengguna menanyakan kata spesifik (misal 'skripsi'),
  // tetapi chunk tidak memuat kata spesifik tersebut atau sinonimnya sama sekali di teks/section, tolak chunk!
  if (queryInfo.specificTokens.length > 0 && matchedSpecificCount === 0) {
    return 0;
  }

  if (matchedSpecificCount === 0 && matchedGeneralCount === 0) {
    return 0;
  }

  // 2. Bonus Frasa Berdampingan (Proximity Bonus)
  let phraseBonus = 0;
  for (let i = 0; i < queryInfo.effectiveTokens.length - 1; i++) {
    const bigram = `\\b${queryInfo.effectiveTokens[i]}\\s+(?:[a-z0-9_-]+\\s+)?${queryInfo.effectiveTokens[i + 1]}\\b`;
    if (new RegExp(bigram, 'i').test(lowerContent)) {
      phraseBonus += 0.40;
    }
  }

  // 3. Bonus Frasa Lengkap / Data Kuantitatif Pasti (Exact Query Match & Numeric Data)
  // Contoh: "jumlah mahasiswa baru = 155" atau query utuh muncul utuh dalam teks
  let exactPhraseBonus = 0;
  const cleanRaw = queryInfo.rawQuery.trim().toLowerCase();
  if (cleanRaw.length > 3 && lowerContent.includes(cleanRaw)) {
    exactPhraseBonus += 0.80;
  }
  // Bonus jika memuat pola persamaan data numerik resmi (misal: "jumlah ... = [0-9]+")
  if (/jumlah\s+[a-z0-9\s_-]+=\s*\d+/i.test(lowerContent)) {
    exactPhraseBonus += 0.75;
  }

  // 4. Title Relevance Multiplier (Fielded BM25F: Kecocokan Kata Kunci pada Judul Dokumen)
  let titleMatchMultiplier = 1.0;
  for (const term of queryInfo.expandedTerms) {
    const pattern = term.includes(' ') ? term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : `\\b${term}\\b`;
    if (new RegExp(pattern, 'i').test(lowerTitle)) {
      titleMatchMultiplier += 0.25;
    }
  }

  // Skor Leksikal gabungan
  const baseLexical = (matchedSpecificCount * 0.45) + (matchedGeneralCount * 0.15) + phraseBonus + exactPhraseBonus;
  return baseLexical * titleMatchMultiplier;
}

// ==============================================================================
// Layer 3: Reciprocal Rank Fusion (RRF Formula, k = 60)
// ==============================================================================
export function computeRrfScore(rankLexical, rankVector, k = 60) {
  const rrfLex = rankLexical !== null ? 1.0 / (k + rankLexical) : 0;
  const rrfVec = rankVector !== null ? 1.0 / (k + rankVector) : 0;
  return rrfLex + rrfVec;
}

// ==============================================================================
// Layer 4: Agregasi Tingkat Dokumen (Document-Level Grouping)
// ==============================================================================
export function aggregateChunksToDocuments(rankedChunks) {
  const docMap = new Map();

  for (const chunk of rankedChunks) {
    const docId = chunk.document_id;
    if (!docMap.has(docId)) {
      docMap.set(docId, {
        documentId: docId,
        documentTitle: chunk.document_title,
        docNumber: chunk.doc_number || null,
        category: chunk.category_name || 'Umum',
        year: chunk.year || null,
        version: chunk.version || '1.0',
        status: chunk.status || 'published',
        docScore: 0,
        totalMatchedPages: 0,
        matchedPagesList: [],
        chunks: []
      });
    }

    const docGroup = docMap.get(docId);
    docGroup.chunks.push(chunk);
    if (!docGroup.matchedPagesList.includes(chunk.page_number)) {
      docGroup.matchedPagesList.push(chunk.page_number);
    }
  }

  const documents = Array.from(docMap.values());

  // Hitung Skor Dokumen Akumulatif: Max(BestChunk) + α * Σ(OtherChunks)
  for (const doc of documents) {
    // Urutkan chunk internal berdasarkan similarity tertinggi
    doc.chunks.sort((a, b) => b.similarity - a.similarity);
    doc.matchedPagesList.sort((a, b) => a - b);
    doc.totalMatchedPages = doc.matchedPagesList.length;

    const bestChunkScore = doc.chunks[0]?.similarity || 0;
    const otherChunksSum = doc.chunks.slice(1).reduce((acc, c) => acc + (c.similarity * 0.15), 0);

    // Skor dokumen komposit (dibatasi maksimal 0.99)
    doc.docScore = Math.min(0.99, parseFloat((bestChunkScore + otherChunksSum).toFixed(3)));
  }

  // Urutkan dokumen berdasarkan skor dokumen tertinggi
  documents.sort((a, b) => b.docScore - a.docScore);

  return documents;
}

// ==============================================================================
// Eksekusi Penuh Pipeline Pencarian Berlapis
// ==============================================================================
export async function executeLayeredSearch(allDocuments, rawQuery, queryEmbedding, filters = {}, topK = 10) {
  // Layer 1: Normalisasi & Ekspansi
  const queryInfo = normalizeAndExpandQuery(rawQuery);

  const candidateChunks = [];

  for (const doc of allDocuments) {
    if (doc.status !== 'published' || !doc.is_active) continue;
    if (filters.categoryId && Number(doc.category_id) !== Number(filters.categoryId)) continue;
    if (filters.year && Number(doc.year) !== Number(filters.year)) continue;
    if (filters.documentId && doc.id !== filters.documentId) continue;

    for (const chunk of (doc.chunks || [])) {
      if (chunk.is_noise) continue;

      // Layer 2 Jalur A: Hitung skor leksikal
      const lexicalScore = scoreChunkLexical(chunk, doc, queryInfo);

      // Layer 2 Jalur B: Hitung skor vektor embedding
      let vectorSim = 0;
      if (chunk.embedding && queryEmbedding) {
        try {
          vectorSim = cosineSimilarity(queryEmbedding, chunk.embedding);
        } catch (e) {
          vectorSim = 0;
        }
      }

      // Hanya proses chunk yang memiliki kecocokan leksikal ATAU kemiripan semantik minimal
      if (lexicalScore > 0 || vectorSim >= 0.40) {
        candidateChunks.push({
          chunk_id: chunk.id,
          document_id: doc.id,
          document_title: doc.title,
          doc_number: doc.doc_number,
          category_name: doc.category_name || 'Umum',
          year: doc.year,
          version: doc.version,
          status: doc.status,
          page_number: chunk.page_number,
          section_title: chunk.section_title || 'Klausul Regulasi',
          content: chunk.content,
          lexicalScore,
          vectorSim
        });
      }
    }
  }

  if (candidateChunks.length === 0) {
    return {
      queryInfo,
      documents: [],
      results: []
    };
  }

  // Layer 3: RRF (Reciprocal Rank Fusion)
  // Buat ranking Leksikal
  const lexicalSorted = [...candidateChunks].sort((a, b) => b.lexicalScore - a.lexicalScore);
  const lexicalRankMap = new Map();
  lexicalSorted.forEach((c, idx) => {
    if (c.lexicalScore > 0) lexicalRankMap.set(c.chunk_id, idx + 1);
  });

  // Buat ranking Vektor
  const vectorSorted = [...candidateChunks].sort((a, b) => b.vectorSim - a.vectorSim);
  const vectorRankMap = new Map();
  vectorSorted.forEach((c, idx) => {
    if (c.vectorSim >= 0.40) vectorRankMap.set(c.chunk_id, idx + 1);
  });

  // Hitung RRF Score untuk setiap kandidat
  const scoredChunks = candidateChunks.map(c => {
    const rankLex = lexicalRankMap.get(c.chunk_id) || null;
    const rankVec = vectorRankMap.get(c.chunk_id) || null;
    const rrfRaw = computeRrfScore(rankLex, rankVec, 60);

    // Kalibrasi similarity agar proporsional untuk UI (0.50 - 0.98)
    const normalizedSim = Math.min(0.98, Math.max(0.52, (rrfRaw * 42.0) + (c.vectorSim * 0.25)));

    return {
      ...c,
      rrfScore: rrfRaw,
      similarity: parseFloat(normalizedSim.toFixed(3)),
      snippet: c.content
    };
  });

  // Urutkan chunk berdasarkan similarity gabungan RRF
  scoredChunks.sort((a, b) => b.similarity - a.similarity);

  // Diversifikasi Kandidat (Per-Document Candidate Quota):
  // Mencegah satu dokumen tebal (misal Bukti Proker ~400 hal) memonopoli seluruh kandidat RAG.
  // Berikan jatah seimbang: ambil maksimal 4 chunk teratas per dokumen terlebih dahulu,
  // lalu tambahkan sisa chunk relevan lainnya hingga memenuhi kuota pool.
  const docChunkCounts = new Map();
  const diversifiedChunks = [];
  const overflowChunks = [];

  for (const c of scoredChunks) {
    const currentCount = docChunkCounts.get(c.document_id) || 0;
    if (currentCount < 4) {
      diversifiedChunks.push(c);
      docChunkCounts.set(c.document_id, currentCount + 1);
    } else {
      overflowChunks.push(c);
    }
  }

  // Gabungkan kandidat terdiversifikasi diikuti overflow teratas hingga 40 kandidat
  const topCandidateChunks = [...diversifiedChunks, ...overflowChunks].slice(0, 40);

  // Layer 4: Agregasi Tingkat Dokumen
  const aggregatedDocuments = aggregateChunksToDocuments(topCandidateChunks).slice(0, topK);

  // Format flat results untuk LLM & RAG Citations:
  // Pastikan flatResults mewakili chunk terbaik dari berbagai dokumen berbeda (maksimal 2-3 chunk per dokumen untuk 10 besar)
  const ragChunkCounts = new Map();
  const diversifiedRagChunks = [];
  for (const c of topCandidateChunks) {
    const cur = ragChunkCounts.get(c.document_id) || 0;
    if (cur < 3 && diversifiedRagChunks.length < 10) {
      diversifiedRagChunks.push(c);
      ragChunkCounts.set(c.document_id, cur + 1);
    }
  }
  // Jika masih kurang dari 10, isi dari sisa topCandidateChunks
  if (diversifiedRagChunks.length < 10) {
    for (const c of topCandidateChunks) {
      if (!diversifiedRagChunks.some(dc => dc.chunk_id === c.chunk_id) && diversifiedRagChunks.length < 10) {
        diversifiedRagChunks.push(c);
      }
    }
  }

  const flatResults = diversifiedRagChunks.map(c => ({
    chunkId: c.chunk_id,
    documentId: c.document_id,
    documentTitle: c.document_title,
    category: c.category_name,
    pageNumber: c.page_number,
    sectionTitle: c.section_title,
    snippet: c.content,
    similarity: c.similarity,
    viewerUrl: `/viewer/${c.document_id}?page=${c.page_number}&q=${encodeURIComponent(rawQuery)}`
  }));

  return {
    queryInfo,
    documents: aggregatedDocuments,
    results: flatResults
  };
}
