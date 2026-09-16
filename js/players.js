(function(window){
  "use strict";

  /* ============ PLAYERS SYSTEM ============ */

  class PlayersManager {
    constructor() {
      this.players = [];
      this.mode = "single"; // "single" or "local2p"
    }

    reset(mode = "single") {
      this.mode = mode;
      this.players = [];

      if (mode === "single") {
        this.players.push(this.createPlayer(1, {
          x: 480,
          y: 450,
          color: "#57d9ff",
          glow: "rgba(87,217,255,0.6)",
          controls: "player1"
        }));
      } else if (mode === "local2p") {
        this.players.push(this.createPlayer(1, {
          x: 420,
          y: 450,
          color: "#57d9ff",
          glow: "rgba(87,217,255,0.6)",
          controls: "player1"
        }));
        this.players.push(this.createPlayer(2, {
          x: 540,
          y: 450,
          color: "#ff9d47",
          glow: "rgba(255,157,71,0.6)",
          controls: "player2"
        }));
      }
    }

    createPlayer(id, config) {
      return {
        id,
        x: config.x,
        y: config.y,
        radius: 13,
        angle: -Math.PI / 2,
        speed: 230,
        baseSpeed: 230,
        color: config.color,
        glow: config.glow,
        controls: config.controls,
        fireCooldown: 0,
        aimX: config.x,
        aimY: config.y - 100
      };
    }

    getPlayer(id) {
      return this.players.find(p => p.id === id);
    }

    getAllPlayers() {
      return this.players;
    }

    isMultiplayer() {
      return this.mode === "local2p";
    }

    serialize() {
      return {
        mode: this.mode,
        players: this.players.map(p => ({
          id: p.id,
          x: p.x,
          y: p.y,
          angle: p.angle,
          controls: p.controls
        }))
      };
    }

    restore(data) {
      if (!data) return;
      this.mode = data.mode || "single";
      
      if (data.players && data.players.length > 0) {
        this.players = [];
        for (const pData of data.players) {
          const config = {
            x: pData.x,
            y: pData.y,
            color: pData.id === 1 ? "#57d9ff" : "#ff9d47",
            glow: pData.id === 1 ? "rgba(87,217,255,0.6)" : "rgba(255,157,71,0.6)",
            controls: pData.controls
          };
          const player = this.createPlayer(pData.id, config);
          player.angle = pData.angle || -Math.PI / 2;
          this.players.push(player);
        }
      }
    }
  }

  /* ============ INPUT SYSTEM ============ */

  class InputManager {
    constructor() {
      this.keys = {};
      this.mouse = { x: 480, y: 200, down: false, rightDown: false };
      this.player2Aim = { x: 480, y: 200 }; // P2 keyboard aim direction
      
      this.initListeners();
    }

    initListeners() {
      window.addEventListener("keydown", (e) => {
        this.keys[e.key.toLowerCase()] = true;
      });

      window.addEventListener("keyup", (e) => {
        this.keys[e.key.toLowerCase()] = false;
      });
    }

    setMousePosition(x, y) {
      this.mouse.x = x;
      this.mouse.y = y;
    }

    setMouseDown(down) {
      this.mouse.down = down;
    }

    setMouseRightDown(down) {
      this.mouse.rightDown = down;
    }

    isKeyPressed(key) {
      return !!this.keys[key];
    }

    getMousePosition() {
      return { x: this.mouse.x, y: this.mouse.y };
    }

    isMouseDown() {
      return this.mouse.down;
    }

    isMouseRightDown() {
      return this.mouse.rightDown;
    }

    // Player 1 movement (WASD)
    getP1Movement() {
      let dx = 0, dy = 0;
      if (this.keys["w"] || this.keys["arrowup"]) dy -= 1;
      if (this.keys["s"] || this.keys["arrowdown"]) dy += 1;
      if (this.keys["a"] || this.keys["arrowleft"]) dx -= 1;
      if (this.keys["d"] || this.keys["arrowright"]) dx += 1;
      return { dx, dy };
    }

    // Player 2 movement (Arrow keys)
    getP2Movement() {
      let dx = 0, dy = 0;
      if (this.keys["i"]) dy -= 1;
      if (this.keys["k"]) dy += 1;
      if (this.keys["j"]) dx -= 1;
      if (this.keys["l"]) dx += 1;
      return { dx, dy };
    }

    // Player 2 aim with keyboard (TFGH for aim direction)
    getP2AimDirection(playerX, playerY) {
      let aimDx = 0, aimDy = 0;
      if (this.keys["t"]) aimDy -= 1;
      if (this.keys["g"]) aimDy += 1;
      if (this.keys["f"]) aimDx -= 1;
      if (this.keys["h"]) aimDx += 1;

      if (aimDx !== 0 || aimDy !== 0) {
        const len = Math.hypot(aimDx, aimDy);
        aimDx /= len;
        aimDy /= len;
        this.player2Aim.x = playerX + aimDx * 100;
        this.player2Aim.y = playerY + aimDy * 100;
      }

      return this.player2Aim;
    }

    // P1 fire (mouse click)
    isP1Fire() {
      return this.mouse.down;
    }

    // P2 fire (Space key)
    isP2Fire() {
      return this.keys[" "];
    }

    // Check if ability keys pressed
    isActiveAbility() {
      return this.keys["q"];
    }

    isSuperAbility() {
      return this.keys["e"];
    }

    // Fire mode switching
    getFireModeSwitch() {
      if (this.keys["1"]) return "standard";
      if (this.keys["2"]) return "spread";
      if (this.keys["3"]) return "rail";
      if (this.keys["4"]) return "burst";
      return null;
    }

    // Bot placement
    isBotPlacement() {
      return this.keys["b"];
    }

    // Pause
    isPause(key) {
      return key === "p" || key === "escape";
    }
  }

  // Export to global
  window.PlayersManager = PlayersManager;
  window.InputManager = InputManager;

})(window);
