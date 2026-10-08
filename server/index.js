import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from server/.env or root .env
dotenv.config({ path: path.join(__dirname, '.env') });

import { dbStore, supabase } from './services/supabase.js';
import { processPdfBuffer, computeSha256 } from './services/pdfProcessor.js';
import { getEmbedding, generateRagAnswer, generateRagAnswerStream } from './services/ai.js';

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const supabaseUrl = process.env.SUPABASE_URL || 'https://fznhvuyplojsvcodxfkk.supabase.co';

// Multer memory storage agar buffer langsung dapat diproses dan dihitung checksum-nya
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50 MB sesuai FR-01
});

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads jika file disimpan secara lokal
app.use('/uploads', express.static(uploadsDir));

// ==============================================================================
// 1. Health & Config Endpoints
// ==============================================================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'SANDI - STIKOM Yos Sudarso',
    timestamp: new Date().toISOString(),
    isSupabaseLive: dbStore.isSupabaseLive,
    hasGeminiKey: !!process.env.GEMINI_API_KEY
  });
});

app.get('/api/config', (req, res) => {
  res.json({
    appName: 'SANDI',
    institution: 'STIKOM Yos Sudarso Purwokerto',
    version: '1.0.0',
    isSupabaseLive: dbStore.isSupabaseLive,
    roles: ['super_admin', 'admin_mutu', 'asesor', 'dosen']
  });
});

