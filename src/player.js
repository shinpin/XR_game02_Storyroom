import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { camera, scene } from './core.js';
import { world, physicsMaterial } from './physics.js';
import { levelState, showDialog } from './state.js';

export let controls;
export let catGroup;
export let catTail;
export let draggedBody = null;
export let constraint = null;
export let ghostBody;
export let playerBody;
export let catMixer = null;

const telekDistance = 5;
const raycaster = new THREE.Raycaster();
let crosshair;

export function initPlayer() {
    controls = new PointerLockControls(camera, document.body);
    crosshair = document.getElementById('crosshair');

    // Flashlight
    const controlsGroup = new THREE.Group();
    camera.add(controlsGroup);
    scene.add(camera);

    const flashlight = new THREE.SpotLight(0xffffff, 5);
    flashlight.angle = Math.PI / 5;
    flashlight.penumbra = 0.5;
    flashlight.distance = 40;
    flashlight.castShadow = true;
    flashlight.position.set(0, -0.2, 0);
    flashlight.target.position.set(0, 0, -5);
    controlsGroup.add(flashlight);
    controlsGroup.add(flashlight.target);

    // Avatar
    setupCatAvatar();

    // Physics Proxy
    playerBody = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC, material: physicsMaterial });
    playerBody.addShape(new CANNON.Sphere(0.6));
    world.addBody(playerBody);

    // Telekinesis Setup
    ghostBody = new CANNON.Body({ mass: 0, type: CANNON.BODY_TYPES.KINEMATIC, position: new CANNON.Vec3() });
    world.addBody(ghostBody);

    window.addEventListener('mousedown', () => {
        if (!controls.isLocked) return;
        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        const intersects = raycaster.intersectObjects(levelState.interactables);
        if (intersects.length > 0) {
            draggedBody = intersects[0].object.userData.physicsBody;
            draggedBody.wakeUp();

            if (intersects[0].object.userData.dialogText) {
                showDialog(intersects[0].object.userData.dialogText);
                intersects[0].object.userData.dialogText = null; 
            } else if (intersects[0].object.userData.dialogData) {
                const data = intersects[0].object.userData.dialogData;
                showDialog(data.text, data.options);
                intersects[0].object.userData.dialogData = null; 
            }

            const targetPos = new THREE.Vector3();
            camera.getWorldDirection(targetPos);
            targetPos.multiplyScalar(telekDistance).add(camera.position);
            ghostBody.position.copy(targetPos);
            
            constraint = new CANNON.PointToPointConstraint(ghostBody, new CANNON.Vec3(0,0,0), draggedBody, new CANNON.Vec3(0,0,0));
            world.addConstraint(constraint);
            if(crosshair) crosshair.classList.add('active');
        }
    });

    window.addEventListener('mouseup', releaseTelekinesis);
}

export function releaseTelekinesis() {
    if (constraint) {
        world.removeConstraint(constraint);
        constraint = null; 
        draggedBody = null;
        if(crosshair) crosshair.classList.remove('active');
    }
}

function setupCatAvatar() {
    catGroup = new THREE.Group();
    
    // Dummy tail to prevent crashes in other levels
    catTail = new THREE.Group();
    catGroup.add(catTail);
    
    const gltfLoader = new GLTFLoader();
    gltfLoader.load('/FOX_ANI.glb', (gltf) => {
        const foxModel = gltf.scene;
        
        // 放大狐狸模型 (原本為 50.0) -> 放大兩倍為 100.0
        foxModel.scale.set(100.0, 100.0, 100.0);
        foxModel.position.set(0, 0, 0);
        foxModel.rotation.y = Math.PI + (10 * Math.PI / 180); // Face away from the camera, rotated 10 degrees left
        
        foxModel.traverse((child) => {
            if (child.isMesh) {
                child.frustumCulled = false; 
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        
        if (gltf.animations && gltf.animations.length > 0) {
            catMixer = new THREE.AnimationMixer(foxModel);
            // Play the first animation (usually walk or run for fox)
            const action = catMixer.clipAction(gltf.animations[0]);
            action.play();
        }
        
        catGroup.add(foxModel);
    });

    scene.add(catGroup);
}

export function setCatColor(colorHex) {
    if(catGroup) {
        catGroup.traverse((child) => {
            if(child.isMesh && child.material) {
                if(!child.userData.origColor) child.userData.origColor = child.material.color.getHex();
                
                child.material.color.setHex(colorHex === 0xffcc00 ? colorHex : child.userData.origColor);

                if (colorHex === 0xffcc00) {
                    child.material.emissive.setHex(0xaa6600);
                    child.material.emissiveIntensity = 0.5;
                } else {
                    child.material.emissive.setHex(0x000000);
                    child.material.emissiveIntensity = 0;
                }
                child.material.needsUpdate = true;
            }
        });
    }
}

