(function(window){
  "use strict";

  /* ============ EFFECTS DATA MODEL ============ */
  
  // Effect types
  const EFFECT_TYPE = {
    BUFF: "buff",
    DEBUFF: "debuff", 
    PASSIVE: "passive",
    ACTIVE: "active",
    SUPER: "super"
  };

  // Stacking modes
  const STACK_MODE = {
    NONE: "none",       // não empilha, renova duração
    ADDITIVE: "additive", // soma os modificadores
    MAX: "max"          // mantém o maior modificador
  };

  /* ============ EFFECTS CATALOG ============ */
  const EFFECTS_CATALOG = {
    // BUFFS (3+)
    rapid_fire: {
      id: "rapid_fire",
      type: EFFECT_TYPE.BUFF,
      name: "TIRO RÁPIDO",
      desc: "Cadência de tiro +50%",
      icon: "RF",
      color: "#57d9ff",
      duration: 8,
      stackMode: STACK_MODE.NONE,
      mods: { fireRate: 1.5 }
    },
    
    speed_boost: {
      id: "speed_boost",
      type: EFFECT_TYPE.BUFF,
      name: "VELOCIDADE",
      desc: "Velocidade de movimento +40%",
      icon: "VL",
      color: "#2bffd0",
      duration: 10,
      stackMode: STACK_MODE.NONE,
      mods: { moveSpeed: 1.4 }
    },
    
    damage_up: {
      id: "damage_up",
      type: EFFECT_TYPE.BUFF,
      name: "PODER DE FOGO",
      desc: "Dano dos projéteis +100%",
      icon: "PF",
      color: "#ffb347",
      duration: 7,
      stackMode: STACK_MODE.ADDITIVE,
      mods: { bulletDamage: 2.0 }
    },
    
    shield: {
      id: "shield",
      type: EFFECT_TYPE.BUFF,
      name: "ESCUDO",
      desc: "Núcleo recebe -50% de dano",
      icon: "SC",
      color: "#b479ff",
      duration: 12,
      stackMode: STACK_MODE.NONE,
      mods: { coreDamageReduction: 0.5 }
    },

    // DEBUFFS (2+)
    slow: {
      id: "slow",
      type: EFFECT_TYPE.DEBUFF,
      name: "LENTIDÃO",
      desc: "Velocidade de movimento -30%",
      icon: "LT",
      color: "#ff4d6d",
      duration: 5,
      stackMode: STACK_MODE.ADDITIVE,
      mods: { moveSpeed: 0.7 }
    },
    
    weapon_jam: {
      id: "weapon_jam",
      type: EFFECT_TYPE.DEBUFF,
      name: "TRAVAMENTO",
      desc: "Cadência de tiro -40%",
      icon: "TJ",
      color: "#ff2b4d",
      duration: 6,
      stackMode: STACK_MODE.NONE,
      mods: { fireRate: 0.6 }
    },

    // PASSIVES (2+)
    scavenger: {
      id: "scavenger",
      type: EFFECT_TYPE.PASSIVE,
      name: "CATADOR",
      desc: "Chance de drop +25%",
      icon: "CT",
      color: "#ffd23f",
      duration: Infinity,
      stackMode: STACK_MODE.ADDITIVE,
      mods: { dropChance: 1.25 }
    },
    
    resilience: {
      id: "resilience",
      type: EFFECT_TYPE.PASSIVE,
      name: "RESILIÊNCIA",
      desc: "Núcleo recebe -15% de dano",
      icon: "RS",
      color: "#9fb0c8",
      duration: Infinity,
      stackMode: STACK_MODE.ADDITIVE,
      mods: { coreDamageReduction: 0.85 }
    },

    // ACTIVE (1+)
    emp_blast: {
      id: "emp_blast",
      type: EFFECT_TYPE.ACTIVE,
      name: "PULSO EMP",
      desc: "Habilidade ativa: desacelera inimigos próximos (Space/Q)",
      icon: "EM",
      color: "#57d9ff",
      duration: 4,
      cooldown: 15,
      stackMode: STACK_MODE.NONE,
      mods: { empActive: true }
    },

    // SUPER (1+)
    devastation: {
      id: "devastation",
      type: EFFECT_TYPE.SUPER,
      name: "DEVASTAÇÃO",
      desc: "Super: elimina todos os inimigos na tela (Shift/E)",
      icon: "DV",
      color: "#ff9d47",
      duration: 0.1,
      stackMode: STACK_MODE.NONE,
      mods: { superActive: true }
    }
  };

  /* ============ EFFECTS MANAGER ============ */
  class EffectsManager {
    constructor() {
      this.activeEffects = []; // { defId, timeLeft, stackCount }
      this.ownedActiveAbility = null; // loadout slot for active ability
      this.ownedSuperAbility = null; // loadout slot for super ability
      this.superCharge = 0;
      this.superChargeMax = 100;
      this.activeCooldown = 0;
    }

    reset() {
      this.activeEffects = [];
      this.ownedActiveAbility = null;
      this.ownedSuperAbility = null;
      this.superCharge = 0;
      this.activeCooldown = 0;
    }

    addEffect(defId) {
      const def = EFFECTS_CATALOG[defId];
      if (!def) return;

      // Abilities go to loadout slots, not temporary effects
      if (def.type === EFFECT_TYPE.ACTIVE) {
        this.ownedActiveAbility = defId;
        return;
      }
      if (def.type === EFFECT_TYPE.SUPER) {
        this.ownedSuperAbility = defId;
        return;
      }

      // Temporary effects (buffs/debuffs/passives) have duration
      const existing = this.activeEffects.find(e => e.defId === defId);
      
      if (existing) {
        if (def.stackMode === STACK_MODE.NONE) {
          // renova duração
          existing.timeLeft = def.duration;
        } else if (def.stackMode === STACK_MODE.ADDITIVE) {
          existing.stackCount = (existing.stackCount || 1) + 1;
          existing.timeLeft = def.duration;
        } else if (def.stackMode === STACK_MODE.MAX) {
          existing.timeLeft = Math.max(existing.timeLeft, def.duration);
        }
      } else {
        this.activeEffects.push({
          defId,
          timeLeft: def.duration,
          stackCount: 1
        });
      }
    }

    removeEffect(defId) {
      const idx = this.activeEffects.findIndex(e => e.defId === defId);
      if (idx >= 0) this.activeEffects.splice(idx, 1);
    }

    update(dt) {
      // update durations
      for (let i = this.activeEffects.length - 1; i >= 0; i--) {
        const effect = this.activeEffects[i];
        const def = EFFECTS_CATALOG[effect.defId];
        
        if (def.duration !== Infinity) {
          effect.timeLeft -= dt;
          if (effect.timeLeft <= 0) {
            this.activeEffects.splice(i, 1);
          }
        }
      }

      // cooldown
      if (this.activeCooldown > 0) {
        this.activeCooldown -= dt;
      }
    }

    addSuperCharge(amount) {
      this.superCharge = Math.min(this.superCharge + amount, this.superChargeMax);
    }

    canUseActive() {
      return this.activeCooldown <= 0 && this.hasActiveAbility();
    }

    canUseSuper() {
      return this.superCharge >= this.superChargeMax && this.hasSuperAbility();
    }

    hasActiveAbility() {
      return this.ownedActiveAbility !== null;
    }

    hasSuperAbility() {
      return this.ownedSuperAbility !== null;
    }

    useActive() {
      if (!this.canUseActive()) return null;
      
      if (this.ownedActiveAbility) {
        const def = EFFECTS_CATALOG[this.ownedActiveAbility];
        this.activeCooldown = def.cooldown || 10;
        return def.id;
      }
      
      return null;
    }

    useSuper() {
      if (!this.canUseSuper()) return null;
      
      if (this.ownedSuperAbility) {
        const def = EFFECTS_CATALOG[this.ownedSuperAbility];
        this.superCharge = 0;
        return def.id;
      }
      
      return null;
    }

    // Compute derived stats from all active effects
    computeMods() {
      const mods = {
        fireRate: 1.0,
        moveSpeed: 1.0,
        bulletDamage: 1.0,
        coreDamageReduction: 1.0,
        dropChance: 1.0,
        empActive: false,
        superActive: false
      };

      for (const effect of this.activeEffects) {
        const def = EFFECTS_CATALOG[effect.defId];
        if (!def || !def.mods) continue;

        const stackMult = effect.stackCount || 1;

        for (const [key, value] of Object.entries(def.mods)) {
          if (typeof value === 'boolean') {
            mods[key] = mods[key] || value;
          } else if (def.stackMode === STACK_MODE.ADDITIVE && stackMult > 1) {
            // for additive stacking, multiply the effect
            if (key === 'coreDamageReduction') {
              // damage reduction stacks multiplicatively
              mods[key] *= Math.pow(value, stackMult);
            } else {
              // other mods stack additively from base
              const bonus = (value - 1.0) * stackMult;
              mods[key] *= (1.0 + bonus);
            }
          } else {
            mods[key] *= value;
          }
        }
      }

      return mods;
    }

    getActiveEffects() {
      const result = [];

      // Add owned abilities (permanent for the run)
      if (this.ownedActiveAbility) {
        result.push({
          defId: this.ownedActiveAbility,
          timeLeft: Infinity,
          stackCount: 1,
          def: EFFECTS_CATALOG[this.ownedActiveAbility],
          cooldownRemaining: this.activeCooldown
        });
      }

      if (this.ownedSuperAbility) {
        result.push({
          defId: this.ownedSuperAbility,
          timeLeft: Infinity,
          stackCount: 1,
          def: EFFECTS_CATALOG[this.ownedSuperAbility],
          chargePercent: this.getSuperChargePercent()
        });
      }

      // Add temporary effects
      result.push(...this.activeEffects.map(e => ({
        ...e,
        def: EFFECTS_CATALOG[e.defId]
      })));

      return result;
    }

    getSuperChargePercent() {
      return (this.superCharge / this.superChargeMax) * 100;
    }
  }

  // Export to global
  window.EffectsManager = EffectsManager;
  window.EFFECTS_CATALOG = EFFECTS_CATALOG;
  window.EFFECT_TYPE = EFFECT_TYPE;

})(window);
