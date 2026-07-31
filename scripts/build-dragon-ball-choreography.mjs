import sharp from 'sharp';

const stageWidth = 400;
const stageHeight = 100;
const characterWidth = 180;
const characterHeight = 90;
const gokuSource = 'public/images/comic/goku-kamehameha-sprite-normalized.png';
const vegetaSource = 'public/images/comic/vegeta-kamehameha-sprite-normalized.png';
const output = 'public/images/comic/dragon-ball-choreography-sprite.png';

async function extractPoses(source) {
  const poses = [];
  for (let index = 0; index < 6; index += 1) {
    const cell = await sharp(source).extract({left: index * 320, top: 0, width: 320, height: 160}).png().toBuffer();
    poses.push(await sharp(cell).resize(characterWidth, characterHeight, {fit: 'fill', kernel: sharp.kernel.nearest}).png().toBuffer());
  }
  return poses;
}

const [goku, vegeta] = await Promise.all([extractPoses(gokuSource), extractPoses(vegetaSource)]);
const frames = [];

function lerp(from, to, amount) {
  return Math.round(from + (to - from) * amount);
}

function beamSvg() {
  return Buffer.from(`<svg width="150" height="34" viewBox="0 0 150 34" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="b" y1="0" y2="1"><stop stop-color="#1ca8ff"/><stop offset=".35" stop-color="#fff"/><stop offset=".65" stop-color="#fff"/><stop offset="1" stop-color="#1ca8ff"/></linearGradient></defs>
    <rect x="0" y="11" width="150" height="12" rx="6" fill="url(#b)" stroke="#9ce8ff" stroke-width="2"/>
    <circle cx="75" cy="17" r="15" fill="#5bd6ff" stroke="#fff" stroke-width="3"/>
    <circle cx="75" cy="17" r="8" fill="#fff"/>
  </svg>`);
}

function impactSvg(frame) {
  const rotate = frame % 2 ? 10 : -8;
  return Buffer.from(`<svg width="54" height="54" viewBox="0 0 54 54" xmlns="http://www.w3.org/2000/svg"><g transform="rotate(${rotate} 27 27)"><path d="M27 0l5 16L45 6l-5 16 14 5-16 4 10 15-17-8-4 16-5-16L6 47l8-15-14-5 16-5L7 8l16 8z" fill="#ffd91a" stroke="#fff" stroke-width="2"/><circle cx="27" cy="27" r="7" fill="#fff"/></g></svg>`);
}

for (let frame = 0; frame < 40; frame += 1) {
  let pose = 0;
  let gokuX = 0;
  let vegetaX = 220;
  let addBeam = false;
  let addImpact = false;

  if (frame >= 3 && frame <= 5) pose = 1;
  if (frame >= 6 && frame <= 8) pose = 2;
  if (frame >= 9 && frame <= 12) { pose = 3; addBeam = true; }
  if (frame >= 14 && frame <= 18) {
    pose = 4;
    const progress = (frame - 14) / 4;
    gokuX = lerp(0, 80, progress);
    vegetaX = lerp(220, 140, progress);
  }
  if (frame >= 19 && frame <= 28) {
    pose = frame % 3 === 0 ? 0 : 4;
    gokuX = 80 + (frame % 2 ? 8 : -5);
    vegetaX = 140 + (frame % 2 ? -8 : 5);
    addImpact = frame % 2 === 0;
  }
  if (frame >= 29 && frame <= 33) {
    pose = 5;
    const progress = (frame - 29) / 4;
    gokuX = lerp(80, 0, progress);
    vegetaX = lerp(140, 220, progress);
  }
  if (frame === 34) pose = 1;
  if (frame === 35) pose = 2;
  if (frame >= 36) { pose = 3; addBeam = true; }

  const layers = [
    {input: goku[pose], left: gokuX, top: 5},
    {input: vegeta[pose], left: vegetaX, top: 5},
  ];
  if (addBeam) layers.push({input: beamSvg(), left: 125, top: 33});
  if (addImpact) layers.push({input: impactSvg(frame), left: 173, top: 20});

  frames.push(await sharp({create: {width: stageWidth, height: stageHeight, channels: 4, background: {r: 0, g: 0, b: 0, alpha: 0}}}).composite(layers).png().toBuffer());
}

await sharp({create: {width: stageWidth * frames.length, height: stageHeight, channels: 4, background: {r: 0, g: 0, b: 0, alpha: 0}}})
  .composite(frames.map((input, index) => ({input, left: index * stageWidth, top: 0})))
  .png({compressionLevel: 9, palette: true, colours: 256})
  .toFile(output);

console.log(output);
