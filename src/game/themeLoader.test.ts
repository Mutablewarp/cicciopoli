import type Phaser from 'phaser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ArtPack, GameUI } from '../contracts';
import { loadThemeArt, needsArt } from './themeLoader';
import type { ThemeConfig } from './themes';

const A = { module: '../art/a.ts', builder: 'buildA' };
const B = { module: '../art/b.ts', builder: 'buildB' };
const theme = { art: [A, B], required: [], anims: [], loadingText: 'loading' } as unknown as ThemeConfig;
const empty = (name: string): ArtPack => ({ name, sheets: [], images: [], tilesets: [], anims: [] });

/** A scene whose textures and animations all "exist" (nothing needs a placeholder) and a Map registry. */
function fakeScene(): Phaser.Scene {
  const data = new Map<string, unknown>();
  return {
    registry: { get: (k: string) => data.get(k), set: (k: string, v: unknown) => data.set(k, v) },
    textures: { exists: () => true, remove: () => undefined },
    anims: { exists: () => true, remove: () => undefined },
  } as unknown as Phaser.Scene;
}

function fakeUi(): { ui: GameUI; calls: Array<number | null> } {
  const calls: Array<number | null> = [];
  return { ui: { setLoading: (p: number | null) => calls.push(p) } as unknown as GameUI, calls };
}

describe('loadThemeArt', () => {
  beforeEach(() => vi.stubGlobal('requestAnimationFrame', (cb: () => void) => setTimeout(cb, 0)));
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('builds every pack once, then needs no loading screen on the next visit', async () => {
    const scene = fakeScene();
    const build = vi.fn(async (ref: { module: string }) => empty(ref.module));
    const { ui } = fakeUi();
    expect(needsArt(scene, theme)).toBe(true);
    const first = await loadThemeArt(scene, theme, ui, { build });
    expect(first.failed).toEqual([]);
    expect(build).toHaveBeenCalledTimes(2);
    expect(needsArt(scene, theme)).toBe(false);
    await loadThemeArt(scene, theme, ui, { build });
    expect(build).toHaveBeenCalledTimes(2);
  });

  it('reports a pack that fails and builds only that one again on the next visit', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const scene = fakeScene();
    const { ui } = fakeUi();
    const broken = vi.fn(async (ref: { module: string }) => {
      if (ref === B) throw new Error('chunk failed');
      return empty(ref.module);
    });
    const first = await loadThemeArt(scene, theme, ui, { build: broken });
    expect(first.failed).toEqual([B.module]);
    expect(needsArt(scene, theme)).toBe(true);
    const fixed = vi.fn(async (ref: { module: string }) => empty(ref.module));
    const second = await loadThemeArt(scene, theme, ui, { build: fixed });
    expect(second.failed).toEqual([]);
    expect(fixed).toHaveBeenCalledTimes(1);
    expect(fixed).toHaveBeenCalledWith(B);
    expect(needsArt(scene, theme)).toBe(false);
  });

  it('a cancelled load stops at once and never touches the loading screen again', async () => {
    const scene = fakeScene();
    const { ui, calls } = fakeUi();
    let alive = true;
    const build = vi.fn(async (ref: { module: string }) => {
      alive = false; // the menu was opened while the first pack was building
      return empty(ref.module);
    });
    await loadThemeArt(scene, theme, ui, { build, alive: () => alive });
    expect(build).toHaveBeenCalledTimes(1);
    expect(calls).toEqual([0.4]); // only the initial paint, nothing after the cancel
  });
});
