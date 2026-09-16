# JSON / YAML / TOML Converter

Convert between JSON, YAML, and TOML in any direction — fast, free, and 100% client-side.
All parsing and serialization happens in your browser; your input is never sent over
the network.

**Live:** https://techshield-tech.github.io/json-yaml-toml-converter/

Part of [MMOALL Developer Tools](https://mmoall.com/tools).

## Features

- **Any pair of formats** — JSON ⇄ YAML ⇄ TOML (source and target selectors). Choosing the
  same format on both sides re-serializes (normalizes) the document.
- **Swap** source and target in one click; the current output becomes the new input.
- **Live conversion** as you type.
- **Indentation** — 2 spaces, 4 spaces, or tab for JSON; 2 or 4 spaces for YAML.
- **Sort keys** recursively (arrays keep their order).
- **Errors with line and column** for JSON, YAML, and TOML input. If the input fails to parse
  but looks like another format, the tool offers to switch the source format.
- **YAML niceties** — merge keys (`<<: *anchor`), anchors/aliases, and multi-document streams
  (`---`, converted to an array).
- **TOML specifics** — dates/times are kept when converting TOML → TOML and written as ISO
  strings otherwise; `null` values (which TOML does not support) are omitted with a notice;
  a non-object root is reported as an error.
- **Sample** document for each format, **Clear**, **Copy**, and **Download** of the output.
- Line count and UTF-8 byte size for both input and output.
- Light/dark theme, responsive layout, embeddable in an iframe (see [Embedding](#embedding)).

## Tech stack

- [Vite 6](https://vite.dev/) + [React 19](https://react.dev/) + TypeScript
- [Tailwind CSS 4](https://tailwindcss.com/) (via `@tailwindcss/vite`)
- [yaml](https://eemeli.org/yaml/) for YAML and [smol-toml](https://github.com/squirrelchat/smol-toml) for TOML
- [Bun](https://bun.sh/) as package manager / script runner

## Project structure

```
src/
├── main.tsx              # Entry point
├── index.css             # Tailwind + theme tokens (light/dark)
├── tool.config.ts        # Tool metadata: slug, name, description, category
├── shell/                # Shared MMOALL tool shell (same across tool repos)
│   ├── AppShell.tsx      # Header/footer, theme handling, embed mode
│   ├── embed.ts          # iframe embed contract (postMessage)
│   └── ui.tsx            # UI primitives and icons
└── tool/                 # Converter-specific code
    ├── Tool.tsx          # The tool UI
    ├── formats.ts        # parse / serialize / convert / detect, error positions
    └── samples.ts        # The same sample document in JSON, YAML, and TOML
```

## Running locally

Requirements: [Bun](https://bun.sh/) 1.x (Node.js 20+ with npm also works).

```bash
git clone https://github.com/techshield-tech/json-yaml-toml-converter.git
cd json-yaml-toml-converter
bun install
bun dev
```

Open the URL Vite prints — by default **http://localhost:5173/json-yaml-toml-converter/**
(note the `/json-yaml-toml-converter/` path, see [Base path](#base-path)).

To serve from the root instead:

```bash
BASE_PATH=/ bun dev        # http://localhost:5173/
```

### Scripts

| Command           | Description                                          |
| ----------------- | ---------------------------------------------------- |
| `bun dev`         | Start the dev server with hot reload                 |
| `bun run build`   | Type-check (`tsc -b`) and build to `dist/`           |
| `bun run preview` | Serve the production build from `dist/` locally      |

With npm: `npm install`, `npm run dev`, `npm run build`, `npm run preview`.

### Base path

The asset base URL is chosen at build time in `vite.config.ts`:

| Condition               | `base`             | Used for                    |
| ----------------------- | ------------------ | --------------------------- |
| `BASE_PATH` is set      | value of `BASE_PATH` | Any custom host / sub-path |
| `VERCEL` is set         | `/`                | Vercel (set automatically)  |
| otherwise (default)     | `/json-yaml-toml-converter/` | GitHub Pages                |

`BASE_PATH` should start and end with `/`, e.g. `/` or `/tools/json/`.

## Deployment

The build output is a fully static site in `dist/` — no server or environment
secrets required.

### Vercel

#### Option 1: Import from GitHub (recommended)

1. Go to [vercel.com/new](https://vercel.com/new) and import the
   `techshield-tech/json-yaml-toml-converter` repository.
2. Vercel auto-detects the **Vite** preset and Bun (from `bun.lock`). Defaults are fine:

   | Setting          | Value           |
   | ---------------- | --------------- |
   | Framework Preset | Vite            |
   | Install Command  | `bun install`   |
   | Build Command    | `bun run build` |
   | Output Directory | `dist`          |

3. Click **Deploy**.

No environment variables are needed: Vercel sets `VERCEL=1` during the build, so the
app is built with `base: '/'`. Afterwards, every push to `main` deploys to production
and every pull request gets a preview URL.

#### Option 2: Vercel CLI

```bash
bun add -g vercel     # or: npm i -g vercel
vercel login
vercel link           # link the folder to a (new) Vercel project
vercel                # preview deployment
vercel --prod         # production deployment
```

The CLI builds on Vercel's infrastructure, so `VERCEL=1` is set there as well.
To build locally and upload only the output:

```bash
vercel build --prod
vercel deploy --prebuilt --prod
```

#### Custom domain

In the Vercel dashboard, open **Project → Settings → Domains** and add your domain.
If you serve the tool under a sub-path of another site (e.g. via a rewrite from
`example.com/tools/json/`), set the `BASE_PATH` environment variable in
**Settings → Environment Variables** to that path (e.g. `/tools/json/`) and redeploy.

> The app has no client-side routing, so no SPA rewrite rules (`vercel.json`) are
> needed.

### GitHub Pages

Deployment to GitHub Pages runs automatically via
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) on every push to
`main` (or manually via *Run workflow*). It installs with Bun, runs
`bun run build` with the default `/json-yaml-toml-converter/` base, and publishes `dist/`.

To enable it on a fork: **Settings → Pages → Source: GitHub Actions**.

## Embedding

The tool can be embedded in an iframe, e.g. on mmoall.com. In embed mode it renders
only the tool itself (no header/footer) on a transparent background.

```html
<iframe
  id="json-yaml-toml-converter"
  src="https://techshield-tech.github.io/json-yaml-toml-converter/?embed=1&theme=dark"
  style="width: 100%; border: 0;"
  title="JSON / YAML / TOML Converter"
></iframe>

<script>
  const iframe = document.getElementById('json-yaml-toml-converter');

  window.addEventListener('message', (event) => {
    const data = event.data;
    if (data?.slug !== 'json-yaml-toml-converter') return;

    // Resize the iframe to fit its content.
    if (data.type === 'mmoall-tool:height') {
      iframe.style.height = `${data.height}px`;
    }
    if (data.type === 'mmoall-tool:ready') {
      // The tool has mounted and is ready.
    }
  });

  // Change the theme at runtime (only accepted from an allowed origin).
  iframe.contentWindow.postMessage({ type: 'mmoall-tool:theme', theme: 'light' }, '*');
</script>
```

### Contract

| Direction       | Message / parameter                                              | Notes |
| --------------- | ---------------------------------------------------------------- | ----- |
| URL             | `?embed=1`                                                       | Render only the tool, transparent background |
| URL             | `?theme=light` \| `?theme=dark`                                  | Initial theme; otherwise follows `prefers-color-scheme` |
| parent → iframe | `{ type: 'mmoall-tool:theme', theme: 'light' \| 'dark' }`        | Accepted only from `https://mmoall.com`, `https://www.mmoall.com`, `http://localhost:3000` |
| iframe → parent | `{ type: 'mmoall-tool:ready', slug: 'json-yaml-toml-converter' }`          | Posted once on mount (embed mode only) |
| iframe → parent | `{ type: 'mmoall-tool:height', slug: 'json-yaml-toml-converter', height }` | Posted whenever the document height changes (embed mode only) |

## License

MIT — see [LICENSE](./LICENSE).
