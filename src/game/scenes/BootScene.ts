// Base DreamSpin Scene - placeholder for Phase 2
// Will be expanded with full slot machine mechanics
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Load game assets here in Phase 2
  }

  create() {
    // Show loading/initialization state
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    // Background gradient
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a0a2e, 0x1a0a2e, 0x2d1b4e, 0x2d1b4e, 1);
    bg.fillRect(0, 0, width, height);

    // Title
    const title = this.add.text(centerX, centerY - 40, 'Echoes of Lumora', {
      fontSize: '24px',
      color: '#FFD700',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);

    // Subtitle
    const subtitle = this.add.text(centerX, centerY + 10, 'Dream Spin Engine', {
      fontSize: '14px',
      color: '#9B59B6',
      fontFamily: 'sans-serif',
    });
    subtitle.setOrigin(0.5);

    // Floating particles
    const particles = this.add.particles(centerX, centerY + 60, undefined, {
      // Placeholder particles - will use actual sprite in Phase 2
      speed: { min: 20, max: 50 },
      scale: { start: 0.5, end: 0 },
      lifespan: 2000,
      quantity: 2,
      blendMode: Phaser.BlendModes.ADD,
    });

    // Auto-transition to main scene when ready
    this.time.delayedCall(2000, () => {
      // this.scene.start('DreamSpinScene');
    });
  }
}
