import Phaser from 'phaser';

// === Types (matching the specification) ===

export interface GridSymbol {
  id: string;
  name: string;
  element: string;
  rarity: string;
  symbolType: string;
  emoji: string;
  glowColor: string;
}

export interface WinInfo {
  symbolId: string;
  positions: { col: number; row: number }[];
  count: number;
  payout: number;
  isWild: boolean;
}

export interface SpinResultData {
  grid: GridSymbol[][];
  wins: WinInfo[];
  totalPayout: number;
  isBigWin: boolean;
  isMegaWin: boolean;
  spiritsWon: Array<{ name: string; element: string; rarity: string }>;
}

// === Layout Constants ===

const COLS = 5;
const ROWS = 4;
const CELL_W = 72;
const CELL_H = 72;
const CELL_PAD = 3;
const CELL_RADIUS = 8;
const GRID_WIDTH = COLS * CELL_W;  // 360
const GRID_HEIGHT = ROWS * CELL_H; // 288
const GRID_X = (400 - GRID_WIDTH) / 2; // 20
const GRID_Y = 90;
const CANVAS_W = 400;
const CANVAS_H = 500;
const REEL_STOP_DELAY = 300;
const MIN_SPIN_TIME = 600;
const SPIN_CYCLE_MS = 55;

// === Visual Constants ===

const ELEMENT_COLORS: Record<string, number> = {
  fire: 0xff6b35,
  water: 0x3498db,
  dream: 0xdda0dd,
  nature: 0x27ae60,
  star: 0xf1c40f,
};

const RARITY_GLOW_ALPHA: Record<string, number> = {
  rare: 0.18,
  epic: 0.28,
  legendary: 0.38,
};

const SPIN_EMOJIS = [
  '\u{1F525}', '\u{1F4A7}', '\u{1F319}', '\u{1F33F}', '\u{2B50}',
  '\u{1F48E}', '\u{1F344}', '\u{1F3F7}', '\u{1F300}', '\u{1F331}',
  '\u{1F30A}', '\u{1F4AB}', '\u{1F333}', '\u{1F31F}', '\u{1F985}',
  '\u{1F9DC}', '\u{1F340}', '\u{1F48D}', '\u{1F52E}',
];

// === Cell Object Structure ===

interface CellObjects {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  glow: Phaser.GameObjects.Graphics;
  text: Phaser.GameObjects.Text;
  baseX: number;
  baseY: number;
}

// === Scene ===

export class DreamSpinScene extends Phaser.Scene {
  // Grid
  private cells: CellObjects[][] = [];

  // Spin state
  private isSpinning = false;
  private spinStartTime = 0;
  private pendingResult: SpinResultData | null = null;
  private spinTimers: (Phaser.Time.TimerEvent | null)[] = [];
  private reelsStopped: boolean[] = [];

  // Visual state
  private winTweens: Phaser.Tweens.Tween[] = [];
  private frameGraphics: Phaser.GameObjects.Graphics | null = null;

  constructor() {
    super({ key: 'DreamSpinScene' });
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────

  create(): void {
    this.cells = [];
    this.spinTimers = new Array(COLS).fill(null);
    this.reelsStopped = new Array(COLS).fill(true);
    this.winTweens = [];
    this.pendingResult = null;
    this.isSpinning = false;

    this.ensureParticleTexture();
    this.drawBackground();
    this.createTitle();
    this.createMachineFrame();
    this.createGrid();
    this.createBottomInfo();
    this.spawnAmbientParticles();
    this.registerEvents();
  }

  shutdown(): void {
    this.unregisterEvents();
    this.stopAllSpinTimers();
    this.clearWinEffects();
  }

  // ─── Background & Frame ─────────────────────────────────────────────

  private drawBackground(): void {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a0a2e, 0x1a0a2e, 0x2d1b4e, 0x2d1b4e, 1);
    bg.fillRect(0, 0, CANVAS_W, CANVAS_H);
    bg.setDepth(-10);
  }

