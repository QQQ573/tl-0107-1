import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../types';
import { LEVELS } from '../data/levels';

export class RuleCardScene extends Phaser.Scene {
  constructor() {
    super({ key: 'RuleCardScene' });
  }

  create(data: { levelIndex: number }) {
    const levelIndex = data.levelIndex ?? 0;
    const level = LEVELS[levelIndex];
    this.cameras.main.setBackgroundColor('#0f3460');

    const cardW = 600;
    const cardH = 440;
    const cardX = GAME_WIDTH / 2 - cardW / 2;
    const cardY = 60;

    const card = this.add.graphics();
    card.fillStyle(0x1a1a2e, 0.95);
    card.fillRoundedRect(cardX, cardY, cardW, cardH, 16);
    card.lineStyle(3, 0xe94560, 0.8);
    card.strokeRoundedRect(cardX, cardY, cardW, cardH, 16);

    const header = this.add.text(GAME_WIDTH / 2, cardY + 40, `📋 ${level.name} — 规则卡片`, {
      fontSize: '28px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    header.setOrigin(0.5);

    const divider = this.add.graphics();
    divider.lineStyle(1, 0xe94560, 0.4);
    divider.lineBetween(cardX + 30, cardY + 70, cardX + cardW - 30, cardY + 70);

    level.rules.forEach((rule, i) => {
      const ruleText = this.add.text(cardX + 30, cardY + 90 + i * 55, rule, {
        fontSize: '16px',
        fontFamily: 'Arial, sans-serif',
        color: '#ecf0f1',
        wordWrap: { width: cardW - 60 },
      });
    });

    const timeText = this.add.text(GAME_WIDTH / 2, cardY + cardH - 70, `⏱ 限时 ${level.timeLimitSeconds} 秒  |  📦 完成 ${level.targetCount} 件过关`, {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#f39c12',
    });
    timeText.setOrigin(0.5);

    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x27ae60, 1);
    btnBg.fillRoundedRect(GAME_WIDTH / 2 - 80, cardY + cardH + 20, 160, 50, 10);
    const btn = this.add.text(GAME_WIDTH / 2, cardY + cardH + 45, '开始检查', {
      fontSize: '22px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    btn.setOrigin(0.5);

    const zone = this.add.zone(GAME_WIDTH / 2, cardY + cardH + 45, 160, 50);
    zone.setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => {
      this.scene.start('GameScene', { levelIndex });
    });

    const tip = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 30, '仔细阅读规则后点击开始', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#556677',
    });
    tip.setOrigin(0.5);
  }
}
