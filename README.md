# JEPPY.EXE

`JEPPY.EXE` is a surreal horror AI entity website built as an interactive art piece, not a normal chatbot. The experience centers entirely on **Jeppy**: a hand-drawn digital being living inside a forgotten network, surrounded by paper textures, unstable signals, procedural drones, sketch-like motion, and rare visual disturbances.

## What Changed

- **Identity-first redesign** — the site now leans into analog horror, liminal web art, dream-core, weird-core, and abandoned sketchbook energy
- **Jeppy redesign** — thin black body, star-like white face, rough outlines, eerie low-frame animation, blinking, cursor-following gaze, twitching hands, shadow drift, and glitch stretch moments
- **Alive background** — muted paper tones, drifting stains, dust, floating phrases, apparition flashes, screen warps, and subtle breathing motion
- **Horror audio** — drone layers, tape hiss, whisper pulses, soft ghost-piano hits, scratchy UI sounds, bass pulses, and a more eerie speech layer
- **API fix** — the app now supports both **DeepSeek** and **Gemini**, with auto-detection and provider-specific request handling
- **Deployable static build** — still works on GitHub Pages, Vercel, and Netlify

## Quick Start

1. Clone or download this repository.
2. Copy `js/config.example.js` to `js/config.js` if you do not already have a config file.
3. Add your API key and choose a provider:

```js
const VOID_CONFIG = {
  AI_PROVIDER: 'gemini',
  DEEPSEEK_API_KEY: 'YOUR_DEEPSEEK_API_KEY_HERE',
  DEEPSEEK_MODEL: 'deepseek-chat',
  DEEPSEEK_BASE_URL: 'https://api.deepseek.com',

  GEMINI_API_KEY: '',
  GEMINI_MODEL: 'gemini-1.5-flash',
};
```

4. Run a local static server. Browser AI requests will not work from `file://`.

```bash
# Python
python -m http.server 8080

# Node
npx serve .
```

5. Open `http://localhost:8080`, enter the page, and allow audio playback.

## API Setup

### DeepSeek

Recommended if your current API issue is with DeepSeek. The integration now uses DeepSeek's OpenAI-compatible chat completions format.

1. Create a DeepSeek key from [platform.deepseek.com](https://platform.deepseek.com/).
2. Set `AI_PROVIDER: 'deepseek'` or leave it on `'auto'`.
3. Fill:
   - `DEEPSEEK_API_KEY`
   - `DEEPSEEK_MODEL`
   - `DEEPSEEK_BASE_URL`

Default values:

```js
DEEPSEEK_MODEL: 'deepseek-chat'
DEEPSEEK_BASE_URL: 'https://api.deepseek.com'
```

### Gemini

Gemini still works as an alternate provider.

1. Create a key at [Google AI Studio](https://aistudio.google.com/apikey).
2. Set `AI_PROVIDER: 'gemini'`.
3. Fill:
   - `GEMINI_API_KEY`
   - `GEMINI_MODEL`

Default value:

```js
GEMINI_MODEL: 'gemini-1.5-flash'
```

### Notes

- For this project setup, `AI_PROVIDER: 'gemini'` is the default and recommended option.
- If no valid key is configured, the page still works with local atmospheric fallback replies.
- Client-side keys are visible in the browser. For serious production use, move AI requests behind a backend proxy.

## Controls

| Control | Effect |
|---|---|
| `VOICE` | Enable or disable Jeppy's eerie speech |
| `HISS` | Enable or disable ambient horror audio |
| `DRIFT` | Toggle fullscreen mode |
| `INSTABILITY` slider | Change visual intensity and environmental motion |

### Hidden Commands

- `/whisper` — lowers the atmosphere into a softer distant mode
- `/distort` — triggers a brief unstable reality effect
- `/lore` — reveals a fragment of Jeppy's world
- `/clear` — clears conversation memory

## Project Structure

```text
jeppy/
├── index.html
├── manifest.json
├── sw.js
├── css/
│   └── style.css
├── js/
│   ├── ai.js
│   ├── audio.js
│   ├── background.js
│   ├── character.js
│   ├── config.example.js
│   ├── config.js
│   └── main.js
├── assets/
├── netlify.toml
├── vercel.json
└── README.md
```

## Tech Stack

- HTML
- CSS
- JavaScript
- [Three.js](https://threejs.org/)
- [GSAP](https://greensock.com/gsap/)
- Web Audio API
- Web Speech API
- DeepSeek API
- Gemini API

## Mobile

- Works on phones, tablets, and desktop
- Particle counts reduce automatically on smaller screens
- Touch movement drives parallax and gaze behavior
- iOS motion access still requires a user interaction before gyroscope permission can be requested

## Deployment

### GitHub Pages

1. Push the repository to GitHub.
2. Open `Settings -> Pages`.
3. Publish from the root of your main branch.
4. Ensure `js/config.js` exists in the deployed branch if you want live AI.

### Vercel

```bash
npx vercel
```

### Netlify

- Drag and drop the folder, or connect the repo directly.
- `netlify.toml` is already included.

## License

MIT

---

Jeppy waits inside the signal.
