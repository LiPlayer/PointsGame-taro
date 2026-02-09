import { SoundManager } from '../../engine/SoundManager';

export class StackAudio {
    // Pentatonic scale frequencies (C Major: C, D, E, G, A)
    private static scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];

    public static playScore(combo: number) {
        // Ascending scale based on combo
        const octaves = Math.floor(combo / 5);
        const noteIndex = combo % 5;
        const baseFreq = this.scale[noteIndex];
        const freq = baseFreq * Math.pow(2, octaves);

        // Play a "bell-like" tone (sine + subtle harmonics)
        SoundManager.getInstance().playTone(freq, 'sine', 0.3, 0.2);
        setTimeout(() => SoundManager.getInstance().playTone(freq * 2, 'triangle', 0.1, 0.05), 50);
    }

    public static playSlice() {
        // High pitch "zap"
        SoundManager.getInstance().playTone(800, 'sawtooth', 0.05, 0.05);
    }

    public static playCrash() {
        // Low frequency "thud"
        SoundManager.getInstance().playTone(150, 'square', 0.4, 0.3);
        SoundManager.getInstance().playTone(100, 'sawtooth', 0.5, 0.3);
    }
}
