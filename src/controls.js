// controls.js (VERSI DIPERBAIKI)

import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import * as THREE from "three";
// Impor fungsi setCurrentWeapon yang baru
import { roomBox, collidableBoxes, weapons, currentWeapon, setCurrentWeapon } from "./loader.js"; 
import { scene } from "./sceneSetup.js";
import { animations, mixers } from "./loader.js";
import { spawnBullet } from "./main.js";

let controls;
let isSwitchingWeapon = false; 
let isRunning = false;
let headBobTimer = 0;
let stamina = 100;
const maxStamina = 100;
let sound;
let walkSound;
let m4SwitchSound;
let pistolSwitchSound;
let knifeSwitchSound;
let soundsLoaded = {
    m4: false,
    pistol: false,
    knife: false,
};
const sprintDrain = 20; // stamina/saat lari
const staminaRegen = 10; // stamina/regen per detik
let moveForward = false,
    moveBackward = false,
    moveLeft = false,
    moveRight = false;
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
let previousPosition = new THREE.Vector3();
let velocityY = 0; // kecepatan vertikal
const gravity = -0.3; // gravitasi ke bawah
const jumpStrength = 0.1; // seberapa tinggi lompat
let isOnGround = true; // apakah sedang di tanah
const downRay = new THREE.Raycaster();
const downDirection = new THREE.Vector3(0, -1, 0);

let sceneRef = null;

let ammo = {
    m4: {
        current: 30,
        max: 30,
        reserve: 90,
    },
    pistol: {
        current: 12,
        max: 12,
        reserve: 36,
    },
};

export function setScene(scene) {
    sceneRef = scene;
}

