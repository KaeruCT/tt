/**
 * Procedural employee trait system.
 * Each employee rolls 2-3 traits that affect gameplay behavior.
 */
import { randRange, randValue } from '../utils/rand';

export const TRAITS = {
  IRON_BLADDER: {
    id: 'iron_bladder',
    name: 'Iron Bladder',
    desc: 'Relief timers are 50% longer.',
    reliefTimeMultiplier: 1.5,
    reliefLimitMultiplier: 1.5,
  },
  TINY_BLADDER: {
    id: 'tiny_bladder',
    name: 'Tiny Bladder',
    desc: 'Relief timers are 50% shorter.',
    reliefTimeMultiplier: 0.5,
    reliefLimitMultiplier: 0.5,
  },
  FAST_WORKER: {
    id: 'fast_worker',
    name: 'Fast Worker',
    desc: 'Generates 2× funds while working.',
    workSpeedMultiplier: 2.0,
  },
  SLOW_WORKER: {
    id: 'slow_worker',
    name: 'Slow Worker',
    desc: 'Generates 0.5× funds.',
    workSpeedMultiplier: 0.5,
  },
  NEAT_FREAK: {
    id: 'neat_freak',
    name: 'Neat Freak',
    desc: 'Cleans nearby droppings.',
    cleansDroppings: true,
    cleanRadius: 3,
  },
  SLOB: {
    id: 'slob',
    name: 'Slob',
    desc: 'Higher chance of missing the toilet.',
    missChance: 0.3,
  },
  GOSSIP: {
    id: 'gossip',
    name: 'Gossip',
    desc: 'Slows adjacent employees by 20%.',
    adjacentSlowdown: 0.2,
  },
  MOTIVATOR: {
    id: 'motivator',
    name: 'Motivator',
    desc: 'Speeds up adjacent employees by 20%.',
    adjacentSpeedup: 0.2,
  },
  NIGHT_OWL: {
    id: 'night_owl',
    name: 'Night Owl',
    desc: 'Can work during night shift.',
    worksAtNight: true,
  },
  SOCIAL_BUTTERFLY: {
    id: 'social_butterfly',
    name: 'Social Butterfly',
    desc: 'Needs desk near others or gets sad.',
    needsSocial: true,
    socialRadius: 3,
  },
  GERMAPHOBE: {
    id: 'germaphobe',
    name: 'Germaphobe',
    desc: 'Refuses recently-used relief points.',
    germCooldown: 15, // seconds before they'll reuse a point
  },
  COFFEE_ADDICT: {
    id: 'coffee_addict',
    name: 'Coffee Addict',
    desc: 'Works faster but needs coffee.',
    workSpeedMultiplier: 1.5,
    needsCoffee: true,
    coffeeSadnessRate: 0.5, // sadness per second without coffee
  },
};

const ALL_TRAITS = Object.values(TRAITS);

/**
 * Roll 2-3 random traits for a new employee.
 * Avoids contradictory traits (e.g., Iron Bladder + Tiny Bladder).
 */
export function rollTraits() {
  const count = randRange(2, 3);
  const available = [...ALL_TRAITS];
  const chosen = [];

  for (let i = 0; i < count && available.length > 0; i++) {
    const trait = randValue(available);
    chosen.push(trait);

    // Remove contradictory traits
    if (trait.id === TRAITS.IRON_BLADDER.id) {
      removeById(available, TRAITS.TINY_BLADDER.id);
    }
    if (trait.id === TRAITS.TINY_BLADDER.id) {
      removeById(available, TRAITS.IRON_BLADDER.id);
    }
    if (trait.id === TRAITS.FAST_WORKER.id) {
      removeById(available, TRAITS.SLOW_WORKER.id);
    }
    if (trait.id === TRAITS.SLOW_WORKER.id) {
      removeById(available, TRAITS.FAST_WORKER.id);
    }
    if (trait.id === TRAITS.NEAT_FREAK.id) {
      removeById(available, TRAITS.SLOB.id);
    }
    if (trait.id === TRAITS.SLOB.id) {
      removeById(available, TRAITS.NEAT_FREAK.id);
    }
    if (trait.id === TRAITS.GOSSIP.id) {
      removeById(available, TRAITS.MOTIVATOR.id);
    }
    if (trait.id === TRAITS.MOTIVATOR.id) {
      removeById(available, TRAITS.GOSSIP.id);
    }
    removeById(available, trait.id);
  }

  return chosen;
}

function removeById(arr, id) {
  const idx = arr.findIndex((t) => t.id === id);
  if (idx >= 0) arr.splice(idx, 1);
}

/**
 * Check if an employee has a specific trait.
 */
export function hasTrait(employee, traitId) {
  return employee.meta.traits?.some((t) => t.id === traitId) || false;
}

/**
 * Calculate work speed multiplier from all employee traits.
 */
export function getWorkSpeedMultiplier(employee) {
  let mult = 1.0;
  if (!employee.meta.traits) return mult;
  for (const trait of employee.meta.traits) {
    if (trait.workSpeedMultiplier) {
      mult *= trait.workSpeedMultiplier;
    }
  }
  return mult;
}

/**
 * Calculate relief time multiplier from all employee traits.
 */
export function getReliefTimeMultiplier(employee) {
  let mult = 1.0;
  if (!employee.meta.traits) return mult;
  for (const trait of employee.meta.traits) {
    if (trait.reliefTimeMultiplier) {
      mult *= trait.reliefTimeMultiplier;
    }
  }
  return mult;
}

/**
 * Calculate relief limit multiplier from all employee traits.
 */
export function getReliefLimitMultiplier(employee) {
  let mult = 1.0;
  if (!employee.meta.traits) return mult;
  for (const trait of employee.meta.traits) {
    if (trait.reliefLimitMultiplier) {
      mult *= trait.reliefLimitMultiplier;
    }
  }
  return mult;
}
