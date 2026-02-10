import * as THREE from 'three';

export class StackMaterials {
    // Stores arrays of 6 materials for each color
    private static materialGroups: Map<number, THREE.Material[]> = new Map();

    public static getMaterials(color: number): THREE.Material[] {
        if (!this.materialGroups.has(color)) {
            const baseColor = new THREE.Color(color);

            // Top Mat (+15% lightness)
            const topColor = baseColor.clone();
            const hslt = { h: 0, s: 0, l: 0 };
            topColor.getHSL(hslt);
            topColor.setHSL(hslt.h, hslt.s, Math.min(hslt.l + 0.15, 1.0));

            // Side Mat (-10% lightness, +5% saturation)
            const sideColor = baseColor.clone();
            const hsls = { h: 0, s: 0, l: 0 };
            sideColor.getHSL(hsls);
            sideColor.setHSL(hsls.h, Math.min(hsls.s + 0.05, 1.0), Math.max(hsls.l - 0.10, 0));

            const topMat = new THREE.MeshStandardMaterial({
                color: topColor,
                roughness: 0.4,
                metalness: 0.1,
                emissive: topColor,
                emissiveIntensity: 0.05
            });

            const sideMat = new THREE.MeshStandardMaterial({
                color: sideColor,
                roughness: 0.4,
                metalness: 0.1,
                emissive: sideColor,
                emissiveIntensity: 0.05
            });

            // Mapping: 0:+x, 1:-x, 2:+y (top), 3:-y (bottom), 4:+z, 5:-z
            const materials = [
                sideMat, // +x
                sideMat, // -x
                topMat,  // +y (TOP)
                sideMat, // -y
                sideMat, // +z
                sideMat  // -z
            ];

            this.materialGroups.set(color, materials);
        }
        return this.materialGroups.get(color)!;
    }

    public static clear() {
        this.materialGroups.forEach(group => group.forEach(m => m.dispose()));
        this.materialGroups.clear();
    }
}