export function setupControls(camera, renderer) {
    controls = new PointerLockControls(camera, renderer.domElement);

    const overlay = document.getElementById("startOverlay");

    overlay.addEventListener("click", () => {
        controls.lock();
    });
    controls.addEventListener("lock", () => {
        overlay.style.display = "none";
    });
    controls.addEventListener("unlock", () => {
        overlay.style.display = "flex";
    });

    document.addEventListener("keydown", (event) => {
        if (controls.isLocked) {
            switch (event.code) {
                case "Digit1":
                    switchWeapon("m4");
                    break;
                case "Digit2":
                    switchWeapon("pistol");
                    break;
                case "Digit3":
                    switchWeapon("knife");
                    break;
            }
        }
    });

    document.addEventListener("mousedown", (e) => {
        if (e.button === 0 && controls.isLocked) { // Klik kiri
            const activeWeaponName = currentWeapon?.userData.weaponName;
            if (!activeWeaponName || activeWeaponName === 'knife') return;

            const weaponMixer = mixers[activeWeaponName];
            const weaponAnimations = animations[activeWeaponName];
            if (!weaponMixer || !weaponAnimations) return;

            const fireClip = weaponAnimations.fire;
            const idleClip = weaponAnimations.idle;
            
            // Cek ammo
            const weaponAmmo = ammo[activeWeaponName];
            if (!weaponAmmo || weaponAmmo.current <= 0) {
                // TODO: Putar suara dry fire
                console.log(`No ammo for ${activeWeaponName}.`);
                return;
            }

            // Kurangi ammo dan tembak
            weaponAmmo.current--;
            const cameraObj = controls.getObject();
            const origin = cameraObj.position.clone();
            const fireDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(cameraObj.quaternion);
            spawnBullet(origin, fireDirection);
            updateAmmoDisplay();

            // Putar animasi tembak
            if (fireClip && idleClip) {
                weaponMixer.stopAllAction();
                const fireAction = weaponMixer.clipAction(fireClip);
                fireAction.reset().play();
                fireAction.setLoop(THREE.LoopOnce);
                fireAction.clampWhenFinished = true;

                // Listener untuk kembali ke idle setelah tembak selesai
                const onFireFinished = (event) => {
                    if (event.action === fireAction) {
                        const idleAction = weaponMixer.clipAction(idleClip);
                        idleAction.reset().play();
                        weaponMixer.removeEventListener('finished', onFireFinished);
                    }
                };
                weaponMixer.addEventListener('finished', onFireFinished);
            }
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.code === "KeyR" && controls.isLocked) {
            reload();
        }
    });

    // Setup Audio
    const listener = new THREE.AudioListener();
    camera.add(listener);

    sound = new THREE.Audio(listener);
    const audioLoader = new THREE.AudioLoader();
    audioLoader.load("/assets/sounds/sprint.mp3", function (buffer) {
        sound.setBuffer(buffer);
        sound.setLoop(true);
        sound.setVolume(0.5);
    });

    walkSound = new THREE.Audio(listener);
    audioLoader.load("/assets/sounds/walk.mp3", (buffer) => {
        walkSound.setBuffer(buffer);
        walkSound.setLoop(true);
        walkSound.setVolume(0.4);
    });

    m4SwitchSound = new THREE.Audio(listener);
    audioLoader.load("/assets/sounds/m4_switch.mp3", (buffer) => {
        m4SwitchSound.setBuffer(buffer);
        m4SwitchSound.setVolume(1.0);
        soundsLoaded.m4 = true;
    });

    pistolSwitchSound = new THREE.Audio(listener);
    audioLoader.load("/assets/sounds/pistol_switch.mp3", (buffer) => {
        pistolSwitchSound.setBuffer(buffer);
        pistolSwitchSound.setVolume(1.0);
        soundsLoaded.pistol = true;
    });

    knifeSwitchSound = new THREE.Audio(listener);
    audioLoader.load("/assets/sounds/knife_switch.mp3", (buffer) => {
        knifeSwitchSound.setBuffer(buffer);
        knifeSwitchSound.setVolume(1.0);
        soundsLoaded.knife = true;
    });

    document.addEventListener("keydown", (event) => {
        switch (event.code) {
            case "KeyW": moveForward = true; break;
            case "KeyS": moveBackward = true; break;
            case "KeyA": moveLeft = true; break;
            case "KeyD": moveRight = true; break;
            case "ShiftLeft": case "ShiftRight": isRunning = true; break;
            case "Space":
                if (isOnGround) {
                    velocityY = jumpStrength;
                    isOnGround = false;
                }
                break;
        }
    });

    document.addEventListener("keyup", (event) => {
        switch (event.code) {
            case "KeyW": moveForward = false; break;
            case "KeyS": moveBackward = false; break;
            case "KeyA": moveLeft = false; break;
            case "KeyD": moveRight = false; break;
            case "ShiftLeft": case "ShiftRight": isRunning = false; break;
        }
    });

    // Default weapon
    setTimeout(() => {
        switchWeapon("m4");
    }, 1000);
}

