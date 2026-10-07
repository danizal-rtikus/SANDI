// Sample SPMI Documents for STIKOM Yos Sudarso Purwokerto
// Seeded for initial interactive testing out-of-the-box

export const sampleCategories = [
  { id: 1, name: 'Kebijakan SPMI', description: 'Dokumen kebijakan pokok penjaminan mutu STIKOM Yos Sudarso', sort_order: 1 },
  { id: 2, name: 'Manual Mutu', description: 'Petunjuk praktis tata kelola dan siklus PPEPP', sort_order: 2 },
  { id: 3, name: 'Standar SPMI', description: 'Kumpulan standar pendidikan, penelitian, pengabdian, dan tata pamong', sort_order: 3 },
  { id: 4, name: 'SOP (Prosedur Operasional)', description: 'Standar Operasional Prosedur untuk setiap unit dan layanan', sort_order: 4 },
  { id: 5, name: 'Pedoman SDM & Akademik', description: 'Pedoman kenaikan jabatan, remunerasi, penghargaan, dan etika', sort_order: 5 },
  { id: 6, name: 'Formulir & Instrumen', description: 'Format borang evaluasi, audit, dan verifikasi mutu', sort_order: 6 }
];

export const sampleDocuments = [
  {
    id: "doc-001-pedoman-sdm",
    title: "Buku Pedoman Pengelolaan SDM & Tata Tertib Dosen",
    doc_number: "PED-SDM/SYS/2024/002",
    category_id: 5,
    category_name: "Pedoman SDM & Akademik",
    year: 2024,
    version: "2.1",
    description: "Panduan hak, kewajiban, skema remunerasi, penghargaan (reward), serta kode etik dosen dan tenaga kependidikan STIKOM Yos Sudarso.",
    access: "publik_internal",
    status: "published",
    is_active: true,
    storage_path: "documents/PED-SDM-SYS-2024.pdf",
    file_size_bytes: 1420800,
    checksum_sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    page_count: 48,
    created_at: new Date(Date.now() - 86400000 * 15).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    chunks: [
      {
        id: "chunk-sdm-14",
        page_number: 14,
        chunk_index: 0,
        section_title: "Bab IV: Hak Dosen & Skema Penghargaan Kinerja (Reward)",
        content: "Pasal 18: Pemberian Penghargaan (Reward) dan Insentif Prestasi Dosen\n1. STIKOM Yos Sudarso memberikan penghargaan moral dan material kepada dosen tetap yang berprestasi luar biasa dalam Tridharma Perguruan Tinggi.\n2. Penghargaan berupa insentif publikasi ilmiah internasional terindeks Scopus/WoS berkisar antara Rp 5.000.000,- hingga Rp 15.000.000,- per artikel berdasarkan kuartil (Q1-Q4).\n3. Dosen berprestasi dalam pengabdian kepada masyarakat yang memperoleh hibah eksternal Kemendikbudristek berhak atas apresiasi institusi berupa pembebasan sebagian beban SKS mengajar pada semester berikutnya.\n4. Prosedur pencairan insentif dan sertifikat penghargaan diajukan melalui Lembaga Penelitian dan Pengabdian kepada Masyarakat (LPPM) dengan melampirkan bukti korespondensi dan bukti terbit.",
        token_count: 145,
        is_noise: false
      },
      {
        id: "chunk-sdm-22",
        page_number: 22,
        chunk_index: 0,
        section_title: "Bab V: Cuti Akademik dan Tugas Belajar",
        content: "Pasal 29: Ketentuan Cuti Studi dan Beasiswa Doktoral (S3)\n1. Dosen tetap yang telah mengabdi sekurang-kurangnya 2 (dua) tahun berturut-turut berhak mengajukan izin belajar atau tugas belajar program Doktoral (S3).\n2. Selama masa tugas belajar yang didanai beasiswa BPPDN/BPI/LDPD atau beasiswa yayasan STIKOM Yos Sudarso, dosen tetap menerima gaji pokok penuh dan tunjangan fungsional.\n3. Kewajiban kembali mengabdi (ikatan dinas) dihitung 2n + 1 tahun masa studi setelah menyelesaikan program doktoral.",
        token_count: 120,
        is_noise: false
      },
      {
        id: "chunk-sdm-35",
        page_number: 35,
        chunk_index: 0,
        section_title: "Bab VII: Pembinaan Karir dan Jabatan Fungsional Dosen (JFD)",
        content: "Pasal 42: Jenjang Karir Akademik dan Penilaian Kinerja Dosen\n1. Setiap dosen wajib memiliki Jabatan Fungsional Akademik (Asisten Ahli, Lektor, Lektor Kepala, atau Guru Besar) selambat-lambatnya 2 tahun sejak diangkat sebagai dosen tetap.\n2. Institusi memfasilitasi bimbingan teknis penyusunan berkas Penilaian Angka Kredit (PAK) dan sinkronisasi SISTER Dikti secara berkala setiap semester.\n3. Kenaikan pangkat reguler dan kenaikan jabatan fungsional dosen didasarkan pada pemenuhan angka kredit kumulatif (KUM) bidang A (Pendidikan), B (Penelitian), C (Pengabdian), dan D (Penunjang).",
        token_count: 135,
        is_noise: false
      }
    ]
  },
  {
    id: "doc-002-standar-spmi",
    title: "Standar SPMI: Standar Proses Pembelajaran & Kurikulum OBE",
    doc_number: "STD-SPMI/SYS/2023/001",
    category_id: 3,
    category_name: "Standar SPMI",
    year: 2023,
    version: "3.0",
    description: "Standar penjaminan mutu proses pembelajaran berbasis Outcome-Based Education (OBE) dan pemenuhan capaian pembelajaran lulusan (CPL) STIKOM Yos Sudarso.",
    access: "publik_internal",
    status: "published",
    is_active: true,
    storage_path: "documents/STD-SPMI-SYS-2023.pdf",
    file_size_bytes: 2315000,
    checksum_sha256: "c18dfd9876abc12344efbc34567890abcdef1234567890abcdef1234567890aa",
    page_count: 36,
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    chunks: [
      {
        id: "chunk-std-8",
        page_number: 8,
        chunk_index: 0,
        section_title: "Standar 2: Rencana Pembelajaran Semester (RPS) dan Kontrak Kuliah",
        content: "Pernyataan Standar Proses Pembelajaran (Kode: STD-DIK-02):\n1. Dosen pengampu mata kuliah wajib menyusun dan mengunggah Rencana Pembelajaran Semester (RPS) berbasis Capaian Pembelajaran Lulusan (CPL) ke Learning Management System (LMS) kampus paling lambat 1 (satu) minggu sebelum perkuliahan perdana dimulai.\n2. RPS wajib memuat deskripsi mata kuliah, CPL, sub-CPMK, kriteria penilaian (rubrik), bahan kajian, daftar referensi terkini (maksimal 5 tahun terakhir), serta alokasi waktu.\n3. Pada pertemuan pertama, dosen wajib menyepakati Kontrak Perkuliahan dengan mahasiswa yang mencakup bobot evaluasi tugas, kuis, UTS, dan UAS.",
        token_count: 140,
        is_noise: false
      },
      {
        id: "chunk-std-19",
        page_number: 19,
        chunk_index: 0,
        section_title: "Standar 5: Beban Kerja Dosen (BKD) dan Evaluasi Pembelajaran",
        content: "Ketentuan Beban Mengajar Dosen dan Laporan BKD (Kode: STD-DIK-05):\n1. Beban kerja mengajar dosen tetap berkisar antara 12 hingga 16 SKS per semester, mencakup tridharma perguruan tinggi.\n2. Kehadiran tatap muka atau sinkronus dosen minimal 14 pertemuan dan maksimal 16 pertemuan per semester (termasuk UTS dan UAS).\n3. Evaluasi kinerja dosen oleh mahasiswa (EDOM) dilakukan secara daring pada minggu ke-14 perkuliahan melalui sistem informasi akademik dengan ambang batas kepuasan minimal 3.25 dari skala 4.00.",
        token_count: 130,
        is_noise: false
      }
    ]
  },
  {
    id: "doc-003-sop-jfd",
    title: "SOP Prosedur Usulan Kenaikan Jabatan Fungsional Dosen (JFD)",
    doc_number: "SOP-LPM/SYS/2024/007",
    category_id: 4,
    category_name: "SOP (Prosedur Operasional)",
    year: 2024,
    version: "1.2",
    description: "Alur operasional, kelengkapan berkas, tahapan verifikasi Tim PAK internal, hingga pengiriman usulan ke LLDIKTI Wilayah VI Jawa Tengah.",
    access: "publik_internal",
    status: "published",
    is_active: true,
    storage_path: "documents/SOP-JFD-SYS-2024.pdf",
    file_size_bytes: 980000,
    checksum_sha256: "fa456123bcde890123456789abcdef0123456789abcdef0123456789abcdef01",
    page_count: 16,
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    chunks: [
      {
        id: "chunk-sop-5",
        page_number: 5,
        chunk_index: 0,
        section_title: "Tahap II: Pengumpulan Berkas & Verifikasi Tim Angka Kredit (PAK)",
        content: "Alur Usulan Kenaikan Jabatan Fungsional (Asisten Ahli ke Lektor 200/300):\n1. Dosen pemohon mengisi formulir usulan dupak mandiri di portal SISTER dan menyerahkan dokumen portofolio Tridharma ke Lembaga Penjaminan Mutu (LPM) STIKOM Yos Sudarso.\n2. Tim Penilai Angka Kredit (PAK) internal memverifikasi keabsahan karya ilmiah, sertifikat pengajaran, dan bukti pengabdian dalam kurun waktu 14 hari kerja.\n3. Syarat angka kredit kumulatif (KUM) minimal untuk usulan Lektor 200 adalah 200 poin KUM, dengan kewajiban memiliki minimal 1 (satu) artikel jurnal nasional terakreditasi SINTA peringkat 3, 4, 5, atau 6 sebagai penulis pertama atau korespondensi.\n4. Surat rekomendasi Ketua STIKOM diterbitkan setelah berkas dinyatakan lengkap dan lolos uji similarity Turnitin (maksimal 25%).",
        token_count: 170,
        is_noise: false
      },
      {
        id: "chunk-sop-11",
        page_number: 11,
        chunk_index: 0,
        section_title: "Tahap IV: Pengusulan ke LLDIKTI Wilayah VI",
        content: "Proses Pengesahan dan Penerbitan SK Jabatan Fungsional:\n1. Operator perguruan tinggi mengunggah berkas yang telah diverifikasi ke sistem layanan LLDIKTI Wilayah VI Jawa Tengah.\n2. Pemantauan status usulan dilakukan secara mingguan oleh Kepala Bagian SDM.\n3. Apabila terdapat catatan perbaikan dari asesor LLDIKTI, dosen diberi tenggang waktu 10 hari kerja untuk melakukan revisi dokumen pendukung.",
        token_count: 110,
        is_noise: false
      }
    ]
  },
  {
    id: "doc-004-manual-mutu",
    title: "Manual Mutu SPMI: Siklus PPEPP & Audit Mutu Internal (AMI)",
    doc_number: "MAN-MUTU/SYS/2023/001",
    category_id: 2,
    category_name: "Manual Mutu",
    year: 2023,
    version: "2.0",
    description: "Pedoman pelaksanaan siklus Penetapan, Pelaksanaan, Evaluasi, Pengendalian, dan Peningkatan (PPEPP) serta Audit Mutu Internal (AMI) di lingkungan STIKOM Yos Sudarso.",
    access: "publik_internal",
    status: "published",
    is_active: true,
    storage_path: "documents/MAN-MUTU-SYS-2023.pdf",
    file_size_bytes: 1850000,
    checksum_sha256: "7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456",
    page_count: 32,
    created_at: new Date(Date.now() - 86400000 * 45).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 12).toISOString(),
    chunks: [
      {
        id: "chunk-man-11",
        page_number: 11,
        chunk_index: 0,
        section_title: "Bagian III: Pelaksanaan Audit Mutu Internal (AMI)",
        content: "Siklus Audit Mutu Internal (AMI) Tahunan:\n1. Audit Mutu Internal (AMI) diselenggarakan sekurang-kurangnya 1 (satu) kali dalam 1 tahun akademik pada setiap program studi dan unit kerja pendukung.\n2. Tim Auditor Mutu Internal ditunjuk oleh Ketua STIKOM Yos Sudarso melalui SK resmi dan bersertifikat auditor SPMI.\n3. Ruang lingkup audit mencakup kesesuaian capaian sasaran mutu, kepatuhan SOP, serta evaluasi tindak lanjut Rapat Tinjauan Manajemen (RTM) tahun sebelumnya.\n4. Temuan audit dikelompokkan ke dalam kategori KTS (Ketidaksesuaian) Mayor, Minor, dan Rekomendasi Peluang Peningkatan (OB).",
        token_count: 145,
        is_noise: false
      }
    ]
  },
  {
    id: "doc-005-kebijakan-spmi",
    title: "Kebijakan Tata Pamong & Penjaminan Mutu Internal",
    doc_number: "KBJ-SPMI/SYS/2022/001",
    category_id: 1,
    category_name: "Kebijakan SPMI",
    year: 2022,
    version: "1.0",
    description: "Landasan hukum, arah kebijakan penjaminan mutu, struktur organisasi Lembaga Penjaminan Mutu (LPM), dan akuntabilitas pimpinan.",
    access: "publik_internal",
    status: "published",
    is_active: true,
    storage_path: "documents/KBJ-SPMI-SYS-2022.pdf",
    file_size_bytes: 1100000,
    checksum_sha256: "34567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12",
    page_count: 24,
    created_at: new Date(Date.now() - 86400000 * 90).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 40).toISOString(),
    chunks: [
      {
        id: "chunk-kbj-4",
        page_number: 4,
        chunk_index: 0,
        section_title: "Struktur Organisasi & Wewenang Lembaga Penjaminan Mutu (LPM)",
        content: "Struktur dan Tugas Pokok LPM STIKOM Yos Sudarso:\n1. Lembaga Penjaminan Mutu (LPM) merupakan unit mandiri yang bertanggung jawab langsung kepada Ketua STIKOM Yos Sudarso.\n2. LPM bertugas merancang dokumen mutu, mengkoordinasikan implementasi SPMI, mengawasi pelaksanaan AMI, serta mendokumentasikan bukti kepatuhan akreditasi BAN-PT dan LAM-INFOKOM.\n3. Dalam menjalankan tugasnya, LPM didukung oleh Gugus Kendali Mutu (GKM) di tingkat program studi Informatika dan Sistem Informasi.",
        token_count: 135,
        is_noise: false
      }
    ]
  }
];
