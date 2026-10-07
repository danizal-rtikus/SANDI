# PRD SIRENA-RAG: Semantic Search & Tanya-Jawab Dokumen SPMI

**Produk:** Modul RAG + Semantic Search untuk SIRENA (Sistem Penjaminan Mutu Internal) **Institusi:** STIKOM Yos Sudarso, Purwokerto **Versi:** 1.0 (Draft) **Tanggal:** 7 Oktober 2026 **Penyusun:** Dhany

## 1. Ringkasan

SIRENA-RAG adalah fitur pencarian berbasis makna (semantic search) yang digabung dengan RAG di atas kumpulan dokumen SPMI (kebijakan, manual, standar, SOP, pedoman SDM, dan sejenisnya). Pengguna bertanya dengan bahasa natural, misalnya "kalau dalam pemberian reward dosen itu diatur dimana?". Sistem memahami maksud pertanyaan, menemukan potongan teks yang paling relevan, lalu menampilkan **dokumen mana, halaman berapa, dan kutipan teksnya**. Pengguna dapat langsung membuka PDF pada halaman tersebut. Opsional, sistem merangkum jawaban dalam beberapa kalimat dengan sitasi ke halaman sumber.

## 2. Latar Belakang dan Masalah

- Dokumen SPMI jumlahnya banyak dan tebal. Mencari satu ketentuan secara manual memakan waktu.
- Pencarian kata kunci (Ctrl+F) gagal bila istilah pengguna berbeda dengan istilah dokumen ("reward dosen" vs "penghargaan", "insentif", "apresiasi kinerja").
- Saat akreditasi atau audit mutu internal, asesor perlu bukti cepat: *aturan ini ada di dokumen apa, halaman berapa*.
- Pengetahuan tentang isi dokumen cenderung terpusat pada beberapa orang di unit penjaminan mutu.

## 3. Tujuan dan Non-Tujuan

### 3.1 Tujuan

1. Pengguna menemukan bagian dokumen yang relevan hanya dengan bertanya secara natural.
2. Setiap hasil selalu menyertakan **judul dokumen, nomor halaman, dan kutipan** sehingga dapat diverifikasi.
3. Tombol "Buka di PDF" melompat langsung ke halaman terkait.
4. Admin mutu dapat mengunggah, memperbarui, dan menonaktifkan dokumen tanpa bantuan developer.
5. Memakai infrastruktur yang sudah ada (Supabase + pgvector, Node.js, React/Vite), tanpa layanan database tambahan.

### 3.2 Non-Tujuan (fase 1)

- Bukan chatbot umum. Jawaban hanya berasal dari dokumen yang diindeks.
- Tidak mengubah atau mengedit dokumen sumber.
- Tidak mendukung format selain PDF (DOCX/XLSX masuk fase berikutnya).
- Tidak ada percakapan multi-turn yang kompleks. Fase 1 fokus pada satu pertanyaan, satu hasil.

## 4. Pengguna dan Peran

| Peran | Kebutuhan utama | Hak akses |
| --- | --- | --- |
| Asesor / Auditor | Mencari bukti aturan dan halaman sumbernya | Cari dan baca dokumen berstatus `published` |
| Dosen / Tendik | Mengetahui aturan (reward, cuti, beban kerja, dll.) | Cari dan baca dokumen sesuai level akses |
| Admin Mutu (LPM/SPMI) | Mengelola korpus dokumen | Unggah, edit metadata, indeks ulang, nonaktifkan, lihat analitik |
| Super Admin | Konfigurasi sistem | Semua hak akses, termasuk pengaturan model dan kuota |

Autentikasi memakai **Google Workspace SSO yang dibatasi domain institusi**, sama seperti sistem lain di kampus.

## 5. User Stories

