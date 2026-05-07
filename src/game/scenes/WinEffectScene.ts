import Phaser from 'phaser';

// ─── Scene Data (received via scene.launch) ──────────────────────────

interface WinEffectData {
  type: 'bigWin' | 'megaWin' | 'spiritReward';
  payout: number;
  spirits: Array<{ name: string; element: string; rarity: string }>;
}

// ─── Constants ────────────────────────────────────────────────────────

const CANVAS_W = 400;
const CANVAS_H = 500;

const ELEMENT_COLORS: Record<string, number> = {
  fire: 0xff6b35,
  water: 0x3498db,
  dream: 0xdda0dd,
  nature: 0x27ae60,
  star: 0xf1c40f,
};

// ─── WinEffectScene ──────────────────────────────────────────────────

export class WinEffectScene extends Phaser.Scene {
  private effectData: WinEffectData = {
    type: 'bigWin',
    payout: 0,
    spirits: [],
  };

  private managedObjects: Phaser.GameObjects.GameObject[] = [];
  private managedTweens: Phaser.Tweens.Tween[] = [];
  private managedTimers: Phaser.Time.TimerEvent[] = [];

  constructor() {
    super({ key: 'WinEffectScene' });
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────

  init(data: WinEffectData): void {
    this.effectData = {
      type: data.type ?? 'bigWin',
      payout: data.payout ?? 0,
      spirits: data.spirits ?? [],
    };
  }

  create(): void {
    this.managedObjects = [];
    this.managedTweens = [];
    this.managedTimers = [];

    this.ensureParticleTexture();

    switch (this.effectData.type) {
      case 'megaWin':
        this.showWinOverlay(true);
        break;
      case 'bigWin':
        this.showWinOverlay(false);
        break;
      case 'spiritReward':
        this.showSpiritCards();
        break;
    }

    // Auto-dismiss after a reasonable timeout
    const ttl = this.effectData.type === 'megaWin' ? 4500
      : this.effectData.type === 'bigWin' ? 3500
      : 4000;

    const dismissTimer = this.time.delayedCall(ttl, () => {
      this.dismissScene();
    });
    this.managedTimers.push(dismissTimer);
  }

  shutdown(): void {
    this.cleanup();
  }

  // ─── Particle Texture ───────────────────────────────────────────────

  private ensureParticleTexture(): void {
    if (this.textures.exists('glowParticle')) return;

    try {
      const gfx = this.add.graphics();
      gfx.setVisible(false);
      gfx.fillStyle(0xffffff, 1);
      gfx.fillCircle(8, 8, 8);
      if (typeof gfx.generateTexture === 'function') {
        gfx.generateTexture('glowParticle', 16, 16);
        gfx.destroy();
        return;
      }
      gfx.destroy();
    } catch {
      // fallback
    }

    try {
      const canvas = this.textures.createCanvas('glowParticle', 16, 16);
      if (canvas) {
        const ctx = canvas.getContext();
        if (ctx) {
          const g = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
          g.addColorStop(0, 'rgba(255,255,255,1)');
          g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, 16, 16);
        }
        canvas.refresh();
      }
    } catch {
      // Particles unavailable
    }
  }

  // ─── Big / Mega Win Overlay ─────────────────────────────────────────

  private showWinOverlay(isMega: boolean): void {
    // Dark backdrop
    const backdrop = this.add.graphics();
    backdrop.fillStyle(0x000000, 0.45);
    backdrop.fillRect(0, 0, CANVAS_W, CANVAS_H);
    backdrop.setDepth(100);
    backdrop.setAlpha(0);
    this.managedObjects.push(backdrop);

    const fadeBackdrop = this.tweens.add({
      targets: backdrop,
      alpha: 1,
      duration: 300,
    });
    this.managedTweens.push(fadeBackdrop);

    // Main label
    const label = isMega ? '\u2728 MEGA WIN \u2728' : '\uD83C\uDF89 BIG WIN \uD83C\uDF89';
    const labelColor = isMega ? '#FFD700' : '#FF6B9D';
    const fontSize = isMega ? '34px' : '28px';

    const winLabel = this.add.text(CANVAS_W / 2, CANVAS_H / 2 - 30, label, {
      fontSize,
      color: labelColor,
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    });
    winLabel.setOrigin(0.5, 0.5);
    winLabel.setDepth(101);
    winLabel.setScale(0);
    this.managedObjects.push(winLabel);

    // Scale-in with elastic ease
    const popIn = this.tweens.add({
      targets: winLabel,
      scaleX: 1,
      scaleY: 1,
      duration: 600,
      ease: 'Elastic.easeOut',
      delay: 100,
    });
    this.managedTweens.push(popIn);

    // Payout amount
    const payoutStr = `+${this.effectData.payout}`;
    const payoutText = this.add.text(CANVAS_W / 2, CANVAS_H / 2 + 15, payoutStr, {
      fontSize: '22px',
      color: '#FFFFFF',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    });
    payoutText.setOrigin(0.5, 0.5);
    payoutText.setDepth(101);
    payoutText.setAlpha(0);
    this.managedObjects.push(payoutText);

    const fadeInPayout = this.tweens.add({
      targets: payoutText,
      alpha: 1,
      duration: 300,
      delay: 400,
    });
    this.managedTweens.push(fadeInPayout);

    // Continuous scale pulse on the label
    const pulse = this.tweens.add({
      targets: winLabel,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: 700,
    });
    this.managedTweens.push(pulse);

    // Particle burst
    this.createParticleBurst(isMega);

    // If spirits are also included, show spirit cards after a delay
    if (this.effectData.spirits.length > 0) {
      const spiritTimer = this.time.delayedCall(1800, () => {
        this.showSpiritCards();
      });
      this.managedTimers.push(spiritTimer);
    }
  }

