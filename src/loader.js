import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";

export const pistolAnimations = {};
export let pistolMixer;

export let roomBox = null;
export const collidableBoxes = [];
export const shootableTargets = [];

export let wallMaterial = null;

export let currentWeapon = null;
export let weapons = {
    pistol: null,
    m4: null,
    knife: null,
};

// Fungsi reusable untuk memuat model dengan collision box
function loadModelWithCollision(
    loader,
    scene,
    url,
    scale,
    position,
    rotationY = 0,
    addToShootable = true
) {
    loader.load(url, (gltf) => {
        const model = gltf.scene;
        model.scale.set(...scale);
        model.position.set(...position);
        model.rotation.y = rotationY;

        model.updateMatrixWorld(true); // Update transformasi dunia
        scene.add(model);

        model.traverse((child) => {
            if (child.isMesh) {
                child.updateMatrixWorld(true);
                const box = new THREE.Box3().setFromObject(child);
                const size = new THREE.Vector3();
                box.getSize(size);

                if (size.x < 5 && size.y > 0.5 && size.z < 5) {
                    if (addToShootable) {
                        shootableTargets.push(box);
                    } else {
                        collidableBoxes.push(box);
                    }

                    // Tambah helper untuk debugging (opsional)
                    // const helper = new THREE.Box3Helper(box, 0xff0000);
                    // scene.add(helper);
                }
            }
        });
    });
}

export function loadModels(scene, camera, onLoaded) {
    const loadingManager = new THREE.LoadingManager();

    loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
        const percent = Math.floor((itemsLoaded / itemsTotal) * 100);
        document.getElementById("loadingFill").style.width = percent + "%";
        document.getElementById(
            "loadingText"
        ).innerText = `Loading... ${percent}%`;
    };

    loadingManager.onLoad = () => {
        document.getElementById("loadingScreen").style.display = "none";
        document.getElementById("startOverlay").style.display = "flex";
        if (typeof onLoaded === "function") onLoaded();
    };

    const loader = new GLTFLoader(loadingManager);

    // Load Room
    loader.load("/assets/models/coba/empty_old_garage_room.glb", (gltf) => {
        const model = gltf.scene;
        model.scale.set(0.5, 0.5, 0.5);
        model.position.set(0, 2.4, 0);
        scene.add(model);

        roomBox = new THREE.Box3().setFromObject(model);
        roomBox.expandByScalar(-0.9);

        model.traverse((child) => {
            if (child.isMesh) {
                console.log(child.name);
                if (child.name == "Object_28") {
                    wallMaterial = child.material;
                }

                const box = new THREE.Box3().setFromObject(child);
                const size = new THREE.Vector3();
                box.getSize(size);

                if (size.x < 30 && size.y > 1 && size.z < 30) {
                    collidableBoxes.push(box);
                    shootableTargets.push(box);
                }
            }
        });
    });

    // Load Weapons
    loader.load("/assets/models/weapon/pistol.glb", (gltf) => {
        const model = gltf.scene;
        model.scale.set(1, 1, 1);
        model.position.set(0.15, -0.2, -0.3);
        weapons.pistol = model;
        camera.add(model);

        model.traverse((child) => {
            if (child.isMesh) {
                child.userData.isWeapon = true; // Tandai mesh sebagai senjata
            }
        });

        currentWeapon = model;
    });

    loader.load("/assets/models/weapon/m16.glb", (gltf) => {
        const model = gltf.scene;
        model.scale.set(1, 1, 1);
        model.position.set(0.15, -0.25, -0.2);
        weapons.m4 = model;
        model.visible = false;

        model.traverse((child) => {
            if (child.isMesh) {
                child.userData.isWeapon = true; // Tandai mesh sebagai senjata
            }
        });

        camera.add(model);
    });

    loader.load("/assets/models/weapon/knife.glb", (gltf) => {
        const model = gltf.scene;
        model.scale.set(0.1, 0.1, 0.1);
        model.position.set(0.5, -0.8, -1);
        model.rotation.y = 0.8 * Math.PI;
        weapons.knife = model;
        model.visible = false;
        camera.add(model);
    });

    // Load Targets (Gunakan fungsi reusable)
    loadModelWithCollision(
        loader,
        scene,
        "/assets/models/target/targets_some.glb",
        [0.07, 0.065, 0.09],
        [20, -0.4, -5]
    );
    loadModelWithCollision(
        loader,
        scene,
        "/assets/models/target/steel_target.glb",
        [0.8, 0.8, 0.8],
        [-13, 0.08, -30],
        -Math.PI / 2
    );
    loadModelWithCollision(
        loader,
        scene,
        "/assets/models/target/boxing_ring.glb",
        [1.5, 1, 1.5],
        [0, -1, 18]
    );
    loadModelWithCollision(
        loader,
        scene,
        "/assets/models/target/body_training.glb",
        [2, 1.5, 0.7],
        [14, -0.5, -10]
    );

    loadModelWithCollision(
        loader,
        scene,
        "/assets/models/target/target_atas.glb",
        [1.5, 1.5, 1.5],
        [-15, 3.5, 0],
        Math.PI / 2,
        true
    );
    loadModelWithCollision(
        loader,
        scene,
        "/assets/models/target/target_atas.glb",
        [1.5, 1.5, 1.5],
        [15, 3.5, 0],
        Math.PI / 2,
        true
    );
    loadModelWithCollision(
        loader,
        scene,
        "/assets/models/target/target_atas.glb",
        [1.5, 1.5, 1.5],
        [0, 3.5, -20],
        Math.PI / 2,
        true
    );
    loadModelWithCollision(
        loader,
        scene,
        "/assets/models/target/target_atas.glb",
        [1.5, 1.5, 1.5],
        [0, 3.5, 15],
        Math.PI / 2,
        true
    );
    loadModelWithCollision(
        loader,
        scene,
        "/assets/models/target/target_atas.glb",
        [1.5, 1.5, 1.5],
        [-10, 3.5, -10],
        Math.PI / 2,
        true
    );
    loadModelWithCollision(
        loader,
        scene,
        "/assets/models/target/target_atas.glb",
        [1.5, 1.5, 1.5],
        [10, 3.5, 10],
        Math.PI / 2,
        true
    );

    loadModelWithCollision(
        loader,
        scene,
        "/assets/models/target/gym_equipment.glb",
        [0.5, 0.5, 0.5],
        [-16, -0.5, 15],
        Math.PI / 2,
        true
    );
}
