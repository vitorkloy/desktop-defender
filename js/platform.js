(function(window){
  "use strict";

  class PlatformDetector {
    constructor() {
      this.isTouchDevice = this.detectTouch();
      this.isMobile = this.detectMobile();
      this.isIOS = this.detectIOS();
      this.isAndroid = this.detectAndroid();
      this.orientation = this.getOrientation();
      
      this.initListeners();
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
        window.dispatchEvent(new CustomEvent('orientationchange', { 
          detail: { orientation: this.orientation } 
        }));
      });
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
  }

  window.PlatformDetector = PlatformDetector;

})(window);
