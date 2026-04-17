import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { scene, camera, renderer, initCore, composer, setBloomState } from './src/core.js';
import { world, initPhysics } from './src/physics.js';
import { initAudio, toggleMute } from './src/audio.js';
import { levelState, keys } from './src/state.js';

window.addEventListener('DOMContentLoaded', () => {
    const btnToggleAudio = document.getElementById('btn-toggle-audio');
    if (btnToggleAudio) {
        btnToggleAudio.addEventListener('click', toggleMute);
    }
    
    const bloomToggle = document.getElementById('bloom-toggle');
    if (bloomToggle) {
        bloomToggle.addEventListener('change', (e) => {
            setBloomState(e.target.value === 'on');
        });
    }
});
import { initPlayer, controls, catGroup, catTail, constraint, ghostBody, draggedBody, playerBody } from './src/player.js';

import { loadLevel1 } from './src/levels/level1.js';
import { loadLevel2 } from './src/levels/level2.js';
import { loadLevel3 } from './src/levels/level3.js';
import { loadLevel4 } from './src/levels/level4.js';
import { loadLevel5 } from './src/levels/level5.js';
import { isAutoMode, updateNarrative, initNarrative, startAutoNarrative, stopAutoNarrative, sequences } from './src/narrative.js';
import { isIntroCinematic, setIntroCinematic, showDialog, hideDialog, showBigTitle } from './src/state.js';
import { isNoclip, initEditor, updateTimeline } from './src/editor.js';

const levelLoaders = [null, loadLevel1, loadLevel2, loadLevel3, loadLevel4, loadLevel5];

// Async Asset Loading Fader Manager
let loadTimeout = null;
THREE.DefaultLoadingManager.onStart = function ( url, itemsLoaded, itemsTotal ) {
    const fader = document.getElementById('screen-fader');
    if (fader) fader.style.opacity = '1'; // Fade to black
    if(loadTimeout) clearTimeout(loadTimeout);
};
THREE.DefaultLoadingManager.onLoad = function ( ) {
    const fader = document.getElementById('screen-fader');
    // Buffer for 800ms before fading in, giving GPU time to upload textures without stuttering
    loadTimeout = setTimeout(() => {
        if (fader) fader.style.opacity = '0'; // Fade out to reveal game
    }, 800); 
};

// Initialize Game Engine
initCore();
initAudio();
initPhysics();
initPlayer();
initEditor();


// Add VR Button 
const vrButton = VRButton.createButton(renderer);
vrButton.style.transition = 'opacity 0.5s';
document.body.appendChild(vrButton);

// Auto Narrative Setup
initNarrative((levelIdx) => {
    if(levelLoaders[levelIdx]) levelLoaders[levelIdx]();
});


// UI Setup
const gameUI = document.getElementById('game-ui');
const menuOverlay = document.getElementById('menu-overlay');

// Debug Mode Setup
let isDebugPanelVisible = false;
const debugPanel = document.getElementById('xr-debug-panel');
const dbgFps = document.getElementById('dbg-fps');
const dbgDrawcalls = document.getElementById('dbg-drawcalls');
const dbgTriangles = document.getElementById('dbg-triangles');
const dbgGeom = document.getElementById('dbg-geom');
const dbgTextures = document.getElementById('dbg-textures');
const dbgState = document.getElementById('dbg-state');
const dbgMemory = document.getElementById('dbg-memory');
let frames = 0;
let prevTime = performance.now();

function toggleDebugPanel() {
    !!isDebugPanelVisible ? (isDebugPanelVisible = false) : (isDebugPanelVisible = true);
    if(debugPanel) debugPanel.style.display = isDebugPanelVisible ? 'block' : 'none';
}

