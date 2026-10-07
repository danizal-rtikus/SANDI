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
import { getEmbedding, generateRagAnswer } from './services/ai.js';

// Pastikan direktori uploads tersedia
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

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
    supabaseUrl: process.env.SUPABASE_URL || 'https://fznhvuyplojsvcodxfkk.supabase.co',
    isSupabaseLive: dbStore.isSupabaseLive,
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
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

    // Simpan file secara lokal
    fs.writeFileSync(localFilePath, fileBuffer);
    const storagePath = `/uploads/${filename}`;

    // Coba upload ke Supabase Storage jika bucket tersedia
    try {
      await supabase.storage.from('documents').upload(filename, fileBuffer, {
        contentType: 'application/pdf',
        upsert: true
      });
    } catch (e) {
      // lanjut dengan storage lokal
    }

    // Buat job indeksasi
    const job = await dbStore.createJob(docId, 0);

    // Ekstraksi teks per halaman & chunking
    const parsed = await processPdfBuffer(fileBuffer, title);
    await dbStore.updateJob(job.id, {
      status: 'extracting',
      pages_total: parsed.pageCount
    });

    // Proses embedding untuk setiap chunk
    const chunksWithEmbeddings = [];
    for (let i = 0; i < parsed.chunks.length; i++) {
      const c = parsed.chunks[i];
      const embedding = await getEmbedding(c.embedding_input || c.content);
      chunksWithEmbeddings.push({
        ...c,
        embedding,
        embedding_model: 'gemini-embedding-001@768'
      });
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

    if (doc.storage_path && doc.storage_path.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, doc.storage_path);
      if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
      }
    }

    // Jika file eksternal di Supabase
    res.json({ url: doc.storage_path });
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

// Start Express Server
app.listen(PORT, () => {
  console.log(`🚀 Server SANDI (STIKOM Yos Sudarso) aktif di port ${PORT}`);
  console.log(`📡 URL API: http://localhost:${PORT}/api/health`);
});
