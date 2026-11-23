<script>
  //Delete local storage
  (async function riotLogout() {
    const clearRiotBrowserData = function(clearBlacklist = []){
      const now = Date.now();
      const TEN_HOURS_MS = 10 * 60 * 60 * 1000;

      let localStorageData = {};
      // Keep some localStorage variables after the clear (e.g. 'mx_local_settings')
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const shouldKeep = clearBlacklist.some(substring => key.includes(substring));
        if (shouldKeep) {
            const match = key.match(/(\d+)$/);
            if (!match) {
              localStorageData[key] = localStorage.getItem(key);
              continue;
            }
            // Keep timestamped entries only if they are less than 10h old
            const timestamp = parseInt(match[0], 10);
            const ageMs = now - timestamp;
            if (ageMs < TEN_HOURS_MS) {
              localStorageData[key] = localStorage.getItem(key);
            }
        }
      }

      // Clear the localStorage
      localStorage.clear();

      // Put back saved variable to localStorage
      Object.entries(localStorageData).forEach(([variableName, data]) => {
        localStorage.setItem(variableName, data);
      })

      navigator.serviceWorker.getRegistration(location.origin + "/sites/all/libraries/riot/sw.js").then(async (registration) => {
        if (registration) {
          await registration.unregister();
        }

        const dbs = await window.indexedDB.databases();
        const targets = [
          'matrix-js-sdk::matrix-sdk-crypto',
          'matrix-js-sdk:riot-web-sync',
          'matrix-js-sdk:crypto',
          'matrix-react-sdk'
        ];

        // Instead of indexedDB.deleteDatabase (which blocks indefinitely when other tabs still hold a connection on the same DB), 
        // we open the DB and wipe each object store. 
        // This works regardless of how many tabs are using the DB — IndexedDB transactions are serialized but never deadlocked. 
        // The next login boots with empty stores → no account-mismatch on the new device_id.
        const wipeDb = async (dbName) => {
          try {
            const db = await new Promise((resolve, reject) => {
              const req = indexedDB.open(dbName);
              req.onsuccess = () => resolve(req.result);
              req.onerror = () => reject(req.error);
              req.onblocked = () => reject(new Error("blocked"));
            });
            try {
              const storeNames = Array.from(db.objectStoreNames);
              if (storeNames.length === 0) return;
              const tx = db.transaction(storeNames, "readwrite");
              for (const name of storeNames) {
                tx.objectStore(name).clear();
              }
              await new Promise((resolve, reject) => {
                tx.oncomplete = resolve;
                tx.onerror = () => reject(tx.error);
                tx.onabort = () => reject(new Error("abort"));
              });
            } finally {
              db.close();
            }
            console.log(`[GofastRiotLogout] wiped ${dbName}:`);
          } catch (e) {
            console.warn(`[GofastRiotLogout] failed to wipe ${dbName}:`, e, ', deleting indexedDB instead');
            // Fallback to Deleting the indexedDB instead.
            indexedDB.deleteDatabase(dbName);
          }
        };

        for (const db of dbs) {
          const dbName = db.name;
          if (targets.includes(dbName) || targets.some(t => dbName.startsWith(t))) {
            wipeDb(dbName);
          }
        }
      });
    }
    clearRiotBrowserData(["mx_local_settings", "mx_crypto_initialised-"]);
  })();
</script>
