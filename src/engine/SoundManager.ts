import Taro from '@tarojs/taro';

export class SoundManager {
    private static instance: SoundManager;
    private ctx: any; // AudioContext or similar
    private enabled: boolean = true;
    private gainNode: any;



    private constructor() {
        try {
            if (process.env.TARO_ENV === 'weapp') {
                console.log('[SoundManager] initializing WeApp WebAudioContext');
                this.ctx = Taro.createWebAudioContext();
            } else {
                // @ts-ignore
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (AudioContext) {
                    this.ctx = new AudioContext();
                }
            }

            if (this.ctx) {
                this.gainNode = this.ctx.createGain();
                this.gainNode.connect(this.ctx.destination);
                console.log('[SoundManager] Context created, state:', this.ctx.state);
            } else {
                console.warn('[SoundManager] Web Audio API not supported in this environment');
            }
        } catch (e) {
            console.error('[SoundManager] initialization failed:', e);
        }
    }

    public static getInstance(): SoundManager {
        if (!SoundManager.instance) {
            SoundManager.instance = new SoundManager();
        }
        return SoundManager.instance;
    }

    public async unlock() {
        if (this.ctx && this.ctx.state === 'suspended') {
            console.log('[SoundManager] Resuming suspended context (unlock)...');
            await this.ctx.resume();
            console.log('[SoundManager] Context state after resume:', this.ctx.state);
        }
    }

    public async suspend() {
        if (this.ctx && this.ctx.state === 'running') {
            console.log('[SoundManager] Suspending context...');
            await this.ctx.suspend();
            console.log('[SoundManager] Context suspended');
        }
    }

    public async resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            console.log('[SoundManager] Resuming context...');
            await this.ctx.resume();
            console.log('[SoundManager] Context resumed');
        }
    }

    public playTone(freq: number, type: 'sine' | 'square' | 'sawtooth' | 'triangle' = 'sine', duration: number = 0.1, vol: number = 0.1, pan: number = 0) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        let panner: StereoPannerNode | null = null;
        if (this.ctx.createStereoPanner) {
            panner = this.ctx.createStereoPanner();
            panner.pan.value = Math.max(-1, Math.min(1, pan));
        }

        // Small lookahead to ensure synchronization and prevent dropped notes
        const startTime = this.ctx.currentTime + 0.01;
        const endTime = startTime + duration;

        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime);

        // Volume Envelope: Start at requested vol, ramp to 0
        gain.gain.setValueAtTime(vol, startTime);
        // Linear ramp is safer for very short durations than exponential
        gain.gain.linearRampToValueAtTime(0.001, endTime);

        osc.connect(gain);
        if (panner) {
            gain.connect(panner);
            panner.connect(this.ctx.destination);
        } else {
            gain.connect(this.ctx.destination);
        }

        osc.start(startTime);
        osc.stop(endTime);
    }

    /**
     * Plays a burst of white noise (useful for impacts/grit)
     */
    public playNoise(duration: number = 0.1, vol: number = 0.1, filterFreq: number = 2000, pan: number = 0) {
        if (!this.ctx) return;

        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;

        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        let panner: StereoPannerNode | null = null;
        if (this.ctx.createStereoPanner) {
            panner = this.ctx.createStereoPanner();
            panner.pan.value = Math.max(-1, Math.min(1, pan));
        }

        const startTime = this.ctx.currentTime + 0.01;
        const endTime = startTime + duration;

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(filterFreq, startTime);

        gain.gain.setValueAtTime(vol, startTime);
        gain.gain.linearRampToValueAtTime(0.001, endTime);

        source.connect(filter);
        filter.connect(gain);
        if (panner) {
            gain.connect(panner);
            panner.connect(this.ctx.destination);
        } else {
            gain.connect(this.ctx.destination);
        }

        source.start(startTime);
        source.stop(endTime);
    }

    /**
     * Plays a percussive impact with a pitch envelope (sweep)
     */
    public playImpact(startFreq: number, endFreq: number, duration: number = 0.1, vol: number = 0.1, pan: number = 0) {
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        let panner: StereoPannerNode | null = null;
        if (this.ctx.createStereoPanner) {
            panner = this.ctx.createStereoPanner();
            panner.pan.value = Math.max(-1, Math.min(1, pan));
        }

        // Small lookahead
        const startTime = this.ctx.currentTime + 0.01;
        const endTime = startTime + duration;

        osc.type = 'sine'; // Sine is best for clean thumps

        // Pitch Envelope: Sweep frequency down exponentially
        osc.frequency.setValueAtTime(startFreq, startTime);
        osc.frequency.exponentialRampToValueAtTime(Math.max(0.01, endFreq), endTime);

        // Volume Envelope: Sharp attack, linear decay
        gain.gain.setValueAtTime(vol, startTime);
        gain.gain.linearRampToValueAtTime(0.001, endTime);

        osc.connect(gain);
        if (panner) {
            gain.connect(panner);
            panner.connect(this.ctx.destination);
        } else {
            gain.connect(this.ctx.destination);
        }

        osc.start(startTime);
        osc.stop(endTime);
    }
}

