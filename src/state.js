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

export let isIntroCinematic = false;
export function setIntroCinematic(v) { isIntroCinematic = v; }

let typeWriterInterval = null;

export function hideDialog() {
    const box = document.getElementById('dialogue-box');
    if (!box) return;
    box.style.opacity = '0';
    if (typeWriterInterval) {
        clearInterval(typeWriterInterval);
        typeWriterInterval = null;
    }
    setTimeout(() => { box.style.display = 'none'; }, 500);
}

export function showDialog(text, durationOrOptions = 4000) {
    const box = document.getElementById('dialogue-box');
    const textEl = document.getElementById('dialogue-text');
    const optionsCont = document.getElementById('dialogue-options');
    if (!box || !textEl || !optionsCont) return;
    
    box.style.display = 'block';
    box.style.opacity = '1';
    
    // Reset animation
    box.style.animation = 'none';
    box.offsetHeight; // Trigger reflow
    box.style.animation = 'fadeUp 0.3s ease-out forwards';
    
    // Clear previous timeouts & intervals
    optionsCont.innerHTML = '';
    textEl.innerText = '';
    if (window._dialogTimeout) clearTimeout(window._dialogTimeout);
    if (typeWriterInterval) clearInterval(typeWriterInterval);
    
    let charIndex = 0;
    
    const showOptionsAndTimer = () => {
        if (Array.isArray(durationOrOptions)) {
            // Show options after typing finishes
            durationOrOptions.forEach(opt => {
                const btn = document.createElement('button');
                btn.className = 'dialog-option-btn';
                btn.innerText = opt.text;
                btn.onclick = () => {
                    if(opt.action) opt.action();
                    hideDialog();
                };
                optionsCont.appendChild(btn);
            });
            // Auto-unlock controls
            document.dispatchEvent(new CustomEvent('unlockControlsForDialog'));
        } else {
            // Start hide timer after typing finishes
            window._dialogTimeout = setTimeout(() => {
                hideDialog();
            }, durationOrOptions);
        }
    };

    typeWriterInterval = setInterval(() => {
        textEl.innerText += text.charAt(charIndex);
        charIndex++;
        if (charIndex >= text.length) {
            clearInterval(typeWriterInterval);
            typeWriterInterval = null;
            showOptionsAndTimer();
        }
    }, 180); // 180ms per character
}

