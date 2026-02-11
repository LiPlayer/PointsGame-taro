import { SoundManager } from '../../../../engine/SoundManager';

export class StackAudio {
    // Diatonic Major Scale (C5 to C6) - 8 Notes
    // C, D, E, F, G, A, B, C
    private static MINOR_SCALE = [
        523.25, // C5
        587.33, // D5
        659.25, // E5
        698.46, // F5
        783.99, // G5
        880.00, // A5
        987.77, // B5
        1046.50 // C6
    ];

    /**
     * Plays an aesthetic "Thock" sound (Pitch envelope + Micro-transient)
     * @param scale Block scale factor (0.0 to 1.0). Smaller blocks = Higher pitch, Lower volume.
     */
    public static playTick(scale: number = 1.0) {
        // Dynamic Pitch: Smaller blocks sound higher pitched
        // + Random Jitter (+/- 5%) for organic feel
        // Multiplier: 1.0 -> 1.5x freq
        const sizeMod = 1 + (1 - Math.max(0.1, scale)) * 0.5;
        const randomPitch = 0.95 + Math.random() * 0.1;
        const pitchMod = sizeMod * randomPitch;

        // Dynamic Volume: Smaller blocks sound slightly quieter
        const volMod = 0.6 + 0.4 * Math.max(0.1, scale);

        // Random Pan: Add simple stereo width (-0.2 to 0.2)
        // Not real spatial audio, just "wide" feel
        const randomPan = (Math.random() * 0.4) - 0.2;

        // Body: Pitch sweep (220Hz -> 50Hz) for physical "Thock"
        // Balanced base volume 0.15
        SoundManager.getInstance().playImpact(220 * pitchMod, 50 * pitchMod, 0.08, 0.15 * volMod, randomPan);

        // Transient: Micro-click (High-pass noise) for definition
        SoundManager.getInstance().playNoise(0.01, 0.08 * volMod, 8000 * pitchMod, randomPan);

        // Character: Subtle wood/stone tone
        SoundManager.getInstance().playTone(300 * pitchMod, 'triangle', 0.04, 0.1 * volMod, randomPan);
    }

    /**
     * Plays a rising diatonic tone for consecutive perfect stacks
     * @param combo Current combo count
     */
    public static playPerfect(combo: number) {
        // Diatonic scale has 8 notes.
        // We want to loop every 8 combos.
        // Combo 1 -> Index 0. Combo 8 -> Index 7.
        const noteIndex = (combo - 1) % this.MINOR_SCALE.length;

        // Octave shift every 8 combos? 
        // User requested: "Max 8 combo sound". 
        // Let's ascend octaves but cap it.
        const octave = Math.floor((combo - 1) / this.MINOR_SCALE.length);

        // Cap octave at 1 (C6-C7 range) to prevent ear-piercing highs
        const cappedOctave = Math.min(octave, 1);
        const freq = this.MINOR_SCALE[noteIndex] * Math.pow(2, cappedOctave);

        // "叮" sound: Sine wave with long resonance for musicality
        // Balanced base volume to 0.15 per user request
        SoundManager.getInstance().playTone(freq, 'sine', 0.6, 0.15);

        // Add chord overlay for 8+ combo to emphasize reward (High C completion)
        if (combo % 8 === 0) {
            setTimeout(() => {
                // Add a perfect fifth (freq * 1.5) with gentle decay
                SoundManager.getInstance().playTone(freq * 1.5, 'sine', 0.4, 0.09);
                // Add octave (freq * 2) with gentle decay
                SoundManager.getInstance().playTone(freq * 2.0, 'sine', 0.4, 0.09);
            }, 30);
        }
    }
}
