import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { scene, camera, renderer, initCore, composer, setBloomState, triggerResize } from './src/core.js';
import { world, initPhysics } from './src/physics.js';
import { initAudio, toggleMute } from './src/audio.js';
import { levelState, keys } from './src/state.js';
import { initUIManager, UI_MODES, getCurrentMode, setUIMode } from './src/uiManager.js';
import { saveSceneState, restoreFXState } from './src/serializer.js';

// --- Global Error Handler (Dev Mode) ---
window.addEventListener('error', (event) => {
    const overlay = document.getElementById('dev-error-overlay');
    const content = document.getElementById('dev-error-content');
    if (overlay && content) {
        overlay.style.display = 'block';
        content.textContent += `[Error] ${event.message}\n  at ${event.filename}:${event.lineno}\n`;
    }
});
window.addEventListener('unhandledrejection', (event) => {
    // Check if it's an IDE iframe PointerLock error or WebXR Dev warning and ignore it to prevent UI spam
    const reasonStr = (event.reason && event.reason.message) ? event.reason.message.toLowerCase() : '';
    const nameStr = (event.reason && event.reason.name) ? event.reason.name : '';
    if (reasonStr.includes('pointer lock') || reasonStr.includes('xrwebglbinding') || nameStr.includes('TypeError')) {
        console.warn('Dev Warning ignored:', event.reason);
        return;
    }
    
    const overlay = document.getElementById('dev-error-overlay');
    const content = document.getElementById('dev-error-content');
    if (overlay && content) {
        overlay.style.display = 'block';
        content.textContent += `[Promise Rejection] ${event.reason}\n`;
    }
});

