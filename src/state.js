import * as THREE from 'three';
import { sequences } from './narrative.js';
import { playTypewriterTick } from './audio.js';

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
export function setIntroCinematic(v) { 
    isIntroCinematic = v; 
    if(!v) {
        const titleEl = document.getElementById('big-level-title');
        if(titleEl) {
            titleEl.style.opacity = '0';
            titleEl.classList.add('hidden-element');
        }
    }
}

export function showBigTitle(text, callback) {
    const titleEl = document.getElementById('big-level-title');
    if (!titleEl) return;
    titleEl.innerText = text;
    titleEl.classList.remove('hidden-element');
    
    // Fade In
    setTimeout(() => { titleEl.style.opacity = '1'; }, 50);
    
    // Hold then Fade Out 
    setTimeout(() => {
        titleEl.style.opacity = '0';
        setTimeout(() => {
            titleEl.classList.add('hidden-element');
            if(callback) callback();
        }, 1000); // Wait 1s for fade out
    }, 3000); // 3s hold = 4s total
}

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
    textEl.style.opacity = '1';
    textEl.innerText = '';
    if (window._dialogTimeout) clearTimeout(window._dialogTimeout);
    if (typeWriterInterval) clearInterval(typeWriterInterval);
    
    let chunks = Array.isArray(text) ? text : [text];
    let chunkIndex = 0;
    
    const playNextChunk = () => {
        if (chunkIndex >= chunks.length) {
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
                // End hide timer
                window._dialogTimeout = setTimeout(() => hideDialog(), 2000); 
            }
            return;
        }

        textEl.style.transition = 'none';
        textEl.style.opacity = '1';
        textEl.innerText = '';
        const currentChunk = chunks[chunkIndex];
        let charIndex = 0;

        typeWriterInterval = setInterval(() => {
            const char = currentChunk.charAt(charIndex);
            if (char !== ' ' && char !== '\n' && char !== '。') {
                playTypewriterTick();
            }
            textEl.innerText += char;
            charIndex++;
            if (charIndex >= currentChunk.length) {
                clearInterval(typeWriterInterval);
                typeWriterInterval = null;
                
                if (chunkIndex < chunks.length - 1) {
                    window._dialogTimeout = setTimeout(() => {
                        textEl.style.transition = 'opacity 0.5s';
                        textEl.style.opacity = '0';
                        window._dialogTimeout = setTimeout(() => {
                            chunkIndex++;
                            playNextChunk();
                        }, 500); 
                    }, 1500); 
                } else {
                    chunkIndex++;
                    playNextChunk(); 
                }
            }
        }, 80); 
    };

    playNextChunk();
}

