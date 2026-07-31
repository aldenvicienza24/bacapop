import fs from 'node:fs';
import path from 'node:path';
import {createCanvas, loadImage} from '@napi-rs/canvas';

const [sourcePath, outputPath] = process.argv.slice(2);

if (!sourcePath || !outputPath) {
  throw new Error('Usage: node scripts/build-kursi-kosong-cover.mjs <artwork> <output>');
}

const artwork = await loadImage(sourcePath);
const width = 1024;
const height = 1536;
const canvas = createCanvas(width, height);
const context = canvas.getContext('2d');

context.drawImage(artwork, 0, 0, width, height);

const topShade = context.createLinearGradient(0, 0, 0, 640);
topShade.addColorStop(0, 'rgba(3, 7, 18, .96)');
topShade.addColorStop(.58, 'rgba(3, 7, 18, .72)');
topShade.addColorStop(1, 'rgba(3, 7, 18, 0)');
context.fillStyle = topShade;
context.fillRect(0, 0, width, 680);

const bottomShade = context.createLinearGradient(0, 1120, 0, height);
bottomShade.addColorStop(0, 'rgba(4, 7, 16, 0)');
bottomShade.addColorStop(1, 'rgba(4, 7, 16, .96)');
context.fillStyle = bottomShade;
context.fillRect(0, 1080, width, height - 1080);

context.strokeStyle = '#f04464';
context.lineWidth = 10;
context.strokeRect(28, 28, width - 56, height - 56);
context.strokeStyle = 'rgba(255, 226, 190, .72)';
context.lineWidth = 2;
context.strokeRect(46, 46, width - 92, height - 92);

context.fillStyle = '#f04464';
context.fillRect(72, 86, 328, 66);
context.fillStyle = '#fff5e9';
context.font = '700 28px Arial';
context.letterSpacing = '4px';
context.fillText('ANTOLOGI CERPEN HOROR', 96, 130);

context.fillStyle = '#fff5e9';
context.shadowColor = 'rgba(0, 0, 0, .9)';
context.shadowBlur = 18;
context.font = '700 122px Georgia';
context.textAlign = 'center';
context.fillText('KURSI', width / 2, 296);
context.fillText('KOSONG', width / 2, 424);

context.shadowBlur = 0;
context.fillStyle = '#f04464';
context.fillRect(324, 466, 376, 9);

context.fillStyle = '#fff5e9';
context.font = '700 31px Arial';
context.textAlign = 'left';
context.fillText('SANDYA LUSTIKA DKK.', 74, 1418);
context.fillStyle = '#c8ccd8';
context.font = '500 22px Arial';
context.fillText('KUMPULAN KISAH TEROR DARI BALIK KEHENINGAN', 74, 1462);

fs.mkdirSync(path.dirname(outputPath), {recursive: true});
fs.writeFileSync(outputPath, canvas.toBuffer('image/jpeg', 92));
