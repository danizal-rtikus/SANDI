import { OpenAI } from 'openai';
import crypto from 'crypto';

// Inisialisasi klien OpenAI untuk SumoPod AI (DeepSeek Models)
const aiApiKey = process.env.AI_API_KEY || 'sk-azIxZ_ZxAlhTJfL0ZLNNdw';
const aiBaseUrl = process.env.AI_BASE_URL || 'https://ai.sumopod.com/v1';
const chatModel = process.env.AI_CHAT_MODEL || 'deepseek-v4-flash';
const visionModel = process.env.AI_VISION_MODEL || 'deepseek-v4-flash-vision-exp';

export const aiClient = new OpenAI({
  apiKey: aiApiKey,
  baseURL: aiBaseUrl
});

// In-memory cache untuk query embedding
const queryVectorCache = new Map();

/**
 * Menghitung hash SHA-256 dari teks query
 */
export function hashQuery(query) {
  return crypto.createHash('sha256').update(query.trim().toLowerCase()).digest('hex');
}

/**
 * Vektor 768-dimensi berbasis semantic hash & term frequency
 * Selaras dengan pgvector(768) di Supabase
 */
export function generateDeterministicVector(text, dimension = 768) {
  const vector = new Array(dimension).fill(0);
  const words = text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean);
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    let hash = 0;
    for (let c = 0; c < word.length; c++) {
      hash = (hash << 5) - hash + word.charCodeAt(c);
      hash |= 0;
    }
    const idx = Math.abs(hash) % dimension;
    vector[idx] += 1.0 / (1 + Math.log(1 + words.length));
  }

  // Normalisasi L2 vector agar cosine similarity valid
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map(v => v / norm);
}

/**
 * Cosine similarity antara dua vektor
 */
export function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * Menghasilkan embedding teks (768 dimensi)
 * @param {string} text
 * @returns {Promise<number[]>}
 */
export async function getEmbedding(text) {
  const normalized = text.trim();
  const cacheKey = hashQuery(normalized);
  if (queryVectorCache.has(cacheKey)) {
    return queryVectorCache.get(cacheKey);
  }

  const vector = generateDeterministicVector(normalized, 768);
  queryVectorCache.set(cacheKey, vector);
  return vector;
}

/**
 * Menghasilkan jawaban RAG berbasis DeepSeek-v4-flash
 * Didesain ketat ANTI-AI SLOP: Formal, ringkas, tanpa basa-basi, wajib sitasi
 * @param {string} query
 * @param {Array} chunks
 * @returns {Promise<{answer: string, citations: Array}>}
 */
