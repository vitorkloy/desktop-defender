(function(window){
  "use strict";

  /* ============ RUN SAVE / CHECKPOINT SYSTEM ============ */

  const RUN_SAVE_KEY = "dd_runsave";

  class RunSaveManager {
    constructor() {
      this.hasSave = false;
    }

    async loadSave() {
      try {
        const r = await window.storage.get(RUN_SAVE_KEY, false);
        if (!r) {
          this.hasSave = false;
          return null;
        }
        
        const save = JSON.parse(r.value);
        this.hasSave = true;
        return save;
      } catch (e) {
        console.error("Failed to load run save", e);
        this.hasSave = false;
        return null;
      }
    }

    async saveSave(gameState) {
      try {
        const save = {
          wave: gameState.wave,
          score: gameState.score,
          combo: gameState.combo,
          coreHp: gameState.coreHp,
          runGold: gameState.runGold,
          runXp: gameState.runXp,
          bots: gameState.bots || [],
          ownedActive: gameState.ownedActive,
          ownedSuper: gameState.ownedSuper,
          superCharge: gameState.superCharge,
          fireModeId: gameState.fireModeId || "standard",
          fireModes: gameState.fireModes || {},
          savedAt: new Date().toISOString(),
          elapsed: gameState.elapsed || 0,
          sessionKills: gameState.sessionKills || 0,
          sessionTankKills: gameState.sessionTankKills || 0,
          sessionShots: gameState.sessionShots || 0,
          sessionHits: gameState.sessionHits || 0
        };
        
        await window.storage.set(RUN_SAVE_KEY, JSON.stringify(save), false);
        this.hasSave = true;
        
        return { success: true };
      } catch (e) {
        console.error("Failed to save run", e);
        return { success: false, error: e.message };
      }
    }

    async clearSave() {
      try {
        await window.storage.remove(RUN_SAVE_KEY, false);
        this.hasSave = false;
        return { success: true };
      } catch (e) {
        console.error("Failed to clear save", e);
        return { success: false, error: e.message };
      }
    }

    async checkHasSave() {
      const save = await this.loadSave();
      return save !== null;
    }

    canSaveAtWave(wave) {
      // Can save starting at wave 5, then every 5 waves
      return wave >= 5 && wave % 5 === 0;
    }
  }

  // Export to global
  window.RunSaveManager = RunSaveManager;

})(window);
