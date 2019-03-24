import { randRange } from '../utils/rand';

const RELIEF_POO = {
    id: 'poo',
    time: { min: 5, max: 15 },
    limit: { min: 30, max: 60 },
    cooldown: 30,
    attemptCooldown: 20,
    supported: ['pee', 'poo'],
    minPointUsages: 3,
    fixPointTime: 5,
};

const RELIEF_PEE = {
    id: 'pee',
    time: { min: 1, max: 4 },
    limit: { min: 20, max: 40 },
    cooldown: 20,
    attemptCooldown: 15,
    supported: ['pee'],
    minPointUsages: 5,
    fixPointTime: 3,
};

export const RELIEF_TYPES = {
    [RELIEF_POO.id]: RELIEF_POO,
    [RELIEF_PEE.id]: RELIEF_PEE,
};

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
        this.expirationTime = time + randRange(limit.min, limit.max) * 1000;
    }

    release(reliefPoint) {
        const { relief } = this;

        if (!relief) return;
        if (this.inProgress) return;

        if (reliefPoint && reliefPoint.beginUsing) reliefPoint.beginUsing();
        this.onStart();
        this.inProgress = true;

        const { min, max } = relief.time;
        const reliefTime = randRange(min * 1000, max * 1000);

        setTimeout(() => {
            if (reliefPoint && reliefPoint.stopUsing) reliefPoint.stopUsing();
            this.reliefInProgress = false;
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
        return currentTime > this.lastAttemptTime + this.relief.attemptCooldown * 1000
    }
}
