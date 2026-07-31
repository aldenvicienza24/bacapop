'use client';

import {useEffect, useRef} from 'react';

const FRAME_COUNT = 7;
const companions = [
  {name: 'rabbit', duration: 15.5, delay: 0, size: 0.19, y: 0.76, direction: 1, fps: 7},
  {name: 'fox', duration: 20, delay: 2.8, size: 0.21, y: 0.8, direction: -1, fps: 6},
  {name: 'hedgehog', duration: 23, delay: 5.4, size: 0.15, y: 0.78, direction: 1, fps: 5},
  {name: 'bird', duration: 17.5, delay: 1.2, size: 0.14, y: 0.31, direction: 1, fps: 8},
];

function loadImage(src) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function easeInOut(value) {
  return value < 0.5 ? 2 * value * value : 1 - ((-2 * value + 2) ** 2) / 2;
}

export default function DongengCompanionAnimation({className = ''}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return undefined;

    const context = canvas.getContext('2d');
    const frameSets = {};
    let animationFrame = 0;
    let disposed = false;
    let startTime = performance.now();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const resize = () => {
      const rect = host.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(rect.width * ratio));
      canvas.height = Math.max(1, Math.round(rect.height * ratio));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const drawCompanion = (item, elapsed, width, height) => {
      const frames = frameSets[item.name];
      if (!frames?.length) return;
      const local = elapsed / 1000 - item.delay;
      if (local < 0 && !reducedMotion) return;
      const cycle = ((local % item.duration) + item.duration) % item.duration;
      const progress = reducedMotion ? 0.5 : cycle / item.duration;
      const returning = progress >= 0.5;
      const travel = easeInOut(returning ? (1 - progress) * 2 : progress * 2);
      const spriteSize = Math.min(width, height * 1.24) * item.size;
      const safeMargin = Math.max(spriteSize * 0.76, width * 0.17);
      const from = item.direction === 1 ? safeMargin : width - safeMargin;
      const to = item.direction === 1 ? width - safeMargin : safeMargin;
      const x = from + (to - from) * travel;
      const step = reducedMotion ? 0 : Math.floor(local * item.fps) % FRAME_COUNT;
      const image = frames[(step + FRAME_COUNT) % FRAME_COUNT];
      if (!image) return;

      let y = height * item.y;
      if (item.name === 'rabbit') y -= Math.abs(Math.sin(progress * Math.PI * 11)) * height * 0.09;
      if (item.name === 'bird') y += Math.sin(progress * Math.PI * 6) * height * 0.055;
      if (item.name === 'hedgehog') y += Math.sin(progress * Math.PI * 18) * 2;

      context.save();
      context.globalAlpha = 1;
      context.translate(x, y);
      const movingRight = returning ? item.direction === -1 : item.direction === 1;
      if (!movingRight) context.scale(-1, 1);
      context.drawImage(image, -spriteSize / 2, -spriteSize, spriteSize, spriteSize);
      context.restore();
    };

    const render = (now) => {
      if (disposed) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.width / ratio;
      const height = canvas.height / ratio;
      context.clearRect(0, 0, width, height);
      companions.forEach((item) => drawCompanion(item, now - startTime, width, height));
      if (!reducedMotion) animationFrame = requestAnimationFrame(render);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    Promise.all(companions.map(async ({name}) => {
      frameSets[name] = await Promise.all(Array.from({length: FRAME_COUNT}, (_, index) => (
        loadImage(`/images/dongeng/companions-v1/${name}/frame-${String(index + 1).padStart(2, '0')}.png`)
      )));
    })).then(() => {
      if (!disposed) {
        startTime = performance.now();
        animationFrame = requestAnimationFrame(render);
      }
    });

    return () => {
      disposed = true;
      observer.disconnect();
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
