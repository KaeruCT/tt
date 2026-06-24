import { randRange } from '../utils/rand';

// --- Relief Type Definitions ---

const RELIEF_POO = {
  id: 'poo',
  label: 'Poo',
  time: { min: 5, max: 10 },
  limit: { min: 40, max: 60 },
  cooldown: 30,
  attemptCooldown: 10,
  supported: ['pee', 'poo'],
  minPointUsages: 3,
  fixPointTime: 5,
};

const RELIEF_PEE = {
  id: 'pee',
  label: 'Pee',
  time: { min: 1, max: 5 },
  limit: { min: 20, max: 40 },
  cooldown: 15,
  attemptCooldown: 5,
  supported: ['pee'],
  minPointUsages: 5,
  fixPointTime: 3,
};

const RELIEF_WASH = {
  id: 'wash_hands',
  label: 'Wash Hands',
  time: { min: 2, max: 3 },
  limit: { min: 0, max: 0 },
  cooldown: 5,
  attemptCooldown: 3,
  supported: ['pee', 'poo'],
  minPointUsages: 10,
  fixPointTime: 2,
  triggeredBy: ['pee', 'poo'], // automatically triggered after these reliefs
  optional: true, // not required - skipping causes hygiene penalty
};

const RELIEF_SHOWER = {
  id: 'shower',
  label: 'Shower',
  time: { min: 10, max: 15 },
  limit: { min: 0, max: 0 },
  cooldown: 120,
  attemptCooldown: 30,
  supported: ['pee', 'poo'],
  minPointUsages: 8,
  fixPointTime: 8,
  optional: true,
};

const RELIEF_SMOKE = {
  id: 'smoke_break',
  label: 'Smoke Break',
  time: { min: 15, max: 20 },
  limit: { min: 60, max: 90 },
  cooldown: 60,
  attemptCooldown: 20,
  supported: [], // no facility needed - goes outside
  minPointUsages: 999,
  fixPointTime: 0,
  optional: true,
  outdoor: true, // employee walks to map edge
};

export const RELIEF_TYPES = {
  [RELIEF_POO.id]: RELIEF_POO,
  [RELIEF_PEE.id]: RELIEF_PEE,
  [RELIEF_WASH.id]: RELIEF_WASH,
  [RELIEF_SHOWER.id]: RELIEF_SHOWER,
  [RELIEF_SMOKE.id]: RELIEF_SMOKE,
};

// --- Facility Upgrades ---

export const UPGRADES = {
  AIR_FRESHENER: {
    id: 'air_freshener',
    name: 'Air Freshener',
    cost: 30,
    desc: 'Reduces stink penalty for adjacent desks.',
    effect: { stinkReduction: true },
  },
  PREMIUM_STALL: {
    id: 'premium_stall',
    name: 'Premium Stall',
    cost: 150,
    desc: '50% more uses before breaking.',
    effect: { durabilityMultiplier: 1.5 },
  },
  AIR_DRYER: {
    id: 'air_dryer',
    name: 'Air Dryer',
    cost: 80,
    desc: 'Hand-washing time halved.',
    effect: { washTimeMultiplier: 0.5 },
  },
  MAGICAL_PLUMBING: {
    id: 'magical_plumbing',
    name: 'Magical Plumbing',
    cost: 500,
    desc: 'Never breaks.',
    effect: { unbreakable: true },
  },
};

// --- Relief Class ---

export class Relief {
  constructor(relief, time, onStart, onFinish) {
    this.id = relief.id;
    this.inProgress = false;
    this.expirationTime = 0;
    this.attempts = 0;
    this.relief = relief;
    this.onStart = onStart;
    this.onFinish = onFinish;
    this.lastAttemptTime = time;

    const { limit } = relief;
    if (limit && limit.max > 0) {
      this.expirationTime = time + randRange(limit.min, limit.max) * 1000;
    }
  }

  release(reliefPoint) {
    const { relief } = this;
    if (!relief) return;
    if (this.inProgress) return;

    if (reliefPoint?.beginUsing) reliefPoint.beginUsing();
    this.onStart();
    this.inProgress = true;

    // Extend expiration so it doesn't fire while using the facility
    if (this.expirationTime) {
      const { max } = relief.time;
      this.expirationTime += max * 1000 + 5000;
    }

    const { min, max } = relief.time;
    const reliefTime = randRange(min * 1000, max * 1000);

    setTimeout(() => {
      if (reliefPoint?.stopUsing) reliefPoint.stopUsing();
      this.inProgress = false;
      this.onFinish();
    }, reliefTime);
  }

  forcedFinish() {
    this.onFinish();
  }

  attempted(time) {
    this.attempts++;
    this.lastAttemptTime = time;
  }

  shouldAttemptAgain(currentTime) {
    return currentTime > this.lastAttemptTime + this.relief.attemptCooldown * 1000;
  }
}
