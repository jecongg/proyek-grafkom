// loader.js

import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";

export const mixers = {}; // Objek untuk menyimpan AnimationMixer setiap senjata
export const animations = {}; // Objek untuk menyimpan klip animasi yang sudah dipisah

export let roomBox = null;
export const collidableBoxes = [];
export const shootableTargets = [];
export const ammoPickups = []; // BARU: Array untuk menyimpan item ammo pickup

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
                child.castShadow = true;
                child.receiveShadow = true;
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
                }
            }
        });
    });
}

// BARU: Fungsi khusus untuk memuat ammo pickup
function loadAmmoPickup(loader, scene, options) {
    const {
        url,
        position,
        scale,
        rotationY = 0,
        rotationZ = 0,
        rotationX = 0,
        weaponType,
        ammoAmount,
        interactionRadius = 2.5,
    } = options;

    loader.load(url, (gltf) => {
        const model = gltf.scene;
        model.scale.set(...scale);
        model.position.set(...position);
        model.rotation.z = rotationZ;
        model.rotation.y = rotationY;
        model.rotation.x = rotationX;
        scene.add(model);
        
        model.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.userData.isWeapon = true;
            }
        });

        // Simpan data pickup ke dalam array
        ammoPickups.push({
            model: model,
            weaponType: weaponType,
            ammoAmount: ammoAmount,
            interactionRadius: interactionRadius,
            lastPickupTime: 0, // Inisialisasi properti cooldown
        });
        console.log(`Loaded ammo pickup for ${weaponType} at [${position.join(', ')}]`);
    });
}

function splitAnimations(mainClip, weaponName) {
    // ... (Fungsi ini tidak berubah, biarkan seperti adanya)
    const splitClips = {};
    const animationRanges = {};

    if (weaponName === "pistol") {
        animationRanges.idle = { start: 7.71, end: 8.8 };
        animationRanges.fire = { start: 0, end: 0.37 };
        animationRanges.reload = { start: 0.39, end: 2.72 };
        animationRanges.draw = { start: 6.28, end: 7.8 };
        animationRanges.hide = { start: 5.85, end: 6.25 };
    } else if (weaponName === "m4") {
        animationRanges.idle = { start: 5.94, end: 6.8 };
        animationRanges.fire = { start: 0, end: 0.25 };
        animationRanges.reload = { start: 0.26, end: 2.27 };
        animationRanges.draw = { start: 4.81, end: 5.92 };
        animationRanges.hide = { start: 4.44, end: 4.78 };
    } else if (weaponName === "knife") {
        animationRanges.idle = { start: 27.58, end: 30.09 };
        animationRanges.attack = { start: 31.80, end: 32.65 };
        animationRanges.draw = { start: 26.5, end: 27.58 };
        animationRanges.hide = { start: 32.74, end: 33.48 };
    }

    if (Object.keys(animationRanges).length === 0) {
        splitClips.idle = mainClip;
        return splitClips;
    }
    const FPS = 30;
    for (const animName in animationRanges) {
        const range = animationRanges[animName];
        const startFrame = Math.round(range.start * FPS);
        const endFrame = Math.round(range.end * FPS);
        const totalFrames = Math.round(mainClip.duration * FPS);
        const actualEndFrame = Math.min(endFrame, totalFrames);
        const newClip = THREE.AnimationUtils.subclip(mainClip, animName, startFrame, actualEndFrame, FPS);
        splitClips[animName] = newClip;
    }
    return splitClips;
}

function setupWeaponAnimations(model, gltfAnimations, weaponName) {
    // ... (Fungsi ini tidak berubah, biarkan seperti adanya)
    if (!gltfAnimations || gltfAnimations.length === 0) return;
    const mixer = new THREE.AnimationMixer(model);
    mixers[weaponName] = mixer;
    const mainClip = gltfAnimations[0];
    animations[weaponName] = splitAnimations(mainClip, weaponName);
    if (animations[weaponName].idle) {
        const action = mixer.clipAction(animations[weaponName].idle);
        action.loop = THREE.LoopRepeat;
        action.play();
    }
}


