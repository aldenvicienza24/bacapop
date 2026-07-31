import sharp from 'sharp';

const source = 'public/images/comic/dragon-ball-melee-v2-source.png';
const transparent = 'public/images/comic/dragon-ball-melee-v2.png';
const outputs = [
  'public/images/comic/goku-melee-v2.png',
  'public/images/comic/vegeta-melee-v2.png',
];

async function keepLargestSprite(buffer) {
  const {data: pixels, info: rawInfo} = await sharp(buffer).ensureAlpha().raw().toBuffer({resolveWithObject: true});
  const total = rawInfo.width * rawInfo.height;
  const labels = new Int32Array(total);
  const queue = new Int32Array(total);
  const sizes = [0];
  let label = 0;

  for (let start = 0; start < total; start += 1) {
    if (labels[start] || pixels[start * 4 + 3] < 35) continue;
    label += 1;
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    labels[start] = label;
    while (head < tail) {
      const pixel = queue[head++];
      sizes[label] = (sizes[label] || 0) + 1;
      const x = pixel % rawInfo.width;
      const y = Math.floor(pixel / rawInfo.width);
      const neighbours = [
        x ? pixel - 1 : -1,
        x < rawInfo.width - 1 ? pixel + 1 : -1,
        y ? pixel - rawInfo.width : -1,
        y < rawInfo.height - 1 ? pixel + rawInfo.width : -1,
      ];
      for (const neighbour of neighbours) {
        if (neighbour < 0 || labels[neighbour] || pixels[neighbour * 4 + 3] < 35) continue;
        labels[neighbour] = label;
        queue[tail++] = neighbour;
      }
    }
  }

  let largest = 0;
  for (let index = 1; index < sizes.length; index += 1) {
    if (sizes[index] > (sizes[largest] || 0)) largest = index;
  }
  for (let pixel = 0; pixel < total; pixel += 1) {
    if (labels[pixel] !== largest) pixels[pixel * 4 + 3] = 0;
  }
  return sharp(pixels, {raw: rawInfo}).png().toBuffer();
}

const {data, info} = await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject: true});

for (let index = 0; index < data.length; index += 4) {
  const red = data[index];
  const green = data[index + 1];
  const blue = data[index + 2];
  const dominance = green - Math.max(red, blue);

  if (green > 105 && dominance > 28) {
    data[index + 3] = Math.max(0, 255 - (dominance - 28) * 5.5);
    data[index + 1] = Math.min(green, Math.max(red, blue));
  }
}

const keyed = await sharp(data, {raw: info}).png().toBuffer();
await sharp(keyed).png({compressionLevel: 9, palette: true, colours: 256}).toFile(transparent);

const columns = 8;
const rows = 2;
const cellWidth = Math.floor(info.width / columns);
const cellHeight = Math.floor(info.height / rows);
const frameWidth = 240;
const frameHeight = 150;

for (let row = 0; row < rows; row += 1) {
  const frames = [];
  for (let column = 0; column < columns; column += 1) {
    const cropWidth = Math.min(320, info.width);
    const centerX = Math.round((column + .5) * cellWidth);
    const cropLeft = Math.max(0, Math.min(info.width - cropWidth, centerX - Math.floor(cropWidth / 2)));
    const extracted = await sharp(keyed)
      .extract({
        left: cropLeft,
        top: row * cellHeight,
        width: cropWidth,
        height: row === rows - 1 ? info.height - row * cellHeight : cellHeight,
      })
      .png()
      .toBuffer();
    const isolated = await keepLargestSprite(extracted);
    const cell = await sharp(isolated)
      .trim({background: {r: 0, g: 0, b: 0, alpha: 0}})
      .resize(frameWidth - 10, frameHeight - 8, {
        fit: 'contain',
        kernel: sharp.kernel.nearest,
        background: {r: 0, g: 0, b: 0, alpha: 0},
      })
      .png()
      .toBuffer();
    frames.push(cell);
  }

  await sharp({
    create: {
      width: frameWidth * columns,
      height: frameHeight,
      channels: 4,
      background: {r: 0, g: 0, b: 0, alpha: 0},
    },
  })
    .composite(frames.map((input, column) => ({input, left: column * frameWidth + 5, top: 4})))
    .png({compressionLevel: 9, palette: true, colours: 256})
    .toFile(outputs[row]);
}

console.log([transparent, ...outputs].join('\n'));
