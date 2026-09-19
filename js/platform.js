(function(window){
  "use strict";

  class PlatformDetector {
    constructor() {
      this.isTouchDevice = this.detectTouch();
      this.isMobile = this.detectMobile();
      this.isIOS = this.detectIOS();
      this.isAndroid = this.detectAndroid();
      this.orientation = this.getOrientation();
      this.orientationLockAttempted = false;
      this.landscapeWarning = null;
      
      this.initListeners();
      this.initLandscapeEnforcement();
    }

    detectTouch() {
      return ('ontouchstart' in window) || 
             (navigator.maxTouchPoints > 0) || 
             (navigator.msMaxTouchPoints > 0);
    }

    detectMobile() {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    detectIOS() {
      return /iPhone|iPad|iPod/i.test(navigator.userAgent);
    }

    detectAndroid() {
      return /Android/i.test(navigator.userAgent);
    }

    getOrientation() {
      if (window.innerWidth > window.innerHeight) {
        return 'landscape';
      } else {
        return 'portrait';
      }
    }

    initListeners() {
      window.addEventListener('resize', () => {
        this.orientation = this.getOrientation();
        this.updateLandscapeWarning();
        window.dispatchEvent(new CustomEvent('orientationchange', { 
          detail: { orientation: this.orientation } 
        }));
      });

      window.addEventListener('orientationchange', () => {
        setTimeout(() => {
          this.orientation = this.getOrientation();
          this.updateLandscapeWarning();
        }, 100);
      });
    }

    initLandscapeEnforcement() {
      if (!this.shouldUseTouchControls()) {
        return;
      }

      this.landscapeWarning = document.getElementById('landscape-warning');
      if (!this.landscapeWarning) {
        return;
      }

      this.updateLandscapeWarning();

      document.addEventListener('click', () => {
        this.tryLockOrientation();
      }, { once: true });

      document.addEventListener('touchstart', () => {
        this.tryLockOrientation();
      }, { once: true });
    }

    async tryLockOrientation() {
      if (this.orientationLockAttempted || !this.shouldUseTouchControls()) {
        return;
      }

      this.orientationLockAttempted = true;

      if (!screen.orientation || !screen.orientation.lock) {
        return;
      }

      try {
        await screen.orientation.lock('landscape');
      } catch (err) {
        console.log('Screen orientation lock not supported or denied:', err.message);
      }
    }

    updateLandscapeWarning() {
      if (!this.landscapeWarning || !this.shouldUseTouchControls()) {
        return;
      }

      if (this.isPortrait()) {
        this.landscapeWarning.classList.remove('hidden');
      } else {
        this.landscapeWarning.classList.add('hidden');
      }
    }

    shouldUseTouchControls() {
      return this.isTouchDevice;
    }

    shouldDisableMultiplayer() {
      return this.isTouchDevice;
    }

    isPortrait() {
      return this.orientation === 'portrait';
    }

    isLandscape() {
      return this.orientation === 'landscape';
    }

    isGameplayBlocked() {
      return this.shouldUseTouchControls() && this.isPortrait();
    }
  }

  window.PlatformDetector = PlatformDetector;

})(window);
