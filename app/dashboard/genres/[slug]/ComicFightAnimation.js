'use client';

import {useEffect, useRef} from 'react';

const WIDTH = 500;
const HEIGHT = 102;
const DURATION = 12;
const GOKU_CHARGE_LOCAL_X = 80;
const VEGETA_CHARGE_LOCAL_X = 76;
const GOKU_BEAM_JOIN_LOCAL_X = 129;
const VEGETA_BEAM_JOIN_LOCAL_X = 50;
const BEAM_Y = 40;

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function ease(value) {
  const t = clamp(value);
  return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerp(from, to, amount) {
  return from + (to - from) * amount;
}

function drawPose(ctx, image, pose, x, y = 3, width = 176, height = 88, alpha = 1, frameCount = 6) {
  const frameWidth = image.naturalWidth / frameCount;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, pose * frameWidth, 0, frameWidth, image.naturalHeight, x, y, width, height);
  ctx.restore();
}

function drawDust(ctx, x, y, time, direction) {
  ctx.save();
  ctx.globalAlpha = .55;
  for (let index = 0; index < 7; index += 1) {
    const drift = ((time * 45 + index * 11) % 28);
    const size = 2 + index % 3;
    ctx.fillStyle = index % 2 ? '#fff4bd' : '#bcefff';
    ctx.fillRect(Math.round(x - direction * drift), Math.round(y - (index * 7) % 15), size, size);
  }
  ctx.restore();
}

