import { randBool } from '../utils/rand';

// --- Event Definitions ---

export const EVENTS = {
  BURRITO_TUESDAY: {
    id: 'burrito_tuesday',
    name: 'Burrito Tuesday',
    desc: 'Stomach cramps for everyone! Poo urgency triples.',
    duration: 30,
    icon: '🌯',
    minOfficeSize: 2,
    weight: 10,
    effect: {
      pooUrgencyMultiplier: 3.0,
    },
  },
  DUNGEON_RATS: {
    id: 'dungeon_rats',
    name: 'Dungeon Rats',
    desc: 'Rats infest a room. Work stops until cleared.',
    duration: 20,
    icon: '🐀',
    minOfficeSize: 1,
    weight: 8,
    effect: {
      workStopped: true,
    },
    onStart: 'spawnRats',
    onEnd: 'clearRats',
  },
  WATER_MAIN_BREAK: {
    id: 'water_main_break',
    name: 'Water Main Break',
    desc: 'A bathroom floods. Adjacent tiles unusable.',
    duration: 60,
    icon: '💧',
    minOfficeSize: 3,
    weight: 6,
    onStart: 'onWaterMainBreak',
    onEnd: 'onWaterMainBreakEnd',
    effect: {
      floodReliefPoints: 2,
    },
  },
  INSPECTOR_VISIT: {
    id: 'inspector_visit',
    name: 'Health Inspector',
    desc: 'Inspector arriving! Clean up droppings or pay a fine.',
    duration: 15,
    icon: '🔍',
    minOfficeSize: 2,
    weight: 5,
    effect: {
      impendingInspection: true,
    },
    onEnd: 'inspectOffice',
  },
  OVERTIME_CRUNCH: {
    id: 'overtime_crunch',
    name: 'Overtime Crunch',
    desc: 'Big deadline! 2× work speed but relief timers accelerate.',
    duration: 25,
    icon: '⏰',
    minOfficeSize: 2,
    weight: 7,
    effect: {
      workSpeedMultiplier: 2.0,
      reliefUrgencyMultiplier: 2.0,
    },
  },
  POWER_OUTAGE: {
    id: 'power_outage',
    name: 'Power Outage',
    desc: 'Lights out! Employees move slower.',
    duration: 30,
    icon: '🔌',
    minOfficeSize: 1,
    weight: 6,
    effect: {
      speedMultiplier: 0.4,
    },
  },
  DUNGEON_MONSTER: {
    id: 'dungeon_monster',
    name: 'Dungeon Monster',
    desc: 'A slime wanders through! Click to shoo it away.',
    duration: 25,
    icon: '👾',
    minOfficeSize: 5,
    weight: 4,
    effect: {
      scareEmployees: true,
    },
  },
  COFFEE_SPILL: {
    id: 'coffee_spill',
    name: 'Coffee Spill',
    desc: 'Employee slips on coffee. Brief work pause.',
    duration: 10,
    icon: '☕',
    minOfficeSize: 1,
    weight: 9,
    effect: {
      slipChance: 0.3,
    },
  },
};

const ALL_EVENTS = Object.values(EVENTS);
const INITIAL_EVENT_COOLDOWN = 10;

export default class EventManager {
  constructor(scene) {
    this.scene = scene;
    this.activeEvents = [];
    this.eventCooldown = INITIAL_EVENT_COOLDOWN;
    this.cooldownDuration = 30; // seconds between possible events
  }

  /**
   * Update event timers and check for new events.
   * @param {number} delta - Milliseconds since last frame
   * @param {number} employeeCount - Current number of employees
   */
  update(delta, employeeCount) {
    // Tick down active events
    for (let i = this.activeEvents.length - 1; i >= 0; i--) {
      const evt = this.activeEvents[i];
      evt.remaining -= delta / 1000;
      if (evt.remaining <= 0) {
        this._endEvent(evt);
        this.activeEvents.splice(i, 1);
      }
    }

    // Tick down cooldown
    if (this.eventCooldown > 0) {
      this.eventCooldown -= delta / 1000;
      return;
    }

    // Random chance to trigger a new event
    if (randBool(0.008)) {
      // ~50% chance per 60s at 60fps
      this._tryTriggerEvent(employeeCount);
    }
  }

  /**
   * Get combined event effects for gameplay modifiers.
   */
  getActiveEffects() {
    const effects = {};
    for (const evt of this.activeEvents) {
      if (evt.definition.effect) {
        Object.assign(effects, evt.definition.effect);
      }
    }
    return effects;
  }

  /**
   * Get list of active event names (for HUD display).
   */
  getActiveEventNames() {
    return this.activeEvents.map((e) => ({
      name: e.definition.name,
      icon: e.definition.icon,
      remaining: Math.ceil(e.remaining),
    }));
  }

  /**
   * Try to trigger a random event based on office size.
   */
  _tryTriggerEvent(employeeCount) {
    const eligible = ALL_EVENTS.filter((e) => employeeCount >= e.minOfficeSize);
    if (eligible.length === 0) return;

    // Weighted random selection
    const totalWeight = eligible.reduce((sum, e) => sum + e.weight, 0);
    let roll = Math.random() * totalWeight;
    let chosen = eligible[0];
    for (const evt of eligible) {
      roll -= evt.weight;
      if (roll <= 0) {
        chosen = evt;
        break;
      }
    }

    // Don't trigger the same event twice
    if (this.activeEvents.some((e) => e.definition.id === chosen.id)) return;

    this._startEvent(chosen);
  }

  _startEvent(definition) {
    const evt = {
      definition,
      remaining: definition.duration,
    };
    this.activeEvents.push(evt);
    this.eventCooldown = this.cooldownDuration;

    // Show event banner on HUD
    if (this.scene.hud?.showEventBanner) {
      this.scene.hud.showEventBanner(definition.name, definition.icon, definition.duration);
    }

    // Screen shake for dramatic events
    if (this.scene._screenShake) {
      this.scene._screenShake(4, 300);
    }

    // Call onStart handler if it exists on the scene
    if (definition.onStart && this.scene[definition.onStart]) {
      this.scene[definition.onStart](evt);
    }
  }

  _endEvent(evt) {
    if (evt.definition.onEnd && this.scene[evt.definition.onEnd]) {
      this.scene[evt.definition.onEnd](evt);
    }
  }

  /**
   * Serialize active events for save/load.
   */
  save() {
    return this.activeEvents.map((e) => ({
      id: e.definition.id,
      remaining: e.remaining,
    }));
  }

  load(data, allEvents) {
    this.activeEvents = (data || [])
      .map((d) => {
        const def = allEvents.find((e) => e.id === d.id);
        if (!def) return null;
        return { definition: def, remaining: d.remaining };
      })
      .filter(Boolean);
  }
}