window.addEventListener('DOMContentLoaded', () => {
    initUIManager(); // Initialize UI State Machine hotkeys
    
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
    document.getElementById('toggle-bloom')?.addEventListener('change', (e) => {
        setBloomState(e.target.checked);
    });
    document.getElementById('toggle-film')?.addEventListener('change', (e) => {
        setFilmState(e.target.checked);
    });
    
    document.getElementById('ctrl-sky-exp')?.addEventListener('input', (e) => {
        renderer.toneMappingExposure = parseFloat(e.target.value);
    });
    document.getElementById('ctrl-ambient-color')?.addEventListener('input', (e) => {
        levelGroup.children.forEach(c => {
            if (c.isAmbientLight) c.color.setHex(parseInt(e.target.value.replace('#', '0x'), 16));
        });
    });
    document.getElementById('ctrl-vignette')?.addEventListener('input', (e) => {
        if(vignettePass) vignettePass.uniforms['darkness'].value = parseFloat(e.target.value);
    });
    document.getElementById('ctrl-filter')?.addEventListener('change', (e) => {
        if(!colorCorrectionPass) return;
        const mode = e.target.value;
        if(mode === 'none') {
            colorCorrectionPass.enabled = false;
        } else {
            colorCorrectionPass.enabled = true;
            if(mode === 'warm') {
                 colorCorrectionPass.uniforms['mulRGB'].value.set(1.1, 1.05, 0.9);
                 colorCorrectionPass.uniforms['addRGB'].value.set(0.05, 0.02, 0.0);
            } else if (mode === 'cool') {
                 colorCorrectionPass.uniforms['mulRGB'].value.set(0.9, 1.05, 1.1);
                 colorCorrectionPass.uniforms['addRGB'].value.set(0.0, 0.02, 0.05);
            } else if (mode === 'bw') {
                 colorCorrectionPass.uniforms['powRGB'].value.set(1.0, 1.0, 1.0);
                 colorCorrectionPass.uniforms['mulRGB'].value.set(1.2, 1.2, 1.2); 
                 colorCorrectionPass.uniforms['addRGB'].value.set(0.0, 0.0, 0.0);
            } else if (mode === 'sepia') {
                 colorCorrectionPass.uniforms['mulRGB'].value.set(1.1, 1.0, 0.85);
                 colorCorrectionPass.uniforms['addRGB'].value.set(0.1, 0.05, 0.0);
            }
        }
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
import { setFilmState, bloomPass, filmPass, colorCorrectionPass, vignettePass } from './src/core.js';
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
let pendingLevelContext = null;

THREE.DefaultLoadingManager.onStart = function ( url, itemsLoaded, itemsTotal ) {
    const fader = document.getElementById('screen-fader');
    if (fader) fader.style.opacity = '1'; // Fade to black
    if(loadTimeout) clearTimeout(loadTimeout);
};
THREE.DefaultLoadingManager.onLoad = function ( ) {
    const fader = document.getElementById('screen-fader');
    // Buffer for 800ms to allow textures to upload to GPU
    loadTimeout = setTimeout(() => {
        if (pendingLevelContext) {
            import('./src/state.js').then(({ showBigTitle }) => {
                showBigTitle(pendingLevelContext.titleContent, () => {
                    if (fader) fader.style.opacity = '0'; // Fade out black screen (dissolve to scene)
                    
                    // Start camera pan simultaneously with the dissolve
                    import('./src/state.js').then(({ setIntroCinematic, showDialog }) => {
                        setIntroCinematic(true);
                        if(!clock.running) clock.start();
                        introStartTime = clock.elapsedTime;
                        introStartRotY = camera.rotation.y;
                        
                        // Play subtitles while camera pans
                        if (pendingLevelContext && pendingLevelContext.chunks) {
                            // double check context to appease strict mode bindings
                            showDialog(pendingLevelContext.chunks, (pendingLevelContext.duration - 4) * 1000);
                        }
                        
                        pendingLevelContext = null;
                    });
                });
            });
        } else {
            if (fader) fader.style.opacity = '0'; 
        }
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
    levelState.currentLevel = levelIdx;
    if(levelLoaders[levelIdx]) {
        levelLoaders[levelIdx]();
        setTimeout(restoreFXState, 50); // Delay slightly to ensure UI is ready
    }
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
    
    // We unlock controls immediately so player can't move during load/intro
    controls.unlock();
    
    const seq = sequences[idx - 1];
    let titleContent = "載入中...";
    if (seq) {
        const parts = seq.text.split('\n');
        const bigTitle = parts[0].replace(/[:：]/g, ' '); 
        const rawSub = parts.slice(1).join(' ').replace(/\n/g, ' ');
        
        let chunks = rawSub.split('。').map(s=>s.trim()).filter(s=>s.length>0).map(s=>s+'。');
        chunks.push("(按空白鍵跳過演出)");
        
        // Restore original camera panning duration based on dialogue length
        introDuration = (rawSub.length * 0.08) + (chunks.length * 2.0) + 4; 
        
        // Use normal CSS size for bigTitle, and just hardcode the objective text as requested. Centered and smaller.
        titleContent = `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center;">
                            <div>${bigTitle}</div>
                            <div style="font-size:0.36em; color:#ddd; margin-top:20px; font-weight:normal; letter-spacing:6px; opacity:0.8; text-align:center;">--- 尋找失落記憶碎片 ---</div>
                        </div>`;
    }
    
    // Queue the cinematic to play AFTER assets finish loading
    pendingLevelContext = {
        titleContent: titleContent,
        chunks: typeof chunks !== 'undefined' ? chunks : null,
        duration: introDuration
    };
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
        setUIMode(getCurrentMode() === UI_MODES.GM ? UI_MODES.GAME : UI_MODES.GM);
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
let selectionWireframe = null;
let selectionBox = null;

function updateSelectionVisuals(child) {
    // Clear old wireframe
    if (selectionWireframe) {
        if (selectionWireframe.parent) selectionWireframe.parent.remove(selectionWireframe);
        selectionWireframe.geometry.dispose();
        selectionWireframe.material.dispose();
        selectionWireframe = null;
    }
    // Clear old box
    if (selectionBox) {
        selectionBox.visible = false;
    }

    if (child.isMesh && child.geometry) {
        // Create exact mesh wireframe overlay
        const geo = new THREE.WireframeGeometry(child.geometry);
        const mat = new THREE.LineBasicMaterial({ color: 0xff00ff, depthTest: false, transparent: true, opacity: 0.5 });
        selectionWireframe = new THREE.LineSegments(geo, mat);
        selectionWireframe.renderOrder = 999;
        child.add(selectionWireframe);
    } else {
        // Fallback for Lights / Groups etc
        if (!selectionBox) {
            selectionBox = new THREE.BoxHelper(child, 0xff00ff);
            selectionBox.material.depthTest = false;
            selectionBox.renderOrder = 999;
            import('./src/core.js').then(m => m.scene.add(selectionBox));
        } else {
            selectionBox.setFromObject(child);
            selectionBox.visible = true;
        }
    }
}

function updateInspectorPanel(obj, displayName) {
    document.getElementById('inspector-name').innerText = displayName;
    document.getElementById('insp-pos-x').value = obj.position.x.toFixed(2);
    document.getElementById('insp-pos-y').value = obj.position.y.toFixed(2);
    document.getElementById('insp-pos-z').value = obj.position.z.toFixed(2);
    document.getElementById('insp-sca-x').value = obj.scale.x.toFixed(2);
    document.getElementById('insp-sca-y').value = obj.scale.y.toFixed(2);
    document.getElementById('insp-sca-z').value = obj.scale.z.toFixed(2);
    document.getElementById('insp-rot-y').value = THREE.MathUtils.radToDeg(obj.rotation.y).toFixed(2);
}

function initInspectorEvents() {
    const applyTransform = () => {
        if(!transformControl || !transformControl.object) return;
        const o = transformControl.object;
        o.position.set(
            parseFloat(document.getElementById('insp-pos-x').value) || 0,
            parseFloat(document.getElementById('insp-pos-y').value) || 0,
            parseFloat(document.getElementById('insp-pos-z').value) || 0
        );
        o.scale.set(
            parseFloat(document.getElementById('insp-sca-x').value) || 1,
            parseFloat(document.getElementById('insp-sca-y').value) || 1,
            parseFloat(document.getElementById('insp-sca-z').value) || 1
        );
        o.rotation.y = THREE.MathUtils.degToRad(parseFloat(document.getElementById('insp-rot-y').value) || 0);
        
        if (selectionBox && selectionBox.visible) selectionBox.update();
        if (o.userData.physicsBody) {
            o.userData.physicsBody.position.copy(o.position);
            o.userData.physicsBody.quaternion.copy(o.quaternion);
        }
    };
    
    ['insp-pos-x','insp-pos-y','insp-pos-z','insp-sca-x','insp-sca-y','insp-sca-z','insp-rot-y'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', applyTransform);
    });
}
initInspectorEvents();

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
                showEditorStatus(`選取物件: ${child.name || child.type}`);
                
                updateSelectionVisuals(child);
                updateInspectorPanel(child, displayName);
            }
        });

        list.appendChild(div);
    });
}

