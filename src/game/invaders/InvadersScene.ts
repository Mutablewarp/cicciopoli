// STUB (integrator) — replaced by the LEVEL 3 agent. Key 'invaders', init data { level: 3 }.
import Phaser from 'phaser';
import type { Services } from '../../contracts';
import { SERVICES_KEY } from '../../contracts';

export class InvadersScene extends Phaser.Scene {
  constructor() {
    super({ key: 'invaders' });
  }

  create(): void {
    const svc = this.registry.get(SERVICES_KEY) as Services;
    this.cameras.main.setBackgroundColor('#0b0d24');
    svc.ui.banner("CICCIO'S INVADERS", { tone: 'info', sub: 'IN ARRIVO', ms: 2000 });
  }
}
