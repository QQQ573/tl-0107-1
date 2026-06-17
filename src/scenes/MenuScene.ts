import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../types';
import { LEVELS } from '../data/levels';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    this.cameras.main.setBackgroundColor('#1a1a2e');

    const g = this.add.graphics();
    for (let i = 0; i < 8; i++) {
      g.fillStyle(0x16213e, 0.3);
      g.fillCircle(
        Phaser.Math.Between(50, GAME_WIDTH - 50),
        Phaser.Math.Between(50, GAME_HEIGHT - 50),
        Phaser.Math.Between(20, 60)
      );
    }

    const title = this.add.text(GAME_WIDTH / 2, 80, '🎒 夏令营行李快检', {
      fontSize: '42px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);

    const desc = this.add.text(GAME_WIDTH / 2, 140, '把传送带上的行李分入正确的分类栏', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#aabbcc',
    });
    desc.setOrigin(0.5);

    const campColors = [0x27ae60, 0x2980b9, 0xe67e22];
    const campIcons = ['🎈', '🔭', '🌍'];

    LEVELS.forEach((level, i) => {
      const y = 230 + i * 120;
      const bg = this.add.graphics();
      bg.fillStyle(campColors[i], 0.2);
      bg.fillRoundedRect(GAME_WIDTH / 2 - 200, y - 40, 400, 90, 12);
      bg.lineStyle(2, campColors[i], 0.6);
      bg.strokeRoundedRect(GAME_WIDTH / 2 - 200, y - 40, 400, 90, 12);

      const label = this.add.text(GAME_WIDTH / 2, y - 12, `${campIcons[i]} ${level.name}`, {
        fontSize: '26px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
        fontStyle: 'bold',
      });
      label.setOrigin(0.5);

      const sub = this.add.text(GAME_WIDTH / 2, y + 22, level.description, {
        fontSize: '14px',
        fontFamily: 'Arial, sans-serif',
        color: '#aabbcc',
      });
      sub.setOrigin(0.5);

      const zone = this.add.zone(GAME_WIDTH / 2, y, 400, 90);
      zone.setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        this.scene.start('RuleCardScene', { levelIndex: i });
      });
    });

    const footer = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 40, '触控 / 鼠标均可操作', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#556677',
    });
    footer.setOrigin(0.5);
  }
}
