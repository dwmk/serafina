// src/lib/fileParser.js
// Client-side file parsing for common document types using browser APIs + lightweight libs
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import { strFromU8, unzipSync } from 'fflate';

// Configure worker path
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const MAX_TEXT_LENGTH = 30000; // chars — keep context manageable for the LLM

function truncate(text) {
  if (text.length <= MAX_TEXT_LENGTH) return text;
  return text.slice(0, MAX_TEXT_LENGTH) + '\n\n[... content truncated for length ...]';
}

function isProbablyBinary(bytes) {
  let nonAscii = 0;
  const sample = bytes.slice(0, 1024);
  for (let i = 0; i < sample.length; i++) {
    if (sample[i] === 0) return true;
    if (sample[i] > 127) nonAscii++;
  }
  return nonAscii > sample.length * 0.3;
}

async function parseTextFile(file) {
  return await file.text();
}

async function parseJsonFile(file) {
  const text = await file.text();
  try {
    const obj = JSON.parse(text);
    return JSON.stringify(obj, null, 2);
  } catch {
    return text; // not valid JSON, return raw
  }
}

async function parseCsvFile(file) {
  const text = await file.text();
  return text;
}

async function parsePdfFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = Math.min(pdf.numPages, 50); // cap at 50 pages
  let fullText = '';

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(' ');
    fullText += `--- Page ${i} ---\n${pageText}\n\n`;
  }

  return fullText || '[No extractable text found in this PDF]';
}

async function parseDocxFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const unzipped = unzipSync(bytes);

  // Word document XML is in word/document.xml
  const docXmlEntry = unzipped['word/document.xml'];
  if (!docXmlEntry) {
    return '[Could not extract text from this DOCX file]';
  }

  const xmlString = strFromU8(docXmlEntry);
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'application/xml');

  const paragraphs = [];

  // Walk through paragraphs (w:p) to preserve line breaks
  const paragraphs_nodes = doc.getElementsByTagName('w:p');
  for (const para of paragraphs_nodes) {
    const texts = para.getElementsByTagName('w:t');
    const parts = [];
    for (const t of texts) {
      parts.push(t.textContent || '');
    }
    if (parts.length > 0) {
      paragraphs.push(parts.join(''));
    }
  }

  const text = paragraphs.join('\n');
  return text || '[No extractable text found in this DOCX]';
}

async function parseXlsxFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const unzipped = unzipSync(bytes);

  // XLSX stores sheets in xl/worksheets/sheet1.xml, sheet2.xml, etc.
  const sheetKeys = Object.keys(unzipped).filter((k) =>
    k.match(/^xl\/worksheets\/sheet\d+\.xml$/)
  );
  sheetKeys.sort();

  // Shared strings are in xl/sharedStrings.xml
  let sharedStrings = [];
  const ssEntry = unzipped['xl/sharedStrings.xml'];
  if (ssEntry) {
    const ssXml = strFromU8(ssEntry);
    const parser = new DOMParser();
    const doc = parser.parseFromString(ssXml, 'application/xml');
    const siNodes = doc.getElementsByTagName('si');
    for (const si of siNodes) {
      const tNodes = si.getElementsByTagName('t');
      const parts = [];
      for (const t of tNodes) {
        parts.push(t.textContent || '');
      }
      sharedStrings.push(parts.join(''));
    }
  }

  let fullText = '';

  for (let s = 0; s < sheetKeys.length; s++) {
    const sheetXml = strFromU8(unzipped[sheetKeys[s]]);
    const parser = new DOMParser();
    const doc = parser.parseFromString(sheetXml, 'application/xml');

    fullText += `--- Sheet ${s + 1} ---\n`;

    const rows = doc.getElementsByTagName('row');
    for (const row of rows) {
      const cells = row.getElementsByTagName('c');
      const rowParts = [];
      for (const cell of cells) {
        const type = cell.getAttribute('t');
        const v = cell.getElementsByTagName('v')[0];
        const isNode = cell.getElementsByTagName('is')[0];
        let value = '';

        if (type === 's' && v) {
          // Shared string reference
          const idx = parseInt(v.textContent, 10);
          value = sharedStrings[idx] || '';
        } else if (type === 'inlineStr' && isNode) {
          const tNodes = isNode.getElementsByTagName('t');
          const parts = [];
          for (const t of tNodes) parts.push(t.textContent || '');
          value = parts.join('');
        } else if (v) {
          value = v.textContent || '';
        }

        rowParts.push(value);
      }
      if (rowParts.some((p) => p)) {
        fullText += rowParts.join(' | ') + '\n';
      }
    }
    fullText += '\n';
  }

  return fullText || '[No extractable data found in this XLSX]';
}

