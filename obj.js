import * as THREE from "three";

const materials = [
    new THREE.MeshStandardMaterial({ color: 0xff5733 }), // Merah
    new THREE.MeshStandardMaterial({ color: 0x33ff57 }), // Hijau
    new THREE.MeshStandardMaterial({ color: 0x3357ff }), // Biru
    new THREE.MeshStandardMaterial({ color: 0xffff33 }), // Kuning
    new THREE.MeshStandardMaterial({ color: 0xff33ff }), // Ungu
];

// 1. Bola
const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.6, 32, 32),
    materials[0]
);
sphere.position.set(-2, -2 + 0.6, 0);

// 2. Torus
const torus = new THREE.Mesh(
    new THREE.TorusGeometry(0.6, 0.2, 16, 100),
    materials[1]
);
torus.position.set(2, -2 + 0.6, 0);

// 3. Kerucut
const cone = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.2, 32), materials[2]);
cone.position.set(0, -2 + 0.6, -2);

// 4. Silinder
const cylinder = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 1.2, 32),
    materials[3]
);
cylinder.position.set(-1.5, -2 + 0.6, 2);

// 5. Dodecahedron
const dodecahedron = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.7),
    materials[4]
);
dodecahedron.position.set(1.5, -2 + 0.7, 2);

export { sphere, torus, cone, cylinder, dodecahedron };