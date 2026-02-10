import * as THREE from 'three';
import { StackPhysics, BlockData } from '../logic/StackPhysics';
import { StackMaterials } from './materials';
import { IRenderPipeline } from '../../../../engine/IRenderPipeline';
import { IPhysicsWorld } from '../../../../engine/IPhysicsWorld';

interface DebrisMesh extends THREE.Mesh {
    velocity: THREE.Vector3;
    angularVelocity: THREE.Vector3;
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
    private debrisMeshes: DebrisMesh[] = [];
    private particles: THREE.Points | null = null;

    private sharedGeometry: THREE.BoxGeometry;

    private cameraTargetY: number = 0;
    private currentCameraY: number = 0;

    // VFX Systems
    private rippleMeshes: RippleMesh[] = [];
    private screenShake: number = 0; // Remaining shake frames

    constructor() {
        this.scene = new THREE.Scene();
        // Background controlled by CSS gradient in index.tsx
        this.scene.background = null;

        // Premium Isometric view
        const d = 120; // Tighter zoom
        this.camera = new THREE.OrthographicCamera(-d, d, d, -d, 1, 2000);
        this.camera.position.set(300, 300, 300); // More distant for better orthographic feel
        this.camera.lookAt(0, 0, 0);

        this.sharedGeometry = new THREE.BoxGeometry(1, 1, 1);

        this.setupLights();
    }

    private setupLights() {
        // High-end Studio lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // Brighter ambient for Zen look
        this.scene.add(ambientLight);

        // Warm Key Light (Front-Right-Top) with Shadows
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(100, 200, 100);
        dirLight.castShadow = true;

        // Shadow High Res Configuration
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        const d = 150;
        dirLight.shadow.camera.left = -d;
        dirLight.shadow.camera.right = d;
        dirLight.shadow.camera.top = d;
        dirLight.shadow.camera.bottom = -d;
        dirLight.shadow.bias = -0.0005;
        this.scene.add(dirLight);

        // Rim Light (Back-Left-Top)
        const rimLight = new THREE.DirectionalLight(0xffffff, 0.4);
        rimLight.position.set(-100, 150, -100);
        this.scene.add(rimLight);

        // Ground Foundation
        const groundGeo = new THREE.PlaneGeometry(1000, 1000);
        const groundMat = new THREE.ShadowMaterial({
            opacity: 0.1,
            color: 0x000000
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -50;
        ground.receiveShadow = true;
        this.scene.add(ground);

        this.createParticles();
    }

    private createParticles() {
        // Keep existing particle logic
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
        console.log(`[StackRender] Initializing WebGL Renderer. Workspace: ${width}x${height}, DPR: ${dpr}`);
        this.container = canvas;
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setPixelRatio(Math.min(dpr, 1.2));
        this.renderer.setSize(width, height);
        this.renderer.shadowMap.enabled = true; // Enable Shadows
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        const aspect = width / height;
        const d = 120;
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
        this.updateParticles();
        this.updateRipples();
        this.updateCamera(stackPhysics);

        this.renderer.render(this.scene, this.camera);
    }

    private updateBlocks(physics: StackPhysics) {
        // Sync static stack
        while (this.blockMeshes.length < physics.stack.length) {
            const data = physics.stack[this.blockMeshes.length];
            const mesh = new THREE.Mesh(this.sharedGeometry, StackMaterials.getMaterial(data.color));
            mesh.castShadow = true;
            mesh.receiveShadow = true;
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
                this.currentBlockMesh.castShadow = true;
                this.currentBlockMesh.receiveShadow = true;
                this.scene.add(this.currentBlockMesh);
            }
            this.currentBlockMesh.position.copy(physics.currentBlock.position);
            this.currentBlockMesh.scale.copy(physics.currentBlock.size);
            // Updating Material color if needed (optimization: reusing material)
            this.currentBlockMesh.material = StackMaterials.getMaterial(physics.currentBlock.color);
            this.currentBlockMesh.visible = true;
        } else if (this.currentBlockMesh) {
            this.currentBlockMesh.visible = false;
        }
    }

    private updateDebris(physics: StackPhysics) {
        // Pop new debris data from physics engine and create visual meshes
        while (physics.debris.length > this.debrisMeshes.length) {
            // New debris added
            const data = physics.debris[this.debrisMeshes.length];
            const mesh = new THREE.Mesh(this.sharedGeometry, StackMaterials.getMaterial(data.color)) as unknown as DebrisMesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.scene.add(mesh);
            this.debrisMeshes.push(mesh);
        }

        // Sync with physics logic
        // We assume index matching for simplicity as we only push/splice together
        for (let i = this.debrisMeshes.length - 1; i >= 0; i--) {
            const mesh = this.debrisMeshes[i];
            const data = physics.debris[i];

            if (!data) {
                // Debris removed from physics
                this.scene.remove(mesh);
                this.debrisMeshes.splice(i, 1);
                continue;
            }

            mesh.position.copy(data.position);
            mesh.scale.copy(data.size);
            if (data.quaternion) {
                mesh.quaternion.copy(data.quaternion);
            }
        }
    }

    private updateParticles() {
        if (!this.particles) return;

        const positions = this.particles.geometry.attributes.position.array as Float32Array;
        // Slowly float particles up
        for (let i = 1; i < positions.length; i += 3) {
            positions[i] += 0.2; // Float up
            if (positions[i] > 400) {
                positions[i] = -200; // Reset to bottom
            }
        }
        this.particles.geometry.attributes.position.needsUpdate = true;

        // Optional: Follow camera Y slightly for parallax
        this.particles.position.y = this.currentCameraY * 0.8;
    }

    private updateCamera(physics: StackPhysics) {
        const topBlock = physics.stack[physics.stack.length - 1];
        if (topBlock) {
            this.cameraTargetY = topBlock.position.y;
        }

        // Smooth follow
        this.currentCameraY += (this.cameraTargetY - this.currentCameraY) * 0.1;

        // Offset for Isometric view lookAt
        const offset = new THREE.Vector3(300, 300 + this.currentCameraY, 300);
        this.camera.position.copy(offset);
        this.camera.lookAt(0, this.currentCameraY, 0);

        // Apply Screen Shake
        if (this.screenShake > 0) {
            const intensity = this.screenShake * 1.5;
            this.camera.position.x += (Math.random() - 0.5) * intensity;
            this.camera.position.y += (Math.random() - 0.5) * intensity;
            this.screenShake--;
        }
    }

    // ============ VFX PUBLIC API ============

    public triggerPerfectRipple(positionY: number, size: THREE.Vector3) {
        // Create an expanding white square outline
        const halfW = size.x / 2 + 5;
        const halfD = size.z / 2 + 5;
        const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-halfW, 0, -halfD),
            new THREE.Vector3(halfW, 0, -halfD),
            new THREE.Vector3(halfW, 0, halfD),
            new THREE.Vector3(-halfW, 0, halfD),
        ]);

        const material = new THREE.LineBasicMaterial({
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.8
        });

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

            // Expand and fade out
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