  // ─── Particle Burst ─────────────────────────────────────────────────

  private createParticleBurst(isMega: boolean): void {
    if (!this.textures.exists('glowParticle')) return;

    try {
      const tints = isMega
        ? [0xffd700, 0xffaa00, 0xff6b35, 0xffffff]
        : [0xff6b9d, 0xdda0dd, 0xffd700, 0xffffff];

      // Central burst
      const burst = this.add.particles(CANVAS_W / 2, CANVAS_H / 2 - 10, 'glowParticle', {
        speed: { min: 80, max: 220 },
        scale: { start: 0.6, end: 0 },
        lifespan: { min: 600, max: 1200 },
        quantity: 3,
        blendMode: Phaser.BlendModes.ADD,
        tint: tints,
        emitting: true,
      });
      burst.setDepth(102);
      this.managedObjects.push(burst);

      // Stop emitting after initial burst
      const stopTimer = this.time.delayedCall(400, () => {
        burst.stop();
      });
      this.managedTimers.push(stopTimer);

      // Secondary sparkle particles from edges
      const edges = [
        { x: CANVAS_W / 2 - 120, y: CANVAS_H / 2 - 60 },
        { x: CANVAS_W / 2 + 120, y: CANVAS_H / 2 - 60 },
        { x: CANVAS_W / 2 - 100, y: CANVAS_H / 2 + 40 },
        { x: CANVAS_W / 2 + 100, y: CANVAS_H / 2 + 40 },
      ];

      for (const edge of edges) {
        const spark = this.add.particles(edge.x, edge.y, 'glowParticle', {
          speed: { min: 30, max: 80 },
          scale: { start: 0.35, end: 0 },
          lifespan: { min: 400, max: 900 },
          quantity: 1,
          blendMode: Phaser.BlendModes.ADD,
          tint: tints,
          emitting: true,
        });
        spark.setDepth(102);
        this.managedObjects.push(spark);

        const sparkTimer = this.time.delayedCall(600, () => {
          spark.stop();
        });
        this.managedTimers.push(sparkTimer);
      }
    } catch {
      // Particle burst unavailable – text animations still work
    }
  }

  // ─── Spirit Reward Cards ────────────────────────────────────────────

  private showSpiritCards(): void {
    const spirits = this.effectData.spirits;
    if (spirits.length === 0) return;

    const startY = CANVAS_H / 2 - (spirits.length - 1) * 30;

    for (let i = 0; i < spirits.length; i++) {
      const spirit = spirits[i];
      const cx = CANVAS_W / 2;
      const cy = startY + i * 60;

      this.createSpiritCard(cx, cy, spirit, i);
    }
  }

