import * as THREE from 'three';

export function addLighting(scene) {
    // --- PENCAHAYAAN RUANGAN NORMAL (VERSI SEIMBANG) ---

    scene.fog = null;

    // 1. Ambient Light - Dibuat paling redup
    // Peran: Hanya agar bayangan tidak 100% hitam.
    const ambientLight = new THREE.AmbientLight(0xe3e3e3, 0.2); // DARI 0.6 -> 0.2
    scene.add(ambientLight);

    // 2. Hemisphere Light - Sebagai cahaya pantulan
    // Peran: Memberi warna pada lingkungan dan sedikit menerangi area bayangan.
    const hemisphereLight = new THREE.HemisphereLight(
        0xe3e3e3, // Warna dari atas (langit-langit)
        0xcccccc, // Warna dari bawah (lantai)
        0.4       // DARI 1.0 -> 0.4 (lebih redup dari lampu utama)
    );
    scene.add(hemisphereLight);

    // 3. Directional Light (Lampu Utama) - Tetap menjadi yang terkuat
    // Peran: Menjadi sumber cahaya utama, menciptakan highlight dan bayangan yang jelas.
    const mainLight = new THREE.DirectionalLight(0x8c8c8c, 0.5); // KITA TURUNKAN SEDIKIT DARI 1.2 -> 1.0
    mainLight.position.set(10, 15, 10);

    // Konfigurasi Bayangan (Tetap sama)
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 50;
    mainLight.shadow.camera.left = -20;
    mainLight.shadow.camera.right = 20;
    mainLight.shadow.camera.top = 20;
    mainLight.shadow.camera.bottom = -20;
    mainLight.shadow.bias = -0.0005;

    scene.add(mainLight);

    // 4. Fill Light (Pengisi) - Juga dibuat lebih redup
    // Peran: Hanya untuk sedikit melembutkan bayangan dari arah berlawanan.
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.2); // DARI 0.4 -> 0.2
    fillLight.position.set(-10, 10, -10);
    scene.add(fillLight);
}

export function createFlashlight() {
    // Kita gunakan SpotLight untuk efek senter
    const flashlight = new THREE.SpotLight(
        0xffffff, // Warna cahaya senter (putih)
        100,      // Intensitas (dibuat tinggi agar menonjol di kegelapan)
        30,       // Jarak maksimal cahaya
        Math.PI / 5, // Sudut kerucut cahaya (angle)
        0.3,      // Penumbra (untuk pinggiran cahaya yang halus)
        1.5       // Decay (jatuhnya intensitas cahaya seiring jarak)
    );

    // --- PENTING UNTUK BAYANGAN DARI SENTER ---
    flashlight.castShadow = true;
    flashlight.shadow.mapSize.width = 1024;
    flashlight.shadow.mapSize.height = 1024;
    flashlight.shadow.camera.near = 0.5;
    flashlight.shadow.camera.far = 30;
    flashlight.shadow.bias = -0.001;
    flashlight.position.set(0, 0, -0.5); // Atur posisi awal senter
    flashlight.target.position.set(0, 0, -1); // Target senter mengarah ke depan
    // Senter awalnya dimatikan
    flashlight.visible = false;

    return flashlight;
}