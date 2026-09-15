(function(window){
  "use strict";

  /* ============ DROP SYSTEM ============ */

  const DROP_WEIGHTS = {
    buff: 40,
    debuff: 10,
    passive: 20,
    active: 15,
    super: 5,
    firemode: 25
  };

  class DropManager {
    constructor() {
      this.drops = []; // { x, y, effectId, age }
      this.baseDropChance = 0.15; // 15% base chance
    }

    reset() {
      this.drops = [];
    }

    // Try to spawn a drop at enemy death location
    trySpawnDrop(x, y, dropChanceMod = 1.0) {
      const effectiveChance = this.baseDropChance * dropChanceMod;
      
      if (Math.random() > effectiveChance) return;

      const drop = this.pickRandomEffect();
      if (drop) {
        this.drops.push({
          x,
          y,
          drop,
          age: 0,
          radius: 12,
          wobble: Math.random() * Math.PI * 2
        });
      }
    }

    pickRandomEffect() {
      // Build weighted pool
      const pool = [];
      
      // Add effects from catalog
      for (const [id, def] of Object.entries(window.EFFECTS_CATALOG)) {
        const weight = DROP_WEIGHTS[def.type] || 10;
        for (let i = 0; i < weight; i++) {
          pool.push({type: 'effect', id});
        }
      }
      
      // Add fire modes (if available)
      if(window.FIRE_MODES){
        for(const [id, mode] of Object.entries(window.FIRE_MODES)){
          if(id === 'standard') continue; // Don't drop standard
          const weight = DROP_WEIGHTS.firemode || 25;
          for(let i = 0; i < weight; i++){
            pool.push({type: 'firemode', id});
          }
        }
      }

      if (pool.length === 0) return null;
      
      return pool[Math.floor(Math.random() * pool.length)];
    }

    update(dt) {
      for (const drop of this.drops) {
        drop.age += dt;
        drop.wobble += dt * 2;
      }
    }

    checkPickup(playerX, playerY, playerRadius) {
      for (let i = this.drops.length - 1; i >= 0; i--) {
        const drop = this.drops[i];
        const dist = Math.hypot(drop.x - playerX, drop.y - playerY);
        
        if (dist < drop.radius + playerRadius) {
          const pickedDrop = drop.drop;
          this.drops.splice(i, 1);
          return pickedDrop;
        }
      }
      return null;
    }

    render(ctx) {
      for (const drop of this.drops) {
        const dropData = drop.drop;
        let def, color, icon;
        
        if(dropData.type === 'effect'){
          def = window.EFFECTS_CATALOG[dropData.id];
          if (!def) continue;
          color = def.color;
          icon = def.icon;
        } else if(dropData.type === 'firemode'){
          const mode = window.FIRE_MODES[dropData.id];
          if (!mode) continue;
          color = mode.color;
          icon = mode.name.substring(0, 2);
        } else {
          continue;
        }

        const wobbleY = Math.sin(drop.wobble) * 3;
        const pulse = 1 + Math.sin(drop.age * 6) * 0.1;

        ctx.save();
        ctx.translate(drop.x, drop.y + wobbleY);

        // glow
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, drop.radius * 2.5);
        glow.addColorStop(0, color + 'aa');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, drop.radius * 2.5, 0, Math.PI * 2);
        ctx.fill();

        // hexagon shape
        ctx.strokeStyle = color;
        ctx.fillStyle = 'rgba(6,10,18,0.8)';
        ctx.lineWidth = 2;
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
        
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI / 3) + drop.age;
          const r = drop.radius * pulse;
          const px = Math.cos(angle) * r;
          const py = Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // icon
        ctx.shadowBlur = 0;
        ctx.fillStyle = color;
        ctx.font = "700 8px 'Chakra Petch'";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(icon, 0, 0);

        ctx.restore();
      }
    }
  }

  // Export to global
  window.DropManager = DropManager;

})(window);
