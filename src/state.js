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

export const keys = { w: false, a: false, s: false, d: false };

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
