// STUB (integrator) — replaced by the LEVEL 4 agent. Key 'maze', init data { level: 4 }.
import Phaser from 'phaser';
import type { Services } from '../../contracts';
import { SERVICES_KEY } from '../../contracts';

export class MazeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'maze' });
  }

  create(): void {
    const svc = this.registry.get(SERVICES_KEY) as Services;
    this.cameras.main.setBackgroundColor('#141414');
    svc.ui.banner('CICCIO-MAN', { tone: 'info', sub: 'IN ARRIVO', ms: 2000 });
  }
}
