/**
 * Memory Management Utility for Dâu Dâu AutoPack Print
 * 
 * Provides proactive and automatic memory garbage collection, canvas GPU texture release,
 * and blob/object URL tracking to keep client-side RAM low and performance silky smooth (60 FPS).
 */

// Registry for tracking active Object URLs created across the application
const activeObjectUrls = new Set<string>();

/**
 * Register a Blob Object URL so it can be automatically revoked when no longer needed
 */
export function registerBlobUrl(url: string): string {
  if (url && url.startsWith('blob:')) {
    activeObjectUrls.add(url);
  }
  return url;
}

/**
 * Revoke a specific Object URL immediately and remove from tracker
 */
export function revokeBlobUrl(url: string): void {
  if (url && activeObjectUrls.has(url)) {
    try {
      URL.revokeObjectURL(url);
    } catch (e) {
      // ignore
    }
    activeObjectUrls.delete(url);
  }
}

/**
 * Revoke all active Object URLs tracked by the application
 */
export function revokeAllBlobUrls(): void {
  for (const url of activeObjectUrls) {
    try {
      URL.revokeObjectURL(url);
    } catch (e) {
      // ignore
    }
  }
  activeObjectUrls.clear();
}

/**
 * Explicitly release Canvas GPU backing store and memory
 * Setting canvas width & height to 0 frees the underlying memory texture in Chrome, Safari & Firefox.
 */
export function releaseCanvas(canvas: HTMLCanvasElement | null | undefined): void {
  if (!canvas) return;
  try {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    canvas.width = 0;
    canvas.height = 0;
  } catch (e) {
    // ignore
  }
}

/**
 * Run a gentle garbage collection cycle by yielding to the browser's microtask queue
 * and idle callbacks, encouraging the JavaScript engine to reclaim detached DOM nodes and buffers.
 */
export function requestMemoryGarbageCollection(): Promise<void> {
  return new Promise((resolve) => {
    // 1. If running with V8 exposed gc (e.g. electron/node), trigger it
    if (typeof window !== 'undefined' && (window as unknown as { gc?: () => void }).gc) {
      try {
        (window as unknown as { gc: () => void }).gc();
      } catch {}
    }

    // 2. Yield to idle callback or setTimeout
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void }).requestIdleCallback(
        () => resolve(),
        { timeout: 150 }
      );
    } else {
      setTimeout(resolve, 50);
    }
  });
}

/**
 * Perform a deep memory purge:
 * - Revokes all tracked Blob URLs
 * - Triggers asynchronous GC yield
 */
export async function performDeepMemoryCleanup(): Promise<void> {
  revokeAllBlobUrls();
  await requestMemoryGarbageCollection();
}
