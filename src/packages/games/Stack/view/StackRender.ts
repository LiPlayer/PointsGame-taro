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
    delay: number;
    isStatic: boolean;
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

    // Camera Framing
    private yOffset: number = 0;
    private dirLight: THREE.DirectionalLight | null = null;
    private readonly BASE_SIZE: number = 1.0;

    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = null;

        const d = 1.5;
        this.camera = new THREE.OrthographicCamera(-d, d, d, -d, 1, 2000);
        this.camera.position.set(3, 3, 3);
        this.camera.lookAt(0, 0, 0);

        this.sharedGeometry = new THREE.BoxGeometry(1, 1, 1);

        this.createParticles();
        this.setupLights();

        // Debug: XYZ Axes
        const axesHelper = new THREE.AxesHelper(5);
        this.scene.add(axesHelper);
    }

    private setupLights() {
        // Hemisphere Light: Increased intensity to 0.7 to brighten top faces
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x888888, 0.8);
        hemiLight.position.set(0, 5, 0);
        this.scene.add(hemiLight);

        // Directional Light: Sharp shadows and distinct face shading
        // Positioned asymmetrically to create distinct brightness levels for different faces
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.4);
        this.dirLight = dirLight;
        dirLight.position.set(3.0, 3.0, -3.0); // Classic isometric key light position
        dirLight.castShadow = true;

        // Shadow map tuning for sharp shadows
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        const d = 150;
        dirLight.shadow.camera.left = -d;
        dirLight.shadow.camera.right = d;
        dirLight.shadow.camera.top = d;
        dirLight.shadow.camera.bottom = -d;
        // Bias to prevent shadow acne on self-shadowing
        dirLight.shadow.bias = -0.0001;

        this.scene.add(dirLight);
    }

    private createParticles() {
        const particleCount = 60;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 4.0;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 6.0;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 4.0;
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

        // SPECIFICATION: Base (100x100x100) width = 80% Screen Width
        // Base Projected Width = 100 * sqrt(2) approx 141.42
        // View Width = Base Width / 0.8
        // Camera Frustum Width = 2 * d * aspect
        // d = (100 * sqrt(2)) / (1.6 * aspect)
        const d = (this.BASE_SIZE * Math.sqrt(2)) / (1.6 * aspect);

        // SPECIFICATION: Base lowest point visible at screen bottom
        // Lowest point P = (50, -100, 50) relative to (0,0,0) world origin.
        // (Since Base center is now at (0, -50, 0) and height is 100).
        // View Vector V = (-1, -1, -1) normalized.
        // Up Vector U (Camera Up) is perpendicular to V... actually in Isometric, Up is projected Y.
        // Let's rely on the Dot Product projection.
        // Center of Camera LookAt is initially (0, 0, 0) (or will be adjusted by offset).
        // We want the screen Y projection of P to be -d.
        // ScreenY = Dot(P - CameraPos, CameraUp_ScreenSpace?)
        // Simpler: The previous formula derived yOffset = (d * sqrt(6) - 200) / 2 was for lowest point -50.
        // Now lowest point is -100.
        // The difference is -50 units in World Y.
        // Isometric Y projection scale is approx 0.816 (sqrt(2/3)).
        // So visually it's lower.
        // We need to shift the camera *down* (decrease yOffset) to bring the point up?
        // No, if point is lower, we need to look lower.
        // Actually, let's use the explicit constraint equation:
        // P_y_screen = (P - LookAt).dot(Up)
        // With:
        //   LookAt = (0, yOffset, 0)
        //   Up = (-1, 2, -1) / sqrt(6)  (The standard isometric up vector)
        //   P = (50, -100, 50)
        //   We want P_y_screen = -d.
        //   (50, -100 - yOffset, 50).dot(-1, 2, -1) / sqrt(6) = -d
        //   (-50 + 2*(-100 - yOffset) - 50) / sqrt(6) = -d
        //   (-50 - 200 - 2*yOffset - 50) = -d * sqrt(6)
        //   -300 - 2*yOffset = -d * sqrt(6)
        //   300 + 2*yOffset = d * sqrt(6)
        //   2*yOffset = d * sqrt(6) - 3.0
        //   yOffset = (d * Math.sqrt(6) - 3.0) / 2
        //   Rescaled to 3.0 instead of 300
        this.yOffset = (d * Math.sqrt(6) - 3.0) / 2;

        this.camera.left = -d * aspect;
        this.camera.right = d * aspect;
        this.camera.top = d;
        this.camera.bottom = -d;
        this.camera.updateProjectionMatrix();

        // Update Shadow Camera to match new frustum if needed
        if (this.dirLight) {
            const shadowD = Math.max(d, 1.5); // Ensure at least 1.5 coverage
            this.dirLight.shadow.camera.left = -shadowD;
            this.dirLight.shadow.camera.right = shadowD;
            this.dirLight.shadow.camera.top = shadowD;
            this.dirLight.shadow.camera.bottom = -shadowD;
            this.dirLight.shadow.camera.updateProjectionMatrix();
        }
    }

    public render(physics: IPhysicsWorld) {
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

        physics.stack.forEach((data: BlockData, i: number) => {
            const mesh = this.blockMeshes[i];
            mesh.position.copy(data.position as any);
            mesh.scale.copy(data.size as any);

            // Special handling for tower base (index 0) to add gradient mist
            if (i === 0) {
                // Check if we need to replace the geometry/material for the base mist effect
                if (!(mesh.material instanceof THREE.MeshPhongMaterial) || !(mesh.material as any).__isBaseMaterial) {
                    // 1. Create Alpha Map (Black->White)
                    const alphaMap = this.createGradientTexture();

                    // 2. Create Material
                    const baseMaterial = new THREE.MeshPhongMaterial({
                        color: new THREE.Color(data.color),
                        alphaMap: alphaMap,
                        transparent: true,
                        opacity: 1.0,
                        shininess: 30,
                        specular: 0x444444,
                        flatShading: true,
                        side: THREE.FrontSide // Use FrontSide to avoid backface artifacts
                    });
                    (baseMaterial as any).__isBaseMaterial = true;

                    // 3. Create Custom Geometry with Corrected UVs
                    const baseGeometry = new THREE.BoxGeometry(1, 1, 1);

                    // BoxGeometry UV mapping:
                    // 0: Right, 1: Left, 2: Top, 3: Bottom, 4: Front, 5: Back
                    // Each face has 4 vertices. Total 24 vertices.
                    // We need Top Face (Index 2 -> Vertices 8, 9, 10, 11) to be fully Opaque (V=1).
                    // We need Bottom Face (Index 3 -> Vertices 12, 13, 14, 15) to be fully Transparent (V=0).
                    // Side Faces (Right, Left, Front, Back) should keep standard 0-1 V mapping.

                    const uvs = baseGeometry.attributes.uv;

                    // Top Face (Indices 8, 9, 10, 11) -> Set V to 1.0 (Opaque)
                    for (let v = 8; v < 12; v++) {
                        uvs.setY(v, 1.0);
                    }

                    // Bottom Face (Indices 12, 13, 14, 15) -> Set V to 0.0 (Transparent)
                    for (let v = 12; v < 16; v++) {
                        uvs.setY(v, 0.0);
                    }

                    uvs.needsUpdate = true;

                    mesh.geometry.dispose();
                    mesh.geometry = baseGeometry;
                    mesh.material = baseMaterial;

                    // Disable shadow casting for the base
                    mesh.castShadow = false;
                }
            } else if (i > 0 && (mesh.material as any).__isBaseMaterial) {
                // Restore standard material if reused
                mesh.material = StackMaterials.getMaterials(data.color);
                // Ideally restore geometry too, but BoxGeometry(1,1,1) is shared shape wise.
                // However, standard blocks might need standard UVs?
                // Shared geometry is unmodified. So we just need to dispose current custom geo and use shared.
                mesh.geometry.dispose();
                mesh.geometry = this.sharedGeometry;
                mesh.castShadow = true;
            }

            // Always rely on Camera Frustum Culling for visibility
            mesh.visible = this.frustum.intersectsObject(mesh);

            if (mesh.visible && mesh.material) {
                const material = mesh.material as THREE.Material;
                // Don't override transparency for the base material
                if (!(material as any).__isBaseMaterial) {
                    material.transparent = false;
                    material.opacity = 1;
                }
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

            if (!data || data.position.y < this.currentCameraY - 4.0) {
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
            positions[i] += 0.002;
            if (positions[i] > 4.0) positions[i] = -2.0;
        }
        this.particles.geometry.attributes.position.needsUpdate = true;
        this.particles.position.y = this.currentCameraY * 0.8;
    }

    private updateCamera(physics: StackPhysics) {
        const topBlock = physics.stack[physics.stack.length - 1];

        // Deadzone Follow: Only move if top block exceeds the initial center height (yOffset)
        if (topBlock) {
            const targetY = topBlock.position.y - this.yOffset;
            this.cameraTargetY = Math.max(0, targetY);
        }

        this.currentCameraY += (this.cameraTargetY - this.currentCameraY) * 0.1;

        const offset = new THREE.Vector3(3, 3 + this.currentCameraY + this.yOffset, 3);
        this.camera.position.copy(offset);
        this.camera.lookAt(0, this.currentCameraY + this.yOffset, 0);

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

    public triggerPerfectRipple(positionY: number, size: THREE.Vector3, combo: number = 1) {
        const isStatic = combo <= 3;
        const rippleCount = isStatic ? 1 : Math.min(combo - 3, 8); // Only one ring if static

        for (let i = 0; i < rippleCount; i++) {
            const halfW = size.x / 2 + 0.05;
            const halfD = size.z / 2 + 0.05;
            const geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(-halfW, 0, -halfD),
                new THREE.Vector3(halfW, 0, -halfD),
                new THREE.Vector3(halfW, 0, halfD),
                new THREE.Vector3(-halfW, 0, halfD),
            ]);

            const material = new THREE.LineBasicMaterial({
                color: 0xFFFFFF,
                transparent: true,
                opacity: 0
            });

            const ripple = new THREE.LineLoop(geometry, material) as unknown as RippleMesh;
            ripple.position.set(0, positionY + (size.y / 2) + 0.01, 0);
            ripple.life = 1.0;
            ripple.maxLife = 1.0;
            ripple.baseScale = 1.0;
            ripple.scale.set(1.0, 1, 1.0);
            ripple.isStatic = isStatic;
            // Non-linear delay for increasing intervals between rings
            ripple.delay = isStatic ? 0 : i * (i + 6);

            this.scene.add(ripple);
            this.rippleMeshes.push(ripple);
        }
    }

    public triggerScreenShake(intensity: number = 10) {
        this.screenShake = intensity;
    }

    private updateRipples() {
        for (let i = this.rippleMeshes.length - 1; i >= 0; i--) {
            const ripple = this.rippleMeshes[i];

            if (ripple.delay > 0) {
                ripple.delay--;
                continue;
            }

            // Expansion logic
            if (!ripple.isStatic) {
                // Non-linear Expansion (Ease-Out)
                // Starts faster, slows down as life decreases
                const expansionFactor = 0.15 * (ripple.life / ripple.maxLife);
                ripple.scale.x += expansionFactor;
                ripple.scale.z += expansionFactor;
            }

            // Linear life decay
            ripple.life -= 0.025;

            // Non-linear Opacity (Quadratic Ease-Out)
            // Linger longer at high opacity, then fade smoothly
            const material = ripple.material as THREE.LineBasicMaterial;
            const t = 1.0 - (ripple.life / ripple.maxLife); // Normalized time 0 -> 1
            material.opacity = (1.0 - t * t) * 0.8;

            if (ripple.life <= 0) {
                this.scene.remove(ripple);
                ripple.geometry.dispose();
                material.dispose();
                this.rippleMeshes.splice(i, 1);
            }
        }
    }

    private createGradientTexture(): THREE.Texture {
        const canvas = document.createElement('canvas');
        canvas.width = 2;
        canvas.height = 512;
        const context = canvas.getContext('2d');
        if (context) {
            const gradient = context.createLinearGradient(0, 0, 0, 512);

            // Three.js alphaMap uses the Red channel (Luminance) for opacity.
            // Texture flipY is true by default. 
            // Canvas Top (0) -> Maps to V=1 (Top of Mesh).
            // Canvas Bottom (512) -> Maps to V=0 (Bottom of Mesh).

            // We want Top of Mesh (V=1) to be Opaque (White).
            // We want Bottom of Mesh (V=0) to be Transparent (Black).

            gradient.addColorStop(0, '#FFFFFF'); // Top of Canvas -> Top of Mesh (V=1) -> Opaque
            gradient.addColorStop(0.5, '#FFFFFF'); // Solid top half
            gradient.addColorStop(1, '#000000'); // Bottom of Canvas -> Bottom of Mesh (V=0) -> Transparent

            context.fillStyle = gradient;
            context.fillRect(0, 0, 2, 512);
        }

        const texture = new THREE.CanvasTexture(canvas);
        return texture;
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
