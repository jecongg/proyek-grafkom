import * as THREE from 'three';

export function addLighting(scene) {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
  scene.add(ambientLight);

//   const spotLight = new THREE.SpotLight(0xffffff, 0.8);
//   spotLight.position.set(0, 1, 0);
//   spotLight.angle = Math.PI / 6;
//   spotLight.penumbra = 0.3;
//   spotLight.castShadow = true;
//   scene.add(spotLight);

  const pointLight = new THREE.PointLight(0xffaa00, 1.2, 15);
  pointLight.position.set(0, 1.5, 0);
  scene.add(pointLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(1, 1, -1);
  scene.add(directionalLight);
}
