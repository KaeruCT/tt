# Toilet Game (tt-game)

A dungeon-themed office management simulation built with [Phaser 3](https://phaser.io/phaser3). Hire employees, buy bathroom facilities, and manage the chaos. If they can't find a toilet, they'll quit — or worse.

## Prerequisites

- [Node.js](https://nodejs.org/) ≥22
- [pnpm](https://pnpm.io/) — `corepack enable && corepack prepare pnpm@latest --activate`
- [dupehound](https://github.com/Rafaelpta/dupehound) (Rust binary) — `cargo install dupehound` or download from [releases](https://github.com/Rafaelpta/dupehound/releases)

## Setup

```sh
pnpm install
```

## Development

```sh
pnpm dev
```

Runs Vite dev server on `http://localhost:8080` with HMR and source maps.

## Production Build

```sh
pnpm build
```

Outputs to `dist/`. To preview locally:

```sh
pnpm preview
```

## Deploy to GitHub Pages

Automated via GitHub Actions on push to `master`. See `.github/workflows/deploy.yml`.

Manual deploy:

```sh
pnpm push
```

Builds and pushes the `dist/` folder to the `gh-pages` branch via git subtree.

## Quality Checks

```sh
pnpm check          # Biome lint + format check
pnpm check:write    # Biome auto-fix
pnpm knip           # Dead code detection
pnpm dupe           # Duplicate code detection (requires dupehound)
pnpm dupe:check     # CI gate — fails on new duplicates vs master
pnpm e2e            # Playwright end-to-end tests
pnpm verify         # Full pipeline: check + knip + dupe + build
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
| Pathfinding | [EasyStar.js](https://github.com/prettymuchbryce/easystarjs) (A\*) |
| Maps | [Tiled](https://www.mapeditor.org/) (`.tmx`/`.tsx`) |
| CI/CD | GitHub Actions → GitHub Pages |

## Project Structure

```
.
├── public/              # Static assets served as-is (sprites, tilesets, maps)
│   └── assets/
│       ├── 2d/          # 2D pixel art (characters, items, interface)
│       ├── ClassicRPGTileset/  # Tileset source
│       └── maps/        # Tiled JSON map files
├── src/
│   ├── index.js         # Entry point
│   ├── styles/          # SCSS stylesheets
│   └── game/
│       ├── index.js     # Phaser game config
│       ├── logic/       # Business & relief mechanics
│       ├── scenes/      # Phaser scenes (office, HUD)
│       ├── sprites/     # Game objects (Employee, Dropping, ReliefPoint)
│       ├── ui/          # UI components (Button, Text)
│       └── utils/       # Helpers (align, grid, pathfinding, random)
├── tiled/               # Tiled map editor source files (.tmx, .tsx)
├── vite.config.mjs      # Vite configuration
├── biome.json           # Biome linter + formatter config
├── knip.json            # Knip dead-code config
├── playwright.config.mjs # Playwright E2E config
├── e2e/                 # End-to-end test files
└── .github/workflows/   # CI/CD workflows
```

## How to Play

- **Hire employees** with the **+** button — they work at desks and earn you money.
- Employees need bathroom breaks. Buy **PEE** and **POO** facilities so they have somewhere to go.
- Click an employee to see their stats and fire them if needed.
- Facilities break over time and cost money to fix.
- If an employee can't find a bathroom, they'll go on the floor — too many times and they'll quit.
- Save/load is automatic via localStorage.

## License

BSD 3-Clause — see [LICENSE](./LICENSE).
