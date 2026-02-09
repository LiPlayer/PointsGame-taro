import * as THREE from 'three';

export class StackMaterials {
    private static materials: Map<number, THREE.MeshPhongMaterial> = new Map();

    public static getMaterial(color: number): THREE.MeshPhongMaterial {
        if (!this.materials.has(color)) {
            this.materials.set(color, new THREE.MeshPhongMaterial({
                color: color,
                flatShading: false,
                specular: 0x333333,
                shininess: 30
            }));
        }
        return this.materials.get(color)!;
    }

    public static clear() {
        this.materials.forEach(m => m.dispose());
        this.materials.clear();
    }
}
