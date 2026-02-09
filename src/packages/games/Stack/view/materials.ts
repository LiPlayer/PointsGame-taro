import * as THREE from 'three';

export class StackMaterials {
    private static materials: Map<number, THREE.MeshLambertMaterial> = new Map();

    public static getMaterial(color: number): THREE.MeshLambertMaterial {
        if (!this.materials.has(color)) {
            this.materials.set(color, new THREE.MeshLambertMaterial({
                color: color,
                flatShading: false,
            }));
        }
        return this.materials.get(color)!;
    }

    public static clear() {
        this.materials.forEach(m => m.dispose());
        this.materials.clear();
    }
}
