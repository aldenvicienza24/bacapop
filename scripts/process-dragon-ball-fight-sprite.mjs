import sharp from 'sharp';

const source = 'public/images/comic/dragon-ball-fight-sprites-source.png';
const output = 'public/images/comic/dragon-ball-fight-sprite.png';
const smoothOutput = 'public/images/comic/dragon-ball-fight-sprite-smooth.png';
const meleeOutput = 'public/images/comic/dragon-ball-melee-sprite.png';
const energyOutput = 'public/images/comic/dragon-ball-energy-sprite.png';
const gokuIdleOutput = 'public/images/comic/goku-idle.png';
const vegetaIdleOutput = 'public/images/comic/vegeta-idle.png';
const frameWidth = 320;
const frameHeight = 160;
const crops = [
  {left: 0, width: 400},
  {left: 390, width: 380},
  {left: 780, width: 310},
  {left: 1100, width: 285},
  {left: 1400, width: 395},
  {left: 1800, width: 372},
];

const {data, info} = await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject: true});

for (let index = 0; index < data.length; index += 4) {
  const red = data[index];
  const green = data[index + 1];
  const blue = data[index + 2];
  const dominance = green - Math.max(red, blue);

  if (green > 115 && dominance > 34) {
    data[index + 3] = Math.max(0, 255 - (dominance - 34) * 4);
    data[index + 1] = Math.min(green, Math.max(red, blue));
  }
}

const keyedBuffer = await sharp(data, {raw: info}).png().toBuffer();
const frames = [];

for (const crop of crops) {
  const cropped = await sharp(keyedBuffer)
    .extract({left: crop.left, top: 118, width: crop.width, height: 390})
    .png()
    .toBuffer();

  const frame = await sharp(cropped)
    .trim({background: {r: 0, g: 0, b: 0, alpha: 0}})
    .resize(frameWidth - 14, frameHeight - 10, {
      fit: 'contain',
      background: {r: 0, g: 0, b: 0, alpha: 0},
      kernel: sharp.kernel.nearest,
    })
    .png()
    .toBuffer();

  frames.push(frame);
}

const spriteBuffer = await sharp({
  create: {
    width: frameWidth * frames.length,
    height: frameHeight,
    channels: 4,
    background: {r: 0, g: 0, b: 0, alpha: 0},
  },
})
  .composite(frames.map((input, index) => ({input, left: index * frameWidth + 7, top: 5})))
  .png({compressionLevel: 9, palette: true, colours: 256})
  .toBuffer();

await sharp(spriteBuffer).toFile(output);

const rawFrames = await Promise.all(frames.map(async (_frame, index) => {
  const result = await sharp(spriteBuffer)
    .extract({left: index * frameWidth, top: 0, width: frameWidth, height: frameHeight})
    .ensureAlpha()
    .raw()
    .toBuffer({resolveWithObject: true});
  return result.data;
}));
const tweensPerPose = 4;

async function buildTweenSprite(sequence, target) {
  const tweenFrames = [];

  for (let frameIndex = 0; frameIndex < sequence.length; frameIndex += 1) {
    const current = rawFrames[sequence[frameIndex]];
    const next = rawFrames[sequence[(frameIndex + 1) % sequence.length]];

    for (let tween = 0; tween < tweensPerPose; tween += 1) {
      const amount = tween / tweensPerPose;
      const blended = Buffer.alloc(current.length);

      for (let pixel = 0; pixel < current.length; pixel += 1) {
        blended[pixel] = Math.round(current[pixel] * (1 - amount) + next[pixel] * amount);
      }

      tweenFrames.push(await sharp(blended, {
        raw: {width: frameWidth, height: frameHeight, channels: 4},
      }).png().toBuffer());
    }
  }

  await sharp({
    create: {
      width: frameWidth * tweenFrames.length,
      height: frameHeight,
      channels: 4,
      background: {r: 0, g: 0, b: 0, alpha: 0},
    },
  })
    .composite(tweenFrames.map((input, index) => ({input, left: index * frameWidth, top: 0})))
    .png({compressionLevel: 9, palette: true, colours: 256})
    .toFile(target);

  return tweenFrames.length;
}

await buildTweenSprite([0, 1, 2, 3, 4, 5], smoothOutput);
await buildTweenSprite([1, 2, 3, 2], meleeOutput);
await buildTweenSprite([4, 5], energyOutput);

const firstFrame = await sharp(spriteBuffer)
  .extract({left: 0, top: 0, width: frameWidth, height: frameHeight})
  .png()
  .toBuffer();

const gokuHalf = await sharp(firstFrame).extract({left: 0, top: 0, width: frameWidth / 2, height: frameHeight}).png().toBuffer();
const vegetaHalf = await sharp(firstFrame).extract({left: frameWidth / 2, top: 0, width: frameWidth / 2, height: frameHeight}).png().toBuffer();
await sharp(gokuHalf).trim().resize(82, 72, {fit: 'contain', kernel: sharp.kernel.nearest, background: {r: 0, g: 0, b: 0, alpha: 0}}).png().toFile(gokuIdleOutput);
await sharp(vegetaHalf).trim().resize(82, 72, {fit: 'contain', kernel: sharp.kernel.nearest, background: {r: 0, g: 0, b: 0, alpha: 0}}).png().toFile(vegetaIdleOutput);

console.log(output);
console.log(smoothOutput);
console.log(meleeOutput);
console.log(energyOutput);
