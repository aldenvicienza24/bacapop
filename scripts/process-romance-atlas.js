const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = path.join(process.cwd(), 'public', 'images', 'novel', 'complete-animation-v1');
const source = path.join(root, 'romance-complete-atlas-green.png');
const FRAME_WIDTH = 256;
const FRAME_HEIGHT = 420;
const BASELINE = 380;

const sequences = [
  {name: 'woman', row: 0, columns: [0, 1, 2, 3]},
  {name: 'man', row: 0, columns: [4, 5, 6, 7]},
  {name: 'transition', row: 1, columns: [1, 2, 3, 4, 5, 6, 7]},
  {name: 'embrace', row: 2, columns: [0, 1, 2, 3, 4, 5, 6, 7]},
];

function removeGreen(data, info) {
  let left = info.width;
  let top = info.height;
  let right = 0;
  let bottom = 0;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const offset = (y * info.width + x) * 4;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      const greenLead = g - Math.max(r, b);
      let alpha = 255;

      if (g > 80 && greenLead > 8) {
        alpha = Math.max(0, Math.min(255, 255 - (greenLead - 8) * 1.55));
        data[offset + 1] = Math.min(g, Math.max(r, b) + 4);
      }
      if (alpha < 30) alpha = 0;
      data[offset + 3] = alpha;

      if (alpha > 48) {
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    }
  }

  return {data, bounds: {left, top, right, bottom}};
}

async function main() {
  const metadata = await sharp(source).metadata();
  const xCuts = Array.from({length: 9}, (_, index) => Math.round(index * metadata.width / 8));
  const yCuts = Array.from({length: 4}, (_, index) => Math.round(index * metadata.height / 3));

  for (const sequence of sequences) {
    const target = path.join(root, sequence.name);
    fs.mkdirSync(target, {recursive: true});

    for (let index = 0; index < sequence.columns.length; index += 1) {
      const column = sequence.columns[index];
      const left = xCuts[column];
      const top = yCuts[sequence.row];
      const width = xCuts[column + 1] - left;
      const height = yCuts[sequence.row + 1] - top;
      const raw = await sharp(source)
        .extract({left, top, width, height})
        .ensureAlpha()
        .raw()
        .toBuffer({resolveWithObject: true});
      const keyed = removeGreen(raw.data, raw.info);
      const contentCenter = (keyed.bounds.left + keyed.bounds.right) / 2;
      const placeLeft = Math.round(FRAME_WIDTH / 2 - contentCenter);
      const placeTop = Math.round(BASELINE - keyed.bounds.bottom);
      const file = path.join(target, `frame-${String(index + 1).padStart(2, '0')}.png`);

      const tile = await sharp(keyed.data, {raw: raw.info}).png().toBuffer();
      let frame = await sharp({
        create: {width: FRAME_WIDTH, height: FRAME_HEIGHT, channels: 4, background: {r: 0, g: 0, b: 0, alpha: 0}},
      }).composite([{input: tile, left: placeLeft, top: placeTop}]).png().toBuffer();

      // The atlas generator left a detached sliver from the preceding cell in
      // the second meet-to-embrace frame. Remove only that empty-side fragment.
      if (sequence.name === 'transition' && index === 1) {
        frame = await sharp(frame)
          .extract({left: 70, top: 0, width: FRAME_WIDTH - 70, height: FRAME_HEIGHT})
          .extend({left: 70, background: {r: 0, g: 0, b: 0, alpha: 0}})
          .png()
          .toBuffer();
      }

      await sharp(frame).png().toFile(file);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
