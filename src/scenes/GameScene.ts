import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, ItemCategory, ItemDef, ProcessedItem } from '../types';
import { LEVELS } from '../data/levels';

interface LuggageItem extends Phaser.GameObjects.Container {
  itemDef: ItemDef;
  spawnTime: number;
  dragStartX: number;
  dragStartY: number;
  bobTween?: Phaser.Tweens.Tween;
}

const ZONE_COLORS: Record<ItemCategory, number> = {
  allowed: 0x27ae60,
  inspect: 0xf39c12,
  prohibited: 0xe74c3c,
};

const ZONE_LABELS: Record<ItemCategory, string> = {
  allowed: '✅ 可入营',
  inspect: '🔍 需开箱',
  prohibited: '🚫 禁止携带',
};

export class GameScene extends Phaser.Scene {
  private levelIndex: number = 0;
  private safetyScore: number = 100;
  private maxSafetyScore: number = 100;
  private consecutiveErrors: number = 0;
  private supervisorReviews: number = 0;
  private processedItems: ProcessedItem[] = [];
  private currentItem: LuggageItem | null = null;
  private itemQueue: ItemDef[] = [];
  private processedCount: number = 0;
  private targetCount: number = 15;
  private levelStartTime: number = 0;
  private conveyorBelt!: Phaser.GameObjects.Graphics;
  private conveyorArrows!: Phaser.GameObjects.Graphics;
  private zones: { category: ItemCategory; x: number; y: number; w: number; h: number; graphics: Phaser.GameObjects.Graphics }[] = [];
  private scoreText!: Phaser.GameObjects.Text;
  private countText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private feedbackText!: Phaser.GameObjects.Text;
  private itemLabel!: Phaser.GameObjects.Text;
  private ruleHintText!: Phaser.GameObjects.Text;
  private isSupervisorReview: boolean = false;
  private finished: boolean = false;
  private supervisorOverlay: Phaser.GameObjects.Container | null = null;
  private conveyorOffset: number = 0;
  private timeLimitSeconds: number = 120;
  private lastSpawnTime: number = 0;
  private isWrongPractice: boolean = false;
  private wrongPracticeItems: ItemDef[] = [];

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { levelIndex: number; isWrongPractice?: boolean; wrongPracticeItems?: ItemDef[] }) {
    this.levelIndex = data.levelIndex ?? 0;
    this.safetyScore = 100;
    this.maxSafetyScore = 100;
    this.consecutiveErrors = 0;
    this.supervisorReviews = 0;
    this.processedItems = [];
    this.currentItem = null;
    this.itemQueue = [];
    this.processedCount = 0;
    this.targetCount = 15;
    this.isSupervisorReview = false;
    this.supervisorOverlay = null;
    this.finished = false;
    this.conveyorOffset = 0;
    this.lastSpawnTime = 0;
    this.timeLimitSeconds = 120;
    this.zones = [];
    this.isWrongPractice = data.isWrongPractice ?? false;
    this.wrongPracticeItems = data.wrongPracticeItems ?? [];
  }

  create() {
    try {
      this.cameras.main.setBackgroundColor('#0a0a1a');

      this.buildConveyorBelt();
      this.buildZones();
      this.buildHUD();

      if (this.isWrongPractice && this.wrongPracticeItems.length > 0) {
        const practiceItems = [...this.wrongPracticeItems, ...this.wrongPracticeItems];
        this.itemQueue = this.safeShuffle(practiceItems);
        this.targetCount = this.itemQueue.length;
        this.timeLimitSeconds = Math.max(60, this.targetCount * 10);
        this.levelStartTime = this.time.now;

        const title = this.add.text(GAME_WIDTH / 2, 110, '🔥 错题特训模式', {
          fontSize: '24px',
          fontFamily: 'Arial, sans-serif',
          color: '#e67e22',
          fontStyle: 'bold',
        });
        title.setOrigin(0.5);

        const desc = this.add.text(GAME_WIDTH / 2, 140, '答对可减少错题计数，加油！', {
          fontSize: '14px',
          fontFamily: 'Arial, sans-serif',
          color: '#aabbcc',
        });
        desc.setOrigin(0.5);
      } else {
        const level = LEVELS[this.levelIndex];
        this.targetCount = level.targetCount;
        this.timeLimitSeconds = level.timeLimitSeconds;
        this.levelStartTime = this.time.now;
        this.buildRuleHint(level);
        this.itemQueue = this.generateItemQueue(level);
      }

      console.log('GameScene created, queue length:', this.itemQueue.length, 'isWrongPractice:', this.isWrongPractice);

      this.time.addEvent({
        delay: 800,
        callback: this.spawnNextItem,
        callbackScope: this,
      });
    } catch (e) {
      console.error('Error in GameScene create:', e);
    }
  }

  update(_time: number, _delta: number) {
    try {
      if (this.finished) return;

      this.conveyorOffset += 0.5;
      if (this.conveyorBelt && this.conveyorBelt.active) {
        this.drawConveyorBelt();
      }

      if (this.processedCount >= this.targetCount) {
        this.finishLevel();
        return;
      }

      const elapsed = (this.time.now - this.levelStartTime) / 1000;
      const remaining = Math.max(0, this.timeLimitSeconds - elapsed);
      if (this.timerText && this.timerText.active) {
        this.timerText.setText(`⏱ ${Math.ceil(remaining)}s`);

        const ratio = remaining / this.timeLimitSeconds;
        let timerColor = '#f39c12';
        if (ratio > 0.5) timerColor = '#2ecc71';
        else if (ratio > 0.2) timerColor = '#f39c12';
        else timerColor = '#e74c3c';
        this.timerText.setColor(timerColor);

        if (ratio <= 0.2 && remaining > 0) {
          const pulse = Math.sin(this.time.now / 150) * 0.3 + 0.7;
          this.timerText.setAlpha(pulse);
        } else {
          this.timerText.setAlpha(1);
        }
      }

      if (remaining <= 0) {
        this.finishLevel();
      }

      const hasActiveItem = this.currentItem && this.currentItem.active;
      const timeSinceLastSpawn = (this.time.now - this.lastSpawnTime) / 1000;
      if (!hasActiveItem && !this.isSupervisorReview && this.itemQueue && this.itemQueue.length > 0 && elapsed > 1.5 && timeSinceLastSpawn > 0.8) {
        console.log('Auto-spawning item - safety guard triggered, elapsed:', elapsed.toFixed(1), 'timeSinceLastSpawn:', timeSinceLastSpawn.toFixed(1));
        this.spawnNextItem();
      }
    } catch (e) {
      console.error('Error in update:', e);
    }
  }

  private buildConveyorBelt() {
    this.conveyorBelt = this.add.graphics();
    this.conveyorArrows = this.add.graphics();
    this.drawConveyorBelt();

    const beltLabel = this.add.text(GAME_WIDTH / 2, 30, '📤 传送带', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#7f8c8d',
    });
    beltLabel.setOrigin(0.5);
  }

  private drawConveyorBelt() {
    const g = this.conveyorBelt;
    g.clear();

    g.fillStyle(0x2c3e50);
    g.fillRect(60, 50, GAME_WIDTH - 120, 50);

    g.lineStyle(2, 0x34495e, 0.8);
    for (let x = 60 + (this.conveyorOffset % 40); x < GAME_WIDTH - 60; x += 40) {
      g.lineBetween(x, 50, x, 100);
    }

    g.lineStyle(3, 0x7f8c8d);
    g.strokeRect(60, 50, GAME_WIDTH - 120, 50);

    const ag = this.conveyorArrows;
    ag.clear();
    ag.fillStyle(0x95a5a6, 0.5);
    const arrowOffset = (this.conveyorOffset * 2) % 80;
    for (let x = 80 + arrowOffset; x < GAME_WIDTH - 80; x += 80) {
      ag.fillTriangle(x, 75, x + 12, 68, x + 12, 82);
    }
  }

  private buildZones() {
    const zoneW = 240;
    const zoneH = 160;
    const zoneY = GAME_HEIGHT - zoneH - 60;
    const gap = 40;
    const totalW = zoneW * 3 + gap * 2;
    const startX = (GAME_WIDTH - totalW) / 2;

    const categories: ItemCategory[] = ['allowed', 'inspect', 'prohibited'];
    categories.forEach((cat, i) => {
      const x = startX + i * (zoneW + gap);
      const g = this.add.graphics();

      g.fillStyle(ZONE_COLORS[cat], 0.15);
      g.fillRoundedRect(x, zoneY, zoneW, zoneH, 12);
      g.lineStyle(3, ZONE_COLORS[cat], 0.7);
      g.strokeRoundedRect(x, zoneY, zoneW, zoneH, 12);

      const label = this.add.text(x + zoneW / 2, zoneY + 20, ZONE_LABELS[cat], {
        fontSize: '20px',
        fontFamily: 'Arial, sans-serif',
        color: Phaser.Display.Color.IntegerToColor(ZONE_COLORS[cat]).rgba,
        fontStyle: 'bold',
      });
      label.setOrigin(0.5);

      this.zones.push({ category: cat, x, y: zoneY, w: zoneW, h: zoneH, graphics: g });
    });
  }

  private buildHUD() {
    this.scoreText = this.add.text(20, GAME_HEIGHT - 30, '🛡 安全分: 100', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#2ecc71',
      fontStyle: 'bold',
    });

    this.countText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 30, '📦 0 / 15', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#ecf0f1',
      fontStyle: 'bold',
    });
    this.countText.setOrigin(0.5);

    this.timerText = this.add.text(GAME_WIDTH - 20, GAME_HEIGHT - 30, `⏱ ${this.timeLimitSeconds}s`, {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#f39c12',
      fontStyle: 'bold',
    });
    this.timerText.setOrigin(1, 0);

    this.feedbackText = this.add.text(GAME_WIDTH / 2, 240, '', {
      fontSize: '28px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    this.feedbackText.setOrigin(0.5);
    this.feedbackText.setAlpha(0);

    this.itemLabel = this.add.text(GAME_WIDTH / 2, 130, '', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#ecf0f1',
    });
    this.itemLabel.setOrigin(0.5);
  }

  private buildRuleHint(level: typeof LEVELS[0]) {
    this.ruleHintText = this.add.text(GAME_WIDTH - 15, 110, '', {
      fontSize: '11px',
      fontFamily: 'Arial, sans-serif',
      color: '#7f8c8d',
      align: 'right',
      wordWrap: { width: 180 },
    });
    this.ruleHintText.setOrigin(1, 0);
    this.ruleHintText.setText(level.rules.join('\n'));
  }

  private safeShuffle<T>(array: T[]): T[] {
    try {
      if (Phaser.Utils && Phaser.Utils.Array && typeof Phaser.Utils.Array.Shuffle === 'function') {
        const copy = [...array];
        Phaser.Utils.Array.Shuffle(copy);
        return copy;
      }
    } catch (e) {
      console.warn('Phaser shuffle failed, using fallback:', e);
    }
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  private generateItemQueue(level: typeof LEVELS[0]): ItemDef[] {
    const items = [...level.items];
    const distractorCount = Math.floor(this.targetCount * level.distractorRatio);
    const normalCount = this.targetCount - distractorCount;

    const shuffled = this.safeShuffle(items);
    const queue: ItemDef[] = [];

    for (let i = 0; i < normalCount && i < shuffled.length; i++) {
      queue.push(shuffled[i]);
    }

    const distractorItems = this.safeShuffle([...level.items]);
    for (let i = 0; i < distractorCount; i++) {
      queue.push(distractorItems[i % distractorItems.length]);
    }

    return this.safeShuffle(queue);
  }

  private spawnNextItem() {
    try {
      if (this.processedCount >= this.targetCount || this.itemQueue.length === 0) {
        if (this.processedCount >= this.targetCount) {
          this.finishLevel();
        }
        return;
      }

      if (this.isSupervisorReview) return;

      this.lastSpawnTime = this.time.now;

      const itemDef = this.itemQueue.shift()!;

      const startX = -50;
      const endX = GAME_WIDTH / 2;
      const container = this.add.container(startX, 75) as LuggageItem;
      container.itemDef = itemDef;
      container.spawnTime = this.time.now;
      container.dragStartX = endX;
      container.dragStartY = container.y;

      const bg = this.add.graphics();
      this.drawItemShape(bg, itemDef, 36);
      container.add(bg);

      const shadow = this.add.graphics();
      shadow.fillStyle(0x000000, 0.2);
      shadow.fillEllipse(0, 38, 50, 12);
      container.addAt(shadow, 0);

      const icon = this.add.text(0, 0, itemDef.icon, {
        fontSize: '28px',
        fontFamily: 'Arial, sans-serif',
      });
      icon.setOrigin(0.5);
      container.add(icon);

      container.setSize(72, 72);

      this.itemLabel.setText(itemDef.label);
      this.currentItem = container;

      this.tweens.add({
        targets: container,
        x: endX,
        duration: 700,
        ease: 'Back.out',
        onComplete: () => {
          try {
            container.setInteractive({ draggable: true, useHandCursor: true });

            container.on('dragstart', () => {
              this.children.bringToTop(container);
              container.dragStartX = container.x;
              container.dragStartY = container.y;
              if (container.bobTween) {
                container.bobTween.stop();
                container.bobTween = undefined;
              }
            });

            container.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
              container.x = dragX;
              container.y = dragY;

              this.zones.forEach(zone => {
                if (!zone.graphics || zone.graphics.active === false) return;
                const inZone = this.isInZone(container.x, container.y, zone);
                zone.graphics.clear();
                zone.graphics.fillStyle(ZONE_COLORS[zone.category], inZone ? 0.35 : 0.15);
                zone.graphics.fillRoundedRect(zone.x, zone.y, zone.w, zone.h, 12);
                zone.graphics.lineStyle(3, ZONE_COLORS[zone.category], inZone ? 1 : 0.7);
                zone.graphics.strokeRoundedRect(zone.x, zone.y, zone.w, zone.h, 12);
              });
            });

            container.on('dragend', () => {
              this.zones.forEach(zone => {
                if (!zone.graphics || zone.graphics.active === false) return;
                zone.graphics.clear();
                zone.graphics.fillStyle(ZONE_COLORS[zone.category], 0.15);
                zone.graphics.fillRoundedRect(zone.x, zone.y, zone.w, zone.h, 12);
                zone.graphics.lineStyle(3, ZONE_COLORS[zone.category], 0.7);
                zone.graphics.strokeRoundedRect(zone.x, zone.y, zone.w, zone.h, 12);
              });

              let droppedZone: ItemCategory | null = null;
              for (const zone of this.zones) {
                if (this.isInZone(container.x, container.y, zone)) {
                  droppedZone = zone.category;
                  break;
                }
              }

              if (droppedZone !== null) {
                this.processItem(container, droppedZone);
              } else {
                this.tweens.add({
                  targets: container,
                  x: container.dragStartX,
                  y: container.dragStartY,
                  duration: 200,
                  ease: 'Power2',
                });
              }
            });

            container.spawnTime = this.time.now;
            container.bobTween = this.tweens.add({
              targets: container,
              y: 70,
              duration: 1000,
              yoyo: true,
              repeat: -1,
              ease: 'Sine.inOut',
            });
          } catch (e) {
            console.error('Error in spawn animation complete:', e);
          }
        },
      });
    } catch (e) {
      console.error('Error in spawnNextItem:', e);
      this.time.addEvent({
        delay: 1000,
        callback: this.spawnNextItem,
        callbackScope: this,
      });
    }
  }

  private drawItemShape(g: Phaser.GameObjects.Graphics, item: ItemDef, size: number) {
    g.fillStyle(item.color, 0.9);
    g.lineStyle(2, 0xffffff, 0.6);

    switch (item.shape) {
      case 'circle':
        g.fillCircle(0, 0, size);
        g.strokeCircle(0, 0, size);
        break;
      case 'rect':
        g.fillRect(-size, -size, size * 2, size * 2);
        g.strokeRect(-size, -size, size * 2, size * 2);
        break;
      case 'triangle':
        g.fillTriangle(0, -size, -size, size, size, size);
        g.strokeTriangle(0, -size, -size, size, size, size);
        break;
      case 'diamond': {
        const dPts = [
          { x: 0, y: -size },
          { x: size, y: 0 },
          { x: 0, y: size },
          { x: -size, y: 0 },
        ];
        g.beginPath();
        g.moveTo(dPts[0].x, dPts[0].y);
        for (let i = 1; i < dPts.length; i++) {
          g.lineTo(dPts[i].x, dPts[i].y);
        }
        g.closePath();
        g.fillPath();
        g.strokePath();
        break;
      }
      case 'hexagon': {
        const pts: { x: number; y: number }[] = [];
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 6;
          pts.push({ x: Math.cos(angle) * size, y: Math.sin(angle) * size });
        }
        g.beginPath();
        g.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          g.lineTo(pts[i].x, pts[i].y);
        }
        g.closePath();
        g.fillPath();
        g.strokePath();
        break;
      }
      case 'star': {
        const pts: { x: number; y: number }[] = [];
        for (let i = 0; i < 10; i++) {
          const angle = (Math.PI / 5) * i - Math.PI / 2;
          const r = i % 2 === 0 ? size : size * 0.5;
          pts.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
        }
        g.beginPath();
        g.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          g.lineTo(pts[i].x, pts[i].y);
        }
        g.closePath();
        g.fillPath();
        g.strokePath();
        break;
      }
    }
  }

  private isInZone(x: number, y: number, zone: { x: number; y: number; w: number; h: number }): boolean {
    return x >= zone.x && x <= zone.x + zone.w && y >= zone.y && y <= zone.y + zone.h;
  }

  private processItem(item: LuggageItem, assignedCategory: ItemCategory) {
    const timeSeconds = (this.time.now - item.spawnTime) / 1000;
    const correct = item.itemDef.category === assignedCategory;

    const processed: ProcessedItem = {
      def: item.itemDef,
      assignedCategory,
      correct,
      timeSeconds,
    };
    this.processedItems.push(processed);
    this.processedCount++;
    this.updateHUD();

    if (correct) {
      this.consecutiveErrors = 0;
      this.showFeedback('✅ 正确!', 0x27ae60);
      this.playCorrectEffect(item);
    } else {
      this.consecutiveErrors++;
      this.safetyScore = Math.max(0, this.safetyScore - 10);
      this.showFeedback('❌ 错误! -10分', 0xe74c3c);
      this.updateHUD();

      if (this.consecutiveErrors >= 2) {
        this.playWrongEffect(item, () => {
          this.triggerSupervisorReview(item);
        });
        return;
      }
      this.playWrongEffect(item, () => {
        this.animateItemToZone(item, assignedCategory, correct);
      });
      this.time.addEvent({
        delay: 900,
        callback: this.spawnNextItem,
        callbackScope: this,
      });
      return;
    }

    this.time.addEvent({
      delay: 280,
      callback: () => {
        this.animateItemToZone(item, assignedCategory, correct);
      },
      callbackScope: this,
    });

    this.time.addEvent({
      delay: 700,
      callback: this.spawnNextItem,
      callbackScope: this,
    });
  }

  private triggerSupervisorReview(item: LuggageItem) {
    this.isSupervisorReview = true;
    this.supervisorReviews++;
    this.consecutiveErrors = 0;

    this.showFeedback('⚠ 主管复核中...', 0xf39c12);

    const overlay = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    overlay.setDepth(100);

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.7);
    bg.fillRect(-200, -60, 400, 120);
    bg.lineStyle(2, 0xf39c12);
    bg.strokeRect(-200, -60, 400, 120);
    overlay.add(bg);

    const title = this.add.text(0, -30, '👮 主管复核', {
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif',
      color: '#f39c12',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);
    overlay.add(title);

    const correctCat = item.itemDef.category;
    const correctLabel = ZONE_LABELS[correctCat];
    const msg = this.add.text(0, 10, `${item.itemDef.label} 应归入 ${correctLabel}`, {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#ecf0f1',
    });
    msg.setOrigin(0.5);
    overlay.add(msg);

    const timer = this.add.text(0, 40, '', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#95a5a6',
    });
    timer.setOrigin(0.5);
    overlay.add(timer);

    this.supervisorOverlay = overlay;

    let countdown = 3;
    timer.setText(`${countdown}秒后继续...`);

    const interval = this.time.addEvent({
      delay: 1000,
      repeat: 2,
      callback: () => {
        countdown--;
        if (countdown > 0) {
          timer.setText(`${countdown}秒后继续...`);
        } else {
          overlay.destroy();
          this.isSupervisorReview = false;
          this.animateItemToZone(item, item.itemDef.category, false);
          this.updateHUD();
          this.time.addEvent({
            delay: 300,
            callback: this.spawnNextItem,
            callbackScope: this,
          });
        }
      },
    });
  }

  private showFeedback(text: string, color: number) {
    this.feedbackText.setText(text);
    this.feedbackText.setColor(Phaser.Display.Color.IntegerToColor(color).rgba);
    this.feedbackText.setAlpha(1);

    this.tweens.add({
      targets: this.feedbackText,
      alpha: 0,
      y: 220,
      duration: 1200,
      ease: 'Power2',
      onComplete: () => {
        this.feedbackText.setY(240);
      },
    });
  }

  private playCorrectEffect(item: LuggageItem) {
    this.tweens.add({
      targets: item,
      scaleX: 1.25,
      scaleY: 1.25,
      duration: 120,
      yoyo: true,
      ease: 'Back.out',
    });
  }

  private playWrongEffect(item: LuggageItem, onComplete?: () => void) {
    const originalX = item.x;
    const amount = 10;
    const stepMs = 50;

    let step = 0;
    const totalSteps = 6;

    this.time.addEvent({
      delay: stepMs,
      repeat: totalSteps - 1,
      callback: () => {
        step++;
        if (step % 2 === 1) {
          item.x = originalX + amount;
        } else {
          item.x = originalX - amount;
        }
        if (step >= totalSteps) {
          item.x = originalX;
          if (onComplete) onComplete();
        }
      },
    });
  }

  private animateItemToZone(item: LuggageItem, category: ItemCategory, correct: boolean) {
    const zone = this.zones.find(z => z.category === category)!;
    const targetX = zone.x + zone.w / 2;
    const targetY = zone.y + zone.h / 2;

    this.tweens.add({
      targets: item,
      x: targetX,
      y: targetY,
      scaleX: 0.6,
      scaleY: 0.6,
      alpha: 0,
      duration: 400,
      ease: 'Power2',
      onComplete: () => {
        item.destroy();
        if (this.currentItem === item) {
          this.currentItem = null as any;
        }
      },
    });
  }

  private updateHUD() {
    const scoreColor = this.safetyScore > 70 ? '#2ecc71' : this.safetyScore > 40 ? '#f39c12' : '#e74c3c';
    this.scoreText.setText(`🛡 安全分: ${this.safetyScore}`);
    this.scoreText.setColor(scoreColor);
    this.countText.setText(`📦 ${this.processedCount} / ${this.targetCount}`);
  }

  private finishLevel() {
    if (this.finished) return;
    this.finished = true;

    const level = LEVELS[this.levelIndex];
    const totalItems = this.processedItems;
    const averageTime = totalItems.length > 0
      ? totalItems.reduce((sum, i) => sum + i.timeSeconds, 0) / totalItems.length
      : 0;

    const mistakeMap = new Map<string, Map<string, number>>();
    totalItems.filter(i => !i.correct).forEach(i => {
      const label = i.def.label;
      const mistake = ZONE_LABELS[i.assignedCategory];
      if (!mistakeMap.has(label)) {
        mistakeMap.set(label, new Map());
      }
      const catMap = mistakeMap.get(label)!;
      catMap.set(mistake, (catMap.get(mistake) || 0) + 1);
    });

    const confusionRanking = Array.from(mistakeMap.entries())
      .map(([label, mistakes]) => {
        let total = 0;
        let mostCommon = '';
        let mostCommonCount = 0;
        mistakes.forEach((count, mistake) => {
          total += count;
          if (count > mostCommonCount) {
            mostCommonCount = count;
            mostCommon = mistake;
          }
        });
        return { itemLabel: label, timesMisclassified: total, commonMistake: mostCommon };
      })
      .sort((a, b) => b.timesMisclassified - a.timesMisclassified)
      .slice(0, 5);

    this.scene.start('ResultsScene', {
      levelIndex: this.levelIndex,
      safetyScore: this.safetyScore,
      maxSafetyScore: this.maxSafetyScore,
      items: totalItems,
      averageTimeSeconds: averageTime,
      supervisorReviews: this.supervisorReviews,
      confusionRanking,
      isWrongPractice: this.isWrongPractice,
    });
  }
}
