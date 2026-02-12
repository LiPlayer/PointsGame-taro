import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { IRenderPipeline } from '../../../../engine/IRenderPipeline';
import { IPhysicsWorld } from '../../../../engine/IPhysicsWorld';
import { KnifePhysics, KnifeData } from '../logic/KnifePhysics';

export class KnifeRender implements IRenderPipeline {
    private scene: THREE.Scene;
    private camera: THREE.OrthographicCamera;
    private renderer!: THREE.WebGLRenderer;

    private targetMesh: THREE.Mesh;
    private knifeGroup: THREE.Group;

    // Mesh cache to avoid recreation
    private knifeMeshes: Map<CANNON.Body, THREE.Group> = new Map();

    constructor() {
        this.scene = new THREE.Scene();
        // Camera will be properly set in init/resize
        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
        this.camera.position.z = 10;

        this.knifeGroup = new THREE.Group();
        this.scene.add(this.knifeGroup);

        // --- Create Log (Target) ---
        // Compliance: Spec - Minimalist Flat Vector (MeshBasicMaterial, no highlights)
        const logGeom = new THREE.CylinderGeometry(1.0, 1.0, 0.4, 40);
        const logMat = new THREE.MeshBasicMaterial({ color: 0x8b5a2b });
        this.targetMesh = new THREE.Mesh(logGeom, logMat);
        this.targetMesh.rotation.x = Math.PI / 2;
        this.targetMesh.position.y = 3.5; // Sync with Physics targetBody init

        // Add texture lines (Rings)
        // Position them on the top face (which is now facing camera due to rotation.x = PI/2)
        // In CylinderGeometry, the top face is at y = height / 2 = 0.2
        for (let i = 1; i <= 3; i++) {
            const ringGeom = new THREE.RingGeometry(0.3 * i, 0.3 * i + 0.05, 32);
            const ring = new THREE.Mesh(ringGeom, new THREE.MeshBasicMaterial({ color: 0x5d3a1a, side: THREE.DoubleSide }));
            ring.position.y = 0.21; // Move along cylinder's local Y (towards camera)
            ring.rotation.x = -Math.PI / 2; // Face the camera locally
            this.targetMesh.add(ring);
        }

        this.scene.add(this.targetMesh);
    }

    public init(canvas: any, width: number, height: number, dpr: number) {
        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: true
        });
        this.renderer.setPixelRatio(dpr);
        this.renderer.setSize(width, height, false);
        this.updateCamera(width, height);
    }

    private updateCamera(width: number, height: number) {
        const aspect = width / height;
        // Total world height we want to see is about 12 units (-6 to 6)
        const viewSize = 11;
        this.camera.left = -viewSize * aspect / 2;
        this.camera.right = viewSize * aspect / 2;
        this.camera.top = viewSize / 2;
        this.camera.bottom = -viewSize / 2;
        this.camera.updateProjectionMatrix();
    }

    public render(physics: IPhysicsWorld) {
        const p = physics as KnifePhysics;

        // 1. Sync target
        this.targetMesh.rotation.y = p.targetRotation;
        this.targetMesh.position.y = p.targetBody.position.y; // For recoil

        // 2. Sync Knives
        this.syncKnives(p);

        this.renderer.render(this.scene, this.camera);
    }

    private syncKnives(p: KnifePhysics) {
        const allKnives = [...p.knives];
        if (p.currentKnife) allKnives.push(p.currentKnife);

        // Add/Update meshes
        allKnives.forEach(knifeData => {
            let group = this.knifeMeshes.get(knifeData.body as any);
            if (!group) {
                group = this.createKnifeMesh();
                this.knifeMeshes.set(knifeData.body as any, group);
                this.knifeGroup.add(group);
            }

            group.position.copy(knifeData.body.position as any);
            group.quaternion.copy(knifeData.body.quaternion as any);
        });

        // Cleanup removed knives
        for (const [body, group] of this.knifeMeshes.entries()) {
            const exists = allKnives.some(k => k.body === body);
            if (!exists) {
                this.knifeGroup.remove(group);
                this.knifeMeshes.delete(body);
                // Dispose geometries/materials if necessary, but here we use shared ones
            }
        }
    }

    private createKnifeMesh(): THREE.Group {
        const group = new THREE.Group();

        // Blade (Minimalist Flat)
        const bladeGeom = new THREE.BoxGeometry(0.1, 0.5, 0.05);
        const bladeMat = new THREE.MeshBasicMaterial({ color: 0xb0b0b0 });
        const blade = new THREE.Mesh(bladeGeom, bladeMat);
        blade.position.y = 0.15; // Offset from group center (blade tip is top)
        group.add(blade);

        // Handle
        const handleGeom = new THREE.BoxGeometry(0.12, 0.3, 0.08);
        const handleMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
        const handle = new THREE.Mesh(handleGeom, handleMat);
        handle.position.y = -0.25;
        group.add(handle);

        return group;
    }

    public resize(w: number, h: number) {
        this.renderer.setSize(w, h, false);
        this.updateCamera(w, h);
    }

    public destroy() {
        this.renderer.dispose();
        this.knifeMeshes.forEach(g => {
            g.children.forEach(c => {
                const mesh = c as THREE.Mesh;
                mesh.geometry.dispose();
                (mesh.material as THREE.Material).dispose();
            });
        });
        this.targetMesh.geometry.dispose();
        (this.targetMesh.material as THREE.Material).dispose();
    }
}