async function parseImageFile(file) {
  // For images, we return base64 for vision analysis
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve({ type: 'image', base64, dataUrl: reader.result });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Main entry point
export async function parseFile(file) {
  const name = file.name;
  const ext = name.split('.').pop()?.toLowerCase();
  const type = file.type;

  // Images
  if (type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) {
    const result = await parseImageFile(file);
    return {
      name,
      type: 'image',
      mimeType: type || `image/${ext}`,
      ...result,
    };
  }

  // Text-like files
  let textContent = '';
  let detectedType = 'text';

  try {
    if (ext === 'pdf' || type === 'application/pdf') {
      detectedType = 'pdf';
      textContent = await parsePdfFile(file);
    } else if (ext === 'docx' || type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      detectedType = 'docx';
      textContent = await parseDocxFile(file);
    } else if (ext === 'xlsx' || type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      detectedType = 'xlsx';
      textContent = await parseXlsxFile(file);
    } else if (ext === 'json') {
      detectedType = 'json';
      textContent = await parseJsonFile(file);
    } else if (ext === 'csv') {
      detectedType = 'csv';
      textContent = await parseCsvFile(file);
    } else if (ext === 'txt' || ext === 'md' || ext === 'log' || ext === 'xml' || ext === 'html' || ext === 'htm' || ext === 'js' || ext === 'ts' || ext === 'jsx' || ext === 'tsx' || ext === 'py' || ext === 'java' || ext === 'c' || ext === 'cpp' || ext === 'go' || ext === 'rs' || ext === 'sh' || ext === 'yaml' || ext === 'yml' || ext === 'ini' || ext === 'conf' || ext === 'env') {
      detectedType = 'text';
      textContent = await parseTextFile(file);
    } else if (ext === 'doc' || type === 'application/msword') {
      detectedType = 'doc';
      // Legacy .doc binary format — try as text, likely garbled but better than nothing
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      if (!isProbablyBinary(bytes)) {
        textContent = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
      } else {
        textContent = '[Legacy .doc format detected. Please convert to .docx for better text extraction.]';
      }
    } else if (ext === 'xls' || type === 'application/vnd.ms-excel') {
      detectedType = 'xls';
      textContent = '[Legacy .xls format detected. Please convert to .xlsx for better data extraction.]';
    } else {
      // Unknown type — try text, fall back to binary note
      try {
        textContent = await file.text();
        if (isProbablyBinary(new TextEncoder().encode(textContent))) {
          textContent = `[Binary file: ${name}. Content could not be extracted as text.]`;
        }
      } catch {
        textContent = `[File: ${name}. Content could not be extracted.]`;
      }
    }
  } catch (err) {
    textContent = `[Error parsing ${name}: ${err.message}]`;
  }

  return {
    name,
    type: detectedType,
    mimeType: type || 'text/plain',
    textContent: truncate(textContent),
    size: file.size,
  };
}

// Format parsed file content for inclusion in LLM messages
export function formatFileForContext(parsedFile) {
  if (parsedFile.type === 'image') {
    return `[Image attached: ${parsedFile.name}]`;
  }

  const header = `[File: ${parsedFile.name} | Type: ${parsedFile.type} | Size: ${formatBytes(parsedFile.size)}]`;
  const content = parsedFile.textContent || '[No content extracted]';
  return `${header}\n${content}`;
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const ACCEPTED_FILE_TYPES = [
  // Images
  'image/*',
  // Documents
  '.txt', '.md', '.log', '.json', '.csv', '.xml', '.html', '.htm',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx',
  // Code
  '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.c', '.cpp', '.go', '.rs', '.sh',
  '.yaml', '.yml', '.ini', '.conf', '.env',
].join(',');
