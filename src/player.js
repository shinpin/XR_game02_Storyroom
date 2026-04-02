import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
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
    const catMat = new THREE.MeshStandardMaterial({ color: 0x4a2a18, roughness: 0.8 }); // Dark Brown

    const bodyGeo = new THREE.CapsuleGeometry(0.15, 0.4, 4, 16);
    const catBody = new THREE.Mesh(bodyGeo, catMat);
    catBody.rotation.x = Math.PI / 2; 
    catBody.position.y = 0.15;
    catGroup.add(catBody);

    const headGeo = new THREE.SphereGeometry(0.18, 16, 16);
    const head = new THREE.Mesh(headGeo, catMat);
    head.position.set(0, 0.35, -0.28);
    catGroup.add(head);

    const earGeo = new THREE.ConeGeometry(0.05, 0.15, 8);
    const earL = new THREE.Mesh(earGeo, catMat);
    earL.position.set(-0.08, 0.45, -0.32);
    catGroup.add(earL);
    const earR = new THREE.Mesh(earGeo, catMat);
    earR.position.set(0.08, 0.45, -0.32);
    catGroup.add(earR);

    const tailGeo = new THREE.CylinderGeometry(0.02, 0.04, 0.4, 8);
    catTail = new THREE.Mesh(tailGeo, catMat);
    catTail.position.set(0, 0.25, 0.35);
    catTail.rotation.x = -Math.PI / 4;
    catGroup.add(catTail);

    scene.add(catGroup);
}

export function setCatColor(colorHex) {
    if(catGroup) {
        catGroup.traverse((child) => {
            if(child.isMesh && child.material) {
                child.material.color.setHex(colorHex);
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

