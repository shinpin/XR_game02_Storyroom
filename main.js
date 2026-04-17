import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { scene, camera, renderer, initCore, composer, setBloomState, triggerResize } from './src/core.js';
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

    // --- FX Menu Toggle ---
    const btnFx = document.getElementById('btn-toggle-fx');
    const fxPanel = document.getElementById('fx-panel');
    if (btnFx && fxPanel) {
        btnFx.addEventListener('click', () => {
            fxPanel.style.display = (fxPanel.style.display === 'none' || fxPanel.classList.contains('hidden-element')) ? 'block' : 'none';
            fxPanel.classList.remove('hidden-element');
        });
    }

    // --- Live FX Toggles ---
    document.getElementById('toggle-bloom')?.addEventListener('change', (e) => {
        if(bloomPass) bloomPass.enabled = e.target.checked;
    });
    document.getElementById('toggle-film')?.addEventListener('change', (e) => {
        if(filmPass) filmPass.enabled = e.target.checked;
    });

    // --- Environment & Lighting Live Sliders ---
    document.getElementById('ctrl-wireframe')?.addEventListener('change', (e) => {
        const isWireframe = e.target.checked;
        scene.traverse((child) => {
            if (child.isMesh && child.geometry && child.name !== 'debug_wireframe') {
                if (isWireframe) {
                    // Check if already has wireframe child
                    let hasWire = child.children.find(c => c.name === 'debug_wireframe');
                    if (!hasWire) {
                        const edges = new THREE.WireframeGeometry(child.geometry);
                        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x00ffcc, depthTest: true, opacity: 0.5, transparent: true }));
                        line.name = 'debug_wireframe';
                        child.add(line);
                    }
                } else {
                    // Remove wireframe child
                    const wires = child.children.filter(c => c.name === 'debug_wireframe');
                    wires.forEach(w => {
                        child.remove(w);
                        w.geometry.dispose();
                        w.material.dispose();
                    });
                }
            }
        });
    });
    
    document.getElementById('ctrl-fog-density')?.addEventListener('input', (e) => {
        if (scene.fog) scene.fog.density = parseFloat(e.target.value);
    });
    document.getElementById('ctrl-fog-color')?.addEventListener('input', (e) => {
        if (scene.fog) scene.fog.color.setHex(parseInt(e.target.value.replace('#', '0x'), 16));
    });
    document.getElementById('ctrl-ambient-int')?.addEventListener('input', (e) => {
        levelGroup.children.forEach(c => {
            if (c.isAmbientLight) c.intensity = parseFloat(e.target.value);
        });
    });
    document.getElementById('ctrl-main-int')?.addEventListener('input', (e) => {
        levelGroup.children.forEach(c => {
            if (c.isDirectionalLight) c.intensity = parseFloat(e.target.value);
        });
    });

    // --- Camera Parameters ---
    document.getElementById('ctrl-cam-fov')?.addEventListener('input', (e) => {
        if (camera && camera.isPerspectiveCamera) {
            camera.fov = parseFloat(e.target.value);
            camera.updateProjectionMatrix();
        }
    });
    document.getElementById('ctrl-cam-height')?.addEventListener('input', (e) => {
        if (!levelState.cameraOffset) levelState.cameraOffset = { distance: -2.5, height: 1.8 };
        levelState.cameraOffset.height = parseFloat(e.target.value);
    });
    document.getElementById('ctrl-cam-dist')?.addEventListener('input', (e) => {
        if (!levelState.cameraOffset) levelState.cameraOffset = { distance: -2.5, height: 1.8 };
        levelState.cameraOffset.distance = parseFloat(e.target.value);
    });

    // --- Hierarchy Visibility Toggles ---
    const updateHierarchyVis = () => {
        const visTerrain = document.getElementById('ctrl-vis-terrain')?.checked ?? true;
        const visObjects = document.getElementById('ctrl-vis-objects')?.checked ?? true;
        const visInteract = document.getElementById('ctrl-vis-interactables')?.checked ?? true;
        const visParticles = document.getElementById('ctrl-vis-particles')?.checked ?? true;
        
        levelGroup.traverse((child) => {
            if ((child.isMesh || child.isPoints) && child.name !== 'debug_wireframe' && child.name !== 'debug_axes' && child.name !== 'debug_axes_box') {
                if (child.isPoints) {
                    child.visible = visParticles;
                } else if (child.userData.isInteractable) {
                    child.visible = visInteract;
                } else if (child.geometry && child.geometry.type === 'PlaneGeometry') {
                    child.visible = visTerrain;
                } else if (!child.material || !child.material.isShaderMaterial) {
                    child.visible = visObjects;
                }
            }
        });
    };
    document.getElementById('ctrl-vis-terrain')?.addEventListener('change', updateHierarchyVis);
    document.getElementById('ctrl-vis-objects')?.addEventListener('change', updateHierarchyVis);
    document.getElementById('ctrl-vis-interactables')?.addEventListener('change', updateHierarchyVis);
    document.getElementById('ctrl-vis-particles')?.addEventListener('change', updateHierarchyVis);

    // --- Coord Panel & Object Axes Toggler ---
    let isAxesVisible = false;
    document.getElementById('coord-panel')?.addEventListener('click', () => {
        isAxesVisible = !isAxesVisible;
        levelGroup.traverse((child) => {
            if (child.isMesh && child.name !== 'debug_wireframe' && (!child.material || !child.material.isShaderMaterial)) {
                if (isAxesVisible) {
                    const hasAxes = child.children.find(c => c.name === 'debug_axes');
                    if (!hasAxes) {
                        const axes = new THREE.AxesHelper( 2 );
                        axes.name = 'debug_axes';
                        child.add(axes);
                        const box = new THREE.BoxHelper( child, 0x00aaff );
                        box.name = 'debug_axes_box';
                        child.add(box);
                    }
                } else {
                    const guides = child.children.filter(c => c.name === 'debug_axes' || c.name === 'debug_axes_box');
                    guides.forEach(g => {
                        child.remove(g);
                        if(g.geometry) g.geometry.dispose();
                        if(g.material) g.material.dispose();
                    });
                }
            }
        });
    });
});
import { initPlayer, controls, catGroup, catTail, constraint, ghostBody, draggedBody, playerBody, catMixer } from './src/player.js';
import { bloomPass, filmPass } from './src/core.js';
import { levelGroup } from './src/state.js';

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
    
    const coordPanel = document.getElementById('coord-panel');
    if (coordPanel) {
        if (isDebugPanelVisible) {
            coordPanel.classList.remove('hidden-element');
        } else {
            coordPanel.classList.add('hidden-element');
        }
    }
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

