(function(window){
  "use strict";

  class TouchInputManager {
    constructor() {
      this.enabled = false;
      this.moveJoystick = null;
      this.aimJoystick = null;
      this.buttons = {};
      this.moveVector = { dx: 0, dy: 0 };
      this.aimVector = { x: 0, y: 0 };
      this.aimMode = 'dual-stick';
      this.firePressed = false;
      this.secondaryPressed = false;
      this.audioUnlocked = false;
    }

    init(platform) {
      if (!platform.shouldUseTouchControls()) {
        return;
      }

      this.enabled = true;
      this.aimMode = platform.isPortrait() ? 'auto-aim' : 'dual-stick';
      this.platform = platform;
      
      this.createTouchUI();
      this.initTouchListeners();
      this.unlockAudioOnFirstTouch();
      this.setupOrientationListener();
    }
    
    setupOrientationListener() {
      window.addEventListener('orientationchange', (e) => {
        const newMode = e.detail.orientation === 'portrait' ? 'auto-aim' : 'dual-stick';
        if (newMode !== this.aimMode) {
          this.aimMode = newMode;
          this.createTouchUI();
        }
      });
    }

    createTouchUI() {
      const existingUI = document.getElementById('touch-ui');
      if (existingUI) {
        existingUI.remove();
      }

      const touchUI = document.createElement('div');
      touchUI.id = 'touch-ui';
      touchUI.className = 'touch-ui';
      touchUI.innerHTML = `
        <!-- Joystick de movimento compacto -->
        <div class="touch-joystick move-stick" id="move-joystick">
          <div class="joystick-base">
            <div class="joystick-stick"></div>
          </div>
        </div>
        
        <!-- Joystick de mira em landscape -->
        ${this.aimMode === 'dual-stick' ? `
        <div class="touch-joystick aim-stick" id="aim-joystick">
          <div class="joystick-base">
            <div class="joystick-stick"></div>
          </div>
        </div>
        ` : ''}
        
        <!-- Área de disparo (direita) -->
        <div class="fire-zone" id="fire-zone">
          <button class="touch-btn fire-main" id="btn-fire" data-action="fire">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="8"/>
            </svg>
          </button>
          <button class="touch-btn fire-alt" id="btn-secondary" data-action="secondary">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L15 8L22 9L17 14L18 21L12 18L6 21L7 14L2 9L9 8L12 2Z"/>
            </svg>
          </button>
        </div>
        
        <!-- Barra de ações rápidas (topo direito) -->
        <div class="quick-actions">
          <button class="action-btn action-mode" id="btn-mode" data-action="mode" title="Modo de Tiro">
            <span class="action-icon">1</span>
          </button>
          <button class="action-btn action-bots" id="btn-bots" data-action="bots" title="Bots">
            <span class="action-icon">🤖</span>
          </button>
        </div>
        
        <!-- Habilidades (lado direito) -->
        <div class="abilities-bar">
          <button class="ability-btn ability-active" id="btn-active" data-action="active" title="Ativa (Q)">
            <span class="ability-key">Q</span>
            <div class="ability-cooldown"></div>
          </button>
          <button class="ability-btn ability-super" id="btn-super" data-action="super" title="Super (E)">
            <span class="ability-key">E</span>
            <div class="ability-cooldown"></div>
          </button>
        </div>
        
        <!-- Pause (topo esquerdo) -->
        <button class="menu-btn" id="btn-pause-touch" data-action="pause">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16"/>
            <rect x="14" y="4" width="4" height="16"/>
          </svg>
        </button>
        
        <!-- Indicador de auto-aim (apenas portrait) -->
        ${this.aimMode === 'auto-aim' ? `
        <div class="auto-aim-indicator">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/>
            <circle cx="12" cy="12" r="2"/>
            <line x1="12" y1="2" x2="12" y2="6" stroke="currentColor" stroke-width="2"/>
            <line x1="12" y1="18" x2="12" y2="22" stroke="currentColor" stroke-width="2"/>
            <line x1="2" y1="12" x2="6" y2="12" stroke="currentColor" stroke-width="2"/>
            <line x1="18" y1="12" x2="22" y2="12" stroke="currentColor" stroke-width="2"/>
          </svg>
          <span>AUTO</span>
        </div>
        ` : ''}
      `;

      const stage = document.getElementById('stage');
      stage.appendChild(touchUI);

      this.moveJoystick = this.initJoystick('move-joystick');
      if (this.aimMode === 'dual-stick') {
        this.aimJoystick = this.initJoystick('aim-joystick');
      }
      this.initButtons();
    }

    initJoystick(id) {
      const joystick = document.getElementById(id);
      if (!joystick) return null;

      const base = joystick.querySelector('.joystick-base');
      const stick = joystick.querySelector('.joystick-stick');
      
      const joystickData = {
        element: joystick,
        base: base,
        stick: stick,
        active: false,
        touchId: null,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        maxDistance: 45
      };

      const onStart = (e) => {
        e.preventDefault();
        const touch = e.touches ? e.touches[0] : e;
        const rect = base.getBoundingClientRect();
        
        joystickData.active = true;
        joystickData.touchId = e.touches ? touch.identifier : 'mouse';
        joystickData.startX = rect.left + rect.width / 2;
        joystickData.startY = rect.top + rect.height / 2;
        
        joystick.classList.add('active');
        this.updateJoystick(joystickData, touch.clientX, touch.clientY);
      };

      const onMove = (e) => {
        if (!joystickData.active) return;
        e.preventDefault();
        
        const touches = e.touches ? Array.from(e.touches) : [e];
        const touch = touches.find(t => 
          (e.touches && t.identifier === joystickData.touchId) || 
          (!e.touches && joystickData.touchId === 'mouse')
        );
        
        if (touch) {
          this.updateJoystick(joystickData, touch.clientX, touch.clientY);
        }
      };

      const onEnd = (e) => {
        if (!joystickData.active) return;
        
        const touches = e.changedTouches ? Array.from(e.changedTouches) : [e];
        const isOurTouch = touches.some(t => 
          (e.changedTouches && t.identifier === joystickData.touchId) || 
          (!e.changedTouches && joystickData.touchId === 'mouse')
        );
        
        if (isOurTouch) {
          joystickData.active = false;
          joystickData.touchId = null;
          joystick.classList.remove('active');
          stick.style.transform = 'translate(-50%, -50%)';
          
          if (id === 'move-joystick') {
            this.moveVector = { dx: 0, dy: 0 };
          } else if (id === 'aim-joystick') {
            this.aimVector = { x: 0, y: 0 };
          }
        }
      };

      base.addEventListener('touchstart', onStart, { passive: false });
      base.addEventListener('mousedown', onStart);
      
      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('mousemove', onMove);
      
      document.addEventListener('touchend', onEnd);
      document.addEventListener('touchcancel', onEnd);
      document.addEventListener('mouseup', onEnd);

      return joystickData;
    }

    updateJoystick(joystickData, clientX, clientY) {
      const dx = clientX - joystickData.startX;
      const dy = clientY - joystickData.startY;
      const distance = Math.min(Math.hypot(dx, dy), joystickData.maxDistance);
      const angle = Math.atan2(dy, dx);
      
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;
      
      joystickData.stick.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
      
      const normalizedX = x / joystickData.maxDistance;
      const normalizedY = y / joystickData.maxDistance;
      
      if (joystickData.element.id === 'move-joystick') {
        this.moveVector = { 
          dx: normalizedX, 
          dy: normalizedY 
        };
      } else if (joystickData.element.id === 'aim-joystick') {
        this.aimVector = { 
          x: normalizedX, 
          y: normalizedY 
        };
      }
    }

    initButtons() {
      const buttons = document.querySelectorAll('.touch-btn');
      buttons.forEach(btn => {
        const action = btn.dataset.action;
        this.buttons[action] = { element: btn, pressed: false, justPressed: false };
        
        const onStart = (e) => {
          e.preventDefault();
          this.buttons[action].pressed = true;
          this.buttons[action].justPressed = true;
          btn.classList.add('active');
          
          if (action === 'fire') {
            this.firePressed = true;
          } else if (action === 'secondary') {
            this.secondaryPressed = true;
          }
        };
        
        const onEnd = (e) => {
          e.preventDefault();
          this.buttons[action].pressed = false;
          btn.classList.remove('active');
          
          if (action === 'fire') {
            this.firePressed = false;
          } else if (action === 'secondary') {
            this.secondaryPressed = false;
          }
        };
        
        btn.addEventListener('touchstart', onStart, { passive: false });
        btn.addEventListener('mousedown', onStart);
        btn.addEventListener('touchend', onEnd, { passive: false });
        btn.addEventListener('touchcancel', onEnd, { passive: false });
        btn.addEventListener('mouseup', onEnd);
      });
    }

    initTouchListeners() {
      const canvas = document.getElementById('game');
      const stage = document.getElementById('stage');
      
      canvas.style.touchAction = 'none';
      stage.style.touchAction = 'none';
      
      document.addEventListener('touchmove', (e) => {
        if (e.target.closest('#stage')) {
          e.preventDefault();
        }
      }, { passive: false });
    }

    unlockAudioOnFirstTouch() {
      const unlockAudio = () => {
        if (this.audioUnlocked) return;
        
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          const ctx = new AudioContext();
          const buffer = ctx.createBuffer(1, 1, 22050);
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(ctx.destination);
          source.start(0);
          
          this.audioUnlocked = true;
        }
        
        document.removeEventListener('touchstart', unlockAudio);
      };
      
      document.addEventListener('touchstart', unlockAudio, { once: true });
    }

    getMovement() {
      return this.moveVector;
    }

    getAimTarget(playerX, playerY, nearestEnemy) {
      if (this.aimMode === 'dual-stick' && this.aimJoystick) {
        if (Math.abs(this.aimVector.x) > 0.1 || Math.abs(this.aimVector.y) > 0.1) {
          return {
            x: playerX + this.aimVector.x * 300,
            y: playerY + this.aimVector.y * 300
          };
        }
      }
      
      if (nearestEnemy) {
        return { x: nearestEnemy.x, y: nearestEnemy.y };
      }
      
      return { x: playerX, y: playerY - 100 };
    }

    isFiring() {
      return this.firePressed;
    }

    isSecondaryFiring() {
      return this.secondaryPressed;
    }

    isButtonPressed(action) {
      return this.buttons[action] && this.buttons[action].pressed;
    }

    wasButtonJustPressed(action) {
      if (this.buttons[action] && this.buttons[action].justPressed) {
        this.buttons[action].justPressed = false;
        return true;
      }
      return false;
    }

    clearJustPressed() {
      Object.values(this.buttons).forEach(btn => {
        btn.justPressed = false;
      });
    }

    hide() {
      const touchUI = document.getElementById('touch-ui');
      if (touchUI) {
        touchUI.style.display = 'none';
      }
    }

    show() {
      const touchUI = document.getElementById('touch-ui');
      if (touchUI) {
        touchUI.style.display = 'block';
      }
    }

    destroy() {
      const touchUI = document.getElementById('touch-ui');
      if (touchUI) {
        touchUI.remove();
      }
      this.enabled = false;
    }
  }

  window.TouchInputManager = TouchInputManager;

})(window);
