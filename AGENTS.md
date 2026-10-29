# Whey of the Slime

## Workflow

Use the existing checkout; each cloud task is already isolated. Do not create a
worktree unless explicitly requested. Read README.md and docs/DESIGN.md before
changing game rules. The current prototype uses JavaScript ES modules, Canvas 2D
and Vite. No backend, external API, telemetry or runtime CDN dependencies.

Run `npm ci` to restore dependencies. Start with `npm run dev`; production build
is `npm run build`. Stop only servers you started. Live processes do not survive
cloud snapshots. The browser tests start their own Vite server.

Validate meaningful changes with `npm test`, `npm run build`, and
`npm run test:browser` for UI/input/persistence changes. Chromium is available at
`/usr/bin/chromium` in the managed environment; override with `CHROMIUM_PATH`
elsewhere. Run `npm run format:check` before committing.

## Safety and persistence

Follow SECURITY.md. Never commit real exports, secrets, personal data, .env files
or credentials. Keep TLS and package verification enabled. Activate the hook with
`git config --local core.hooksPath .githooks` in a fresh clone.

Jelly purchases and preset loads must preserve exact refunds and avoid partial
updates. Keep player and equipment presets separate, and both hands together in
equipment presets. New save formats need validation and migration; do not silently
discard old progress. Rendering must retain the same arena ratio across devices.

## Git

Use a feature branch, never main for this work. The user requested readable
incremental commits and a push after every commit. Do not deploy, merge into main,
or add paid services without authorization. Preserve private-email protection;
use the repository-local noreply author identity when needed.
