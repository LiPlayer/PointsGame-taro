import * as THREE from 'three';

export class StackMaterials {
    private static materials: Map<number, THREE.Material> = new Map();

    public static getMaterial(color: number): THREE.MeshStandardMaterial {
        if (!this.materials.has(color)) {
            const material = new THREE.MeshStandardMaterial({
                color: color,
                flatShading: false, // Smooth shading for roundness if we had it, but box is sharp.
                roughness: 0.4, // Smoother plastic
                metalness: 0.1, // Slight reflection
                emissive: color,
                emissiveIntensity: 0.1 // Slight inner glow for "Jelly" look
            });
            this.materials.set(color, material);
        }
        return this.materials.get(color) as THREE.MeshStandardMaterial;
    }

    public static clear() {
        this.materials.forEach(m => m.dispose());
        this.materials.clear();
    }
}
