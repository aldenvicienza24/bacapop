import sharp from 'sharp';

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error('Usage: node scripts/remove-green-screen.mjs <input> <output>');
  process.exit(1);
}

const {data, info} = await sharp(input)
  .ensureAlpha()
  .raw()
  .toBuffer({resolveWithObject: true});

for (let index = 0; index < data.length; index += 4) {
  const red = data[index];
  const green = data[index + 1];
  const blue = data[index + 2];
  const keyDistance = Math.sqrt((red * red) + ((255 - green) ** 2) + (blue * blue));

  let alpha = 255;
  if (keyDistance < 145 && green > 155) {
    const normalized = Math.min(1, Math.max(0, (keyDistance - 28) / 117));
    const smooth = normalized * normalized * (3 - (2 * normalized));
    alpha = Math.round(255 * smooth);
  }

  if (alpha < 250) {
    data[index + 1] = Math.min(green, Math.round(Math.max(red, blue) * 1.06));
  }
  data[index + 3] = alpha < 8 ? 0 : alpha;
}

await sharp(data, {
  raw: {width: info.width, height: info.height, channels: 4},
})
  .png({compressionLevel: 9})
  .toFile(output);

console.log(`Removed green screen: ${input} -> ${output}`);
