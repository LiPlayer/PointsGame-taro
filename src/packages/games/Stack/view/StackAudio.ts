import { SoundManager } from '../../../../engine/SoundManager';

export class StackAudio {
    // Pentatonic scale starting from C5
    private static COMBO_FREQUENCIES = [
        523.25, // C5
        587.33, // D5
        659.25, // E5
        783.99, // G5
        880.00, // A5
        1046.50 // C6
    ];

    /**
     * Plays a short "Tick" for every block placement
     */
    public static playTick() {
        // Crisp, short wood-block like sound
        SoundManager.getInstance().playTone(200, 'triangle', 0.04, 0.05);
    }

    /**
     * Plays a rising pentatonic tone for consecutive perfect stacks
     * @param combo Current combo count
     */
    public static playPerfect(combo: number) {
        const noteIndex = (combo - 1) % this.COMBO_FREQUENCIES.length;
        const freq = this.COMBO_FREQUENCIES[noteIndex];

        // "叮" sound: Sine wave with fast decay
        SoundManager.getInstance().playTone(freq, 'sine', 0.12, 0.15);

        // Add chord overlay for 5+ combo to emphasize reward
        if (combo >= 5) {
            setTimeout(() => {
                // Add a perfect fifth (freq * 1.5)
                SoundManager.getInstance().playTone(freq * 1.5, 'sine', 0.15, 0.15);
                // Add octave (freq * 2)
                SoundManager.getInstance().playTone(freq * 2.0, 'sine', 0.15, 0.15);
            }, 30);
        }
    }

    /**
     * Plays a short snip sound for sliced blocks
     */
    public static playSlice() {
        // Short "Snip" - higher than tick, drier
        SoundManager.getInstance().playTone(300, 'triangle', 0.06, 0.08);
    }

    /**
     * Plays a low, somber tone for game over
     */
    public static playGameOver() {
        // Deep Thud
        SoundManager.getInstance().playTone(100, 'sawtooth', 0.3, 0.1);
        setTimeout(() => {
            SoundManager.getInstance().playTone(70, 'sawtooth', 0.4, 0.1);
        }, 120);
    }

    /**
     * Heavy impact for falling debris
     */
    public static playFall() {
        SoundManager.getInstance().playTone(80, 'triangle', 0.1, 0.15);
    }
}
