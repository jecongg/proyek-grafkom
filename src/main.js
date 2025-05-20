import * as THREE from "three";
import { scene, camera, renderer } from "./sceneSetup.js";
import { addLighting } from "./lighting.js";
import { setupControls, updateCameraMovement, setScene } from "./controls.js";
import { loadModels, pistolMixer } from "./loader.js";
import { sphere, torus, cone, cylinder, dodecahedron } from "./obj.js";

addLighting(scene);
setupControls(camera, renderer);
loadModels(scene, camera, () => {
    document.getElementById("loadingScreen").style.display = "none";
    document.getElementById("startOverlay").style.display = "flex";

    setupControls(camera, renderer); // aktifkan kontrol hanya setelah siap
});

setScene(scene);

// scene.add(sphere, torus, cone, cylinder, dodecahedron);
let clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    updateCameraMovement();

    const delta = clock.getDelta();
    if (pistolMixer) pistolMixer.update(delta);

    sphere.rotation.y += 0.01;
    torus.rotation.x += 0.02;
    cone.rotation.y += 0.015;
    cylinder.rotation.z += 0.02;
    dodecahedron.rotation.x += 0.01;
    dodecahedron.rotation.y += 0.01;

    renderer.render(scene, camera);
}

animate();