// Load a default background scene for the menu
// (Note: loadLevel3 is called at the end of the file normally, preserved original flow below)

// --- SCENE EDITOR MODE & HIERARCHY ---
export let isSceneEditor = false;
export let isTimelinePlaying = false; // By default animations pause in Editor Mode
let orbitControls, transformControl;
const raycasterEditor = new THREE.Raycaster();
const mouseEditor = new THREE.Vector2();

function refreshHierarchyPanel() {
    const list = document.getElementById('hierarchy-list');
    if (!list) return;
    list.innerHTML = ''; // clear

    let index = 0;
    levelGroup.children.forEach(child => {
        // Skip purely non-visual debug elements or gigantic background objects
        if (child.name.startsWith('debug_')) return;
        if (child.scale.x > 300) return; // Skip big Skyboxes

        let displayName = child.name || `Object_${index++}`;
        if (!child.name) {
            if (child.isPoints) displayName = '🎈 Particles';
            else if (child.isLight) displayName = `💡 ${child.type}`;
            else if (child.geometry && child.geometry.type === 'PlaneGeometry') displayName = '🟩 Terrain';
            else if (child.userData.isInteractable) displayName = '🖐️ Interactable';
            else displayName = `📦 Mesh (${child.type})`;
        }

        const div = document.createElement('div');
        div.textContent = displayName;
        div.style.cursor = 'pointer';
        div.style.padding = '4px 8px';
        div.style.border = '1px solid transparent';
        div.style.borderRadius = '4px';
        div.style.color = '#ccc';
        div.style.transition = 'all 0.2s';
        
        div.addEventListener('mouseenter', () => div.style.background = 'rgba(255,255,255,0.1)');
        div.addEventListener('mouseleave', () => {
            if(transformControl.object !== child) div.style.background = 'transparent';
        });

        div.addEventListener('click', () => {
            // Attach transform to the clicked element directly
            if(child.isLight || child.isMesh || child.isPoints || child.isGroup) {
                transformControl.attach(child);
                
                // Highlight item
                Array.from(list.children).forEach(el => {
                    el.style.background = 'transparent';
                    el.style.borderColor = 'transparent';
                    el.style.color = '#ccc';
                });
                div.style.background = 'rgba(100, 200, 255, 0.2)';
                div.style.borderColor = '#66ccff';
                div.style.color = '#fff';
            }
        });

        list.appendChild(div);
    });
}