export async function generateRagAnswer(query, chunks) {
  if (!chunks || chunks.length === 0) {
    return {
      answer: "Informasi terkait pertanyaan ini tidak ditemukan dalam dokumen SPMI STIKOM Yos Sudarso yang terindeks.",
      citations: []
    };
  }

  // Susun sitasi dan konteks naskah dokumen dengan judul bersih
  const citations = chunks.slice(0, 5).map(c => {
    const rawTitle = c.document_title || c.documentTitle || '';
    const cleanTitle = rawTitle.replace(/^\d+[\s._-]+/, '').trim() || rawTitle;
    return {
      documentTitle: cleanTitle,
      rawDocumentTitle: rawTitle,
      pageNumber: c.page_number || c.pageNumber,
      documentId: c.document_id || c.documentId,
      sectionTitle: c.section_title || c.sectionTitle || '',
      snippet: (c.content || c.snippet || '').substring(0, 500)
    };
  });

  const contextText = citations.map((c, i) => 
    `[Dokumen Rujukan ${i + 1}: ${c.documentTitle}, Halaman ${c.pageNumber}]\n${c.snippet}`
  ).join('\n\n---\n\n');

  try {
    const response = await aiClient.chat.completions.create({
      model: chatModel,
      messages: [
        {
          role: 'system',
          content: `Anda adalah analis dokumen mutu resmi SANDI di STIKOM Yos Sudarso, Purwokerto.

TUGAS:
Sintesis dan jawab pertanyaan pengguna berdasarkan naskah dokumen SPMI / SOP / Pedoman resmi yang dilampirkan.

PEDOMAN INTEGRITAS & TATA NASKAH (ANTI-AI SLOP):
1. DILARANG menggunakan kata sapaan, salam ("Halo", "Selamat pagi"), basa-basi percakapan ("Tentu saja", "Baik, berikut adalah..."), dan kalimat penutup generik AI.
2. Gunakan gaya bahasa formal, presisi, lugas, dan faktual sesuai standar audit mutu akademik perguruan tinggi.
3. HANYA sarikan fakta yang tertulis eksplisit pada potongan dokumen konteks di bawah. Jangan beropini atau berasumsi.
4. FORMAT WAJIB:
### Ketetapan Pokok
[1-2 kalimat ringkas dan tegas yang langsung menjawab inti pertanyaan]

### Rincian Prosedur & Ketentuan
- [Poin 1: Tahapan, tata cara, atau syarat yang diatur]
- [Poin 2: Unit / pejabat penanggung jawab atau batas waktu jika disebutkan]
- [Poin 3: Ketentuan penting lainnya]

### Rujukan Dokumen Resmi
- [Nama Dokumen], Halaman [X]

5. Jika dokumen yang disediakan tidak memuat jawaban sama sekali, tuliskan:
### Ketetapan Pokok
Informasi spesifik terkait pertanyaan ini belum ditemukan dalam naskah dokumen SPMI yang terindeks saat ini.`
        },
        {
          role: 'user',
          content: `Pertanyaan Penelusuran:\n"${query}"\n\nNaskah Dokumen Konteks:\n${contextText}\n\nLaporan Telaah Dokumen Mutu:`
        }
      ],
      temperature: 0.1,
      max_tokens: 2000
    });

    const answer = response.choices[0]?.message?.content?.trim();
    if (answer && answer.length > 20) {
      return { answer, citations };
    }
  } catch (err) {
    console.warn('⚠️ Gagal memanggil DeepSeek API via SumoPod, menggunakan formatter terstruktur:', err.message);
  }

  // Fallback deterministik terstruktur resmi (bebas AI-slop)
  const top = citations[0];
  const cleanedSnippet = top.snippet
    .replace(/SEKOLAH TINGGI ILMU KOMPUTER YOS SUDARSO/gi, '')
    .replace(/PROSEDUR SPMI|KEBIJAKAN SPMI|STANDAR SPMI/gi, '')
    .replace(/Kode Dok\s*:[^\n]+/gi, '')
    .replace(/Revisi ke\s*:[^\n]+/gi, '')
    .replace(/Hal\s*\.?\s*:\s*[^\n]+/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  const fallbackAnswer = `### Ketetapan Pokok\nKetentuan mengenai topik ini tercantum dalam naskah resmi **${top.documentTitle}** (Halaman ${top.pageNumber}).\n\n### Rincian Naskah\n${cleanedSnippet.substring(0, 320)}...\n\n### Rujukan Dokumen Resmi\n- **${top.documentTitle}**, Halaman ${top.pageNumber}`;

  return {
    answer: fallbackAnswer,
    citations
  };
}

/**
 * Membaca dan mentranskripsi halaman PDF scan / gambar menggunakan deepseek-v4-flash-vision-exp
 * Digunakan untuk mengenali teks pada lembar berkas fisik / scan yang buram atau bertabel
 * @param {string} base64Image
 * @returns {Promise<string>}
 */
export async function performVisionOcr(base64Image) {
  try {
    const response = await aiClient.chat.completions.create({
      model: visionModel,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Transkripsikan seluruh teks dalam dokumen resmi ini secara lengkap dan akurat. Pertahankan nomor bab, pasal, dan struktur tabel jika ada. Hanya keluarkan teks hasil transkripsi tanpa kata pengantar.'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 1500,
      temperature: 0.1
    });

    return response.choices[0]?.message?.content?.trim() || '';
  } catch (err) {
    console.warn('⚠️ Gagal memanggil Vision OCR DeepSeek:', err.message);
    return '';
  }
}
