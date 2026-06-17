import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './types';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { RuleCardScene } from './scenes/RuleCardScene';
import { GameScene } from './scenes/GameScene';
import { ResultsScene } from './scenes/ResultsScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    activePointers: 2,
    touch: {
      capture: true,
    },
  },
  scene: [BootScene, MenuScene, RuleCardScene, GameScene, ResultsScene],
};

const game = new Phaser.Game(config);
(window as any).__game = game;
