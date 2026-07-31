const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = path.join(process.cwd(), 'public', 'images', 'dongeng', 'companions-v1');
const source = path.join(root, 'fairytale-companions-atlas-green.png');
const animals = ['rabbit', 'fox', 'hedgehog', 'bird'];
const columns = 7;
const rows = 4;
const outputSize = 256;

async function removeGreen(input) {
  const {data, info} = await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject: true});

  for (let index = 0; index < data.length; index += 4) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const greenLead = green - Math.max(red, blue);

    if (green > 74 && greenLead > 7) {
      let alpha = Math.max(0, Math.min(255, 255 - (greenLead - 7) * 1.62));
      if (alpha < 34) alpha = 0;
      data[index + 1] = Math.min(green, Math.max(red, blue) + 5);
      data[index + 3] = Math.min(data[index + 3], alpha);
    }
  }

  return sharp(data, {raw: info});
}

async function keepMainCharacter(input) {
  const {data, info} = await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject: true});
  const pixelCount = info.width * info.height;
  const visited = new Uint8Array(pixelCount);
  let largest = [];

  for (let start = 0; start < pixelCount; start += 1) {
    if (visited[start] || data[start * 4 + 3] < 42) continue;
    const queue = [start];
    const component = [];
    visited[start] = 1;

    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const index = queue[cursor];
      component.push(index);
      const x = index % info.width;
      const y = Math.floor(index / info.width);
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (!dx && !dy) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= info.width || ny < 0 || ny >= info.height) continue;
          const next = ny * info.width + nx;
          if (!visited[next] && data[next * 4 + 3] >= 42) {
            visited[next] = 1;
            queue.push(next);
          }
        }
      }
    }
    if (component.length > largest.length) largest = component;
  }

  const keep = new Uint8Array(pixelCount);
  largest.forEach((index) => {
    const x = index % info.width;
    const y = Math.floor(index / info.width);
    for (let dy = -2; dy <= 2; dy += 1) {
      for (let dx = -2; dx <= 2; dx += 1) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < info.width && ny >= 0 && ny < info.height) keep[ny * info.width + nx] = 1;
      }
    }
  });
  for (let index = 0; index < pixelCount; index += 1) {
    if (!keep[index]) data[index * 4 + 3] = 0;
  }
  return sharp(data, {raw: info}).png().toBuffer();
}

async function processFrame(row, column) {
  const metadata = await sharp(source).metadata();
  const x0 = Math.round(column * metadata.width / columns);
  const x1 = Math.round((column + 1) * metadata.width / columns);
  const y0 = Math.round(row * metadata.height / rows);
  const y1 = Math.round((row + 1) * metadata.height / rows);
  const crop = await sharp(source)
    .extract({left: x0, top: y0, width: x1 - x0, height: y1 - y0})
    .png()
    .toBuffer();
  const keyed = await keepMainCharacter(await (await removeGreen(crop)).png().toBuffer());
  const {data, info} = await sharp(keyed)
    .trim({background: {r: 0, g: 0, b: 0, alpha: 0}})
    .png()
    .toBuffer({resolveWithObject: true});

  const maxWidth = row === 3 ? 188 : 184;
  const maxHeight = row === 3 ? 150 : 206;
  const scale = Math.min(maxWidth / info.width, maxHeight / info.height, 1);
  const width = Math.max(1, Math.round(info.width * scale));
  const height = Math.max(1, Math.round(info.height * scale));
  const left = Math.round((outputSize - width) / 2);
  const top = row === 3 ? Math.round((outputSize - height) / 2) : 238 - height;
  const folder = path.join(root, animals[row]);
  fs.mkdirSync(folder, {recursive: true});

  await sharp({
    create: {width: outputSize, height: outputSize, channels: 4, background: {r: 0, g: 0, b: 0, alpha: 0}},
  })
    .composite([{input: await sharp(data).resize(width, height).png().toBuffer(), left, top}])
    .png()
    .toFile(path.join(folder, `frame-${String(column + 1).padStart(2, '0')}.png`));
}

async function main() {
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      await processFrame(row, column);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
