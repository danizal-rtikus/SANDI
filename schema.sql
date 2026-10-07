-- ==============================================================================
-- SANDI (Sistem Arsip & Navigasi Dokumen Internal) - STIKOM Yos Sudarso
-- Database Schema & Vector Search (pgvector)
-- ==============================================================================

-- 1. Ekstensi
create extension if not exists vector;
create extension if not exists pg_trgm;

-- 2. Tipe Enum
do $$ begin
  create type app_role as enum ('super_admin','admin_mutu','asesor','dosen');
exception when duplicate_object then null; end $$;

do $$ begin
  create type doc_status as enum ('draft','processing','published','failed','superseded','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type access_level as enum ('publik_internal','internal_terbatas');
exception when duplicate_object then null; end $$;

do $$ begin
  create type job_status as enum ('queued','extracting','embedding','ready','failed');
exception when duplicate_object then null; end $$;

-- 3. Tabel Profil Pengguna (Sinkronisasi auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role app_role not null default 'dosen',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 4. Kategori Dokumen SPMI
create table if not exists document_categories (
  id smallint generated always as identity primary key,
  name text not null unique,
  description text,
  sort_order smallint default 0
);

-- Seed kategori SPMI standar STIKOM Yos Sudarso
insert into document_categories (name, description, sort_order)
values
  ('Kebijakan SPMI', 'Dokumen kebijakan pokok penjaminan mutu STIKOM Yos Sudarso', 1),
  ('Manual Mutu', 'Petunjuk praktis tata kelola dan siklus PPEPP', 2),
  ('Standar SPMI', 'Kumpulan standar pendidikan, penelitian, pengabdian, dan tata pamong', 3),
  ('SOP (Prosedur Operasional)', 'Standar Operasional Prosedur untuk setiap unit dan layanan', 4),
  ('Pedoman SDM & Akademik', 'Pedoman kenaikan jabatan, remunerasi, penghargaan, dan etika', 5),
  ('Formulir & Instrumen', 'Format borang evaluasi, audit, dan verifikasi mutu', 6)
on conflict (name) do nothing;

-- 5. Tabel Dokumen
create table if not exists documents (
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
  storage_path text not null,            -- Path di Supabase Storage bucket 'documents'
  file_size_bytes bigint,
  checksum_sha256 text not null,
  page_count int,
  supersedes_id uuid references documents(id),
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (checksum_sha256)
);
create index if not exists idx_documents_status on documents (status, is_active);
create index if not exists idx_documents_cat_year on documents (category_id, year);

-- 6. Tabel Chunk & Vector Embedding (Dimensi 768 untuk Gemini text-embedding-004)
create table if not exists document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  page_number int not null,               -- Halaman PDF (1-based)
  chunk_index int not null default 0,     -- Urutan sub-chunk dalam halaman
  content text not null,
  token_count int,
  section_title text,                     -- Bab/Pasal bila terdeteksi
  is_noise boolean not null default false,
  ocr_used boolean not null default false,
  embedding vector(768),
  embedding_model text not null default 'gemini-embedding-001@768',
  fts tsvector generated always as (to_tsvector('simple', content)) stored,
  created_at timestamptz not null default now(),
  unique (document_id, page_number, chunk_index)
);

create index if not exists document_chunks_embedding_hnsw
  on document_chunks using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);
create index if not exists document_chunks_fts on document_chunks using gin (fts);
create index if not exists idx_chunks_doc_page on document_chunks (document_id, page_number);

-- 7. Antrean / Job Indeksasi Dokumen
create table if not exists ingestion_jobs (
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
create index if not exists idx_ingestion_jobs_doc on ingestion_jobs (document_id, created_at desc);

-- 8. Log Riwayat Pencarian
create table if not exists search_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  query_text text not null,
  filters jsonb,
  results_count int not null default 0,
  top_score real,
  answered boolean default true,
  latency_ms int,
  created_at timestamptz not null default now()
);
create index if not exists idx_search_logs_created on search_logs (created_at desc);
create index if not exists idx_search_logs_unanswered on search_logs (answered, created_at desc);

