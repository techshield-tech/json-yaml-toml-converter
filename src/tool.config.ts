// Per-tool metadata. This is the ONE file (together with `src/tool/`,
// `index.html`'s fallback <title>, and this repo's README) that changes
// when this template is copied to a new tool repo.

// Imports from '@mmoall/tool-kit/config' (a plain-JS-backed subpath), not
// the main '@mmoall/tool-kit' barrel — this file is also reachable from
// vite.config.ts's config-load chain, which cannot load the main barrel's
// .ts source from inside node_modules. See '@mmoall/tool-kit/config's
// source comment for why.
import { defineToolConfig } from '@mmoall/tool-kit/config';

export const toolConfig = defineToolConfig({
  slug: 'json-yaml-toml-converter',
  name: 'JSON / YAML / TOML Converter',
  description:
    'Convert between JSON, YAML, and TOML in any direction with line-accurate errors — fast, free, and 100% client-side.',
  category: 'Converter',
  keywords: [
    'json to yaml',
    'yaml to json',
    'json to toml',
    'toml to json',
    'yaml to toml',
    'toml to yaml',
    'config file converter',
    'online yaml converter',
  ],
});
