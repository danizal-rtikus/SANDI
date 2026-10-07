# SANDI (Sistem Arsip & Navigasi Dokumen Internal)
### STIKOM Yos Sudarso, Purwokerto

**SANDI** adalah platform cerdas *Semantic Search* dan *Retrieval-Augmented Generation* (RAG) untuk penelusuran dokumen SPMI (Sistem Penjaminan Mutu Internal) seperti buku pedoman, standar mutu, SOP, manual, dan kebijakan di lingkungan kampus STIKOM Yos Sudarso.

Dibangun berdasarkan spesifikasi PRD SIRENA-RAG, sistem ini memungkinkan civitas akademika (dosen, asesor akreditasi, auditor, dan tim LPM) untuk menanyakan aturan dalam bahasa alami sehari-hari dan langsung mendapatkan rujukan nomor dokumen, pasal, kutipan teks, serta membuka berkas PDF tepat pada nomor halaman terkait.

---

## 🌟 Fitur Utama (Sesuai PRD)

1. **Pencarian Semantik (Semantic Search)**
   - Menerima pertanyaan bahasa alami (Indonesia & Inggris).
   - Menghasilkan rujukan dokumen yang relevan berdasarkan kedekatan makna (*cosine similarity* pada vektor 768 dimensi), bukan sekadar kecocokan kata kunci.
   - Hasil pencarian menampilkan: **Judul Dokumen, Nomor Halaman, Bab/Pasal, Skor Relevansi, dan Kutipan Teks**.

2. **RAG Bersitasi (Grounded AI Answers)**
   - Merangkum jawaban ringkas langsung dari dokumen SPMI internal yang terindeks.
   - Menyertakan tombol sitasi resmi `[Nama Dokumen, hlm. X]`.
   - Menghindari halusinasi; jika informasi belum diatur dalam dokumen, sistem secara eksplisit memberitahukan bahwa ketentuan belum ditemukan.

3. **PDF Viewer Presisi (Page-Jump & Snippet Highlight)**
   - Tombol **Buka PDF (hlm. X)** langsung membuka viewer pada halaman dokumen yang bersangkutan.
   - Dilengkapi callout kutipan tersorot, panel metadata (nomor SK, versi, checksum SHA-256), dan tombol salin sitasi audit.

4. **Pipeline Ingest & Indeksasi Otomatis (Admin Mutu)**
   - Upload PDF hingga 50 MB dengan deteksi duplikat otomatis via **Checksum SHA-256**.
   - Ekstraksi teks per halaman dengan deteksi scan / halaman kosong (*noise*).
   - Pemecahan chunking kontekstual (~700 token per sub-chunk, overlap ~80 token) dengan awalan judul dokumen.
   - Batch vector embedding 768 dimensi.
   - Dukungan versi dokumen baru (*superseded document*).

5. **Dasbor Analitik & Audit Mutu**
   - Pemantauan KPI: Dokumen Terbit, Total Chunk pgvector, Total Pencarian, Rasio Kepuasan.
   - **Pertanyaan Tanpa Hasil (*Unanswered Queries*)**: Membantu tim Lembaga Penjaminan Mutu (LPM) mendeteksi ketentuan apa yang sering ditanyakan namun belum tertuang dalam dokumen resmi.
   - Log riwayat pencarian terbaru beserta durasi latensi.
   - Umpan balik pengguna (Jempol 👍 / 👎).

6. **Integrasi Supabase & Database Terstandar**
   - Skema PostgreSQL + ekstensi `vector` (pgvector) + `pg_trgm`.
   - Index HNSW untuk pencarian vektor secepat kilat.
   - RPC function `match_chunks` & `hybrid_search_chunks` (RRF - Reciprocal Rank Fusion).

---

## 🚀 Panduan Menjalankan Sistem

### 1. Prasyarat
- **Node.js** v18+ atau v20+ (Telah teruji pada Node v24)
- **npm** v9+

### 2. Instalasi Dependensi
Jalankan perintah berikut di direktori root project:
```bash
# Instal dependensi backend & frontend
npm run install:all
```

