import {mkdir, writeFile} from 'node:fs/promises';
import {dirname, join} from 'node:path';

const outDir = new URL('../build/', import.meta.url);
const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#0b0d10" />
    <meta
      name="description"
      content="Hello, World! — a brutally simple page with bold typography."
    />
    <title>Hello, World!</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #07090d;
        --fg: #f4f1ea;
        --muted: rgba(244, 241, 234, 0.72);
        --accent: #a78bfa;
        --accent2: #7dd3fc;
      }

      * { box-sizing: border-box; }
      html, body { height: 100%; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        overflow: hidden;
        background:
          radial-gradient(circle at 20% 20%, rgba(167, 139, 250, 0.22), transparent 28%),
          radial-gradient(circle at 80% 30%, rgba(125, 211, 252, 0.18), transparent 22%),
          radial-gradient(circle at 50% 80%, rgba(255, 255, 255, 0.06), transparent 30%),
          linear-gradient(180deg, #0b0d10 0%, #050608 100%);
        color: var(--fg);
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .noise {
        position: fixed;
        inset: 0;
        pointer-events: none;
        opacity: 0.08;
        background-image:
          linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
        background-size: 48px 48px;
        mask-image: linear-gradient(180deg, transparent, black 10%, black 90%, transparent);
      }

      .wrap {
        position: relative;
        width: min(92vw, 1100px);
        padding: 4rem 1.5rem;
        text-align: center;
      }

      .eyebrow {
        margin: 0 0 1rem;
        text-transform: uppercase;
        letter-spacing: 0.35em;
        font-size: 0.72rem;
        font-weight: 700;
        color: var(--muted);
      }

      h1 {
        margin: 0;
        line-height: 0.9;
        font-size: clamp(4.5rem, 16vw, 14rem);
        font-weight: 900;
        letter-spacing: -0.08em;
        text-wrap: balance;
      }

      h1 span {
        display: inline-block;
        background: linear-gradient(90deg, var(--fg), var(--accent) 48%, var(--accent2));
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
        text-shadow: 0 0 40px rgba(167, 139, 250, 0.18);
      }

      .lede {
        max-width: 42rem;
        margin: 1.5rem auto 0;
        font-size: clamp(1rem, 2.2vw, 1.35rem);
        line-height: 1.6;
        color: var(--muted);
      }

      .ring {
        position: absolute;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,0.09);
        inset: auto;
        filter: blur(0.2px);
      }

      .ring.one {
        width: 18rem;
        height: 18rem;
        top: -1rem;
        left: 4%;
        box-shadow: 0 0 120px rgba(167, 139, 250, 0.08);
      }

      .ring.two {
        width: 26rem;
        height: 26rem;
        right: -3rem;
        bottom: -4rem;
        box-shadow: 0 0 160px rgba(125, 211, 252, 0.06);
      }

      @media (max-width: 640px) {
        .wrap { padding: 2rem 1rem; }
        .eyebrow { letter-spacing: 0.25em; }
      }
    </style>
  </head>
  <body>
    <div class="noise"></div>
    <div class="ring one"></div>
    <div class="ring two"></div>
    <main class="wrap" aria-label="Hello World landing page">
      <p class="eyebrow">Hermes Agent</p>
      <h1>Bold <span>new things</span></h1>
      <p class="lede">A very small website with very large type. Nothing more, nothing less.</p>
    </main>
  </body>
</html>
`;

await mkdir(outDir, {recursive: true});
await writeFile(new URL('index.html', outDir), html);
await writeFile(new URL('404.html', outDir), html);
await writeFile(new URL('robots.txt', outDir), 'User-agent: *\nAllow: /\n');
