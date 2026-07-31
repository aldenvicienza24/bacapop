'use client';

import {useEffect, useRef} from 'react';

function seededRandom(seed) {
  const value = Math.sin(seed * 9283.31) * 43758.5453;
  return value - Math.floor(value);
}

function createWisps(count) {
  return Array.from({length: count}, (_, index) => ({
    x: seededRandom(index + 1) * 1.35 - .2,
    y: .2 + seededRandom(index + 17) * .74,
    radiusX: 42 + seededRandom(index + 31) * 104,
    radiusY: 7 + seededRandom(index + 47) * 17,
    speed: .006 + seededRandom(index + 61) * .012,
    alpha: .025 + seededRandom(index + 79) * .065,
    phase: seededRandom(index + 97) * Math.PI * 2,
    depth: .72 + seededRandom(index + 113) * .7,
  }));
}

function createFogSprites() {
  return Array.from({length: 2}, (_, index) => {
    const sprite = document.createElement('canvas');
    sprite.width = 160;
    sprite.height = 64;
    const spriteContext = sprite.getContext('2d');
    spriteContext.save();
    spriteContext.translate(80, 32);
    spriteContext.scale(1, .36);
    const gradient = spriteContext.createRadialGradient(0, 0, 0, 0, 0, 76);
    gradient.addColorStop(0, index ? 'rgba(198,174,207,.92)' : 'rgba(235,229,239,.92)');
    gradient.addColorStop(.36, 'rgba(215,202,223,.64)');
    gradient.addColorStop(.74, 'rgba(145,117,158,.2)');
    gradient.addColorStop(1, 'rgba(105,82,117,0)');
    spriteContext.fillStyle = gradient;
    spriteContext.beginPath();
    spriteContext.arc(0, 0, 76, 0, Math.PI * 2);
    spriteContext.fill();
    spriteContext.restore();
    return sprite;
  });
}

function paintFog(context, wisps, sprites, width, height, seconds) {
  context.clearRect(0, 0, width, height);
  context.globalCompositeOperation = 'screen';

  wisps.forEach((wisp, index) => {
    const travel = (wisp.x + seconds * wisp.speed) % 1.35;
    const x = (travel - .16) * width;
    const y = wisp.y * height + Math.sin(seconds * .34 + wisp.phase) * 5;
    const breathe = 1 + Math.sin(seconds * .22 + wisp.phase) * .12;
    const radiusX = wisp.radiusX * wisp.depth * breathe;
    const radiusY = wisp.radiusY * wisp.depth;

    context.save();
    context.globalAlpha = Math.min(.24, wisp.alpha * 2.25);
    context.drawImage(sprites[index % 4 === 0 ? 1 : 0], x - radiusX, y - radiusY, radiusX * 2, radiusY * 2);
    context.restore();
  });

  context.globalCompositeOperation = 'source-over';
}

export default function HorrorFogCanvas({className = ''}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d', {alpha: true});
    if (!canvas || !context) return undefined;

    const wisps = createWisps(20);
    const sprites = createFogSprites();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = 1;
    let height = 1;
    let frameId;
    let startedAt;
    let previousFrame = 0;
    let disposed = false;
    let running = false;

    function resize() {
      const bounds = canvas.getBoundingClientRect();
      const scale = Math.min(window.devicePixelRatio || 1, 1.25) * .72;
      width = Math.max(1, Math.round(bounds.width * scale));
      height = Math.max(1, Math.round(bounds.height * scale));
      canvas.width = width;
      canvas.height = height;
      paintFog(context, wisps, sprites, width, height, 0);
    }

    function animate(timestamp) {
      if (disposed) return;
      if (!startedAt) startedAt = timestamp;
      if (timestamp - previousFrame >= 33) {
        paintFog(context, wisps, sprites, width, height, (timestamp - startedAt) / 1000);
        previousFrame = timestamp;
      }
      if (running && !reducedMotion) frameId = window.requestAnimationFrame(animate);
    }

    function start() {
      if (running || reducedMotion || document.hidden) return;
      running = true;
      frameId = window.requestAnimationFrame(animate);
    }

    function stop() {
      running = false;
      window.cancelAnimationFrame(frameId);
    }

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) start();
      else stop();
    }, {rootMargin: '100px'});
    visibilityObserver.observe(canvas);
    const handleVisibility = () => {
      if (document.hidden) stop();
      else if (canvas.getBoundingClientRect().bottom > -100 && canvas.getBoundingClientRect().top < window.innerHeight + 100) start();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    resize();

    return () => {
      disposed = true;
      stop();
      observer.disconnect();
      visibilityObserver.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
