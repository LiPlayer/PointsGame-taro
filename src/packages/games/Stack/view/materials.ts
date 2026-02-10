import * as THREE from 'three';

export class StackMaterials {
    // Stores arrays of 6 materials for each color
    // Stores arrays of materials for each color (for compatibility with renderer loop)
    private static materialGroups: Map<number, THREE.Material[]> = new Map();

    public static getMaterials(hexColor: number): THREE.Material[] {
        if (!this.materialGroups.has(hexColor)) {
            const color = new THREE.Color(hexColor);

            // Use Phong for better specular highlights (plastic look)
            const material = new THREE.MeshPhongMaterial({
                color: color,
                shininess: 30, // Moderate shine for edge definition
                specular: 0x444444, // Dark grey specular
                flatShading: true // Essential for the low-poly look
            });

            // Return array of same material to be safe with existing renderer logic
            // that iterates over material array for opacity
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
