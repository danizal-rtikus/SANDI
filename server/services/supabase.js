import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { sampleCategories, sampleDocuments } from '../sampleData.js';

import { fileURLToPath } from 'url';
import { cosineSimilarity } from './ai.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL || 'https://fznhvuyplojsvcodxfkk.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_8kuEfbZU64XFihkNdDI7gQ_jpRHGc6e';

export const supabase = createClient(supabaseUrl, supabaseKey);

const DATA_DIR = path.join(__dirname, '../data');
const PERSISTED_FILE = path.join(DATA_DIR, 'persisted_documents.json');

// In-memory / local state fallback jika tabel Supabase belum dimigrasi
class LocalStore {
  constructor() {
    this.categories = [...sampleCategories];
    this.documents = [];
    this.jobs = [];
    this.searchLogs = [];
    this.feedback = [];
    this.isSupabaseLive = false;

    // Muat data dokumen yang tersimpan di disk
    this.loadPersisted();
  }

  loadPersisted() {
    try {
      if (fs.existsSync(PERSISTED_FILE)) {
        const raw = fs.readFileSync(PERSISTED_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.documents = parsed;
          console.log(`📦 Memuat ${parsed.length} dokumen tersimpan dari ${PERSISTED_FILE}`);
        }
      }
    } catch (err) {
      console.warn('Peringatan membaca persisted_documents.json:', err.message);
    }
  }