- Sebagai **dosen**, saya ingin bertanya "syarat kenaikan jabatan fungsional" dan langsung melihat halaman pedoman yang mengaturnya.
- Sebagai **asesor**, saya ingin melihat beberapa kandidat sumber beserta skor kemiripannya, agar saya bisa menilai mana yang paling tepat.
- Sebagai **asesor**, saya ingin membuka PDF langsung di halaman 14 tanpa menggulir manual.
- Sebagai **admin mutu**, saya ingin mengunggah revisi dokumen dan memastikan versi lama tidak muncul di hasil pencarian.
- Sebagai **admin mutu**, saya ingin tahu pertanyaan apa yang tidak ditemukan jawabannya, sebagai masukan untuk melengkapi dokumen.
- Sebagai **pengguna**, saya ingin menandai hasil "membantu" atau "tidak relevan" agar kualitas pencarian membaik.

## 6. Ruang Lingkup Fitur

### 6.1 Fase 1 (MVP)

- Unggah PDF dan pipeline indeksasi otomatis (ekstraksi, chunking per halaman, embedding, simpan).
- Semantic search dengan hasil berupa kartu: judul dokumen, nomor halaman, kutipan, skor.
- PDF viewer dengan lompat ke halaman dan penyorotan kutipan.
- Filter berdasarkan kategori dokumen dan tahun/versi.
- Manajemen dokumen (daftar, status, indeks ulang, nonaktifkan).
- Log pencarian dan umpan balik pengguna.

### 6.2 Fase 2

- Jawaban ringkas hasil RAG (LLM) lengkap dengan sitasi `[Dokumen, hlm. X]`.
- Hybrid search (semantic + full-text) dengan Reciprocal Rank Fusion.
- OCR otomatis untuk PDF hasil scan.
- Dasbor analitik (pertanyaan populer, pertanyaan tanpa hasil).

### 6.3 Fase 3

- Dukungan DOCX dan XLSX, serta chat multi-turn.
- Reranking dan evaluasi kualitas otomatis.
- Integrasi tautan bukti ke modul akreditasi SIRENA.

## 7. Kebutuhan Fungsional

### 7.1 Ingest Dokumen

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-01 | Admin dapat mengunggah PDF (maks. 50 MB) beserta metadata: judul, kategori, nomor dokumen, tahun, versi, level akses | Wajib |
| FR-02 | File disimpan di Supabase Storage; sistem menghitung checksum SHA-256 untuk mencegah duplikat | Wajib |
| FR-03 | Backend mengekstrak teks per halaman (`pdf-parse` atau `pdfjs-dist`) | Wajib |
| FR-04 | Halaman dengan teks hampir kosong ditandai sebagai kandidat scan dan diproses OCR (Fase 2) atau ditandai `needs_ocr` | Wajib |
| FR-05 | Teks dibersihkan (header/footer berulang, nomor halaman, spasi ganda) sebelum embedding | Wajib |
| FR-06 | Chunking per halaman. Halaman yang melebihi ±700 token dipecah menjadi sub-chunk dengan overlap ±80 token dan tetap membawa `page_number` yang sama | Wajib |
| FR-07 | Setiap chunk membawa metadata `document_id`, `document_title`, `page_number`, `chunk_index` | Wajib |
| FR-08 | Embedding dibuat secara batch, dengan retry dan backoff bila terkena rate limit | Wajib |
| FR-09 | Status pemrosesan terlihat (`queued`, `extracting`, `embedding`, `ready`, `failed`) beserta pesan error | Wajib |
| FR-10 | Unggah versi baru dokumen: versi lama otomatis berstatus `superseded` dan tidak ikut pencarian | Wajib |
| FR-11 | Admin dapat melakukan indeks ulang (misalnya setelah ganti model embedding) | Sebaiknya |

### 7.2 Pencarian

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-20 | Kolom pencarian menerima pertanyaan bahasa natural (Indonesia dan Inggris) | Wajib |
| FR-21 | Backend mengubah pertanyaan menjadi vektor lalu memanggil fungsi `match_chunks` di Supabase (cosine similarity) | Wajib |
| FR-22 | Hasil: top-K chunk (default 8) di atas ambang kemiripan minimum yang dapat dikonfigurasi | Wajib |
| FR-23 | Hasil dikelompokkan per dokumen, menampilkan halaman terbaik per dokumen dan halaman lain yang relevan | Sebaiknya |
| FR-24 | Filter kategori, tahun, dan dokumen tertentu | Wajib |
| FR-25 | Bila tidak ada hasil di atas ambang, tampilkan pesan "tidak ditemukan" dan catat sebagai *unanswered query* | Wajib |
| FR-26 | Hanya dokumen `published` dan `is_active` yang dapat dicari, sesuai level akses pengguna | Wajib |
| FR-27 | Hybrid search (semantic + full-text) dengan RRF | Fase 2 |

