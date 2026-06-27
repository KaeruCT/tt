# Game Improvements — Toilet Game

This document is a design roadmap. It mixes implemented systems with ideas that are still proposed. Use `README.md` for player-facing current behavior and `AGENTS.md` for implementation invariants.

## Current State

The game is now a dungeon-office management loop built around employees, desks, bathrooms, and timed planning phases.

### Implemented Core Loop

- New saves start behind a modal **START GAME** title screen. Gameplay does not tick until the player starts.
- **Day shift lasts 40 seconds.** Employees work, earn money, use bathrooms, and crisis events can fire after a short startup grace period.
- **Night shift lasts 20 seconds.** Employees pause while the player digs and builds.
- The office starts as a dynamically generated dungeon room, not a fixed Tiled map.
- The starter layout is an office plus enclosed bathroom separated by a wall and walkable door tile.
- The starter bathroom has urinals against the wall, a corner toilet, and a sink.
- The player can dig rock into floor, place desks, carpet, decor, and bathroom facilities.
- Computer desks are 2-wide workstations. Employees stand in front of their screens.
- Hiring creates/uses only valid desk footprints; it should not spill employees into bathrooms, walls, or furniture.
- Employees have names, ages, hobbies, visual variation, and traits.
- Employees need relief, can have accidents, become sad, and may quit.
- Economy includes income, salaries, rent, maintenance, janitor cost, and compact daily report toasts.
- Crisis events include burrito Tuesday, rats, water breaks, inspector visits, overtime, power outage, dungeon monster, and coffee spill.
- Monster/scare movement is tile/path based so employees do not get pushed out of bounds.
- Employee details use a compact sidebar with FIRE as the only action.
- Save/load persists employees, relief points, droppings, economy, day cycle, events, and the dynamic tilemap.

### Partially Implemented

- **Employee traits:** traits affect behavior/productivity, but relationship systems and deep adjacency bonuses are still future work.
- **Crisis events:** events exist and affect gameplay, but most are timer/state events rather than fully interactive objects.
- **Bathroom ecosystem:** pee, poo, sinks, showers, and smoke breaks exist, but upgrades and specialty rooms are still proposed.
- **Visual juice:** HUD styling, banners, particles, selection rings, and title polish exist, but sound, richer emotion states, smell overlays, and advanced reactions are still proposed.
- **Progression:** milestone toasts exist, but tier unlocks and structured goals are not complete.

## Design Vision

Reframe the game from a one-joke bathroom sim into a **dungeon-crawl office tycoon**: grow a chaotic underground office, plan its layout, react to absurd crises, and keep employees productive enough to survive payroll.

The core rhythm should be:

1. **Plan at night** — dig, build, and fix layout problems.
2. **Watch during the day** — employees work, use facilities, and expose bottlenecks.
3. **React to crises** — events stress the layout and economy.
4. **Upgrade the office** — better rooms, better fixtures, better productivity.

## Proposed Systems

### 1. Deeper Office Expansion

The current dynamic digging/building loop is the right foundation. Future improvements should make layout choices matter more.

Ideas:

- Room labels or room detection for offices, bathrooms, break rooms, and utility rooms.
- Mood penalties for desks too close to bathrooms.
- Positive bonuses for nice rooms, carpet, plants, and decor.
- Door and hallway rules that make traffic planning matter.
- Construction preview that shows the full object footprint before placement.

### 2. Employee Personality and Relationships

Employees already have traits and flavor. The next step is to make them strategic.

Potential traits and effects:

| Trait | Possible effect |
|-------|-----------------|
| Iron Bladder | Relief timers last longer |
| Tiny Bladder | Relief timers are shorter |
| Fast Worker | Generates more funds |
| Slow Worker | Generates fewer funds |
| Neat Freak | Helps clean nearby droppings |
| Slob | Higher accident chance |
| Gossip | Slows adjacent employees |
| Motivator | Speeds adjacent employees |
| Night Owl | Can work during night at a cost |
| Social Butterfly | Wants nearby coworkers |
| Germaphobe | Avoids recently used facilities |
| Coffee Addict | Works faster near coffee, takes more breaks |

