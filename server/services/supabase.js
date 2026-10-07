import { createClient } from '@supabase/supabase-js';
import { sampleCategories, sampleDocuments } from '../sampleData.js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://fznhvuyplojsvcodxfkk.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_8kuEfbZU64XFihkNdDI7gQ_jpRHGc6e';

export const supabase = createClient(supabaseUrl, supabaseKey);

// In-memory / local state fallback jika tabel Supabase belum dimigrasi
class LocalStore {
  constructor() {
    this.categories = [...sampleCategories];
    this.documents = [];
    this.jobs = [];
    this.searchLogs = [];
    this.feedback = [];
    this.isSupabaseLive = false;
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
      if (!error && data) return data;
    }
    return this.categories;
  }

  // Documents
  async getDocuments(filter = {}) {
    if (this.isSupabaseLive) {
      let query = supabase.from('documents').select('*, document_categories(name)');
      if (filter.category_id) query = query.eq('category_id', filter.category_id);
      if (filter.status) query = query.eq('status', filter.status);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (!error && data) {
        return data.map(d => ({
          ...d,
          category_name: d.document_categories?.name || 'Umum'
        }));
      }
    }

    let docs = [...this.documents];
    if (filter.category_id) {
      docs = docs.filter(d => Number(d.category_id) === Number(filter.category_id));
    }
    if (filter.status) {
      docs = docs.filter(d => d.status === filter.status);
    }
    return docs;
  }

  async getDocumentById(id) {
    if (this.isSupabaseLive) {
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
    }

    const doc = this.documents.find(d => d.id === id);
    return doc || null;
  }

  async checkDuplicateSha(checksum) {
    if (this.isSupabaseLive) {
      const { data } = await supabase.from('documents').select('id, title').eq('checksum_sha256', checksum).maybeSingle();
      if (data) return data;
    }
    return this.documents.find(d => d.checksum_sha256 === checksum) || null;
  }

  async addDocument(docData, chunks = []) {
    const newDoc = {
      ...docData,
      id: docData.id || `doc-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      chunks: chunks.map((c, i) => ({
        ...c,
        id: c.id || `chunk-${Date.now()}-${i}`,
        document_id: docData.id
      }))
    };

    if (this.isSupabaseLive) {
      try {
        const { data, error } = await supabase.from('documents').insert([docData]).select().single();
        if (!error && data) {
          if (chunks.length > 0) {
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
          return data;
        }
      } catch (err) {
        console.error('Error inserting to Supabase:', err);
      }
    }

    this.documents.unshift(newDoc);
    return newDoc;
  }

  async updateDocument(id, updates) {
    if (this.isSupabaseLive) {
      const { data, error } = await supabase.from('documents').update(updates).eq('id', id).select().single();
      if (!error && data) return data;
    }

    const index = this.documents.findIndex(d => d.id === id);
    if (index !== -1) {
      this.documents[index] = { ...this.documents[index], ...updates, updated_at: new Date().toISOString() };
      return this.documents[index];
    }
    return null;
  }

  async deleteDocument(id) {
    if (this.isSupabaseLive) {
      await supabase.from('documents').delete().eq('id', id);
    }
    this.documents = this.documents.filter(d => d.id !== id);
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

    // 2. Fallback search cerdas di in-memory store
    const queryTokens = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const results = [];

    for (const doc of this.documents) {
      if (doc.status !== 'published' || !doc.is_active) continue;
      if (filters.categoryId && Number(doc.category_id) !== Number(filters.categoryId)) continue;
      if (filters.year && Number(doc.year) !== Number(filters.year)) continue;
      if (filters.documentId && doc.id !== filters.documentId) continue;

      for (const chunk of (doc.chunks || [])) {
        if (chunk.is_noise) continue;

        // Hitung similarity: gabungan keyword match + token overlap + section score
        const lowerContent = chunk.content.toLowerCase();
        const lowerTitle = doc.title.toLowerCase();
        const lowerSection = (chunk.section_title || '').toLowerCase();

        let tokenScore = 0;
        let matchedKeywords = 0;

        for (const token of queryTokens) {
          if (lowerContent.includes(token)) {
            tokenScore += 0.25;
            matchedKeywords++;
          }
          if (lowerTitle.includes(token)) {
            tokenScore += 0.20;
          }
          if (lowerSection.includes(token)) {
            tokenScore += 0.20;
          }
        }

        // Skor dasar jika ada kata kunci yang cocok
        if (matchedKeywords > 0 || tokenScore > 0) {
          const normalizedScore = Math.min(0.96, Math.max(0.52, 0.45 + (tokenScore / (queryTokens.length || 1)) * 0.45));
          results.push({
            chunk_id: chunk.id,
            document_id: doc.id,
            document_title: doc.title,
            category_name: doc.category_name || 'Umum',
            page_number: chunk.page_number,
            content: chunk.content,
            similarity: parseFloat(normalizedScore.toFixed(3)),
            section_title: chunk.section_title
          });
        }
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
