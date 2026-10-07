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

  // Susun sitasi dan konteks naskah dokumen
  const citations = chunks.slice(0, 5).map(c => ({
    documentTitle: c.document_title || c.documentTitle,
    pageNumber: c.page_number || c.pageNumber,
    documentId: c.document_id || c.documentId,
    sectionTitle: c.section_title || c.sectionTitle || '',
    snippet: (c.content || c.snippet || '').substring(0, 400)
  }));

  const contextText = citations.map((c, i) => 
    `[Sumber ${i + 1}: ${c.documentTitle}, Halaman ${c.pageNumber}]\n${c.snippet}`
  ).join('\n\n---\n\n');

  try {
    const response = await aiClient.chat.completions.create({
      model: chatModel,
      messages: [
        {
          role: 'system',
          content: `Anda adalah modul penalaran dokumen mutu SIRENA / SANDI untuk STIKOM Yos Sudarso, Purwokerto.

PEDOMAN INTEGRITAS & ANTI-AI SLOP:
1. DILARANG menggunakan salam pembuka, penutup, basa-basi, atau kata-kata umum AI seperti "Tentu saja!", "Halo!", "Sebagai asisten cerdas...", dsb.
2. Jawab secara ringkas, padat, dan langsung pada substansi pasal/ketentuan.
3. HANYA ambil informasi yang tertulis pada potongan dokumen konteks di bawah. JANGAN berhalusinasi atau menambahkan opini di luar dokumen.
4. Setiap klausa yang menjelaskan aturan WAJIB menyertakan rujukan sitasi format: [Nama Dokumen, hlm. X].
5. Jika konteks yang ada tidak memuat jawaban yang dicari, nyatakan secara tegas: "Ketentuan ini belum diatur dalam dokumen SPMI yang terindeks."`
        },
        {
          role: 'user',
          content: `Pertanyaan:\n${query}\n\nKonteks Dokumen SPMI:\n${contextText}\n\nJawaban Ringkas Bersitasi:`
        }
      ],
      temperature: 0.1,
      max_tokens: 600
    });

    const answer = response.choices[0]?.message?.content?.trim();
    if (answer) {
      return { answer, citations };
    }
  } catch (err) {
    console.warn('⚠️ Gagal memanggil DeepSeek API via SumoPod, menggunakan formatter terstruktur:', err.message);
  }

  // Fallback deterministik bebas AI-slop
  const top = citations[0];
  const fallbackAnswer = `Berdasarkan ketentuan dalam **${top.documentTitle}** (hlm. ${top.pageNumber}):\n\n> "${top.snippet.replace(/\n+/g, ' ').substring(0, 260)}..."\n\nVerifikasi dokumen asli dapat ditinjau langsung melalui tombol **Buka PDF (hlm. ${top.pageNumber})**.`;

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
