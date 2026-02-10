import * as THREE from 'three';

export class StackMaterials {
    private static materials: Map<number, THREE.MeshPhongMaterial> = new Map();

    public static getMaterial(color: number): THREE.MeshPhongMaterial {
        if (!this.materials.has(color)) {
            this.materials.set(color, new THREE.MeshPhongMaterial({
                color: color,
                flatShading: false,
                specular: 0x222222, // Slight specular for plastic toy look
                shininess: 10 // Low shininess but not dead matte
            }));
        }
        return this.materials.get(color)!;
    }

    public static clear() {
        this.materials.forEach(m => m.dispose());
        this.materials.clear();
    }
}
