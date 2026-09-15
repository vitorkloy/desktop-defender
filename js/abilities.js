(function(window){
  "use strict";

  /* ============ ABILITIES SYSTEM ============ */

  class AbilitiesHandler {
    constructor() {
      this.empWave = null; // { x, y, radius, age }
      this.empAffectedEnemies = new Set();
    }

    reset() {
      this.empWave = null;
      this.empAffectedEnemies.clear();
    }

    triggerEMP(x, y) {
      this.empWave = {
        x,
        y,
        radius: 0,
        age: 0,
        maxRadius: 200,
        duration: 0.8
      };
      this.empAffectedEnemies.clear();
    }

    triggerDevastating(enemies, particles, score, combo) {
      // Destroy all enemies on screen
      let totalScore = 0;
      const kills = enemies.length;

      for (const enemy of enemies) {
        const gained = enemy.score * combo;
        totalScore += gained;
        
        // spawn particles
        this.spawnParticles(particles, enemy.x, enemy.y, enemy.color, 30, 240);
      }

      enemies.length = 0; // clear all
      
      return { kills, totalScore };
    }

    update(dt, enemies) {
      if (this.empWave) {
        this.empWave.age += dt;
        this.empWave.radius = (this.empWave.age / this.empWave.duration) * this.empWave.maxRadius;

        // Check enemies in wave
        for (const enemy of enemies) {
          const dist = Math.hypot(enemy.x - this.empWave.x, enemy.y - this.empWave.y);
          if (dist <= this.empWave.radius && !this.empAffectedEnemies.has(enemy)) {
            this.empAffectedEnemies.add(enemy);
            enemy.empSlowed = true;
            enemy.empSlowTime = 3; // slow for 3 seconds
          }
        }

        if (this.empWave.age >= this.empWave.duration) {
          this.empWave = null;
        }
      }

      // Update enemy slow timers
      for (const enemy of enemies) {
        if (enemy.empSlowTime > 0) {
          enemy.empSlowTime -= dt;
          if (enemy.empSlowTime <= 0) {
            enemy.empSlowed = false;
            this.empAffectedEnemies.delete(enemy);
          }
        }
      }
    }

    render(ctx) {
      if (this.empWave) {
        const alpha = 1 - (this.empWave.age / this.empWave.duration);
        
        ctx.save();
        ctx.globalAlpha = alpha * 0.4;
        
        // outer ring
        ctx.strokeStyle = '#57d9ff';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#57d9ff';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(this.empWave.x, this.empWave.y, this.empWave.radius, 0, Math.PI * 2);
        ctx.stroke();

        // inner fill
        const gradient = ctx.createRadialGradient(
          this.empWave.x, this.empWave.y, 0,
          this.empWave.x, this.empWave.y, this.empWave.radius
        );
        gradient.addColorStop(0, 'rgba(87,217,255,0.3)');
        gradient.addColorStop(1, 'rgba(87,217,255,0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.empWave.x, this.empWave.y, this.empWave.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    }

    spawnParticles(particlesArray, x, y, color, count, speedMax) {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 20 + Math.random() * speedMax;
        particlesArray.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0.25 + Math.random() * 0.6,
          age: 0,
          color,
          size: 1.5 + Math.random() * 3.5
        });
      }
    }
  }

  // Export to global
  window.AbilitiesHandler = AbilitiesHandler;

})(window);
