import Phaser from 'phaser';

// Phaser game configuration for Echoes of Lumora
// This is the base config - scenes will be added per feature
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
    // Disable right-click context menu
    input: {
      mouse: {
        preventDefaultWheel: true,
      },
    },
    // Audio settings
    audio: {
      disableWebAudio: false,
    },
  };
}