document.getElementById('btn-refresh-hierarchy')?.addEventListener('click', refreshHierarchyPanel);

// Initialize Edit Controls
orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enabled = false;

transformControl = new TransformControls(camera, renderer.domElement);
transformControl.addEventListener('dragging-changed', function (event) {
    orbitControls.enabled = !event.value;
});
scene.add(transformControl);

document.getElementById('btn-scene-editor')?.addEventListener('click', () => {
    isSceneEditor = !isSceneEditor;
    const btn = document.getElementById('btn-scene-editor');
    const hierarchyPanel = document.getElementById('hierarchy-panel');
    const btnPlayPanel = document.getElementById('btn-editor-play');
    const fxPanel = document.getElementById('fx-panel');
    const appContainer = document.getElementById('app');
    
    if (isSceneEditor) {
        controls.unlock();
        orbitControls.enabled = true;
        btn.style.background = 'rgba(200, 0, 200, 1)';
        btn.innerHTML = '<span>[⚒️] EXIT SCENE EDIT (T/R/S)</span>';
        
        // IDE Layout Shift (Shrink viewport & show side panels)
        // Using explicit pixel math to guarantee no CSS calc() issues
        const newW = window.innerWidth - 480;
        const newH = window.innerHeight - 100;
        appContainer.style.width = newW + 'px';
        appContainer.style.left = '240px';
        appContainer.style.top = '100px';
        appContainer.style.height = newH + 'px';
        
        triggerResize();
        
        if (hierarchyPanel) {
            hierarchyPanel.classList.remove('hidden-element');
            refreshHierarchyPanel();
        }
        if (btnPlayPanel) {
            btnPlayPanel.style.display = 'block';
            isTimelinePlaying = false;
            btnPlayPanel.innerHTML = '<span>▶️ 播放場景動畫 (Paused)</span>';
        }
        if (fxPanel) fxPanel.classList.remove('hidden-element');
        
        const coordPanel = document.getElementById('coord-panel');
        if(coordPanel) coordPanel.classList.remove('hidden-element');
    } else {
        orbitControls.enabled = false;
        transformControl.detach();
        btn.style.background = 'rgba(120, 40, 200, 0.8)';
        btn.innerHTML = '<span>[⚒️] SCENE EDITOR</span>';
        
        // Restore standard layout
        appContainer.style.width = '100vw';
        appContainer.style.left = '0px';
        appContainer.style.top = '0px';
        appContainer.style.height = '100vh';
        
        triggerResize();
        
        if (hierarchyPanel) hierarchyPanel.classList.add('hidden-element');
        if (btnPlayPanel) btnPlayPanel.style.display = 'none';
        
        if (document.getElementById('game-ui')?.style.display !== 'none') {
            controls.lock(); // Only lock if game is actually running
        }
    }
});

document.getElementById('btn-editor-play')?.addEventListener('click', (e) => {
    isTimelinePlaying = !isTimelinePlaying;
    if (isTimelinePlaying) {
        e.currentTarget.style.background = 'rgba(50, 200, 50, 0.8)';
        e.currentTarget.innerHTML = '<span>⏸ 暫停場景動畫 (Playing)</span>';
    } else {
        e.currentTarget.style.background = 'rgba(50, 50, 50, 0.8)';
        e.currentTarget.innerHTML = '<span>▶️ 播放場景動畫 (Paused)</span>';
    }
});

