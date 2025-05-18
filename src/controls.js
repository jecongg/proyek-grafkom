import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import * as THREE from "three";
import { roomBox, collidableBoxes } from "./loader.js";
import { scene } from "./sceneSetup.js";

let controls;
let moveForward = false,
    moveBackward = false,
    moveLeft = false,
    moveRight = false;
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
let previousPosition = new THREE.Vector3();

export function setupControls(camera, renderer) {
    controls = new PointerLockControls(camera, renderer.domElement);

    document.body.addEventListener("click", () => {
        controls.lock();
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
        }
    });
}

export function updateCameraMovement() {
    if (!controls.isLocked) return;

    const speed = 0.07;
    const object = controls.getObject();

    previousPosition.copy(object.position);

    if (moveForward) controls.moveForward(speed);
    if (moveBackward) controls.moveForward(-speed);
    if (moveLeft) controls.moveRight(-speed);
    if (moveRight) controls.moveRight(speed);

    if (!roomBox || roomBox.isEmpty()) {
        return;
    }

    // ✅ Buat playerBox SEBELUM digunakan
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
}
