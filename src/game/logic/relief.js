import { randRange } from '../utils/rand';

const RELIEF_POO = {
    id: 'poo',
    time: { min: 5, max: 15 },
    limit: { min: 30, max: 60 },
    cooldown: 20,
};

const RELIEF_PEE = {
    id: 'pee',
    time: { min: 1, max: 4 },
    limit: { min: 20, max: 40 },
    cooldown: 10,
};

export const RELIEF_TYPES = {
    poo: RELIEF_POO,
    pee: RELIEF_PEE,
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

        const { limit } = relief;
        this.reliefExpirationTime = time + randRange(limit.min, limit.max) * 1000;
    }

    release(reliefPoint) {
        const { relief } = this;

        if (!relief) return;

        if (reliefPoint) reliefPoint.busy = true;
        this.onStart();
        this.inProgress = true;

        const { min, max } = relief.time;
        const reliefTime = randRange(min * 1000, max * 1000);

        setTimeout(() => {
            
            if (reliefPoint) reliefPoint.busy = false;
            this.reliefInProgress = false;
            this.onFinish();
        }, reliefTime);
    }

    attempted() {
        this.attempts++;
    }
}