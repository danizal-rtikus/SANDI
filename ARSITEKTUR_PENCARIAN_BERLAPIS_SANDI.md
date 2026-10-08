# Cetak Biru Arsitektur Temu Balik Berlapis SANDI
**Sistem Arsip & Navigasi Dokumen Internal — STIKOM Yos Sudarso Purwokerto**

---

## 1. Latar Belakang & Pergeseran Paradigma

### 1.1 Permasalahan Pada Pendekatan Lama (*Chunk-First Retrieval*)
Pada implementasi awal sistem penelusuran dokumen mutu, pendekatan yang digunakan adalah pencarian berbasis potongan teks (*chunks*):
1. **Potongan Terfragmentasi:** Hasil pencarian menampilkan potongan-potongan halaman yang terpisah dan teracak antar-dokumen. Dosen, asesor, atau auditor mutu tidak mendapatkan gambaran payung hukum naskah secara utuh.
2. ***Sub-string False Positives*:** Pencocokan teks mentah tanpa batas kata utuh (*word boundary*) menimbulkan bias fatal:
   * Kata kunci `skripsi` mencocokkan kata `de[skripsi] jabatan` pada peraturan kekaryawanan yayasan.
   * Kata kunci `anggaran` mencocokkan kata `pel[anggaran] kode etik`.
   * Kata kunci singkatan `AMI` (Audit Mutu Internal) mencocokkan kata `k[ami]` atau tunjangan `su[ami]/istri`.
3. **Ketiadaan Bobot Subjek (IDF):** Kata umum administratif (seperti *aturan, pedoman, standar, surat*) membayangi kata subjek khusus (*skripsi, lektor, hibah, kurikulum, akreditasi*).

### 1.2 Paradigma Baru: "Cari Dokumen Lewat Chunk" (*Document-Centric Retrieval*)
Sistem beralih dari menyajikan sekadar potongan teks menjadi **menyajikan Naskah Dokumen Resmi sebagai entitas utama**, dengan halaman-halaman relevan yang terkelompok rapi di dalamnya:

```
[Pengguna Mencari Query]
        │
        ▼
[Pengambilan 30–50 Chunk Relevan Teratas]
        │
        ▼
[Agregasi & Pengelompokan Berbasis Dokumen]
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ 📁 Dokumen Utama: 13 Pedoman Pendidikan SYS 2025             │
│    Kategori: Pedoman Akademik • Status: Berlaku Aktif        │
│    ├─ 📄 Halaman 49: Syarat Beban Studi Minimal 110 SKS     │
│    ├─ 📄 Halaman 50: Prosedur Pengajuan & Batas Bimbingan    │
│    └─ 📄 Halaman 51: Ketentuan Ujian Akhir (Pendadaran)      │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Arsitektur 6 Lapisan (*Layered Retrieval Architecture*)

```
┌─────────────────────────────────────────────────────────────────┐
│ Layer 1: Normalisasi Query & Glosarium Akademik Kampus          │
│          (Stopwords Removal, Stemming, & Query Expansion)       │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 2: Hybrid Dual-Engine Retrieval                           │
│          ├─ Jalur A: Lexical BM25 (Strict Word Boundary \b)     │
│          └─ Jalur B: Semantic Vector Search (Cosine Similarity) │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 3: Penggabungan Peringkat RRF (Reciprocal Rank Fusion)    │
│          RRF_Score = 1/(60 + Rank_BM25) + 1/(60 + Rank_Vec)     │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 4: Agregasi Tingkat Dokumen (Document-Level Aggregation)  │
│          Score(Doc) = Max(Chunk_Score) + α * Σ(Other_Chunks)    │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 5: Reranking Ringan & Metadata Filtering                 │
│          (Filter Kategori, Tahun, & Verifikasi Klausul Relevan) │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 6: Sintesis Laporan Telaah Mutu (RAG Anti AI-Slop)        │
│          (Ketetapan Pokok, Rincian Prosedur, & Sitasi Halaman)  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Rincian Teknis Setiap Lapisan

### Layer 1: Normalisasi Query & Glosarium Akademik Kampus
Sebelum dieksekusi ke database, query pengguna diperkaya menggunakan kamus pemetaan istilah internal STIKOM Yos Sudarso:
* **Stopwords Removal:** Mengabaikan partikel umum (*yang, di, ke, dari, pada, dalam, untuk, dengan, dll.*).
* **Kamus Glosarium Internal:**
  | Istilah Pencarian Pengguna | Perluasan Istilah Resmi (*Expansion*) |
  | :--- | :--- |
  | `skripsi` | `tugas akhir`, `TA`, `pendadaran`, `komprehensif` |
  | `reward` / `insentif` | `penghargaan publikasi`, `bantuan dana publikasi`, `insentif karya ilmiah` |
  | `jabatan dosen` / `pangkat` | `lektor`, `asisten ahli`, `lektor kepala`, `angka kredit`, `PAK` |
  | `audit mutu` / `ami` | `Audit Mutu Internal`, `AMI`, `siklus PPEPP`, `evaluasi diri` |
  | `visi misi` | `VMTS`, `Visi Keilmuan`, `Renstra` |

