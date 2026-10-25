/** Draw order of level 8 (boss arenas use depth < 0 for their backgrounds; the boss sprites sit at 0). */
export const DEPTH = {
  hero: 10,
  shot: 12,
  minion: 13,
  hazard: 14,
  fx: 16,
  rain: 18,
  balloon: 30,
  title: 40,
  /** the golden ticket plays under the film grain */
  finale: 45,
  film: 50,
  frame: 60,
} as const;
