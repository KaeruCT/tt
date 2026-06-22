export const PHASE = {
  DAY: 'day',
  NIGHT: 'night',
};

export default class DayCycle {
  constructor({ dayDuration = 40, nightDuration = 20, onPhaseChange } = {}) {
    this.currentPhase = PHASE.DAY;
    this.dayDuration = dayDuration;
    this.nightDuration = nightDuration;
    this.phaseElapsed = 0;
    this.currentDay = 0;
    this.onPhaseChange = onPhaseChange;
  }

  /**
   * Advance time. Returns true if the phase changed this tick.
   */
  update(delta) {
    const phaseDuration = this.currentPhase === PHASE.DAY ? this.dayDuration : this.nightDuration;
    this.phaseElapsed += delta / 1000;

    if (this.phaseElapsed >= phaseDuration) {
      this.phaseElapsed -= phaseDuration;
      this._advancePhase();
      return true;
    }
    return false;
  }

  /**
   * Get progress through current phase (0–1).
   */
  getPhaseProgress() {
    const duration = this.currentPhase === PHASE.DAY ? this.dayDuration : this.nightDuration;
    return Math.min(this.phaseElapsed / duration, 1);
  }

  /**
   * Get time remaining in current phase (seconds).
   */
  getTimeRemaining() {
    const duration = this.currentPhase === PHASE.DAY ? this.dayDuration : this.nightDuration;
    return Math.max(0, duration - this.phaseElapsed);
  }

  /**
   * Is the game in build mode (night phase)?
   */
  isBuildMode() {
    return this.currentPhase === PHASE.NIGHT;
  }

  /**
   * Is the game in play mode (day phase)?
   */
  isPlayMode() {
    return this.currentPhase === PHASE.DAY;
  }

  /**
   * Skip to the next phase immediately.
   */
  skipPhase() {
    this.phaseElapsed = 0;
    this._advancePhase();
  }

  _advancePhase() {
    if (this.currentPhase === PHASE.DAY) {
      this.currentPhase = PHASE.NIGHT;
    } else {
      this.currentPhase = PHASE.DAY;
      this.currentDay += 1;
    }

    if (this.onPhaseChange) {
      this.onPhaseChange(this.currentPhase, this.currentDay);
    }
  }

  /**
   * Serialize for save/load.
   */
  save() {
    return {
      currentPhase: this.currentPhase,
      phaseElapsed: this.phaseElapsed,
      currentDay: this.currentDay,
    };
  }

  /**
   * Load from saved state.
   */
  load(data) {
    this.currentPhase = data.currentPhase || PHASE.DAY;
    this.phaseElapsed = data.phaseElapsed || 0;
    this.currentDay = data.currentDay || 0;
  }
}
