import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.min.js';
import { OrbitControls } from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/examples/jsm/controls/OrbitControls.js';

// **1. Scene, Camera, Renderer**
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// **2. Ruangan Kotak**
const roomSize = 10;
const roomGeometry = new THREE.BoxGeometry(roomSize, roomSize, roomSize);
const roomMaterial = new THREE.MeshStandardMaterial({ color: 0x888888, side: THREE.BackSide });
const room = new THREE.Mesh(roomGeometry, roomMaterial);
scene.add(room);

// **3. Tambahkan Cahaya (Perbaikan)**
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Cahaya lembut
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// **4. Tambahkan Kontrol Kamera**
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;
controls.minDistance = 2;
controls.maxDistance = 20;

// **5. Posisi Kamera Diperbaiki**
camera.position.set(0, 0, 12); // Di luar kotak

// **6. Animasi Render**
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();

// **7. Resize Handler**
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
