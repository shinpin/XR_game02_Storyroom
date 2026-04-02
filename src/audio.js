import * as THREE from 'three';
import { camera } from './core.js';

export const audioListener = new THREE.AudioListener();
export const globalBGM = new THREE.Audio(audioListener);
const audioLoader = new THREE.AudioLoader();
let currentBGMUrl = null;

export function initAudio() {
    camera.add(audioListener);
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
