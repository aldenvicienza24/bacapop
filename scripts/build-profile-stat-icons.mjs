import sharp from 'sharp';

const source = 'public/images/profile/stats-icons-source.png';
const transparent = 'public/images/profile/stats-icons-transparent.png';
const names = ['book-finished', 'book-reading', 'summary-valid', 'points-coin'];

const image = sharp(source).ensureAlpha();
const {data, info} = await image.raw().toBuffer({resolveWithObject: true});
for (let index = 0; index < data.length; index += 4) {
  const chromaScore = Math.min(data[index], data[index + 2]) - data[index + 1];
  const alpha = Math.max(0, Math.min(255, ((112 - chromaScore) / 56) * 255));
  data[index + 3] = Math.min(data[index + 3], alpha);
}

await sharp(data, {raw: info}).png({compressionLevel: 9}).toFile(transparent);

const halfWidth = Math.floor(info.width / 2);
const halfHeight = Math.floor(info.height / 2);
for (let index = 0; index < names.length; index += 1) {
  const left = index % 2 === 0 ? 0 : halfWidth;
  const top = index < 2 ? 0 : halfHeight;
  const quadrant = await sharp(transparent)
    .extract({left, top, width: halfWidth, height: halfHeight})
    .toBuffer();
  await sharp(quadrant)
    .trim({background: {r: 0, g: 0, b: 0, alpha: 0}})
    .resize(160, 160, {fit: 'contain', background: {r: 0, g: 0, b: 0, alpha: 0}})
    .webp({quality: 88, alphaQuality: 95})
    .toFile(`public/images/profile/${names[index]}.webp`);
}
