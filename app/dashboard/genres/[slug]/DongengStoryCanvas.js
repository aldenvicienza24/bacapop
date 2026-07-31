'use client';

import {useEffect, useRef} from 'react';

const TAU = Math.PI * 2;

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

export default function DongengStoryCanvas({className}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const stars = Array.from({length: 22}, (_, index) => ({
      x: ((index * 67) % 997) / 997,
      y: .08 + (((index * 43) % 79) / 79) * .72,
      size: 1 + (index % 3) * .55,
      phase: index * .71,
    }));
    let frameId;
    let width = 1;
    let height = 1;
    let running = false;
    let lastPaint = 0;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 1.25);
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function drawCastle(cx, baseY, scale, time) {
      const lift = Math.sin(time * .0013) * 1.5;
      ctx.save();
      ctx.translate(cx, baseY + lift);
      ctx.scale(scale, scale);
      ctx.fillStyle = 'rgba(43, 28, 86, .9)';
      ctx.strokeStyle = '#ffd86a';
      ctx.lineWidth = 1.4;
      ctx.shadowColor = 'rgba(255, 216, 106, .8)';
      ctx.shadowBlur = 10;

      const towers = [
        [-40, -27, 20, 34],
        [-14, -42, 28, 49],
        [20, -31, 21, 38],
      ];
      towers.forEach(([x, y, w, h]) => {
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
        ctx.beginPath();
        ctx.moveTo(x - 3, y);
        ctx.lineTo(x + w / 2, y - 17);
        ctx.lineTo(x + w + 3, y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      });
      ctx.fillRect(-46, 6, 93, 9);
      ctx.strokeRect(-46, 6, 93, 9);
      ctx.fillStyle = '#ffe797';
      [-32, -5, 31].forEach((x, index) => {
        const y = index === 1 ? -27 : -15;
        ctx.fillRect(x, y, 4, 8);
      });
      ctx.restore();
    }

    function drawBook(cx, baseY, scale, time) {
      const flutter = Math.sin(time * .003) * 2.2;
      ctx.save();
      ctx.translate(cx, baseY);
      ctx.scale(scale, scale);
      ctx.shadowColor = 'rgba(8, 5, 34, .55)';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#7a3f91';
      roundedRect(ctx, -91, -3, 182, 19, 8);
      ctx.fill();
      ctx.shadowBlur = 0;

      const pageGradient = ctx.createLinearGradient(0, -36, 0, 8);
      pageGradient.addColorStop(0, '#fff8d7');
      pageGradient.addColorStop(1, '#eebf61');
      ctx.fillStyle = pageGradient;
      ctx.strokeStyle = '#5d356f';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(0, 5);
      ctx.bezierCurveTo(-24, -7, -56, -15 - flutter, -87, -9);
      ctx.lineTo(-84, -42);
      ctx.bezierCurveTo(-53, -47 - flutter, -20, -33, 0, -18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, 5);
      ctx.bezierCurveTo(24, -7, 56, -15 + flutter, 87, -9);
      ctx.lineTo(84, -42);
      ctx.bezierCurveTo(53, -47 + flutter, 20, -33, 0, -18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = 'rgba(116, 70, 91, .42)';
      ctx.lineWidth = 1;
      [-1, 1].forEach((direction) => {
        for (let line = 0; line < 3; line += 1) {
          ctx.beginPath();
          ctx.moveTo(direction * 12, -13 - line * 6);
          ctx.quadraticCurveTo(direction * 43, -25 - line * 4, direction * 70, -21 - line * 5);
          ctx.stroke();
        }
      });
      ctx.restore();
    }

    function draw(time = 0) {
      ctx.clearRect(0, 0, width, height);
      const cx = width / 2;
      const stageScale = Math.min(1, width / 900);

      const glow = ctx.createRadialGradient(cx, height * .62, 5, cx, height * .62, 150 * stageScale);
      glow.addColorStop(0, 'rgba(255, 234, 132, .72)');
      glow.addColorStop(.42, 'rgba(176, 112, 231, .2)');
      glow.addColorStop(1, 'rgba(24, 13, 66, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(cx - 180, 0, 360, height);

      stars.forEach((star, index) => {
        const pulse = .42 + .58 * Math.abs(Math.sin(time * .0015 + star.phase));
        const x = star.x * width;
        const y = star.y * height;
        if (Math.abs(x - cx) < 115 && y > height * .52) return;
        ctx.fillStyle = index % 4 === 0 ? `rgba(164, 238, 255, ${pulse})` : `rgba(255, 225, 111, ${pulse})`;
        ctx.beginPath();
        ctx.arc(x, y, star.size * pulse, 0, TAU);
        ctx.fill();
      });

      ctx.save();
      ctx.strokeStyle = 'rgba(255, 220, 102, .48)';
      ctx.lineWidth = 1.3;
      ctx.setLineDash([3, 6]);
      ctx.beginPath();
      ctx.arc(cx, height * .54, 88 + Math.sin(time * .0012) * 4, Math.PI * 1.03, Math.PI * 1.97);
      ctx.stroke();
      ctx.restore();

      for (let index = 0; index < 12; index += 1) {
        const progress = (time * .00016 + index / 12) % 1;
        const angle = progress * TAU * 1.35 + index * .31;
        const radius = 18 + progress * 86;
        const x = cx + Math.cos(angle) * radius;
        const y = height - 38 - progress * 72 + Math.sin(angle * 1.7) * 6;
        const alpha = Math.sin(progress * Math.PI) * .95;
        ctx.fillStyle = index % 3 === 0 ? `rgba(153, 239, 255, ${alpha})` : `rgba(255, 224, 105, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, 1.2 + (index % 3) * .7, 0, TAU);
        ctx.fill();
      }

    }

    function tick(time) {
      if (!running) return;
      if (time - lastPaint >= 32) {
        draw(time);
        lastPaint = time;
      }
      frameId = window.requestAnimationFrame(tick);
    }

    function start() {
      if (running || reduceMotion || document.hidden) return;
      running = true;
      lastPaint = 0;
      frameId = window.requestAnimationFrame(tick);
    }

    function stop() {
      running = false;
      if (frameId) window.cancelAnimationFrame(frameId);
    }

    resize();
    draw(0);
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) start();
      else stop();
    }, {rootMargin: '80px'});
    visibilityObserver.observe(canvas);
    const handleVisibility = () => {
      if (document.hidden) stop();
      else if (canvas.getBoundingClientRect().bottom > -80 && canvas.getBoundingClientRect().top < window.innerHeight + 80) start();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stop();
      observer.disconnect();
      visibilityObserver.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} />;
}
