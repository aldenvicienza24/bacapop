'use client';

import {useEffect, useRef} from 'react';

const RUN_FRAME_COUNT = 4;
const TRANSITION_FRAME_COUNT = 7;
const EMBRACE_FRAME_COUNT = 8;
const CYCLE_MS = 21000;

function framePaths(folder, prefix, count) {
  return Array.from({length: count}, (_, index) => `${folder}/${prefix}${String(index + 1).padStart(2, '0')}.webp`);
}

const ASSET_ROOT = '/images/novel/complete-animation-lite-v2';
const WOMAN_FRAMES = framePaths(`${ASSET_ROOT}/woman`, 'frame-', RUN_FRAME_COUNT);
const MAN_FRAMES = framePaths(`${ASSET_ROOT}/man`, 'frame-', RUN_FRAME_COUNT);
const TRANSITION_FRAMES = framePaths(`${ASSET_ROOT}/transition`, 'frame-', TRANSITION_FRAME_COUNT);
const EMBRACE_FRAMES = framePaths(`${ASSET_ROOT}/embrace`, 'frame-', EMBRACE_FRAME_COUNT);

function loadImages(paths) {
  return Promise.all(paths.map((src) => new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  })));
}

function drawNormalized(ctx, image, x, baseline, height) {
  if (!image) return;
  const width = height * (image.width / image.height);
  const sourceBaseline = 380 / 420;
  ctx.drawImage(image, x - width / 2, baseline - height * sourceBaseline, width, height);
}

function easeInOutSine(value) {
  return -(Math.cos(Math.PI * value) - 1) / 2;
}

export default function RomanceBeachAnimation({className = ''}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    let cancelled = false;
    let animationFrame = 0;
    let startedAt = 0;
    let lastPaint = 0;
    let renderLoop = null;
    let isVisible = false;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 1.25);
      canvas.width = Math.max(1, Math.round(rect.width * ratio));
      canvas.height = Math.max(1, Math.round(rect.height * ratio));
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const start = () => {
      if (!renderLoop || animationFrame || reducedMotion || cancelled || document.hidden || !isVisible) return;
      animationFrame = requestAnimationFrame(renderLoop);
    };
    const stop = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    };
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
      if (isVisible && reducedMotion && renderLoop) renderLoop(performance.now());
      else if (isVisible) start();
      else stop();
    }, {rootMargin: '80px'});
    visibilityObserver.observe(canvas);
    const handleVisibility = () => {
      if (document.hidden) stop();
      else start();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    Promise.all([
      loadImages(WOMAN_FRAMES),
      loadImages(MAN_FRAMES),
      loadImages(TRANSITION_FRAMES),
      loadImages(EMBRACE_FRAMES),
    ]).then(([womanFrames, manFrames, transitionFrames, embraceFrames]) => {
      if (cancelled) return;

      const render = (timestamp) => {
        animationFrame = 0;
        if (cancelled || !isVisible || document.hidden) return;
        if (!startedAt) startedAt = timestamp;
        if (!reducedMotion && timestamp - lastPaint < 32) {
          animationFrame = requestAnimationFrame(render);
          return;
        }
        lastPaint = timestamp;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const elapsed = reducedMotion ? CYCLE_MS * .82 : (timestamp - startedAt) % CYCLE_MS;
        const phase = elapsed / CYCLE_MS;

        ctx.clearRect(0, 0, width, height);
        ctx.save();
        ctx.imageSmoothingEnabled = true;

        // Keep a safe inset inside the short, rounded header so hair and feet
        // never get clipped during the lifted embrace poses.
        const baseline = height - 9;
        const runnerHeight = height * 1.46;
        const coupleHeight = height * 1.38;
        if (phase < .48) {
          const progress = phase / .48;
          const eased = easeInOutSine(progress);
          const frame = Math.floor(elapsed / 220) % RUN_FRAME_COUNT;
          const fadeIn = Math.min(1, Math.max(0, (phase - .008) / .055));
          const outsideOffset = height * .24;
          const womanStart = -outsideOffset;
          const manStart = width + outsideOffset;
          const meetingOffset = Math.max(13, height * .12);
          const womanEnd = width * .5 - meetingOffset;
          const manEnd = width * .5 + meetingOffset;
          ctx.globalAlpha = fadeIn;
          drawNormalized(ctx, womanFrames[frame], womanStart + (womanEnd - womanStart) * eased, baseline, runnerHeight);
          drawNormalized(ctx, manFrames[frame], manStart + (manEnd - manStart) * eased, baseline, runnerHeight);
        } else if (phase < .65) {
          const local = (phase - .48) / .17;
          const frame = Math.min(TRANSITION_FRAME_COUNT - 1, Math.floor(local * TRANSITION_FRAME_COUNT));
          ctx.globalAlpha = 1;
          drawNormalized(ctx, transitionFrames[frame], width * .5, baseline, coupleHeight);
        } else {
          const local = (phase - .65) / .35;
          const sequenceProgress = Math.min(1, local / .56);
          const frame = Math.min(EMBRACE_FRAME_COUNT - 1, Math.floor(sequenceProgress * EMBRACE_FRAME_COUNT));
          const fadeOut = local > .70 ? Math.max(0, 1 - (local - .70) / .25) : 1;
          ctx.globalAlpha = fadeOut;
          drawNormalized(ctx, embraceFrames[frame], width * .5, baseline, coupleHeight);
        }

        ctx.restore();
        if (!reducedMotion && !cancelled && isVisible) animationFrame = requestAnimationFrame(render);
      };

      renderLoop = render;
      if (reducedMotion && isVisible) render(performance.now());
      else start();
    });

    return () => {
      cancelled = true;
      stop();
      observer.disconnect();
      visibilityObserver.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return <canvas className={className} ref={canvasRef} />;
}