export function updateCameraMovement() {
    if (!controls.isLocked) return;

    const baseSpeed = 0.06;
    const runSpeed = 0.1;
    const sprinting = isRunning && stamina > 0;
    const speed = sprinting ? runSpeed : baseSpeed;

    const object = controls.getObject();

    previousPosition.copy(object.position);

    if (moveForward) controls.moveForward(speed);
    if (moveBackward) controls.moveForward(-speed);
    if (moveLeft) controls.moveRight(-speed);
    if (moveRight) controls.moveRight(speed);

    if (!roomBox || roomBox.isEmpty()) {
        return;
    }

    const playerBox = new THREE.Box3().setFromCenterAndSize(
        object.position.clone(),
        new THREE.Vector3(0.7, 3, 0.7)
    );

    if (!playerBox.intersectsBox(roomBox)) {
        object.position.copy(previousPosition);
        return;
    }

    for (const box of collidableBoxes) {
        if (playerBox.intersectsBox(box)) {
            object.position.copy(previousPosition);
            return;
        }
    }
    const deltaTime = 1 / 60;

    if (sprinting) {
        stamina = Math.max(0, stamina - sprintDrain * deltaTime);
    } else {
        stamina = Math.min(maxStamina, stamina + staminaRegen * deltaTime);
    }

    if (sprinting && (moveForward || moveBackward || moveLeft || moveRight)) {
        headBobTimer += deltaTime * 10;
        const bobAmount = 0.02;
        object.position.y += Math.sin(headBobTimer) * bobAmount;
    } else {
        headBobTimer = 0;
    }

    if (sprinting && !sound.isPlaying) {
        sound.play();
        if (walkSound.isPlaying) walkSound.stop();
    } else if (!sprinting && sound.isPlaying) {
        sound.stop();
    }

    const isMoving = moveForward || moveBackward || moveLeft || moveRight;

    if (!sprinting && isMoving) {
        if (!walkSound.isPlaying) walkSound.play();
    } else {
        if (walkSound.isPlaying) walkSound.stop();
    }

    velocityY += gravity * deltaTime;
    object.position.y += velocityY;
    
    downRay.set(object.position, downDirection);

    const objectsToIntersect = [];
    sceneRef.traverse((obj) => {
        if (obj.isMesh && !obj.userData.isWeapon) {
            objectsToIntersect.push(obj);
        }
    });

    const intersects = downRay.intersectObjects(objectsToIntersect, true);
    const maxRayDistance = 2;
    const validHits = intersects.filter((hit) => hit.distance <= maxRayDistance);

    if (validHits.length > 0) {
        isOnGround = true;
        if (velocityY <= 0) {
            object.position.y = validHits[0].point.y + 1.6;
            velocityY = 0;
        }
    } else {
        isOnGround = false;
    }

    const fill = document.getElementById("stamina-fill");
    if (fill) fill.style.width = `${(stamina / maxStamina) * 100}%`;
}

function playWeaponSound(soundObject) {
    if (!soundObject) return;
    if (soundObject.isPlaying) soundObject.stop();
    soundObject.play();
}

function reload() {
    const activeWeaponName = currentWeapon?.userData.weaponName;
    if (!activeWeaponName || activeWeaponName === 'knife') return;

    const weaponAmmo = ammo[activeWeaponName];
    const weaponMixer = mixers[activeWeaponName];
    const weaponAnimations = animations[activeWeaponName];
    
    if (!weaponAmmo || weaponAmmo.reserve <= 0 || weaponAmmo.current === weaponAmmo.max) {
        return; // Tidak ada ammo cadangan atau sudah penuh
    }

    const reloadClip = weaponAnimations.reload;
    const idleClip = weaponAnimations.idle;

    if (weaponMixer && reloadClip && idleClip) {
        weaponMixer.stopAllAction();
        const reloadAction = weaponMixer.clipAction(reloadClip);
        reloadAction.reset().play();
        reloadAction.setLoop(THREE.LoopOnce);
        reloadAction.clampWhenFinished = true;

        const onReloadFinished = (e) => {
            if (e.action === reloadAction) {
                const needed = weaponAmmo.max - weaponAmmo.current;
                const available = Math.min(needed, weaponAmmo.reserve);
                weaponAmmo.current += available;
                weaponAmmo.reserve -= available;
                updateAmmoDisplay();

                const idleAction = weaponMixer.clipAction(idleClip);
                idleAction.reset().play();
                
                weaponMixer.removeEventListener('finished', onReloadFinished);
            }
        };
        weaponMixer.addEventListener('finished', onReloadFinished);
    }
}

function updateAmmoDisplay() {
    const ammoDisplay = document.getElementById("ammo-display");
    if (!currentWeapon) {
        ammoDisplay.textContent = "";
        return;
    }

    const weaponName = currentWeapon.userData.weaponName;
    if (weaponName === 'pistol' || weaponName === 'm4') {
        ammoDisplay.textContent = `${ammo[weaponName].current} / ${ammo[weaponName].reserve}`;
    } else if (weaponName === 'knife') {
        ammoDisplay.textContent = `∞`;
    } else {
        ammoDisplay.textContent = "";
    }
}

