import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../types';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create() {
    const g = this.add.graphics();

    g.fillStyle(0x2ecc71);
    g.fillCircle(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, 40);
    g.fillStyle(0x3498db);
    g.fillRect(GAME_WIDTH / 2 - 30, GAME_HEIGHT / 2 + 10, 60, 60);
    g.fillStyle(0xe74c3c);
    g.fillTriangle(
      GAME_WIDTH / 2 - 30, GAME_HEIGHT / 2 + 100,
      GAME_WIDTH / 2 + 30, GAME_HEIGHT / 2 + 100,
      GAME_WIDTH / 2, GAME_HEIGHT / 2 + 50
    );
    g.fillStyle(0xf39c12);
    g.beginPath();
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2 - 140;
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI / 5) * i - Math.PI / 2;
      const r = i % 2 === 0 ? 40 : 20;
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.closePath();
    g.fillPath();

    const title = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 150, '夏令营行李快检', {
      fontSize: '36px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);

    const subtitle = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 200, '资源加载中...', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#aaaaaa',
    });
    subtitle.setOrigin(0.5);

    this.time.delayedCall(500, () => {
      this.scene.start('MenuScene');
    });
  }
}
