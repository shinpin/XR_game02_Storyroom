import * as THREE from 'three';

export let levelGroup = new THREE.Group();
export let levelState = {
    rigidBodies: [], // { mesh, body }
    interactables: [],
    updatables: [],
    doorTriggerBody: null,
    nextLevelParams: null,
    playerBaseY: 0.5
};

export const keys = { w: false, a: false, s: false, d: false, q: false, e: false };

export function resetLevelGroup() {
    levelGroup = new THREE.Group();
}
export function resetLevelState() {
    levelState = {
        rigidBodies: [],
        interactables: [],
        updatables: [],
        doorTriggerBody: null,
        nextLevelParams: null,
        playerBaseY: 0.5
    };
}

document.addEventListener('keydown', (e) => { 
    if (keys[e.key.toLowerCase()] !== undefined) keys[e.key.toLowerCase()] = true; 
});
document.addEventListener('keyup', (e) => { 
    if (keys[e.key.toLowerCase()] !== undefined) keys[e.key.toLowerCase()] = false; 
});

export function showDialog(text, duration = 4000) {
    const box = document.getElementById('dialogue-box');
    const textEl = document.getElementById('dialogue-text');
    if (!box || !textEl) return;
    
    textEl.innerText = text;
    box.style.display = 'block';
    
    // Reset animation
    box.style.animation = 'none';
    box.offsetHeight; // Trigger reflow
    box.style.animation = 'fadeUp 0.3s ease-out forwards';
    
    if (window._dialogTimeout) clearTimeout(window._dialogTimeout);
    window._dialogTimeout = setTimeout(() => {
        box.style.opacity = '1';
        box.style.transition = 'opacity 0.5s ease-out';
        box.style.opacity = '0';
        setTimeout(() => { box.style.display = 'none'; }, 500);
    }, duration);
}

