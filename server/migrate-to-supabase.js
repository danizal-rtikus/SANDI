import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL || 'https://fznhvuyplojsvcodxfkk.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY belum diisi di server/.env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

const UPLOADS_DIR = path.join(__dirname, 'uploads');
const PERSISTED_FILE = path.join(__dirname, 'data', 'persisted_documents.json');
const BUCKET_NAME = 'documents';

async function runMigration() {
  console.log('🚀 Memulai migrasi berkas PDF ke Supabase Storage Cloud...');
  console.log(`🌐 Supabase URL: ${supabaseUrl}`);
  console.log(`🪣 Target Bucket: ${BUCKET_NAME}\n`);

  // 1. Cek atau Buat Bucket
  const { data: buckets, error: listBucketErr } = await supabase.storage.listBuckets();
  if (listBucketErr) {
    console.error('❌ Gagal membaca daftar bucket:', listBucketErr.message);
    return;
  }

  const existingBucket = buckets?.find(b => b.name === BUCKET_NAME);
  if (!existingBucket) {
    console.log(`📦 Bucket "${BUCKET_NAME}" belum ada. Membuat bucket publik baru...`);
    const { error: createErr } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 52428800 // 50MB
    });
    if (createErr) {
      console.error('❌ Gagal membuat bucket:', createErr.message);
      return;
    }
    console.log(`✅ Bucket "${BUCKET_NAME}" berhasil dibuat (Public).`);
  } else {
    console.log(`✅ Bucket "${BUCKET_NAME}" ditemukan.`);
    if (!existingBucket.public) {
      console.log('⚙️ Mengubah bucket menjadi Public...');
      await supabase.storage.updateBucket(BUCKET_NAME, { public: true });
    }
  }

  // 2. Baca file di folder uploads
  if (!fs.existsSync(UPLOADS_DIR)) {
    console.warn(`⚠️ Folder ${UPLOADS_DIR} tidak ditemukan.`);
    return;
  }

  const files = fs.readdirSync(UPLOADS_DIR).filter(f => f.toLowerCase().endsWith('.pdf'));
  console.log(`📄 Ditemukan ${files.length} file PDF di folder uploads.\n`);

  const urlMap = new Map();

  for (let i = 0; i < files.length; i++) {
    const filename = files[i];
    const filePath = path.join(UPLOADS_DIR, filename);
    const fileBuffer = fs.readFileSync(filePath);

    process.stdout.write(`[${i + 1}/${files.length}] Mengunggah: ${filename} ... `);

    const { error: uploadErr } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filename, fileBuffer, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadErr) {
      console.log(`❌ Gagal: ${uploadErr.message}`);
    } else {
      const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filename);
      const publicUrl = urlData.publicUrl;
      urlMap.set(filename, publicUrl);
      console.log(`✅ Selesai -> ${publicUrl}`);
    }
  }

  // 3. Perbarui persisted_documents.json
  if (fs.existsSync(PERSISTED_FILE)) {
    console.log(`\n📝 Memperbarui storage_path di ${PERSISTED_FILE}...`);
    const raw = fs.readFileSync(PERSISTED_FILE, 'utf8');
    const docs = JSON.parse(raw);

    let updatedCount = 0;
    const updatedDocs = docs.map(doc => {
      let currentPath = doc.storage_path || '';
      // Contoh: /uploads/doc-1234-file.pdf
      const basename = path.basename(currentPath);
      if (urlMap.has(basename)) {
        updatedCount++;
        return {
          ...doc,
          storage_path: urlMap.get(basename)
        };
      }
      return doc;
    });

    fs.writeFileSync(PERSISTED_FILE, JSON.stringify(updatedDocs, null, 2), 'utf8');
    console.log(`✅ Berhasil memperbarui ${updatedCount} dokumen dengan URL Supabase Storage Cloud!`);
  }

  console.log('\n🎉 Migrasi selesai!');
}

runMigration().catch(err => {
  console.error('Fatal error:', err);
});