  savePersisted() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(PERSISTED_FILE, JSON.stringify(this.documents, null, 2), 'utf8');
    } catch (err) {
      console.warn('Peringatan menyimpan persisted_documents.json:', err.message);
    }
  }

  async checkSupabaseConnection() {
    try {
      const { data, error } = await supabase.from('document_categories').select('count', { count: 'exact', head: true });
      if (!error) {
        this.isSupabaseLive = true;
        console.log('✅ Supabase terhubung dan tabel document_categories siap digunakan.');
        return true;
      }
    } catch (e) {
      // ignore
    }
    this.isSupabaseLive = false;
    console.log('ℹ️ Menggunakan database lokal responsif (Tabel Supabase belum di-apply atau menggunakan client key).');
    return false;
  }

  // Categories
  async getCategories() {
    if (this.isSupabaseLive) {
      const { data, error } = await supabase.from('document_categories').select('*').order('sort_order', { ascending: true });
      if (!error && data && data.length > 0) return data;
    }
    return this.categories;
  }

  // Documents
  async getDocuments(filter = {}) {
    let supabaseDocs = [];
    if (this.isSupabaseLive) {
      try {
        let query = supabase.from('documents').select('*, document_categories(name)');
        if (filter.category_id) query = query.eq('category_id', filter.category_id);
        if (filter.status) query = query.eq('status', filter.status);
        const { data, error } = await query.order('created_at', { ascending: false });
        if (!error && data && data.length > 0) {
          supabaseDocs = data.map(d => ({
            ...d,
            category_name: d.document_categories?.name || 'Umum'
          }));
        }
      } catch (err) {
        console.warn('Peringatan mengambil dokumen Supabase:', err.message);
      }
    }

    // Gabungkan dengan dokumen lokal agar dokumen yang diunggah selalu tampil
    const existingIds = new Set(supabaseDocs.map(d => String(d.id)));
    let localDocs = this.documents.filter(d => !existingIds.has(String(d.id)));

    if (filter.category_id) {
      localDocs = localDocs.filter(d => Number(d.category_id) === Number(filter.category_id));
    }
    if (filter.status) {
      localDocs = localDocs.filter(d => d.status === filter.status);
    }

    return [...supabaseDocs, ...localDocs];
  }

  async getDocumentById(id) {
    if (this.isSupabaseLive) {
      try {
        const { data, error } = await supabase.from('documents').select('*, document_categories(name)').eq('id', id).single();
        if (!error && data) {
          // Ambil chunks
          const { data: chunks } = await supabase.from('document_chunks').select('*').eq('document_id', id).order('page_number', { ascending: true });
          return {
            ...data,
            category_name: data.document_categories?.name || 'Umum',
            chunks: chunks || []
          };
        }
      } catch (e) {
        // Lanjut ke pencarian lokal
      }
    }

    const doc = this.documents.find(d => String(d.id) === String(id));
    return doc || null;
  }

  async checkDuplicateSha(checksum) {
    if (this.isSupabaseLive) {
      try {
        const { data } = await supabase.from('documents').select('id, title').eq('checksum_sha256', checksum).maybeSingle();
        if (data) return data;
      } catch (e) {
        // fallback
      }
    }
    return this.documents.find(d => d.checksum_sha256 === checksum) || null;
  }

  async addDocument(docData, chunks = []) {
    // Pastikan nama kategori terisi dengan benar
    const cat = this.categories.find(c => Number(c.id) === Number(docData.category_id));
    const categoryName = cat?.name || docData.category_name || 'Kebijakan SPMI';

    const newDoc = {
      ...docData,
      id: docData.id || `doc-${Date.now()}`,
      category_name: categoryName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      chunks: chunks.map((c, i) => ({
        ...c,
        id: c.id || `chunk-${Date.now()}-${i}`,
        document_id: docData.id
      }))
    };

    // Coba simpan ke Supabase jika live
    if (this.isSupabaseLive) {
      try {
        const supabasePayload = {
          title: docData.title,
          doc_number: docData.doc_number || null,
          category_id: docData.category_id ? Number(docData.category_id) : 1,
          year: docData.year ? Number(docData.year) : 2021,
          version: docData.version || '1.0',
          description: docData.description || '',
          access: docData.access || 'publik_internal',
          status: docData.status || 'published',
          is_active: docData.is_active !== false,
          storage_path: docData.storage_path,
          file_size_bytes: docData.file_size_bytes,
          checksum_sha256: docData.checksum_sha256,
          page_count: docData.page_count
        };
        const { data, error } = await supabase.from('documents').insert([supabasePayload]).select().single();
        if (error) {
          console.warn('ℹ️ Supabase RLS note (dokumen tersimpan aman di korpus lokal):', error.message);
        } else if (data && chunks.length > 0) {
          const chunksToInsert = chunks.map(c => ({
            document_id: data.id,
            page_number: c.page_number,
            chunk_index: c.chunk_index,
            content: c.content,
            token_count: c.token_count,
            section_title: c.section_title,
            is_noise: c.is_noise,
            embedding: c.embedding,
            embedding_model: c.embedding_model || 'gemini-embedding-001@768'
          }));
          await supabase.from('document_chunks').insert(chunksToInsert);
        }
      } catch (err) {
        console.warn('Supabase insert note:', err.message);
      }
    }

    this.documents.unshift(newDoc);
    this.savePersisted();
    return newDoc;
  }

  async updateDocument(id, updates) {
    if (this.isSupabaseLive) {
      try {
        await supabase.from('documents').update(updates).eq('id', id);
      } catch (e) {
        // fallback
      }
    }

    const index = this.documents.findIndex(d => String(d.id) === String(id));
    if (index !== -1) {
      this.documents[index] = { ...this.documents[index], ...updates, updated_at: new Date().toISOString() };
      this.savePersisted();
      return this.documents[index];
    }
    return null;
  }

  async deleteDocument(id) {
    if (this.isSupabaseLive) {
      try {
        await supabase.from('documents').delete().eq('id', id);
      } catch (e) {
        // fallback
      }
    }
    this.documents = this.documents.filter(d => String(d.id) !== String(id));
    this.savePersisted();
    return true;
  }

  // Jobs
  async createJob(documentId, pagesTotal) {
    const job = {
      id: `job-${Date.now()}`,
      document_id: documentId,
      status: 'queued',
      pages_total: pagesTotal,
      pages_done: 0,
      error_message: null,
      started_at: new Date().toISOString(),
      finished_at: null,
      created_at: new Date().toISOString()
    };
    this.jobs.unshift(job);
    return job;
  }

  async updateJob(jobId, updates) {
    const job = this.jobs.find(j => j.id === jobId);
    if (job) {
      Object.assign(job, updates);
    }
    return job;
  }

  async getJob(jobId) {
    return this.jobs.find(j => j.id === jobId) || null;
  }

  // Search
  async searchChunks({ query, embedding, filters = {}, topK = 8 }) {
    // 1. Coba RPC Supabase match_chunks jika live
    if (this.isSupabaseLive && embedding) {
      try {
        const { data, error } = await supabase.rpc('match_chunks', {
          query_embedding: embedding,
          match_count: topK,
          min_similarity: 0.40,
          filter_category: filters.categoryId || null,
          filter_year: filters.year || null,
          filter_document: filters.documentId || null
        });

        if (!error && data && data.length > 0) {
          return data;
        }
      } catch (err) {
        console.warn('Fallback search RPC:', err.message);
      }
    }

    // 2. Mesin Temu Balik Mutu (Word Boundary Tokenizer, Specificity Filter, & Proximity Scoring)
    const rawTokens = (query || '').toLowerCase().match(/\b[a-z0-9_-]+\b/g) || [];
    const STOPWORDS = new Set([
      'yang', 'di', 'ke', 'dari', 'pada', 'dalam', 'untuk', 'dengan', 'dan', 'atau',
      'ini', 'itu', 'adalah', 'yaitu', 'ada', 'bisa', 'dapat', 'akan', 'telah', 'sudah',
      'jika', 'kalau', 'maka', 'tentang', 'terkait', 'oleh', 'secara', 'sebagai', 'serta',
      'apa', 'apakah', 'bagaimana', 'dimana', 'siapa', 'mengapa', 'stikom', 'yos', 'sudarso'
    ]);

    const keywords = rawTokens.filter(t => t.length > 2 && !STOPWORDS.has(t));
    const effectiveKeywords = keywords.length > 0 ? keywords : rawTokens.filter(t => t.length > 1);

    // Kategori kata umum administratif vs kata kunci inti spesifik
    const GENERIC_WORDS = new Set([
      'aturan', 'peraturan', 'ketentuan', 'pedoman', 'standar', 'dokumen', 'surat', 'kode', 'sistem'
    ]);
    const specificKeywords = effectiveKeywords.filter(k => !GENERIC_WORDS.has(k));

    // Pemetaan sinonim istilah akademik resmi STIKOM Yos Sudarso
    const SYNONYM_MAP = {
      'skripsi': ['tugas akhir', 'ta', 'pendadaran'],
      'ami': ['audit mutu internal', 'audit internal'],
      'lektor': ['jabatan fungsional', 'jafung'],
      'ppepp': ['penetapan', 'pelaksanaan', 'evaluasi', 'pengendalian', 'peningkatan']
    };

    const results = [];

    for (const doc of this.documents) {
      if (doc.status !== 'published' || !doc.is_active) continue;
      if (filters.categoryId && Number(doc.category_id) !== Number(filters.categoryId)) continue;
      if (filters.year && Number(doc.year) !== Number(filters.year)) continue;
      if (filters.documentId && doc.id !== filters.documentId) continue;

      const lowerTitle = (doc.title || '').toLowerCase();

      for (const chunk of (doc.chunks || [])) {
        if (chunk.is_noise) continue;

        const lowerContent = (chunk.content || '').toLowerCase();
        const lowerSection = (chunk.section_title || '').toLowerCase();

        // A. Strict Word Boundary Matching (\b...\b)
        // Mencegah "deskripsi" cocok dengan "skripsi", atau "pelanggaran" cocok dengan "anggaran"
        let matchedCount = 0;
        let matchedSpecificCount = 0;

        for (const kw of effectiveKeywords) {
          const kwRegex = new RegExp(`\\b${kw}\\b`, 'i');
          let isMatch = false;

          if (kwRegex.test(lowerContent) || kwRegex.test(lowerSection) || kwRegex.test(lowerTitle)) {
            isMatch = true;
          } else if (SYNONYM_MAP[kw]) {
            for (const syn of SYNONYM_MAP[kw]) {
              if (new RegExp(`\\b${syn}\\b`, 'i').test(lowerContent)) {
                isMatch = true;
                break;
              }
            }
          }

          if (isMatch) {
            matchedCount++;
            if (!GENERIC_WORDS.has(kw)) {
              matchedSpecificCount++;
            }
          }
        }

        // Eliminasi False Positive: Jika query memiliki kata spesifik (misal 'skripsi', 'anggaran', 'ami')
        // tetapi chunk ini sama sekali tidak memiliki kata spesifik tersebut, maka lewati!
        if (specificKeywords.length > 0 && matchedSpecificCount === 0) {
          continue;
        }

        if (matchedCount === 0) continue;

        // B. Bigram & Phrase Proximity Bonus
        let phraseBonus = 0;
        for (let i = 0; i < effectiveKeywords.length - 1; i++) {
          const bigram = `${effectiveKeywords[i]}\\s+(?:[a-z0-9_-]+\\s+)?${effectiveKeywords[i + 1]}`;
          if (new RegExp(`\\b${bigram}\\b`, 'i').test(lowerContent)) {
            phraseBonus += 0.35;
          }
        }

        // C. Cosine Vector Similarity
        let vectorSim = 0;
        if (chunk.embedding && embedding) {
          try {
            vectorSim = cosineSimilarity(embedding, chunk.embedding);
          } catch (e) {
            vectorSim = 0;
          }
        }

        // D. Skor Gabungan Terkalibrasi
        const lexicalScore = (matchedCount / (effectiveKeywords.length || 1)) * 0.45 + (matchedSpecificCount * 0.25) + phraseBonus;
        const finalScore = Math.min(0.98, Math.max(0.51, 0.40 + (vectorSim * 0.30) + (lexicalScore * 0.45)));

        results.push({
          chunk_id: chunk.id,
          document_id: doc.id,
          document_title: doc.title,
          category_name: doc.category_name || 'Umum',
          page_number: chunk.page_number,
          content: chunk.content,
          similarity: parseFloat(finalScore.toFixed(3)),
          section_title: chunk.section_title
        });
      }
    }

    // Urutkan berdasarkan similarity tertinggi
    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, topK);
  }

  // Logs & Feedback
  async logSearch({ userId, queryText, filters, resultsCount, topScore, answered, latencyMs }) {
    const log = {
      id: `log-${Date.now()}`,
      user_id: userId || null,
      query_text: queryText,
      filters: filters || {},
      results_count: resultsCount,
      top_score: topScore,
      answered: answered !== false,
      latency_ms: latencyMs,
      created_at: new Date().toISOString()
    };
    this.searchLogs.unshift(log);
    return log;
  }

  async addFeedback({ searchLogId, chunkId, userId, isHelpful, comment }) {
    const fb = {
      id: this.feedback.length + 1,
      search_log_id: searchLogId,
      chunk_id: chunkId,
      user_id: userId,
      is_helpful: isHelpful,
      comment: comment || '',
      created_at: new Date().toISOString()
    };
    this.feedback.unshift(fb);
    return fb;
  }

  async getAnalyticsSummary() {
    const totalDocs = this.documents.length;
    const publishedDocs = this.documents.filter(d => d.status === 'published').length;
    let totalChunks = 0;
    this.documents.forEach(d => { totalChunks += (d.chunks?.length || 0); });

    const totalQueries = this.searchLogs.length;
    const answeredQueries = this.searchLogs.filter(l => l.answered).length;
    const unansweredCount = totalQueries - answeredQueries;

    const helpfulFeedback = this.feedback.filter(f => f.is_helpful).length;
    const totalFeedback = this.feedback.length;
    const satisfactionRate = totalFeedback > 0 ? Math.round((helpfulFeedback / totalFeedback) * 100) : 0;

    return {
      totalDocs,
      publishedDocs,
      totalChunks,
      totalQueries,
      unansweredCount,
      satisfactionRate,
      recentQueries: this.searchLogs.slice(0, 10),
      recentFeedback: this.feedback.slice(0, 10)
    };
  }

  async getUnansweredQueries() {
    return this.searchLogs.filter(l => !l.answered || l.results_count === 0 || (l.top_score && l.top_score < 0.55));
  }
}

export const dbStore = new LocalStore();
// Check Supabase status on startup
dbStore.checkSupabaseConnection();
