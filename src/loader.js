import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";
import { mod } from "three/tsl";

export let roomBox = null;
export const collidableBoxes = [];
export let currentWeapon = null;
export let weapons = {
    pistol: null,
    m4: null,
    knife: null,
};

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
                    // scene.add(helper);
                }
            }
        });
    });

    loader.load("/assets/models/weapon/pistol.glb", (gltf) => {
        const model = gltf.scene;
        model.scale.set(0.015, 0.015, 0.015);
        model.position.set(0.3, -0.2, -0.4);
        model.rotation.y = Math.PI;
        weapons.pistol = model;
        camera.add(model);
        currentWeapon = model;
    });

    loader.load("/assets/models/weapon/m4.glb", (gltf) => {
        const model = gltf.scene;
        model.scale.set(4, 4, 4);
        model.position.set(0.2, -0.35, -0.5);
        model.rotation.y = 0.5 * Math.PI;
        weapons.m4 = model;
        model.visible = false;
        camera.add(model);
    });

    loader.load("/assets/models/weapon/knife.glb", (gltf) => {
        const model = gltf.scene;
        model.scale.set(0.1, 0.1, 0.1); 
        model.position.set(0.5, -0.8, -1);
        model.rotation.y = 0.8*Math.PI; 
        weapons.knife = model;
        model.visible = false;
        camera.add(model);
    });

    loader.load("/assets/models/target/targets_some.glb", (gltf) => {
        const model = gltf.scene;
        model.scale.set(0.07, 0.065, 0.09); 
        model.position.set(20, -0.4, -5);
        scene.add(model);
    });

    loader.load("/assets/models/target/steel_target.glb", (gltf) => {
        const model = gltf.scene;
        model.scale.set(0.8, 0.8, 0.8);
        model.position.set(-13, 0.08, -30);
        model.rotation.y = -Math.PI/2;
        scene.add(model);
    });


    loader.load("/assets/models/target/boxing_bag.glb", (gltf) => {
        const model = gltf.scene;
        model.scale.set(50,60,50);
        model.position.set(-15, -2, 0);
        scene.add(model);
    });

    loader.load("/assets/models/target/boxing_ring.glb", (gltf) => {
        const model = gltf.scene;
        model.scale.set(1.5,1,1.5);
        model.position.set(0, -1, 18);
        scene.add(model);
    });

    loader.load("/assets/models/target/body_training.glb", (gltf) => {
        console.log("Body Training model loaded successfully!");
        const model = gltf.scene;

        model.scale.set(2, 1.5, 0.7);
        model.position.set(14, -0.5, -10);
        model.rotation.set(0, 0, 0);

        scene.add(model);
    });

    loader.load("/assets/models/target/gym_equipment.glb", (gltf) => {
        console.log("Body Training model loaded successfully!");
        const model = gltf.scene;

        model.scale.set(0.5, 0.5, 0.5);
        model.position.set(-16, -0.5, 15);
        model.rotation.set(0, 0, 0);
        model.rotation.y = Math.PI/2;

        scene.add(model);
    });
}



