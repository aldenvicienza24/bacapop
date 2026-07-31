'use client';

import {useEffect, useRef} from 'react';

const TAU = Math.PI * 2;

export default function DongengMagicPortal({className = ''}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const context = canvas.getContext('2d');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const particles = Array.from({length: 30}, (_, index) => ({
      x: ((index * 73) % 101) / 101,
      y: ((index * 47) % 103) / 103,
      size: 1 + (index % 4) * .55,
      speed: .000018 + (index % 5) * .000004,
      phase: index * .83,
      color: index % 5 === 0 ? '174, 220, 255' : index % 3 === 0 ? '208, 166, 255' : '255, 222, 112',
    }));
    const lanterns = Array.from({length: 4}, (_, index) => ({
      x: .1 + ((index * 31) % 79) / 100,
      phase: index * 1.37,
      duration: 14000 + (index % 4) * 2300,
      delay: index * 1900,
      size: 4.2 + (index % 3) * 1.2,
    }));
    let frameId = 0;
    let width = 1;
    let height = 1;
    let running = false;
    let lastPaint = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 1.25);
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const drawStar = (x, y, radius, alpha, color) => {
      context.save();
      context.translate(x, y);
      context.fillStyle = `rgba(${color}, ${alpha})`;
      context.shadowColor = `rgba(${color}, .9)`;
      context.shadowBlur = radius * 4;
      context.beginPath();
      context.moveTo(0, -radius * 2.5);
      context.quadraticCurveTo(radius * .35, -radius * .35, radius * 2.5, 0);
      context.quadraticCurveTo(radius * .35, radius * .35, 0, radius * 2.5);
      context.quadraticCurveTo(-radius * .35, radius * .35, -radius * 2.5, 0);
      context.quadraticCurveTo(-radius * .35, -radius * .35, 0, -radius * 2.5);
      context.fill();
      context.restore();
    };

    const drawLantern = (x, y, size, alpha, sway) => {
      context.save();
      context.translate(x + sway, y);
      context.globalAlpha = alpha;
      context.shadowColor = 'rgba(255, 184, 67, .95)';
      context.shadowBlur = size * 4;
      const lanternGlow = context.createRadialGradient(0, 0, 0, 0, 0, size * 3.5);
      lanternGlow.addColorStop(0, 'rgba(255, 241, 166, .85)');
      lanternGlow.addColorStop(.35, 'rgba(255, 170, 57, .33)');
      lanternGlow.addColorStop(1, 'rgba(255, 155, 45, 0)');
      context.fillStyle = lanternGlow;
      context.beginPath();
      context.arc(0, 0, size * 3.5, 0, TAU);
      context.fill();
      context.shadowBlur = 0;
      context.fillStyle = '#ffd66e';
      context.strokeStyle = 'rgba(105, 51, 98, .75)';
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(-size * .72, -size * .65);
      context.quadraticCurveTo(0, -size * 1.05, size * .72, -size * .65);
      context.lineTo(size * .56, size * .72);
      context.quadraticCurveTo(0, size, -size * .56, size * .72);
      context.closePath();
      context.fill();
      context.stroke();
      context.fillStyle = '#fff5b3';
      context.beginPath();
      context.arc(0, 0, size * .26, 0, TAU);
      context.fill();
      context.restore();
    };

    const drawMist = (time) => {
      for (let index = 0; index < 3; index += 1) {
        const travel = reducedMotion ? .35 + index * .2 : ((time / (28000 + index * 4500)) + index * .31) % 1;
        const x = -width * .3 + travel * width * 1.6;
        const y = height * (.45 + index * .1) + Math.sin(time * .00025 + index) * 8;
        const mist = context.createRadialGradient(x, y, 0, x, y, width * .28);
        mist.addColorStop(0, `rgba(${index === 1 ? '214, 193, 255' : '178, 220, 255'}, .13)`);
        mist.addColorStop(.55, `rgba(${index === 1 ? '214, 193, 255' : '178, 220, 255'}, .055)`);
        mist.addColorStop(1, 'rgba(190, 210, 255, 0)');
        context.save();
        context.scale(1, .34);
        context.fillStyle = mist;
        context.fillRect(x - width * .3, (y - width * .28) / .34, width * .6, width * .56 / .34);
        context.restore();
      }
    };

    const draw = (time = 0) => {
      context.clearRect(0, 0, width, height);
      const portalX = width * .5;
      const portalY = height * .73;
      drawMist(time);
      const glow = context.createRadialGradient(portalX, portalY, 4, portalX, portalY, width * .29);
      const glowPulse = reducedMotion ? .38 : .3 + Math.sin(time * .0011) * .1;
      glow.addColorStop(0, `rgba(255, 230, 132, ${glowPulse})`);
      glow.addColorStop(.38, 'rgba(163, 111, 220, .17)');
      glow.addColorStop(1, 'rgba(80, 45, 120, 0)');
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);

      particles.forEach((particle, index) => {
        const travel = reducedMotion ? particle.y : ((particle.y - (time * particle.speed) % 1) + 1) % 1;
        const x = particle.x * width + Math.sin(time * .00075 + particle.phase) * 10;
        const y = 55 + travel * (height - 105);
        const pulse = .32 + Math.abs(Math.sin(time * .0014 + particle.phase)) * .68;
        if (index % 9 === 0) drawStar(x, y, particle.size, pulse, particle.color);
        else {
          context.fillStyle = `rgba(${particle.color}, ${pulse})`;
          context.shadowColor = `rgba(${particle.color}, .8)`;
          context.shadowBlur = 7;
          context.beginPath();
          context.arc(x, y, particle.size, 0, TAU);
          context.fill();
          context.shadowBlur = 0;
        }
      });

      lanterns.forEach((lantern) => {
        const elapsed = reducedMotion ? lantern.duration * .48 : time - lantern.delay;
        if (elapsed < 0) return;
        const progress = ((elapsed % lantern.duration) + lantern.duration) % lantern.duration / lantern.duration;
        const fade = Math.min(1, progress * 7, (1 - progress) * 7);
        const x = lantern.x * width;
        const y = height * (.9 - progress * .72);
        const sway = Math.sin(progress * TAU * 2.2 + lantern.phase) * 9;
        drawLantern(x, y, lantern.size, fade * .92, sway);
      });

      if (!reducedMotion) {
        const comet = (time % 9000) / 9000;
        if (comet < .24) {
          const progress = comet / .24;
          const x = width * (.08 + progress * .7);
          const y = height * (.2 + progress * .14) + Math.sin(progress * Math.PI) * 8;
          const alpha = Math.sin(progress * Math.PI);
          const gradient = context.createLinearGradient(x - 78, y - 36, x, y);
          gradient.addColorStop(0, 'rgba(255, 240, 170, 0)');
          gradient.addColorStop(1, `rgba(255, 240, 170, ${alpha * .88})`);
          context.strokeStyle = gradient;
          context.lineWidth = 2;
          context.beginPath();
          context.moveTo(x - 78, y - 36);
          context.lineTo(x, y);
          context.stroke();
          drawStar(x, y, 2.3, alpha, '255, 239, 165');
        }
      }

    };

    const tick = (time) => {
      if (!running) return;
      if (time - lastPaint >= 30) {
        draw(time);
        lastPaint = time;
      }
      frameId = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running || reducedMotion || document.hidden) return;
      running = true;
      lastPaint = 0;
      frameId = requestAnimationFrame(tick);
    };

    const stop = () => {
      running = false;
      cancelAnimationFrame(frameId);
    };

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

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
