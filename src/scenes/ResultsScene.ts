import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, LevelResult, ConfusionEntry } from '../types';
import { LEVELS } from '../data/levels';
import { loadRecords, saveRecords, updateRecordsWithResult, updateWrongItemsAfterPractice, hasWrongItems, getAllWrongItems } from '../utils/storage';

export class ResultsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ResultsScene' });
  }

  create(data: LevelResult & { levelIndex: number; isWrongPractice?: boolean }) {
    const isWrongPractice = data.isWrongPractice ?? false;
    const levelIndex = data.levelIndex ?? 0;
    const level = LEVELS[levelIndex];
    this.cameras.main.setBackgroundColor('#0a0a1a');

    const records = loadRecords();

    if (isWrongPractice) {
      const updatedRecords = updateWrongItemsAfterPractice(records, data.items);
      saveRecords(updatedRecords);
      this.buildWrongPracticeResults(data, updatedRecords);
    } else {
      const updatedRecords = updateRecordsWithResult(
        records,
        levelIndex,
        data.safetyScore,
        data.maxSafetyScore,
        data.items,
        data.supervisorReviews
      );
      saveRecords(updatedRecords);
      this.buildNormalResults(data, levelIndex, level);
    }
  }

  private buildWrongPracticeResults(data: LevelResult & { levelIndex: number }, records: any) {
    const correctCount = data.items.filter((i: any) => i.correct).length;
    const totalCount = data.items.length;
    const accuracy = totalCount > 0 ? (correctCount / totalCount * 100).toFixed(0) : '0';

    const header = this.add.text(GAME_WIDTH / 2, 50, '🔥 错题特训完成!', {
      fontSize: '32px',
      fontFamily: 'Arial, sans-serif',
      color: '#e67e22',
      fontStyle: 'bold',
    });
    header.setOrigin(0.5);

    const subHeader = this.add.text(GAME_WIDTH / 2, 95, '答对的物品错题计数已减少', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#aabbcc',
    });
    subHeader.setOrigin(0.5);

    const panelX = 60;
    const panelW = GAME_WIDTH - 120;

    const statsPanel = this.add.graphics();
    statsPanel.fillStyle(0x16213e, 0.8);
    statsPanel.fillRoundedRect(panelX, 130, panelW, 150, 12);
    statsPanel.lineStyle(2, 0xe67e22, 0.5);
    statsPanel.strokeRoundedRect(panelX, 130, panelW, 150, 12);

    this.add.text(panelX + 30, 155, '📊 特训统计', {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      color: '#e67e22',
      fontStyle: 'bold',
    });

    this.add.text(panelX + 30, 190, `✅ 答对: ${correctCount} / ${totalCount}`, {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#2ecc71',
    });

    this.add.text(panelX + 30, 220, `🎯 准确率: ${accuracy}%`, {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#3498db',
    });

    this.add.text(panelX + 30, 250, `⏱ 平均时间: ${data.averageTimeSeconds.toFixed(1)} 秒/件`, {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#f39c12',
    });

    const remainingWrong = getAllWrongItems(records).length;
    const statusText = remainingWrong > 0
      ? `还有 ${remainingWrong} 种物品需要加强练习`
      : '🎉 太棒了！所有错题都已掌握！';
    const statusColor = remainingWrong > 0 ? '#e74c3c' : '#2ecc71';

    this.add.text(GAME_WIDTH / 2, 310, statusText, {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: statusColor,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const btnY = GAME_HEIGHT - 70;
    const btnW = 180;
    const btnH = 50;

    const hasMoreWrong = hasWrongItems(records);

    if (hasMoreWrong) {
      const againBg = this.add.graphics();
      againBg.fillStyle(0xe67e22, 1);
      againBg.fillRoundedRect(GAME_WIDTH / 2 - btnW - 20, btnY, btnW, btnH, 10);
      const againText = this.add.text(GAME_WIDTH / 2 - btnW / 2 - 20, btnY + btnH / 2, '🔥 继续特训', {
        fontSize: '18px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
        fontStyle: 'bold',
      });
      againText.setOrigin(0.5);

      const againZone = this.add.zone(GAME_WIDTH / 2 - btnW / 2 - 20, btnY + btnH / 2, btnW, btnH);
      againZone.setInteractive({ useHandCursor: true });
      againZone.on('pointerdown', () => {
        const wrongItems = getAllWrongItems(records);
        this.scene.start('GameScene', {
          levelIndex: 0,
          isWrongPractice: true,
          wrongPracticeItems: wrongItems,
        });
      });
    }

    const profileBg = this.add.graphics();
    profileBg.fillStyle(0x9b59b6, 1);
    profileBg.fillRoundedRect(GAME_WIDTH / 2 - btnW / 2 + (hasMoreWrong ? 110 : 0), btnY, btnW, btnH, 10);
    const profileText = this.add.text(GAME_WIDTH / 2 + (hasMoreWrong ? 110 : 0), btnY + btnH / 2, '📋 返回档案', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    profileText.setOrigin(0.5);

    const profileZone = this.add.zone(GAME_WIDTH / 2 + (hasMoreWrong ? 110 : 0), btnY + btnH / 2, btnW, btnH);
    profileZone.setInteractive({ useHandCursor: true });
    profileZone.on('pointerdown', () => {
      this.scene.start('ProfileScene');
    });

    const menuBg = this.add.graphics();
    menuBg.fillStyle(0x3498db, 1);
    menuBg.fillRoundedRect(GAME_WIDTH / 2 - 80, btnY - 55, 160, 42, 10);
    const menuText = this.add.text(GAME_WIDTH / 2, btnY - 34, '🏠 返回菜单', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
    });
    menuText.setOrigin(0.5);

    const menuZone = this.add.zone(GAME_WIDTH / 2, btnY - 34, 160, 42);
    menuZone.setInteractive({ useHandCursor: true });
    menuZone.on('pointerdown', () => {
      this.scene.start('MenuScene');
    });
  }

  private buildNormalResults(data: LevelResult & { levelIndex: number }, levelIndex: number, level: any) {
    const isLastLevel = levelIndex >= LEVELS.length - 1;
    const passed = data.safetyScore >= 40;

    const headerText = passed ? '🎉 关卡完成!' : '😞 关卡未通过';
    const headerColor = passed ? '#2ecc71' : '#e74c3c';

    const header = this.add.text(GAME_WIDTH / 2, 50, headerText, {
      fontSize: '36px',
      fontFamily: 'Arial, sans-serif',
      color: headerColor,
      fontStyle: 'bold',
    });
    header.setOrigin(0.5);

    const campName = this.add.text(GAME_WIDTH / 2, 95, `${level.name}`, {
      fontSize: '22px',
      fontFamily: 'Arial, sans-serif',
      color: '#ecf0f1',
    });
    campName.setOrigin(0.5);

    const panelX = 60;
    const panelW = GAME_WIDTH - 120;

    const statsPanel = this.add.graphics();
    statsPanel.fillStyle(0x16213e, 0.8);
    statsPanel.fillRoundedRect(panelX, 130, panelW, 180, 12);
    statsPanel.lineStyle(2, 0x3498db, 0.5);
    statsPanel.strokeRoundedRect(panelX, 130, panelW, 180, 12);

    this.add.text(panelX + 30, 150, '📊 统计数据', {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      color: '#3498db',
      fontStyle: 'bold',
    });

    const scoreColor = data.safetyScore > 70 ? '#2ecc71' : data.safetyScore > 40 ? '#f39c12' : '#e74c3c';
    this.add.text(panelX + 30, 185, `🛡 安全分: ${data.safetyScore} / ${data.maxSafetyScore}`, {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: scoreColor,
    });

    this.add.text(panelX + 30, 215, `⏱ 平均处理时间: ${data.averageTimeSeconds.toFixed(1)} 秒/件`, {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#f39c12',
    });

    this.add.text(panelX + 30, 245, `👮 主管复核: ${data.supervisorReviews} 次`, {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#e67e22',
    });

    const correctCount = data.items.filter(i => i.correct).length;
    const accuracy = data.items.length > 0 ? (correctCount / data.items.length * 100).toFixed(0) : '0';
    this.add.text(panelX + 30, 275, `✅ 准确率: ${accuracy}%  (${correctCount}/${data.items.length})`, {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#2ecc71',
    });

    if (data.confusionRanking.length > 0) {
      const confusionPanel = this.add.graphics();
      confusionPanel.fillStyle(0x16213e, 0.8);
      confusionPanel.fillRoundedRect(panelX, 330, panelW, 30 + data.confusionRanking.length * 32, 12);
      confusionPanel.lineStyle(2, 0xe74c3c, 0.5);
      confusionPanel.strokeRoundedRect(panelX, 330, panelW, 30 + data.confusionRanking.length * 32, 12);

      this.add.text(panelX + 30, 345, '🔄 最易混淆物品排行', {
        fontSize: '18px',
        fontFamily: 'Arial, sans-serif',
        color: '#e74c3c',
        fontStyle: 'bold',
      });

      data.confusionRanking.forEach((entry: ConfusionEntry, i: number) => {
        const y = 378 + i * 32;
        this.add.text(panelX + 40, y, `${i + 1}. ${entry.itemLabel}  →  误分为 ${entry.commonMistake}  (${entry.timesMisclassified}次)`, {
          fontSize: '15px',
          fontFamily: 'Arial, sans-serif',
          color: '#ecf0f1',
        });
      });
    }

    const btnY = GAME_HEIGHT - 70;
    const btnW = 180;
    const btnH = 50;

    const retryBg = this.add.graphics();
    retryBg.fillStyle(0xe67e22, 1);
    retryBg.fillRoundedRect(GAME_WIDTH / 2 - btnW - 20, btnY, btnW, btnH, 10);
    const retryText = this.add.text(GAME_WIDTH / 2 - btnW / 2 - 20, btnY + btnH / 2, '🔄 重新挑战', {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    retryText.setOrigin(0.5);

    const retryZone = this.add.zone(GAME_WIDTH / 2 - btnW / 2 - 20, btnY + btnH / 2, btnW, btnH);
    retryZone.setInteractive({ useHandCursor: true });
    retryZone.on('pointerdown', () => {
      this.scene.start('RuleCardScene', { levelIndex });
    });

    if (passed && !isLastLevel) {
      const nextBg = this.add.graphics();
      nextBg.fillStyle(0x27ae60, 1);
      nextBg.fillRoundedRect(GAME_WIDTH / 2 + 20, btnY, btnW, btnH, 10);
      const nextText = this.add.text(GAME_WIDTH / 2 + btnW / 2 + 20, btnY + btnH / 2, '▶ 下一关', {
        fontSize: '20px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
        fontStyle: 'bold',
      });
      nextText.setOrigin(0.5);

      const nextZone = this.add.zone(GAME_WIDTH / 2 + btnW / 2 + 20, btnY + btnH / 2, btnW, btnH);
      nextZone.setInteractive({ useHandCursor: true });
      nextZone.on('pointerdown', () => {
        this.scene.start('RuleCardScene', { levelIndex: levelIndex + 1 });
      });
    }

    const menuBg = this.add.graphics();
    menuBg.fillStyle(0x3498db, 1);
    menuBg.fillRoundedRect(GAME_WIDTH / 2 - 80, btnY - 55, 160, 42, 10);
    const menuText = this.add.text(GAME_WIDTH / 2, btnY - 34, '🏠 返回菜单', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
    });
    menuText.setOrigin(0.5);

    const menuZone = this.add.zone(GAME_WIDTH / 2, btnY - 34, 160, 42);
    menuZone.setInteractive({ useHandCursor: true });
    menuZone.on('pointerdown', () => {
      this.scene.start('MenuScene');
    });
  }
}