// Camera Modes
export let cameraMode = 1;
const btnCam1 = document.getElementById('cam-mode-1');
const btnCam2 = document.getElementById('cam-mode-2');
const btnCam3 = document.getElementById('cam-mode-3');
function setCameraMode(mode) {
    cameraMode = mode;
    if(btnCam1) btnCam1.classList.toggle('active', mode === 1);
    if(btnCam2) btnCam2.classList.toggle('active', mode === 2);
    if(btnCam3) btnCam3.classList.toggle('active', mode === 3);

    if (camera && camera.isPerspectiveCamera) {
        if (mode === 3) {
            camera.fov = 130; // Fisheye first-person
        } else if (mode === 2) {
            camera.fov = 95; // Wide angle
        } else {
            camera.fov = 75; // Normal
        }
        camera.updateProjectionMatrix();
    }
}
if (btnCam1) btnCam1.addEventListener('click', () => setCameraMode(1));
if (btnCam2) btnCam2.addEventListener('click', () => setCameraMode(2));
if (btnCam3) btnCam3.addEventListener('click', () => setCameraMode(3));

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
        const parts = seq.text.split('\n');
        const bigTitle = parts[0];
        const rawSub = parts.slice(1).join(' ').replace(/\n/g, ' ');
        
        let chunks = rawSub.split('。').map(s=>s.trim()).filter(s=>s.length>0).map(s=>s+'。');
        chunks.push("(按空白鍵跳過演出)");
        
        introDuration = (rawSub.length * 0.08) + (chunks.length * 2.0) + 4; 
        
        showBigTitle(bigTitle, () => {
            if (isIntroCinematic) showDialog(chunks, (introDuration - 4) * 1000);
        });
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
    if (e.key === '1') setCameraMode(1);
    if (e.key === '2') setCameraMode(2);
    if (e.key === '3') setCameraMode(3);
    
    // Toggle Debug Panel (F3 or backtick ~)
    if (e.key === 'F3' || e.key === '`') {
        e.preventDefault();
        toggleDebugPanel();
    }
});

const btnReturnMenu = document.getElementById('btn-return-menu');

document.addEventListener('unlockControlsForDialog', () => {
    controls.unlock();
});

document.getElementById('start-btn').addEventListener('click', () => {
    menuOverlay.style.display = 'none';
    gameUI.style.display = 'block';
    if(btnReturnMenu) btnReturnMenu.classList.remove('hidden-element');
    if(vrButton) vrButton.style.opacity = '0';
    if(vrButton) vrButton.style.pointerEvents = 'none';
    
    const selectedLvl = parseInt(document.getElementById('level-select').value);
    if(levelLoaders[selectedLvl]) {
        levelLoaders[selectedLvl]();
        startLevelIntro(selectedLvl);
    } else {
        controls.lock();
    }
});

// Help UI & Top UI bindings
const helpModal = document.getElementById('help-modal');
document.getElementById('btn-show-help').addEventListener('click', () => {
    helpModal.classList.remove('hidden-element');
});
document.getElementById('btn-close-help').addEventListener('click', () => {
    helpModal.classList.add('hidden-element');
});
document.getElementById('btn-toggle-debug-ui').addEventListener('click', () => {
    toggleDebugPanel();
});
if(btnReturnMenu) {
    btnReturnMenu.addEventListener('click', () => {
        // Unlock controls which triggers menu return logic
        controls.unlock();
    });
}

document.getElementById('auto-btn').addEventListener('click', () => {
    menuOverlay.style.display = 'none';
    gameUI.style.display = 'block';
    if(btnReturnMenu) btnReturnMenu.classList.remove('hidden-element');
    if(vrButton) vrButton.style.opacity = '0';
    if(vrButton) vrButton.style.pointerEvents = 'none';
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
    if(btnReturnMenu) btnReturnMenu.classList.add('hidden-element');
    if(vrButton) vrButton.style.opacity = '1';
    if(vrButton) vrButton.style.pointerEvents = 'auto';
});


// Render Loop
const clock = new THREE.Clock();
const moveSpeed = 4.5;
const telekDistance = 5;

renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.1);
    
    // Debug Panel Updates
    if (isDebugPanelVisible) {
        frames++;
        const time = performance.now();
        if (time >= prevTime + 1000) {
            if(dbgFps) dbgFps.textContent = Math.round((frames * 1000) / (time - prevTime));
            prevTime = time;
            frames = 0;
            
            // Update performance info
            if(dbgDrawcalls) dbgDrawcalls.textContent = renderer.info.render.calls;
            if(dbgTriangles) dbgTriangles.textContent = renderer.info.render.triangles;
            if(dbgGeom) dbgGeom.textContent = renderer.info.memory.geometries;
            if(dbgTextures) dbgTextures.textContent = renderer.info.memory.textures;
            
            if(dbgMemory && performance.memory) {
                dbgMemory.textContent = (performance.memory.usedJSHeapSize / 1048576).toFixed(1) + " MB";
            }
            
            // State
            let currentStateInfo = "Menu";
            if (isAutoMode) currentStateInfo = "Auto Narrative";
            else if (isIntroCinematic) currentStateInfo = "Cinematic";
            else if (controls.isLocked) currentStateInfo = "Playing (FPS)";
            else if (isNoclip) currentStateInfo = "Editor/Noclip";
            if(dbgState) dbgState.textContent = currentStateInfo;
        }
    }

    if (isAutoMode) {
        updateNarrative(dt);
        updateTimeline(clock.elapsedTime % 60, 60); // Fake a 60s loop for AutoMode
        
        // Auto cat animation
        const yaw = camera.rotation.y;
        const floorY = (levelState.playerBaseY || 0.5) - 0.5; 
        let fOff = cameraMode === 2 ? -4.5 : -2.5; // push model further in front
        catGroup.visible = (cameraMode !== 3);
        const forwardOffset = new THREE.Vector3(0, 0, fOff).applyAxisAngle(new THREE.Vector3(0,1,0), yaw);
        
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
        updateTimeline(elapsed, introDuration); // Trigger timeline UI updates
        
        if (elapsed < introDuration) {
            if (levelState.customIntro) {
                levelState.customIntro(elapsed, introDuration, dt);
            } else {
                camera.rotation.y = introStartRotY + (elapsed * 0.15); // Slower pan
                playerBody.position.set(camera.position.x, levelState.playerBaseY || 0.5, camera.position.z);
                const yaw = camera.rotation.y;
                const floorY = (levelState.playerBaseY || 0.5) - 0.5;
                let fOff = cameraMode === 2 ? -5.0 : -3.0; // push model further in front for cinematic
                catGroup.visible = (cameraMode !== 3);
                const forwardOffset = new THREE.Vector3(0, 0, fOff).applyAxisAngle(new THREE.Vector3(0,1,0), yaw);
                catGroup.position.set(camera.position.x + forwardOffset.x, floorY, camera.position.z + forwardOffset.z);
                catGroup.rotation.y = yaw;
            }
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
                
                if (!isNoclip) {
                    let yOffset = 1.8; // Lowered OTS height to see fox better
                    if (cameraMode === 2) yOffset = 3.5; // Lowered Wide angle height
                    if (cameraMode === 3) yOffset = 0.5; // Fox eye level
                    
                    const targetCamY = (levelState.playerBaseY || 0.5) + yOffset;
                    camera.position.y += (targetCamY - camera.position.y) * 4 * dt;
                }

                let fOff = cameraMode === 2 ? -5.0 : (cameraMode === 1 ? -3.0 : 0);
                let xOff = cameraMode === 1 ? -1.2 : 0; // Negative X = avatar to left, camera over right shoulder
                
                catGroup.visible = (cameraMode !== 3);
                
                const localOffset = new THREE.Vector3(xOff, 0, fOff);
                localOffset.applyAxisAngle(new THREE.Vector3(0,1,0), yaw);
                
                const targetPos = new THREE.Vector3(
                    camera.position.x + localOffset.x,
                    floorY + baseBob,
                    camera.position.z + localOffset.z
                );
                
                // FREE HAND (Elastic trailing) - smooth lerp instead of rigid set
                catGroup.position.lerp(targetPos, 8 * dt);
                
                const targetRot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), yaw);
                catGroup.quaternion.slerp(targetRot, 8 * dt);
                
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
    
    if (renderer.xr.isPresenting) {
        renderer.render(scene, camera);
    } else {
        composer.render();
    }
});

// Load a default background scene for the menu
loadLevel3(); 
