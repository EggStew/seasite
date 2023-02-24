import * as THREE from 'three'

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import Stats from 'three/examples/jsm/libs/stats.module';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min';
import { Water } from 'three/examples/jsm/objects/Water';
import { Sky } from 'three/examples/jsm/objects/Sky';

import watertexture from './waternormals.jpg';
import sandtexture from './sand-texture-2.jpg';


let container, stats;
let camera, scene, renderer;
let controls, water, sun, mesh;
let texture;

let INTERSECTED;
let theta = 0;

const worldWidth = 256,
  worldDepth = 256,
  worldHalfWidth = worldWidth / 2,
  worldHalfDepth = worldDepth / 2;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let prevhovered;
let originalColor;

const metalMaterial = {
  metalness: 1.0,
  roughness: 1.0,
  color: 0xcfcfcf,
};

init();
animate();

function onMouseMove(event) {
  // calculate pointer position in normalized device coordinates
  // (-1 to +1) for both components

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  hovered();
}

function hovered() {
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(scene.children);
  for (let i = 0; i < intersects.length; i++) {
    if (intersects[i].object === prevhovered) {
      break;
    } else {
      if (prevhovered != null) {
        prevhovered.material.color.set(originalColor);
      }
    }
    if (intersects[i].object.name === "chain") {
      originalColor = intersects[i].object.material.color.getHex(); //16777215

      prevhovered = intersects[i].object;
      prevhovered.material.color.set(0xff2e2e);
      break;
    }
  }
}

/* function modelinit() {
  // Turret model

  const loader = new GLTFLoader().setPath("./static/models/turret/gl");

  loader.load("turret.gltf", function (gltf) {
    const modelturret = gltf.scene;

    const newMaterial = new THREE.MeshStandardMaterial(metalMaterial);
    modelturret.traverse((o) => {
      if (o.isMesh) o.material = newMaterial;
    });

    modelturret.scale.set(2, 2, 2);

    modelturret.position.set(0, -2, 0);

    scene.add(gltf.scene);
  });
} */

