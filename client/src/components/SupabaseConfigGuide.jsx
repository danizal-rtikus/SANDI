import React, { useState } from 'react';
import { 
  Database, 
  Check, 
  Copy, 
  ExternalLink, 
  ShieldCheck, 
  Key, 
  Terminal, 
  Sparkles,
  Server
} from 'lucide-react';

export default function SupabaseConfigGuide({ onShowToast }) {
  const [copied, setCopied] = useState(false);

  const sqlSchemaSnippet = `-- Jalankan skrip ini di Supabase SQL Editor:
-- Project: https://fznhvuyplojsvcodxfkk.supabase.co

create extension if not exists vector;
create extension if not exists pg_trgm;

-- Enum Types
create type app_role as enum ('super_admin','admin_mutu','asesor','dosen');
create type doc_status as enum ('draft','processing','published','failed','superseded','archived');
create type access_level as enum ('publik_internal','internal_terbatas');
create type job_status as enum ('queued','extracting','embedding','ready','failed');

-- Kategori SPMI
create table if not exists document_categories (
  id smallint generated always as identity primary key,
  name text not null unique,
  description text,
  sort_order smallint default 0
);

-- Dokumen
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
  storage_path text not null,
  file_size_bytes bigint,
  checksum_sha256 text not null unique,
  page_count int,
  supersedes_id uuid references documents(id),
  created_at timestamptz not null default now()
);

-- Document Chunks & Vector (768-dim)
create table if not exists document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  page_number int not null,
  chunk_index int not null default 0,
  content text not null,
  token_count int,
  section_title text,
  is_noise boolean not null default false,
  embedding vector(768),
  embedding_model text not null default 'gemini-embedding-001@768',
  fts tsvector generated always as (to_tsvector('simple', content)) stored,
  created_at timestamptz not null default now(),
  unique (document_id, page_number, chunk_index)
);

-- HNSW Vector Index
create index if not exists document_chunks_embedding_hnsw
  on document_chunks using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- RPC match_chunks
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
$$;`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlSchemaSnippet);
    setCopied(true);
    onShowToast('Skrip SQL berhasil disalin ke clipboard!');
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div>
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.6rem', marginBottom: '0.35rem' }}>
          Integrasi Supabase & Konfigurasi Sistem
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          SANDI terhubung langsung dengan infrastruktur database PostgreSQL, ekstensi vektor (pgvector), dan penyimpanan cloud Supabase STIKOM Yos Sudarso.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Left: Connection Credentials */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Server size={18} color="var(--brand-primary)" />
              Detail Proyek Supabase
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-subtle)' }}>PROJECT URL</label>
                <div style={{ background: 'var(--bg-tertiary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.88rem', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  https://fznhvuyplojsvcodxfkk.supabase.co
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-subtle)' }}>PUBLISHABLE / ANON KEY</label>
                <div style={{ background: 'var(--bg-tertiary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.88rem', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  sb_publishable_8kuEfbZU64XFihkNdDI7gQ_jpRHGc6e
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-subtle)' }}>STATUS KONEKSI</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-emerald)' }}>
                    Terhubung & Siap Digunakan
                  </span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
              <a 
                href="https://supabase.com/dashboard/project/fznhvuyplojsvcodxfkk/sql" 
                target="_blank" 
                rel="noreferrer"
                className="btn-open-pdf"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <ExternalLink size={15} />
                Buka SQL Editor Supabase
              </a>
            </div>
          </div>

          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={18} color="var(--brand-primary)" />
              Spesifikasi Vektor & Embedding (PRD 9.1)
            </h3>
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.8 }}>
              <li><strong>Model Embedding:</strong> Gemini <code>text-embedding-004</code></li>
              <li><strong>Dimensi Output:</strong> 768 dimensi (ringan dan akurat)</li>
              <li><strong>Indeks Vektor:</strong> HNSW (<code>m = 16</code>, <code>ef_construction = 64</code>)</li>
              <li><strong>Fungsi Jarak:</strong> Cosine Similarity (<code>vector_cosine_ops</code>)</li>
              <li><strong>Fallback:</strong> Semantic Vectorizer lokal jika API key belum disetel</li>
            </ul>
          </div>
        </div>

        {/* Right: SQL Migration Code Block */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Terminal size={18} color="var(--brand-primary)" />
              <h3 style={{ fontSize: '1.1rem' }}>Skema SQL Lengkap (pgvector)</h3>
            </div>

            <button 
              className="btn-feedback"
              onClick={copyToClipboard}
              style={{ fontWeight: 700, color: copied ? 'var(--accent-emerald)' : 'inherit' }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Tersalin!' : 'Salin Skrip SQL'}
            </button>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Jalankan skrip berikut di <strong>Supabase Dashboard &gt; SQL Editor &gt; New Query &gt; Run</strong> untuk mengaktifkan tabel dan fungsi <code>match_chunks</code> secara permanen. File lengkap juga tersimpan di <code>supabase/schema.sql</code>.
          </p>

          <pre style={{ flex: 1, maxHeight: '420px', overflowY: 'auto', background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)', fontSize: '0.78rem', fontFamily: 'monospace', lineHeight: 1.5, border: '1px solid var(--border-light)' }}>
            {sqlSchemaSnippet}
          </pre>
        </div>
      </div>
    </div>
  );
}
