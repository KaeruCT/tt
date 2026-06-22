# Game Improvements — Toilet Game

## Current Loop Analysis

The game is a passive office-management sim built around a single joke: employees need bathroom breaks and will go on the floor if they can't find one.

### What exists

- Employees work at desks generating funds ($1/s per employee)
- Random bathroom needs trigger (pee every 20–40s, poo every 40–60s)
- Player buys pee/poo relief points and hires employees
- Facility breakage mechanic (after N uses, point breaks; costs money to fix)
- Droppings on the floor (when relief timer expires)
- Sadness → quitting (3 floor incidents = employee leaves)
- Day cycle (60s days, salaries paid at end of each day)
- localStorage persistence

### What's missing

**No rising tension.** Once you have enough facilities for your employee count, nothing happens. The game plateaus into an idle sim where you occasionally buy another toilet.

**No meaningful choices.** Every decision is obvious: buy cheapest facility when bathroom is full, hire when you have spare desk. There's no tradeoff space.

**No variety.** Every employee is mechanically identical. Every day is mechanically identical. The only thing that changes is a counter going up.

**No ending.** The game goes forever. No win state, no loss state (beyond going broke, which is hard to do accidentally).

**No spatial strategy.** Desks and relief points are fixed map slots. There's no reason to care about office layout. Pathfinding is pure overhead with no gameplay payoff.

---

## Vision

Reframe the game from "office bathroom simulator" to **"dungeon-crawl office tycoon."** The core joke stays (employees need bathrooms), but it becomes a game about growing a chaotic dungeon office while managing increasingly absurd crises. Think *RimWorld* meets *Theme Hospital* set in a fantasy dungeon.

---

## Proposed Systems

### 1. Office Expansion & Layout

**Problem:** Fixed map with fixed slots. No sense of ownership or growth.

**Solution:** Tile-based room construction.

- Start with a small 3×3 starting room and $200
- Player digs new rooms into the dungeon rock (costs money, takes time)
- Place desks, relief points, and decorations anywhere within dug-out space
- Different floor types: carpet (morale bonus, cost), stone (free, no bonus)
- Wall decorations, plants, coffee machines — all affect employee stats
- Room adjacency matters: employees get a mood penalty if their desk is next to a bathroom

**Why it works:** Turns the map from a static backdrop into a core gameplay loop. Every tile placement is a decision. "Do I dig east for another bathroom, or north for more desks?" Spatial planning becomes the heart of the game.

### 2. Employee Personality & Traits

**Problem:** All employees are interchangeable. Firing one and hiring another changes nothing.

**Solution:** Procedural trait system.

Each employee rolls 2–3 traits that affect behavior:

| Trait | Effect |
|-------|--------|
| **Iron Bladder** | Relief timers are 50% longer |
| **Tiny Bladder** | Relief timers are 50% shorter |
| **Fast Worker** | Generates 2× funds while working |
| **Slow Worker** | Generates 0.5× funds |
| **Neat Freak** | Cleans nearby droppings automatically (slowly) |
| **Slob** | Higher chance of missing the toilet |
| **Gossip** | Slows down adjacent employees by 20% |
| **Motivator** | Speeds up adjacent employees by 20% |
| **Night Owl** | Works during "night" cycle without penalty |
| **Social Butterfly** | Needs a desk near other employees or gets sad |
| **Germaphobe** | Refuses to use a relief point used by someone else recently |
| **Coffee Addict** | Works faster but needs coffee machine nearby |

Employees also have **relationships** with each other. Two employees with aligned hobbies get a work speed buff when seated near each other. Conflicting traits cause arguments (both stop working briefly).

**Why it works:** Hiring becomes a strategic choice, not a button press. Desk placement matters because of adjacency bonuses/penalties. Employee management becomes interesting — do you keep the fast worker who also gossips and slows everyone down?

### 3. Crisis Events

**Problem:** Nothing unexpected ever happens.

**Solution:** Random events that disrupt the office.

