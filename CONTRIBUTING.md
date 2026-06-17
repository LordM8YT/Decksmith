# Contributing to OpenDeck

OpenDeck is meant to be a practical, creator-focused Linux Stream Deck app that stays easy to hack on.

Contributions are welcome for:

- core app features
- Linux hardware compatibility
- OBS workflows
- UI polish
- plugin API improvements
- example plugins
- packaging, docs, and testing

## Ground Rules

- Keep changes focused and easy to review.
- Prefer small PRs over giant rewrites.
- Preserve Linux compatibility when changing hardware, filesystem, or packaging behavior.
- If you change visible UI, keep it feeling like a desktop app, not a browser page.
- If you change branding-related assets or official naming, check `TRADEMARKS.md` first.

## Development Setup

Recommended environment:

- Node.js 24+
- npm 11+
- a real Stream Deck if you want hardware validation
- OBS Studio 28+ if you want to test scene switching

Install and run:

```bash
npm install
npm start
```

If native Electron dependencies need to be refreshed manually:

```bash
npm run install:app-deps
```

Basic verification:

```bash
npm run check
```

Linux packaging smoke test:

```bash
npm run dist:linux:dir
```

Fedora-oriented packaging:

```bash
npm run dist:linux:fedora
```

More Linux notes live in `docs/linux-compatibility.md` and `docs/fedora-alpha.md`.

## Project Areas

- `electron/`
  Electron entrypoint and preload bridge.
- `src/main/`
  Runtime services, Stream Deck integration, OBS integration, storage, and plugin loading.
- `src/renderer/`
  Desktop UI, deck grid, assignment flow, and inspector panels.
- `plugins/`
  Built-in and sample plugins.
- `linux/`
  Linux-specific rules and compatibility helpers.
- `build/`
  Packaging assets and Linux post-install scripts.

## Plugin Contributions

Plugins should stay simple and readable.

Each plugin folder should include:

- `manifest.json`
- `index.js`

Keep plugin APIs stable where possible. If you need to change the plugin contract, update:

- built-in plugins
- sample plugins
- relevant docs in `README.md` and `docs/architecture.md`

## Pull Request Checklist

Before opening a PR, try to:

- run `npm run check`
- test the changed flow manually
- mention whether you tested with mock deck, real hardware, OBS, or Linux packaging
- update docs if behavior changed
- keep commit messages and PR descriptions clear about user-visible impact

Useful things to include in a PR description:

- what changed
- why it changed
- how it was tested
- any Linux distro or hardware caveats

## Licensing

By submitting a contribution, you agree that your contribution is licensed under `GPL-3.0-or-later` with the rest of the project.

Please do not submit code you do not have the right to contribute.

## Forks and Branding

Forks are welcome.

If you distribute a modified build, keep it clearly marked as unofficial unless you have permission to use the official project branding. See `TRADEMARKS.md`.
