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
import { isAutoMode, updateNarrative, initNarrative, startAutoNarrative, stopAutoNarrative, sequences } from './src/narrative.js';
import { isIntroCinematic, setIntroCinematic, showDialog, hideDialog } from './src/state.js';
import { isNoclip, initEditor } from './src/editor.js';

const levelLoaders = [null, loadLevel1, loadLevel2, loadLevel3, loadLevel4, loadLevel5];



// Initialize Game Engine
initCore();
initAudio();
initPhysics();
initPlayer();
initEditor();


// Add VR Button 
document.body.appendChild(VRButton.createButton(renderer));

// Auto Narrative Setup
initNarrative((levelIdx) => {
    if(levelLoaders[levelIdx]) levelLoaders[levelIdx]();
});


// UI Setup
const gameUI = document.getElementById('game-ui');
const menuOverlay = document.getElementById('menu-overlay');

let introStartTime = 0;
let introStartRotY = 0;
let introDuration = 8;

function startLevelIntro(idx) {
    if (isAutoMode) return;
    setIntroCinematic(true);
    // ensure clock is running 
    if(!clock.running) clock.start();
    introStartTime = clock.elapsedTime;
    introStartRotY = camera.rotation.y;
    controls.unlock();
    
    // subtitle box cinematic display
    const seq = sequences[idx - 1];
    if (seq) {
        // Calculate duration based on 180ms per character + 3 seconds reading time
        const textToType = seq.text + "\n\n(按空白鍵跳過演出)";
        introDuration = (textToType.length * 0.18) + 3;
        showDialog(textToType, introDuration * 1000);
    } else {
        introDuration = 8;
    }
}

document.addEventListener('keydown', (e) => {
    if (isIntroCinematic && (e.code === 'Space' || e.key === 'Escape')) {
        setIntroCinematic(false);
        hideDialog();
        controls.lock();
    }
});

document.addEventListener('unlockControlsForDialog', () => {
    controls.unlock();
});

document.getElementById('start-btn').addEventListener('click', () => {
    menuOverlay.style.display = 'none';
    gameUI.style.display = 'block';
    
    const selectedLvl = parseInt(document.getElementById('level-select').value);
    if(levelLoaders[selectedLvl]) {
        levelLoaders[selectedLvl]();
        startLevelIntro(selectedLvl);
    } else {
        controls.lock();
    }
});

document.getElementById('auto-btn').addEventListener('click', () => {
    menuOverlay.style.display = 'none';
    gameUI.style.display = 'block';
    startAutoNarrative();
});

// Map Interactions Setup
for (let i = 1; i <= 5; i++) {
    const mapZone = document.getElementById(`nav-val-${i}`);
    if (mapZone) {
        mapZone.addEventListener('click', () => {
            if (levelLoaders[i]) {
                levelLoaders[i]();
                const selectBox = document.getElementById('level-select');
                if (selectBox) selectBox.value = i;
                startLevelIntro(i);
            }
        });
    }
}

controls.addEventListener('unlock', () => {
    if (isAutoMode) stopAutoNarrative();
    gameUI.style.display = 'none';
    menuOverlay.style.display = 'flex';
});


// Render Loop
const clock = new THREE.Clock();
const moveSpeed = 4.5;
const telekDistance = 5;

renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.1);
    
    if (isAutoMode) {
        updateNarrative(dt);
        
        // Auto cat animation
        const yaw = camera.rotation.y;
        const floorY = (levelState.playerBaseY || 0.5) - 0.5; 
        const forwardOffset = new THREE.Vector3(0, 0, -1.8).applyAxisAngle(new THREE.Vector3(0,1,0), yaw);
        
        const targetPos = new THREE.Vector3(camera.position.x + forwardOffset.x, floorY, camera.position.z + forwardOffset.z);
        // Smoothly lerp the cat to look like it's walking forward instead of rigidly snapping
        catGroup.position.lerp(targetPos, dt * 5); 
        
        // Smooth rotation
        const targetRot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), yaw);
        catGroup.quaternion.slerp(targetRot, dt * 5);

        // Add a gentle stepping bob and tail wag
        catGroup.position.y += Math.sin(clock.elapsedTime * 10) * 0.04;
        catTail.rotation.z = Math.sin(clock.elapsedTime * 8) * 0.25;
    } else if (isIntroCinematic) {
        const elapsed = clock.elapsedTime - introStartTime;
        if (elapsed < introDuration) {
            camera.rotation.y = introStartRotY + (elapsed * 0.15); // Slower pan
            playerBody.position.set(camera.position.x, levelState.playerBaseY || 0.5, camera.position.z);
            const yaw = camera.rotation.y;
            const floorY = (levelState.playerBaseY || 0.5) - 0.5;
            const forwardOffset = new THREE.Vector3(0, 0, -1.8).applyAxisAngle(new THREE.Vector3(0,1,0), yaw);
            catGroup.position.set(camera.position.x + forwardOffset.x, floorY, camera.position.z + forwardOffset.z);
            catGroup.rotation.y = yaw;
        } else {
            setIntroCinematic(false);
            hideDialog();
            controls.lock();
        }
    } else {
        if (!controls.isLocked && menuOverlay.style.display !== 'none') {
             camera.rotation.y += dt * 0.1; 
        }

        if (controls.isLocked || (isNoclip && document.getElementById('editor-ui').style.display === 'block')) {
            if (keys.w) controls.moveForward(moveSpeed * dt);
            if (keys.s) controls.moveForward(-moveSpeed * dt);
            if (keys.a) controls.moveRight(-moveSpeed * dt);
            if (keys.d) controls.moveRight(moveSpeed * dt);
            
            if (isNoclip) {
                if (keys.q) camera.position.y += moveSpeed * dt;
                if (keys.e) camera.position.y -= moveSpeed * dt;
                // Pin playerBody to camera so it doesn't fall away
                playerBody.position.copy(camera.position);
                playerBody.velocity.set(0, 0, 0);
            } else {
                playerBody.position.set(camera.position.x, levelState.playerBaseY || 0.5, camera.position.z);
            }
            
            const bob = (isNoclip) ? 0 : Math.sin(clock.elapsedTime * 8) * 0.04;
            const baseBob = (keys.w||keys.s||keys.a||keys.d) ? bob : 0;
            
            if(!constraint) {
                const yaw = camera.rotation.y;
                const floorY = (isNoclip) ? camera.position.y - 0.5 : (levelState.playerBaseY || 0.5) - 0.5; 
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