document.getElementById('btn-refresh-hierarchy')?.addEventListener('click', refreshHierarchyPanel);
document.getElementById('btn-save-scene')?.addEventListener('click', () => {
    saveSceneState(scene);
    showEditorStatus('💾 增量儲存完成 (Saved)');
});

window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        const mode = import('./src/uiManager.js').then(m => {
            if (m.getCurrentMode() === m.UI_MODES.EDITOR) {
                saveSceneState(scene);
                showEditorStatus('💾 增量儲存完成 (Saved)');
            }
        });
    }
});

export function showEditorStatus(msg) {
    const bar = document.getElementById('editor-status-bar');
    if (!bar) return;
    bar.textContent = msg;
    bar.style.opacity = '1';
    
    // clear the timer if it exists
    if (bar.hideTimeout) clearTimeout(bar.hideTimeout);
    bar.hideTimeout = setTimeout(() => {
        bar.style.opacity = '0.3';
    }, 3000);
}

// Initialize Edit Controls
orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enabled = false;

transformControl = new TransformControls(camera, renderer.domElement);
transformControl.addEventListener('dragging-changed', function (event) {
    orbitControls.enabled = !event.value;
});
transformControl.addEventListener('change', function () {
    if (transformControl.object) {
        if (selectionBox && selectionBox.visible) selectionBox.update();
        let name = transformControl.object.name || transformControl.object.type;
        updateInspectorPanel(transformControl.object, name);
    }
});
scene.add(transformControl);

