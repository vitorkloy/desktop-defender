(function(window){
  "use strict";

  /* ============ META PROGRESSION SYSTEM ============ */

  const META_KEY = "dd_meta";

  const DEFAULT_META = {
    power: 0,
    fire_rate: 0,
    core_hp: 0,
    gold: 0,
    xp: 0,
    level: 1,
    botLoadout: []
  };

  // Scaling: cost grows exponentially
  function getUpgradeCost(level) {
    const base = 50;
    return Math.floor(base * Math.pow(1.35, level));
  }

  // Apply meta stats to base game stats
  function applyMetaToBaseStats(meta, baseStats) {
    // Power: +8% bullet damage per level
    baseStats.bulletDamage *= (1 + meta.power * 0.08);
    
    // Fire rate: -4% cooldown per level (faster firing)
    baseStats.fireRate *= (1 + meta.fire_rate * 0.04);
    
    // Core HP: +10 HP per level
    baseStats.coreMaxHp += meta.core_hp * 10;
    
    return baseStats;
  }

  class MetaManager {
    constructor() {
      this.cachedMeta = null;
    }

    async loadMeta() {
      if (this.cachedMeta) return { ...this.cachedMeta };
      
      try {
        const r = await window.storage.get(META_KEY, false);
        if (!r) {
          this.cachedMeta = { ...DEFAULT_META };
          return { ...this.cachedMeta };
        }
        
        const loaded = JSON.parse(r.value);
        this.cachedMeta = { ...DEFAULT_META, ...loaded };
        return { ...this.cachedMeta };
      } catch (e) {
        console.error("Failed to load meta", e);
        this.cachedMeta = { ...DEFAULT_META };
        return { ...this.cachedMeta };
      }
    }

    async saveMeta(meta) {
      try {
        this.cachedMeta = { ...meta };
        await window.storage.set(META_KEY, JSON.stringify(meta), false);
      } catch (e) {
        console.error("Failed to save meta", e);
      }
    }

    async canUpgrade(attribute, meta) {
      const currentLevel = meta[attribute] || 0;
      const cost = getUpgradeCost(currentLevel);
      return meta.gold >= cost;
    }

    async upgrade(attribute) {
      const meta = await this.loadMeta();
      const currentLevel = meta[attribute] || 0;
      const cost = getUpgradeCost(currentLevel);
      
      if (meta.gold < cost) {
        return { success: false, reason: "OURO INSUFICIENTE" };
      }
      
      // Max level check (optional cap at 20)
      if (currentLevel >= 20) {
        return { success: false, reason: "NÍVEL MÁXIMO" };
      }
      
      meta[attribute] = currentLevel + 1;
      meta.gold -= cost;
      
      await this.saveMeta(meta);
      
      return { 
        success: true, 
        newLevel: meta[attribute],
        goldRemaining: meta.gold,
        nextCost: getUpgradeCost(meta[attribute])
      };
    }

    getUpgradeCost(level) {
      return getUpgradeCost(level);
    }

    applyMetaToBaseStats(meta, baseStats) {
      return applyMetaToBaseStats(meta, baseStats);
    }

    async getBotLoadout() {
      const meta = await this.loadMeta();
      return meta.botLoadout || [];
    }

    async setBotLoadout(loadout) {
      const meta = await this.loadMeta();
      meta.botLoadout = loadout;
      await this.saveMeta(meta);
    }

    async addBotToLoadout(botType) {
      const meta = await this.loadMeta();
      if (!meta.botLoadout) meta.botLoadout = [];
      
      if (meta.botLoadout.length >= 3) {
        return { success: false, reason: "LOADOUT CHEIO (MÁX 3)" };
      }
      
      meta.botLoadout.push({ type: botType, preferUpgrade: false });
      await this.saveMeta(meta);
      return { success: true };
    }

    async removeBotFromLoadout(index) {
      const meta = await this.loadMeta();
      if (!meta.botLoadout || index < 0 || index >= meta.botLoadout.length) {
        return { success: false, reason: "ÍNDICE INVÁLIDO" };
      }
      
      meta.botLoadout.splice(index, 1);
      await this.saveMeta(meta);
      return { success: true };
    }

    async toggleBotUpgradePreference(index) {
      const meta = await this.loadMeta();
      if (!meta.botLoadout || index < 0 || index >= meta.botLoadout.length) {
        return { success: false };
      }
      
      meta.botLoadout[index].preferUpgrade = !meta.botLoadout[index].preferUpgrade;
      await this.saveMeta(meta);
      return { success: true, newValue: meta.botLoadout[index].preferUpgrade };
    }
  }

  // Export to global
  window.MetaManager = MetaManager;
  window.applyMetaToBaseStats = applyMetaToBaseStats;
  window.getUpgradeCost = getUpgradeCost;

})(window);
