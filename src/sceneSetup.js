import * as THREE from "three";

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.set(0, 1.6, -3);

scene.add(camera);

const flashlight = new THREE.SpotLight(
    0xffffff, // Warna cahaya senter (putih)
    150, // Intensitas (dibuat tinggi agar menonjol di kegelapan)
    30, // Jarak maksimal cahaya
    Math.PI / 8, // Sudut kerucut cahaya (angle)
    0.3, // Penumbra (untuk pinggiran cahaya yang halus)
    1.5 // Decay (jatuhnya intensitas cahaya seiring jarak)
);

// --- PENTING UNTUK BAYANGAN DARI SENTER ---
flashlight.castShadow = true;
flashlight.shadow.mapSize.width = 1024;
flashlight.shadow.mapSize.height = 1024;
flashlight.shadow.camera.near = 0.5;
flashlight.shadow.camera.far = 30;
flashlight.shadow.bias = -0.001;

// Senter awalnya dimatikan
flashlight.visible = false;
flashlight.position.set(0,0,0);
flashlight.target.position.set(0, 0, -1);
flashlight.visible=true;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

export { scene, camera, renderer };