### 7.3 Jawaban RAG (Fase 2)

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-30 | LLM menyusun jawaban ringkas **hanya** dari chunk hasil retrieval | Wajib |
| FR-31 | Setiap pernyataan disertai sitasi `[Judul Dokumen, hlm. X]` yang dapat diklik | Wajib |
| FR-32 | Jika konteks tidak cukup, model menjawab bahwa informasi tidak ditemukan dan tidak mengarang | Wajib |
| FR-33 | Jawaban di-*stream* ke antarmuka agar terasa cepat | Sebaiknya |

### 7.4 Antarmuka

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-40 | Kartu hasil: judul dokumen, kategori, nomor halaman, kutipan dengan kata kunci tersorot, skor relevansi | Wajib |
| FR-41 | Tombol **Buka PDF** membuka viewer pada halaman terkait (`#page=N` atau `react-pdf` dengan `pageNumber`) | Wajib |
| FR-42 | Viewer dapat menyorot teks kutipan pada halaman | Sebaiknya |
| FR-43 | Tombol umpan balik 👍/👎 per hasil | Wajib |
| FR-44 | Riwayat pencarian pribadi | Sebaiknya |
| FR-45 | Halaman admin: daftar dokumen, status indeks, unggah, nonaktifkan, indeks ulang | Wajib |

## 8. Kebutuhan Non-Fungsional

| Aspek | Target |
| --- | --- |
| Performa pencarian | p95 ≤ 2 detik untuk semantic search; ≤ 6 detik hingga jawaban RAG selesai |
| Skala awal | ±200 dokumen, ±20.000 chunk; desain tetap nyaman hingga ±500.000 chunk |
| Akurasi | Recall@5 ≥ 85% pada set evaluasi 50 pertanyaan yang disusun tim mutu |
| Keamanan | SSO domain institusi, Row Level Security, API key AI hanya di backend, HTTPS |
| Privasi | Hanya teks dokumen yang dikirim ke API AI; dokumen berlevel akses `internal-terbatas` perlu persetujuan sebelum diindeks via API eksternal |
| Ketersediaan | Mengikuti SLA VPS; kegagalan API AI tidak boleh merusak data indeks (idempoten, dapat dilanjutkan) |
| Auditabilitas | Seluruh unggahan, perubahan status, dan pencarian tercatat |
| Biaya | Embedding dilakukan sekali per chunk; query di-cache bila identik dalam 24 jam |

## 9. Arsitektur

```
React/Vite (Frontend)
   │  Google SSO (Supabase Auth)
   ▼
Node.js API (Express/Fastify)
   ├─ /documents  → unggah, ekstraksi, chunking, antrean embedding
   ├─ /search     → embed query → RPC match_chunks → hasil + metadata
   └─ /answer     → retrieval → LLM → jawaban + sitasi (Fase 2)
   │
   ├─► API AI: embedding (Gemini), generasi (Gemini/DeepSeek)
   ▼
Supabase (self-hosted via Coolify)
   ├─ PostgreSQL + pgvector (tabel, indeks HNSW, fungsi RPC)
   ├─ Storage (file PDF)
   └─ Auth (Google Workspace SSO)
```

### 9.1 Pemilihan Model

- **Embedding:** Gemini embedding (`gemini-embedding-001`) dengan dimensi output 768. Dimensi 768 menjaga ukuran indeks tetap ringan dengan kualitas yang memadai. Nama model dan dimensi **perlu diverifikasi di dokumentasi terbaru** sebelum implementasi.
- **Catatan DeepSeek:** sepengetahuan saya DeepSeek tidak menyediakan endpoint embedding, jadi DeepSeek hanya cocok untuk tahap generasi jawaban. Embedding tetap memakai Gemini.
- **Generasi jawaban:** Gemini Flash atau DeepSeek, dipilih lewat variabel lingkungan agar mudah diganti.
- **Penting:** vektor query dan vektor dokumen harus dibuat dengan model dan dimensi yang sama. Kolom `embedding_model` disimpan di setiap chunk agar migrasi model dapat dilacak.

