import * as THREE from "three";
import { scene, camera, renderer } from "./sceneSetup.js";
import { addLighting } from "./lighting.js";
import { setupControls, updateCameraMovement, setScene } from "./controls.js";
import { loadModels, pistolMixer, shootableTargets } from "./loader.js";

addLighting(scene);
setupControls(camera, renderer);
loadModels(scene, camera, () => {
    document.getElementById("loadingScreen").style.display = "none";
    document.getElementById("startOverlay").style.display = "flex";

    setupControls(camera, renderer); // aktifkan kontrol hanya setelah siap
});

setScene(scene);

const bullets = [];

// Tambahkan array untuk menyimpan bekas tembakan
const bulletHoles = [];

export function spawnBullet(origin, direction) {
    // Buat peluru lebih kecil dan memanjang
    const geometry = new THREE.CylinderGeometry(0.02, 0.02, 0.2, 8);
    const material = new THREE.MeshPhongMaterial({ 
        color: 0xffff00,
        emissive: 0xff8c00,
        shininess: 100
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
            createImpactEffects(bullet.position.clone(), bullet.direction.clone());
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

// Fungsi helper untuk membuat efek impact
function createImpactEffects(position, direction) {
    // Impact flash
    const flashGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const flashMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        transparent: true,
        opacity: 0.5
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
        opacity: 0.8
    });
    const impact = new THREE.Mesh(impactGeometry, impactMaterial);
    impact.position.copy(position);
    scene.add(impact);
    
    setTimeout(() => scene.remove(impact), 300);
}

animate();
