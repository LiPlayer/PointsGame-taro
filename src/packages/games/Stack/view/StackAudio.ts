import { SoundManager } from '../../../../engine/SoundManager';

export class StackAudio {
    // Standard major scale frequencies (starting from C4)
    private static COMBO_FREQUENCIES = [
        261.63, // C4
        293.66, // D4
        329.63, // E4
        349.23, // F4
        392.00, // G4
        440.00, // A4
        493.88, // B4
        523.25  // C5
    ];

    /**
     * Plays a rising pitch tone for consecutive perfect stacks
     * @param combo Current combo count
     */
    public static playPerfect(combo: number) {
        const noteIndex = (combo - 1) % this.COMBO_FREQUENCIES.length;
        const freq = this.COMBO_FREQUENCIES[noteIndex];

        // Premium "Ting" sound: Sine wave with fast decay
        SoundManager.getInstance().playTone(freq, 'sine', 0.15, 0.15);

        // Add a subtle harmonic a fifth above for richer sound
        setTimeout(() => {
            SoundManager.getInstance().playTone(freq * 1.5, 'sine', 0.1, 0.05);
        }, 20);

        // 8th Combo (Major Chord trigger) - C5 (Index 7)
        // Play a full Major Chord (Root, Major Third, Perfect Fifth)
        if ((combo - 1) % 8 === 7) {
            setTimeout(() => {
                // Major Third (E5 usually, but let's just do freq * 1.25)
                SoundManager.getInstance().playTone(freq * 1.25, 'sine', 0.2, 0.2);
                // Octave (freq * 2)
                SoundManager.getInstance().playTone(freq * 2.0, 'sine', 0.2, 0.2);
            }, 50);
        }
    }

    /**
     * Plays a short, percussive sound for incomplete/sliced stacks
     */
    public static playSlice() {
        // Lower, duller sound (Triangle wave)
        SoundManager.getInstance().playTone(150, 'triangle', 0.08, 0.1);
    }

    /**
     * Plays a low, somber tone for game over
     */
    public static playGameOver() {
        SoundManager.getInstance().playTone(110, 'sawtooth', 0.4, 0.1);
        setTimeout(() => {
            SoundManager.getInstance().playTone(82.41, 'sawtooth', 0.6, 0.1);
        }, 150);
    }

    /**
     * Plays a heavy thud sound for falling debris impact
     */
    public static playFall() {
        // Deep, heavy impact (low Triangle wave with quick decay)
        SoundManager.getInstance().playTone(65, 'triangle', 0.12, 0.15);
    }
}
