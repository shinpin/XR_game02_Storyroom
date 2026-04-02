import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { scene, camera, renderer, initCore } from './src/core.js';
import { world, initPhysics } from './src/physics.js';
import { initAudio } from './src/audio.js';
import { levelState, keys } from './src/state.js';
import { initPlayer, controls, catGroup, catTail, constraint, ghostBody, draggedBody, playerBody } from './src/player.js';

import { loadLevel1 } from './src/levels/level1.js';
import { loadLevel2 } from './src/levels/level2.js';
import { loadLevel3 } from './src/levels/level3.js';
import { loadLevel4 } from './src/levels/level4.js';
import { loadLevel5 } from './src/levels/level5.js';

const levelLoaders = [null, loadLevel1, loadLevel2, loadLevel3, loadLevel4, loadLevel5];

// Initialize Game Engine
initCore();
initAudio();
initPhysics();
initPlayer();

// Add VR Button 
document.body.appendChild(VRButton.createButton(renderer));

// UI Setup
const gameUI = document.getElementById('game-ui');
const menuOverlay = document.getElementById('menu-overlay');

document.getElementById('start-btn').addEventListener('click', () => {
    menuOverlay.style.display = 'none';
    gameUI.style.display = 'block';
    
    // Load level dynamically based on UI selection
    const selectedLvl = parseInt(document.getElementById('level-select').value);
    if(levelLoaders[selectedLvl]) {
        levelLoaders[selectedLvl]();
    }
    
    controls.lock();
});

controls.addEventListener('unlock', () => {
    gameUI.style.display = 'none';
    menuOverlay.style.display = 'flex';
});

// Render Loop
const clock = new THREE.Clock();
const moveSpeed = 6;
const telekDistance = 5;

renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.1);
    
    if (!controls.isLocked && menuOverlay.style.display !== 'none') {
         camera.rotation.y += dt * 0.1; 
    }

    if (controls.isLocked) {
        if (keys.w) controls.moveForward(moveSpeed * dt);
        if (keys.s) controls.moveForward(-moveSpeed * dt);
        if (keys.a) controls.moveRight(-moveSpeed * dt);
        if (keys.d) controls.moveRight(moveSpeed * dt);
        
        playerBody.position.set(camera.position.x, levelState.playerBaseY || 0.5, camera.position.z);
        
        const bob = Math.sin(clock.elapsedTime * 8) * 0.04;
        const baseBob = (keys.w||keys.s||keys.a||keys.d) ? bob : 0;
        
        if(!constraint) {
            const yaw = camera.rotation.y;
            const floorY = (levelState.playerBaseY || 0.5) - 0.5; 
            const forwardOffset = new THREE.Vector3(0, 0, -1.8).applyAxisAngle(new THREE.Vector3(0,1,0), yaw);
            
            catGroup.position.set(camera.position.x + forwardOffset.x, floorY + baseBob, camera.position.z + forwardOffset.z);
            catGroup.rotation.y = yaw;
            
            if (keys.w||keys.s||keys.a||keys.d) {
                 catTail.rotation.z = Math.sin(clock.elapsedTime * 15) * 0.2;
            } else {
                 catTail.rotation.z = Math.sin(clock.elapsedTime * 2) * 0.1;
            }
        }

        if (levelState.doorTriggerBody) {
            const dx = camera.position.x - levelState.doorTriggerBody.position.x;
            const dz = camera.position.z - levelState.doorTriggerBody.position.z;
            const dist = Math.sqrt(dx*dx + dz*dz);
            if (dist < 2.0) { 
                if(levelLoaders[levelState.nextLevelParams]) {
                   levelLoaders[levelState.nextLevelParams](); 
                }
            }
        }
    }
    
    if (constraint) {
        const targetPos = new THREE.Vector3();
        camera.getWorldDirection(targetPos);
        targetPos.multiplyScalar(telekDistance).add(camera.position);
        
        const curPos = new THREE.Vector3().copy(ghostBody.position);
        curPos.lerp(targetPos, 0.4);
        ghostBody.position.copy(curPos);
        
        draggedBody.angularVelocity.scale(0.9, draggedBody.angularVelocity);
        draggedBody.velocity.scale(0.9, draggedBody.velocity);
    }
    
    world.step(1/60, dt, 3);
    
    for (const obj of levelState.rigidBodies) {
        obj.mesh.position.copy(obj.body.position);
        obj.mesh.quaternion.copy(obj.body.quaternion);
    }
    
    for (const updateFn of levelState.updatables) {
        updateFn(dt);
    }
    
    renderer.render(scene, camera);
});

// Load a default background scene for the menu
loadLevel3(); 
