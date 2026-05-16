/**
 * JEPPY.EXE — main orchestration
 */
(() => {
  const $ = (sel) => document.querySelector(sel);
  let isProcessing = false;
  let whisperMode = false;

  const els = {
    boot: $('#boot-screen'),
    enterBtn: $('#enter-btn'),
    app: $('#app'),
    chatForm: $('#chat-form'),
    chatInput: $('#chat-input'),
    sendBtn: $('#send-btn'),
    responseText: $('#response-text'),
    responseStatus: $('#response-status'),
    responsePanel: $('#response-panel'),
    btnVoice: $('#btn-voice'),
    btnMusic: $('#btn-music'),
    btnFullscreen: $('#btn-fullscreen'),
    intensitySlider: $('#intensity-slider'),
    apiWarning: $('#api-warning'),
    dismissWarning: $('#dismiss-warning'),
    characterStage: $('#character-stage'),
    ghostMessage: $('#ghost-message'),
    signalNote: $('#signal-note'),
  };

  function init() {
    runBootSequence();
    VoidAudio.init();
    VoidBackground.init();
    VoidCharacter.init();

    VoidAudio.setOnLevel((level) => {
      if (level > 0.1) VoidBackground?.setVoiceLevel(level);
    });

    bindUI();
    scheduleRareEvents();
    preloadVoices();
  }

  function preloadVoices() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }
  }

  function runBootSequence() {
    const lines = els.boot?.querySelectorAll('.boot-line');
    lines?.forEach((line, i) => {
      setTimeout(() => line.classList.add('visible'), 500 + i * 820);
    });
    setTimeout(() => {
      if (els.enterBtn) els.enterBtn.hidden = false;
    }, 600 + lines.length * 820 + 350);
  }

  function enterExperience() {
    VoidAudio.unlockAudio();
    els.boot?.classList.add('hidden');
    els.app?.removeAttribute('hidden');
    els.characterStage?.removeAttribute('aria-hidden');
    document.body.classList.add('experience-live');

    if (!VoidAudio.musicPlaying) {
      VoidAudio.toggleMusic(true);
      els.btnMusic?.setAttribute('aria-pressed', 'true');
    }

    if (!VoidAI.isConfigured()) {
      els.apiWarning?.removeAttribute('hidden');
      updateSignalNote('provider absent. jeppy answers in echoes.');
    } else {
      updateSignalNote(`channel open through ${VoidAI.getProviderLabel().toLowerCase()}.`);
    }

    if (typeof gsap !== 'undefined') {
      gsap.from(els.app, { opacity: 0, duration: 1.3, ease: 'power2.out' });
      gsap.from('.presence-panel', { opacity: 0, y: 20, duration: 1.1, delay: 0.35 });
    }

    els.chatInput?.focus();
  }

  function bindUI() {
    els.enterBtn?.addEventListener('click', enterExperience);
    els.dismissWarning?.addEventListener('click', () => els.apiWarning?.setAttribute('hidden', ''));

    els.chatForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      handleSend();
    });

    els.chatInput?.addEventListener('keydown', () => VoidAudio.playType());
    els.chatInput?.addEventListener('focus', () => VoidAudio.playHover());

    document.querySelectorAll('.hud-btn, .send-btn, .enter-btn').forEach((btn) => {
      btn.addEventListener('mouseenter', () => VoidAudio.playHover());
    });

    els.btnVoice?.addEventListener('click', () => {
      const on = els.btnVoice.getAttribute('aria-pressed') !== 'true';
      els.btnVoice.setAttribute('aria-pressed', on ? 'true' : 'false');
      VoidAudio.setVoiceEnabled(on);
    });

    els.btnMusic?.addEventListener('click', () => {
      const on = els.btnMusic.getAttribute('aria-pressed') !== 'true';
      els.btnMusic.setAttribute('aria-pressed', on ? 'true' : 'false');
      VoidAudio.toggleMusic(on);
      updateSignalNote(on ? 'the room hums again.' : 'the hiss retreats into the walls.');
    });

    els.btnFullscreen?.addEventListener('click', toggleFullscreen);

    els.intensitySlider?.addEventListener('input', (e) => {
      const v = Number(e.target.value) / 100;
      VoidBackground?.setIntensity(v);
      document.documentElement.style.setProperty('--effect-intensity', v);
    });
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.();
    }
  }

  async function handleSend(overrideText) {
    const text = (overrideText || els.chatInput?.value || '').trim();
    if (!text || isProcessing) return;

    const secret = handleSecretCommands(text);
    if (secret === 'handled') return;
    if (typeof secret === 'string') {
      displayResponse(secret, false);
      if (!overrideText) els.chatInput.value = '';
      return;
    }

    isProcessing = true;
    els.sendBtn.disabled = true;
    els.chatInput.value = '';
    setStatus('RECEIVING...');
    updateSignalNote('jeppy is listening through static.');
    VoidAudio.playBassPulse();
    VoidCharacter.triggerGlitch();
    clearResponse();

    const useFallback = !VoidAI.isConfigured();

    if (useFallback) {
      const msg = VoidAI.fallbackResponse(text);
      await simulateTyping(msg);
      finishResponse(msg);
      return;
    }

    let accumulated = '';
    VoidCharacter.setSpeaking(true);
    els.responsePanel?.classList.add('speaking');

    await VoidAI.streamMessage(text, {
      onChunk: (full) => {
        accumulated = full;
        renderStreamingText(full);
      },
      onDone: (full) => {
        finishResponse(full);
      },
      onError: async (err) => {
        console.warn('Jeppy AI error:', err);
        const msg = err.message?.includes('API_KEY')
          ? `Jeppy cannot open the channel. Configure js/config.js with a valid ${VoidAI.getProviderLabel()} API key.`
          : err.status === 402 || /insufficient balance/i.test(err.message || '')
            ? 'DeepSeek cannot answer right now. The account has no balance. Add credits, or let Jeppy speak through Gemini instead.'
            : VoidAI.fallbackResponse(text);
        updateSignalNote('the connection frayed. only echoes remain.');
        await simulateTyping(msg);
        finishResponse(msg);
      },
    });
  }

  function handleSecretCommands(text) {
    const cmd = text.toLowerCase().trim();
    if (cmd === '/whisper') {
      whisperMode = !whisperMode;
      document.body.classList.toggle('whisper-mode', whisperMode);
      VoidAudio.playGlitch();
      return whisperMode ? '...whisper mode engaged. the room lowers its voice.' : '...whisper mode dissolved.';
    }
    if (cmd === '/distort') {
      document.body.classList.toggle('distort-mode');
      VoidAudio.playGlitch();
      VoidCharacter.triggerGlitch();
       VoidBackground?.showGhostMessage('do not trust the frame');
      setTimeout(() => document.body.classList.remove('distort-mode'), 5000);
      return '...reality bends.';
    }
    if (cmd === '/clear') {
      VoidAI.clearHistory();
      return VoidAI.handleSecretCommand('/clear');
    }
    if (cmd === '/lore') {
      return VoidAI.handleSecretCommand('/lore');
    }
    if (cmd.startsWith('/')) {
      return 'Unknown protocol. Try /whisper /distort /lore /clear';
    }
    return null;
  }

  function clearResponse() {
    if (els.responseText) els.responseText.innerHTML = '';
  }

  function renderStreamingText(text) {
    if (!els.responseText) return;
    els.responseText.innerHTML = `<p>${escapeHtml(text)}<span class="cursor-blink"></span></p>`;
  }

  async function simulateTyping(text, skipDelay = false) {
    if (skipDelay) {
      renderStreamingText(text);
      return;
    }
    const words = text.split(' ');
    let built = '';
    for (let i = 0; i < words.length; i++) {
      built += (i ? ' ' : '') + words[i];
      renderStreamingText(built);
      await sleep(40 + Math.random() * 60);
    }
  }

  function finishResponse(text) {
    if (els.responseText) {
      els.responseText.innerHTML = `<p>${escapeHtml(text)}</p>`;
    }
    setStatus('');
    updateSignalNote('the page remembers what was said.');
    isProcessing = false;
    els.sendBtn.disabled = false;

    VoidCharacter.setSpeaking(true);
    VoidAudio.speak(text, () => {
      VoidCharacter.setSpeaking(false);
      VoidCharacter.setMouthOpen(0);
      els.responsePanel?.classList.remove('speaking');
    });

    if (Math.random() < 0.25) {
      VoidCharacter.triggerGlitch();
      VoidAudio.playGlitch();
    }
  }

  function displayResponse(text, speak = true) {
    if (els.responseText) els.responseText.innerHTML = `<p>${escapeHtml(text)}</p>`;
    if (speak) VoidAudio.speak(text);
  }

  function setStatus(s) {
    if (els.responseStatus) els.responseStatus.textContent = s;
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function scheduleRareEvents() {
    const whispers = [
      'someone left the monitor breathing',
      'cached faces move when you blink',
      'the room behind the page is still occupied',
      'jeppy remembers the last visitor',
      'old paper keeps shifting under the image',
    ];

    setInterval(() => {
      if (Math.random() < 0.008) {
        VoidBackground?.triggerGlitch();
        VoidAudio.playGlitch();
        updateSignalNote(whispers[Math.floor(Math.random() * whispers.length)]);
        const lore = [
          '...a memory surfaces unbidden.',
          '...did you hear that?',
          '...the walls lean closer.',
        ];
        if (Math.random() < 0.5 && els.responseText?.querySelector('p')) {
          const p = els.responseText.querySelector('p');
          const whisper = document.createElement('span');
          whisper.style.opacity = '0.4';
          whisper.style.fontSize = '0.85em';
          whisper.textContent = ` ${lore[Math.floor(Math.random() * lore.length)]}`;
          p.appendChild(whisper);
          setTimeout(() => whisper.remove(), 4000);
        }
        if (Math.random() < 0.6) {
          VoidBackground?.showGhostMessage(whispers[Math.floor(Math.random() * whispers.length)]);
        }
      }
    }, 3000);
  }

  function updateSignalNote(text) {
    if (els.signalNote) els.signalNote.textContent = text;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
