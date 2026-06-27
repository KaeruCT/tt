# Toilet Game (tt-game)

A dungeon-themed office management game built with [Phaser 3](https://phaser.io/phaser3). Hire employees, dig out a dungeon office, build computer desks and bathrooms, and keep the staff productive before they make a mess or quit.

## Prerequisites

- [Node.js](https://nodejs.org/) ≥22
- [pnpm](https://pnpm.io/) — `corepack enable && corepack prepare pnpm@latest --activate`
- [dupehound](https://github.com/Rafaelpta/dupehound) (optional Rust binary) — `cargo install dupehound` or download from releases

## Setup

```sh
pnpm install
```

## Development

```sh
pnpm dev
```

Runs the Vite dev server on `http://localhost:8080` with HMR and source maps.

## Production Build

```sh
pnpm build
```

Outputs to `dist/`. To preview locally:

```sh
pnpm preview
```

## Deploy to GitHub Pages

Automated via GitHub Actions on push to `master`. The workflow builds `dist/` and publishes it to the `gh-pages` branch.

Manual deploy is still available:

```sh
pnpm push
```

## Quality Checks

```sh
pnpm check          # Biome lint + format check
pnpm check:write    # Biome auto-fix
pnpm knip           # Dead code detection
pnpm dupe           # Duplicate code detection (requires dupehound)
pnpm dupe:check     # CI gate — fails on new duplicates vs master
pnpm e2e            # Playwright end-to-end tests
pnpm verify         # check + knip + dupe + build
```

For a full pre-commit pass, run:

```sh
pnpm check && pnpm knip && pnpm e2e && pnpm build
```

## Tech Stack

| Category | Tool |
|----------|------|
| Game engine | [Phaser 3](https://phaser.io/) (v3.16.2) |
| Bundler | [Vite 6](https://vitejs.dev/) |
| Package manager | [pnpm](https://pnpm.io/) |
| CSS | SCSS (dart-sass) + PostCSS (Autoprefixer) |
| Lint & format | [Biome 2](https://biomejs.dev/) |
| Dead code | [Knip](https://knip.dev/) |
| Duplicate detection | [dupehound](https://github.com/Rafaelpta/dupehound) |
| Testing | [Playwright](https://playwright.dev/) |
| Pathfinding | [EasyStar.js](https://github.com/prettymuchbryce/easystarjs) |
| CI/CD | GitHub Actions → GitHub Pages |

## Current Gameplay

New games start on a modal title screen. Nothing in the office ticks until the player presses **START GAME**.

The game alternates between two phases:

- **Day — 40 seconds:** employees work, earn money, use bathrooms, and random crisis events can happen after a short startup grace period. Hiring is available during the day.
- **Night — 20 seconds:** employees pause and the build rail appears. Use night to dig rooms, place desks, add bathroom fixtures, add decor, and skip to the next day when ready.

The top HUD shows funds, current phase, seconds left in the phase, active events, and employee count. A thin progress bar under the HUD also shows phase progress. End-of-day profit appears as a small toast instead of a blocking report panel.

## Building and Layout

The office is generated dynamically from a rock-filled dungeon grid. The starter layout is an office connected to an enclosed bathroom by a walkable decorative door tile. The bathroom starts with urinals against the wall, a corner toilet, and a sink.

Build modes include:

- **Dig** — turn rock into usable floor.
- **Desk** — place a 2-wide computer workstation. Employees stand on the walkable tile in front of the screen.
- **Carpet** — decorate open floor.
- **Decor** — place decorative objects.
- **Pee / Poo / Sink / Shower** — add bathroom facilities.

Desk placement reserves the whole workstation footprint so new hires do not get placed into walls, bathrooms, or other furniture.

## Employees and Bathrooms

Employees work at computer desks and generate funds. They occasionally need bathroom breaks. If they cannot reach a usable facility in time, they relieve themselves on the floor and become sad. Too many incidents can make an employee quit.

Click an employee to open a compact sidebar with status and flavor info. The only employee action there is **FIRE**.

## Project Structure

```
.
├── public/              # Static assets served as-is
│   └── assets/
│       ├── 2d/          # Pixel art sprites, tilesets, relief sprites, interface art
│       └── maps/        # Tiled JSON maps kept as assets/reference material
├── src/
│   ├── index.js         # Browser entry point
│   ├── styles/          # SCSS stylesheets
│   └── game/
│       ├── index.js     # Phaser game config
│       ├── logic/       # Business state and relief mechanics
│       ├── scenes/      # Office world and HUD scenes
│       ├── sprites/     # Employee, desk, relief point, decor, dropping sprites
│       ├── systems/     # Tilemap, economy, day cycle, events
│       ├── ui/          # Button/Text UI wrappers and palette
│       └── utils/       # Helpers for ids, random values, traits, etc.
├── tiled/               # Tiled source files
├── e2e/                 # Playwright tests
└── .github/workflows/   # CI/CD workflows
```

The current playfield is generated in code. Tiled assets still exist and are useful reference material, but the live office is not a fixed static Tiled map.

## Testing

Tests use Playwright and interact with the canvas game through exposed globals like `window.__game` and `window.__officeScene`.

```sh
pnpm e2e
```

Save/load is automatic through `localStorage` under the `business` key.

## License

BSD 3-Clause — see [LICENSE](./LICENSE).