### 9.2 Strategi Chunking

1. Satu halaman = satu chunk dasar, agar sitasi halaman selalu akurat.
2. Halaman panjang dipecah per paragraf/ayat hingga ±700 token, overlap ±80 token, tetap dengan `page_number` yang sama.
3. Teks yang dikirim untuk embedding diberi awalan konteks: `Judul Dokumen > Bab/Bagian\n\nisi teks`. Ini membantu pencarian bila halaman hanya berisi potongan pasal.
4. Halaman yang hanya berisi daftar isi, sampul, atau kosong diberi flag `is_noise` dan dikeluarkan dari pencarian.

## 10. Desain Database (Supabase / PostgreSQL)

### 10.1 Diagram Relasi (ringkas)

```
auth.users ─1:1─ profiles
document_categories ─1:N─ documents ─1:N─ document_chunks
documents ─1:N─ ingestion_jobs
profiles ─1:N─ search_logs ─1:N─ search_log_results ─N:1─ document_chunks
search_log_results ─1:N─ search_feedback
```

### 10.2 Skema SQL

```sql
-- Ekstensi
create extension if not exists vector;
create extension if not exists pg_trgm;

-- Enum
create type app_role as enum ('super_admin','admin_mutu','asesor','dosen');
create type doc_status as enum ('draft','processing','published','failed','superseded','archived');
create type access_level as enum ('publik_internal','internal_terbatas');
create type job_status as enum ('queued','extracting','embedding','ready','failed');

-- Profil pengguna (sinkron dengan auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role app_role not null default 'dosen',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Kategori dokumen (Kebijakan, Manual, Standar, SOP, Pedoman, dst.)
create table document_categories (
  id smallint generated always as identity primary key,
  name text not null unique,
  description text,
  sort_order smallint default 0
);

-- Dokumen
create table documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  doc_number text,
  category_id smallint references document_categories(id),
  year smallint,
  version text not null default '1.0',
  description text,
  access access_level not null default 'publik_internal',
  status doc_status not null default 'draft',
  is_active boolean not null default true,
  storage_path text not null,            -- path di Supabase Storage
  file_size_bytes bigint,
  checksum_sha256 text not null,
  page_count int,
  supersedes_id uuid references documents(id),
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (checksum_sha256)
);
create index on documents (status, is_active);
create index on documents (category_id, year);

-- Chunk per halaman + embedding
create table document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  page_number int not null,               -- halaman PDF (1-based)
  chunk_index int not null default 0,     -- urutan sub-chunk dalam halaman
  content text not null,
  token_count int,
  section_title text,                     -- bab/pasal bila terdeteksi
  is_noise boolean not null default false,
  ocr_used boolean not null default false,
  embedding vector(768),
  embedding_model text not null,          -- mis. 'gemini-embedding-001@768'
  fts tsvector generated always as (to_tsvector('simple', content)) stored,
  created_at timestamptz not null default now(),
  unique (document_id, page_number, chunk_index)
);
create index document_chunks_embedding_hnsw
  on document_chunks using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);
create index document_chunks_fts on document_chunks using gin (fts);
create index on document_chunks (document_id, page_number);

-- Job indeksasi
create table ingestion_jobs (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  status job_status not null default 'queued',
  pages_total int,
  pages_done int default 0,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);
create index on ingestion_jobs (document_id, created_at desc);

-- Log pencarian
create table search_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  query_text text not null,
  filters jsonb,
  results_count int not null default 0,
  top_score real,
  answered boolean,                       -- false bila tidak ada hasil di atas ambang
  latency_ms int,
  created_at timestamptz not null default now()
);
create index on search_logs (created_at desc);
create index on search_logs (answered, created_at desc);

create table search_log_results (
  id bigint generated always as identity primary key,
  search_log_id uuid not null references search_logs(id) on delete cascade,
  chunk_id uuid references document_chunks(id) on delete set null,
  rank smallint not null,
  score real not null
);
create index on search_log_results (search_log_id);

-- Umpan balik
create table search_feedback (
  id bigint generated always as identity primary key,
  search_log_id uuid not null references search_logs(id) on delete cascade,
  chunk_id uuid references document_chunks(id) on delete set null,
  user_id uuid references profiles(id) on delete set null,
  is_helpful boolean not null,
  comment text,
  created_at timestamptz not null default now()
);

-- Cache embedding query (opsional, hemat biaya)
create table query_embedding_cache (
  query_hash text primary key,            -- sha256 dari query ternormalisasi
  query_text text not null,
  embedding vector(768) not null,
  embedding_model text not null,
  created_at timestamptz not null default now()
);
```