-- Tabel Detail Hasil Pencarian untuk Analitik
create table if not exists search_log_results (
  id bigint generated always as identity primary key,
  search_log_id uuid not null references search_logs(id) on delete cascade,
  chunk_id uuid references document_chunks(id) on delete set null,
  rank smallint not null,
  score real not null
);
create index if not exists idx_search_log_results_log on search_log_results (search_log_id);

-- 9. Umpan Balik Pengguna (Feedback 👍 / 👎)
create table if not exists search_feedback (
  id bigint generated always as identity primary key,
  search_log_id uuid not null references search_logs(id) on delete cascade,
  chunk_id uuid references document_chunks(id) on delete set null,
  user_id uuid references profiles(id) on delete set null,
  is_helpful boolean not null,
  comment text,
  created_at timestamptz not null default now()
);

-- 10. Cache Vektor Query (Efisiensi & Biaya API)
create table if not exists query_embedding_cache (
  query_hash text primary key,            -- sha256 dari teks pertanyaan
  query_text text not null,
  embedding vector(768) not null,
  embedding_model text not null,
  created_at timestamptz not null default now()
);

-- ==============================================================================
-- 11. Fungsi RPC Pencarian Vektor (Semantic Search)
-- ==============================================================================
create or replace function match_chunks(
  query_embedding vector(768),
  match_count int default 8,
  min_similarity float default 0.45,
  filter_category smallint default null,
  filter_year smallint default null,
  filter_document uuid default null
)
returns table (
  chunk_id uuid,
  document_id uuid,
  document_title text,
  category_name text,
  page_number int,
  content text,
  similarity float,
  section_title text
)
language sql stable security invoker as $$
  select 
    c.id as chunk_id,
    d.id as document_id,
    d.title as document_title,
    coalesce(cat.name, 'Umum') as category_name,
    c.page_number,
    c.content,
    (1 - (c.embedding <=> query_embedding)) as similarity,
    c.section_title
  from document_chunks c
  join documents d on d.id = c.document_id
  left join document_categories cat on cat.id = d.category_id
  where d.status = 'published' and d.is_active
    and not c.is_noise
    and (filter_category is null or d.category_id = filter_category)
    and (filter_year is null or d.year = filter_year)
    and (filter_document is null or d.id = filter_document)
    and (1 - (c.embedding <=> query_embedding)) >= min_similarity
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- Hybrid search: Kombinasi Semantic (pgvector) + Full Text Search (RRF)
create or replace function hybrid_search_chunks(
  query_text text,
  query_embedding vector(768),
  match_count int default 8,
  rrf_k int default 60
)
returns table (
  chunk_id uuid,
  document_id uuid,
  document_title text,
  category_name text,
  page_number int,
  content text,
  rrf_score float,
  section_title text
)
language sql stable security invoker as $$
  with sem as (
    select c.id, row_number() over (order by c.embedding <=> query_embedding) as rnk
    from document_chunks c 
    join documents d on d.id = c.document_id
    where d.status='published' and d.is_active and not c.is_noise
    order by c.embedding <=> query_embedding 
    limit 30
  ),
  fts as (
    select c.id, row_number() over (order by ts_rank(c.fts, websearch_to_tsquery('simple', query_text)) desc) as rnk
    from document_chunks c 
    join documents d on d.id = c.document_id
    where d.status='published' and d.is_active and not c.is_noise
      and c.fts @@ websearch_to_tsquery('simple', query_text)
    limit 30
  ),
  fused as (
    select coalesce(s.id, f.id) as id,
           coalesce(1.0/(rrf_k+s.rnk), 0.0) + coalesce(1.0/(rrf_k+f.rnk), 0.0) as score
    from sem s full outer join fts f on s.id = f.id
  )
  select 
    c.id as chunk_id, 
    c.document_id,
    d.title as document_title,
    coalesce(cat.name, 'Umum') as category_name,
    c.page_number, 
    c.content, 
    fused.score as rrf_score,
    c.section_title
  from fused 
  join document_chunks c on c.id = fused.id
  join documents d on d.id = c.document_id
  left join document_categories cat on cat.id = d.category_id
  order by fused.score desc 
  limit match_count;
$$;

-- ==============================================================================
-- 12. Storage Bucket Setup
-- ==============================================================================
insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do nothing;
