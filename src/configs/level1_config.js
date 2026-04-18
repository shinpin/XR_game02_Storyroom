import * as THREE from 'three';
import { camera } from '../core.js';
import { levelState, showDialog } from '../state.js';
import { catGroup, playerBody, catTail } from '../player.js';

let isInitialized = false;
let initialCameraPos = new THREE.Vector3(2, 22, 5);

export const level1Config = {
    id: 1,
    audio: {
        bgm: '/BGM_01.mp3'
    },
    player: {
        baseY: -12.0
    },
    environment: {
        skybox: '/BG360_Treewater.jpg',
        skyboxRotationY: THREE.MathUtils.degToRad(80),
        fogColor: 0x0a1a2a,
        fogDensity: 0.015
    },
    lighting: [
        { type: 'Directional', color: 0xffffee, intensity: 3, position: [10, 20, 10] },
        { type: 'Ambient', color: 0xffffff, intensity: 0.5 }
    ],
    postprocessing: {
        bloom: { enabled: true, strength: 0.08 },
        film: { enabled: true, intensity: 0.25 }, // Cinematic grain
        chromaticAberration: { enabled: true, amount: 0.001 },
        colorAdjustments: { enabled: false },
        motionBlur: { enabled: false },
        ao: { enabled: true, kernelRadius: 16, minDistance: 0.005, maxDistance: 0.1 }
    },
    camera: {
        fov: 75,
        distance: -2.5,
        height: 1.8
    },
    customIntro: (elapsed, duration, dt) => {
        if (!isInitialized) {
            isInitialized = true;
            camera.position.copy(initialCameraPos);
            camera.lookAt(0, levelState.playerBaseY, -10);
            catGroup.visible = false;
            catGroup.position.set(0, levelState.playerBaseY - 6, 1);
            playerBody.position.set(0, levelState.playerBaseY, 0); 
        }
        
        const progress = Math.min(elapsed / duration, 1.0);
        
        if (progress < 0.4) {
            // Phase 1: Camera floats down
            const p = progress / 0.4;
            const t = p * p * (3 - 2 * p);
            
            camera.position.lerpVectors(
                initialCameraPos,
                new THREE.Vector3(0, levelState.playerBaseY + 2.5, 0),
                t
            );
            
            const lookTarget = new THREE.Vector3(0, levelState.playerBaseY, -10).lerp(new THREE.Vector3(0, levelState.playerBaseY + 1.5, -20), t);
            camera.lookAt(lookTarget);
            
        } else if (progress >= 0.4 && progress < 0.6) {
            // Phase 2: Fox swims up into view
            if (!catGroup.visible) {
                catGroup.visible = true;
                camera.position.set(0, levelState.playerBaseY + 2.5, 0);
                camera.rotation.set(0, 0, 0); 
            }
            
            const p = (progress - 0.4) / 0.2;
            const t = p * p * (3 - 2 * p);
            
            catGroup.position.lerpVectors(
                new THREE.Vector3(0, levelState.playerBaseY - 6, 1.5),
                new THREE.Vector3(0, levelState.playerBaseY - 0.5, -2),
                t
            );
            catGroup.rotation.y = 0; 
            catTail.rotation.z = Math.sin(elapsed * 10) * 0.3; 
            
        } else {
            // Phase 3: Push forward towards the door
            const p = (progress - 0.6) / 0.4;
            const t = p * p * (3 - 2 * p);
            
            const startZ = -2;
            const endZ = -18;
            const currentZ = THREE.MathUtils.lerp(startZ, endZ, t);
            
            const bobbing = Math.sin(elapsed * 5) * 0.15;
            catGroup.position.set(0, levelState.playerBaseY - 0.5 + bobbing, currentZ);
            catTail.rotation.z = Math.sin(elapsed * 12) * 0.2; 
            
            const camTargetZ = currentZ + 2.5;
            camera.position.set(0, levelState.playerBaseY + 2.5, camTargetZ);
            
            camera.rotation.set(-0.1, 0, 0); 
            
            playerBody.position.set(camera.position.x, levelState.playerBaseY, camera.position.z);
        }
    },
    onIntroComplete: () => {
        // Triggered exactly when the cinematic camera parks in front of the door
        const dialogueSequence = [
            "古老的大門：『你來了，迷失的靈魂。』",
            "古老的大門：『這扇門通往更深處的記憶，但它不會輕易為你敞開。』",
            "古老的大門：『去找尋散落在這片水域周圍的線索吧。唯有觸發機關，門才會甦醒。』"
        ];
        
        showDialog(dialogueSequence, [
            { text: "我明白了", action: () => { 
                console.log("Dialogue ended"); 
                document.dispatchEvent(new CustomEvent('lockControlsForPlay'));
            } }
        ]);
    }
};
