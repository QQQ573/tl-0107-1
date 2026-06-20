import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, GameRecords, AchievementDef } from '../types';
import { ACHIEVEMENTS, ACHIEVEMENT_CATEGORY_LABELS } from '../data/achievements';
import { loadRecords, formatTime } from '../utils/storage';

export class AchievementScene extends Phaser.Scene {
  private records!: GameRecords;
  private detailPanel!: Phaser.GameObjects.Container;
  private detailBg!: Phaser.GameObjects.Graphics;
  private detailIcon!: Phaser.GameObjects.Text;
  private detailTitle!: Phaser.GameObjects.Text;
  private detailDesc!: Phaser.GameObjects.Text;
  private detailTime!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'AchievementScene' });
  }

  create() {
    this.records = loadRecords();
    this.cameras.main.setBackgroundColor('#1a1a2e');

    const g = this.add.graphics();
    for (let i = 0; i < 10; i++) {
      g.fillStyle(0x16213e, 0.3);
      g.fillCircle(
        Phaser.Math.Between(50, GAME_WIDTH - 50),
        Phaser.Math.Between(50, GAME_HEIGHT - 50),
        Phaser.Math.Between(15, 50)
      );
    }

    const title = this.add.text(GAME_WIDTH / 2, 35, '🏆 徽章成就墙', {
      fontSize: '30px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);

    const unlocked = this.records.unlockedAchievementIds.length;
    const total = ACHIEVEMENTS.length;
    const progress = this.add.text(GAME_WIDTH / 2, 70, `已解锁 ${unlocked} / ${total}`, {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#aabbcc',
    });
    progress.setOrigin(0.5);

    const backBg = this.add.graphics();
    backBg.fillStyle(0x7f8c8d, 1);
    backBg.fillRoundedRect(20, 20, 100, 40, 8);
    const backText = this.add.text(70, 40, '← 返回', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
    });
    backText.setOrigin(0.5);
    const backZone = this.add.zone(70, 40, 100, 40);
    backZone.setInteractive({ useHandCursor: true });
    backZone.on('pointerdown', () => {
      this.scene.start('ProfileScene');
    });

    this.buildAchievementGrid();
    this.buildDetailPanel();
  }

  private buildAchievementGrid() {
    const categories: string[] = ['camp', 'skill', 'collection', 'special'];
    let currentY = 100;

    categories.forEach((cat) => {
      const catAchievements = ACHIEVEMENTS.filter((a) => a.category === cat);
      if (catAchievements.length === 0) return;

      const catLabel = this.add.text(50, currentY, ACHIEVEMENT_CATEGORY_LABELS[cat] || cat, {
        fontSize: '18px',
        fontFamily: 'Arial, sans-serif',
        color: '#f39c12',
        fontStyle: 'bold',
      });
      catLabel.setOrigin(0, 0.5);

      currentY += 30;

      const cols = 5;
      const cellW = 100;
      const cellH = 110;
      const gapX = 15;
      const startX = (GAME_WIDTH - (cols * cellW + (cols - 1) * gapX)) / 2;

      catAchievements.forEach((achievement, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = startX + col * (cellW + gapX) + cellW / 2;
        const y = currentY + row * (cellH + 10) + cellH / 2;

        const isUnlocked = this.records.unlockedAchievementIds.includes(achievement.id);

        const card = this.add.graphics();
        if (isUnlocked) {
          card.fillStyle(0x2c3e50, 0.9);
        } else {
          card.fillStyle(0x2c2c3c, 0.6);
        }
        card.fillRoundedRect(x - cellW / 2, y - cellH / 2, cellW, cellH, 10);
        card.lineStyle(2, isUnlocked ? 0xf39c12 : 0x555555, isUnlocked ? 0.8 : 0.4);
        card.strokeRoundedRect(x - cellW / 2, y - cellH / 2, cellW, cellH, 10);

        const iconSize = '36px';
        const icon = this.add.text(x, y - 25, achievement.icon, {
          fontSize: iconSize,
          fontFamily: 'Arial, sans-serif',
        });
        icon.setOrigin(0.5);
        if (!isUnlocked) {
          icon.setAlpha(0.3);
        }

        const nameText = this.add.text(x, y + 20, achievement.title, {
          fontSize: '13px',
          fontFamily: 'Arial, sans-serif',
          color: isUnlocked ? '#ecf0f1' : '#666677',
          wordWrap: { width: cellW - 10, useAdvancedWrap: true },
          align: 'center',
        });
        nameText.setOrigin(0.5, 0);

        if (isUnlocked) {
          const unlockTime = this.records.achievementUnlockTimes[achievement.id];
          if (unlockTime) {
            const timeText = this.add.text(x, y + cellH / 2 - 8, formatTime(unlockTime), {
              fontSize: '10px',
              fontFamily: 'Arial, sans-serif',
              color: '#7f8c8d',
            });
            timeText.setOrigin(0.5);
          }
        } else {
          const lockText = this.add.text(x, y + cellH / 2 - 10, '🔒 未解锁', {
            fontSize: '11px',
            fontFamily: 'Arial, sans-serif',
            color: '#555566',
          });
          lockText.setOrigin(0.5);
        }

        const hitZone = this.add.zone(x, y, cellW, cellH);
        hitZone.setInteractive({ useHandCursor: true });
        hitZone.on('pointerover', () => {
          this.showDetail(achievement, isUnlocked);
        });
        hitZone.on('pointerout', () => {
          this.hideDetail();
        });
        hitZone.on('pointerdown', () => {
          this.showDetail(achievement, isUnlocked);
        });
      });

      const rows = Math.ceil(catAchievements.length / cols);
      currentY += rows * (cellH + 10) + 20;
    });
  }

  private buildDetailPanel() {
    this.detailPanel = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT - 80);
    this.detailPanel.setDepth(100);
    this.detailPanel.setVisible(false);

    this.detailBg = this.add.graphics();
    this.detailBg.fillStyle(0x0a0a1a, 0.95);
    this.detailBg.fillRoundedRect(-200, -45, 400, 90, 12);
    this.detailBg.lineStyle(2, 0xf39c12, 0.8);
    this.detailBg.strokeRoundedRect(-200, -45, 400, 90, 12);
    this.detailPanel.add(this.detailBg);

    this.detailIcon = this.add.text(-160, 0, '🏆', {
      fontSize: '40px',
      fontFamily: 'Arial, sans-serif',
    });
    this.detailIcon.setOrigin(0.5);
    this.detailPanel.add(this.detailIcon);

    this.detailTitle = this.add.text(-110, -18, '', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    this.detailTitle.setOrigin(0, 0.5);
    this.detailPanel.add(this.detailTitle);

    this.detailDesc = this.add.text(-110, 8, '', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#aabbcc',
      wordWrap: { width: 280, useAdvancedWrap: true },
    });
    this.detailDesc.setOrigin(0, 0.5);
    this.detailPanel.add(this.detailDesc);

    this.detailTime = this.add.text(170, -18, '', {
      fontSize: '11px',
      fontFamily: 'Arial, sans-serif',
      color: '#7f8c8d',
    });
    this.detailTime.setOrigin(1, 0.5);
    this.detailPanel.add(this.detailTime);
  }

  private showDetail(achievement: AchievementDef, isUnlocked: boolean) {
    this.detailIcon.setText(achievement.icon);
    this.detailIcon.setAlpha(isUnlocked ? 1 : 0.3);

    this.detailTitle.setText(achievement.title);
    this.detailTitle.setColor(isUnlocked ? '#ffffff' : '#666677');

    this.detailDesc.setText(achievement.description);

    if (isUnlocked) {
      const unlockTime = this.records.achievementUnlockTimes[achievement.id];
      this.detailTime.setText(unlockTime ? `解锁于 ${formatTime(unlockTime)}` : '');
    } else {
      this.detailTime.setText('🔒 未解锁');
    }

    this.detailPanel.setVisible(true);
  }

  private hideDetail() {
    this.detailPanel.setVisible(false);
  }
}
