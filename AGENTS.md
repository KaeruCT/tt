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
- Sprites use Phaser 3 arcade physics with no gravity.
- Scenes: `OfficeScene` (main world) and `HudScene` (UI overlay). Both are active at the same time.
- Rex Pinch Plugin is loaded from `public/assets/rexpinchplugin.min.js` for mobile pinch-to-zoom on the camera.

### Build System (Vite 6)

- Entry: `index.html` → `<script type="module" src="/src/index.js">`.
- `public/` is served as-is for game assets, maps, and plugins.
- SCSS is processed by dart-sass with the modern compiler API, then PostCSS with Autoprefixer.
- `base: './'` keeps built assets GitHub Pages-compatible.
- No Babel — Vite uses esbuild for JS transforms.
- Source maps are enabled in production.

### Dynamic Tilemap and Starter Layout

- The live office map is generated dynamically in code. Tiled JSON maps remain assets/reference material, not the current source of the starting room.
- Map size is `30 × 20`, tile size is `TILE_SIZE = 16`.
- Logical cells store a tile type (`rock`, `stone_floor`, `carpet_floor`, `wall`) plus one optional object marker.
- The starter layout is an `11 × 5` carved footprint split into an office and an enclosed bathroom.
- A partition wall separates the bathroom from the office, with a walkable decorative door tile in the middle.
- Current starter counts: `51` floor tiles, `4` partition wall tiles, `545` rock tiles.
- Tile visuals are context-selected/autotiled. Do not replace this with one repeated wall/floor tile; the 0x72 tileset is composed from neighboring pieces.
- Interior rock intentionally renders dark/empty so the room reads cleanly against the background.

### Desk and Build Placement

- Desks are 2-wide computer workstations built from tiles `10`, `11`, `40`, and `41` in the 0x72 dungeon tileset.
- The logical desk anchor is the walkable employee standing tile in front of the screen.
- The desk body cells are reserved as `desk_part`; the anchor cell is `desk`.
- Auto-hiring creates a new desk only when the full workstation footprint fits. It should not spill desks into walls, bathrooms, fixtures, or occupied furniture.
- Manual desk building should use the same footprint checks as auto-placement.
- If desk placement changes, update pathfinding and save/load expectations at the same time.

### Pathfinding and Movement Safety

- Uses EasyStar.js (A*) with a grid generated from dynamic tile types and blocking object markers.
- Walkable floor is not always pathable: desk body parts and decor block paths.
- Employee movement should use tile/path destinations. Do **not** scatter employees with raw random physics velocity; that can push them into rock/out of bounds.
- Monster/scare behavior must stay tile-based and recover employees back to a walkable tile/desk.
- Physics colliders with the world layer are intentionally avoided because pathfinding is the source of truth for movement.

### Business / Game State

- State is split across systems:
  - `Business` stores employees, relief points, droppings, and coordinates save/load.
  - `EconomyManager` owns funds, revenue/expenses, salary, rent, facility costs, janitor cost, and daily reports.
  - `DayCycle` owns phase timing.
  - `EventManager` owns crisis events.
  - `TilemapManager` owns the dynamic grid and tile/object serialization.
- Saves persist to `localStorage` under `business`.
- Day/night state and in-flight events should survive reloads.
- Adding new saved fields should be backward-compatible with old saves.

### Day / Night Cycle

- Day lasts `40s`; night lasts `20s`.
- Day is live operations: employees work, earn money, use facilities, and events can fire.
- Night is build/planning mode: employees pause, the build rail appears, and the player can dig/place objects.
- Salaries, maintenance, rent, and janitor costs are processed when day changes to night.
- The HUD timer shows seconds left in the current phase.

### Title Gate and HUD

- New saves must start behind the modal START GAME screen.
- `OfficeScene` is hard-gated by `introAcknowledged`; gameplay ticks, income, timers, and milestone toasts must not start until the player presses START GAME.
- Saved games skip the title gate and resume directly.
- HUD top bar shows funds, phase, seconds left, active events, and employee count.
- Header labels must stay compact; avoid large text that overlaps the timer or employee count.
- Buttons should change color on hover/press but should not resize.
- Employee details use a compact sidebar. The only action there is FIRE; other lines are flavor/status.

### Relief / Bathroom Mechanic

