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
    createWall(8, 6, 0.2, [-4, 2, -14]); // Dinding belakang segmen kiri celah (dari -8 ke 0)

    // Bagian kanan celah
    createWall(8, 6, 0.2, [6, 2, -14]); // Dinding belakang segmen kanan celah (dari 2 ke 10)

    // Bagian atas celah
    createWall(2, 1, 0.2, [1, 4.5, -14]); // Dinding belakang segmen atas celah (X: 0 ke 2, Y: 4 ke 5)

    // Dinding lainnya tetap utuh
    createWall(17.8, 6, 0.2, [1, 2, 2]); // Dinding depan
    createWall(0.2, 6, 16.2, [-8, 2, -6]); // Dinding kiri
    createWall(0.2, 6, 16.2, [10, 2, -6]); // Dinding kanan
    
    // Pintu di dinding belakang - DIBALIK POSISINYA
    createDoor(2, 3, [1, 1, -12], Math.PI); // Pintu di dinding belakang
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

// Fungsi untuk membuat pintu - POSISI DIBALIK
function createDoor(width, height, position, rotation = 0) {
    const doorGroup = new THREE.Group();
    
    // Posisikan engsel di sisi kanan pintu (X=2 dari celah pintu) - DIBALIK
    // Engsel berada di X=2, Y=1, Z=-12
    doorGroup.position.set(2, 1, -14);
    
    // Rotasi awal 0 (menghadap ke arah Z negatif saat tertutup) - DIBALIK
    doorGroup.rotation.y = 0;
    
    // Frame pintu (posisikan relatif terhadap doorGroup)
    const frameGeometry = new THREE.BoxGeometry(width + 0.2, height + 0.2, 0.1);
    const frameMaterial = new THREE.MeshPhongMaterial({ color: 0x4a4a4a });
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    // Frame di tengah celah pintu - DISESUAIKAN
    frame.position.set(-width / 2, 0, 0);
    doorGroup.add(frame);
    
    // Pintu (posisikan relatif terhadap doorGroup, engsel di kanan) - DIBALIK
    const doorGeometry = new THREE.BoxGeometry(width, height, 0.05);
    const doorMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x8B4513,
        shininess: 30
    });
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    // Pintu berputar dari engsel kanan, jadi posisi X = -width/2 - DIBALIK
    // Pintu di depan frame (Z positif)
    door.position.set(-width / 2, 0, -0.05);
    doorGroup.add(door);

    // Sisi belakang pintu (menghadap ke ruangan lain)
    const doorBackGeometry = new THREE.BoxGeometry(width, height, 0.05);
    const doorBackMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x8B4513,
        shininess: 30
    });
    const doorBack = new THREE.Mesh(doorBackGeometry, doorBackMaterial);
    doorBack.position.set(-width / 2, 0, 0.05);
    doorGroup.add(doorBack);

    // Handle pintu sisi depan
    const handleGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.15, 8);
    const handleMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xC0C0C0,
        shininess: 100
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.rotation.z = Math.PI / 2;
    // Handle di sisi kiri pintu (berlawanan dari engsel) - DISESUAIKAN
    // Posisi handle di permukaan depan pintu
    handle.position.set(-width/3 - 0.2, 0, -0.05);
    door.add(handle);

    // Handle pintu sisi belakang
    const handleBackGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.15, 8);
    const handleBackMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xC0C0C0,
        shininess: 100
    });
    const handleBack = new THREE.Mesh(handleBackGeometry, handleBackMaterial);
    handleBack.rotation.z = Math.PI / 2;
    // Handle di sisi kiri pintu belakang
    handleBack.position.set(-width/3 - 0.2, 0, 0.05);
    doorBack.add(handleBack);
    
    // Properti pintu - ARAH ROTASI DIBALIK
    doorGroup.userData = {
        isOpen: false,
        isOpening: false,
        targetRotation: 0, // Rotasi saat tertutup
        openRotation: Math.PI / 2, // Rotasi saat terbuka (+90 derajat) - DIBALIK ARAH
        closedRotation: 0, // Rotasi saat tertutup
        interactionDistance: 2,
        door: door
    };
    
    // Tambahkan collision box untuk frame (bukan untuk pintu yang bergerak)
    const frameBox = new THREE.Box3().setFromObject(frame);
    shootableTargets.push(frameBox);
    
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
    bullet.speed = 20;
    bullet.life = 5;

    scene.add(bullet);
    bullets.push(bullet);
}

let clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    updateCameraMovement();

    const delta = clock.getDelta();
    if (pistolMixer) pistolMixer.update(delta);

    // Update animasi pintu - DIPERBAIKI
    scene.traverse((object) => {
        if (object.userData && object.userData.isOpening) {
            const currentRotation = object.rotation.y;
            const targetRotation = object.userData.targetRotation;
            
            // Animasi smooth dengan kecepatan konstan
            const rotationSpeed = 3; // radian per detik
            const rotationDiff = targetRotation - currentRotation;
            
            if (Math.abs(rotationDiff) > 0.01) {
                const step = Math.sign(rotationDiff) * rotationSpeed * delta;
                if (Math.abs(step) >= Math.abs(rotationDiff)) {
                    object.rotation.y = targetRotation;
                    object.userData.isOpening = false;
                } else {
                    object.rotation.y += step;
                }
            } else {
                object.rotation.y = targetRotation;
                object.userData.isOpening = false;
            }
            
            // Update collision box untuk pintu yang bergerak
            updateDoorCollision(object);
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

// Fungsi untuk update collision box pintu yang bergerak
function updateDoorCollision(doorGroup) {
    // Hapus collision box lama untuk pintu ini
    for (let i = collidableBoxes.length - 1; i >= 0; i--) {
        // Identifikasi collision box pintu berdasarkan posisi atau metadata
        // Untuk sekarang, kita tidak update collision untuk pintu yang bergerak
        // karena kompleksitas geometri yang berubah
    }
}

function createBulletHole(position, normal) {
    const geometry = new THREE.CircleGeometry(0.05, 16);
    const material = new THREE.MeshPhongMaterial({
        color: 0x333333,
        emissive: 0x111111,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        depthWrite: false,
    });

    const decal = new THREE.Mesh(geometry, material);
    decal.position.copy(position).add(normal.clone().multiplyScalar(-0.01));
    decal.lookAt(position.clone().add(normal));

    scene.add(decal);
    bulletHoles.push({ mesh: decal, createdAt: Date.now() });
}

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

// Event listener untuk tombol F - DIPERBAIKI
document.addEventListener('keydown', (event) => {
    if (event.code === 'KeyF') {
        const cameraPosition = camera.position.clone();
        
        // Cek interaksi dengan pintu
        scene.traverse((object) => {
            if (object.userData && typeof object.userData.isOpen === 'boolean') {
                const doorPosition = object.position.clone();
                const distance = cameraPosition.distanceTo(doorPosition);
                
                if (distance <= object.userData.interactionDistance) {
                    // Toggle status pintu
                    object.userData.isOpen = !object.userData.isOpen;
                    object.userData.isOpening = true;
                    
                    // Set target rotasi berdasarkan status
                    if (object.userData.isOpen) {
                        object.userData.targetRotation = object.userData.openRotation;
                    } else {
                        object.userData.targetRotation = object.userData.closedRotation;
                    }
                    
                    console.log(`Door ${object.userData.isOpen ? 'opening' : 'closing'} to ${object.userData.targetRotation} radians`);
                }
            }
        });
    }
});

animate();