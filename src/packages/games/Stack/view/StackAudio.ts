import { SoundManager } from '../../../../engine/SoundManager';

export class StackAudio {
    // Pentatonic scale starting from C5 (C-D-E-G-A)
    private static PENTATONIC_BASE = [
        523.25, // C5
        587.33, // D5
        659.25, // E5
        783.99, // G5
        880.00  // A5
    ];

    /**
     * Plays an aesthetic "Thock" sound (Pitch envelope + Micro-transient)
     */
    public static playTick() {
        // Body: Pitch sweep (220Hz -> 50Hz) for physical "Thock"
        // Balanced volume to 0.3
        SoundManager.getInstance().playImpact(220, 50, 0.08, 0.3);

        // Transient: Micro-click (High-pass noise) for definition
        SoundManager.getInstance().playNoise(0.01, 0.1, 8000);

        // Character: Subtle wood/stone tone
        SoundManager.getInstance().playTone(300, 'triangle', 0.04, 0.1);
    }

    /**
     * Plays a rising pentatonic tone for consecutive perfect stacks
     * @param combo Current combo count
     */
    public static playPerfect(combo: number) {
        // Pentatonic scale has 5 notes. C6 is octave up of C5.
        const noteIndex = (combo - 1) % this.PENTATONIC_BASE.length;
        const octave = Math.floor((combo - 1) / this.PENTATONIC_BASE.length);

        // Cap octave at 2 (C7 range) to keep it pleasant
        const cappedOctave = Math.min(octave, 2);
        const freq = this.PENTATONIC_BASE[noteIndex] * Math.pow(2, cappedOctave);

        // Balanced base volume to 0.3
        SoundManager.getInstance().playTone(freq, 'sine', 0.6, 0.3);

        // Add chord overlay for 5+ combo to emphasize reward
        if (combo >= 5) {
            setTimeout(() => {
                // Add a perfect fifth (freq * 1.5) with gentle decay
                SoundManager.getInstance().playTone(freq * 1.5, 'sine', 0.4, 0.15);
                // Add octave (freq * 2) with gentle decay
                SoundManager.getInstance().playTone(freq * 2.0, 'sine', 0.4, 0.15);
            }, 30);
        }
    }
}
