(function(window){
  "use strict";

  /* ============ DEFENSE BOTS SYSTEM ============ */

  const BOT_TYPES = {
    bot_gunner: {
      id: "bot_gunner",
      name: "ARTILHEIRO",
      role: "Ataque",
      hp: 30,
      radius: 16,
      range: 180,
      cooldown: 0.4,
      damage: 1.5,
      color: "#ff9d47",
      glow: "rgba(255,157,71,0.6)",
      cost: 40
    },
    
    bot_medic: {
      id: "bot_medic",
      name: "MÉDICO",
      role: "Cura",
      hp: 25,
      radius: 15,
      range: 0,
      cooldown: 2.0,
      healAmount: 3,
      color: "#2bffd0",
      glow: "rgba(43,255,208,0.6)",
      cost: 50
    },
    
    bot_ward: {
      id: "bot_ward",
      name: "GUARDIÃO",
      role: "Defesa",
      hp: 40,
      radius: 18,
      range: 120,
      cooldown: 0,
      damageReduction: 0.7,
      color: "#b479ff",
      glow: "rgba(180,121,255,0.6)",
      cost: 60,
      upgradeCost: 30
    }
  };

  class BotManager {
    constructor() {
      this.bots = [];
      this.placementMode = null; // { type, ghostX, ghostY }
      this.botIdCounter = 0;
    }

    reset() {
      this.bots = [];
      this.placementMode = null;
      this.botIdCounter = 0;
    }

    getBotLimit(wave) {
      return 2 + Math.floor(wave / 5);
    }

    canPlaceBot(wave) {
      return this.bots.length < this.getBotLimit(wave);
    }

    startPlacement(botType) {
      if (!BOT_TYPES[botType]) return false;
      
      this.placementMode = {
        type: botType,
        ghostX: 0,
        ghostY: 0
      };
      
      return true;
    }

    cancelPlacement() {
      this.placementMode = null;
    }

    updateGhostPosition(x, y) {
      if (this.placementMode) {
        this.placementMode.ghostX = x;
        this.placementMode.ghostY = y;
      }
    }

    canPlaceAt(x, y, coreX, coreY, coreRadius, playfield) {
      // Check if position is valid (not on core, within playfield)
      const distToCore = Math.hypot(x - coreX, y - coreY);
      if (distToCore < coreRadius + 30) return false;
      
      const margin = 20;
      if (x < margin || x > playfield.w - margin || 
          y < margin || y > playfield.h - margin) {
        return false;
      }
      
      // Check not too close to other bots
      for (const bot of this.bots) {
        const dist = Math.hypot(x - bot.x, y - bot.y);
        if (dist < 40) return false;
      }
      
      return true;
    }

    placeBot(x, y, coreX, coreY, coreRadius, playfield, runGold) {
      if (!this.placementMode) return { success: false, reason: "SEM MODO DE COLOCAÇÃO" };
      
      const type = BOT_TYPES[this.placementMode.type];
      if (!type) return { success: false, reason: "TIPO INVÁLIDO" };
      
      if (runGold < type.cost) {
        return { success: false, reason: "OURO INSUFICIENTE" };
      }
      
      if (!this.canPlaceAt(x, y, coreX, coreY, coreRadius, playfield)) {
        return { success: false, reason: "POSIÇÃO INVÁLIDA" };
      }
      
      const bot = {
        id: this.botIdCounter++,
        type: this.placementMode.type,
        x, y,
        hp: type.hp,
        maxHp: type.hp,
        cooldown: 0,
        level: 1,
        age: 0
      };
      
      this.bots.push(bot);
      this.placementMode = null;
      
      return { 
        success: true, 
        cost: type.cost,
        bot
      };
    }

    upgradeBot(botId, runGold) {
      const bot = this.bots.find(b => b.id === botId);
      if (!bot) return { success: false, reason: "BOT NÃO ENCONTRADO" };
      
      if (bot.type !== "bot_ward") {
        return { success: false, reason: "APENAS GUARDIÕES PODEM SER MELHORADOS" };
      }
      
      const type = BOT_TYPES[bot.type];
      const cost = type.upgradeCost || 30;
      
      if (runGold < cost) {
        return { success: false, reason: "OURO INSUFICIENTE" };
      }
      
      bot.level++;
      
      return { success: true, cost, newLevel: bot.level };
    }

    update(dt, enemies, core, bullets) {
      for (const bot of this.bots) {
        bot.age += dt;
        bot.cooldown = Math.max(0, bot.cooldown - dt);
        
        const type = BOT_TYPES[bot.type];
        
        if (type.id === "bot_gunner") {
          this.updateGunner(bot, type, enemies, bullets, dt);
        } else if (type.id === "bot_medic") {
          this.updateMedic(bot, type, core, dt);
        }
        // Ward is passive aura, no active update needed
      }
    }

    updateGunner(bot, type, enemies, bullets, dt) {
      if (bot.cooldown > 0) return;
      
      // Find nearest enemy in range
      let nearest = null;
      let nearestDist = Infinity;
      
      for (const enemy of enemies) {
        const dist = Math.hypot(enemy.x - bot.x, enemy.y - bot.y);
        if (dist < type.range && dist < nearestDist) {
          nearest = enemy;
          nearestDist = dist;
        }
      }
      
      if (nearest) {
        // Fire at enemy
        const angle = Math.atan2(nearest.y - bot.y, nearest.x - bot.x);
        bullets.push({
          x: bot.x + Math.cos(angle) * type.radius,
          y: bot.y + Math.sin(angle) * type.radius,
          vx: Math.cos(angle) * 480,
          vy: Math.sin(angle) * 480,
          life: 1.0,
          damage: type.damage,
          color: type.color,
          isBot: true
        });
        
        bot.cooldown = type.cooldown;
      }
    }

    updateMedic(bot, type, core, dt) {
      if (bot.cooldown > 0) return;
      
      // Heal core if it's damaged
      if (core.hp < core.maxHp) {
        core.hp = Math.min(core.maxHp, core.hp + type.healAmount);
        bot.cooldown = type.cooldown;
      }
    }

    getWardProtection(x, y) {
      let totalReduction = 1.0;
      
      for (const bot of this.bots) {
        if (bot.type !== "bot_ward") continue;
        
        const type = BOT_TYPES[bot.type];
        const dist = Math.hypot(x - bot.x, y - bot.y);
        
        // Range increases with level
        const effectiveRange = type.range + (bot.level - 1) * 20;
        
        if (dist < effectiveRange) {
          // Reduction improves with level
          const reductionPerLevel = 0.05;
          const reduction = type.damageReduction - (bot.level - 1) * reductionPerLevel;
          totalReduction *= Math.max(0.3, reduction);
        }
      }
      
      return totalReduction;
    }

    render(ctx) {
      for (const bot of this.bots) {
        const type = BOT_TYPES[bot.type];
        
        // Pulse effect
        const pulse = 1 + Math.sin(bot.age * 3) * 0.05;
        
        ctx.save();
        ctx.translate(bot.x, bot.y);
        
        // Glow
        ctx.shadowColor = type.glow;
        ctx.shadowBlur = 14;
        
        // Draw range indicator if ward
        if (type.id === "bot_ward") {
          const effectiveRange = type.range + (bot.level - 1) * 20;
          ctx.strokeStyle = type.color + "22";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(0, 0, effectiveRange, 0, Math.PI * 2);
          ctx.stroke();
        }
        
        // Bot body (square for bots)
        ctx.fillStyle = type.color;
        ctx.strokeStyle = type.color;
        ctx.lineWidth = 2;
        
        const size = type.radius * pulse;
        ctx.beginPath();
        ctx.rect(-size/2, -size/2, size, size);
        ctx.fill();
        ctx.stroke();
        
        // Level indicator for upgraded wards
        if (bot.level > 1) {
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#eaf6ff";
          ctx.font = "700 9px 'Chakra Petch'";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("+" + (bot.level - 1), 0, 0);
        }
        
        ctx.restore();
        
        // HP bar if damaged
        if (bot.hp < bot.maxHp) {
          const barWidth = type.radius * 2;
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.fillRect(bot.x - barWidth/2, bot.y - type.radius - 9, barWidth, 3);
          ctx.fillStyle = type.color;
          ctx.fillRect(bot.x - barWidth/2, bot.y - type.radius - 9, barWidth * (bot.hp / bot.maxHp), 3);
        }
      }
      
      // Render placement ghost
      if (this.placementMode) {
        const type = BOT_TYPES[this.placementMode.type];
        const x = this.placementMode.ghostX;
        const y = this.placementMode.ghostY;
        
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.translate(x, y);
        
        // Range circle
        ctx.strokeStyle = type.color;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, type.range, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Ghost bot
        ctx.fillStyle = type.color + "66";
        ctx.strokeStyle = type.color;
        ctx.lineWidth = 2;
        const size = type.radius;
        ctx.beginPath();
        ctx.rect(-size/2, -size/2, size, size);
        ctx.fill();
        ctx.stroke();
        
        ctx.restore();
      }
    }

    serialize() {
      return this.bots.map(bot => ({
        id: bot.id,
        type: bot.type,
        x: bot.x,
        y: bot.y,
        hp: bot.hp,
        maxHp: bot.maxHp,
        level: bot.level
      }));
    }

    restore(data) {
      this.bots = data.map(botData => ({
        ...botData,
        cooldown: 0,
        age: 0
      }));
      
      this.botIdCounter = Math.max(0, ...this.bots.map(b => b.id)) + 1;
    }
  }

  // Export to global
  window.BotManager = BotManager;
  window.BOT_TYPES = BOT_TYPES;

})(window);