// Raycasting for generic scene manipulations
renderer.domElement.addEventListener('pointerdown', (event) => {
    if (!isSceneEditor) return;
    if (transformControl.dragging) return;
    
    // Normalize mouse coords using exact bounding client rect bounds since we dynamically shrink and shift the canvas
    const rect = renderer.domElement.getBoundingClientRect();
    mouseEditor.x = ( (event.clientX - rect.left) / rect.width ) * 2 - 1;
    mouseEditor.y = -( (event.clientY - rect.top) / rect.height ) * 2 + 1;

    raycasterEditor.setFromCamera(mouseEditor, camera);
    // Intersect only levelGroup props
    const intersects = raycasterEditor.intersectObjects(levelGroup.children, true);

    if (intersects.length > 0) {
        let object = intersects[0].object;
        // Ignore visual bounding boxes and lines
        if (object.name.startsWith('debug_')) object = object.parent;
        
        // Traverse up to find the root object placed inside levelGroup (e.g. for complete GLTF models like statues)
        let rootTarget = object;
        while (rootTarget && rootTarget.parent && rootTarget.parent !== levelGroup && rootTarget.parent.type !== 'Scene') {
            rootTarget = rootTarget.parent;
        }

        // Attach transform but bypass gigantic background objects and pure planes if they get in the way too much
        if (rootTarget && rootTarget.scale.x < 300) {
            transformControl.attach(rootTarget);
        } else {
            transformControl.detach();
        }
    } else {
        transformControl.detach();
    }
});

window.addEventListener('keydown', (e) => {
    if (!isSceneEditor) return;
    switch(e.key.toLowerCase()) {
        case 't': transformControl.setMode('translate'); break;
        case 'r': transformControl.setMode('rotate'); break;
        case 's': transformControl.setMode('scale'); break;
    }
});

const btnReturnMenu = document.getElementById('btn-return-menu');

