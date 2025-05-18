import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";
import { Box3Helper } from "three";

export let roomBox = null;
export let collidableBoxes = [];

export function loadModels(scene, camera) {
    const loader = new GLTFLoader();
    loader.load("/assets/models/coba/empty_old_garage_room.glb", (gltf) => {
        const model = gltf.scene;
        model.scale.set(0.5, 0.5, 0.5);
        model.position.set(0, 2.4, 0);
        scene.add(model);

        roomBox = new THREE.Box3().setFromObject(model);
        roomBox.expandByScalar(-0.9);

        // const helper = new Box3Helper(roomBox, 0x00ff00);
        // scene.add(helper);

        model.traverse((child) => {
            if (child.isMesh) {
                const box = new THREE.Box3().setFromObject(child);
                const size = new THREE.Vector3();
                box.getSize(size);

                if (
                    size.x < 5 && // misalnya kalau terlalu besar, anggap bukan pilar
                    size.y > 0.5 && // harus cukup tinggi
                    size.z < 5
                ) {
                    collidableBoxes.push(box);
                    const helper = new THREE.Box3Helper(box, 0xff0000);
                    scene.add(helper);
                }
            }
        });
    });

    loader.load("/assets/models/weapon/pistol.glb", (gltf) => {
        const model = gltf.scene;
        model.scale.set(0.015, 0.015, 0.015);
        model.position.set(0.3, -0.2, -0.4);
        model.rotation.y = Math.PI;
        camera.add(model);
    });
}
