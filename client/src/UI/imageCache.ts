/**
 * Preload images so that they show up immediately when entering a new scene.
 */

// Using URL->Image map.
const loadedImages = new Map<string, HTMLImageElement>();

// Loads still in progress, by URL, so a URL is only requested once.
const pendingLoads = new Map<string, Promise<void>>();

/**
 * Gets an image that has already been preloaded.
 * @param url the image's URL
 * @returns the loaded image, or undefined if it isn't loaded (yet)
 */
export function getCachedImage(url: string): HTMLImageElement | undefined {
  return loadedImages.get(url);
}

/**
 * Loads one image into the cache.
 * @param url the image's URL
 * @returns a promise that shows whether loading succeeds
 */
function preloadImage(url: string): Promise<void> {
  if (loadedImages.has(url)) return Promise.resolve();

  const pending = pendingLoads.get(url);
  if (pending) return pending;

  const load = new Promise<void>(resolve => {
    const image = new Image();
    image.onload = () => {
      loadedImages.set(url, image);
      pendingLoads.delete(url);
      resolve();
    };
    image.onerror = () => {
      console.warn(`Could not preload image ${url}`);
      pendingLoads.delete(url);
      resolve();
    };
    image.src = url;
  });
  pendingLoads.set(url, load);
  return load;
}

/**
 * Loads all the given images into the cache at the same time.
 * @param urls the images' URLs
 * @returns a promise that shows whether loading succeeds
 */
export async function preloadImages(urls: readonly string[]): Promise<void> {
  await Promise.all(urls.map(preloadImage));
}
