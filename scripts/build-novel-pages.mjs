import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createCanvas, DOMMatrix, ImageData, Path2D} from '@napi-rs/canvas';
import sharp from 'sharp';

globalThis.DOMMatrix = DOMMatrix;
globalThis.ImageData = ImageData;
globalThis.Path2D = Path2D;

const sourcePdf = process.argv[2];
if (!sourcePdf) {
  console.error('Usage: node scripts/build-novel-pages.mjs <novel.pdf>');
  process.exit(1);
}

const root = process.cwd();
const publicPdf = path.join(root, 'public', 'books', 'novel', 'laut-bercerita.pdf');
const coverFile = path.join(root, 'public', 'images', 'novel', 'laut-bercerita.webp');
const pdfjsPublic = path.join(root, 'public', 'pdfjs');
const outputFile = path.join(root, 'app', 'lib', 'novelPages.generated.js');

await fs.mkdir(path.dirname(publicPdf), {recursive: true});
await fs.mkdir(path.dirname(coverFile), {recursive: true});
await fs.mkdir(pdfjsPublic, {recursive: true});
await fs.copyFile(sourcePdf, publicPdf);
await fs.copyFile(
  path.join(root, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs'),
  path.join(pdfjsPublic, 'pdf.worker.min.mjs'),
);
await fs.cp(path.join(root, 'node_modules', 'pdfjs-dist', 'wasm'), path.join(pdfjsPublic, 'wasm'), {recursive: true});
await fs.cp(path.join(root, 'node_modules', 'pdfjs-dist', 'cmaps'), path.join(pdfjsPublic, 'cmaps'), {recursive: true});

const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
const data = new Uint8Array(await fs.readFile(sourcePdf));
const wasmUrl = `${pathToFileURL(path.join(root, 'node_modules', 'pdfjs-dist', 'wasm')).href}/`;
const document = await pdfjs.getDocument({data, disableWorker: true, useSystemFonts: true, useWasm: false, wasmUrl}).promise;

function cleanText(items) {
  const lines = [];
  let line = '';

  for (const item of items) {
    const text = item.str?.replace(/\s+/g, ' ').trim();
    if (text) line += `${line ? ' ' : ''}${text}`;
    if (item.hasEOL && line) {
      lines.push(line);
      line = '';
    }
  }
  if (line) lines.push(line);

  return lines
    .filter((value) => !/^\d+$/.test(value))
    .join('\n')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const pages = [];
for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
  const page = await document.getPage(pageNumber);
  const textContent = await page.getTextContent();
  const content = cleanText(textContent.items);
  pages.push({
    page_number: pageNumber,
    page_title: pageNumber === 1 ? 'Sampul' : `Halaman ${pageNumber}`,
    content,
  });
  process.stdout.write(`Extracted ${pageNumber}/${document.numPages}\r`);
}

const coverPage = await document.getPage(1);
const viewport = coverPage.getViewport({scale: 1.6});
const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
const context = canvas.getContext('2d');
context.fillStyle = '#ffffff';
context.fillRect(0, 0, canvas.width, canvas.height);
await coverPage.render({canvasContext: context, viewport}).promise;
await sharp(canvas.toBuffer('image/png')).webp({quality: 88, effort: 5}).toFile(coverFile);

const generated = `// Generated from the supplied Laut Bercerita PDF.\n` +
  `// Regenerate with scripts/build-novel-pages.mjs when the source changes.\n` +
  `const novelPages = ${JSON.stringify(pages, null, 2)};\n\nexport default novelPages;\n`;
await fs.writeFile(outputFile, generated, 'utf8');

console.log(`\nGenerated ${pages.length} novel pages, copied the PDF, and rendered its cover.`);
