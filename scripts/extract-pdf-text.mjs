import fs from 'node:fs';
import zlib from 'node:zlib';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/extract-pdf-text.mjs <file.pdf>');
  process.exit(1);
}

const raw = fs.readFileSync(file);
const latin = raw.toString('latin1');
const streams = [];
const cmapText = [];
const streamRe = /<<(.*?)>>\s*stream\r?\n([\s\S]*?)\r?\nendstream/g;

function unescapePdfString(value) {
  return value
    .replace(/\\([nrtbf()\\])/g, (_, char) => {
      if (char === 'n') return '\n';
      if (char === 'r') return '\r';
      if (char === 't') return '\t';
      if (char === 'b') return '\b';
      if (char === 'f') return '\f';
      return char;
    })
    .replace(/\\([0-7]{1,3})/g, (_, octal) => String.fromCharCode(Number.parseInt(octal, 8)));
}

function extractStrings(text) {
  const chunks = [];
  const stringRe = /\((?:\\.|[^\\)])*\)\s*(?:Tj|'|")|<([0-9A-Fa-f\s]+)>\s*Tj|\[(.*?)\]\s*TJ/gms;
  let match;

  while ((match = stringRe.exec(text))) {
    if (match[0].includes(']')) {
      const arrayText = match[2] || '';
      const partRe = /\((?:\\.|[^\\)])*\)|<([0-9A-Fa-f\s]+)>/g;
      let part;
      let line = '';
      while ((part = partRe.exec(arrayText))) {
        if (part[0].startsWith('(')) line += unescapePdfString(part[0].slice(1, -1));
        else line += decodeHex(part[1] || part[0].slice(1, -1));
      }
      if (line.trim()) chunks.push(line.trim());
    } else if (match[1]) {
      const value = decodeHex(match[1]).trim();
      if (value) chunks.push(value);
    } else {
      const start = match[0].indexOf('(');
      const end = match[0].lastIndexOf(')');
      if (start >= 0 && end > start) {
        const value = unescapePdfString(match[0].slice(start + 1, end)).trim();
        if (value) chunks.push(value);
      }
    }
  }

  return chunks;
}

function decodeHex(hex) {
  const cleaned = hex.replace(/\s+/g, '');
  const chars = [];
  for (let i = 0; i < cleaned.length; i += 4) {
    const code = cleaned.slice(i, i + 4);
    if (code.length === 4) chars.push(cmap.get(code.toUpperCase()) || String.fromCharCode(Number.parseInt(code, 16)));
  }
  return chars.join('');
}

function parseCMap(text) {
  const map = new Map();
  const bfcharRe = /beginbfchar([\s\S]*?)endbfchar/g;
  const bfrangeRe = /beginbfrange([\s\S]*?)endbfrange/g;
  let match;

  while ((match = bfcharRe.exec(text))) {
    const rowRe = /<([0-9A-Fa-f]+)>\s+<([0-9A-Fa-f]+)>/g;
    let row;
    while ((row = rowRe.exec(match[1]))) {
      map.set(row[1].toUpperCase(), hexToUnicode(row[2]));
    }
  }

  while ((match = bfrangeRe.exec(text))) {
    const rowRe = /<([0-9A-Fa-f]+)>\s+<([0-9A-Fa-f]+)>\s+(?:<([0-9A-Fa-f]+)>|\[([^\]]+)\])/g;
    let row;
    while ((row = rowRe.exec(match[1]))) {
      const start = Number.parseInt(row[1], 16);
      const end = Number.parseInt(row[2], 16);
      if (row[3]) {
        const dest = Number.parseInt(row[3], 16);
        for (let code = start; code <= end; code += 1) {
          map.set(code.toString(16).toUpperCase().padStart(row[1].length, '0'), String.fromCodePoint(dest + code - start));
        }
      } else if (row[4]) {
        const values = [...row[4].matchAll(/<([0-9A-Fa-f]+)>/g)].map((item) => hexToUnicode(item[1]));
        values.forEach((value, index) => {
          map.set((start + index).toString(16).toUpperCase().padStart(row[1].length, '0'), value);
        });
      }
    }
  }

  return map;
}

function hexToUnicode(hex) {
  const cleaned = hex.replace(/\s+/g, '');
  const codes = [];
  for (let i = 0; i < cleaned.length; i += 4) {
    const chunk = cleaned.slice(i, i + 4);
    if (chunk.length === 4) codes.push(Number.parseInt(chunk, 16));
  }
  return String.fromCodePoint(...codes.filter(Number.isFinite));
}

let match;
const decodedStreams = [];
while ((match = streamRe.exec(latin))) {
  const dict = match[1];
  const body = Buffer.from(match[2], 'latin1');
  let decoded = body;

  if (/\/FlateDecode/.test(dict)) {
    try {
      decoded = zlib.inflateSync(body);
    } catch {
      continue;
    }
  }

  const text = decoded.toString('latin1');
  decodedStreams.push(text);
  if (/beginbfchar|beginbfrange/.test(text)) cmapText.push(text);
}

const cmap = cmapText.reduce((merged, text) => {
  for (const [key, value] of parseCMap(text)) merged.set(key, value);
  return merged;
}, new Map());

for (const text of decodedStreams) {
  const strings = extractStrings(text);
  if (strings.length) streams.push(strings.join('\n'));
}

console.log(
  streams
    .join('\n\n---PAGE---\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim(),
);
