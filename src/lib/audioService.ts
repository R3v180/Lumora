// src/lib/audioService.ts

class AudioService {
  private ctx: AudioContext | null = null;
  private masterVolume: number = 1.0;
  private musicVolume: number = 0.5;
  private sfxVolume: number = 0.7;
  private isMuted: boolean = false;
  
  private currentBgm: string | null = null;
  private bgmAudio: HTMLAudioElement | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      // Load preferences
      const saved = localStorage.getItem('lumora_audio_settings');
      if (saved) {
        try {
          const settings = JSON.parse(saved);
          this.masterVolume = settings.master ?? 1.0;
          this.musicVolume = settings.music ?? 0.5;
          this.sfxVolume = settings.sfx ?? 0.7;
          this.isMuted = settings.muted ?? false;
        } catch (e) { console.warn("Failed to load audio settings", e); }
      }

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

  private saveSettings() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('lumora_audio_settings', JSON.stringify({
        master: this.masterVolume,
        music: this.musicVolume,
        sfx: this.sfxVolume,
        muted: this.isMuted
      }));
    }
  }

  public getSettings() {
    return {
      master: this.masterVolume,
      music: this.musicVolume,
      sfx: this.sfxVolume,
      muted: this.isMuted
    };
  }

  public setVolumes(settings: { master?: number, music?: number, sfx?: number, muted?: boolean }) {
    if (settings.master !== undefined) this.masterVolume = settings.master;
    if (settings.music !== undefined) this.musicVolume = settings.music;
    if (settings.sfx !== undefined) this.sfxVolume = settings.sfx;
    if (settings.muted !== undefined) this.isMuted = settings.muted;
    
    this.saveSettings();
    this.updateBGMVolume();
  }

  private updateBGMVolume() {
    if (this.bgmAudio) {
      this.bgmAudio.volume = this.isMuted ? 0 : this.masterVolume * this.musicVolume;
    }
  }

  public async init() {
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  private playTone(freq: number, type: OscillatorType, duration: number, vol = 0.1) {
    if (this.isMuted || !this.ctx) return;
    this.init();

    const finalVol = vol * this.masterVolume * this.sfxVolume;
    if (finalVol <= 0) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(finalVol, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + duration);
  }

  public playBGM(scene: 'home' | 'spins' | 'sanctuary' | 'community' | 'shop' | 'battle') {
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
    this.updateBGMVolume();
    
    if (!this.isMuted) {
      this.bgmAudio.play().catch((e) => {
        console.warn('Audio auto-play prevented.', e);
      });
    }
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
    if (this.isMuted || !this.ctx) return;
    this.init();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const finalVol = 0.1 * this.masterVolume * this.sfxVolume;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.3);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(finalVol, t + 0.1);
    gain.gain.linearRampToValueAtTime(0, t + 0.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.4);
  }

  public playReelStop() {
    if (this.isMuted || !this.ctx) return;
    this.init();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const finalVol = 0.15 * this.masterVolume * this.sfxVolume;

    osc.type = 'square';
    osc.frequency.setValueAtTime(100, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(finalVol, t + 0.02);
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
    if (this.isMuted || !this.ctx) return;
    this.init();

    const t = this.ctx.currentTime;
    const freqs =[261.63, 329.63, 392.00, 523.25]; 
    const finalVol = 0.1 * this.masterVolume * this.sfxVolume;
    
    freqs.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(finalVol, t + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(t);
      osc.stop(t + 1.6);
    });
  }

  public playCollect() {
    this.playTone(987.77, 'sine', 0.5, 0.1);
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
    this.playTone(300, 'sine', 0.6, 0.2);
  }

  public playBonusReveal() {
    this.playTone(800, 'sine', 0.05, 0.1);
    setTimeout(() => this.playTone(1200, 'triangle', 0.1, 0.05), 50);
  }
}

export const audioService = new AudioService();
