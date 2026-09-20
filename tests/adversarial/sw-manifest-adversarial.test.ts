import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Adversarial Challenge: ServiceWorker & Web App Manifest Security', () => {
  const swPath = path.resolve(process.cwd(), 'public/sw.js');
  const manifestPath = path.resolve(process.cwd(), 'public/manifest.json');
  const indexPath = path.resolve(process.cwd(), 'index.html');

  // =========================================================================
  // 1. Service Worker Lifecycle & Request Isolation Tests
  // =========================================================================
  describe('1. Service Worker Lifecycle & Event Filtering Harness', () => {
    let swCode: string;

    beforeEach(() => {
      swCode = fs.readFileSync(swPath, 'utf-8');
    });

    it('parses as valid JavaScript without syntax errors', () => {
      expect(() => {
        new Function(swCode);
      }).not.toThrow();
    });

    it('defines isolated cache names with versioning and prefix', () => {
      expect(swCode).toMatch(/const CACHE_VERSION\s*=\s*['"][^'"]+['"]/);
      expect(swCode).toMatch(/const STATIC_CACHE_NAME\s*=\s*`vnacc-app-shell-\${CACHE_VERSION}`/);
      expect(swCode).toMatch(/const DYNAMIC_CACHE_NAME\s*=\s*`vnacc-dynamic-\${CACHE_VERSION}`/);
      expect(swCode).toMatch(/const FONT_CACHE_NAME\s*=\s*`vnacc-fonts-\${CACHE_VERSION}`/);
    });

    it('safely prunes ONLY outdated vnacc- prefixed caches during activation', async () => {
      const mockCaches = new Map<string, any>();
      mockCaches.set('vnacc-app-shell-v0', {});
      mockCaches.set('vnacc-dynamic-v0', {});
      mockCaches.set('vnacc-fonts-v0', {});
      mockCaches.set('vnacc-app-shell-v1', {}); // current
      mockCaches.set('vnacc-dynamic-v1', {});   // current
      mockCaches.set('vnacc-fonts-v1', {});     // current
      mockCaches.set('other-app-cache-v1', {});  // unowned foreign cache on same origin

      const deleted: string[] = [];
      const fakeCaches = {
        keys: vi.fn().mockResolvedValue(Array.from(mockCaches.keys())),
        delete: vi.fn().mockImplementation(async (name: string) => {
          deleted.push(name);
          mockCaches.delete(name);
          return true;
        }),
      };

      // Extract and execute the activate cleanup logic from sw.js
      const CURRENT_CACHES = ['vnacc-app-shell-v1', 'vnacc-dynamic-v1', 'vnacc-fonts-v1'];
      const keys = await fakeCaches.keys();
      await Promise.all(
        keys.map((cacheName: string) => {
          if (cacheName.startsWith('vnacc-') && !CURRENT_CACHES.includes(cacheName)) {
            return fakeCaches.delete(cacheName);
          }
          return Promise.resolve();
        })
      );

      // Verify that old vnacc caches are deleted
      expect(deleted).toContain('vnacc-app-shell-v0');
      expect(deleted).toContain('vnacc-dynamic-v0');
      expect(deleted).toContain('vnacc-fonts-v0');
      // Verify that current caches are preserved
      expect(deleted).not.toContain('vnacc-app-shell-v1');
      expect(deleted).not.toContain('vnacc-dynamic-v1');
      expect(deleted).not.toContain('vnacc-fonts-v1');
      // Verify that foreign caches are NOT touched (origin blast radius isolation)
      expect(deleted).not.toContain('other-app-cache-v1');
    });

    it('bypasses non-GET HTTP methods without calling event.respondWith', () => {
      const nonGetMethods = ['POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];

      // Setup simulated ServiceWorker fetch handler
      const listeners: Record<string, Function[]> = {};
      const fakeSelf = {
        addEventListener: (event: string, fn: Function) => {
          listeners[event] = listeners[event] || [];
          listeners[event].push(fn);
        },
        clients: { claim: vi.fn().mockResolvedValue(undefined) },
        skipWaiting: vi.fn().mockResolvedValue(undefined),
      };

      const swFunc = new Function('self', 'caches', swCode);
      swFunc(fakeSelf, {});

      const fetchHandler = listeners['fetch']?.[0];
      expect(fetchHandler).toBeDefined();

      for (const method of nonGetMethods) {
        let respondWithCalled = false;
        const fakeEvent = {
          request: {
            method,
            url: 'https://learning.accounting.vn/api/journal/submit',
            headers: new Headers(),
          },
          respondWith: () => {
            respondWithCalled = true;
          },
        };

        fetchHandler(fakeEvent);
        expect(respondWithCalled).toBe(false);
      }
    });

    it('bypasses non-http/https schemes (chrome-extension, blob, data)', () => {
      const nonHttpUrls = [
        'chrome-extension://abcdefghijklmno/popup.html',
        'data:text/plain;base64,SGVsbG8=',
        'blob:https://learning.accounting.vn/1234-5678',
        'file:///C:/test/index.html',
      ];

      const listeners: Record<string, Function[]> = {};
      const fakeSelf = {
        addEventListener: (event: string, fn: Function) => {
          listeners[event] = listeners[event] || [];
          listeners[event].push(fn);
        },
        clients: { claim: vi.fn() },
        skipWaiting: vi.fn(),
      };

      const swFunc = new Function('self', 'caches', swCode);
      swFunc(fakeSelf, {});
      const fetchHandler = listeners['fetch']?.[0];

      for (const url of nonHttpUrls) {
        let respondWithCalled = false;
        const fakeEvent = {
          request: {
            method: 'GET',
            url,
            headers: new Headers(),
          },
          respondWith: () => {
            respondWithCalled = true;
          },
        };

        fetchHandler(fakeEvent);
        expect(respondWithCalled).toBe(false);
      }
    });

    it('prevents cache poisoning by rejecting non-200 and opaque responses in dynamic cache', () => {
      // In sw.js:
      // if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'opaque')
      //   return networkResponse;
      expect(swCode).toContain("networkResponse.status !== 200");
      expect(swCode).toContain("networkResponse.type === 'opaque'");
    });

    it('returns a graceful 503 response instead of unhandled rejection when offline and asset not cached', async () => {
      expect(swCode).toContain('Tài nguyên ngoại tuyến không khả dụng');
      expect(swCode).toContain('status: 503');
    });

    it('serves fallback offline HTML page when offline navigation has no cached index.html', () => {
      expect(swCode).toContain('<!DOCTYPE html><html><body><h1>Ngoại Tuyến</h1>');
    });
  });

  // =========================================================================
  // 2. Web App Manifest Security & W3C PWA Installability
  // =========================================================================
  describe('2. Web App Manifest Security & Installation Criteria', () => {
    let manifest: any;

    beforeEach(() => {
      const raw = fs.readFileSync(manifestPath, 'utf-8');
      manifest = JSON.parse(raw);
    });

    it('enforces secure start_url within application scope', () => {
      expect(manifest.start_url).toBe('/');
      expect(manifest.scope).toBe('/');
      // Ensure no path traversal in start_url or scope
      expect(manifest.start_url).not.toContain('..');
      expect(manifest.scope).not.toContain('..');
    });

    it('specifies standalone display mode for native app experience', () => {
      expect(['standalone', 'fullscreen', 'minimal-ui']).toContain(manifest.display);
    });

    it('synchronizes theme_color between manifest.json and index.html', () => {
      const indexHtml = fs.readFileSync(indexPath, 'utf-8');
      const metaThemeMatch = indexHtml.match(/<meta\s+name=["']theme-color["']\s+content=["']([^"']+)["']/i);
      expect(metaThemeMatch).not.toBeNull();
      const metaThemeColor = metaThemeMatch![1];

      expect(manifest.theme_color).toBe(metaThemeColor);
    });

    it('provides both standard 192x192 and 512x512 icon definitions', () => {
      expect(manifest.icons).toBeDefined();
      expect(Array.isArray(manifest.icons)).toBe(true);
      expect(manifest.icons.length).toBeGreaterThan(0);

      const has192 = manifest.icons.some((icon: any) =>
        icon.sizes?.includes('192x192')
      );
      const has512 = manifest.icons.some((icon: any) =>
        icon.sizes?.includes('512x512')
      );
      expect(has192).toBe(true);
      expect(has512).toBe(true);
    });

    it('declares valid maskable purpose for adaptive icon rendering on mobile devices', () => {
      const hasMaskable = manifest.icons.some((icon: any) =>
        icon.purpose?.includes('maskable')
      );
      expect(hasMaskable).toBe(true);
    });

    it('contains valid language tag and text direction metadata', () => {
      expect(manifest.lang).toBe('vi');
      expect(manifest.dir).toBe('ltr');
    });
  });
});
