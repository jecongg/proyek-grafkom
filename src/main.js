import * as THREE from "three";
import { scene, camera, renderer } from "./sceneSetup.js";
import { addLighting } from "./lighting.js";
import { setupControls, updateCameraMovement, setScene } from "./controls.js";
import { collidableBoxes, loadModels, pistolMixer, shootableTargets } from "./loader.js";

addLighting(scene);
setupControls(camera, renderer);
loadModels(scene, camera, () => {
    document.getElementById("loadingScreen").style.display = "none";
    document.getElementById("startOverlay").style.display = "flex";

    setupControls(camera, renderer); // aktifkan kontrol hanya setelah siap
    
    // Ruang Utama
    // Dinding belakang, dipecah untuk celah pintu
    // Bagian kiri celah
    createWall(8, 6, 0.2, [-4, 2, -12]); // Dinding belakang segmen kiri celah (dari -8 ke 0)

    // Bagian kanan celah
    createWall(8, 6, 0.2, [6, 2, -12]); // Dinding belakang segmen kanan celah (dari 2 ke 10)

    // Bagian atas celah
    createWall(2, 1, 0.2, [1, 4.5, -12]); // Dinding belakang segmen atas celah (X: 0 ke 2, Y: 4 ke 5)

    // Dinding lainnya tetap utuh
    createWall(17.8, 6, 0.2, [1, 2, 2]); // Dinding depan
    createWall(0.2, 6, 14.2, [-8, 2, -5]); // Dinding kiri
    createWall(0.2, 6, 14.3, [10, 2, -5]); // Dinding kanan
    
    // Pintu di dinding belakang
    createDoor(2, 3, [1, 1, -12], Math.PI); // Pintu di dinding belakang menghadap ke dalam ruangan
});

setScene(scene);

const bullets = [];

// Tambahkan array untuk menyimpan bekas tembakan
const bulletHoles = [];

// Fungsi untuk membuat dinding
function createWall(width, height, depth, position, rotation = 0) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshPhongMaterial({
        color: 0x808080,
        shininess: 30
    });
    const wall = new THREE.Mesh(geometry, material);
    wall.position.set(...position);
    wall.rotation.y = rotation;
    
    // Tambahkan collision box
    const box = new THREE.Box3().setFromObject(wall);
    shootableTargets.push(box);
    collidableBoxes.push(box);
    
    scene.add(wall);
    return wall;
}

// Fungsi untuk membuat pintu
function createDoor(width, height, position, rotation = 0) {
    const doorGroup = new THREE.Group();
    
    // Frame pintu
    const frameGeometry = new THREE.BoxGeometry(width + 0.2, height + 0.2, 0.1);
    const frameMaterial = new THREE.MeshPhongMaterial({ color: 0x4a4a4a });
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    doorGroup.add(frame);
    
    // Pintu
    const doorGeometry = new THREE.BoxGeometry(width, height, 0.05);
    const doorMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x8B4513,
        shininess: 30
    });
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.z = 0.1;
    doorGroup.add(door);

    // Handle pintu
    const handleGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.1, 8);
    const handleMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xC0C0C0,
        shininess: 100
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.rotation.z = Math.PI / 2;
    handle.position.set(width/2 - 0.1, 0, 0.15);
    door.add(handle);
    
    doorGroup.position.set(...position);
    doorGroup.rotation.y = rotation;
    
    // Properti pintu
    doorGroup.userData = {
        isOpen: false,
        isOpening: false,
        targetRotation: 0,
        originalRotation: rotation,
        interactionDistance: 2, // Jarak maksimum untuk interaksi
        door: door
    };
    
    // Tambahkan collision box
    const box = new THREE.Box3().setFromObject(doorGroup);
    shootableTargets.push(box);
    collidableBoxes.push(box);
    
    scene.add(doorGroup);
    return doorGroup;
}

export function spawnBullet(origin, direction) {
    // Buat peluru lebih kecil dan memanjang
    const geometry = new THREE.CylinderGeometry(0.02, 0.02, 0.2, 8);
    const material = new THREE.MeshPhongMaterial({
        color: 0xffff00,
        emissive: 0xff8c00,
        shininess: 100,
    });
    const bullet = new THREE.Mesh(geometry, material);

    // Rotasi peluru sesuai arah tembak
    bullet.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

    bullet.position.copy(origin);
    bullet.direction = direction.normalize();
    bullet.speed = 20; // Tambah kecepatan
    bullet.life = 5; // Tambah lifetime

    scene.add(bullet);
    bullets.push(bullet);
}

let clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    updateCameraMovement();

    const delta = clock.getDelta();
    if (pistolMixer) pistolMixer.update(delta);

    // Update animasi pintu
    scene.traverse((object) => {
        if (object.userData && object.userData.isOpening) {
            const door = object.userData.door;
            const currentRotation = object.rotation.y;
            const targetRotation = object.userData.targetRotation;
            
            // Animasi smooth
            if (Math.abs(currentRotation - targetRotation) > 0.01) {
                object.rotation.y += (targetRotation - currentRotation) * delta * 2;
            } else {
                object.rotation.y = targetRotation;
                object.userData.isOpening = false;
            }
        }
    });

    // Update bullet positions and check collisions
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.position.addScaledVector(bullet.direction, bullet.speed * delta);
        bullet.life -= delta;

        const bulletBox = new THREE.Box3().setFromCenterAndSize(
            bullet.position,
            new THREE.Vector3(0.05, 0.05, 0.05)
        );

        let hitSomething = false;

        // Cek tabrakan dengan objek yang bisa ditembak
        for (const targetBox of shootableTargets) {
            if (bulletBox.intersectsBox(targetBox)) {
                // Efek visual tembakan
                createImpactEffects(
                    bullet.position.clone(),
                    bullet.direction.clone()
                );

                // Bekas peluru
                createBulletHole(
                    bullet.position.clone(),
                    bullet.direction.clone()
                );

                // Hapus peluru
                scene.remove(bullet);
                bullets.splice(i, 1);
                hitSomething = true;
                break;
            }
        }

        // Jika tidak terkena apa-apa dan habis waktu
        if (!hitSomething && bullet.life <= 0) {
            scene.remove(bullet);
            bullets.splice(i, 1);
        }
    }

    // Hapus bekas tembakan yang sudah lama (setelah 10 detik)
    const now = Date.now();
    for (let i = bulletHoles.length - 1; i >= 0; i--) {
        if (now - bulletHoles[i].createdAt > 10000) {
            scene.remove(bulletHoles[i].mesh);
            bulletHoles.splice(i, 1);
        }
    }

    renderer.render(scene, camera);
}

function createBulletHole(position, normal) {
    const geometry = new THREE.CircleGeometry(0.05, 16);
    const material = new THREE.MeshPhongMaterial({
        color: 0x333333,
        emissive: 0x111111,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        depthWrite: false, // Hindari z-fighting
    });

    const decal = new THREE.Mesh(geometry, material);

    // Posisi sedikit offset agar tidak "z-fight" dengan permukaan
    decal.position.copy(position).add(normal.clone().multiplyScalar(-0.01));
    decal.lookAt(position.clone().add(normal));

    scene.add(decal);

    // Simpan ke array untuk hapus nanti
    bulletHoles.push({ mesh: decal, createdAt: Date.now() });
}

// Fungsi helper untuk membuat efek impact
function createImpactEffects(position, direction) {
    // Impact flash
    const flashGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const flashMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        transparent: true,
        opacity: 0.5,
    });
    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
    flash.position.copy(position);
    scene.add(flash);

    // Animate and remove flash
    let opacity = 0.5;
    const fadeOut = setInterval(() => {
        opacity -= 0.1;
        flashMaterial.opacity = opacity;
        if (opacity <= 0) {
            scene.remove(flash);
            clearInterval(fadeOut);
        }
    }, 50);

    // Impact sphere
    const impactGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const impactMaterial = new THREE.MeshBasicMaterial({
        color: 0xff8c00,
        transparent: true,
        opacity: 0.8,
    });
    const impact = new THREE.Mesh(impactGeometry, impactMaterial);
    impact.position.copy(position);
    scene.add(impact);

    setTimeout(() => scene.remove(impact), 300);
}

// Tambahkan event listener untuk tombol F
document.addEventListener('keydown', (event) => {
    if (event.code === 'KeyF') {
        const cameraPosition = camera.position.clone();
        const cameraDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        
        // Cek interaksi dengan pintu
        scene.traverse((object) => {
            if (object.userData && object.userData.isOpen !== undefined) {
                const doorPosition = object.position.clone();
                const distance = cameraPosition.distanceTo(doorPosition);
                
                if (distance <= object.userData.interactionDistance) {
                    // Toggle status pintu
                    object.userData.isOpen = !object.userData.isOpen;
                    object.userData.isOpening = true;
                    object.userData.targetRotation = object.userData.isOpen ? 
                        object.userData.originalRotation + Math.PI/2 : 
                        object.userData.originalRotation;
                }
            }
        });
    }
});

animate();
