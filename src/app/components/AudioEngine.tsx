import { useEffect, useRef } from 'react';

interface AudioEngineProps {
  isPlaying: boolean;
  tempo: number;
  pattern: boolean[][];
  tracks: string[];
}

// Simple drum sound generator using Web Audio API (lazy-initialized on first play)
class DrumSynth {
  private audioContext: AudioContext;

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  playKick() {
    const now = this.audioContext.currentTime;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.connect(gain);
    gain.connect(this.audioContext.destination);
    
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(0.01, now + 0.5);
    
    gain.gain.setValueAtTime(1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    
    osc.start(now);
    osc.stop(now + 0.5);
  }

  playSnare() {
    const now = this.audioContext.currentTime;
    const noise = this.audioContext.createBufferSource();
    const noiseFilter = this.audioContext.createBiquadFilter();
    const noiseEnvelope = this.audioContext.createGain();
    
    // Create noise buffer
    const bufferSize = this.audioContext.sampleRate * 0.5;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    noise.buffer = buffer;
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseEnvelope);
    noiseEnvelope.connect(this.audioContext.destination);
    
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1000;
    
    noiseEnvelope.gain.setValueAtTime(1, now);
    noiseEnvelope.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    
    noise.start(now);
    noise.stop(now + 0.2);
  }

  playHiHat(open: boolean = false) {
    const now = this.audioContext.currentTime;
    const noise = this.audioContext.createBufferSource();
    const noiseFilter = this.audioContext.createBiquadFilter();
    const noiseEnvelope = this.audioContext.createGain();
    
    const bufferSize = this.audioContext.sampleRate * (open ? 0.3 : 0.1);
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    noise.buffer = buffer;
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseEnvelope);
    noiseEnvelope.connect(this.audioContext.destination);
    
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = open ? 7000 : 10000;
    
    const duration = open ? 0.3 : 0.05;
    noiseEnvelope.gain.setValueAtTime(0.3, now);
    noiseEnvelope.gain.exponentialRampToValueAtTime(0.01, now + duration);
    
    noise.start(now);
    noise.stop(now + duration);
  }

  playClap() {
    const now = this.audioContext.currentTime;
    const noise = this.audioContext.createBufferSource();
    const noiseFilter = this.audioContext.createBiquadFilter();
    const noiseEnvelope = this.audioContext.createGain();
    
    const bufferSize = this.audioContext.sampleRate * 0.1;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    noise.buffer = buffer;
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseEnvelope);
    noiseEnvelope.connect(this.audioContext.destination);
    
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 2000;
    
    noiseEnvelope.gain.setValueAtTime(0.5, now);
    noiseEnvelope.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    
    noise.start(now);
    noise.stop(now + 0.1);
  }

  playSound(soundName: string) {
    switch(soundName.toLowerCase()) {
      case 'kick':
        this.playKick();
        break;
      case 'snare':
        this.playSnare();
        break;
      case 'open hi-hat':
        this.playHiHat(true);
        break;
      case 'closed hi-hat':
        this.playHiHat(false);
        break;
      case 'clap':
        this.playClap();
        break;
    }
  }
}

export function AudioEngine({ isPlaying, tempo, pattern, tracks }: AudioEngineProps) {
  const synthRef = useRef<DrumSynth | null>(null);
  const currentStepRef = useRef<number>(0);
  const patternRef = useRef(pattern);
  const tracksRef = useRef(tracks);

  // Keep refs in sync (avoids recreating interval when pattern changes)
  patternRef.current = pattern;
  tracksRef.current = tracks;

  useEffect(() => {
    if (!isPlaying) {
      currentStepRef.current = 0;
      return;
    }

    // Lazy-init DrumSynth on first play (respects browser autoplay policies)
    if (!synthRef.current) {
      synthRef.current = new DrumSynth();
    }

    const intervalMs = (60 / tempo) * 1000 / 4; // 16th note timing
    let timerId: ReturnType<typeof setTimeout>;

    const scheduleNext = () => {
      const step = currentStepRef.current;
      const pat = patternRef.current;
      const trks = tracksRef.current;

      trks.forEach((track, trackIndex) => {
        if (pat[trackIndex]?.[step]) {
          synthRef.current?.playSound(track);
        }
      });

      currentStepRef.current = (step + 1) % (pat[0]?.length ?? 16);
      timerId = setTimeout(scheduleNext, intervalMs);
    };

    scheduleNext();
    return () => clearTimeout(timerId);
  }, [isPlaying, tempo]);

  return null;
}