Future relationship ideas:

- Shared hobbies create adjacency bonuses.
- Conflicting traits trigger arguments.
- Team composition affects productivity and morale.

### 3. Richer Crisis Events

Current crisis events create tension, but many could become more spatial and interactive.

| Event | Current direction | Future response ideas |
|-------|-------------------|-----------------------|
| Burrito Tuesday | Poo urgency spike | Emergency bathroom planning |
| Dungeon Rats | Work disruption | Pay exterminator, isolate room |
| Water Main Break | Bathroom disruption | Temporary fixture shutdown/flood tiles |
| Inspector Visit | Dropping/fine pressure | Clean before deadline |
| Overtime Crunch | High productivity/high risk | Choose whether to accept crunch |
| Power Outage | Slower movement | Backup generators, lighting upgrades |
| Dungeon Monster | Safe panic movement | Click-to-shoo or build defenses |
| Coffee Spill | Work pause/slip concept | Clean spill tile, route around it |

Future events should test layout preparation without breaking pathfinding or pushing employees out of bounds.

### 4. Progression and Milestones

Current milestone toasts are light feedback. A fuller progression system could give long-term goals.

Possible tiers:

| Tier | Employees | Unlock ideas |
|------|-----------|--------------|
| Startup | 1–4 | Basic facilities, stone floors |
| Small Business | 5–9 | Carpet, decor, break room |
| Corporation | 10–19 | Better bathrooms, plants, more events |
| Enterprise | 20–34 | Automation, second zone/floor |
| Megacorp | 35+ | Prestige systems, advanced transport |

Milestones should grant meaningful rewards, not just toasts.

### 5. Facility Upgrades

The bathroom loop works, but facilities are mostly buy/fix objects. Upgrades could create mid-game spending goals.

| Upgrade | Possible effect |
|---------|-----------------|
| Air Freshener | Reduces bathroom-adjacent mood penalty |
| Premium Stall | More uses before breaking |
| Air Dryer | Faster hand-washing |
| Magical Plumbing | Prevents breakage |
| Privacy Walls | Improves mood near toilets |
| Maintenance Contract | Reduces repair micromanagement |

### 6. Better Visual Feedback

Implemented polish should keep growing toward clearer, funnier state communication.

Potential additions:

- Thought bubbles for urgent needs.
- Mood/emotion states on employees.
- Stink lines and smell overlays for dirty areas.
- Better facility break/fix animations.
- Sound cues for money, toilets, accidents, events, and phase changes.
- Stronger build previews for multi-tile objects.

### 7. Economy Depth

The economy now has salaries, rent, maintenance, janitor cost, and events. Future tuning should make growth feel pressured but fair.

Possible additions:

- Client contracts with timed productivity goals.
- Prestige score from clean rooms and decor.
- Optional supplies such as coffee/snacks.
- Loans or emergency funds.
- Clearer daily report breakdowns and trend history.

## Priority Order

Recommended next steps from the current state:

1. **Placement previews and room rules** — prevent layout mistakes and make building feel intentional.
2. **Progression unlocks** — give the player goals beyond hiring more employees.
3. **Facility upgrades** — add spending choices after basic bathrooms work.
4. **Richer crisis interactions** — make events spatial without breaking movement safety.
5. **Employee relationship/adjacency bonuses** — make desk placement strategically meaningful.
6. **Sound and stronger visual feedback** — make the office feel alive.
7. **Economy tuning** — balance costs once the main systems are stable.

## Non-Negotiable Invariants

Future changes should preserve these rules:

- New games must not tick behind the START GAME screen.
- Day is 40 seconds; night is 20 seconds unless intentionally rebalanced and documented.
- Employees should move by tile/path destinations, not raw random velocities.
- Desks are multi-tile workstations; placement must reserve the full footprint.
- Bathroom fixtures should prefer wall/corner layouts and should not be mixed randomly into office desk space.
- Pathfinding and object footprints must be updated together.
- Save/load must remain backward-compatible where practical.
