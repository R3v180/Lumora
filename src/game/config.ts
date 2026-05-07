import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { DreamSpinScene } from './scenes/DreamSpinScene';
import { WinEffectScene } from './scenes/WinEffectScene';

/**
 * Phaser game configuration for Echoes of Lumora.
 * Base config factory – scenes are injected per use-case.
 */
export function createGameConfig(
  parent: string,
  scenes: Phaser.Types.Scenes.SceneType[]
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: 400,
    height: 500,
    backgroundColor: '#1a0a2e',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: scenes,
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    input: {
      mouse: {
        preventDefaultWheel: true,
      },
    },
    audio: {
      disableWebAudio: false,
    },
  };
}

/**
 * Pre-built config for the full Dream Spin slot-machine experience.
 * Includes BootScene → DreamSpinScene + WinEffectScene (overlay).
 */
export function createSlotGameConfig(
  parent: string
): Phaser.Types.Core.GameConfig {
  return createGameConfig(parent, [BootScene, DreamSpinScene, WinEffectScene]);
}

/** Scene keys for external reference (event wiring, scene launching, etc.) */
export const SCENE_KEYS = {
  Boot: 'BootScene',
  DreamSpin: 'DreamSpinScene',
  WinEffect: 'WinEffectScene',
} as const;