function drawAttackArc(ctx, x, y, time, direction, strength) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(x, y);
  ctx.scale(direction, 1);
  ctx.rotate(Math.sin(time * 9) * .08);
  ctx.strokeStyle = `rgba(255,238,84,${.35 + strength * .55})`;
  ctx.shadowColor = '#fff36a';
  ctx.shadowBlur = 8;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 27, -.9, .95);
  ctx.stroke();
  ctx.strokeStyle = `rgba(255,255,255,${.25 + strength * .55})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, 34, -1.05, .72);
  ctx.stroke();
  ctx.restore();
}

function drawShockRing(ctx, x, y, strength) {
  const radius = 8 + strength * 24;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = strength;
  ctx.strokeStyle = '#dffaff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y, radius, radius * .55, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawChargeAura(ctx, x, y, time, power, hue) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const pulse = 1 + Math.sin(time * 19) * .12;
  const radius = (7 + power * 8) * pulse;
  const glow = ctx.createRadialGradient(x, y, 1, x, y, radius * 2.1);
  glow.addColorStop(0, '#fff');
  glow.addColorStop(.25, '#dff8ff');
  glow.addColorStop(.6, hue);
  glow.addColorStop(1, 'rgba(35,130,255,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, radius * 2.1, 0, Math.PI * 2);
  ctx.fill();

  for (let index = 0; index < 8; index += 1) {
    const angle = time * (index % 2 ? 2.2 : -1.8) + index * Math.PI / 4;
    const distance = radius + 4 + (index % 3) * 4;
    ctx.fillStyle = index % 3 ? '#7ee4ff' : '#fff36a';
    ctx.fillRect(
      Math.round(x + Math.cos(angle) * distance),
      Math.round(y + Math.sin(angle) * distance * .65),
      2,
      2,
    );
  }
  ctx.restore();
}

function drawEnergyBeam(ctx, fromX, toX, y, power, hue, time) {
  const direction = Math.sign(toX - fromX) || 1;
  const length = Math.abs(toX - fromX);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';

  const glow = ctx.createLinearGradient(fromX, y, toX, y);
  glow.addColorStop(0, hue);
  glow.addColorStop(.55, '#75ddff');
  glow.addColorStop(1, '#ffffff');
  ctx.strokeStyle = glow;
  ctx.shadowColor = hue;
  ctx.shadowBlur = 12 + power * 12;
  ctx.lineWidth = 10 + power * 8;
  ctx.beginPath();
  ctx.moveTo(fromX, y);
  ctx.lineTo(fromX + direction * length, y);
  ctx.stroke();

  ctx.shadowBlur = 7;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3.5 + power * 3.5;
  ctx.beginPath();
  ctx.moveTo(fromX, y);
  ctx.lineTo(toX, y);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.lineWidth = 1.4;
  for (let index = 0; index < 5; index += 1) {
    const offset = ((time * (85 + index * 9) + index * 29) % Math.max(1, length - 18));
    const start = fromX + direction * offset;
    ctx.globalAlpha = .35 + (index % 2) * .2;
    ctx.strokeStyle = index % 2 ? '#fff' : '#a5eaff';
    ctx.beginPath();
    ctx.moveTo(start, y - 6 + index * 3);
    ctx.lineTo(start + direction * (13 + index * 2), y - 6 + index * 3);
    ctx.stroke();
  }
  ctx.restore();
}

function drawClash(ctx, time, power, x = WIDTH / 2, y = BEAM_Y) {
  const pulse = 1 + Math.sin(time * 17) * .1;
  const radius = (11 + power * 10) * pulse;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const orb = ctx.createRadialGradient(x, y, 1, x, y, radius);
  orb.addColorStop(0, '#ffffff');
  orb.addColorStop(.32, '#9deaff');
  orb.addColorStop(.7, '#3187ff');
  orb.addColorStop(1, 'rgba(35,105,255,0)');
  ctx.fillStyle = orb;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = `rgba(255,255,255,${.42 + power * .35})`;
  ctx.lineWidth = 2;
  for (let ring = 0; ring < 2; ring += 1) {
    ctx.beginPath();
    ctx.arc(x, y, radius + 6 + ring * 7, time * (1.8 + ring), Math.PI * (1.15 + ring * .25) + time * (1.8 + ring));
    ctx.stroke();
  }

  for (let index = 0; index < 12; index += 1) {
    const angle = index * Math.PI / 6 + time * (index % 2 ? 1.7 : -1.3);
    const distance = radius + 9 + (index % 3) * 5;
    const particleX = x + Math.cos(angle) * distance;
    const particleY = y + Math.sin(angle) * distance * .55;
    ctx.fillStyle = index % 3 ? '#66dfff' : '#ffe253';
    ctx.fillRect(Math.round(particleX), Math.round(particleY), 2 + index % 2, 2 + index % 2);
  }
  ctx.restore();
}

function drawImpact(ctx, time, strength, x, y) {
  const radius = 10 + strength * 12;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(time * 5);
  ctx.fillStyle = '#ffe253';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let point = 0; point < 16; point += 1) {
    const angle = point * Math.PI / 8;
    const size = point % 2 ? radius * .38 : radius;
    const x = Math.cos(angle) * size;
    const y = Math.sin(angle) * size;
    if (!point) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawFightParticles(ctx, time, strength, originX, originY) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  const glowRadius = 7 + strength * 22;
  const flash = ctx.createRadialGradient(originX, originY, 0, originX, originY, glowRadius);
  flash.addColorStop(0, `rgba(255,255,255,${strength * .52})`);
  flash.addColorStop(.3, `rgba(255,224,83,${strength * .34})`);
  flash.addColorStop(.7, `rgba(68,180,255,${strength * .16})`);
  flash.addColorStop(1, 'rgba(68,180,255,0)');
  ctx.fillStyle = flash;
  ctx.beginPath();
  ctx.arc(originX, originY, glowRadius, 0, Math.PI * 2);
  ctx.fill();

  for (let index = 0; index < 18; index += 1) {
    const cycle = (time * (1.8 + index % 3 * .24) + index * .173) % 1;
    const angle = index * 2.399 + Math.sin(time * .7 + index) * .16;
    const distance = 8 + cycle * (28 + index % 5 * 7);
    const particleX = originX + Math.cos(angle) * distance;
    const particleY = originY + Math.sin(angle) * distance * .58;
    const alpha = (1 - cycle) * strength;
    const size = cycle < .35 ? 3 : 2;
    ctx.globalAlpha = alpha * .9;
    ctx.fillStyle = index % 4 === 0 ? '#ff8056' : index % 2 ? '#6ddcff' : '#ffe653';
    ctx.save();
    ctx.translate(Math.round(particleX), Math.round(particleY));
    ctx.rotate(angle + Math.PI / 4);
    ctx.fillRect(-size / 2, -size / 2, size, size);
    ctx.restore();
  }
  ctx.restore();
}

function renderScene(ctx, goku, vegeta, gokuMelee, vegetaMelee, seconds, reducedMotion) {
  const time = reducedMotion ? 1.1 : seconds % DURATION;
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  let gokuX = 0;
  let vegetaX = 324;
  let gokuY = 3;
  let vegetaY = 3;
  let gokuPose = 0;
  let vegetaPose = 0;
  let gokuPreviousPose = 0;
  let vegetaPreviousPose = 0;
  let gokuPoseBlend = 1;
  let vegetaPoseBlend = 1;
  let chargePower = 0;
  let beamPower = 0;
  let beamReach = 0;
  let clashPower = 0;
  let beamThrust = 0;
  let fightStrength = 0;
  let impactX = WIDTH / 2;
  let impactY = 44;
  let shake = 0;
  let meleeMode = false;
  let dashStrength = 0;
  let attackArc = 0;
  let attackerIsGoku = true;

  if (time >= .55 && time < 1.15) {
    gokuPose = 1;
    vegetaPose = 1;
    chargePower = ease((time - .55) / .6) * .55;
  }
  if (time >= 1.15 && time < 1.65) {
    gokuPose = 2;
    vegetaPose = 2;
    chargePower = .55 + ease((time - 1.15) / .5) * .45;
    shake = chargePower * .45;
  }
  if (time >= 1.65 && time < 2.75) {
    gokuPose = 3;
    vegetaPose = 3;
    gokuPreviousPose = 2;
    vegetaPreviousPose = 2;
    gokuPoseBlend = ease((time - 1.65) / .14);
    vegetaPoseBlend = gokuPoseBlend;
    beamThrust = ease((time - 1.65) / .18);
    const recoil = Math.sin((time - 1.65) * 22) * beamThrust * .8;
    gokuX = beamThrust * 8 - recoil;
    vegetaX = 324 - beamThrust * 8 + recoil;
    gokuY = 5;
    vegetaY = 2;
    beamReach = ease((time - 1.65) / .34);
    beamPower = ease((time - 1.65) / .25) * (1 - clamp((time - 2.52) / .23));
    clashPower = ease(clamp((beamReach - .78) / .22)) * beamPower;
    shake = clashPower * 1.8;
  }
  if (time >= 2.75 && time < 3.08) {
    gokuPose = 0;
    vegetaPose = 0;
    gokuPreviousPose = 3;
    vegetaPreviousPose = 3;
    gokuPoseBlend = ease((time - 2.75) / .26);
    vegetaPoseBlend = gokuPoseBlend;
  }
  if (time >= 3.15 && time < 4.15) {
    meleeMode = true;
    gokuPose = 1;
    vegetaPose = 1;
    const movement = ease((time - 3.15) / 1);
    gokuX = lerp(0, 112, movement);
    vegetaX = lerp(324, 212, movement);
    gokuY -= Math.sin(movement * Math.PI) * 6;
    vegetaY -= Math.sin(movement * Math.PI) * 6;
    dashStrength = Math.sin(movement * Math.PI);
  }
  if (time >= 4.15 && time < 8.25) {
    meleeMode = true;
    const fightTime = time - 4.15;
    const strikeLength = .58;
    const strike = Math.floor(fightTime / strikeLength);
    const phase = (fightTime % strikeLength) / strikeLength;
    const sequence = [
      {goku: true, pose: 2, blocked: true},
      {goku: false, pose: 3, blocked: false},
      {goku: false, pose: 2, blocked: true},
      {goku: true, pose: 5, blocked: false},
      {goku: true, pose: 3, blocked: false},
      {goku: false, pose: 5, blocked: true},
      {goku: true, pose: 2, blocked: false},
    ];
    const move = sequence[strike % sequence.length];
    const attackPose = move.pose;
    const blocked = move.blocked;
    attackerIsGoku = move.goku;
    let attackerPose = 0;
    let attackerPreviousPose = 0;
    let attackerBlend = 1;
    if (phase >= .12 && phase < .24) {
      attackerPose = 1;
      attackerPreviousPose = 0;
      attackerBlend = ease((phase - .12) / .12);
    } else if (phase >= .24 && phase < .38) {
      attackerPose = attackPose;
      attackerPreviousPose = 1;
      attackerBlend = ease((phase - .24) / .14);
    } else if (phase >= .38 && phase < .68) {
      attackerPose = attackPose;
      attackerPreviousPose = attackPose;
    } else if (phase >= .68 && phase < .84) {
      attackerPose = 7;
      attackerPreviousPose = attackPose;
      attackerBlend = ease((phase - .68) / .16);
    } else if (phase >= .84) {
      attackerPose = 7;
      attackerPreviousPose = 7;
    }

    let defenderPose = 0;
    let defenderPreviousPose = 0;
    let defenderBlend = 1;
    const reactionPose = blocked ? 4 : 6;
    if (phase >= .36 && phase < .52) {
      defenderPose = reactionPose;
      defenderPreviousPose = 0;
      defenderBlend = ease((phase - .36) / .16);
    } else if (phase >= .52) {
      defenderPose = reactionPose;
      defenderPreviousPose = reactionPose;
    }
    gokuPose = attackerIsGoku ? attackerPose : defenderPose;
    vegetaPose = attackerIsGoku ? defenderPose : attackerPose;
    gokuPreviousPose = attackerIsGoku ? attackerPreviousPose : defenderPreviousPose;
    vegetaPreviousPose = attackerIsGoku ? defenderPreviousPose : attackerPreviousPose;
    gokuPoseBlend = attackerIsGoku ? attackerBlend : defenderBlend;
    vegetaPoseBlend = attackerIsGoku ? defenderBlend : attackerBlend;
    const lungePhase = clamp((phase - .1) / .9);
    const lunge = Math.pow(Math.sin(lungePhase * Math.PI), .82);
    const contactPhase = clamp((phase - .38) / .62);
    const contactEnvelope = Math.sin(contactPhase * Math.PI);
    const dash = lunge * 29;
    const hitRecoil = blocked ? contactEnvelope * 4 : contactEnvelope * 15;
    gokuX = 112 + (attackerIsGoku ? dash : -hitRecoil);
    vegetaX = 212 + (attackerIsGoku ? hitRecoil : -dash);
    const lift = attackPose === 5 ? Math.sin(clamp((phase - .2) / .7) * Math.PI) * 12 : 0;
    const kickLift = attackPose === 3 ? Math.sin(phase * Math.PI) * 5 : 0;
    if (attackerIsGoku) gokuY -= lift + kickLift; else vegetaY -= lift + kickLift;
    if (!blocked && phase > .44) {
      if (attackerIsGoku) vegetaY -= lift * .7; else gokuY -= lift * .7;
    }
    const impactPhase = clamp((phase - .42) / .36);
    fightStrength = Math.pow(Math.max(0, Math.sin(impactPhase * Math.PI)), blocked ? 12 : 8) * (blocked ? .55 : 1);
    const dashPhase = clamp((phase - .08) / .38);
    dashStrength = Math.pow(Math.max(0, Math.sin(dashPhase * Math.PI)), 1.4);
    attackArc = attackPose === 3 && phase > .28 && phase < .72 ? Math.sin(((phase - .28) / .44) * Math.PI) : 0;
    impactX = attackerIsGoku ? gokuX + 137 : vegetaX + 39;
    impactY = 42 + Math.sin(strike * 2.1) * 12;
    shake = fightStrength * 2.8;
  }
  if (time >= 8.25 && time < 9.25) {
    meleeMode = true;
    gokuPose = 7;
    vegetaPose = 7;
    const movement = ease((time - 8.25) / 1);
    gokuX = lerp(112, 0, movement);
    vegetaX = lerp(212, 324, movement);
    dashStrength = Math.sin(movement * Math.PI) * .65;
  }
  if (time >= 9.25 && time < 9.85) {
    gokuPose = 1;
    vegetaPose = 1;
    chargePower = ease((time - 9.25) / .6) * .65;
  }
  if (time >= 9.85 && time < 10.35) {
    gokuPose = 2;
    vegetaPose = 2;
    chargePower = .65 + ease((time - 9.85) / .5) * .35;
  }
  if (time >= 10.35) {
    gokuPose = 3;
    vegetaPose = 3;
    gokuPreviousPose = 2;
    vegetaPreviousPose = 2;
    gokuPoseBlend = ease((time - 10.35) / .14);
    vegetaPoseBlend = gokuPoseBlend;
    beamThrust = ease((time - 10.35) / .18);
    const recoil = Math.sin((time - 10.35) * 24) * beamThrust;
    gokuX = beamThrust * 9 - recoil;
    vegetaX = 324 - beamThrust * 9 + recoil;
    gokuY = 5;
    vegetaY = 2;
    beamReach = ease((time - 10.35) / .38);
    beamPower = ease((time - 10.35) / .3) * (1 - clamp((time - 11.72) / .28));
    clashPower = ease(clamp((beamReach - .78) / .22)) * beamPower;
    shake = clashPower * 2.4;
    if (time >= 11.8) {
      gokuPose = 0;
      vegetaPose = 0;
      gokuPreviousPose = 3;
      vegetaPreviousPose = 3;
      gokuPoseBlend = ease((time - 11.8) / .2);
      vegetaPoseBlend = gokuPoseBlend;
    }
  }

  ctx.save();
  if (shake) ctx.translate(Math.sin(seconds * 63) * shake, Math.cos(seconds * 47) * shake * .55);
  if (fightStrength) drawFightParticles(ctx, seconds, fightStrength, impactX, impactY);
  if (dashStrength) {
    drawDust(ctx, gokuX + 82, 84, seconds, 1);
    drawDust(ctx, vegetaX + 94, 84, seconds, -1);
  }
  if (chargePower) {
    drawChargeAura(ctx, gokuX + GOKU_CHARGE_LOCAL_X, 44, seconds, chargePower, '#2288ff');
    drawChargeAura(ctx, vegetaX + VEGETA_CHARGE_LOCAL_X, 44, seconds, chargePower, '#35cfff');
  }
  if (beamPower) {
    const gokuBeamJoin = gokuX + GOKU_BEAM_JOIN_LOCAL_X;
    const vegetaBeamJoin = vegetaX + VEGETA_BEAM_JOIN_LOCAL_X;
    const gokuBeamEnd = lerp(gokuBeamJoin, WIDTH / 2, beamReach);
    const vegetaBeamEnd = lerp(vegetaBeamJoin, WIDTH / 2, beamReach);
    drawEnergyBeam(ctx, gokuBeamJoin, gokuBeamEnd, BEAM_Y, beamPower, '#217cff', seconds);
    drawEnergyBeam(ctx, vegetaBeamJoin, vegetaBeamEnd, BEAM_Y, beamPower, '#37c6ff', seconds);
  }
  const activeGoku = meleeMode ? gokuMelee : goku;
  const activeVegeta = meleeMode ? vegetaMelee : vegeta;
  const frameCount = meleeMode ? 8 : 6;
  if (dashStrength > .08 || fightStrength > .12) {
    const trail = Math.max(dashStrength, fightStrength);
    drawPose(ctx, activeGoku, gokuPose, gokuX - 14, gokuY, 176, 88, trail * .22, frameCount);
    drawPose(ctx, activeVegeta, vegetaPose, vegetaX + 14, vegetaY, 176, 88, trail * .22, frameCount);
    if (dashStrength > .35) {
      drawPose(ctx, activeGoku, gokuPose, gokuX - 27, gokuY, 176, 88, dashStrength * .1, frameCount);
      drawPose(ctx, activeVegeta, vegetaPose, vegetaX + 27, vegetaY, 176, 88, dashStrength * .1, frameCount);
    }
  }
  if (gokuPoseBlend < .995) {
    drawPose(ctx, activeGoku, gokuPreviousPose, gokuX, gokuY, 176, 88, 1 - gokuPoseBlend, frameCount);
  }
  if (vegetaPoseBlend < .995) {
    drawPose(ctx, activeVegeta, vegetaPreviousPose, vegetaX, vegetaY, 176, 88, 1 - vegetaPoseBlend, frameCount);
  }
  drawPose(ctx, activeGoku, gokuPose, gokuX, gokuY, 176, 88, gokuPoseBlend, frameCount);
  drawPose(ctx, activeVegeta, vegetaPose, vegetaX, vegetaY, 176, 88, vegetaPoseBlend, frameCount);
  if (attackArc) {
    drawAttackArc(ctx, impactX, impactY, seconds, attackerIsGoku ? 1 : -1, attackArc);
  }
  if (fightStrength > .08) {
    drawImpact(ctx, seconds, fightStrength, impactX, impactY);
    drawShockRing(ctx, impactX, impactY, fightStrength);
  }
  if (clashPower) drawClash(ctx, seconds, clashPower);
  ctx.restore();
}

export default function ComicFightAnimation({className = ''}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return undefined;

    const goku = new Image();
    const vegeta = new Image();
    const gokuMelee = new Image();
    const vegetaMelee = new Image();
    let frameId;
    let startedAt;
    let disposed = false;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const bounds = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(bounds.width * ratio));
      canvas.height = Math.max(1, Math.round(bounds.height * ratio));
      context.setTransform(canvas.width / WIDTH, 0, 0, canvas.height / HEIGHT, 0, 0);
    }

    function animate(timestamp) {
      if (disposed) return;
      if (!startedAt) startedAt = timestamp;
      renderScene(context, goku, vegeta, gokuMelee, vegetaMelee, (timestamp - startedAt) / 1000, reducedMotion);
      if (!reducedMotion) frameId = window.requestAnimationFrame(animate);
    }

    Promise.all([
      new Promise((resolve) => { goku.onload = resolve; goku.src = '/images/comic/goku-kamehameha-sprite-normalized.png'; }),
      new Promise((resolve) => { vegeta.onload = resolve; vegeta.src = '/images/comic/vegeta-kamehameha-sprite-normalized.png'; }),
      new Promise((resolve) => { gokuMelee.onload = resolve; gokuMelee.src = '/images/comic/goku-melee-v2.png'; }),
      new Promise((resolve) => { vegetaMelee.onload = resolve; vegetaMelee.src = '/images/comic/vegeta-melee-v2.png'; }),
    ]).then(() => {
      if (disposed) return;
      resize();
      frameId = window.requestAnimationFrame(animate);
    });

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => {
      disposed = true;
      observer.disconnect();
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} width="500" height="102" aria-hidden="true" />;
}