export function loadModels(scene, camera, onLoaded) {
    const loadingManager = new THREE.LoadingManager();
    // ... (onProgress dan onLoad tidak berubah)
    loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
        const percent = Math.floor((itemsLoaded / itemsTotal) * 100);
        document.getElementById("loadingFill").style.width = percent + "%";
        document.getElementById("loadingText").innerText = `Loading... ${percent}%`;
    };

    loadingManager.onLoad = () => {
        document.getElementById("loadingScreen").style.display = "none";
        document.getElementById("startOverlay").style.display = "flex";
        if (typeof onLoaded === "function") onLoaded();
    };


    const loader = new GLTFLoader(loadingManager);

    // Load Room
    loader.load("/assets/models/coba/empty_old_garage_room.glb", (gltf) => {
        // ... (Kode load room tidak berubah)
        const model = gltf.scene;
        model.scale.set(0.5, 0.5, 0.5);
        model.position.set(0, 2.4, 0);
        scene.add(model);

        roomBox = new THREE.Box3().setFromObject(model);
        roomBox.expandByScalar(-0.9);

        model.traverse((child) => {
            if (child.isMesh) {
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

    // Load Weapons (yang dipegang player)
    // ... (Kode load pistol, m4, knife yang dipegang player tidak berubah)
    loader.load("/assets/models/weapon/pistol.glb", (gltf) => {
        const model = gltf.scene;
        model.scale.set(1, 1, 1);
        model.position.set(0.15, -0.2, -0.3);
        weapons.pistol = model;
        model.visible = false;
        camera.add(model);
        model.traverse((child) => { if (child.isMesh) child.userData.isWeapon = true; });
        model.userData.weaponName = "pistol";
        setupWeaponAnimations(model, gltf.animations, "pistol");
    });
    loader.load("/assets/models/weapon/m16.glb", (gltf) => {
        const model = gltf.scene;
        model.scale.set(1, 1, 1);
        model.position.set(0.15, -0.25, -0.2);
        weapons.m4 = model;
        model.visible = false;
        model.traverse((child) => { if (child.isMesh) child.userData.isWeapon = true; });
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
        model.traverse((child) => { if (child.isMesh) child.userData.isWeapon = true; });
        model.userData.weaponName = "knife";
        camera.add(model);
        setupWeaponAnimations(model, gltf.animations, "knife");
    });

    // Load Targets
    // ... (Kode load target tidak berubah)
    loadModelWithCollision(loader, scene, "/assets/models/target/target_atas.glb", [1.5, 1.5, 1.5], [-15, 3.5, 0], Math.PI / 2, true);
    loadModelWithCollision(loader, scene, "/assets/models/target/target_atas.glb", [1.5, 1.5, 1.5], [15, 3.5, 0], Math.PI / 2, true);
    loadModelWithCollision(loader, scene, "/assets/models/target/target_atas.glb", [1.5, 1.5, 1.5], [0, 3.5, -20], Math.PI / 2, true);
    loadModelWithCollision(loader, scene, "/assets/models/target/target_atas.glb", [1.5, 1.5, 1.5], [0, 3.5, 15], Math.PI / 2, true);
    loadModelWithCollision(loader, scene, "/assets/models/target/target_atas.glb", [1.5, 1.5, 1.5], [-10, 3.5, -10], Math.PI / 2, true);
    loadModelWithCollision(loader, scene, "/assets/models/target/target_atas.glb", [1.5, 1.5, 1.5], [10, 3.5, 10], Math.PI / 2, true);
    loadModelWithCollision(loader, scene, "/assets/models/target/target_atas.glb", [1.5, 1.5, 1.5], [10, 3.5, 10], Math.PI / 2, true);
    loadModelWithCollision(loader, scene, "/assets/models/target/target_atas.glb", [1.5, 1.5, 1.5], [10, 3.5, 10], Math.PI / 2, true);

    loadModelWithCollision(loader, scene, "/assets/models/target/target_bawah.glb", [1, 1, 1.5], [-10, 1 , -5], Math.PI, true);
    loadModelWithCollision(loader, scene, "/assets/models/target/target_bawah.glb", [1, 1, 1.5], [-5, 1 , -45], Math.PI, true); // X dan Z diubah
    loadModelWithCollision(loader, scene, "/assets/models/target/target_bawah.glb", [1, 1, 1.5], [0, 1 , 8], Math.PI, true);  // X dan Z diubah
    loadModelWithCollision(loader, scene, "/assets/models/target/target_bawah.glb", [1, 1, 1.5], [15, 1 , -10], Math.PI, true); // X dan Z diubah
    loadModelWithCollision(loader, scene, "/assets/models/target/target_bawah.glb", [1, 1, 1.5], [-5, 1 , -24], Math.PI, true); // X dan Z diubah

    loadModelWithCollision(loader, scene, "/assets/models/target/target_orangbawatembak.glb", [0.5, 0.5, 0.5], [-15, -0.5, -10], Math.PI, true);
    loadModelWithCollision(loader, scene, "/assets/models/target/target_orangbawatembak.glb", [0.5, 0.5, 0.5], [-15, -0.5, -30], Math.PI, true); // X dan Z diubah
    loadModelWithCollision(loader, scene, "/assets/models/target/target_orangbawatembak.glb", [0.5, 0.5, 0.5], [12, -0.5, -25], Math.PI, true); // X dan Z diubah
    loadModelWithCollision(loader, scene, "/assets/models/target/target_orangbawatembak.glb", [0.5, 0.5, 0.5], [12, -0.5, 3], Math.PI, true); // X dan Z diubah
    loadModelWithCollision(loader, scene, "/assets/models/target/target_orangbawatembak.glb", [0.5, 0.5, 0.5], [-10, -0.5, -15], Math.PI, true); // X dan Z diubah

    loadModelWithCollision(loader, scene, "/assets/models/target/target_kotak.glb", [0.04, 0.035, 0.15], [-20, -1, 10], Math.PI, true);
    loadModelWithCollision(loader, scene, "/assets/models/target/target_kotak.glb", [0.04, 0.035, 0.15], [-5, -1, 15], Math.PI, true); // X dan Z diubah
    loadModelWithCollision(loader, scene, "/assets/models/target/target_kotak.glb", [0.04, 0.035, 0.15], [4, -1, -30], Math.PI, true);  // X dan Z diubah
    loadModelWithCollision(loader, scene, "/assets/models/target/target_kotak.glb", [0.04, 0.035, 0.15], [8, -1, -40], Math.PI, true); // X dan Z diubah
    loadModelWithCollision(loader, scene, "/assets/models/target/target_kotak.glb", [0.04, 0.035, 0.15], [20, -1, -15], Math.PI, true);  // X dan Z diubah
    loadModelWithCollision(loader, scene, "/assets/models/target/target_kotak.glb", [0.04, 0.035, 0.15], [20, -1, 20], Math.PI, true);

    // BARU: Load meja/kotak untuk meletakkan senjata pickup
    loadModelWithCollision(loader, scene, "/assets/models/target/wooden_crate.glb", [0.8, 0.8, 0.8], [-10, -0.5, -10], 0, false);
    loadModelWithCollision(loader, scene, "/assets/models/target/wooden_crate.glb", [0.8, 0.8, 0.8], [10, -0.5, 10], Math.PI / 4, false);


    // BARU: Gunakan fungsi loadAmmoPickup untuk memuat senjata di scene
    loadAmmoPickup(loader, scene, {
        url: "/assets/models/weapon/m4.glb", // Gunakan model M16 yang terpisah jika ada, atau yg sama
        position: [-0.06, 0.5, -9.7], // Posisikan di atas kotak kayu
        scale: [5, 5, 5],
        rotationZ: Math.PI,
        rotationX: Math.PI / 2,
        weaponType: "m4",
        ammoAmount: 60, // Jumlah amunisi yang didapat
    });

    loadAmmoPickup(loader, scene, {
        url: "/assets/models/weapon/pistol_pickup.glb", // Gunakan model pistol terpisah jika ada, atau yg sama
        position: [4.94, 0.5, -10], // Posisikan di atas kotak kayu lainnya
        scale: [1, 1, 1],
        rotationY: Math.PI / 2,
        rotationZ: -Math.PI / 2,
        weaponType: "pistol",
        ammoAmount: 24, // Jumlah amunisi yang didapat
    });
}