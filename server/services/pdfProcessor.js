import crypto from 'crypto';
import pdfParse from 'pdf-parse';

/**
 * Menghitung checksum SHA-256 dari buffer file PDF
 * @param {Buffer} buffer
 * @returns {string}
 */
export function computeSha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Membersihkan teks hasil ekstraksi PDF:
 * Menghapus spasi ganda, baris kosong berlebih, dan karakter aneh
 * @param {string} text
 * @returns {string}
 */
export function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Mendeteksi judul bab / pasal dari teks
 * @param {string} text
 * @returns {string|null}
 */
export function extractSectionTitle(text) {
  const match = text.match(/((?:BAB|Pasal|STANDAR|BAGIAN|LAMPIRAN)\s+[IVXLCDM0-9]+[^\n]*)/i);
  return match ? match[1].trim() : null;
}

/**
 * Memecah teks halaman menjadi sub-chunk jika terlalu panjang
 * Target: ~700 token (~2800 karakter), overlap: ~80 token (~320 karakter)
 * @param {string} text
 * @param {number} maxChars
 * @param {number} overlapChars
 * @returns {string[]}
 */
export function splitIntoSubChunks(text, maxChars = 2800, overlapChars = 320) {
  if (text.length <= maxChars) {
    return [text];
  }

  const chunks = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    let endIndex = startIndex + maxChars;
    if (endIndex >= text.length) {
      chunks.push(text.slice(startIndex).trim());
      break;
    }

    // Cari batas kalimat atau paragraf terdekat
    const lastParagraph = text.lastIndexOf('\n\n', endIndex);
    const lastPeriod = text.lastIndexOf('. ', endIndex);
    
    if (lastParagraph > startIndex + maxChars / 2) {
      endIndex = lastParagraph + 2;
    } else if (lastPeriod > startIndex + maxChars / 2) {
      endIndex = lastPeriod + 2;
    }

    const chunkContent = text.slice(startIndex, endIndex).trim();
    if (chunkContent.length > 0) {
      chunks.push(chunkContent);
    }

    startIndex = Math.max(startIndex + 1, endIndex - overlapChars);
  }

  return chunks;
}

/**
 * Memproses buffer PDF: ekstraksi teks per halaman, chunking, dan metadata
 * @param {Buffer} buffer
 * @param {string} docTitle
 * @returns {Promise<{pageCount: number, chunks: Array, isScannedCandidate: boolean}>}
 */
export async function processPdfBuffer(buffer, docTitle = '') {
  const pageTexts = [];

  // Konfigurasi pagerender untuk pdf-parse agar memisahkan teks per halaman
  const options = {
    pagerender: function (pageData) {
      return pageData.getTextContent().then(function (textContent) {
        let lastY, text = '';
        for (let item of textContent.items) {
          if (lastY == item.transform[5] || !lastY) {
            text += item.str + ' ';
          } else {
            text += '\n' + item.str + ' ';
          }
          lastY = item.transform[5];
        }
        pageTexts.push(text);
        return text;
      });
    }
  };

  const parsed = await pdfParse(buffer, options);
  const totalPages = parsed.numpages || pageTexts.length || 1;
  const chunks = [];
  let totalExtractedLength = 0;

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const rawPageText = pageTexts[pageNum - 1] || '';
    const cleaned = cleanText(rawPageText);
    totalExtractedLength += cleaned.length;

    // Evaluasi apakah halaman kosong / butuh OCR / noise
    const isNoise = cleaned.length < 25; // Halaman hampir kosong
    const sectionTitle = extractSectionTitle(cleaned);

    const subChunks = splitIntoSubChunks(cleaned);
    subChunks.forEach((subText, idx) => {
      // Per PRD 9.2: Awalan konteks untuk embedding
      const contextPrefix = sectionTitle 
        ? `${docTitle} > ${sectionTitle}\n\n` 
        : `${docTitle} > Halaman ${pageNum}\n\n`;

      chunks.push({
        page_number: pageNum,
        chunk_index: idx,
        section_title: sectionTitle,
        content: subText,
        embedding_input: contextPrefix + subText,
        token_count: Math.ceil(subText.length / 4),
        is_noise: isNoise,
        ocr_used: false
      });
    });
  }

  // Jika teks yang diekstrak sangat sedikit relatif terhadap jumlah halaman, tandai sebagai kandidat scan
  const isScannedCandidate = totalPages > 1 && (totalExtractedLength / totalPages) < 40;

  return {
    pageCount: totalPages,
    chunks,
    isScannedCandidate
  };
}