### 10.3 Fungsi Pencarian (RPC)

```sql
-- Semantic search murni (cosine similarity)
create or replace function match_chunks(
  query_embedding vector(768),
  match_count int default 8,
  min_similarity float default 0.55,
  filter_category smallint default null,
  filter_year smallint default null,
  filter_document uuid default null
)
returns table (
  chunk_id uuid, document_id uuid, document_title text,
  category_name text, page_number int, content text, similarity float
)
language sql stable security invoker as $$
  select c.id, d.id, d.title, cat.name, c.page_number, c.content,
         1 - (c.embedding <=> query_embedding) as similarity
  from document_chunks c
  join documents d on d.id = c.document_id
  left join document_categories cat on cat.id = d.category_id
  where d.status = 'published' and d.is_active
    and not c.is_noise
    and (filter_category is null or d.category_id = filter_category)
    and (filter_year is null or d.year = filter_year)
    and (filter_document is null or d.id = filter_document)
    and 1 - (c.embedding <=> query_embedding) >= min_similarity
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- Hybrid search (Fase 2): semantic + full-text dengan Reciprocal Rank Fusion
create or replace function hybrid_search_chunks(
  query_text text,
  query_embedding vector(768),
  match_count int default 8,
  rrf_k int default 60
)
returns table (chunk_id uuid, document_id uuid, page_number int, content text, rrf_score float)
language sql stable security invoker as $$
  with sem as (
    select c.id, row_number() over (order by c.embedding <=> query_embedding) rnk
    from document_chunks c join documents d on d.id = c.document_id
    where d.status='published' and d.is_active and not c.is_noise
    order by c.embedding <=> query_embedding limit 30
  ),
  fts as (
    select c.id, row_number() over (order by ts_rank(c.fts, websearch_to_tsquery('simple', query_text)) desc) rnk
    from document_chunks c join documents d on d.id = c.document_id
    where d.status='published' and d.is_active and not c.is_noise
      and c.fts @@ websearch_to_tsquery('simple', query_text)
    limit 30
  ),
  fused as (
    select coalesce(s.id, f.id) id,
           coalesce(1.0/(rrf_k+s.rnk),0) + coalesce(1.0/(rrf_k+f.rnk),0) score
    from sem s full outer join fts f on s.id = f.id
  )
  select c.id, c.document_id, c.page_number, c.content, fused.score
  from fused join document_chunks c on c.id = fused.id
  order by fused.score desc limit match_count;
$$;
```

### 10.4 Row Level Security

```sql
alter table profiles enable row level security;
alter table documents enable row level security;
alter table document_chunks enable row level security;
alter table search_logs enable row level security;
alter table search_feedback enable row level security;

-- Fungsi bantu
create or replace function current_role_app() returns app_role
language sql stable security definer as $$
  select role from profiles where id = auth.uid() and is_active
$$;

-- Dokumen: pengguna aktif melihat dokumen published sesuai level akses
create policy docs_read on documents for select using (
  current_role_app() is not null and status = 'published' and is_active
  and (access = 'publik_internal'
       or current_role_app() in ('super_admin','admin_mutu','asesor'))
);
create policy docs_admin_all on documents for all
  using (current_role_app() in ('super_admin','admin_mutu'))
  with check (current_role_app() in ('super_admin','admin_mutu'));

-- Chunk: mengikuti aturan akses dokumen induk
create policy chunks_read on document_chunks for select using (
  exists (select 1 from documents d where d.id = document_id
          and d.status='published' and d.is_active
          and (d.access='publik_internal'
               or current_role_app() in ('super_admin','admin_mutu','asesor')))
);
-- Penulisan chunk hanya lewat service role (backend Node.js)

-- Log: pengguna hanya melihat miliknya; admin melihat semua
create policy logs_own on search_logs for select
  using (user_id = auth.uid() or current_role_app() in ('super_admin','admin_mutu'));
create policy feedback_own on search_feedback for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
```

