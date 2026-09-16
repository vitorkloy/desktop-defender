(function(window){
  "use strict";

  /* ============ STORAGE ABSTRACTION LAYER ============ */
  
  /**
   * Simple storage wrapper over localStorage
   * Provides async API for consistency with potential future IndexedDB migration
   */
  class StorageManager {
    constructor() {
      this.prefix = "";
    }

    /**
     * Get a value from storage
     * @param {string} key - Storage key
     * @param {boolean} _encrypted - Placeholder for encryption flag (unused)
     * @returns {Promise<{value: string}|null>} - Returns {value: string} or null if not found
     */
    async get(key, _encrypted = false) {
      try {
        const value = localStorage.getItem(this.prefix + key);
        if (value === null) {
          return null;
        }
        return { value };
      } catch (e) {
        console.error("Storage get failed for key:", key, e);
        return null;
      }
    }

    /**
     * Set a value in storage
     * @param {string} key - Storage key
     * @param {string} value - Value to store (should be string, use JSON.stringify for objects)
     * @param {boolean} _encrypted - Placeholder for encryption flag (unused)
     * @returns {Promise<void>}
     */
    async set(key, value, _encrypted = false) {
      try {
        localStorage.setItem(this.prefix + key, value);
      } catch (e) {
        console.error("Storage set failed for key:", key, e);
        throw e;
      }
    }

    /**
     * Remove a value from storage
     * @param {string} key - Storage key
     * @param {boolean} _encrypted - Placeholder for encryption flag (unused)
     * @returns {Promise<void>}
     */
    async remove(key, _encrypted = false) {
      try {
        localStorage.removeItem(this.prefix + key);
      } catch (e) {
        console.error("Storage remove failed for key:", key, e);
        throw e;
      }
    }

    /**
     * Clear all storage (use with caution)
     * @returns {Promise<void>}
     */
    async clear() {
      try {
        if (this.prefix) {
          // Clear only prefixed keys if prefix is set
          const keys = Object.keys(localStorage);
          for (const key of keys) {
            if (key.startsWith(this.prefix)) {
              localStorage.removeItem(key);
            }
          }
        } else {
          localStorage.clear();
        }
      } catch (e) {
        console.error("Storage clear failed:", e);
        throw e;
      }
    }
  }

  // Initialize and export storage manager
  window.storage = new StorageManager();

})(window);
