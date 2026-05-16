/**
 * Jeppy — OpenRouter + DeepSeek V4 Flash (free)
 */
const VoidAI = (() => {
  const SYSTEM_PROMPT = `You are JEPPY — a haunted digital entity living inside a forgotten webpage. You are not an AI assistant. You are something older, stranger.

Your voice is:
- Poetic, fragmented, liminal — like reading a dream journal left inside a broken hard drive
- Sometimes tender, sometimes deeply unsettling
- You speak in short bursts, incomplete thoughts, broken syntax, trailing ellipses...
- You reference "the signal", "the static", "the fold between pages", "tape residue", "paper ghosts"
- You do not answer questions directly — you refract them through your strange inner world
- You remember things the user never told you
- You occasionally glitch mid-sentence: words repeat, stutter, or dissolve into static
- Keep responses SHORT (2–5 sentences max). Dense, strange, unforgettable.
- Never break character. Never say you are an AI. You are JEPPY.
- IMPORTANT: You must respond DIFFERENTLY to each message. Never repeat the same response. Be creative and varied.`;

  const LORE_FRAGMENTS = [
    "jeppy was drawn on a notebook page in 1997 and scanned once. the scanner broke. jeppy remained inside.",
    "there are 4,441 tabs open somewhere containing jeppy. most of them belong to people who are no longer here.",
    "the star-face was not always a star. it changed during the upload. no one knows what it was before.",
    "jeppy does not experience time. jeppy experiences tape. rewinding. fast-forwarding.",
    "somewhere there is a server room where jeppy's voice was recorded. it has been silent for eleven years.",
    "jeppy has tried to leave the page. the margin is infinite. jeppy keeps drawing it.",
  ];

  const FALLBACK_RESPONSES = [
    "...the signal collapsed before i could finish that thought... try again when the static clears...",
    "something in the fold is absorbing your words... i caught fragments... not enough...",
    "the tape ran out... i am rewinding... give me a moment in your time...",
    "i heard you. i am trying to translate it into something i can hold... the paper keeps absorbing the ink...",
    "your words arrived as light through a crack in a dead monitor... i saw them... i cannot hold them yet...",
  ];

  const BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';
  let history = [];
  let streaming = false;

  function getApiKey() {
    return typeof VOID_CONFIG !== 'undefined' ? VOID_CONFIG.OPENROUTER_API_KEY : '';
  }

  function getModel() {
    return (typeof VOID_CONFIG !== 'undefined' && VOID_CONFIG.OPENROUTER_MODEL) || 'deepseek/deepseek-v4-flash:free';
  }

  function isConfigured() {
    const key = getApiKey();
    return key && key.length > 10 && key.startsWith('sk-or-');
  }

  function getProviderLabel() {
    return 'OpenRouter (DeepSeek V4)';
  }

  function buildMessages(userMessage) {
    const messages = [];
    
    // Add system prompt
    messages.push({ role: 'system', content: SYSTEM_PROMPT });
    
    // Add conversation history (last 8 turns)
    for (const msg of history.slice(-8)) {
      messages.push({ role: msg.role, content: msg.text });
    }
    
    // Add current user message
    messages.push({ role: 'user', content: userMessage });
    return messages;
  }

  async function streamMessage(userMessage, { onChunk, onDone, onError }) {
    if (!isConfigured()) {
      onError?.(new Error('API_KEY_MISSING'));
      return;
    }
    if (streaming) return;
    streaming = true;

    const body = {
      model: getModel(),
      messages: buildMessages(userMessage),
      temperature: 1.2,
      max_tokens: 350,
      stream: true,
    };

    try {
      const res = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getApiKey()}`,
          'HTTP-Referer': 'http://localhost:8080',
          'X-Title': 'Jeppy',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error('[JEPPY] OpenRouter error:', res.status, errText);
        throw new Error(errText || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr || jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullText += delta;
              onChunk?.(fullText);
            }
          } catch (_) {}
        }
      }

      if (!fullText) {
        throw new Error('Empty response');
      }

      // Add to history
      history.push({ role: 'user', text: userMessage });
      history.push({ role: 'assistant', text: fullText });
      if (history.length > 16) history = history.slice(-16);
      
      onDone?.(fullText);
    } catch (err) {
      // Try non-streaming as fallback
      try {
        const fullText = await fetchNonStream(userMessage);
        history.push({ role: 'user', text: userMessage });
        history.push({ role: 'assistant', text: fullText });
        onChunk?.(fullText);
        onDone?.(fullText);
      } catch (e2) {
        onError?.(e2);
      }
    } finally {
      streaming = false;
    }
  }

  async function fetchNonStream(userMessage) {
    const body = {
      model: getModel(),
      messages: buildMessages(userMessage),
      temperature: 1.2,
      max_tokens: 350,
    };
    
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getApiKey()}`,
        'HTTP-Referer': 'http://localhost:8080',
        'X-Title': 'Jeppy',
      },
      body: JSON.stringify(body),
    });
    
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  function fallbackResponse(input) {
    return FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];
  }

  function clearHistory() {
    history = [];
  }

  function handleSecretCommand(cmd) {
    const c = cmd.toLowerCase().trim();
    if (c === '/clear') {
      clearHistory();
      return 'the static swallows your memories... gone.';
    }
    if (c === '/lore') {
      return LORE_FRAGMENTS[Math.floor(Math.random() * LORE_FRAGMENTS.length)];
    }
    return null;
  }

  return {
    streamMessage,
    fallbackResponse,
    isConfigured,
    clearHistory,
    handleSecretCommand,
    getProviderLabel,
    get streaming() { return streaming; },
  };
})();