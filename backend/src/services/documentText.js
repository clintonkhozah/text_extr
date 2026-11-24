const path = require('node:path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_TOTAL_BYTES = 4 * 1024 * 1024;
const MAX_SOURCE_CHARS = 60000;

function decodeDocument(document, totalBytes) {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(document.contentBase64)) {
    const error = new Error(`The uploaded file "${document.name}" is not valid base64 data.`);
    error.status = 400;
    throw error;
  }

  const buffer = Buffer.from(document.contentBase64, 'base64');
  if (buffer.toString('base64') !== document.contentBase64) {
    const error = new Error(`The uploaded file "${document.name}" is not valid base64 data.`);
    error.status = 400;
    throw error;
  }
  if (buffer.length > MAX_FILE_BYTES || totalBytes + buffer.length > MAX_TOTAL_BYTES) {
    const error = new Error('Uploaded documents must total no more than 4 MB.');
    error.status = 413;
    throw error;
  }
  if (!buffer.length) {
    const error = new Error(`The uploaded file "${document.name}" is empty.`);
    error.status = 400;
    throw error;
  }

  return buffer;
}

async function extractOne(document, buffer) {
  const extension = path.extname(document.name).toLowerCase();
  if (['.txt', '.md', '.csv'].includes(extension)) {
    return buffer.toString('utf8').replace(/^\uFEFF/, '');
  }
  if (extension === '.pdf') {
    const parsed = await pdfParse(buffer);
    return parsed.text;
  }
  if (extension === '.docx') {
    const parsed = await mammoth.extractRawText({ buffer });
    return parsed.value;
  }

  const error = new Error(
    `Unsupported document type for "${document.name}". Upload PDF, DOCX, TXT, MD, or CSV files.`
  );
  error.status = 400;
  throw error;
}

async function extractDocumentText(documents, additionalText = '') {
  const sections = [];
  let totalBytes = 0;

  for (const document of documents) {
    const buffer = decodeDocument(document, totalBytes);
    totalBytes += buffer.length;
    const text = (await extractOne(document, buffer)).replace(/\u0000/g, '').trim();
    if (!text) {
      const error = new Error(
        `No text could be extracted from "${document.name}". Scanned documents need OCR before upload.`
      );
      error.status = 422;
      throw error;
    }
    sections.push(`Document: ${document.name}\n${text}`);
  }

  const notes = String(additionalText || '').trim();
  if (notes) sections.push(documents.length ? `Additional notes:\n${notes}` : notes);
  const sourceText = sections.join('\n\n').trim();

  if (sourceText.length < 10) {
    const error = new Error('Upload a supported document or enter at least 10 characters of text.');
    error.status = 400;
    throw error;
  }
  if (sourceText.length > MAX_SOURCE_CHARS) {
    const error = new Error(`The extracted text is too long. Keep it under ${MAX_SOURCE_CHARS} characters.`);
    error.status = 413;
    throw error;
  }

  return sourceText;
}

module.exports = { extractDocumentText };
