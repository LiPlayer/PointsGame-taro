import Taro from '@tarojs/taro';
// import { Texture, Group } from 'three'; // We avoid importing full Three here to keep main package small if possible? 
// Actually this utility might be used by main package too. 
// However, Three.js types are dev dependencies. We can use 'any' or import types if needed.
// Given strict TS, we should import types.

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export interface IAssetLoader {
    loadTexture(path: string): Promise<THREE.Texture>;
    loadModel(path: string): Promise<THREE.Group>;
}

export class LocalAssetLoader implements IAssetLoader {
    async loadTexture(path: string): Promise<THREE.Texture> {
        return new Promise((resolve, reject) => {
            const loader = new THREE.TextureLoader();
            // In Taro/WeApp, local assets often need require() or absolute path.
            // For Three.js in WeApp, adapter handles https/http or local file read.
            // We'll assume paths are relative to 'src/assets' or require() calls passed in?
            // Or simply path string if served via local server or copy-webpack-plugin.
            loader.load(path, resolve, undefined, reject);
        });
    }

    async loadModel(path: string): Promise<THREE.Group> {
        return new Promise((resolve, reject) => {
            // GLTFLoader needs platform support, typically passed via internal Platform abstraction in Three.js
            // three-platformize handles this.
            const loader = new GLTFLoader();
            loader.load(path, (gltf) => {
                resolve(gltf.scene);
            }, undefined, reject);
        });
    }
}

export class WxCloudLoader implements IAssetLoader {
    private static instance: WxCloudLoader;

    public static getInstance(): WxCloudLoader {
        if (!this.instance) this.instance = new WxCloudLoader();
        return this.instance;
    }

    async loadTexture(path: string): Promise<THREE.Texture> {
        // Placeholder for Cloud implementation
        // const res = await Taro.cloud.getTempFileURL({ fileList: [path] });
        // const url = res.fileList[0].tempFileURL;
        // return new THREE.TextureLoader().loadAsync(url);
        throw new Error("WxCloudLoader.loadTexture: Not implemented");
    }

    async loadModel(path: string): Promise<THREE.Group> {
        // Placeholder for Cloud implementation
        throw new Error("WxCloudLoader.loadModel: Not implemented");
    }
}

// Factory
export const assetLoader: IAssetLoader = new LocalAssetLoader();