Pembatasan domain email institusi diterapkan di konfigurasi Google OAuth Supabase dan diperkuat dengan trigger yang menolak pendaftaran selain domain kampus pada `auth.users`.

## 11. Spesifikasi API (Node.js)

| Endpoint | Metode | Peran | Deskripsi |
| --- | --- | --- | --- |
| `/api/documents` | POST | admin\_mutu | Unggah PDF + metadata, membuat `documents` dan `ingestion_jobs` |
| `/api/documents` | GET | semua | Daftar dokumen (admin melihat semua status) |
| `/api/documents/:id` | PATCH | admin\_mutu | Ubah metadata, status, atau aktif/nonaktif |
| `/api/documents/:id/reindex` | POST | admin\_mutu | Ulangi ekstraksi dan embedding |
| `/api/documents/:id/file` | GET | sesuai akses | URL bertanda tangan (signed URL) untuk viewer PDF |
| `/api/jobs/:id` | GET | admin\_mutu | Status dan progres indeksasi |
| `/api/search` | POST | semua | Body: `{query, filters, topK}` → daftar hasil |
| `/api/answer` | POST | semua | (Fase 2) Jawaban RAG + sitasi, mendukung streaming |
| `/api/feedback` | POST | semua | Kirim umpan balik hasil |
| `/api/analytics/unanswered` | GET | admin\_mutu | Pertanyaan tanpa hasil |

**Contoh respons `/api/search`:**

```json
{
  "searchId": "9f1c...",
  "results": [
    {
      "chunkId": "b7a2...",
      "documentId": "3c8e...",
      "documentTitle": "Buku Pedoman SDM",
      "category": "Pedoman",
      "pageNumber": 14,
      "snippet": "Dosen berprestasi berhak memperoleh penghargaan berupa ...",
      "similarity": 0.81,
      "viewerUrl": "/viewer/3c8e...?page=14&q=penghargaan"
    }
  ]
}
```

## 12. Alur Pemrosesan

### 12.1 Indeksasi

1. Admin mengunggah PDF, backend memvalidasi tipe/ukuran, menghitung checksum, lalu menyimpan ke Storage.
2. Record `documents` (status `processing`) dan `ingestion_jobs` (`queued`) dibuat.
3. Worker mengekstrak teks per halaman, mendeteksi halaman scan, membersihkan teks, lalu melakukan chunking.
4. Chunk dikirim ke API embedding secara batch dengan retry.
5. Chunk dan vektor disimpan ke `document_chunks`. Setelah seluruh halaman selesai, dokumen berstatus `published` dan job `ready`.
6. Jika ini versi baru, dokumen lama diubah menjadi `superseded`.

### 12.2 Pencarian

1. Pengguna mengetik pertanyaan di React.
2. Backend menormalisasi query, mengecek cache embedding, lalu membuat vektor query bila belum ada.
3. Backend memanggil `match_chunks` dengan token pengguna agar RLS berlaku.
4. Hasil diperkaya (judul, halaman, `viewerUrl`) dan dikirim ke frontend. Pencarian dicatat di `search_logs`.
5. Pengguna membuka PDF pada halaman terkait atau memberi umpan balik.

## 13. Rancangan Antarmuka