| Event | Description | Player Response |
|-------|-------------|-----------------|
| **Burrito Tuesday** | All employees get stomach cramps. Poo urgency spikes 3× for 30s. | Hope you have enough toilets |
| **Dungeon Rats** | Rats infest a room. Employees refuse to work there until cleared. | Pay exterminator or wait |
| **Water Main Break** | One bathroom floods. Adjacent tiles become unusable for 60s. | Temporary crisis |
| **Inspector Visit** | Health inspector arrives. Too many floor droppings = fine. | Clean up before they arrive |
| **Overtime Crunch** | A big project deadline. Employees work 2× speed but relief timers also accelerate. | High risk, high reward |
| **Power Outage** | Lights go out. Employees move slower (can't see). Lasts 30s. | Wait it out |
| **Dungeon Monster** | A slime wanders through the office. Scares employees, they scatter. | Click to shoo it away |
| **Coffee Spill** | Spilled coffee on a tile. Employees slip (pause briefly) when walking over it. | Fades over time |

Events scale in frequency and intensity as the office grows. A 2-employee office gets rats. A 20-employee office gets monster invasions and plumbing disasters simultaneously.

**Why it works:** Creates tension spikes. The game oscillates between calm building phases and frantic crisis management. Events make player preparation (having spare toilets, keeping floors clean, maintaining buffer funds) actually matter.

### 4. Progression & Milestones

**Problem:** No goal. No reason to keep playing past 5 minutes.

**Solution:** Tiered progression with unlocks.

**Office Tiers:**

| Tier | Employees | Unlocks |
|------|-----------|---------|
| Startup | 1–4 | Basic pee/poo points, stone floors |
| Small Business | 5–9 | Break room (employee morale), carpet floors |
| Corporation | 10–19 | Executive bathroom (luxury, no breakage), plants |
| Enterprise | 20–34 | Second floor (multi-level office), automated cleaning bots |
| Megacorp | 35+ | Teleporters (instant relief point travel), dungeon view prestige |

Each tier unlocks new mechanics, room types, and crisis events. The player always has a concrete next goal: "get to 5 employees to unlock the break room."

**Milestone rewards:** Reaching each tier gives a one-time bonus (extra funds, free employee, free facility).

**Why it works:** Gives direction. The player always knows what they're working toward. Unlocks create anticipation — "I wonder what the executive bathroom does."

### 5. Day/Night Cycle with Shift Management

**Problem:** Day cycle is purely mechanical (pay salaries). No gameplay impact.

**Solution:** Two-shift system.

- **Day shift (40s):** Normal operations. Employees work, use bathrooms, events happen.
- **Night shift (20s):** Employees go home. Player enters "planning mode."
  - Can build/dig/place furniture without employees walking around
  - Janitor comes through and cleans floor droppings
  - Facilities auto-repair (slowly)
  - Employee hiring/firing happens between shifts
  - Review stats: productivity, incidents, profit margins

A **Night Owl** trait lets an employee work the night shift for extra productivity (and extra bathroom usage during planning mode, adding tension).

**Why it works:** Separates building from reacting. Day shift is for crisis management; night shift is for strategic planning. The rhythm creates a satisfying loop: plan → watch it play out → react to crises → plan again.

### 6. Multiple Relief Types & Facility Upgrades

**Problem:** Only two relief types (pee/poo). Facilities are binary: working or broken.

**Solution:** Expand the bathroom ecosystem.

**New relief types:**
| Relief | Duration | Frequency | Facility Cost | Notes |
|--------|----------|-----------|---------------|-------|
| Pee | 1–5s | 20–40s | $100 | Basic |
| Poo | 5–10s | 40–60s | $200 | Basic |
| Wash Hands | 2–3s | After any relief | $50 (sink) | Not doing it = hygiene penalty |
| Shower | 10–15s | After gym (see below) | $300 | Only needed if gym exists |
| Smoke Break | 15–20s | 60–90s | $0 (goes outside) | Reduces stress but wastes time |

**Facility upgrades:**
| Upgrade | Cost | Effect |
|---------|------|--------|
| Air Freshener | $30 | Reduces adjacent-desk mood penalty |
| Premium Stall | $150 | 50% more uses before breaking |
| Air Dryer | $80 | Hand-washing time reduced by 50% |
| Magical Plumbing | $500 | Never breaks |

**Why it works:** More types = more tradeoffs. A shower is expensive and takes time but enables a gym that boosts morale. Smoke breaks are free but waste productive time. Upgrades create mid-game spending goals beyond just buying more of the same thing.

### 7. Visual Feedback & Juice

**Problem:** The only feedback is the HUD counter. Employees are tiny 16×16 sprites with limited expressiveness.

**Solution:** Add emotional state visualization and environmental feedback.

- **Employee facial expressions:** Happy (working, needs met), worried (need to go), desperate (timer expiring), relieved (just finished), sad (floor incident)
- **Thought bubbles:** Show what they need (toilet icon, coffee icon)
- **Speed lines:** Employees move faster when desperate
- **Screen shake:** When someone goes on the floor nearby
- **Particle effects:** Cleaning spray, plumbing leaks, stink lines from droppings
- **Color-coded mood rings** on employee info panel
- **Office "smell" meter:** Too many droppings → green haze overlay on affected tiles
- **Sound cues:** Door slam, toilet flush, employee groan, ka-ching on salary day

**Why it works:** Makes the office feel alive. Players react to what they see, not just what they read in the HUD. A desperate employee sprinting toward a bathroom with a thought bubble is inherently funny and creates micro-narratives.

### 8. Economy Rework

**Problem:** Money only goes up. Salaries are negligible. Buying facilities is a one-time cost with no ongoing drain.

**Solution:** Add operating costs and revenue variability.

**Ongoing costs:**
- Facility maintenance: $2/day per relief point (covers cleaning, supplies)
- Rent: scales with dug-out square footage
- Janitor service: auto-cleans droppings overnight (optional, costs $5/day)
- Break room supplies: coffee, snacks (optional, boosts morale)

**Revenue variability:**
- Employee productivity varies by mood, traits, and desk quality
- "Client meetings" — random bonus events that pay $50–200 but require an employee to be at their desk for 10s straight
- Office prestige score affects passive income multiplier

**Goal:** Make the economy a balancing act. Growth costs money. The player should feel the pressure of payroll, not just watch a number go up.

---

## Priority Order

If implementing incrementally, this is the recommended sequence:

1. **Employee traits** — smallest change, biggest impact. Instantly makes hiring/sitting decisions matter.
2. **Crisis events** — adds tension with minimal new assets. Most events are just timer/state changes.
3. **Day/night cycle with planning mode** — creates rhythm. Planning mode is the natural place for building.
4. **Office expansion (dig/build/place)** — the big one. Transforms the game from a sim into a tycoon. Requires the most new systems (tilemaps, placement UI, build queue).
5. **Visual feedback & juice** — makes all the above systems feel good.
6. **Progression tiers** — gives structure to the above.
7. **Economy rework** — fine-tunes the numbers once all systems are in.
8. **Facility upgrades** — more content for the building phase.
