(function(window){
  "use strict";

  /* ============ FIRE MODES SYSTEM ============ */

  const FIRE_MODES = {
    standard: {
      id: "standard",
      name: "PADRÃO",
      behavior: "single",
      duration: Infinity,
      damageMod: 1.0,
      projectileCount: 1,
      spreadAngle: 0,
      fireRateMod: 1.0,
      pierce: false,
      color: "#eaf6ff"
    },
    
    spread: {
      id: "spread",
      name: "ESPALHADO",
      behavior: "spread",
      duration: 12,
      damageMod: 0.7,
      projectileCount: 5,
      spreadAngle: 0.6,
      fireRateMod: 1.0,
      pierce: false,
      color: "#ffd23f"
    },
    
    rail: {
      id: "rail",
      name: "FEIXE",
      behavior: "pierce",
      duration: 8,
      damageMod: 3.0,
      projectileCount: 1,
      spreadAngle: 0,
      fireRateMod: 0.4,
      pierce: true,
      color: "#57d9ff"
    },
    
    burst: {
      id: "burst",
      name: "RAJADA",
      behavior: "burst",
      duration: 10,
      damageMod: 1.0,
      projectileCount: 3,
      spreadAngle: 0.08,
      fireRateMod: 3.0,
      pierce: false,
      burstDelay: 0.08,
      color: "#ff9d47"
    }
  };

  class FireModeManager {
    constructor() {
      // Track which modes are unlocked this run
      this.unlockedModes = new Set(["standard"]);
      
      // Track time remaining for each mode
      this.modeTimes = {};
      
      // Current active mode
      this.currentMode = "standard";
      
      // Burst state
      this.burstState = null; // { remaining, delay }
    }

    reset() {
      this.unlockedModes = new Set(["standard"]);
      this.modeTimes = {};
      this.currentMode = "standard";
      this.burstState = null;
    }

    unlockMode(modeId) {
      if (!FIRE_MODES[modeId]) return;
      
      this.unlockedModes.add(modeId);
      
      // Set initial time for non-standard modes
      if (modeId !== "standard" && FIRE_MODES[modeId].duration !== Infinity) {
        this.modeTimes[modeId] = FIRE_MODES[modeId].duration;
      }
    }

    switchMode(modeId) {
      // Can't switch to locked modes
      if (!this.unlockedModes.has(modeId)) return false;
      
      // Can't switch to modes with no time left
      if (modeId !== "standard" && (this.modeTimes[modeId] || 0) <= 0) {
        return false;
      }
      
      this.currentMode = modeId;
      this.burstState = null; // Reset burst state on mode switch
      return true;
    }

    update(dt) {
      const mode = FIRE_MODES[this.currentMode];
      
      // Update time for current mode if it's not infinite
      if (mode.duration !== Infinity && this.currentMode !== "standard") {
        this.modeTimes[this.currentMode] = Math.max(0, (this.modeTimes[this.currentMode] || 0) - dt);
        
        // If time runs out, switch to standard
        if (this.modeTimes[this.currentMode] <= 0) {
          this.currentMode = "standard";
          this.burstState = null;
        }
      }
      
      // Update burst delay
      if (this.burstState && this.burstState.delay > 0) {
        this.burstState.delay -= dt;
      }
    }

    getCurrentMode() {
      return FIRE_MODES[this.currentMode];
    }

    getTimeLeft(modeId) {
      if (modeId === "standard") return Infinity;
      return this.modeTimes[modeId] || 0;
    }

    canFire() {
      // Check burst state
      if (this.burstState) {
        return this.burstState.remaining > 0 && this.burstState.delay <= 0;
      }
      return true;
    }

    // Call this when fire button is pressed
    startFire() {
      const mode = FIRE_MODES[this.currentMode];
      
      if (mode.behavior === "burst") {
        // Start burst sequence
        this.burstState = {
          remaining: mode.projectileCount,
          delay: 0
        };
      }
    }

    // Call this when a shot is actually fired
    onShotFired() {
      if (this.burstState) {
        this.burstState.remaining--;
        if (this.burstState.remaining > 0) {
          this.burstState.delay = FIRE_MODES[this.currentMode].burstDelay || 0.08;
        } else {
          this.burstState = null;
        }
      }
    }

    // Get modified fire cooldown based on current mode
    getFireCooldown(baseCooldown) {
      const mode = FIRE_MODES[this.currentMode];
      return baseCooldown / mode.fireRateMod;
    }

    // Get all unlocked modes for UI
    getUnlockedModes() {
      return Array.from(this.unlockedModes).map(id => ({
        ...FIRE_MODES[id],
        timeLeft: this.getTimeLeft(id),
        active: id === this.currentMode
      }));
    }

    // Serialize for save
    serialize() {
      return {
        unlockedModes: Array.from(this.unlockedModes),
        modeTimes: { ...this.modeTimes },
        currentMode: this.currentMode
      };
    }

    // Restore from save
    restore(data) {
      this.unlockedModes = new Set(data.unlockedModes || ["standard"]);
      this.modeTimes = { ...data.modeTimes };
      this.currentMode = data.currentMode || "standard";
      this.burstState = null;
    }
  }

  // Export to global
  window.FireModeManager = FireModeManager;
  window.FIRE_MODES = FIRE_MODES;

})(window);