- **Halaman Cari:** kolom pencarian besar, filter (kategori, tahun, dokumen), daftar kartu hasil.
- **Kartu hasil:** judul dokumen, badge kategori, `Halaman 14`, kutipan dengan sorotan, indikator relevansi (Tinggi/Sedang), tombol **Buka PDF**, 👍/👎.
- **PDF Viewer:** panel samping atau layar penuh, otomatis ke halaman target, kutipan disorot, navigasi ke halaman lain yang relevan dari pencarian yang sama.
- **Admin Dokumen:** tabel dokumen dengan status indeks, progres bar, tombol unggah, indeks ulang, nonaktifkan.
- **Admin Analitik:** pertanyaan terbanyak, pertanyaan tanpa hasil, rasio umpan balik positif.

## 14. Metrik Keberhasilan

| Metrik | Target |
| --- | --- |
| Recall@5 pada set evaluasi 50 pertanyaan | ≥ 85% |
| Hasil teratas memuat halaman yang benar (top-1 page accuracy) | ≥ 65% |
| Umpan balik positif | ≥ 70% |
| Rasio pertanyaan tanpa hasil | ≤ 15% |
| Waktu menemukan aturan (dibanding manual) | Turun ≥ 70% |
| Pengguna aktif bulanan (dosen + asesor) | ≥ 40% dari pengguna SIRENA |

**Set evaluasi:** tim mutu menyusun 50 pertanyaan beserta dokumen dan halaman jawaban yang benar. Set ini dijalankan ulang setiap kali model, ambang, atau strategi chunking berubah.

## 15. Risiko dan Mitigasi

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| PDF hasil scan atau teks berantakan | Hasil buruk | Deteksi halaman kosong, OCR (Fase 2), flag `needs_ocr` di dasbor admin |
| Halaman jadi sitasi salah (nomor halaman PDF vs nomor cetak) | Bukti keliru | Simpan nomor halaman PDF fisik; pertimbangkan kolom `printed_page_label` bila perlu |
| LLM berhalusinasi | Informasi menyesatkan | Jawaban hanya dari konteks retrieval, wajib sitasi, tolak menjawab bila kurang konteks |
| Dokumen sensitif terkirim ke API eksternal | Isu kerahasiaan | Level akses, persetujuan sebelum indeks, opsi model lokal di masa depan |
| Biaya dan rate limit API | Indeksasi tertahan | Batching, retry, antrean, cache query |
| Ganti model embedding | Vektor tidak kompatibel | Kolom `embedding_model`, fitur indeks ulang |
| Istilah akademik dan singkatan lokal | Recall rendah | Hybrid search, daftar sinonim/glosarium, awalan konteks judul pada chunk |
| Dokumen versi lama masih muncul | Aturan kedaluwarsa dikutip | Status `superseded`, filter wajib `published` |

## 16. Rencana Rilis

| Tahap | Cakupan | Estimasi |
| --- | --- | --- |
| M0 | Skema database, RLS, bucket Storage, konfigurasi Auth SSO | 3 hari |
| M1 | Pipeline indeksasi (ekstraksi, chunking, embedding) + halaman admin dokumen | 1–1,5 minggu |
| M2 | Semantic search, kartu hasil, PDF viewer lompat halaman, log dan umpan balik | 1–1,5 minggu |
| M3 | UAT dengan tim mutu, penyusunan set evaluasi, tuning ambang dan chunking | 1 minggu |
| M4 (Fase 2) | Jawaban RAG bersitasi, hybrid search, OCR, dasbor analitik | 2–3 minggu |

## 17. Pertanyaan Terbuka

1. Apakah semua dokumen SPMI boleh diindeks via API eksternal, atau ada yang berlevel rahasia?
2. Berapa perkiraan jumlah dokumen dan total halaman awal? (menentukan estimasi biaya embedding)
3. Apakah SIRENA sudah punya tabel pengguna dan peran yang akan dipakai, atau memakai `profiles` baru?
4. Apakah perlu pemetaan hasil pencarian ke butir standar akreditasi (BAN-PT/LAM)?
5. Siapa yang menyusun set evaluasi 50 pertanyaan dan memvalidasi hasilnya?
6. Apakah hasil pencarian perlu dapat diekspor sebagai bukti (daftar dokumen dan halaman) untuk borang akreditasi?
