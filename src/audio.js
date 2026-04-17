import * as THREE from 'three';
import { camera } from './core.js';

export const audioListener = new THREE.AudioListener();
export const globalBGM = new THREE.Audio(audioListener);
const audioLoader = new THREE.AudioLoader();
let currentBGMUrl = null;

export let isMuted = true;

export function toggleMute() {
    isMuted = !isMuted;
    audioListener.setMasterVolume(isMuted ? 0 : 1);
    const btn = document.getElementById('btn-toggle-audio');
    if(btn) btn.innerText = isMuted ? '🔈' : '🔊';
}

export function initAudio() {
    camera.add(audioListener);
    audioListener.setMasterVolume(isMuted ? 0 : 1);
    
    // Sync UI Button initial state
    const btn = document.getElementById('btn-toggle-audio');
    if (btn) btn.innerText = isMuted ? '🔈' : '🔊';
}

export function playLevelBGM(url) {
    if(globalBGM.isPlaying) globalBGM.stop();
    currentBGMUrl = url;
    
    audioLoader.load(url, (buffer) => {
        if (currentBGMUrl !== url) return; // Fix race condition
        globalBGM.setBuffer(buffer);
        globalBGM.setLoop(true);
        globalBGM.setVolume(0.4);
        if(!globalBGM.isPlaying) globalBGM.play();
    });
}

export function stopLevelBGM() {
    currentBGMUrl = null;
    if (globalBGM.isPlaying) globalBGM.stop();
}

let synthCtx;

export function playTypewriterTick() {
    if (isMuted) return;
    if (!synthCtx) {
        synthCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (synthCtx.state === 'suspended') synthCtx.resume();
    
    const osc = synthCtx.createOscillator();
    const gainNode = synthCtx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800 + Math.random() * 150, synthCtx.currentTime); 
    
    gainNode.gain.setValueAtTime(0.05, synthCtx.currentTime); // Soft volume
    gainNode.gain.exponentialRampToValueAtTime(0.001, synthCtx.currentTime + 0.03);

    osc.connect(gainNode);
    gainNode.connect(synthCtx.destination);
    
    osc.start();
    osc.stop(synthCtx.currentTime + 0.04);
}
