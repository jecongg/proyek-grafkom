import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";

export let roomBox = null;
export const collidableBoxes = [];

export function loadModels(scene, camera, onLoaded) {
    const loadingManager = new THREE.LoadingManager();

    loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
        const percent = Math.floor((itemsLoaded / itemsTotal) * 100);
        document.getElementById("loadingFill").style.width = percent + "%";
        document.getElementById("loadingText").innerText = `Loading... ${percent}%`;
    };

    loadingManager.onLoad = () => {
        // Semua selesai
        document.getElementById("loadingScreen").style.display = "none";
        document.getElementById("startOverlay").style.display = "flex";
        if (typeof onLoaded === "function") onLoaded();
    };

    const loader = new GLTFLoader(loadingManager);

    loader.load("/assets/models/coba/empty_old_garage_room.glb", (gltf) => {
        const model = gltf.scene;
        model.scale.set(0.5, 0.5, 0.5);
        model.position.set(0, 2.4, 0);
        scene.add(model);

        roomBox = new THREE.Box3().setFromObject(model);
        roomBox.expandByScalar(-0.9);

        model.traverse((child) => {
            if (child.isMesh) {
                const box = new THREE.Box3().setFromObject(child);
                const size = new THREE.Vector3();
                box.getSize(size);

                if (size.x < 5 && size.y > 0.5 && size.z < 5) {
                    collidableBoxes.push(box);
                    // Optional: add helper
                    const helper = new THREE.Box3Helper(box, 0xff0000);
                    scene.add(helper);
                }
            }
        });
    });

    loader.load("/assets/models/weapon/pistol.glb", (gltf) => {
        const model = gltf.scene;
        model.scale.set(0.015, 0.015, 0.015);
        model.position.set(0.3, -0.2, -0.4);
        model.rotation.y = Math.PI;
        camera.add(model);
    });
}
