import * as THREE from 'three';
import { StackPhysics, BlockData } from '../logic/StackPhysics';
import { StackMaterials } from './materials';
import { IRenderPipeline } from '../../../../engine/IRenderPipeline';
import { IPhysicsWorld } from '../../../../engine/IPhysicsWorld';

interface DebrisMesh extends THREE.Mesh {
    life: number;
}

interface RippleMesh extends THREE.LineLoop {
    life: number;
    maxLife: number;
    baseScale: number;
}

export class StackRender implements IRenderPipeline {
    private scene: THREE.Scene;
    private camera: THREE.OrthographicCamera;
    private renderer: THREE.WebGLRenderer | null = null;
    private container: any;

    private blockMeshes: THREE.Mesh[] = [];
    private currentBlockMesh: THREE.Mesh | null = null;
    private perfectFlashMesh: THREE.Mesh | null = null;
    private perfectFlashIntensity: number = 0;
    private debrisMeshes: DebrisMesh[] = [];
    private particles: THREE.Points | null = null;

    private sharedGeometry: THREE.BoxGeometry;

    private cameraTargetY: number = 0;
    private currentCameraY: number = 0;

    // VFX Systems
    private rippleMeshes: RippleMesh[] = [];
    private screenShake: number = 0; // Remaining shake frames

    // Culling System
    private frustum: THREE.Frustum = new THREE.Frustum();
    private projScreenMatrix: THREE.Matrix4 = new THREE.Matrix4();

    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = null;

        const d = 150;
        this.camera = new THREE.OrthographicCamera(-d, d, d, -d, 1, 2000);
        this.camera.position.set(300, 300, 300);
        this.camera.lookAt(0, 0, 0);

        this.sharedGeometry = new THREE.BoxGeometry(1, 1, 1);

