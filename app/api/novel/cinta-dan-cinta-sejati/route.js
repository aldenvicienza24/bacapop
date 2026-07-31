import {readFile} from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const file = await readFile(path.join(
    process.cwd(),
    'public',
    'books',
    'novel',
    'cinta-dan-cinta-sejati',
    'book.pdf',
  ));
  const payload = JSON.stringify({data: file.toString('base64')});

  return new Response(payload, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': String(Buffer.byteLength(payload)),
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
