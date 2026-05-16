/**
 * JEPPY.EXE — reactive liminal environment
 */
const VoidBackground = (() => {
  let scene;
  let camera;
  let renderer;
  let clock;
  let animId;
  let dust;
  let stainField;
  let halo;
  let mouse = { x: 0, y: 0 };
  let gyro = { x: 0, y: 0 };
  let intensity = 0.76;
  let voiceLevel = 0;
  let isMobile = false;
  let particleCount = 0;

  const RUNE_SYMBOLS = ['eye', 'null', 'sleep', ':::','////','remember','_ _ _','do not blink'];
  const PAPER_SYMBOLS = ['look away', 'i was here', '( )', 'drown in static', '/////', 'dream', '??', 'open tab'];

  function init() {
    const canvas = document.getElementById('void-canvas');
    if (!canvas || typeof THREE === 'undefined') return;

    isMobile = window.innerWidth < 768 || 'ontouchstart' in window;
    particleCount = isMobile ? 260 : 620;

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0f0c0d, 0.07);

    camera = new THREE.PerspectiveCamera(54, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 8.6;

    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !isMobile,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.4 : 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    clock = new THREE.Clock();

    createBackdrop();
    createStainField();
    createDust();
    createHalo();
    createRunesDOM();
    createPaperSymbols();
    bindEvents();
    animate();
  }

  function createBackdrop() {
    const geo = new THREE.PlaneGeometry(40, 40, 1, 1);
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uVoice: { value: 0 },
        uIntensity: { value: intensity },
        uMouse: { value: new THREE.Vector2(0, 0) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uTime;
        uniform float uVoice;
        uniform float uIntensity;
        uniform vec2 uMouse;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(41.0, 289.0))) * 43758.5453123);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        void main() {
          vec2 uv = vUv;
          vec2 drift = uMouse * 0.05;
          float t = uTime * 0.035;
          float n1 = noise(uv * 3.5 + drift + t);
          float n2 = noise(uv * 8.0 - drift * 0.6 - t * 1.5);
          float n3 = noise(uv * 2.0 + vec2(t * 0.4, -t * 0.25));
          float breathing = sin(uTime * 0.38) * 0.5 + 0.5;
          vec3 paper = vec3(0.10, 0.08, 0.08);
          paper += vec3(0.32, 0.27, 0.24) * n1 * (0.26 + uIntensity * 0.22);
          paper += vec3(0.18, 0.10, 0.13) * n2 * (0.28 + uVoice * 0.35);
          paper += vec3(0.08, 0.06, 0.06) * n3 * 0.35;
          paper += vec3(0.06, 0.04, 0.05) * breathing * 0.14;
          float vignette = smoothstep(1.18, 0.24, length(uv - 0.5));
          paper *= vignette;
          gl_FragColor = vec4(paper, 0.96);
        }
      `,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.z = -12;
    mesh.userData.shaderMat = mat;
    scene.add(mesh);
    scene.userData.backdrop = mesh;
  }

  function createStainField() {
    const geo = new THREE.BufferGeometry();
    const count = isMobile ? 54 : 90;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 18;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 12;
      positions[i * 3 + 2] = -5 - Math.random() * 8;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xc9a5a8,
      transparent: true,
      opacity: 0.1,
      size: isMobile ? 0.42 : 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    stainField = new THREE.Points(geo, mat);
    scene.add(stainField);
  }

  function createDust() {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const palette = [
      new THREE.Color(0xf2ebdf),
      new THREE.Color(0xd5c1bc),
      new THREE.Color(0x9f7c88),
      new THREE.Color(0xc0cfce),
    ];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 24;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 18;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 14;
      const color = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: isMobile ? 0.045 : 0.06,
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    });

    dust = new THREE.Points(geo, mat);
    scene.add(dust);
  }

  function createHalo() {
    const geo = new THREE.RingGeometry(1.8, 2.2, 90);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xf2ebdf,
      transparent: true,
      opacity: 0.05,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    halo = new THREE.Mesh(geo, mat);
    halo.position.z = -2.8;
    halo.rotation.x = Math.PI * 0.38;
    scene.add(halo);
  }

  function createRunesDOM() {
    const layer = document.getElementById('runes-layer');
    if (!layer) return;
    layer.innerHTML = '';
    const count = isMobile ? 7 : 12;
    for (let i = 0; i < count; i++) {
      const el = document.createElement('span');
      el.className = 'rune';
      el.textContent = RUNE_SYMBOLS[Math.floor(Math.random() * RUNE_SYMBOLS.length)];
      el.style.left = `${Math.random() * 100}%`;
      el.style.animationDuration = `${16 + Math.random() * 18}s`;
      el.style.animationDelay = `${Math.random() * 10}s`;
      layer.appendChild(el);
    }
  }

  function createPaperSymbols() {
    const layer = document.getElementById('paper-symbols');
    if (!layer) return;
    layer.innerHTML = '';
    const count = isMobile ? 7 : 14;
    for (let i = 0; i < count; i++) {
      const el = document.createElement('span');
      el.className = 'paper-symbol';
      el.textContent = PAPER_SYMBOLS[Math.floor(Math.random() * PAPER_SYMBOLS.length)];
      el.style.left = `${Math.random() * 92 + 2}%`;
      el.style.top = `${Math.random() * 82 + 4}%`;
      el.style.setProperty('--rot', `${-7 + Math.random() * 14}deg`);
      el.style.animationDuration = `${8 + Math.random() * 16}s`;
      el.style.animationDelay = `${Math.random() * 8}s`;
      layer.appendChild(el);
    }
  }

  function bindEvents() {
    window.addEventListener('resize', onResize);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchmove', onTouchMove, { passive: true });

    if (window.DeviceOrientationEvent) {
      const requestGyro = () => {
        window.addEventListener('deviceorientation', (e) => {
          if (e.gamma != null && e.beta != null) {
            gyro.x = Math.max(-1, Math.min(1, e.gamma / 45));
            gyro.y = Math.max(-1, Math.min(1, (e.beta - 45) / 45));
          }
        });
      };

      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        document.addEventListener('click', () => {
          DeviceOrientationEvent.requestPermission().then(requestGyro).catch(() => {});
        }, { once: true });
      } else {
        requestGyro();
      }
    }
  }

  function onMouseMove(e) {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    updateMouseLight(e.clientX, e.clientY);
  }

  function onTouchMove(e) {
    if (!e.touches[0]) return;
    const t = e.touches[0];
    mouse.x = (t.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(t.clientY / window.innerHeight) * 2 + 1;
    updateMouseLight(t.clientX, t.clientY);
  }

  function updateMouseLight(x, y) {
    const light = document.getElementById('mouse-light');
    if (!light) return;
    light.style.left = `${x}px`;
    light.style.top = `${y}px`;
    light.classList.add('visible');
  }

  function onResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function animate() {
    animId = requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    const parallaxX = mouse.x * 0.26 + gyro.x * 0.18;
    const parallaxY = mouse.y * 0.22 + gyro.y * 0.14;

    if (scene.userData.backdrop) {
      const mat = scene.userData.backdrop.userData.shaderMat;
      mat.uniforms.uTime.value = t;
      mat.uniforms.uVoice.value = voiceLevel;
      mat.uniforms.uIntensity.value = intensity;
      mat.uniforms.uMouse.value.set(parallaxX, parallaxY);
    }

    if (dust) {
      dust.rotation.z = t * 0.01;
      dust.rotation.y = t * 0.015 + parallaxX * 0.06;
      dust.position.x = parallaxX * 0.25;
      dust.position.y = parallaxY * 0.18;
      dust.material.opacity = 0.36 + voiceLevel * 0.26 + intensity * 0.1;
    }

    if (stainField) {
      stainField.rotation.z = -t * 0.006;
      stainField.position.x = parallaxX * 0.18;
      stainField.position.y = parallaxY * 0.12;
      stainField.material.opacity = 0.08 + intensity * 0.06;
    }

    if (halo) {
      halo.rotation.z = t * 0.08;
      halo.scale.setScalar(1 + Math.sin(t * 0.4) * 0.04 + voiceLevel * 0.08);
      halo.material.opacity = 0.05 + voiceLevel * 0.08;
    }

    camera.position.x += (parallaxX * 0.6 - camera.position.x) * 0.03;
    camera.position.y += (parallaxY * 0.42 - camera.position.y) * 0.03;
    camera.lookAt(0, 0, 0);

    const driftX = Math.sin(t * 0.12) * 3 + parallaxX * 3;
    const driftY = Math.cos(t * 0.09) * 2 + parallaxY * 3;
    document.documentElement.style.setProperty('--drift-x', `${driftX}px`);
    document.documentElement.style.setProperty('--drift-y', `${driftY}px`);

    renderer.render(scene, camera);
  }

  function setIntensity(value) {
    intensity = Math.max(0, Math.min(1, value));
  }

  function setVoiceLevel(value) {
    voiceLevel = Math.max(0, Math.min(1, value));
  }

  function triggerGlitch(mode = 'full') {
    const burst = document.getElementById('fx-glitch-burst');
    const chrom = document.querySelector('.fx-chromatic');
    const body = document.body;

    if (burst) {
      burst.classList.add('active');
      setTimeout(() => burst.classList.remove('active'), mode === 'micro' ? 180 : 320);
    }
    if (chrom) {
      chrom.classList.add('active');
      setTimeout(() => chrom.classList.remove('active'), mode === 'micro' ? 160 : 260);
    }
    body.classList.add('glitching');
    if (mode !== 'micro') body.classList.add('screen-warp');
    setTimeout(() => body.classList.remove('glitching'), 240);
    setTimeout(() => body.classList.remove('screen-warp'), 700);
    flashApparition();
  }

  function flashApparition() {
    const layer = document.getElementById('apparition-layer');
    if (!layer) return;
    layer.classList.add('flash');
    setTimeout(() => layer.classList.remove('flash'), 180);
  }

  function showGhostMessage(text) {
    const message = document.getElementById('ghost-message');
    if (!message) return;
    message.textContent = text;
    message.classList.add('visible');
    setTimeout(() => message.classList.remove('visible'), 2600);
  }

  function randomFlicker() {
    if (Math.random() > 0.992) {
      const flicker = document.getElementById('fx-flicker');
      if (flicker) {
        flicker.classList.add('flash');
        setTimeout(() => flicker.classList.remove('flash'), 120);
      }
    }
    if (Math.random() > 0.997) flashApparition();
  }

  function getParallax() {
    return { x: mouse.x + gyro.x * 0.5, y: mouse.y + gyro.y * 0.5 };
  }

  function destroy() {
    cancelAnimationFrame(animId);
    window.removeEventListener('resize', onResize);
  }

  setInterval(randomFlicker, 120);

  return {
    init,
    setIntensity,
    setVoiceLevel,
    triggerGlitch,
    showGhostMessage,
    getParallax,
    destroy,
  };
})();