### 3. Konfigurasi Lingkungan (.env)
File konfigurasi backend berada di `server/.env`:
```env
PORT=5000

# Supabase Credentials (STIKOM Yos Sudarso)
SUPABASE_URL=https://fznhvuyplojsvcodxfkk.supabase.co
SUPABASE_ANON_KEY=sb_publishable_8kuEfbZU64XFihkNdDI7gQ_jpRHGc6e
SUPABASE_SERVICE_ROLE_KEY=

# Opsional: Google Gemini AI (Untuk live embedding & generative answer)
GEMINI_API_KEY=
GEMINI_EMBEDDING_MODEL=text-embedding-004
GEMINI_GENERATION_MODEL=gemini-1.5-flash
```

*(Catatan: Jika `GEMINI_API_KEY` belum diisi, sistem secara otomatis menjalankan mesin vektor semantik lokal dan perangkum cerdas, sehingga seluruh fitur aplikasi dapat langsung digunakan tanpa kendala!)*

### 4. Menjalankan Aplikasi
Cukup jalankan satu perintah:
```bash
npm run dev
```
Aplikasi akan membuka:
- **Frontend Web App:** `http://localhost:5173`
- **Backend API Server:** `http://localhost:5000`

---

## 🗄️ Menjalankan Migrasi Database di Supabase

Untuk menerapkan tabel dan fungsi pgvector di proyek Supabase Anda (`https://fznhvuyplojsvcodxfkk.supabase.co`):
1. Buka [Supabase Dashboard > SQL Editor](https://supabase.com/dashboard/project/fznhvuyplojsvcodxfkk/sql).
2. Salin isi berkas `supabase/schema.sql` (atau gunakan tombol *Salin Skrip SQL* di tab **Supabase** pada aplikasi).
3. Tempel di SQL Editor dan klik tombol **Run**.

Seluruh tabel (`documents`, `document_chunks`, `document_categories`, `search_logs`, `search_feedback`, `ingestion_jobs`) dan fungsi RPC `match_chunks` akan langsung aktif.

---

## 🏛️ Struktur Direktori Proyek

```
SANDI/
├── client/                     # Frontend (React 18 + Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx              # Navigasi, Simulasi Role & Dark/Light Mode
│   │   │   ├── SemanticSearch.jsx      # Penelusuran Semantik & RAG Response
│   │   │   ├── DocumentArchive.jsx     # Katalog Berkas Dokumen SPMI
│   │   │   ├── IngestionUploader.jsx   # Upload PDF & Pipeline Visualizer
│   │   │   ├── AnalyticsDashboard.jsx  # Dasbor Analitik & Pertanyaan Tanpa Hasil
│   │   │   ├── SupabaseConfigGuide.jsx # Panduan Integrasi Supabase
│   │   │   └── PdfViewerModal.jsx      # Viewer Dokumen & Penyorot Kutipan
│   │   ├── App.jsx                     # Aplikasi Utama
│   │   ├── index.css                   # Master Styling & Design System
│   │   └── main.jsx
│   ├── vite.config.js                  # Konfigurasi Vite & Proxy API
│   └── package.json
│
├── server/                     # Backend API (Node.js + Express)
│   ├── services/
│   │   ├── ai.js                       # Gemini API & Vectorizer Engine
│   │   ├── pdfProcessor.js             # SHA-256, Ekstraksi Halaman & Chunking
│   │   └── supabase.js                 # Klien Supabase & Fallback Store
│   ├── sampleData.js                   # Dokumen SPMI Awal (STIKOM Yos Sudarso)
│   ├── uploads/                        # Direktori Penyimpanan Berkas PDF
│   ├── index.js                        # REST API Controller & Routes
│   └── package.json
│
├── supabase/
│   └── schema.sql                      # SQL Migration Script (pgvector & RPC)
│
├── start-dev.js                # Skrip peluncur dev terpadu
├── package.json                # Root package.json
└── README.md
```

---

## 👥 Pengembang & Institusi
- **Pengembang:** Danizal / Tim Pengembang Sistem Informasi
- **Institusi:** STIKOM Yos Sudarso, Purwokerto
- **Unit Penanggung Jawab:** Lembaga Penjaminan Mutu (LPM)
- **Repositori:** [github.com/danizal-rtikus/SANDI.git](https://github.com/danizal-rtikus/SANDI.git)