        this.createParticles();
        this.setupLights();
    }

    private setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(-100, 200, 100);
        dirLight.castShadow = true;

        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        const d = 150;
        dirLight.shadow.camera.left = -d;
        dirLight.shadow.camera.right = d;
        dirLight.shadow.camera.top = d;
        dirLight.shadow.camera.bottom = -d;
        dirLight.shadow.bias = -0.0005;

        this.scene.add(dirLight);
    }

    private createParticles() {
        const particleCount = 60;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 400;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 600;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 400;
            sizes[i] = Math.random() < 0.3 ? 3 : 2;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        const material = new THREE.PointsMaterial({
            color: 0xFFFFFF,
            size: 3,
            sizeAttenuation: false,
            transparent: true,
            opacity: 0.4
        });

        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
    }

    public init(canvas: any, width: number, height: number, dpr: number) {
        this.container = canvas;
        this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
        this.renderer.setPixelRatio(Math.min(dpr, 1.2));
        this.renderer.setSize(width, height);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

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
        this.updateCamera(stackPhysics);

        // Update Frustum for Manual Culling
        this.projScreenMatrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
        this.frustum.setFromProjectionMatrix(this.projScreenMatrix);

        this.updateBlocks(stackPhysics);
        this.updateDebris(stackPhysics);
        this.updateParticles();
        this.updateRipples();
        this.updatePerfectFlash(stackPhysics);

        this.renderer.render(this.scene, this.camera);
    }

    private updateBlocks(physics: StackPhysics) {
        while (this.blockMeshes.length < physics.stack.length) {
            const data = physics.stack[this.blockMeshes.length];
            const mesh = new THREE.Mesh(this.sharedGeometry, StackMaterials.getMaterials(data.color));
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.scene.add(mesh);
            this.blockMeshes.push(mesh);
        }

        const topIndex = physics.stack.length - 1;
        physics.stack.forEach((data: BlockData, i: number) => {
            const mesh = this.blockMeshes[i];
            mesh.position.copy(data.position as any);
            mesh.scale.copy(data.size as any);

            // Always rely on Camera Frustum Culling for visibility
            mesh.visible = this.frustum.intersectsObject(mesh);

            // Ensure material is opqaue since we removed the distance fade
            if (mesh.visible && Array.isArray(mesh.material)) {
                mesh.material.forEach(m => {
                    m.transparent = false;
                    m.opacity = 1;
                });
            }
        });

        if (physics.currentBlock) {
            if (!this.currentBlockMesh) {
                this.currentBlockMesh = new THREE.Mesh(this.sharedGeometry, StackMaterials.getMaterials(physics.currentBlock.color));
                this.currentBlockMesh.castShadow = true;
                this.currentBlockMesh.receiveShadow = true;
                this.scene.add(this.currentBlockMesh);
            }
            this.currentBlockMesh.position.copy(physics.currentBlock.position as any);
            this.currentBlockMesh.scale.copy(physics.currentBlock.size as any);
            this.currentBlockMesh.material = StackMaterials.getMaterials(physics.currentBlock.color);

            // Apply Culling for current block
            this.currentBlockMesh.visible = this.frustum.intersectsObject(this.currentBlockMesh);
        } else if (this.currentBlockMesh) {
            this.currentBlockMesh.visible = false;
        }
    }

    private updateDebris(physics: StackPhysics) {
        while (physics.debris.length > this.debrisMeshes.length) {
            const data = physics.debris[this.debrisMeshes.length];
            const mesh = new THREE.Mesh(this.sharedGeometry, StackMaterials.getMaterials(data.color)) as unknown as DebrisMesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.scene.add(mesh);
            this.debrisMeshes.push(mesh);
        }

        for (let i = this.debrisMeshes.length - 1; i >= 0; i--) {
            const mesh = this.debrisMeshes[i];
            const data = physics.debris[i];

            if (!data || data.position.y < this.currentCameraY - 250) {
                this.scene.remove(mesh);
                this.debrisMeshes.splice(i, 1);
                continue;
            }

            mesh.position.copy(data.position as any);
            mesh.scale.copy(data.size as any);
            if (data.quaternion) mesh.quaternion.copy(data.quaternion as any);

            // Manual Culling for debris
            mesh.visible = this.frustum.intersectsObject(mesh);
        }
    }

    private updatePerfectFlash(physics: StackPhysics) {
        // Feature removed per user request
    }

    private updateParticles() {
        if (!this.particles) return;
        const positions = this.particles.geometry.attributes.position.array as Float32Array;
        for (let i = 1; i < positions.length; i += 3) {
            positions[i] += 0.2;
            if (positions[i] > 400) positions[i] = -200;
        }
        this.particles.geometry.attributes.position.needsUpdate = true;
        this.particles.position.y = this.currentCameraY * 0.8;
    }

    private updateCamera(physics: StackPhysics) {
        const topBlock = physics.stack[physics.stack.length - 1];
        if (topBlock) this.cameraTargetY = topBlock.position.y;
        this.currentCameraY += (this.cameraTargetY - this.currentCameraY) * 0.1;

        const offset = new THREE.Vector3(300, 300 + this.currentCameraY, 300);
        this.camera.position.copy(offset);
        this.camera.lookAt(0, this.currentCameraY, 0);

        if (this.screenShake > 0) {
            const intensity = this.screenShake * 1.5;
            this.camera.position.x += (Math.random() - 0.5) * intensity;
            this.camera.position.y += (Math.random() - 0.5) * intensity;
            this.screenShake--;
        }
    }

    public triggerPerfectFlash(combo: number) {
        // Feature removed
    }

    public triggerPerfectRipple(positionY: number, size: THREE.Vector3) {
        const halfW = size.x / 2 + 5;
        const halfD = size.z / 2 + 5;
        const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-halfW, 0, -halfD),
            new THREE.Vector3(halfW, 0, -halfD),
            new THREE.Vector3(halfW, 0, halfD),
            new THREE.Vector3(-halfW, 0, halfD),
        ]);
        const material = new THREE.LineBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.8 });
        const ripple = new THREE.LineLoop(geometry, material) as unknown as RippleMesh;
        ripple.position.set(0, positionY + (size.y / 2) + 1, 0);
        ripple.life = 1.0;
        ripple.maxLife = 1.0;
        ripple.baseScale = 1.0;
        this.scene.add(ripple);
        this.rippleMeshes.push(ripple);
    }

    public triggerScreenShake(intensity: number = 10) {
        this.screenShake = intensity;
    }

    private updateRipples() {
        for (let i = this.rippleMeshes.length - 1; i >= 0; i--) {
            const ripple = this.rippleMeshes[i];
            ripple.scale.x += 0.15;
            ripple.scale.z += 0.15;
            ripple.life -= 0.05;
            const material = ripple.material as THREE.LineBasicMaterial;
            material.opacity = ripple.life / ripple.maxLife * 0.8;
            if (ripple.life <= 0) {
                this.scene.remove(ripple);
                ripple.geometry.dispose();
                material.dispose();
                this.rippleMeshes.splice(i, 1);
            }
        }
    }

    public destroy() {
        this.blockMeshes.forEach(m => this.scene.remove(m));
        this.blockMeshes = [];
        this.debrisMeshes.forEach(m => this.scene.remove(m));
        this.debrisMeshes = [];
        if (this.currentBlockMesh) this.scene.remove(this.currentBlockMesh);
        if (this.perfectFlashMesh) this.scene.remove(this.perfectFlashMesh);
        this.sharedGeometry.dispose();
        StackMaterials.clear();
        this.renderer?.dispose();
    }
}