  private createTitle(): void {
    const title = this.add.text(CANVAS_W / 2, 28, 'Echoes of Lumora', {
      fontSize: '20px',
      color: '#FFD700',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5, 0.5);
    title.setDepth(5);

    // Gentle float
    this.tweens.add({
      targets: title,
      y: 32,
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Subtitle
    const sub = this.add.text(CANVAS_W / 2, 52, 'Dream Spin', {
      fontSize: '11px',
      color: '#9B59B6',
      fontFamily: 'sans-serif',
    });
    sub.setOrigin(0.5, 0.5);
    sub.setDepth(5);
  }

  private createMachineFrame(): void {
    const frame = this.add.graphics();
    this.frameGraphics = frame;
    frame.setDepth(1);

    // Outer glow
    frame.fillStyle(0x9b59b6, 0.08);
    frame.fillRoundedRect(
      GRID_X - 14, GRID_Y - 14,
      GRID_WIDTH + 28, GRID_HEIGHT + 28,
      20
    );

    // Main border
    frame.lineStyle(2, 0x9b59b6, 0.75);
    frame.strokeRoundedRect(
      GRID_X - 8, GRID_Y - 8,
      GRID_WIDTH + 16, GRID_HEIGHT + 16,
      14
    );

    // Inner highlight
    frame.lineStyle(1, 0xdda0dd, 0.25);
    frame.strokeRoundedRect(
      GRID_X - 4, GRID_Y - 4,
      GRID_WIDTH + 8, GRID_HEIGHT + 8,
      10
    );

    // Corner accents
    const corners = [
      { x: GRID_X - 8,  y: GRID_Y - 8 },
      { x: GRID_X + GRID_WIDTH + 8, y: GRID_Y - 8 },
      { x: GRID_X - 8,  y: GRID_Y + GRID_HEIGHT + 8 },
      { x: GRID_X + GRID_WIDTH + 8, y: GRID_Y + GRID_HEIGHT + 8 },
    ];
    frame.fillStyle(0xffd700, 0.5);
    for (const c of corners) {
      frame.fillCircle(c.x, c.y, 3.5);
    }

    // Payline dots – left
    frame.fillStyle(0xf1c40f, 0.3);
    for (let row = 0; row < ROWS; row++) {
      const cy = GRID_Y + row * CELL_H + CELL_H / 2;
      frame.fillCircle(GRID_X - 14, cy, 2.5);
    }
    // Payline dots – right
    for (let row = 0; row < ROWS; row++) {
      const cy = GRID_Y + row * CELL_H + CELL_H / 2;
      frame.fillCircle(GRID_X + GRID_WIDTH + 14, cy, 2.5);
    }

    // Column separators
    frame.lineStyle(1, 0x9b59b6, 0.12);
    for (let col = 1; col < COLS; col++) {
      const cx = GRID_X + col * CELL_W;
      frame.lineBetween(cx, GRID_Y, cx, GRID_Y + GRID_HEIGHT);
    }
  }

  private createBottomInfo(): void {
    const info = this.add.text(
      CANVAS_W / 2,
      GRID_Y + GRID_HEIGHT + 30,
      '5 Energy per spin',
      {
        fontSize: '10px',
        color: '#9B59B6',
        fontFamily: 'sans-serif',
      }
    );
    info.setOrigin(0.5, 0.5);
    info.setDepth(5);
  }

  // ─── Grid Cells ─────────────────────────────────────────────────────

  private createGrid(): void {
    for (let col = 0; col < COLS; col++) {
      this.cells[col] = [];
      for (let row = 0; row < ROWS; row++) {
        this.cells[col][row] = this.createCell(col, row);
      }
    }
  }

  private createCell(col: number, row: number): CellObjects {
    const cx = GRID_X + col * CELL_W + CELL_W / 2;
    const cy = GRID_Y + row * CELL_H + CELL_H / 2;

    const container = this.add.container(cx, cy);
    container.setDepth(2);

    // Glow (hidden until win or rare symbol)
    const glow = this.add.graphics();
    glow.setVisible(false);
    container.add(glow);

    // Cell background
    const bg = this.add.graphics();
    const hw = CELL_W / 2 - CELL_PAD;
    const hh = CELL_H / 2 - CELL_PAD;

    bg.fillStyle(0x0d0520, 0.65);
    bg.fillRoundedRect(-hw, -hh, hw * 2, hh * 2, CELL_RADIUS);
    bg.lineStyle(1, 0x9b59b6, 0.18);
    bg.strokeRoundedRect(-hw, -hh, hw * 2, hh * 2, CELL_RADIUS);
    container.add(bg);

    // Emoji text
    const text = this.add.text(0, 0, '', {
      fontSize: '30px',
      align: 'center',
    });
    text.setOrigin(0.5, 0.5);
    container.add(text);

    return { container, bg, glow, text, baseX: cx, baseY: cy };
  }

  // ─── Particle Texture ───────────────────────────────────────────────

  private ensureParticleTexture(): void {
    if (this.textures.exists('glowParticle')) return;

    try {
      // Create a temporary graphics object, generate a texture, then destroy it
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
      // fallback below
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
      // Particles will not be available; tweens still work
    }
  }

  private spawnAmbientParticles(): void {
    try {
      if (!this.textures.exists('glowParticle')) return;

      const zone = new Phaser.Geom.Rectangle(-170, 0, 340, GRID_HEIGHT + 40);
      const emitter = this.add.particles(CANVAS_W / 2, GRID_Y, 'glowParticle', {
        speed: { min: 4, max: 18 },
        scale: { start: 0.25, end: 0 },
        lifespan: 4500,
        quantity: 1,
        blendMode: Phaser.BlendModes.ADD,
        tint: [0xdda0dd, 0x9b59b6, 0xffd700],
      });
      // Set emit zone if the API supports it
      if (emitter && typeof emitter.setEmitZone === 'function') {
        emitter.setEmitZone({
          type: 'random' as const,
          source: zone as unknown as Phaser.GameObjects.Particles.Zones.RandomZoneSource,
        });
      }
      emitter.setDepth(-1);
    } catch {
      // Ambient particles not available
    }
  }

  // ─── Events ─────────────────────────────────────────────────────────

  private registerEvents(): void {
    this.game.events.on('start-spin', this.onStartSpin, this);
    this.game.events.on('spin-result', this.onSpinResult, this);
  }

  private unregisterEvents(): void {
    this.game.events.off('start-spin', this.onStartSpin, this);
    this.game.events.off('spin-result', this.onSpinResult, this);
  }

  // ─── Spin Logic ─────────────────────────────────────────────────────

  private onStartSpin(): void {
    if (this.isSpinning) return;

    this.isSpinning = true;
    this.spinStartTime = this.time.now;
    this.pendingResult = null;
    this.reelsStopped = new Array(COLS).fill(false);

    // Stop any running overlay
    if (this.scene.isActive('WinEffectScene')) {
      this.scene.stop('WinEffectScene');
    }

    // Clear previous effects
    this.clearWinEffects();

    // Start cycling emojis on every reel
    for (let col = 0; col < COLS; col++) {
      this.startReelCycle(col);
    }
  }

  private startReelCycle(col: number): void {
    // Destroy any previous timer for this reel
    if (this.spinTimers[col]) {
      this.spinTimers[col]!.destroy();
    }

    const timer = this.time.addEvent({
      delay: SPIN_CYCLE_MS,
      loop: true,
      callback: () => {
        for (let row = 0; row < ROWS; row++) {
          const cell = this.cells[col][row];
          const idx = Math.floor(Math.random() * SPIN_EMOJIS.length);
          cell.text.setText(SPIN_EMOJIS[idx]);
          cell.glow.setVisible(false);
          cell.glow.clear();
        }
      },
    });

    this.spinTimers[col] = timer;
  }

  private onSpinResult(data: SpinResultData): void {
    this.pendingResult = data;

    // Ensure a minimum visible spin time before stopping
    const elapsed = this.time.now - this.spinStartTime;
    const waitBeforeStop = Math.max(0, MIN_SPIN_TIME - elapsed);

    this.time.delayedCall(waitBeforeStop, () => {
      this.beginCascadingStop();
    });
  }

  private beginCascadingStop(): void {
    for (let col = 0; col < COLS; col++) {
      this.time.delayedCall(col * REEL_STOP_DELAY, () => {
        this.stopReel(col);
      });
    }
  }

  private stopReel(col: number): void {
    // Kill the cycling timer
    if (this.spinTimers[col]) {
      this.spinTimers[col]!.destroy();
      this.spinTimers[col] = null;
    }

    this.reelsStopped[col] = true;

    if (!this.pendingResult) return;

    const columnSymbols = this.pendingResult.grid[col];
    if (!columnSymbols) return;

    // Place final symbols with bounce
    for (let row = 0; row < ROWS; row++) {
      const cell = this.cells[col][row];
      const symbol = columnSymbols[row];
      if (!symbol) continue;

      cell.text.setText(symbol.emoji);

      // Apply rare-symbol glow (subtle, static)
      const glowAlpha = RARITY_GLOW_ALPHA[symbol.rarity] ?? 0;
      if (glowAlpha > 0) {
        const elColor = ELEMENT_COLORS[symbol.element] ?? 0xdda0dd;
        cell.glow.clear();
        cell.glow.fillStyle(elColor, glowAlpha);
        cell.glow.fillCircle(0, 0, CELL_W / 2 - 2);
        cell.glow.setVisible(true);
      }

      // Bounce-in animation: compress vertically then spring out
      cell.container.setScale(1.15, 0.85);
      this.tweens.add({
        targets: cell.container,
        scaleX: 1,
        scaleY: 1,
        duration: 320,
        ease: 'Back.easeOut',
        delay: row * 30, // slight stagger within reel
      });
    }

    // Check if all reels are done
    if (this.reelsStopped.every((s) => s)) {
      this.onAllReelsStopped();
    }
  }

  // ─── Post-Spin ──────────────────────────────────────────────────────

  private onAllReelsStopped(): void {
    this.isSpinning = false;

    if (!this.pendingResult) return;
    const result = this.pendingResult;

    // 1. Highlight wins on the grid
    if (result.wins.length > 0) {
      this.time.delayedCall(180, () => this.highlightWins(result));
    }

    // 2. Big/Mega win → launch WinEffectScene
    if (result.isBigWin || result.isMegaWin) {
      const delay = result.wins.length > 0 ? 500 : 200;
      this.time.delayedCall(delay, () => {
        this.scene.launch('WinEffectScene', {
          type: result.isMegaWin ? 'megaWin' : 'bigWin',
          payout: result.totalPayout,
          spirits: [],
        });
      });
    }

    // 3. Spirit rewards → launch WinEffectScene for spirit cards
    if (result.spiritsWon.length > 0) {
      const delay = result.isBigWin ? 2800 : 800;
      this.time.delayedCall(delay, () => {
        this.scene.launch('WinEffectScene', {
          type: 'spiritReward',
          payout: 0,
          spirits: result.spiritsWon,
        });
      });
    }

    // 4. Emit completion event
    const completeDelay = result.isMegaWin
      ? 5000
      : result.isBigWin
        ? 4000
        : result.wins.length > 0
          ? 2200
          : 500;

    this.time.delayedCall(completeDelay, () => {
      this.game.events.emit('spin-complete', result);
    });
  }

  // ─── Win Highlighting ───────────────────────────────────────────────

  private highlightWins(result: SpinResultData): void {
    const winPosSet = new Set<string>();
    for (const win of result.wins) {
      for (const pos of win.positions) {
        winPosSet.add(`${pos.col},${pos.row}`);
      }
    }

    for (const key of winPosSet) {
      const [c, r] = key.split(',').map(Number);
      const cell = this.cells[c]?.[r];
      if (!cell) continue;

      const symbol = result.grid[c]?.[r];
      const glowColor = symbol
        ? ELEMENT_COLORS[symbol.element] ?? 0xffd700
        : 0xffd700;

      // Draw glow circle
      cell.glow.clear();
      cell.glow.fillStyle(glowColor, 0.45);
      cell.glow.fillCircle(0, 0, CELL_W / 2);
      cell.glow.setVisible(true);
      cell.glow.setAlpha(0.3);

      // Pulsing glow alpha
      const glowPulse = this.tweens.add({
        targets: cell.glow,
        alpha: { from: 0.3, to: 0.85 },
        duration: 550,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      this.winTweens.push(glowPulse);

      // Scale pulse on the container
      const scalePulse = this.tweens.add({
        targets: cell.container,
        scaleX: 1.07,
        scaleY: 1.07,
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      this.winTweens.push(scalePulse);
    }
  }

  // ─── Cleanup ────────────────────────────────────────────────────────

  private clearWinEffects(): void {
    for (const tw of this.winTweens) {
      if (tw) tw.stop();
    }
    this.winTweens = [];

    for (let col = 0; col < COLS; col++) {
      for (let row = 0; row < ROWS; row++) {
        const cell = this.cells[col]?.[row];
        if (!cell) continue;
        cell.glow.setVisible(false);
        cell.glow.clear();
        cell.glow.setAlpha(1);
        cell.container.setScale(1, 1);
        cell.container.setPosition(cell.baseX, cell.baseY);
        cell.container.setAlpha(1);
      }
    }
  }

  private stopAllSpinTimers(): void {
    for (let col = 0; col < COLS; col++) {
      if (this.spinTimers[col]) {
        this.spinTimers[col]!.destroy();
        this.spinTimers[col] = null;
      }
    }
  }
}