// ==============================================================================
// 2. Categories
// ==============================================================================
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await dbStore.getCategories();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==============================================================================
// 3. Documents Management
// ==============================================================================
// GET /api/documents (Daftar dokumen dengan filter status & kategori)
app.get('/api/documents', async (req, res) => {
  try {
    const { category_id, status } = req.query;
    const documents = await dbStore.getDocuments({ category_id, status });
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/documents/:id (Detail dokumen beserta potongan chunks)
app.get('/api/documents/:id', async (req, res) => {
  try {
    const doc = await dbStore.getDocumentById(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Dokumen tidak ditemukan' });
    }
    res.json(doc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/documents (Unggah PDF + pipeline indeksasi otomatis FR-01 s/d FR-09)
app.post('/api/documents', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Berkas PDF wajib diunggah' });
    }

    const {
      title,
      doc_number,
      category_id,
      year,
      version = '1.0',
      description = '',
      access = 'publik_internal',
      supersedes_id
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Judul dokumen wajib diisi' });
    }

    const fileBuffer = req.file.buffer;
    const checksum = computeSha256(fileBuffer);

    // Cek duplikat SHA-256 (FR-02)
    const existingDoc = await dbStore.checkDuplicateSha(checksum);
    if (existingDoc) {
      return res.status(409).json({
        error: `Dokumen dengan isi file ini sudah terdaftar: "${existingDoc.title}"`,
        duplicateId: existingDoc.id
      });
    }

    const docId = `doc-${Date.now()}`;
    const filename = `${docId}-${req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const localFilePath = path.join(uploadsDir, filename);

    // Simpan file secara lokal sebagai cadangan
    try {
      fs.writeFileSync(localFilePath, fileBuffer);
    } catch (writeErr) {
      console.warn('⚠️ Gagal menyimpan file lokal:', writeErr.message);
    }
    let storagePath = `/uploads/${filename}`;

    // Upload ke Supabase Storage Cloud jika bucket tersedia
    try {
      const { error: uploadError } = await supabase.storage.from('documents').upload(filename, fileBuffer, {
        contentType: 'application/pdf',
        upsert: true
      });
      if (!uploadError) {
        const { data: publicData } = supabase.storage.from('documents').getPublicUrl(filename);
        if (publicData?.publicUrl) {
          storagePath = publicData.publicUrl;
        }
      }
    } catch (e) {
      console.warn('⚠️ Supabase Storage upload error:', e.message);
    }

    // Buat job indeksasi
    const job = await dbStore.createJob(docId, 0);

    // Ekstraksi teks per halaman & chunking
    const parsed = await processPdfBuffer(fileBuffer, title);
    await dbStore.updateJob(job.id, {
      status: 'extracting',
      pages_total: parsed.pageCount
    });

    // Proses embedding untuk setiap chunk secara paralel menggunakan Promise.all (Batch 5)
    const BATCH_SIZE = 5;
    const chunksWithEmbeddings = [];
    for (let i = 0; i < parsed.chunks.length; i += BATCH_SIZE) {
      const slice = parsed.chunks.slice(i, i + BATCH_SIZE);
      const batchEmbeddings = await Promise.all(
        slice.map(async (c) => {
          const embedding = await getEmbedding(c.embedding_input || c.content);
          return {
            ...c,
            embedding,
            embedding_model: 'gemini-embedding-001@768'
          };
        })
      );
      chunksWithEmbeddings.push(...batchEmbeddings);
    }

    await dbStore.updateJob(job.id, {
      status: 'embedding',
      pages_done: parsed.pageCount
    });

    // Dapatkan nama kategori
    const categories = await dbStore.getCategories();
    const cat = categories.find(c => Number(c.id) === Number(category_id));

    // Simpan dokumen ke database
    const documentRecord = {
      id: docId,
      title,
      doc_number: doc_number || null,
      category_id: category_id ? Number(category_id) : 1,
      category_name: cat?.name || 'Umum',
      year: year ? Number(year) : new Date().getFullYear(),
      version,
      description,
      access,
      status: 'published',
      is_active: true,
      storage_path: storagePath,
      file_size_bytes: req.file.size,
      checksum_sha256: checksum,
      page_count: parsed.pageCount,
      supersedes_id: supersedes_id || null,
      needs_ocr: parsed.isScannedCandidate
    };

    const createdDoc = await dbStore.addDocument(documentRecord, chunksWithEmbeddings);

    // Jika ini versi baru, ubah status versi sebelumnya menjadi 'superseded' (FR-10)
    if (supersedes_id) {
      await dbStore.updateDocument(supersedes_id, {
        status: 'superseded',
        is_active: false
      });
    }

    await dbStore.updateJob(job.id, {
      status: 'ready',
      finished_at: new Date().toISOString()
    });

    res.status(201).json({
      success: true,
      document: createdDoc,
      jobId: job.id,
      pageCount: parsed.pageCount,
      chunkCount: chunksWithEmbeddings.length
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/documents/:id (Ubah metadata / status / aktifkan / nonaktifkan)
app.patch('/api/documents/:id', async (req, res) => {
  try {
    const updated = await dbStore.updateDocument(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Dokumen tidak ditemukan' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/documents/:id
app.delete('/api/documents/:id', async (req, res) => {
  try {
    await dbStore.deleteDocument(req.params.id);
    res.json({ success: true, message: 'Dokumen berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/documents/:id/reindex (Indeks ulang dokumen FR-11)
app.post('/api/documents/:id/reindex', async (req, res) => {
  try {
    const doc = await dbStore.getDocumentById(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Dokumen tidak ditemukan' });
    }

    const job = await dbStore.createJob(doc.id, doc.page_count || 1);
    
    // Perbarui embedding untuk setiap chunk
    for (const chunk of (doc.chunks || [])) {
      chunk.embedding = await getEmbedding(chunk.content);
    }

    await dbStore.updateJob(job.id, {
      status: 'ready',
      finished_at: new Date().toISOString(),
      pages_done: doc.page_count || 1
    });

    res.json({ success: true, message: 'Indeks ulang berhasil diselesaikan', jobId: job.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/documents/:id/file (URL file PDF atau redirect)
app.get('/api/documents/:id/file', async (req, res) => {
  try {
    const doc = await dbStore.getDocumentById(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Dokumen tidak ditemukan' });
    }

    // Jika storage_path adalah URL cloud (Supabase)
    if (doc.storage_path && (doc.storage_path.startsWith('http://') || doc.storage_path.startsWith('https://'))) {
      return res.redirect(doc.storage_path);
    }

    if (doc.storage_path && doc.storage_path.startsWith('/uploads/')) {
      const cleanRel = doc.storage_path.replace(/^\/+/, '');
      const filePath = path.join(__dirname, cleanRel);
      if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(path.basename(filePath))}"`);
        return res.sendFile(filePath);
      }

      // Fallback cerdas: jika file lokal tidak ada di VPS, arahkan ke Supabase Storage
      const filename = path.basename(filePath);
      const supabaseFallback = `${supabaseUrl}/storage/v1/object/public/documents/${encodeURIComponent(filename)}`;
      return res.redirect(supabaseFallback);
    }

    // Fallback lainnya
    if (doc.storage_path) {
      return res.redirect(doc.storage_path);
    }
    res.status(404).json({ error: 'Berkas PDF tidak ditemukan' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/jobs/:id
app.get('/api/jobs/:id', async (req, res) => {
  const job = await dbStore.getJob(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'Job tidak ditemukan' });
  }
  res.json(job);
});

// ==============================================================================
// 4. Pencarian Semantik & RAG (FR-20 s/d FR-33)
// ==============================================================================
// POST /api/search
app.post('/api/search', async (req, res) => {
  const startTime = Date.now();
  try {
    const { query, filters = {}, topK = 8 } = req.body;
    if (!query || query.trim() === '') {
      return res.status(400).json({ error: 'Query pencarian tidak boleh kosong' });
    }

    // Dapatkan embedding vektor pertanyaan
    const queryVector = await getEmbedding(query);

    // Cari chunk relevan
    const rawResults = await dbStore.searchChunks({
      query,
      embedding: queryVector,
      filters,
      topK
    });

    const latencyMs = Date.now() - startTime;
    const topScore = rawResults.length > 0 ? rawResults[0].similarity : 0;
    const answered = rawResults.length > 0 && topScore >= 0.50;

    // Catat log pencarian (FR-44, Analitik)
    const log = await dbStore.logSearch({
      userId: req.body.userId,
      queryText: query,
      filters,
      resultsCount: rawResults.length,
      topScore,
      answered,
      latencyMs
    });

    // Format respons sesuai kontrak API PRD Section 11
    const results = rawResults.map(r => ({
      chunkId: r.chunk_id,
      documentId: r.document_id,
      documentTitle: r.document_title,
      category: r.category_name,
      pageNumber: r.page_number,
      sectionTitle: r.section_title || '',
      snippet: r.content,
      similarity: r.similarity,
      viewerUrl: `/viewer/${r.document_id}?page=${r.page_number}&q=${encodeURIComponent(query)}`
    }));

    res.json({
      searchId: log.id,
      latencyMs,
      resultsCount: results.length,
      answered,
      results
    });
  } catch (error) {
    console.error('Error during search:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/answer (RAG Answer Generation dengan sitasi)
app.post('/api/answer', async (req, res) => {
  try {
    const { query, results } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query wajib disertakan' });
    }

    const { answer, citations } = await generateRagAnswer(query, results || []);
    res.json({
      query,
      answer,
      citations
    });
  } catch (error) {
    console.error('Error generating answer:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/answer/stream (RAG Answer Generation dengan Streaming SSE)
app.post('/api/answer/stream', async (req, res) => {
  try {
    const { query, results } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query wajib disertakan' });
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    // Ekstraksi citations awal
    const citations = (results || []).slice(0, 5).map(chunk => ({
      chunkId: chunk.chunk_id || chunk.chunkId,
      documentId: chunk.document_id || chunk.documentId,
      documentTitle: chunk.document_title || chunk.documentTitle,
      pageNumber: chunk.page_number || chunk.pageNumber,
      sectionTitle: chunk.section_title || chunk.sectionTitle || '',
      snippet: (chunk.content || chunk.snippet || '').substring(0, 320)
    }));

    // Kirim sitasi referensi terlebih dahulu
    res.write(`data: ${JSON.stringify({ type: 'citations', citations })}\n\n`);

    // Stream token secara real-time
    const { answer } = await generateRagAnswerStream(query, results || [], (token) => {
      res.write(`data: ${JSON.stringify({ type: 'token', token })}\n\n`);
    });

    res.write(`data: ${JSON.stringify({ type: 'done', answer, citations })}\n\n`);
    res.end();
  } catch (error) {
    console.error('Error during streaming answer:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
      res.end();
    }
  }
});

// ==============================================================================
// 5. Feedback & Analitik
// ==============================================================================
// POST /api/feedback
app.post('/api/feedback', async (req, res) => {
  try {
    const { searchLogId, chunkId, isHelpful, comment, userId } = req.body;
    const fb = await dbStore.addFeedback({
      searchLogId,
      chunkId,
      isHelpful: !!isHelpful,
      comment,
      userId
    });
    res.json({ success: true, feedback: fb });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/analytics/summary
app.get('/api/analytics/summary', async (req, res) => {
  try {
    const summary = await dbStore.getAnalyticsSummary();
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/analytics/unanswered
app.get('/api/analytics/unanswered', async (req, res) => {
  try {
    const unanswered = await dbStore.getUnansweredQueries();
    res.json(unanswered);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/suggested-queries (Daftar pertanyaan populer dinamis sesuai dokumen aktif)
app.get('/api/suggested-queries', async (req, res) => {
  try {
    const docs = await dbStore.getDocuments();
    const suggestions = [];

    // 1. Ambil dari riwayat penelusuran nyata yang berhasil dijawab
    const logs = dbStore.searchLogs || [];
    logs
      .filter(l => l.answered && l.query_text && l.query_text.trim().length > 5)
      .slice(0, 5)
      .forEach(l => {
        const q = l.query_text.trim();
        if (!suggestions.includes(q)) {
          suggestions.push(q);
        }
      });

    // 2. Ekstrak pertanyaan kontekstual dari dokumen nyata yang terunggah di korpus
    docs.forEach(doc => {
      const cat = (doc.category_name || '').toLowerCase();
      const rawTitle = (doc.title || '').replace(/^\d+[\s._-]+/, '').trim(); // Hilangkan prefix angka seperti '23 ', '01 '
      if (!rawTitle) return;

      if (cat.includes('kebijakan') || rawTitle.toLowerCase().includes('kebijakan')) {
        suggestions.push('Apa luas lingkup penjaminan mutu SPMI di STIKOM Yos Sudarso?');
        suggestions.push('Statuta dan landasan hukum yang dirujuk dalam Kebijakan SPMI');
      } else if (cat.includes('manual') || rawTitle.toLowerCase().includes('manual')) {
        suggestions.push('Bagaimana prosedur audit mutu internal (AMI) dan siklus PPEPP?');
      } else if (cat.includes('standar') || rawTitle.toLowerCase().includes('standar')) {
        suggestions.push(`Apa saja standar mutu yang diatur dalam ${rawTitle}?`);
      } else if (cat.includes('sop') || rawTitle.toLowerCase().includes('sop')) {
        suggestions.push(`Bagaimana alur dan prosedur baku dalam ${rawTitle}?`);
      } else if (rawTitle.toLowerCase().includes('rip') || rawTitle.toLowerCase().includes('peta jalan')) {
        suggestions.push(`Bagaimana arah sasaran dan tahapan dalam ${rawTitle}?`);
      } else if (cat.includes('pedoman') || rawTitle.toLowerCase().includes('pedoman')) {
        suggestions.push(`Ketentuan dan tata tertib yang diatur dalam ${rawTitle}`);
      } else if (cat.includes('formulir') || rawTitle.toLowerCase().includes('instrumen')) {
        suggestions.push(`Format borang dan instrumen dalam ${rawTitle}`);
      } else {
        suggestions.push(`Ketentuan dan isi dokumen ${rawTitle}`);
      }
    });

    // 3. Fallback jika korpus kosong
    if (suggestions.length === 0) {
      suggestions.push(
        'aturan pemberian reward dan insentif publikasi dosen',
        'syarat angka kredit kenaikan jabatan ke Lektor 200',
        'prosedur audit mutu internal AMI dan siklus PPEPP'
      );
    }

    const unique = [...new Set(suggestions)].slice(0, 6);
    res.json(unique);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==============================================================================
// 5. Frontend Static Serving (Production / Docker / Coolify)
// ==============================================================================
const clientDist = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
  console.log('🌐 Frontend static build dimuat dari:', clientDist);
}

// Start Express Server
app.listen(PORT, () => {
  console.log(`🚀 Server SANDI (STIKOM Yos Sudarso) aktif di port ${PORT}`);
  console.log(`📡 URL API: http://localhost:${PORT}/api/health`);
});
