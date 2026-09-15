(function(window){
  "use strict";

  /* ============ ECONOMY SYSTEM ============ */

  // Payouts for kills and wave completion
  const KILL_PAYOUTS = {
    basic: { gold: 1, xp: 2 },
    fast:  { gold: 2, xp: 3 },
    tank:  { gold: 5, xp: 8 }
  };

  class EconomyManager {
    constructor() {
      this.runGold = 0;
      this.runXp = 0;
    }

    reset() {
      this.runGold = 0;
      this.runXp = 0;
    }

    // Award gold/xp for enemy kill
    awardKill(enemyType) {
      const payout = KILL_PAYOUTS[enemyType];
      if (!payout) return;
      
      this.runGold += payout.gold;
      this.runXp += payout.xp;
    }

    // Award wave completion bonus
    awardWaveComplete(wave, perfect = false) {
      const goldBase = 10 + wave * 3;
      const xpBase = 15 + wave * 4;
      
      const multiplier = perfect ? 1.5 : 1.0;
      
      this.runGold += Math.floor(goldBase * multiplier);
      this.runXp += Math.floor(xpBase * multiplier);
    }

    // Get current run totals
    getRunTotals() {
      return {
        gold: this.runGold,
        xp: this.runXp
      };
    }

    // Transfer run earnings to meta (called on game over or checkpoint save)
    async creditToMeta() {
      const meta = await window.metaManager.loadMeta();
      meta.gold += this.runGold;
      meta.xp += this.runXp;
      
      // Update level based on XP (simple progression: 100 XP per level)
      meta.level = Math.floor(meta.xp / 100) + 1;
      
      await window.metaManager.saveMeta(meta);
      
      // Don't reset here - let game over or checkpoint handle it
      return { gold: this.runGold, xp: this.runXp };
    }
  }

  // Export to global
  window.EconomyManager = EconomyManager;
  window.KILL_PAYOUTS = KILL_PAYOUTS;

})(window);