### Layer 2: Hybrid Dual-Engine Retrieval
1. **Jalur Leksikal (BM25 dengan Strict Word Boundary):**
   * Menggunakan pencocokan kata penuh `\b(token)\b`.
   * Mencegah pencocokan substring semu (*false positive*).
   * Memberikan bobot tinggi untuk kata subjek unik (*rare words*) dan bobot rendah untuk kata administratif umum (*aturan, dokumen, pedoman*).
   * Memberikan bonus kedekatan (*phrase proximity bonus*) untuk kata yang muncul berdampingan (contoh: *"pengambilan skripsi"*).
2. **Jalur Semantik (Dense Vector Embedding):**
   * Menggunakan model embedding 768 dimensi (*Gemini/DeepSeek*).
   * Menangkap sinonim konseptual dan intensi bahasa alami.

### Layer 3: Penggabungan Peringkat via RRF (*Reciprocal Rank Fusion*)
RRF menggabungkan hasil dari mesin leksikal dan mesin vektor tanpa bias skala angka:

$$\text{RRF}(d) = \frac{1}{k + r_{\text{lexical}}(d)} + \frac{1}{k + r_{\text{semantic}}(d)}$$

*(Konstanta $k = 60$ standar industri IR).*

### Layer 4: Agregasi Tingkat Dokumen (*Document-Level Grouping*)
Mengelompokkan 30–50 chunk terbaik berdasarkan identitas dokumen induknya:
1. Dokumen diberi skor akumulatif:
   $$\text{Score}(\text{Doc}) = \text{Score}(\text{BestChunk}) + 0.15 \times \sum_{i=2}^{N} \text{Score}(\text{Chunk}_i)$$
2. Hasil pencarian menyajikan kartu dokumen induk, di mana setiap kartu memuat:
   * Metadata naskah: Judul resmi, nomor SK, kategori, tahun, dan status keabsahan.
   * Daftar sub-halaman yang relevan beserta kutipan (*snippet*) klausulnya.

### Layer 5: Konteks Tertanam pada Chunk & Reranking
* **Konteks Header Tertanam:** Setiap chunk teks ditambahkan metadata kontekstual pada awal baris:
  `[DOKUMEN: {title} | BAB/BAGIAN: {section} | HALAMAN: {page}]`
  Hal ini mencegah potongan halaman tengah kehilangan konteks buku aslinya.
* **Metadata Pre-filter:** Filter tahun, kategori (SOP, Standar, Manual, Kebijakan), dan status versi mempersempit ruang pencarian sebelum komputasi berat.

### Layer 6: Laporan Telaah Regulasi Formal (Anti AI-Slop)
* Menghilangkan seluruh elemen gimmick AI (seperti ikon *Sparkles*, salam pembuka, dan frasa klise).
* Menggunakan ikon formal: `Scale` (Timbangan Regulasi), `BookOpenCheck`, dan `FileSearch`.
* Format laporan eksekutif baku:
  1. **Ketetapan Pokok** (1-2 kalimat simpulan hukum/regulasi).
  2. **Rincian Prosedur & Ketentuan** (Poin-poin pasal/tata cara/angka kredit).
  3. **Rujukan Dokumen Resmi** (Sitasi judul SK & nomor halaman naskah fisik).

---

## 4. Perbandingan Sebelum & Sesudah

| Aspek Evaluasi | Kondisi Awal (Chunk Flat) | Desain Arsitektur Baru (Document-Level Layered) |
| :--- | :--- | :--- |
| **Unit Tampilan Utama** | Potongan teks halaman acak | Naskah Dokumen Resmi (Buku Pedoman / SK) |
| **Akurasi Sub-string** | Rawan salah tangkap (`de[skripsi]`, `pel[anggaran]`) | Kebal salah tangkap (*Strict Word Boundary* `\b`) |
| **Istilah Kampus** | Harus mengetik kata yang persis sama | Terhubung otomatis via Glosarium Internal |
| **Visibilitas Regulasi** | Halaman berdiri sendiri tanpa konteks | Seluruh halaman terkait terkumpul dalam satu dokumen |
| **Nada Komunikasi (Tone)** | Rawan basa-basi percakapan AI (*AI-slop*) | Murni memorandum audit mutu institusi resmi |

---

## 5. Rencana Eksekusi Bertahap (Roadmap)

### Tahap 1: Fondasi MVP (Prioritas Utama)
- [ ] Implementasi fungsi Glosarium & Query Expansion Bahasa Indonesia internal STIKOM Yos Sudarso.
- [ ] Implementasi algoritma penggabungan RRF (*Reciprocal Rank Fusion*) di backend Express.
- [ ] Transformasi endpoint `/api/search` untuk menghasilkan struktur data teragregasi per dokumen.
- [ ] Pembaruan UI frontend `SemanticSearch.jsx` agar menampilkan kartu berbasis dokumen dengan sub-halaman interaktif.

### Tahap 2: Reranking & Penyisipan Konteks
- [ ] Penyisipan *Metadata Context Header* pada setiap chunk saat ekstraksi dokumen PDF.
- [ ] Evaluasi modul Cross-Encoder / Reranker ringan untuk menyeleksi 20 kandidat dokumen teratas.

### Tahap 3: Validasi & Uji Akreditasi
- [ ] Penyusunan set evaluasi berisi 50 pertanyaan nyata terkait instrumen SPMI dan borang akreditasi LAM-INFOKOM / BAN-PT.
- [ ] Pengujian akurasi Top-1 dan Top-3 dokumen pada set evaluasi.

---
*Dokumen ini disusun sebagai panduan teknis implementasi arsitektur pencarian generasi berikutnya pada SANDI STIKOM Yos Sudarso Purwokerto.*