function init() {

  //loading turret model

  const gltfLoader = new GLTFLoader();
  
  gltfLoader.load(
    './models/turret/glTF/turret.gltf',
    (gltf) =>
    {
      const modelturret = gltf.scene;

    const newMaterial = new THREE.MeshStandardMaterial(metalMaterial);
    modelturret.traverse((o) => {
      if (o.isMesh) o.material = newMaterial;
    });

    modelturret.scale.set(2, 2, 2);

    modelturret.position.set(0, -2, 0);

    scene.add(gltf.scene);
    }
  )

  //

  container = document.getElementById("container");
  container.innerHTML = "";
  //

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  container.appendChild(renderer.domElement);

  //

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    1,
    5000
  );
  camera.position.set(30, 30, 100);

  //

  sun = new THREE.Vector3();

  // Water

  const waterGeometry = new THREE.PlaneGeometry(2500, 2500);

  water = new Water(waterGeometry, {
    textureWidth: 512,
    textureHeight: 512,
    waterNormals: new THREE.TextureLoader().load(watertexture,
      function (texture) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      }
    ),
    sunDirection: new THREE.Vector3(),
    sunColor: 0xffffff,
    waterColor: 0x001e0f,
    distortionScale: 3.7,
    //fog: (scene.fog = new THREE.Fog(0x003366, 10, 500)),
  });

  water.rotation.x = -Math.PI / 2;
  //water.material.side = THREE.DoubleSide;
  scene.add(water);

  // Skybox

  const sky = new Sky();
  sky.scale.setScalar(2500);
  scene.add(sky);

  const skyUniforms = sky.material.uniforms;

  skyUniforms["turbidity"].value = 10;
  skyUniforms["rayleigh"].value = 2;
  skyUniforms["mieCoefficient"].value = 0.005;
  skyUniforms["mieDirectionalG"].value = 0.8;

  const parameters = {
    elevation: 4,
    azimuth: 0,
  };

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  let renderTarget;

  function updateSun() {
    const phi = THREE.MathUtils.degToRad(90 - parameters.elevation);
    const theta = THREE.MathUtils.degToRad(parameters.azimuth);

    sun.setFromSphericalCoords(1, phi, theta);

    sky.material.uniforms["sunPosition"].value.copy(sun);
    water.material.uniforms["sunDirection"].value.copy(sun).normalize();

    if (renderTarget !== undefined) renderTarget.dispose();

    renderTarget = pmremGenerator.fromScene(sky);

    scene.environment = renderTarget.texture;
  }

  updateSun();

  //Creating bounding cube for ocean area

  const geometrycube = new THREE.BoxGeometry(2500, 1000, 2500);
  const materialcube = new THREE.MeshBasicMaterial({ color: 0x001a33 });
  const cube = new THREE.Mesh(geometrycube, materialcube);
  cube.material.side = THREE.BackSide;
  cube.position.set(0, -501, 0);
  scene.add(cube);

  //Creating Geometry for Ocean floor

  const geometrysea = new THREE.BoxGeometry(2500, 10, 2500);
  const materialsea = new THREE.MeshBasicMaterial({
    map: new THREE.TextureLoader().load(sandtexture),
  });
  const cubesea = new THREE.Mesh(geometrysea, materialsea);
  cubesea.position.set(0, -1001, 0);
  scene.add(cubesea);

  //Create Basic Mooring line bezier curve geometry

  const curve1 = new THREE.CubicBezierCurve3(
    new THREE.Vector3(0, -2, 0),
    new THREE.Vector3(0, -650, 0),
    new THREE.Vector3(750, -850, 750),
    new THREE.Vector3(1250, -1000, 1250)
  );

  const curve2 = new THREE.CubicBezierCurve3(
    new THREE.Vector3(0, -2, 0),
    new THREE.Vector3(0, -650, 0),
    new THREE.Vector3(-750, -850, 750),
    new THREE.Vector3(-1250, -1000, 1250)
  );

  const curve3 = new THREE.CubicBezierCurve3(
    new THREE.Vector3(0, -2, 0),
    new THREE.Vector3(0, -650, 0),
    new THREE.Vector3(750, -850, -750),
    new THREE.Vector3(1250, -1000, -1250)
  );

  const curve4 = new THREE.CubicBezierCurve3(
    new THREE.Vector3(0, -2, 0),
    new THREE.Vector3(0, -650, 0),
    new THREE.Vector3(-750, -850, -750),
    new THREE.Vector3(-1250, -1000, -1250)
  );

  let curve = [curve1, curve2, curve3, curve4];
  let counter = 1;

  for (let i = 0; i < curve.length; i++) {
    spawnChainUsingBezier(curve[i], counter);
    counter += 1;
  }

  // Orbit Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.target.set(0, 10, 0);
  controls.minDistance = 0.0;
  controls.maxDistance = 200.0;
  controls.update();

  //

  stats = new Stats();
  container.appendChild(stats.dom);

  // GUI

  const gui = new GUI();

  const folderSky = gui.addFolder("Sky");
  folderSky.add(parameters, "elevation", 0, 90, 0.1).onChange(updateSun);
  folderSky.add(parameters, "azimuth", -180, 180, 0.1).onChange(updateSun);
  folderSky.open();

  const waterUniforms = water.material.uniforms;

  const folderWater = gui.addFolder("Water");
  folderWater
    .add(waterUniforms.distortionScale, "value", 0, 8, 0.1)
    .name("distortionScale");
  folderWater.add(waterUniforms.size, "value", 0.1, 10, 0.1).name("size");
  folderWater.open();

  /*const folderCamera = gui.addFolder('Camera');
    folderCamera.add(camera.position, 'value', 30, 30, 100).name('cameraPosition')
    folderCamera.open();*/

  // Initialise the loaded gltf model

  //modelinit();

  // Calls the window resize function

  window.addEventListener("resize", onWindowResize);

  window.addEventListener("mousemove", onMouseMove);
}

function spawnChainUsingBezier(curve) {
  // Creating points array from curve, equal to the number of instanced chain links

  const points1 = curve.getPoints(1500);

  // Creating the curve which the tube geometry will be created from

  const curvecat = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.5, -0.75),
    new THREE.Vector3(0, 0.5, 0.75),
    new THREE.Vector3(0, 0.25, 1),
    new THREE.Vector3(0, -0.25, 1),
    new THREE.Vector3(0, -0.5, 0.75),
    new THREE.Vector3(0, -0.5, -0.75),
    new THREE.Vector3(0, -0.25, -1),
    new THREE.Vector3(0, 0.25, -1),
  ]);

  curvecat.closed = true;

  // Defining the geometry, material and mesh for the chain link

  const geometry = new THREE.TubeGeometry(curvecat, 20, 0.2, 16, false);
  const material = new THREE.MeshStandardMaterial(metalMaterial);
  const mesh2 = new THREE.InstancedMesh(geometry, material, 1500);
  mesh2.name = "chain"; // + counter
  scene.add(mesh2);

  //Setting up instancing for chain link, setting position at each point in points array and defining rotation from lookAt method

  const dummy = new THREE.Object3D();

  for (let i = 0; i < points1.length - 1; i++) {
    dummy.position.set(
      points1[i].getComponent(0),
      points1[i].getComponent(1),
      points1[i].getComponent(2)
    );

    dummy.lookAt(points1[i + 1]);

    //Rotates every other chain link

    if (i % 2 === 0) {
      dummy.rotateZ(Math.PI / 2);
    }

    dummy.updateMatrix();
    mesh2.setMatrixAt(i, dummy.matrix);
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  render();
  stats.update();
}

function render() {
  const time = performance.now() * 0.001;

  water.material.uniforms["time"].value += 0.5 / 60.0;

  renderer.render(scene, camera);
}
