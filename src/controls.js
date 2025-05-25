import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import * as THREE from "three";
import { roomBox, collidableBoxes, weapons } from "./loader.js";
import { scene } from "./sceneSetup.js";
import { pistolAnimations } from "./loader.js";
import { spawnBullet } from "./main.js";

let controls;
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
let currentWeapon = null; // Tambahkan deklarasi currentWeapon
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
                    switchWeapon(1); // M4
                    break;
                case "Digit2":
                    switchWeapon(2); // Pistol
                    break;
                case "Digit3":
                    switchWeapon(3); // Knife
                    break;
            }
        }
    });

    document.addEventListener("mousedown", (e) => {
        if (e.button === 0) {
            // klik kiri
            const fire = pistolAnimations["Armature|Fire"];
            const idle = pistolAnimations["Armature|Idle"];

            // 🔫 Buat peluru (hanya kalau senjata aktif adalah pistol)
            if (currentWeapon === weapons.pistol) {
                const cameraObj = controls.getObject();
                const origin = cameraObj.position.clone();
                const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(
                    cameraObj.quaternion
                );
                spawnBullet(origin, direction);
            }

            if (fire) {
                console.log("halo");
                fire.reset().play();
                fire.clampWhenFinished = true;
                fire.setLoop(THREE.LoopOnce);

                if (idle) {
                    fire.onFinished = () => {
                        idle.reset().play();
                    };
                }
            }
        }
    });

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
        walkSound.setVolume(0.4); // lebih pelan dari sprint
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
            case "KeyW":
                moveForward = true;
                break;
            case "KeyS":
                moveBackward = true;
                break;
            case "KeyA":
                moveLeft = true;
                break;
            case "KeyD":
                moveRight = true;
                break;
            case "ShiftLeft":
            case "ShiftRight":
                isRunning = true;
                break;
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
            case "KeyW":
                moveForward = false;
                break;
            case "KeyS":
                moveBackward = false;
                break;
            case "KeyA":
                moveLeft = false;
                break;
            case "KeyD":
                moveRight = false;
                break;
            case "ShiftLeft":
            case "ShiftRight":
                isRunning = false;
                break;
        }
    });

    // Default weapon
    setTimeout(() => {
        switchWeapon(1); // Set default ke M4 setelah beberapa waktu untuk memastikan assets sudah dimuat
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

    // const playerHelper = new THREE.Box3Helper(playerBox, 0x0000ff);
    // scene.add(playerHelper);

    // Cek keluar ruangan
    if (!playerBox.intersectsBox(roomBox)) {
        object.position.copy(previousPosition);
        return;
    }

    const size = new THREE.Vector3();
    playerBox.getSize(size);

    // console.log("📦 PlayerBox Size:", size);
    // console.log("📍 Player Position (Center):", object.position);
    // console.log("🟥 RoomBox min:", roomBox?.min);
    // console.log("🟥 RoomBox max:", roomBox?.max);

    // // Cek tabrakan dengan collider
    // for (const box of collidableBoxes) {
    //     if (playerBox.intersectsBox(box)) {
    //         console.log("🚧 Tabrak:", box);
    //     }
    // }

    // Cek tabrakan dengan pilar
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
        const object = controls.getObject();
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

    // Deteksi "lantai"
    // Raycaster untuk cek tanah di bawah player
    downRay.set(object.position, downDirection);

    // Hanya intersect dengan object yang ada di scene
    const intersects = downRay.intersectObjects(sceneRef.children, true);

    // Batas bawah maksimum (misal tinggi kaki 1.7 meter di atas permukaan)
    const maxRayDistance = 2;

    const validHits = intersects.filter(
        (hit) => hit.distance <= maxRayDistance
    );

    if (validHits.length > 0) {
        isOnGround = true;

        // Snap ke permukaan hanya jika player jatuh
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

    if (soundObject.isPlaying) {
        soundObject.stop();
    }

    try {
        soundObject.play();
    } catch (error) {
        console.error("Error playing sound:", error);
    }
}

export function switchWeapon(weaponNumber) {
    if (!weapons.pistol || !weapons.m4 || !weapons.knife) {
        console.log("Weapons not loaded yet:", {
            pistol: weapons.pistol,
            m4: weapons.m4,
            knife: weapons.knife,
        });
        return;
    }

    // Prevent switching to the same weapon
    if (
        (weaponNumber === 1 && currentWeapon === weapons.m4) ||
        (weaponNumber === 2 && currentWeapon === weapons.pistol) ||
        (weaponNumber === 3 && currentWeapon === weapons.knife)
    ) {
        return;
    }

    const hideAnim = pistolAnimations["Armature|Hide"];
    const unhideAnim = pistolAnimations["Armature|Unhide"];
    const idleAnim = pistolAnimations["Armature|Idle"];
    const pistolMixer = hideAnim
        ? hideAnim.getMixer()
        : unhideAnim
        ? unhideAnim.getMixer()
        : idleAnim
        ? idleAnim.getMixer()
        : null;

    // Stop all current pistol animations
    if (pistolMixer) {
        // A bit of a forceful way, but ensures no animation is missed.
        // More granular stop() calls are made later as well.
        Object.values(pistolAnimations).forEach((anim) => {
            if (anim && anim.isRunning()) {
                anim.stop();
            }
        });
    }

    if (weaponNumber === 1) {
        // Switch to M4
        if (currentWeapon === weapons.pistol && hideAnim && pistolMixer) {
            hideAnim.reset();
            hideAnim.setLoop(THREE.LoopOnce);
            hideAnim.clampWhenFinished = true;
            hideAnim.play();

            const onFinishedHide = (e) => {
                if (e.action === hideAnim) {
                    weapons.pistol.visible = false;
                    weapons.m4.visible = true;
                    weapons.knife.visible = false;
                    currentWeapon = weapons.m4;
                    if (
                        soundsLoaded.m4 &&
                        m4SwitchSound &&
                        m4SwitchSound.buffer
                    ) {
                        playWeaponSound(m4SwitchSound);
                    }
                    pistolMixer.removeEventListener("finished", onFinishedHide);
                }
            };
            pistolMixer.addEventListener("finished", onFinishedHide);
        } else {
            weapons.pistol.visible = false;
            weapons.m4.visible = true;
            weapons.knife.visible = false;
            currentWeapon = weapons.m4;
            if (soundsLoaded.m4 && m4SwitchSound && m4SwitchSound.buffer) {
                playWeaponSound(m4SwitchSound);
            }
        }
    } else if (weaponNumber === 2) {
        // Switch to Pistol
        // This case is already handled by the initial check, but kept for clarity
        if (currentWeapon === weapons.pistol) return;

        if (unhideAnim && idleAnim && pistolMixer) {
            weapons.m4.visible = false;
            weapons.knife.visible = false;
            weapons.pistol.visible = true; // Make pistol visible before unhide animation

            unhideAnim.reset();
            unhideAnim.setLoop(THREE.LoopOnce);
            unhideAnim.clampWhenFinished = true;
            unhideAnim.play();

            currentWeapon = weapons.pistol; // Set current weapon immediately
            if (
                soundsLoaded.pistol &&
                pistolSwitchSound &&
                pistolSwitchSound.buffer
            ) {
                playWeaponSound(pistolSwitchSound);
            }

            const onFinishedUnhide = (e) => {
                if (e.action === unhideAnim) {
                    idleAnim.reset().play(); // Loop by default
                    pistolMixer.removeEventListener(
                        "finished",
                        onFinishedUnhide
                    );
                }
            };
            pistolMixer.addEventListener("finished", onFinishedUnhide);
        } else {
            // Fallback if animations are not available
            weapons.m4.visible = false;
            weapons.pistol.visible = true;
            weapons.knife.visible = false;
            currentWeapon = weapons.pistol;
            if (
                soundsLoaded.pistol &&
                pistolSwitchSound &&
                pistolSwitchSound.buffer
            ) {
                playWeaponSound(pistolSwitchSound);
            }
        }
    } else if (weaponNumber === 3) {
        // Switch to Knife
        if (currentWeapon === weapons.pistol && hideAnim && pistolMixer) {
            hideAnim.reset();
            hideAnim.setLoop(THREE.LoopOnce);
            hideAnim.clampWhenFinished = true;
            hideAnim.play();

            const onFinishedHide = (e) => {
                if (e.action === hideAnim) {
                    weapons.pistol.visible = false;
                    weapons.m4.visible = false;
                    weapons.knife.visible = true;
                    currentWeapon = weapons.knife;
                    if (
                        soundsLoaded.knife &&
                        knifeSwitchSound &&
                        knifeSwitchSound.buffer
                    ) {
                        playWeaponSound(knifeSwitchSound);
                    }
                    pistolMixer.removeEventListener("finished", onFinishedHide);
                }
            };
            pistolMixer.addEventListener("finished", onFinishedHide);
        } else {
            weapons.m4.visible = false;
            weapons.pistol.visible = false;
            weapons.knife.visible = true;
            currentWeapon = weapons.knife;
            if (
                soundsLoaded.knife &&
                knifeSwitchSound &&
                knifeSwitchSound.buffer
            ) {
                playWeaponSound(knifeSwitchSound);
            }
        }
    }
}
