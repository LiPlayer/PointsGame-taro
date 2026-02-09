import * as THREE from 'three';
import { StackPhysics, BlockData } from '../logic/StackPhysics';
import { StackMaterials } from './materials';
import { IRenderPipeline } from '../../../../engine/IRenderPipeline';
import { IPhysicsWorld } from '../../../../engine/IPhysicsWorld';

export class StackRender implements IRenderPipeline {
    private scene: THREE.Scene;
    private camera: THREE.OrthographicCamera;
    private renderer: THREE.WebGLRenderer | null = null;
    private container: any;

    private blockMeshes: THREE.Mesh[] = [];
    private currentBlockMesh: THREE.Mesh | null = null;
    private debrisMeshes: THREE.Mesh[] = [];

    private sharedGeometry: THREE.BoxGeometry;

    private cameraTargetY: number = 0;
    private currentCameraY: number = 0;

    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xF8FAFC); // Slate-50

        // Isometric-like view
        const aspect = 1; // Placeholder, will set in init
        const d = 150;
        this.camera = new THREE.OrthographicCamera(-d, d, d, -d, 1, 1000);
        this.camera.position.set(200, 200, 200);
        this.camera.lookAt(0, 0, 0);

        this.sharedGeometry = new THREE.BoxGeometry(1, 1, 1);

        this.setupLights();
    }

    private setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(100, 200, 50);
        this.scene.add(dirLight);
    }

    public init(canvas: any, width: number, height: number, dpr: number) {
        console.log(`[StackRender] Initializing WebGL Renderer. Workspace: ${width}x${height}, DPR: ${dpr}`);
        this.container = canvas;
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setPixelRatio(Math.min(dpr, 1.2));
        this.renderer.setSize(width, height);

        const aspect = width / height;
        const d = 150;
        this.camera.left = -d * aspect;
        this.camera.right = d * aspect;
        this.camera.top = d;
        this.camera.bottom = -d;
        this.camera.updateProjectionMatrix();
    }

    public render(physics: IPhysicsWorld, alpha: number) {
        if (!this.renderer) return;

        const stackPhysics = physics as StackPhysics;
        this.updateBlocks(stackPhysics);
        this.updateDebris(stackPhysics);
        this.updateCamera(stackPhysics);

        this.renderer.render(this.scene, this.camera);
    }

    private updateBlocks(physics: StackPhysics) {
        // Sync static stack
        while (this.blockMeshes.length < physics.stack.length) {
            const data = physics.stack[this.blockMeshes.length];
            const mesh = new THREE.Mesh(this.sharedGeometry, StackMaterials.getMaterial(data.color));
            this.scene.add(mesh);
            this.blockMeshes.push(mesh);
        }

        // Update positions/sizes
        physics.stack.forEach((data, i) => {
            const mesh = this.blockMeshes[i];
            mesh.position.copy(data.position);
            mesh.scale.copy(data.size);
        });

        // Current moving block
        if (physics.currentBlock) {
            if (!this.currentBlockMesh) {
                this.currentBlockMesh = new THREE.Mesh(this.sharedGeometry, StackMaterials.getMaterial(physics.currentBlock.color));
                this.scene.add(this.currentBlockMesh);
            }
            this.currentBlockMesh.position.copy(physics.currentBlock.position);
            this.currentBlockMesh.scale.copy(physics.currentBlock.size);
            this.currentBlockMesh.visible = true;
        } else if (this.currentBlockMesh) {
            this.currentBlockMesh.visible = false;
        }
    }

    private updateDebris(physics: StackPhysics) {
        // Simple debris handling: move down and fade out
        // Actually, internal physics.debris just grows.
        // For rendering, we want to pop from physics.debris and manage local debris meshes.
        while (physics.debris.length > 0) {
            const data = physics.debris.shift()!;
            const mesh = new THREE.Mesh(this.sharedGeometry, StackMaterials.getMaterial(data.color));
            mesh.position.copy(data.position);
            mesh.scale.copy(data.size);
            (mesh as any).velocity = new THREE.Vector3(0, -2, 0); // Basic gravity
            (mesh as any).life = 1.0;
            this.scene.add(mesh);
            this.debrisMeshes.push(mesh);
        }

        for (let i = this.debrisMeshes.length - 1; i >= 0; i--) {
            const mesh = this.debrisMeshes[i] as any;
            mesh.position.add(mesh.velocity);
            mesh.life -= 0.02;
            if (mesh.life <= 0) {
                this.scene.remove(mesh);
                this.debrisMeshes.splice(i, 1);
            }
        }
    }

    private updateCamera(physics: StackPhysics) {
        const topBlock = physics.stack[physics.stack.length - 1];
        if (topBlock) {
            this.cameraTargetY = topBlock.position.y;
        }

        // Smooth follow
        this.currentCameraY += (this.cameraTargetY - this.currentCameraY) * 0.1;

        // Offset for Isometric view lookAt
        const offset = new THREE.Vector3(200, 200 + this.currentCameraY, 200);
        this.camera.position.copy(offset);
        this.camera.lookAt(0, this.currentCameraY, 0);
    }

    public destroy() {
        console.log('[StackRender] Destroying scene and disposing resources');
        this.blockMeshes.forEach(m => this.scene.remove(m));
        this.blockMeshes = [];
        this.debrisMeshes.forEach(m => this.scene.remove(m));
        this.debrisMeshes = [];
        if (this.currentBlockMesh) {
            this.scene.remove(this.currentBlockMesh);
            this.currentBlockMesh = null;
        }
        this.sharedGeometry.dispose();
        StackMaterials.clear();
        this.renderer?.dispose();
    }
}
