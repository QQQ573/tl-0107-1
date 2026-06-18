import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, GameRecords, WrongItemRecord } from '../types';
import { loadRecords, getGlobalAccuracy, getTopWrongItems, hasWrongItems, formatTime, getAllWrongItems } from '../utils/storage';

export class ProfileScene extends Phaser.Scene {
  private records!: GameRecords;

  constructor() {
    super({ key: 'ProfileScene' });
  }

  create() {
    this.records = loadRecords();
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

    const title = this.add.text(GAME_WIDTH / 2, 40, '📋 学员练兵档案', {
      fontSize: '32px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);

    this.buildSummaryPanel();
    this.buildLevelCards();
    this.buildTopWrongItems();
    this.buildBottomButtons();
  }

  private buildSummaryPanel() {
    const panelY = 80;
    const panelH = 80;
    const panelX = 60;
    const panelW = GAME_WIDTH - 120;

    const panel = this.add.graphics();
    panel.fillStyle(0x16213e, 0.8);
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, 12);
    panel.lineStyle(2, 0x3498db, 0.5);
    panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 12);

    const globalAccuracy = getGlobalAccuracy(this.records);
    const accuracyPercent = (globalAccuracy * 100).toFixed(1);

    const items = [
      { label: '累计场次', value: `${this.records.totalPlayCount} 场`, icon: '🎮' },
      { label: '全局准确率', value: `${accuracyPercent}%`, icon: '🎯' },
      { label: '最近游玩', value: formatTime(this.records.lastPlayTime), icon: '⏰' },
    ];

    const itemW = panelW / 3;
    items.forEach((item, i) => {
      const x = panelX + itemW * i + itemW / 2;

      const icon = this.add.text(x, panelY + 28, item.icon, {
        fontSize: '24px',
        fontFamily: 'Arial, sans-serif',
      });
      icon.setOrigin(0.5);

      const label = this.add.text(x, panelY + 55, `${item.label}: ${item.value}`, {
        fontSize: '15px',
        fontFamily: 'Arial, sans-serif',
        color: '#aabbcc',
      });
      label.setOrigin(0.5);
    });
  }

  private buildLevelCards() {
    const cardY = 190;
    const cardH = 160;
    const gap = 20;
    const cardW = (GAME_WIDTH - 120 - gap * 2) / 3;
    const startX = 60;

    const campColors = [0x27ae60, 0x2980b9, 0xe67e22];
    const campIcons = ['🎈', '🔭', '🌍'];

    LEVELS.forEach((level, i) => {
      const record = this.records.levelRecords[i];
      const x = startX + i * (cardW + gap);

      const card = this.add.graphics();
      card.fillStyle(0x16213e, 0.8);
      card.fillRoundedRect(x, cardY, cardW, cardH, 12);
      card.lineStyle(2, campColors[i], 0.5);
      card.strokeRoundedRect(x, cardY, cardW, cardH, 12);

      const header = this.add.text(x + cardW / 2, cardY + 22, `${campIcons[i]} ${level.name}`, {
        fontSize: '18px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
        fontStyle: 'bold',
      });
      header.setOrigin(0.5);

      if (record.playCount === 0) {
        const unplayed = this.add.text(x + cardW / 2, cardY + cardH / 2 + 10, '🔒 未挑战', {
          fontSize: '20px',
          fontFamily: 'Arial, sans-serif',
          color: '#556677',
        });
        unplayed.setOrigin(0.5);
      } else {
        const starsText = this.getStarsText(record.stars);
        const stars = this.add.text(x + cardW / 2, cardY + 52, starsText, {
          fontSize: '22px',
          fontFamily: 'Arial, sans-serif',
          color: '#f1c40f',
        });
        stars.setOrigin(0.5);

        const scoreColor = record.bestSafetyScore > 70 ? '#2ecc71' : record.bestSafetyScore > 40 ? '#f39c12' : '#e74c3c';
        const score = this.add.text(x + cardW / 2, cardY + 85, `🛡 最高安全分: ${record.bestSafetyScore}`, {
          fontSize: '14px',
          fontFamily: 'Arial, sans-serif',
          color: scoreColor,
        });
        score.setOrigin(0.5);

        const plays = this.add.text(x + cardW / 2, cardY + 110, `🔄 挑战次数: ${record.playCount}`, {
          fontSize: '14px',
          fontFamily: 'Arial, sans-serif',
          color: '#aabbcc',
        });
        plays.setOrigin(0.5);

        const accuracy = (record.bestAccuracy * 100).toFixed(0);
        const accText = this.add.text(x + cardW / 2, cardY + 132, `🎯 最佳准确率: ${accuracy}%`, {
          fontSize: '13px',
          fontFamily: 'Arial, sans-serif',
          color: '#7f8c8d',
        });
        accText.setOrigin(0.5);
      }
    });
  }

