// src/lib/audioService.ts

class AudioService {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private bgmOsc: OscillatorNode | null = null;
  private bgmGain: GainNode | null = null;
  private bgmLfo: OscillatorNode | null = null;
  private currentBgm: string | null = null;
  private bgmAudio: HTMLAudioElement | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }

      const resumeAudio = () => {
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume().then(() => {
             if (this.currentBgm) {
                 const scene = this.currentBgm;
                 this.currentBgm = null;
                 this.playBGM(scene as any);
             }
          });
        }
        document.removeEventListener('click', resumeAudio);
        document.removeEventListener('touchstart', resumeAudio);
      };
      document.addEventListener('click', resumeAudio);
      document.addEventListener('touchstart', resumeAudio);
    }
  }

  public async init() {
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  private playTone(freq: number, type: OscillatorType, duration: number, vol = 0.1) {
    if (!this.enabled || !this.ctx) return;
    this.init();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + duration);
  }

  public playBGM(scene: 'home' | 'spins' | 'sanctuary' | 'community' | 'shop' | 'battle') {
    if (!this.enabled) return;
    
    if (this.currentBgm === scene) return;
    this.currentBgm = scene;

    let src = '';
    switch (scene) {
      case 'home':
      case 'community':
      case 'shop':
        src = '/assets/audio/bgm_home.mp3';
        break;
      case 'sanctuary':
        src = '/assets/audio/bgm_sanctuary.mp3';
        break;
      case 'spins':
        src = '/assets/audio/bgm_spins.mp3';
        break;
      case 'battle':
        src = '/assets/audio/bgm_battle.mp3';
        break;
      default:
        src = '/assets/audio/bgm_home.mp3';
    }

    if (this.bgmAudio) {
      this.bgmAudio.pause();
    }

    this.bgmAudio = new Audio(src);
    this.bgmAudio.loop = true;
    this.bgmAudio.volume = 0.3;
    
    this.bgmAudio.play().catch((e) => {
      console.warn('Audio auto-play prevented. User interaction required.', e);
    });
  }

  public stopBGM() {
    if (this.bgmAudio) {
      this.bgmAudio.pause();
      this.bgmAudio.currentTime = 0;
      this.bgmAudio = null;
    }
    this.currentBgm = null;
  }

  public playClick() {
    this.playTone(600, 'sine', 0.1, 0.05);
  }

  public playSpinStart() {
    if (!this.enabled || !this.ctx) return;
    this.init();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.3);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.1, t + 0.1);
    gain.gain.linearRampToValueAtTime(0, t + 0.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.4);
  }

  public playReelStop() {
    if (!this.enabled || !this.ctx) return;
    this.init();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(100, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.15, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, t);
    filter.frequency.exponentialRampToValueAtTime(100, t + 0.1);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.2);
  }

  public playWin() {
    const root = 440; 
    const third = 554.37; 
    const fifth = 659.25; 
    const octave = 880; 

    setTimeout(() => this.playTone(root, 'sine', 0.5, 0.1), 0);
    setTimeout(() => this.playTone(third, 'sine', 0.5, 0.1), 100);
    setTimeout(() => this.playTone(fifth, 'sine', 0.5, 0.1), 200);
    setTimeout(() => this.playTone(octave, 'sine', 0.8, 0.15), 300);
  }

  public playSurge() {
    if (!this.enabled || !this.ctx) return;
    this.init();

    const t = this.ctx.currentTime;
    const freqs =[261.63, 329.63, 392.00, 523.25]; 
    
    freqs.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.1, t + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(t);
      osc.stop(t + 1.6);
    });

    setTimeout(() => this.playTone(1046.50, 'sine', 0.3, 0.05), 100); 
    setTimeout(() => this.playTone(1318.51, 'sine', 0.3, 0.05), 250); 
    setTimeout(() => this.playTone(1567.98, 'sine', 0.4, 0.08), 400); 
  }

  public playCollect() {
    if (!this.enabled || !this.ctx) return;
    this.init();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, t); 
    osc.frequency.setValueAtTime(1318.51, t + 0.1); 

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.1, t + 0.05);
    gain.gain.setValueAtTime(0.1, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.5);
  }

  public playPlaceSpirit() {
    this.playTone(150, 'triangle', 0.2, 0.1);
    setTimeout(() => this.playTone(659.25, 'sine', 0.4, 0.05), 100);
  }

  public playError() {
    this.playTone(150, 'sawtooth', 0.15, 0.05);
  }

  public playClaimReward() {
    setTimeout(() => this.playTone(523.25, 'sine', 0.1, 0.1), 0);
    setTimeout(() => this.playTone(659.25, 'sine', 0.1, 0.1), 50);
    setTimeout(() => this.playTone(783.99, 'sine', 0.2, 0.1), 100);
  }

  public playMerge() {
    if (!this.enabled || !this.ctx) return;
    this.init();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(1200, t + 0.4);
    
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.6);
  }

  public playBonusReveal() {
    this.playTone(800, 'sine', 0.05, 0.1);
    setTimeout(() => this.playTone(1200, 'triangle', 0.1, 0.05), 50);
  }
}

export const audioService = new AudioService();