// Delegate DOM visibility entirely to the State Machine:
window.addEventListener('ui-mode-changed', (e) => {
    const mode = e.detail.mode;
    const appContainer = document.getElementById('app');
    
    // We only control WebGL components and app layout in main.js
    if (mode === UI_MODES.EDITOR) {
        isSceneEditor = true;
        controls.unlock();
        orbitControls.enabled = true;
        
        // IDE Layout Shift (Shrink viewport)
        const newW = window.innerWidth - 410;
        const newH = window.innerHeight - 70;
        appContainer.style.width = newW + 'px';
        appContainer.style.left = '210px';
        appContainer.style.top = '70px';
        appContainer.style.height = newH + 'px';
        triggerResize();
        
        refreshHierarchyPanel();
        isTimelinePlaying = false;
        
    } else {
        isSceneEditor = false;
        orbitControls.enabled = false;
        transformControl.detach();
        
        // Restore standard full layout
        appContainer.style.width = '100vw';
        appContainer.style.left = '0px';
        appContainer.style.top = '0px';
        appContainer.style.height = '100vh';
        triggerResize();
        
        // Only lock if we returned to game from in-game, not menu
        if (mode === UI_MODES.GAME && document.getElementById('game-ui')?.style.display !== 'none') {
            controls.lock(); 
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

let isRightMouseDown = false;

renderer.domElement.addEventListener('pointerdown', (e) => {
    if (e.button === 2) isRightMouseDown = true;
});
renderer.domElement.addEventListener('pointerup', (e) => {
    if (e.button === 2) isRightMouseDown = false;
});
renderer.domElement.addEventListener('pointerleave', () => {
    isRightMouseDown = false;
});

// Raycasting for generic scene manipulations
renderer.domElement.addEventListener('pointerdown', (event) => {
    if (!isSceneEditor) {
        // [Game Mode] Interacting with objects in First-Person
        if (!controls.isLocked) return;
        
        // Raycast straight from center of camera
        raycasterEditor.setFromCamera(new THREE.Vector2(0, 0), camera);
        const intersects = raycasterEditor.intersectObjects(levelState.interactables, true);
        
        if (intersects.length > 0) {
            let hitObj = intersects[0].object;
            // Traverse up to find the object that actually holds the userData
            while(hitObj && !hitObj.userData.onInteract && hitObj.parent) {
                hitObj = hitObj.parent;
            }
            
            if (hitObj && hitObj.userData.onInteract) {
                hitObj.userData.onInteract();
            }
        }
        return;
    }
    
    // [Editor Mode] Select and Manipulate
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
if (btnReturnMenu) {
    btnReturnMenu.addEventListener('click', () => {
        // Stop current logic, return to title menu overlay
        menuOverlay.style.display = 'flex';
        gameUI.style.display = 'none';
        btnReturnMenu.classList.add('hidden-element');
        if(vrButton) {
            vrButton.style.opacity = '1';
            vrButton.style.pointerEvents = 'auto';
        }
        
        // Ensure mouse is unlocked since we are going back to HTML UI
        controls.unlock();
        import('./src/uiManager.js').then(m => {
            if (m.getCurrentMode() === m.UI_MODES.EDITOR) {
                m.setUIMode(m.UI_MODES.GAME); // Force exit editor
            }
        });
        
        // Show default blank void or background since we exit the current level
        import('./src/levelManager.js').then(lm => {
            lm.clearLevel();
            scene.background = new THREE.Color(0x050510);
            scene.environment = null;
        });
    });
}

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
        levelState.currentLevel = selectedLvl;
        document.getElementById('editor-level-select').value = selectedLvl; // sync top-right dropdown
        levelLoaders[selectedLvl]();
        setTimeout(restoreFXState, 50);
        startLevelIntro(selectedLvl);
    } else {
        controls.lock();
    }
});

document.getElementById('editor-level-select')?.addEventListener('change', (e) => {
    const selectedLvl = parseInt(e.target.value);
    if(levelLoaders[selectedLvl]) {
        levelState.currentLevel = selectedLvl;
        showEditorStatus('載入關卡 ' + selectedLvl + ' (省略播片)');
        levelLoaders[selectedLvl]();
        setTimeout(restoreFXState, 50);
        
        // Sync the main menu dropdown as well just in case they return
        document.getElementById('level-select').value = selectedLvl;
    }
});

// Help UI & Top UI bindings
const helpModal = document.getElementById('help-modal');
if (helpModal) {
    document.getElementById('btn-show-help')?.addEventListener('click', () => {
        helpModal.classList.remove('hidden-element');
    });
    document.getElementById('btn-close-help')?.addEventListener('click', () => {
        helpModal.classList.add('hidden-element');
    });
}
// btn-toggle-debug-ui is already bound in uiManager.js

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
    
    // Editor Camera Flight Logic (Plan B)
    if (isSceneEditor && isRightMouseDown) {
        const flightSpeed = moveSpeed * dt * 2.0; // Fly a bit faster
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        // upward relies on world Y, so it's intuitive
        const up = new THREE.Vector3(0, 1, 0); 
        
        const offset = new THREE.Vector3(0,0,0);
        if (keys.w) offset.addScaledVector(forward, flightSpeed);
        if (keys.s) offset.addScaledVector(forward, -flightSpeed);
        if (keys.a) offset.addScaledVector(right, -flightSpeed);
        if (keys.d) offset.addScaledVector(right, flightSpeed);
        if (keys.e) offset.addScaledVector(up, flightSpeed);
        if (keys.q) offset.addScaledVector(up, -flightSpeed);

        camera.position.add(offset);
        orbitControls.target.add(offset);
    }
    
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

        // Remove mathematical bounce, let animation handle it
        if (catMixer) catMixer.update(dt);
        catTail.rotation.z = Math.sin(clock.elapsedTime * 6) * 0.2;
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
            
            const baseBob = 0; // Removed manual bob, animation plays instead
            if (catMixer) catMixer.update(dt);
            
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
