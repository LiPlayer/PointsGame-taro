import * as THREE from 'three';
import { IRenderPipeline } from '../../../../engine/IRenderPipeline';
import { IPhysicsWorld } from '../../../../engine/IPhysicsWorld';
import { KnifePhysics } from '../logic/KnifePhysics';

export class KnifeRender implements IRenderPipeline {
    private scene: THREE.Scene;
    private camera: THREE.OrthographicCamera;
    private renderer: THREE.WebGLRenderer;

    private targetMesh: THREE.Mesh;
    private knifeContainer: THREE.Group;

    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
        this.camera.position.z = 5;

        this.knifeContainer = new THREE.Group();
        this.scene.add(this.knifeContainer);

        // Placeholder Target
        const geometry = new THREE.CylinderGeometry(0.5, 0.5, 0.1, 32);
        const material = new THREE.MeshBasicMaterial({ color: 0xd2a679 });
        this.targetMesh = new THREE.Mesh(geometry, material);
        this.targetMesh.rotation.x = Math.PI / 2;
        this.scene.add(this.targetMesh);
    }

    public init(canvas: any, width: number, height: number, dpr: number) {
        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setPixelRatio(dpr);
        this.renderer.setSize(width, height, false);
        this.updateCamera(width, height);
    }

    private updateCamera(width: number, height: number) {
        const aspect = width / height;
        const viewSize = 2;
        this.camera.left = -viewSize * aspect / 2;
        this.camera.right = viewSize * aspect / 2;
        this.camera.top = viewSize / 2;
        this.camera.bottom = -viewSize / 2;
        this.camera.updateProjectionMatrix();
    }

    public render(physics: IPhysicsWorld) {
        const p = physics as KnifePhysics;

        // Sync target rotation
        this.targetMesh.rotation.y = p.targetRotation;

        this.renderer.render(this.scene, this.camera);
    }

    public destroy() {
        this.renderer.dispose();
    }
}