  private createSpiritCard(
    cx: number,
    cy: number,
    spirit: { name: string; element: string; rarity: string },
    index: number
  ): void {
    const elColor = ELEMENT_COLORS[spirit.element] ?? 0xdda0dd;

    // Card background
    const card = this.add.graphics();
    card.fillStyle(0x1a0a2e, 0.92);
    card.fillRoundedRect(cx - 100, cy - 22, 200, 44, 12);
    card.lineStyle(2, elColor, 0.8);
    card.strokeRoundedRect(cx - 100, cy - 22, 200, 44, 12);
    card.setDepth(103);
    card.setAlpha(0);
    card.y += 20; // start offset for slide-up
    this.managedObjects.push(card);

    // Glow accent on left
    card.fillStyle(elColor, 0.3);
    card.fillRoundedRect(cx - 96, cy - 18, 6, 36, 3);

    // Spirit emoji indicator
    const elementEmojis: Record<string, string> = {
      fire: '\u{1F525}',
      water: '\u{1F4A7}',
      dream: '\u{1F319}',
      nature: '\u{1F33F}',
      star: '\u{2B50}',
    };

    const emojiStr = elementEmojis[spirit.element] ?? '\u2728';

    const emojiText = this.add.text(cx - 70, cy, emojiStr, {
      fontSize: '18px',
    });
    emojiText.setOrigin(0.5, 0.5);
    emojiText.setDepth(104);
    emojiText.setAlpha(0);
    emojiText.y += 20;
    this.managedObjects.push(emojiText);

    // Spirit name
    const nameText = this.add.text(cx - 30, cy - 4, spirit.name, {
      fontSize: '13px',
      color: '#FFFFFF',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    });
    nameText.setOrigin(0, 0.5);
    nameText.setDepth(104);
    nameText.setAlpha(0);
    nameText.y += 20;
    this.managedObjects.push(nameText);

    // Rarity badge
    const rarityColor = this.getRarityColor(spirit.rarity);
    const rarityText = this.add.text(cx + 70, cy, spirit.rarity.toUpperCase(), {
      fontSize: '9px',
      color: rarityColor,
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    });
    rarityText.setOrigin(0.5, 0.5);
    rarityText.setDepth(104);
    rarityText.setAlpha(0);
    rarityText.y += 20;
    this.managedObjects.push(rarityText);

    // "Spirit obtained!" label (only on first card)
    if (index === 0) {
      const obtained = this.add.text(cx, cy - 38, '\u2728 Spirit Obtained! \u2728', {
        fontSize: '11px',
        color: '#27AE60',
        fontFamily: 'sans-serif',
        fontStyle: 'bold',
      });
      obtained.setOrigin(0.5, 0.5);
      obtained.setDepth(104);
      obtained.setAlpha(0);
      obtained.y += 20;
      this.managedObjects.push(obtained);

      const fadeObtained = this.tweens.add({
        targets: obtained,
        alpha: 1,
        y: obtained.y - 20,
        duration: 500,
        delay: index * 180,
        ease: 'Back.easeOut',
      });
      this.managedTweens.push(fadeObtained);
    }

    // Card group entrance: fade in + slide up
    const cardGroup = [card, emojiText, nameText, rarityText];
    const fadeCards = this.tweens.add({
      targets: cardGroup,
      alpha: 1,
      y: '-=20',
      duration: 550,
      delay: index * 180 + 50,
      ease: 'Back.easeOut',
    });
    this.managedTweens.push(fadeCards);

    // Floating bob after entrance
    const bobDelay = 550 + index * 180 + 100;
    const bobTimer = this.time.delayedCall(bobDelay, () => {
      const bob = this.tweens.add({
        targets: cardGroup,
        y: '-=4',
        duration: 1400,
        yoyo: true,
        repeat: 1,
        ease: 'Sine.easeInOut',
      });
      this.managedTweens.push(bob);
    });
    this.managedTimers.push(bobTimer);

    // Subtle particle trail from card
    if (this.textures.exists('glowParticle')) {
      try {
        const sparkle = this.add.particles(cx, cy, 'glowParticle', {
          speed: { min: 10, max: 35 },
          scale: { start: 0.2, end: 0 },
          lifespan: 800,
          quantity: 1,
          blendMode: Phaser.BlendModes.ADD,
          tint: [elColor, 0xffd700],
          emitting: true,
        });
        sparkle.setDepth(102);
        this.managedObjects.push(sparkle);

        const stopSparkle = this.time.delayedCall(2000, () => {
          sparkle.stop();
        });
        this.managedTimers.push(stopSparkle);
      } catch {
        // sparkle unavailable
      }
    }
  }

  private getRarityColor(rarity: string): string {
    switch (rarity) {
      case 'common': return '#AAAAAA';
      case 'uncommon': return '#27AE60';
      case 'rare': return '#3498DB';
      case 'epic': return '#9B59B6';
      case 'legendary': return '#FFD700';
      default: return '#FFFFFF';
    }
  }

  // ─── Dismiss ────────────────────────────────────────────────────────

  private dismissScene(): void {
    // Fade everything out then stop the scene
    const fadeTargets = this.managedObjects.filter((o) => {
      if ('active' in o && typeof (o as any).active === 'boolean') {
        return (o as any).active;
      }
      return true;
    });

    if (fadeTargets.length > 0) {
      this.tweens.add({
        targets: fadeTargets,
        alpha: 0,
        duration: 450,
        ease: 'Quad.easeIn',
        onComplete: () => {
          this.cleanup();
          this.scene.stop('WinEffectScene');
        },
      });
    } else {
      this.cleanup();
      this.scene.stop('WinEffectScene');
    }
  }

  private cleanup(): void {
    for (const tw of this.managedTweens) {
      if (tw) tw.stop();
    }
    this.managedTweens = [];

    for (const timer of this.managedTimers) {
      if (timer) timer.destroy();
    }
    this.managedTimers = [];

    for (const obj of this.managedObjects) {
      if (obj && typeof obj.destroy === 'function') {
        try { obj.destroy(); } catch { /* already destroyed */ }
      }
    }
    this.managedObjects = [];
  }

}
