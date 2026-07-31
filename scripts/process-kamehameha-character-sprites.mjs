import sharp from 'sharp';

const assets = [
  ['public/images/comic/goku-kamehameha-sprites-source.png', 'public/images/comic/goku-kamehameha-sprites.png', 'public/images/comic/goku-kamehameha-sprite-normalized.png', -100],
  ['public/images/comic/vegeta-kamehameha-sprites-source.png', 'public/images/comic/vegeta-kamehameha-sprites.png', 'public/images/comic/vegeta-kamehameha-sprite-normalized.png', 100],
];

async function keepMainSprite(buffer) {
  const {data, info} = await sharp(buffer).ensureAlpha().raw().toBuffer({resolveWithObject: true});
  const total = info.width * info.height;
  const labels = new Int32Array(total);
  const queue = new Int32Array(total);
  const sizes = [0];
  let label = 0;

  for (let start = 0; start < total; start += 1) {
    if (labels[start] || data[start * 4 + 3] < 28) continue;
    label += 1;
    let head = 0;
    let tail = 0;
    let size = 0;
    queue[tail++] = start;
    labels[start] = label;

    while (head < tail) {
      const pixel = queue[head++];
      size += 1;
      const x = pixel % info.width;
      const y = Math.floor(pixel / info.width);
      const neighbours = [
        x > 0 ? pixel - 1 : -1,
        x < info.width - 1 ? pixel + 1 : -1,
        y > 0 ? pixel - info.width : -1,
        y < info.height - 1 ? pixel + info.width : -1,
      ];

      for (const neighbour of neighbours) {
        if (neighbour < 0 || labels[neighbour] || data[neighbour * 4 + 3] < 28) continue;
        labels[neighbour] = label;
        queue[tail++] = neighbour;
      }
    }
    sizes[label] = size;
  }

  let mainLabel = 0;
  for (let index = 1; index < sizes.length; index += 1) {
    if (sizes[index] > (sizes[mainLabel] || 0)) mainLabel = index;
  }
  for (let pixel = 0; pixel < total; pixel += 1) {
    if (labels[pixel] !== mainLabel) data[pixel * 4 + 3] = 0;
  }

  return sharp(data, {raw: info}).png().toBuffer();
}

for (const [source, output, normalizedOutput, firingOffset] of assets) {
  const {data, info} = await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject: true});

  for (let index = 0; index < data.length; index += 4) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const dominance = green - Math.max(red, blue);

    if (green > 110 && dominance > 30) {
      data[index + 3] = Math.max(0, 255 - (dominance - 30) * 4.5);
      data[index + 1] = Math.min(green, Math.max(red, blue));
    }
  }

  const keyed = await sharp(data, {raw: info}).png().toBuffer();
  await sharp(keyed).png({compressionLevel: 9, palette: true, colours: 256}).toFile(output);

  const frameWidth = Math.floor(info.width / 6);
  const normalizedWidth = 320;
  const normalizedHeight = 160;
  const frames = [];

  for (let frameIndex = 0; frameIndex < 6; frameIndex += 1) {
    const defaultLeft = frameIndex * frameWidth;
    const shiftedLeft = frameIndex === 3 ? defaultLeft + firingOffset : defaultLeft;
    const frameLeft = Math.max(0, Math.min(info.width - frameWidth, shiftedLeft));
    const cell = await sharp(keyed)
      .extract({left: frameLeft, top: 90, width: frameWidth, height: Math.min(470, info.height - 90)})
      .png()
      .toBuffer();
    const cleanedCell = await keepMainSprite(cell);
    const frame = await sharp(cleanedCell)
      .trim({background: {r: 0, g: 0, b: 0, alpha: 0}})
      .resize(normalizedWidth - 12, normalizedHeight - 10, {
        fit: 'contain',
        kernel: sharp.kernel.nearest,
        background: {r: 0, g: 0, b: 0, alpha: 0},
      })
      .png()
      .toBuffer();
    frames.push(frame);
  }

  await sharp({create: {width: normalizedWidth * 6, height: normalizedHeight, channels: 4, background: {r: 0, g: 0, b: 0, alpha: 0}}})
    .composite(frames.map((input, index) => ({input, left: index * normalizedWidth + 6, top: 5})))
    .png({compressionLevel: 9, palette: true, colours: 256})
    .toFile(normalizedOutput);

  console.log(output);
  console.log(normalizedOutput);
}
