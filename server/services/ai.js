import { GoogleGenerativeAI } from '@google/generative-ai';
import crypto from 'crypto';

// Inisialisasi Google Generative AI bila GEMINI_API_KEY tersedia
const geminiApiKey = process.env.GEMINI_API_KEY || '';
let genAI = null;
if (geminiApiKey) {
  try {
    genAI = new GoogleGenerativeAI(geminiApiKey);
  } catch (err) {
    console.warn('⚠️ Google Generative AI gagal diinisialisasi:', err.message);
  }
}

// Memory cache untuk query embedding
const queryVectorCache = new Map();

/**
 * Menghitung hash SHA-256 dari teks query
 */
export function hashQuery(query) {
  return crypto.createHash('sha256').update(query.trim().toLowerCase()).digest('hex');
}

/**
 * Simulasi vektor 768-dimensi deterministik berbasis semantic hash & term frequency
 * Digunakan sebagai fallback cerdas saat GEMINI_API_KEY belum disetel
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
 * Menghasilkan embedding teks (768 dimensi) memakai Gemini atau fallback
 * @param {string} text
 * @returns {Promise<number[]>}
 */
export async function getEmbedding(text) {
  const normalized = text.trim();
  const cacheKey = hashQuery(normalized);
  if (queryVectorCache.has(cacheKey)) {
    return queryVectorCache.get(cacheKey);
  }

  if (genAI && geminiApiKey) {
    try {
      const model = genAI.getGenerativeModel({ 
        model: process.env.GEMINI_EMBEDDING_MODEL || "text-embedding-004" 
      });
      const result = await model.embedContent(normalized);
      const vector = result.embedding.values;
      queryVectorCache.set(cacheKey, vector);
      return vector;
    } catch (err) {
      console.warn('⚠️ Gagal memanggil Gemini Embedding API, beralih ke semantic engine lokal:', err.message);
    }
  }

  // Fallback deterministik
  const fallbackVector = generateDeterministicVector(normalized, 768);
  queryVectorCache.set(cacheKey, fallbackVector);
  return fallbackVector;
}

/**
 * Menghasilkan jawaban RAG berbasis sitasi dari chunk dokumen yang ditemukan
 * Sesuai PRD FR-30, FR-31, FR-32
 * @param {string} query
 * @param {Array} chunks
 * @returns {Promise<{answer: string, citations: Array}>}
 */
export async function generateRagAnswer(query, chunks) {
  if (!chunks || chunks.length === 0) {
    return {
      answer: "Mohon maaf, informasi terkait pertanyaan ini belum ditemukan dalam arsip dokumen SPMI yang terindeks.",
      citations: []
    };
  }

  // Susun sitasi dan konteks
  const citations = chunks.slice(0, 5).map(c => ({
    documentTitle: c.document_title || c.documentTitle,
    pageNumber: c.page_number || c.pageNumber,
    documentId: c.document_id || c.documentId,
    sectionTitle: c.section_title || c.sectionTitle || '',
    snippet: (c.content || c.snippet || '').substring(0, 300)
  }));

  const contextText = citations.map((c, i) => 
    `[Dokumen ${i + 1}: ${c.documentTitle}, Halaman ${c.pageNumber}]\n${c.snippet}`
  ).join('\n\n---\n\n');

  if (genAI && geminiApiKey) {
    try {
      const model = genAI.getGenerativeModel({
        model: process.env.GEMINI_GENERATION_MODEL || "gemini-1.5-flash",
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 800,
        }
      });

      const prompt = `Anda adalah asisten AI penjaminan mutu internal STIKOM Yos Sudarso bernama SANDI.
Tugas Anda adalah menjawab pertanyaan pengguna secara ringkas, lugas, dan akurat HANYA berdasarkan konteks dokumen SPMI yang diberikan di bawah ini.

ATURAN WAJIB:
1. Jawab HANYA dari dokumen konteks yang disediakan. Jangan mengarang atau berhalusinasi.
2. Setiap kali menyebutkan fakta/ketentuan, sertakan sitasi dengan format [Nama Dokumen, hlm. X].
3. Jika informasi yang ditanyakan tidak tercantum dalam konteks, katakan dengan jelas bahwa hal tersebut belum diatur atau tidak ditemukan dalam dokumen SPMI yang ada.
4. Gunakan bahasa Indonesia formal dan profesional khas perguruan tinggi.

Pertanyaan Pengguna:
${query}

Konteks Dokumen SPMI:
${contextText}

Jawaban Bersitasi:`;

      const response = await model.generateContent(prompt);
      const answer = response.response.text();
      return { answer, citations };
    } catch (err) {
      console.warn('⚠️ Gagal generate jawaban dengan Gemini LLM, menggunakan perangkum otomatis cerdas:', err.message);
    }
  }

  // Fallback penyusun ringkasan berbasis ekstraksi kutipan terbaik jika API Key tidak disetel
  const top = citations[0];
  const secondary = citations.length > 1 ? citations[1] : null;

  let fallbackAnswer = `Berdasarkan ketentuan dalam **${top.documentTitle}** (hlm. ${top.pageNumber}), hal tersebut diatur sebagai berikut:\n\n> "${top.snippet.replace(/\n+/g, ' ').substring(0, 240)}..."\n\n`;

  if (secondary && secondary.documentTitle !== top.documentTitle) {
    fallbackAnswer += `Selain itu, ketentuan pendukung juga tercantum pada **${secondary.documentTitle}** (hlm. ${secondary.pageNumber}). Silakan klik tombol **Buka PDF** pada kartu hasil di bawah untuk memverifikasi dokumen asli.`;
  } else {
    fallbackAnswer += `Untuk verifikasi pasal selengkapnya, Anda dapat meninjau langsung lembar asli melalui tombol **Buka PDF (hlm. ${top.pageNumber})**.`;
  }

  return {
    answer: fallbackAnswer,
    citations
  };
}