  private getStarsText(stars: number): string {
    const full = '★'.repeat(stars);
    const empty = '☆'.repeat(3 - stars);
    return full + empty;
  }

  private buildTopWrongItems() {
    const topItems = getTopWrongItems(this.records, 5);
    const panelY = 375;
    const panelX = 60;
    const panelW = GAME_WIDTH - 120;
    const itemCount = Math.max(topItems.length, 1);
    const panelH = 50 + itemCount * 36;

    const panel = this.add.graphics();
    panel.fillStyle(0x16213e, 0.8);
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, 12);
    panel.lineStyle(2, 0xe74c3c, 0.5);
    panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 12);

    this.add.text(panelX + 20, panelY + 18, '📝 最易错物品 TOP5', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#e74c3c',
      fontStyle: 'bold',
    });

    if (topItems.length === 0) {
      this.add.text(panelX + panelW / 2, panelY + panelH / 2 + 10, '🎉 暂无错题记录，继续保持!', {
        fontSize: '16px',
        fontFamily: 'Arial, sans-serif',
        color: '#2ecc71',
      }).setOrigin(0.5);
    } else {
      topItems.forEach((item: WrongItemRecord, i: number) => {
        const y = panelY + 50 + i * 36;

        const rank = this.add.text(panelX + 30, y, `${i + 1}.`, {
          fontSize: '15px',
          fontFamily: 'Arial, sans-serif',
          color: i < 3 ? '#f39c12' : '#7f8c8d',
          fontStyle: 'bold',
        });
        rank.setOrigin(0, 0.5);

        const itemName = this.add.text(panelX + 60, y, item.itemLabel, {
          fontSize: '15px',
          fontFamily: 'Arial, sans-serif',
          color: '#ecf0f1',
        });
        itemName.setOrigin(0, 0.5);

        const wrongInfo = this.add.text(
          panelX + panelW - 30,
          y,
          `误分 ${item.wrongCount} 次  |  最近误归: ${item.lastMisclassifiedCategory}`,
          {
            fontSize: '13px',
            fontFamily: 'Arial, sans-serif',
            color: '#aabbcc',
          }
        );
        wrongInfo.setOrigin(1, 0.5);
      });
    }
  }

  private buildBottomButtons() {
    const btnY = GAME_HEIGHT - 60;
    const hasWrong = hasWrongItems(this.records);

    const backBg = this.add.graphics();
    backBg.fillStyle(0x7f8c8d, 1);
    backBg.fillRoundedRect(60, btnY - 25, 160, 50, 10);
    const backText = this.add.text(140, btnY, '🏠 返回菜单', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    backText.setOrigin(0.5);

    const backZone = this.add.zone(140, btnY, 160, 50);
    backZone.setInteractive({ useHandCursor: true });
    backZone.on('pointerdown', () => {
      this.scene.start('MenuScene');
    });

    const practiceBtnX = GAME_WIDTH - 60 - 180;
    const practiceBg = this.add.graphics();

    if (hasWrong) {
      practiceBg.fillStyle(0xe67e22, 1);
    } else {
      practiceBg.fillStyle(0x555555, 0.5);
    }
    practiceBg.fillRoundedRect(practiceBtnX, btnY - 25, 180, 50, 10);

    const practiceText = this.add.text(practiceBtnX + 90, btnY, '🔥 错题特训', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: hasWrong ? '#ffffff' : '#888888',
      fontStyle: 'bold',
    });
    practiceText.setOrigin(0.5);

    if (hasWrong) {
      const practiceZone = this.add.zone(practiceBtnX + 90, btnY, 180, 50);
      practiceZone.setInteractive({ useHandCursor: true });
      practiceZone.on('pointerdown', () => {
        this.startWrongPractice();
      });
    }
  }

  private startWrongPractice() {
    const wrongItems = getAllWrongItems(this.records);
    if (wrongItems.length === 0) {
      return;
    }

    this.scene.start('GameScene', {
      levelIndex: 0,
      isWrongPractice: true,
      wrongPracticeItems: wrongItems,
    });
  }
}
