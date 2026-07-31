import fs from 'node:fs/promises';
import path from 'node:path';
import {createCanvas, DOMMatrix, ImageData, Path2D} from '@napi-rs/canvas';
import sharp from 'sharp';

globalThis.DOMMatrix = DOMMatrix;
globalThis.ImageData = ImageData;
globalThis.Path2D = Path2D;

const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
const source = process.argv[2] || 'public/books/komik-merkuri.pdf';
const output = process.argv[3] || 'public/images/comic/merkuri';
const firstPage = Math.max(1, Number.parseInt(process.argv[4] || '1', 10));
const requestedLastPage = Number.parseInt(process.argv[5] || '', 10);
await fs.mkdir(output, {recursive: true});

const data = new Uint8Array(await fs.readFile(source));
const document = await pdfjs.getDocument({data, disableWorker: true, useSystemFonts: true}).promise;
const lastPage = Number.isFinite(requestedLastPage)
  ? Math.min(document.numPages, Math.max(firstPage, requestedLastPage))
  : document.numPages;

for (let pageNumber = firstPage; pageNumber <= lastPage; pageNumber += 1) {
  const page = await document.getPage(pageNumber);
  const viewport = page.getViewport({scale: 1.55});
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const context = canvas.getContext('2d');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({canvasContext: context, viewport}).promise;

  const filename = `page-${String(pageNumber).padStart(3, '0')}.webp`;
  await sharp(canvas.toBuffer('image/png')).webp({quality: 86, effort: 5}).toFile(path.join(output, filename));
  process.stdout.write(`Rendered ${pageNumber}/${lastPage}\r`);
}

console.log(`\nRendered pages ${firstPage}-${lastPage} of ${document.numPages} to ${output}`);