document.addEventListener('unlockControlsForDialog', () => {
    controls.unlock();
});
document.addEventListener('lockControlsForPlay', () => {
    controls.lock();
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
function returnToMenu() {
    controls.unlock();
    if (isAutoMode) stopAutoNarrative();
    gameUI.style.display = 'none';
    menuOverlay.style.display = 'flex';
    if(btnReturnMenu) btnReturnMenu.classList.add('hidden-element');
    if(vrButton) vrButton.style.opacity = '1';
    if(vrButton) vrButton.style.pointerEvents = 'auto';
}

if(btnReturnMenu) {
    btnReturnMenu.addEventListener('click', () => {
        returnToMenu();
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
    returnToMenu();
});


// Render Loop
const clock = new THREE.Clock();
const moveSpeed = 4.5;
const telekDistance = 5;

renderer.setAnimationLoop(() => {
    const rawDt = clock.getDelta();
    const dt = Math.min(rawDt, 0.1);
    
    // Pause physics/animations if editor is open and playback is not toggled
    const isPlaybackZero = isSceneEditor && !isTimelinePlaying;
    const playDt = isPlaybackZero ? 0 : dt;
    
    if (catMixer) {
        catMixer.update(playDt);
    }
    
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

        // Live Coordinate Panel Updates
        const coordPanel = document.getElementById('coord-panel');
        if (coordPanel && !coordPanel.classList.contains('hidden-element')) {
            const cx = document.getElementById('coord-x');
            const cy = document.getElementById('coord-y');
            const cz = document.getElementById('coord-z');
            if (cx && cy && cz) {
                cx.textContent = camera.position.x.toFixed(2);
                cy.textContent = camera.position.y.toFixed(2);
                cz.textContent = camera.position.z.toFixed(2);
            }
        }
    }

    if (isAutoMode) {
        updateNarrative(dt);
        updateTimeline(clock.elapsedTime % 60, 60); // Fake a 60s loop for AutoMode
        
        // Auto cat animation
        const yaw = camera.rotation.y;
        const floorY = (levelState.playerBaseY || 0.5) - 0.5; 
        let fOff = cameraMode === 2 ? -3.5 : -2.5; // push model further in front
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
                let fOff = cameraMode === 2 ? -3.5 : -2.5; // push model further in front for cinematic
                catGroup.visible = (cameraMode !== 3);
                const forwardOffset = new THREE.Vector3(0, 0, fOff).applyAxisAngle(new THREE.Vector3(0,1,0), yaw);
                catGroup.position.set(camera.position.x + forwardOffset.x, floorY, camera.position.z + forwardOffset.z);
                catGroup.rotation.y = yaw;
            }
        } else {
            setIntroCinematic(false);
            hideDialog();
            
            if (levelState.onIntroComplete) {
                levelState.onIntroComplete();
                levelState.onIntroComplete = null; // Execute only once
            } else {
                controls.lock();
            }
        }
    } else {
        if (!controls.isLocked && menuOverlay.style.display !== 'none') {
             camera.rotation.y += dt * 0.1; 
        }

        if (controls.isLocked || isSceneEditor || (isNoclip && document.getElementById('editor-ui').style.display === 'block')) {
            if (!isSceneEditor) {
                // Conventional locked FPS / Noclip movement
                if (keys.w) controls.moveForward(moveSpeed * dt);
                if (keys.s) controls.moveForward(-moveSpeed * dt);
                if (keys.a) controls.moveRight(-moveSpeed * dt);
                if (keys.d) controls.moveRight(moveSpeed * dt);
            }
            
            if (isNoclip) {
                if (keys.q) camera.position.y += moveSpeed * dt;
                if (keys.e) camera.position.y -= moveSpeed * dt;
                playerBody.position.copy(camera.position);
                playerBody.velocity.set(0, 0, 0);
            } else if (!isSceneEditor) {
                playerBody.position.set(camera.position.x, levelState.playerBaseY || 0.5, camera.position.z);
            }
            
            const bob = (isNoclip || isSceneEditor) ? 0 : Math.sin(clock.elapsedTime * 8) * 0.04;
            const baseBob = (!isSceneEditor && (keys.w||keys.s||keys.a||keys.d)) ? bob : 0;
            
            if(!constraint && !isSceneEditor) {
                const yaw = camera.rotation.y;
                const floorY = (isNoclip) ? camera.position.y - 0.5 : (levelState.playerBaseY || 0.5) - 0.5; 
                
                if (!isNoclip) {
                    let yOffset = levelState.cameraOffset ? levelState.cameraOffset.height : 1.8; // Use config height
                    if (cameraMode === 2) yOffset = 3.5; // Lowered Wide angle height
                    if (cameraMode === 3) yOffset = 0.5; // Fox eye level
                    
                    const targetCamY = (levelState.playerBaseY || 0.5) + yOffset;
                    camera.position.y += (targetCamY - camera.position.y) * 4 * dt;
                }

                let defaultDist = levelState.cameraOffset ? levelState.cameraOffset.distance : -2.5;
                let fOff = cameraMode === 2 ? -3.5 : (cameraMode === 1 ? defaultDist : 0);
                let xOff = cameraMode === 1 ? -0.8 : 0; // Negative X = avatar to left, camera over right shoulder
                
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
    
    if (!isPlaybackZero) {
        world.step(1/60, dt, 3);
        
        for (const obj of levelState.rigidBodies) {
            obj.mesh.position.copy(obj.body.position);
            obj.mesh.quaternion.copy(obj.body.quaternion);
        }
    } else {
        // Sync backwards so if dragged in Edit mode, physics body moves too
        for (const obj of levelState.rigidBodies) {
            obj.body.position.copy(obj.mesh.position);
            obj.body.quaternion.copy(obj.mesh.quaternion);
        }
    }
    
    for (const updateFn of levelState.updatables) {
        updateFn(playDt);
    }
    
    if (renderer.xr.isPresenting) {
        renderer.info.reset();
        renderer.render(scene, camera);
    } else {
        renderer.info.reset();
        composer.render();
    }
});

// Load a default background scene for the menu
loadLevel3(); 