- Relief definitions live in `RELIEF_TYPES` and currently include pee, poo, wash hands, shower, and smoke break.
- Employees may wash hands after pee/poo if a sink is available.
- Starter bathroom fixtures should look like a real small bathroom: urinals against a wall in a row, toilet in a corner, sink nearby.
- Future toilet placement should prefer corners where possible; urinals should prefer wall rows.
- Relief points are dynamic build objects, not static Tiled object-layer placements.
- Facilities can break after use and cost money to fix.
- If employees cannot find a usable facility in time, they relieve on the floor; sadness can cause quitting.

### Employee System

- Employees have random names, ages, hobbies, skin/hair/clothes tints, and traits.
- Decorations (hair/clothes) are separate Phaser sprites that follow the employee and mirror animations.
- Firing/quitting removes the employee from business state; quitting increases future hiring/salary pressure.
- Employee desk assignment should always point to the standing tile in front of a valid workstation.

## Conventions

- **Pixel art**: `pixelArt: true` in Phaser config. Never use sub-pixel rendering or smooth scaling.
- **Tile size**: `TILE_SIZE = 16`. All grid positioning snaps to this size.
- **UUIDs**: Custom `generateUUID()` in `src/game/utils/misc.js` — not a standard UUID v4. Do not swap for a library.
- **Colors**: Defined as `0x` hex integers for Phaser graphics and CSS strings for text fill styles.
- **Animations**: Frame-based spritesheets. Animation keys follow `{entity}-{direction}` such as `employee-down`.
- **Linting**: Zero-tolerance. `pnpm check` must pass before committing. Run `pnpm check:write` to auto-fix.
- **Before committing**: if dupehound is installed, run `dupehound check .`; reuse existing functions if it reports a duplicate you introduced.

## Adding Features

- **New sprites**: Prefer small Phaser game objects that match existing groups/depth conventions.
- **New UI elements**: Use the custom `Button` and `Text` classes in `src/game/ui/` and keep them compact for the 426×240 internal canvas.
- **New build objects**: Add footprint/placement rules to `TilemapManager`, update pathfinding if the object blocks movement, and update save/load behavior.
- **New relief types**: Add to `RELIEF_TYPES`, update facility costs/maintenance, update build controls, and add tests for behavior and save/load.
- **New maps/layout changes**: Update dynamic generation and autotile rules. Do not assume static Tiled layers drive the current office.
- **New crisis events**: Define in `EventManager`; if the event affects movement, use path/tile-safe behavior and recovery guards.

## Build & Deploy

| Command | What it does |
|---------|-------------|
| `pnpm dev` | Dev server on `:8080` with HMR |
| `pnpm build` | Production build → `dist/` |
| `pnpm preview` | Serve `dist/` locally |
| `pnpm push` | Manual build + deploy `dist/` to `gh-pages` via git subtree |

CI/CD: `.github/workflows/deploy.yml` builds on push to `master` and force-pushes `dist/` to the `gh-pages` branch.

## Testing (Playwright E2E)

Tests live in `e2e/` and interact with the game through `page.evaluate()` because all UI is canvas-based.

The game exposes:
- `window.__game` — Phaser.Game instance
- `window.__officeScene` — main office scene

Helpers in `e2e/helpers.js` wrap common operations.

### Running

```sh
pnpm e2e              # Run all tests (starts dev server automatically)
pnpm e2e -- --headed  # Run with visible browser
```

### Writing tests

```js
import { clearSave, getBusiness, waitForGame } from './helpers.js';

test('example', async ({ page }) => {
  await clearSave(page);
  await waitForGame(page);
  const biz = await getBusiness(page);
  expect(biz.funds).toBe(300);
});
```

Key patterns:
- Start clean-state tests with `clearSave(page)` + `waitForGame(page)`.
- Account for the START GAME title gate in browser tests for fresh saves.
- Use `page.evaluate()` for direct game interaction via exposed scene globals.
- Game objects can be accessed through scene groups (`employees`, `reliefPoints`, `desks`, `droppings`).
- Day duration is 40s; night duration is 20s. Use `dayCycle.skipPhase()` when tests do not need real-time waiting.
- Starter layout tests should expect 51 floor tiles and 545 rock tiles unless the generated starter footprint changes.
- Reload tests should verify economy, day cycle, active events, tilemap, employees, and relief points as needed.

## Known Quirks

- Build warnings from Phaser's `SceneFile.js` using `eval` are harmless for this project.
- Relief/accident timing still uses some wall-clock callbacks; be careful around night pauses if changing that flow.
- Employee info refreshes periodically in the sidebar rather than through a full event-driven UI model.
- Save migration is lightweight; when adding new saved shape, provide safe defaults for older saves.
