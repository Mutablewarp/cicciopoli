/** The boss rush, in order (OWNER: integrator). Each boss lives in its own folder, owned by a boss lane. */
import type { CartoonBossId } from '../../../contracts';
import type { BossDef } from '../api';
import { BRIE } from './brie';
import { BURGERGANG } from './burgergang';
import { DOUBLETRIPLE } from './doubletriple';
import { HAPPY } from './happy';
import { OLDSCHOOL } from './oldschool';
import { PANCETTA } from './pancetta';
import { TUMA } from './tuma';

export const BOSSES: readonly BossDef[] = [BRIE, PANCETTA, TUMA, HAPPY, OLDSCHOOL, DOUBLETRIPLE, BURGERGANG];

export function bossDef(id: CartoonBossId): BossDef {
  const b = BOSSES.find((x) => x.id === id);
  if (!b) throw new Error(`unknown boss ${id}`);
  return b;
}
