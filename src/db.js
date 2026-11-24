const DB_NAME = 'vastra_fashion_channel_db';
const DB_VERSION = 1;
const STORE_NAME = 'state';

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function dbGet(key) {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    try {
      const raw = localStorage.getItem(`vastra_${key}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}

export async function dbSet(key, value) {
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const req = tx.objectStore(STORE_NAME).put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    try {
      localStorage.setItem(`vastra_${key}`, JSON.stringify(value));
    } catch {
      // Storage full fallback ignored
    }
  }
}

export async function dbClear() {
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const req = tx.objectStore(STORE_NAME).clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // ignore
  }
  try {
    localStorage.removeItem('vastra_channel');
    localStorage.removeItem('vastra_collections');
    localStorage.removeItem('vastra_items');
  } catch {
    // ignore
  }
}

/**
 * Optimizes an uploaded File into a crisp, web-ready base64 JPEG/WebP Data URL
 * so even 8MB phone camera photos store quickly in IndexedDB and load instantly.
 */
export function compressImageFile(file, maxDimension = 1400, quality = 0.86) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => resolve(event.target.result);
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const output = canvas.toDataURL('image/jpeg', quality);
        resolve(output);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}
