# AGENTS.md — Toilet Game

## Project Overview

Phaser 3 dungeon-themed office management game. Single-page web game bundled with Vite 6, no server runtime. State persists via `localStorage` under the `"business"` key.

## Tooling

| Tool | Purpose | Command |
|------|---------|---------|
| pnpm | Package manager | `pnpm install --frozen-lockfile` |
| Vite 6 | Bundler + dev server | `pnpm dev` (port 8080), `pnpm build` |
| Biome 2 | Linter + formatter | `pnpm check`, `pnpm check:write` |
| Knip | Dead code detection | `pnpm knip` |
| dupehound | Duplicate code detection (Rust binary) | `pnpm dupe`, `pnpm dupe:check` |
| Playwright | E2E testing | `pnpm e2e` |

**Pre-commit verification:**
```sh
pnpm check && pnpm knip && pnpm e2e && pnpm build
```

If dupehound is installed:
```sh
pnpm verify
```

## Key Architectural Decisions

### Game Engine: Phaser 3 (v3.16.2)

- **Do not upgrade Phaser** — the API surface changed significantly in later versions. Version is pinned exactly to `3.16.2`.
- Sprites use the Phaser 3 arcade physics system (no gravity).
- Scenes: `OfficeScene` (main world) and `HudScene` (UI overlay). Both are active simultaneously.
- Tilemap system: Tiled JSON maps with static layers (`Below`, `World`, `Above`). Layer `World` carries collision data.
- Rex Pinch Plugin is loaded from `public/assets/rexpinchplugin.min.js` for mobile pinch-to-zoom on the camera.

### Build System (Vite 6)

- Entry: `index.html` → `<script type="module" src="/src/index.js">`.
- `public/` directory is served as-is (game assets, maps, plugins).
- SCSS is processed by dart-sass with the modern compiler API, then PostCSS with Autoprefixer.
- `base: './'` for relative asset paths (GitHub Pages compatible).
- No Babel — Vite uses esbuild for JS transforms.
- Source maps enabled in production.

### Pathfinding

- Uses **EasyStar.js** (A\* pathfinding) with a grid derived from the Tiled `World` layer.
- Grid is recalculated every 100 game ticks per employee (expensive — be careful with employee count).
- Occupied cells are treated as blocked to prevent overlapping employees.

### Business / Game State

- `Business` class in `src/game/logic/business.js` is the single source of truth for money, employees, facilities, and time.
- Serialized to `localStorage` every frame via `passTime()`.
- `load(data)` is a naive key-copy — it assumes the stored shape matches the current constructor shape. **Adding new properties to the Business constructor may break saves** unless you handle migration.
- Day cycle: `dayLength` seconds → pay salaries → reset timer.
- Costs (salary, hire, facilities, cleaning) are hardcoded in the constructor.

### Relief (Bathroom) Mechanic

- Two types: `pee` and `poo`, defined in `src/game/logic/relief.js`.
- Each has cooldowns, attempt cooldowns, time limits, supported facility types, and breakage thresholds.
- Employees check for available relief points every 100 ticks (10% chance when no relief timer is active).
- Relief points are placed via Tiled object layers filtered by `type` property.

### Employee System

- Employees have randomly assigned names, ages, hobbies, skin/hair/clothes tints.
- Decorations (hair, clothes) are separate Phaser sprites that follow the employee and mirror animations.
- Sadness mechanic: if an employee fails to find a bathroom and relieves on the floor, sadness increases. At sadness ≥ 3, they quit.
- Firing/quitting increases future hire costs and salaries (penalty for turnover).

## Conventions

- **Pixel art**: `pixelArt: true` in Phaser config. Never use sub-pixel rendering or smooth scaling.
- **Tile size**: `TILE_DIMENSION = 16`. All positioning snaps to this grid.
- **UUIDs**: Custom `generateUUID()` in `src/game/utils/misc.js` — not a standard UUID v4. Do not swap for a library.
- **Colors**: Defined as 0x hex integers, not CSS strings.
- **Animations**: Frame-based spritesheets. Animation keys follow pattern `{entity}-{direction}` (e.g., `employee-down`).
- **Linting**: Zero-tolerance. `pnpm check` must pass before committing. Run `pnpm check:write` to auto-fix.
- **Before committing**: if dupehound is installed, run `dupehound check .` — if it reports a function you wrote duplicates existing code, delete your version and reuse the original.

## Adding Features

- **New sprites**: Extend `Phaser.GameObjects.Sprite`, enable physics, add to the appropriate group.
- **New UI elements**: Use the custom `Button` and `Text` classes in `src/game/ui/`. They handle styling consistently.
- **New relief types**: Add to `RELIEF_TYPES` in `relief.js`, update Tiled maps with matching object types, update HUD buttons.
- **New maps**: Create in Tiled, export to `public/assets/maps/`, add tilemap data to preload in `OfficeScene.preload()`.

## Build & Deploy

| Command | What it does |
|---------|-------------|
| `pnpm dev` | Dev server on `:8080` with HMR |
| `pnpm build` | Production build → `dist/` |
| `pnpm preview` | Serve `dist/` locally |
| `pnpm push` | Build + deploy `dist/` to `gh-pages` via git subtree |

CI/CD: `.github/workflows/deploy.yml` deploys on push to `master` via GitHub Pages Actions.

## Testing (Playwright E2E)

Tests live in `e2e/` and interact with the game through `page.evaluate()` since all UI is Canvas-based.

The game exposes `window.__game` (the Phaser.Game instance) for test access.
Helpers in `e2e/helpers.js` wrap common operations.

### Running

```sh
pnpm e2e              # Run all tests (starts dev server automatically)
pnpm e2e -- --headed  # Run with visible browser
```

### Writing tests

```js
import { waitForGame, getBusiness, hireEmployee } from './helpers.js';

test('example', async ({ page }) => {
  await clearSave(page);
  await waitForGame(page);
  const biz = await getBusiness(page);
  expect(biz.funds).toBe(200);
});
```

Key patterns:
- Always start tests with `clearSave(page)` + `waitForGame(page)` for a clean state.
- Use `page.evaluate()` for direct game interaction via `window.__game`.
- Game objects (Employee, ReliefPoint) can be accessed through scene groups.
- `advanceTime(page, seconds)` simulates time passing (one day per call, 61s to trigger).
- `reloadAndGetBusiness(page)` reloads and checks localStorage persistence.

### Known test limitations

- `passTime()` uses `if` not `while` — only advances one day per call.
- `Employee.fire()` passes type `'fire'` but `employeeRemoval` checks for `'fired'` — hire cost increase doesn't trigger on fire.
- Phaser's `SceneFile.js` uses `eval` (triggers a Vite build warning, harmless).

## Known Quirks

- Physics collider between employees and the world layer is commented out — it breaks pathfinding. Rely on the grid-based pathfinding for collision avoidance.
- `speed` increases each time an employee gives up on a bathroom attempt (they get desperate and walk faster).
- The HUD employee info updates via a 300ms `setTimeout` hack — refactoring to event-driven would be cleaner but low priority.
- `src/game/utils/path.js` wraps EasyStar.js. `createGrid` rebuilds the entire 2D array — avoid adding this to the update loop.
