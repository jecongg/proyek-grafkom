import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";

export const mixers = {}; // Objek untuk menyimpan AnimationMixer setiap senjata
export const animations = {}; // Objek untuk menyimpan klip animasi yang sudah dipisah

export let roomBox = null;
export const collidableBoxes = [];
export const shootableTargets = [];

export let wallMaterial = null;

export let currentWeapon = null;

// Fungsi untuk mengubah senjata saat ini dari modul lain
export function setCurrentWeapon(weapon) {
    currentWeapon = weapon;
}
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

function splitAnimations(mainClip, weaponName) {
    const splitClips = {};
    const animationRanges = {};

    if (weaponName === "pistol") {
        // Perbaiki range untuk pistol
        animationRanges.idle = { start: 7.71, end: 8.8 };
        animationRanges.fire = { start: 0, end: 0.37 };
        animationRanges.reload = { start: 0.39, end: 2.72 }; // Extend reload animation
        animationRanges.draw = { start: 6.28, end: 7.8 }; // Add draw animation
        animationRanges.hide = { start: 5.85, end: 6.25 }; // Add hide animation
    } else if (weaponName === "m4") {
        // Perbaiki range untuk M4
        animationRanges.idle = { start: 5.94, end: 6.8 };
        animationRanges.fire = { start: 0, end: 0.25 }; // Slight adjustment
        animationRanges.reload = { start: 0.26, end: 2.27 }; // Extend reload animation
        animationRanges.draw = { start: 4.81, end: 5.92 }; // Add draw animation
        animationRanges.hide = { start: 4.44, end: 4.78 }; // Add hide animation
    } else if (weaponName === "knife") {
        // Tambahkan animasi knife jika ada
        animationRanges.idle = { start: 27.58, end: 30.09 };
        animationRanges.attack = { start: 31.80, end: 32.65 };
        // animationRanges.attack = { start: 30.09, end: 31.71 };
        animationRanges.draw = { start: 26.5, end: 27.58 }; // Add draw animation
        animationRanges.hide = { start: 32.74, end: 33.48 }; // Add hide animation
    }

    // Jika tidak ada rentang yang didefinisikan, gunakan seluruh klip sebagai "idle"
    if (Object.keys(animationRanges).length === 0) {
        console.warn(
            `No specific animation ranges defined for ${weaponName}. Using full clip as 'idle'.`
        );
        splitClips.idle = mainClip;
        return splitClips;
    }

    // Three.js AnimationUtils.subclip memerlukan frame, bukan detik.
    // Kita perlu mengonversi detik ke frame. Asumsi FPS 30.
    const FPS = 30; // Sesuaikan jika FPS animasi Anda berbeda

    for (const animName in animationRanges) {
        const range = animationRanges[animName];
        const startFrame = Math.round(range.start * FPS);
        const endFrame = Math.round(range.end * FPS);

        // Pastikan frame tidak melebihi durasi klip utama
        const totalFrames = Math.round(mainClip.duration * FPS);
        const actualEndFrame = Math.min(endFrame, totalFrames);

        const newClip = THREE.AnimationUtils.subclip(
            mainClip,
            animName, // Nama klip baru
            startFrame,
            actualEndFrame,
            FPS // FPS yang digunakan untuk subclip
        );
        splitClips[animName] = newClip;
        console.log(
            `[${weaponName}] Created clip '${animName}' from frames ${startFrame}-${actualEndFrame} (duration: ${newClip.duration.toFixed(
                2
            )}s)`
        );
    }

    return splitClips;
}

function setupWeaponAnimations(model, gltfAnimations, weaponName) {
    if (!gltfAnimations || gltfAnimations.length === 0) {
        console.warn(`No animations found for ${weaponName}.`);
        return;
    }

    const mixer = new THREE.AnimationMixer(model);
    mixers[weaponName] = mixer;

    // Asumsi hanya ada satu AnimationClip besar yang berisi semua animasi
    const mainClip = gltfAnimations[0];
    console.log(
        `Loaded ${weaponName} with total animation duration: ${mainClip.duration.toFixed(
            2
        )}s`
    );

    // Pisahkan animasi
    animations[weaponName] = splitAnimations(mainClip, weaponName);

    // Contoh: Putar animasi idle secara default
    if (animations[weaponName].idle) {
        const action = mixer.clipAction(animations[weaponName].idle);
        action.loop = THREE.LoopRepeat;
        action.play();
    }
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
    // loader.js
    loader.load("/assets/models/weapon/pistol.glb", (gltf) => {
        const model = gltf.scene;
        model.scale.set(1, 1, 1);
        model.position.set(0.15, -0.2, -0.3);
        weapons.pistol = model;
        model.visible = false; // <-- TAMBAHKAN INI
        camera.add(model);

        model.traverse((child) => {
            if (child.isMesh) {
                child.userData.isWeapon = true;
            }
        });
        model.userData.weaponName = "pistol";

        setupWeaponAnimations(model, gltf.animations, "pistol");
    });

    // loader.js
    loader.load("/assets/models/weapon/m16.glb", (gltf) => {
        const model = gltf.scene;
        model.scale.set(1, 1, 1);
        model.position.set(0.15, -0.25, -0.2);
        weapons.m4 = model;
        model.visible = false; // Ini sudah benar, biarkan saja

        model.traverse((child) => {
            if (child.isMesh) {
                child.userData.isWeapon = true;
            }
        });
        camera.add(model);
        model.userData.weaponName = "m4";

        setupWeaponAnimations(model, gltf.animations, "m4");
    });
    loader.load("/assets/models/weapon/knife.glb", (gltf) => {
        const model = gltf.scene;
        model.scale.set(1.5, 1.5, 1.5);
        model.position.set(0.08, -0.1, -0.2);
        weapons.knife = model;
        model.visible = false;

        model.traverse((child) => {
            if (child.isMesh) {
                child.userData.isWeapon = true;
            }
        });
        model.userData.weaponName = "knife";
        camera.add(model);

        setupWeaponAnimations(model, gltf.animations, "knife");
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
