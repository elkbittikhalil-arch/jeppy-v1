/**
 * JEPPY.EXE — sketchy uncanny entity animation
 */
const VoidCharacter = (() => {
  let canvas;
  let ctx;
  let w = 0;
  let h = 0;
  let animId;
  let mouse = { x: 0, y: 0 };
  let headOffset = { x: 0, y: 0 };
  let gaze = { x: 0, y: 0 };
  let gazeTarget = { x: 0, y: 0 };
  let shadowDrift = { x: 0, y: 0 };
  let blink = 0;
  let blinkTimer = 120;
  let mouthOpen = 0;
  let speaking = false;
  let voiceLevel = 0;
  let eyeGlow = 0;
  let glitchFrame = 0;
  let handTwitch = 0;
  let lowFrameGate = 0;

  function init() {
    canvas = document.getElementById('jeppy-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    resize();

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', updatePointer);
    window.addEventListener('touchmove', updateTouch, { passive: true });

    setInterval(() => {
      if (Math.random() < 0.014) glitchFrame = 6 + Math.floor(Math.random() * 6);
      if (Math.random() < 0.018) handTwitch = 10;
      gazeTarget.x = (Math.random() - 0.5) * 5;
      gazeTarget.y = (Math.random() - 0.5) * 4;
    }, 450);

    animate();
  }

  function resize() {
    if (!canvas || !ctx) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = rect.width;
    h = rect.height;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function updatePointer(e) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    mouse.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
  }

  function updateTouch(e) {
    if (!e.touches[0]) return;
    const rect = canvas.getBoundingClientRect();
    const t = e.touches[0];
    mouse.x = ((t.clientX - rect.left) / rect.width - 0.5) * 2;
    mouse.y = ((t.clientY - rect.top) / rect.height - 0.5) * 2;
  }

  function animate(now = 0) {
    animId = requestAnimationFrame(animate);
    if (!ctx) return;

    lowFrameGate = (lowFrameGate + 1) % 3;
    if (glitchFrame <= 0 && lowFrameGate === 1 && Math.random() < 0.18) return;

    ctx.clearRect(0, 0, w, h);
    drawJeppy(now);
  }

  function drawJeppy(now) {
    const t = now * 0.001;
    const scale = Math.min(w, h) / 320;
    const cx = w * 0.5;
    const cy = h * 0.54;
    const sway = Math.sin(t * 1.2) * 4 * scale;
    const breathe = Math.sin(t * 1.8) * 3 * scale;
    const glitching = glitchFrame > 0;
    if (glitching) glitchFrame--;

    headOffset.x += (mouse.x * 14 * scale - headOffset.x) * 0.05;
    headOffset.y += (mouse.y * 10 * scale - headOffset.y) * 0.05;
    gaze.x += ((gazeTarget.x + mouse.x * 3) * scale - gaze.x) * 0.08;
    gaze.y += ((gazeTarget.y + mouse.y * 2) * scale - gaze.y) * 0.08;
    shadowDrift.x += ((Math.sin(t * 0.6) * 9 + mouse.x * 10) * scale - shadowDrift.x) * 0.02;
    shadowDrift.y += ((Math.cos(t * 0.5) * 5) * scale - shadowDrift.y) * 0.02;

    drawShadow(cx, cy, scale, glitching);

    ctx.save();
    ctx.translate(
      cx + sway + (glitching ? (Math.random() - 0.5) * 8 * scale : 0),
      cy + (glitching ? (Math.random() - 0.5) * 4 * scale : 0)
    );
    ctx.scale(1 + (glitching ? (Math.random() - 0.5) * 0.06 : 0), glitching ? 1.05 + Math.random() * 0.09 : 1);

    drawDust(t, scale, glitching);
    drawLegs(scale, breathe, glitching);
    drawTorso(scale, breathe, glitching);
    drawArms(scale, t, breathe, glitching);

    ctx.save();
    ctx.translate(headOffset.x, -76 * scale + headOffset.y + breathe * 0.2);
    drawHead(scale, t, glitching);
    ctx.restore();

    if (glitching) drawGhostFrame(scale);
    ctx.restore();
  }

  function drawShadow(cx, cy, scale, glitching) {
    ctx.save();
    ctx.translate(cx + shadowDrift.x, cy + 126 * scale + shadowDrift.y);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.26)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 44 * scale + (glitching ? 4 * scale : 0), 10 * scale, 0.05, 0, Math.PI * 2);
    ctx.fill();
    if (glitching) {
      ctx.globalAlpha = 0.18;
      ctx.beginPath();
      ctx.ellipse(8 * scale, -3 * scale, 52 * scale, 11 * scale, -0.08, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawDust(t, scale, glitching) {
    for (let i = 0; i < 10; i++) {
      const x = Math.sin(t * (0.3 + i * 0.08) + i) * 40 * scale;
      const y = -70 * scale + Math.cos(t * (0.45 + i * 0.04) + i * 2) * 50 * scale;
      ctx.save();
      ctx.globalAlpha = 0.06 + (glitching ? 0.1 : 0);
      ctx.fillStyle = glitching ? '#b9d4d8' : '#f2ebdf';
      ctx.beginPath();
      ctx.arc(x, y, (1.2 + (i % 3)) * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawLegs(scale, breathe, glitching) {
    ctx.save();
    const legTop = 12 * scale;
    const legBottom = 88 * scale + breathe;
    const jitter = glitching ? (Math.random() - 0.5) * 3 * scale : 0;

    sketchStroke('#090909', 4 * scale, () => {
      ctx.beginPath();
      ctx.moveTo(-10 * scale, legTop);
      ctx.lineTo(-13 * scale + jitter, legBottom);
      ctx.moveTo(10 * scale, legTop);
      ctx.lineTo(13 * scale - jitter, legBottom);
      ctx.stroke();
    });

    drawBoot(-15 * scale + jitter, legBottom, scale, -1);
    drawBoot(15 * scale - jitter, legBottom, scale, 1);
    ctx.restore();
  }

  function drawBoot(x, y, scale, direction) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#070707';
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = 1.2 * scale;
    ctx.beginPath();
    ctx.moveTo(-10 * scale * direction, 0);
    ctx.quadraticCurveTo(-16 * scale * direction, 7 * scale, -17 * scale * direction, 16 * scale);
    ctx.lineTo(6 * scale * direction, 16 * scale);
    ctx.quadraticCurveTo(15 * scale * direction, 14 * scale, 15 * scale * direction, 8 * scale);
    ctx.quadraticCurveTo(13 * scale * direction, 1 * scale, 4 * scale * direction, -2 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawTorso(scale, breathe, glitching) {
    ctx.save();
    const torsoTop = -8 * scale;
    const torsoHeight = 94 * scale + breathe;
    const torsoWidth = 18 * scale;
    ctx.fillStyle = '#070707';

    sketchStroke('#0b0b0b', 2 * scale, () => {
      ctx.beginPath();
      ctx.moveTo(0, torsoTop);
      ctx.quadraticCurveTo(-torsoWidth, 18 * scale, -14 * scale, torsoHeight * 0.55);
      ctx.quadraticCurveTo(-8 * scale, torsoHeight, 0, torsoHeight + 8 * scale);
      ctx.quadraticCurveTo(8 * scale, torsoHeight, 14 * scale, torsoHeight * 0.55);
      ctx.quadraticCurveTo(torsoWidth, 18 * scale, 0, torsoTop);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }, glitching ? 2 : 3);

    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 0.8 * scale;
    ctx.beginPath();
    ctx.moveTo(-5 * scale, 22 * scale);
    ctx.lineTo(5 * scale, 70 * scale);
    ctx.stroke();
    ctx.restore();
  }

  function drawArms(scale, t, breathe, glitching) {
    const twitch = handTwitch > 0 ? (Math.random() - 0.5) * 18 * scale : 0;
    if (handTwitch > 0) handTwitch--;
    const armWave = Math.sin(t * 1.7) * 3 * scale;

    ctx.save();
    sketchStroke('#0a0a0a', 3.2 * scale, () => {
      ctx.beginPath();
      ctx.moveTo(-11 * scale, 8 * scale);
      ctx.quadraticCurveTo(-38 * scale + armWave, 34 * scale + twitch, -42 * scale, 70 * scale + breathe * 0.3);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(11 * scale, 8 * scale);
      ctx.quadraticCurveTo(38 * scale - armWave, 30 * scale - twitch * 0.5, 42 * scale, 68 * scale);
      ctx.stroke();
    }, glitching ? 2 : 3);

    drawHand(-42 * scale, 70 * scale + breathe * 0.3, scale, twitch);
    drawHand(42 * scale, 68 * scale, scale, -twitch * 0.5);
    ctx.restore();
  }

  function drawHand(x, y, scale, twitch) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = '#0b0b0b';
    ctx.lineWidth = 1.1 * scale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-4 * scale, 8 * scale + twitch * 0.1);
    ctx.moveTo(0, 0);
    ctx.lineTo(2 * scale, 8 * scale);
    ctx.moveTo(0, 0);
    ctx.lineTo(7 * scale, 7 * scale - twitch * 0.08);
    ctx.stroke();
    ctx.restore();
  }

  function drawHead(scale, t, glitching) {
    const faceRadius = 28 * scale;
    const eyeY = -1 * scale;
    const eyeSpacing = 10 * scale;
    const blinkAmount = getBlinkAmount();
    const glow = eyeGlow + voiceLevel * 0.45;

    drawFaceStar(faceRadius, scale, glitching);

    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.26)';
    ctx.lineWidth = 1.2 * scale;
    for (let i = 0; i < 6; i++) {
      const angle = -Math.PI / 2 + i * (Math.PI / 3);
      const inner = faceRadius * 0.94;
      const outer = faceRadius * 1.28 + Math.sin(t * 1.4 + i) * 3 * scale;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
      ctx.stroke();
    }
    ctx.restore();

    if (glow > 0.01 && blinkAmount < 0.7) {
      ctx.save();
      ctx.shadowColor = `rgba(255, 240, 214, ${0.45 * glow})`;
      ctx.shadowBlur = 14 * scale;
      drawEyes(eyeSpacing, eyeY, scale, blinkAmount, true);
      ctx.restore();
    }

    drawEyes(eyeSpacing, eyeY, scale, blinkAmount, false);
    drawMouth(scale);
  }

  function drawFaceStar(radius, scale, glitching) {
    const points = 12;
    const inner = radius * 0.72;

    for (let pass = 0; pass < (glitching ? 3 : 2); pass++) {
      ctx.save();
      ctx.translate(
        glitching ? (Math.random() - 0.5) * 3 * scale : (pass ? 1 : -1) * 0.8 * scale,
        glitching ? (Math.random() - 0.5) * 2 * scale : (pass ? -1 : 1) * 0.6 * scale
      );
      ctx.beginPath();
      for (let i = 0; i < points * 2; i++) {
        const angle = (-Math.PI / 2) + (i / (points * 2)) * Math.PI * 2;
        const r = i % 2 === 0 ? radius : inner + (Math.sin(i * 2.1) * 2 * scale);
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = '#f2ebdf';
      ctx.strokeStyle = 'rgba(28, 23, 23, 0.55)';
      ctx.lineWidth = 1.5 * scale;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawEyes(spacing, y, scale, blinkAmount, glowPass) {
    const height = Math.max(1.2 * scale, 8 * scale * (1 - blinkAmount));
    const width = 6.5 * scale;
    const gx = gaze.x * 0.35;
    const gy = gaze.y * 0.2;
    ctx.save();
    ctx.fillStyle = glowPass ? 'rgba(255, 243, 225, 0.95)' : '#050505';

    if (blinkAmount > 0.88) {
      ctx.strokeStyle = glowPass ? 'rgba(255, 243, 225, 0.9)' : '#050505';
      ctx.lineWidth = 1.1 * scale;
      ctx.beginPath();
      ctx.moveTo(-spacing - width, y);
      ctx.lineTo(-spacing + width, y);
      ctx.moveTo(spacing - width, y);
      ctx.lineTo(spacing + width, y);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.ellipse(-spacing + gx, y + gy, width, height, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(spacing + gx, y + gy, width, height, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (!glowPass && blinkAmount < 0.7) {
      ctx.strokeStyle = 'rgba(255,255,255,0.16)';
      ctx.lineWidth = 0.7 * scale;
      ctx.beginPath();
      ctx.moveTo(-spacing + gx - 3 * scale, y + gy - 2 * scale);
      ctx.lineTo(-spacing + gx + 2 * scale, y + gy - 1 * scale);
      ctx.moveTo(spacing + gx - 3 * scale, y + gy - 2 * scale);
      ctx.lineTo(spacing + gx + 2 * scale, y + gy - 1 * scale);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawMouth(scale) {
    const open = speaking ? mouthOpen : 0.02;
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.34)';
    ctx.lineWidth = 1.1 * scale;
    if (open > 0.1) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath();
      ctx.ellipse(0, 14 * scale, 4 * scale + open * 2 * scale, 2 * scale + open * 6 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(-4 * scale, 13 * scale);
      ctx.quadraticCurveTo(0, 14 * scale, 4 * scale, 13 * scale);
      ctx.stroke();
    }
    ctx.restore();
  }

  function getBlinkAmount() {
    blinkTimer -= 1;
    if (blinkTimer <= 0) {
      blink = 6;
      blinkTimer = 120 + Math.random() * 170;
    }
    if (blink > 0) blink--;
    return blink / 6;
  }

  function drawGhostFrame(scale) {
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.translate((Math.random() - 0.5) * 12 * scale, (Math.random() - 0.5) * 8 * scale);
    ctx.strokeStyle = '#b9d4d8';
    ctx.lineWidth = 1 * scale;
    ctx.strokeRect(-38 * scale, -110 * scale, 76 * scale, 170 * scale);
    ctx.restore();
  }

  function sketchStroke(color, width, drawFn, passes = 2) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i < passes; i++) {
      ctx.save();
      ctx.translate((Math.random() - 0.5) * width * 0.35, (Math.random() - 0.5) * width * 0.35);
      drawFn();
      ctx.restore();
    }
    ctx.restore();
  }

  function setSpeaking(value) {
    speaking = value;
    const glow = document.getElementById('character-glow');
    if (glow) glow.classList.toggle('active', value);
  }

  function setMouthOpen(value) {
    mouthOpen = Math.max(0, Math.min(1, value));
  }

  function setVoiceLevel(value) {
    voiceLevel = Math.max(0, Math.min(1, value));
    eyeGlow = Math.max(eyeGlow, value);
    eyeGlow *= 0.93;
    if (speaking) {
      mouthOpen = Math.max(0.08, Math.min(1, 0.18 + value * 0.88 + Math.sin(Date.now() * 0.03) * 0.05));
    }
  }

  function triggerGlitch() {
    glitchFrame = 9;
    VoidBackground?.triggerGlitch?.();
  }

  return {
    init,
    setSpeaking,
    setMouthOpen,
    setVoiceLevel,
    triggerGlitch,
  };
})();
