import {afterEach, describe, expect, it, vi} from 'vitest';
import Konva from 'konva';
import {installKonvaStubs} from './helpers/konvaStubs';
import {getCachedImage, preloadImages} from '../src/UI/imageCache';
import {ImageComponent} from '../src/UI/components';

installKonvaStubs();

// Broken image.
const BROKEN = new Set(['/broken.png']);

// How many times each URL was requested.
const requests = new Map<string, number>();

/**
 * Mock for browser's image.
 */
class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  set src(url: string) {
    requests.set(url, (requests.get(url) ?? 0) + 1);
    queueMicrotask(() => (BROKEN.has(url) ? this.onerror : this.onload)?.());
  }
}
vi.stubGlobal('Image', FakeImage);

afterEach(() => vi.mocked(Konva.Image.fromURL).mockClear());

describe('imageCache', () => {
  it('caches each preloaded image', async () => {
    await preloadImages(['/a.png', '/b.png']);

    expect(getCachedImage('/a.png')).toBeInstanceOf(FakeImage);
    expect(getCachedImage('/b.png')).toBeInstanceOf(FakeImage);
  });

  it('requests a URL only once even when there are multiple preload calls', async () => {
    await Promise.all([
      preloadImages(['/once.png']),
      preloadImages(['/once.png']),
    ]);
    const first = getCachedImage('/once.png');
    await preloadImages(['/once.png']);

    expect(requests.get('/once.png')).toBe(1);
    expect(getCachedImage('/once.png')).toBe(first);
  });

  it('still resolves when an image fails but have it be undefined', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(
      preloadImages(['/broken.png', '/ok.png']),
    ).resolves.toBeUndefined();
    expect(getCachedImage('/broken.png')).toBeUndefined();
    expect(getCachedImage('/ok.png')).toBeDefined();
  });

  it('returns undefined for images that were never preloaded', () => {
    expect(getCachedImage('/never.png')).toBeUndefined();
  });
});

describe('ImageComponent with the cache', () => {
  it('draws a preloaded image right away without loading it again', async () => {
    await preloadImages(['/cached.png']);
    const component = new ImageComponent(0, 0, 10, 20, '/cached.png');

    expect(Konva.Image.fromURL).not.toHaveBeenCalled();
    const image = component.getGroup().findOne('Image') as Konva.Image;
    expect(image.image()).toBe(getCachedImage('/cached.png'));
    expect(image.width()).toBe(10);
    expect(image.height()).toBe(20);
  });

  it('falls back to loading the URL when the image is not cached', () => {
    new ImageComponent(0, 0, 10, 20, '/uncached.png');

    expect(Konva.Image.fromURL).toHaveBeenCalledWith(
      '/uncached.png',
      expect.any(Function),
    );
  });
});
