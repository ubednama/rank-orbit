export interface CacheItem<T> {
  value: T;
  expiry: number;
}

export class CacheService {
  private static readonly DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours

  static set<T>(key: string, value: T, ttl: number = this.DEFAULT_TTL): void {
    try {
      if (typeof window === "undefined") return;
      const item: CacheItem<T> = {
        value,
        expiry: Date.now() + ttl,
      };
      localStorage.setItem(key, JSON.stringify(item));
    } catch (error) {
      console.warn("Failed to set cache item:", error);
    }
  }

  static get<T>(key: string): T | null {
    try {
      if (typeof window === "undefined") return null;
      const itemStr = localStorage.getItem(key);
      if (!itemStr) return null;

      const item: CacheItem<T> = JSON.parse(itemStr);
      const now = Date.now();

      if (now > item.expiry) {
        localStorage.removeItem(key);
        return null;
      }

      return item.value;
    } catch (error) {
      console.warn("Failed to get cache item:", error);
      // If corrupted, clear it
      try {
        localStorage.removeItem(key);
      } catch {
        // ignore error
      }
      return null;
    }
  }

  static remove(key: string): void {
    try {
      if (typeof window === "undefined") return;
      localStorage.removeItem(key);
    } catch (error) {
      console.warn("Failed to remove cache item:", error);
    }
  }
}
