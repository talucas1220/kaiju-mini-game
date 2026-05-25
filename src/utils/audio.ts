/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class RetroAudioEngine {
  private ctx: AudioContext | null = null;
  private bgmIntervalId: number | null = null;
  private isBgmPlaying: boolean = false;
  private enabled: boolean = false;

  constructor() {
    // Lazy initialized on first user interaction to satisfy Browser Autoplay Policy
  }

  private initContext() {
    if (!this.ctx) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new AudioContextClass();
      } catch (e) {
        console.warn('Web Audio API not supported by browser', e);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setEnabled(flag: boolean) {
    this.enabled = flag;
    if (flag) {
      this.initContext();
      if (!this.isBgmPlaying) {
        this.startBgm();
      }
    } else {
      this.stopBgm();
    }
  }

  private createNoiseBuffer(): AudioBuffer {
    if (!this.ctx) throw new Error();
    const bufferSize = this.ctx.sampleRate * 0.4; // 0.4 seconds of noise
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  public playMunch() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    // Crunch (sound 1)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);

    // Wet/Sip (sound 2)
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(400, this.ctx.currentTime + 0.05);
    osc2.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.15);

    gain2.gain.setValueAtTime(0.15, this.ctx.currentTime + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);
    osc2.start(this.ctx.currentTime + 0.05);
    osc2.stop(this.ctx.currentTime + 0.16);
  }

  public playSmash() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    // Exploding noise burst
    try {
      const buffer = this.createNoiseBuffer();
      const noiseNode = this.ctx.createBufferSource();
      noiseNode.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.35);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.38);

      noiseNode.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noiseNode.start();
      noiseNode.stop(this.ctx.currentTime + 0.4);
    } catch (e) {
      // Fallback
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(10, this.ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.31);
    }
  }

  public playExplosion() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    // High frequency followed by deep rumble
    this.playSmash();
    
    // Add metallic/crackling ring
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  public playLaser(duration: number = 0.15) {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(900, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(300, this.ctx.currentTime + duration);

    gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    // Apply vibrato modulation
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(45, this.ctx.currentTime);
    lfoGain.gain.setValueAtTime(80, this.ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    lfo.start();
    osc.start();
    lfo.stop(this.ctx.currentTime + duration);
    osc.stop(this.ctx.currentTime + duration);
  }

  public playGrow() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(480, this.ctx.currentTime + 0.5);

    // Frequency sweep 2
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(60, this.ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(240, this.ctx.currentTime + 0.5);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, this.ctx.currentTime + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);

    gain2.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain2.gain.linearRampToValueAtTime(0.15, this.ctx.currentTime + 0.3);
    gain2.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);

    osc.start();
    osc2.start();
    osc.stop(this.ctx.currentTime + 0.5);
    osc2.stop(this.ctx.currentTime + 0.5);
  }

  public playHurt() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, this.ctx.currentTime);
    osc.frequency.setValueAtTime(110, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  public playScream() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    // Screaming sliding frequencies
    const fStart = 800 + Math.random() * 400;
    osc.frequency.setValueAtTime(fStart, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(fStart * 0.4, this.ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.22);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }

  public playSelect() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.setValueAtTime(600, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.18);
  }

  // A looping simple chiptune BGM using arpeggios
  private startBgm() {
    this.isBgmPlaying = true;
    const noteSequence = [
      // Spooky / Epic retro chord progression
      // Am - C - F - E
      [220, 261.63, 329.63, 440], // Am
      [261.63, 329.63, 392.00, 523.25], // C
      [349.23, 440.00, 523.25, 698.46], // F
      [329.63, 415.30, 493.88, 659.25], // E
    ];

    let measure = 0;
    let step = 0;

    const playStep = () => {
      if (!this.isBgmPlaying || !this.enabled || !this.ctx) return;

      const chord = noteSequence[measure];
      // Play brief bass line and arpeggiator note
      const bassFrequency = chord[0] / 2; // Bass oct down
      let arpegFrequency = chord[step % chord.length];

      try {
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = 'triangle';
        bassOsc.frequency.setValueAtTime(bassFrequency, this.ctx.currentTime);
        bassGain.gain.setValueAtTime(0.06, this.ctx.currentTime);
        bassGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
        bassOsc.connect(bassGain);
        bassGain.connect(this.ctx.destination);
        bassOsc.start();
        bassOsc.stop(this.ctx.currentTime + 0.4);

        if (step % 2 === 0 || Math.random() > 0.3) {
          const melodyOsc = this.ctx.createOscillator();
          const melodyGain = this.ctx.createGain();
          melodyOsc.type = 'square';
          melodyOsc.frequency.setValueAtTime(arpegFrequency, this.ctx.currentTime);
          melodyGain.gain.setValueAtTime(0.015, this.ctx.currentTime);
          melodyGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);
          melodyOsc.connect(melodyGain);
          melodyGain.connect(this.ctx.destination);
          melodyOsc.start();
          melodyOsc.stop(this.ctx.currentTime + 0.25);
        }
      } catch (e) {
        console.warn('Audio BGM step failed to schedule', e);
      }

      step++;
      if (step >= 8) {
        step = 0;
        measure = (measure + 1) % noteSequence.length;
      }
    };

    // run loop
    const runLoop = () => {
      if (!this.isBgmPlaying) return;
      playStep();
      this.bgmIntervalId = window.setTimeout(runLoop, 250); // 120BPM 16th or 8th notes
    };

    runLoop();
  }

  private stopBgm() {
    this.isBgmPlaying = false;
    if (this.bgmIntervalId !== null) {
      clearTimeout(this.bgmIntervalId);
      this.bgmIntervalId = null;
    }
  }
}

export const audio = new RetroAudioEngine();
export default audio;
