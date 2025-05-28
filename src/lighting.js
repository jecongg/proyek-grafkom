import * as THREE from 'three';

export function addLighting(scene) {
    // 1. Ambient light sangat redup
    const ambientLight = new THREE.AmbientLight(0x1a1a1a, 0.15);
    scene.add(ambientLight);

    // 2. Kabut dipertahankan
    scene.fog = new THREE.FogExp2(0x0a0a12, 0.05);

    // Fungsi untuk lampu redup di langit-langit
    const createDimCeilingLight = (x, y, z) => {
        const color = Math.random() > 0.7 ? 0xffdd99 : 0xccddff;
        const intensity = 0.4 + Math.random() * 0.2;
        
        const light = new THREE.PointLight(color, intensity, 6, 2);
        light.position.set(x, y, z);
        
        // Kedipan sangat halus
        setInterval(() => {
            light.intensity = intensity * (0.6 + Math.random() * 0.4);
        }, 3000 + Math.random() * 4000);
        
        // Bulb kecil dan redup
        if (Math.random() > 0.4) {
            const bulb = new THREE.Mesh(
                new THREE.SphereGeometry(0.15, 10, 10),
                new THREE.MeshBasicMaterial({
                    color: color,
                    transparent: true,
                    opacity: 1
                })
            );
            bulb.position.set(x, y, z);
            scene.add(bulb);
        }
        
        scene.add(light);
        return light;
    };

    // Sebarkan lampu langit-langit secara acak di area atas
    for (let i = 0; i < 20; i++) {
        const x = -10 + Math.random() * 20;
        const z = -12 + Math.random() * 24;
        const y = 4 + Math.random() * 2; // Ketinggian 4-6 unit
        createDimCeilingLight(x, y, z);
    }

    // Fungsi untuk lampu merah yang tersebar luas
    const createScatteredRedLight = (x, y, z) => {
        const light = new THREE.PointLight(0xff3333, 1.8, 15, 2);
        light.position.set(x, y, z);
        
        // Pola kedipan acak
        const patterns = [
            () => light.intensity = 1.8 * (0.2 + Math.random()),
            () => { light.intensity = 1.8; setTimeout(() => { light.intensity = 0.2; }, 200) },
            () => { light.intensity = 0; setTimeout(() => { light.intensity = 1.8; }, 500 + Math.random() * 1000) }
        ];
        
        setInterval(() => {
            patterns[Math.floor(Math.random() * patterns.length)]();
        }, 800 + Math.random() * 1600);
        
        // Bulb merah
        const bulb = new THREE.Mesh(
            new THREE.SphereGeometry(0.18, 12, 12),
            new THREE.MeshBasicMaterial({
                color: 0xff0000,
                transparent: true,
                opacity: 0.7
            })
        );
        bulb.position.set(x, y, z);
        scene.add(bulb);
        
        // Efek volumetric untuk beberapa lampu
        if (Math.random() > 0.6) {
            const halo = new THREE.Mesh(
                new THREE.SphereGeometry(0.6, 8, 8),
                new THREE.MeshBasicMaterial({
                    color: 0xff3333,
                    transparent: true,
                    opacity: 0.15,
                    blending: THREE.AdditiveBlending
                })
            );
            halo.position.set(x, y, z);
            scene.add(halo);
        }
        
        scene.add(light);
        return light;
    };

    // Sebarkan 15 lampu merah di area yang sangat luas
    const redLightPositions = [
        // Posisi belakang
        [-12, 5, -10], [12, 5, -10], [0, 6, -12],
        // Posisi samping
        [-15, 4.5, -5], [-15, 5, 0], [-15, 4, 5],
        [15, 4.5, -5], [15, 5, 0], [15, 4, 5],
        // Posisi depan
        [-8, 5.5, 10], [8, 5.5, 10], [0, 6, 12],
        // Posisi acak
        [-5, 5, -7], [5, 5, -7], [-3, 6, 8]
    ];

    redLightPositions.forEach(pos => {
        createScatteredRedLight(pos[0], pos[1], pos[2]);
    });

    // 3. Lighting tambahan yang sangat redup
    const directionalLight = new THREE.DirectionalLight(0xffeedd, 0.15);
    directionalLight.position.set(0.3, 0.7, 0.2);
    scene.add(directionalLight);

    const hemisphereLight = new THREE.HemisphereLight(
        0x202030,
        0x101010,
        0.1
    );
    scene.add(hemisphereLight);
}