import * as THREE from 'three';

export class StackMaterials {
    // Stores arrays of 6 materials for each color
    private static materialGroups: Map<number, THREE.Material[]> = new Map();

    public static getMaterials(hexColor: number): THREE.Material[] {
        if (!this.materialGroups.has(hexColor)) {
            const color = new THREE.Color(hexColor);
            const hsl = { h: 0, s: 0, l: 0 };
            color.getHSL(hsl);

            const h = hsl.h;
            const s = hsl.s; // Should be 0.8 already from Physics, but let's be safe

            // Top (65), Left (50), Right (35) logic is now handled by DirectionalLight
            // We just set the base color and let the light do the shading.
            const material = new THREE.MeshStandardMaterial({
                color: color,
                roughness: 0.5,
                metalness: 0.1
            });

            // Specific faces might not need separate materials anymore if we trust lighting.
            // But to support slicing nicely, we might want to keep the array structure?
            // Actually, for standard lighting, a single material is usually enough if the geometry has normals.
            // BoxGeometry has normals.

            // However, the original code used an array. Let's stick to array but all same material
            // to minimize code changes in Render.ts loop?
            // Or just return a single material? StackRender expects `mesh.material` to be array or single.
            // Render logic: `if (Array.isArray(mesh.material)) ...`
            // Let's return an array of the SAME material to be safe with existing fade logic.

            const materials = [
                material, material, material, material, material, material
            ];

            this.materialGroups.set(hexColor, materials);
        }
        return this.materialGroups.get(hexColor)!;
    }

    public static clear() {
        this.materialGroups.forEach(group => group.forEach(m => m.dispose()));
        this.materialGroups.clear();
    }
}