// Fungsi switchWeapon yang sudah disempurnakan
export function switchWeapon(targetWeaponName) {
    // 1. Guard Clauses: Cek kondisi sebelum melanjutkan
    if (isSwitchingWeapon) return; // JANGAN lakukan apapun jika sedang ganti senjata

    const targetWeapon = weapons[targetWeaponName];
    if (!targetWeapon || targetWeapon === currentWeapon) return; // Senjata tidak ada atau sama

    // 2. Kunci proses switching
    isSwitchingWeapon = true;

    const previousWeapon = currentWeapon;
    const previousWeaponName = previousWeapon?.userData.weaponName;

    // Fungsi untuk menampilkan senjata baru (setelah yang lama disembunyikan)
    const showNewWeapon = () => {
        targetWeapon.visible = true;
        setCurrentWeapon(targetWeapon);
        updateAmmoDisplay();

        // Putar suara
        if (targetWeaponName === 'm4' && soundsLoaded.m4) playWeaponSound(m4SwitchSound);
        if (targetWeaponName === 'pistol' && soundsLoaded.pistol) playWeaponSound(pistolSwitchSound);
        if (targetWeaponName === 'knife' && soundsLoaded.knife) playWeaponSound(knifeSwitchSound);

        const newMixer = mixers[targetWeaponName];
        const newAnims = animations[targetWeaponName];
        if (!newMixer || !newAnims) {
            isSwitchingWeapon = false; // Buka kunci jika tidak ada animasi
            return;
        }

        const drawClip = newAnims.draw;
        const idleClip = newAnims.idle;

        if (drawClip && idleClip) {
            newMixer.stopAllAction();
            const drawAction = newMixer.clipAction(drawClip);
            drawAction.reset().play();
            drawAction.setLoop(THREE.LoopOnce);
            drawAction.clampWhenFinished = true;

            const onDrawFinished = (e) => {
                if (e.action === drawAction) {
                    newMixer.clipAction(idleClip).reset().play();
                    newMixer.removeEventListener('finished', onDrawFinished);
                    isSwitchingWeapon = false; // 3. Buka kunci SETELAH animasi selesai
                }
            };
            newMixer.addEventListener('finished', onDrawFinished);
        } else if (idleClip) {
            newMixer.stopAllAction();
            newMixer.clipAction(idleClip).reset().play();
            isSwitchingWeapon = false; // 3. Buka kunci jika langsung ke idle
        } else {
            isSwitchingWeapon = false; // 3. Buka kunci jika tidak ada animasi sama sekali
        }
    };

    // Logika untuk menyembunyikan senjata lama
    if (previousWeapon && previousWeaponName) {
        const prevMixer = mixers[previousWeaponName];
        const hideClip = prevMixer ? animations[previousWeaponName]?.hide : null;

        if (prevMixer && hideClip) {
            prevMixer.stopAllAction();
            const hideAction = prevMixer.clipAction(hideClip);
            hideAction.reset().play();
            hideAction.setLoop(THREE.LoopOnce);
            hideAction.clampWhenFinished = true;

            const onHideFinished = (e) => {
                if (e.action === hideAction) {
                    previousWeapon.visible = false;
                    prevMixer.removeEventListener('finished', onHideFinished);
                    showNewWeapon(); // Panggil fungsi untuk menampilkan senjata baru
                }
            };
            prevMixer.addEventListener('finished', onHideFinished);
        } else {
            if (previousWeapon) previousWeapon.visible = false;
            showNewWeapon();
        }
    } else {
        // Jika tidak ada senjata sebelumnya (awal game)
        showNewWeapon();
    }
}