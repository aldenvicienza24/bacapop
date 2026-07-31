const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const sourceRoot = path.join(process.cwd(), 'public', 'images', 'novel', 'complete-animation-v1');
const outputRoot = path.join(process.cwd(), 'public', 'images', 'novel', 'complete-animation-lite-v2');
const groups = ['woman', 'man', 'transition', 'embrace'];

async function main() {
  for (const group of groups) {
    const sourceFolder = path.join(sourceRoot, group);
    const outputFolder = path.join(outputRoot, group);
    fs.mkdirSync(outputFolder, {recursive: true});
    const frames = fs.readdirSync(sourceFolder).filter((name) => name.endsWith('.png')).sort();
    for (const frame of frames) {
      await sharp(path.join(sourceFolder, frame))
        .resize(220, 220, {fit: 'fill'})
        .webp({quality: 78, alphaQuality: 90, effort: 5})
        .toFile(path.join(outputFolder, frame.replace(/\.png$/i, '.webp')));
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
