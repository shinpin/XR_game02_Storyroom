import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { scene } from '../core.js';
import { clearLevel, createPhysicsObject } from '../levelManager.js';
import { levelGroup, levelState } from '../state.js';
import { parseLevel } from '../levelParser.js';
import { level5Config } from '../configs/level5_config.js';
import { matStone } from '../materials.js';

export function loadLevel5() {
    clearLevel();
    parseLevel(level5Config);
    
    const runwayL = 72; // Increased by 20%
    const runway = new THREE.Mesh(new THREE.BoxGeometry(20, 1, runwayL), matStone);
    runway.position.set(0, -0.5, -26);
    createPhysicsObject(runway, new CANNON.Box(new CANNON.Vec3(10, 0.5, runwayL/2)), 0);
    
    const doorGeo = new THREE.BoxGeometry(8, 20, 2);
    
    const redMat = new THREE.MeshStandardMaterial({ color: 0xff4444, metalness: 0.5 });
    const leftDoor = new THREE.Mesh(doorGeo, redMat);
    leftDoor.position.set(-4, 10, -60);
    createPhysicsObject(leftDoor, new CANNON.Box(new CANNON.Vec3(4, 10, 1)), 0); 
    
    const blueMat = new THREE.MeshStandardMaterial({ color: 0x4444ff, metalness: 0.5 });
    const rightDoor = new THREE.Mesh(doorGeo, blueMat);
    rightDoor.position.set(4, 10, -60);
    createPhysicsObject(rightDoor, new CANNON.Box(new CANNON.Vec3(4, 10, 1)), 0); 
    
    const l1 = new THREE.PointLight(0xff0000, 50, 50); l1.position.set(-4, 10, -52); levelGroup.add(l1);
    const l2 = new THREE.PointLight(0x0000ff, 50, 50); l2.position.set(4, 10, -52); levelGroup.add(l2);

    // Fate Cards (Interactive Puzzle)
    const cardGeo = new THREE.BoxGeometry(1.5, 2.5, 0.1);
    const cardBackMat = new THREE.MeshStandardMaterial({ color: 0x221144, roughness: 0.2, metalness: 0.8 });
    const loreTexts = [
        "「力量」：不要恐懼眼前的巨大。",
        "「尋路」：黑暗中總有一絲微光。",
        "「犧牲」：有些東西必須被放下。",
        "「歸屬」：回家的大門已經打開。"
    ];

    for(let i=0; i<4; i++) {
        const frontColor = [0xff0000, 0x00ff00, 0x0000ff, 0xffaa00][i];
        const cardFrontMat = new THREE.MeshStandardMaterial({ color: frontColor, emissive: frontColor, emissiveIntensity: 0.5 });
        const card = new THREE.Mesh(cardGeo, [cardBackMat, cardBackMat, cardBackMat, cardBackMat, cardFrontMat, cardBackMat]);
        
        card.position.set((i - 1.5) * 3, 2, -30 - Math.random() * 5);
        card.rotation.set(0, Math.PI, 0); // Face backward initially
        card.userData.dialogText = loreTexts[i];
        
        const cardBody = createPhysicsObject(card, new CANNON.Box(new CANNON.Vec3(0.75, 1.25, 0.05)), 1, true);
        
        // Gentle floating animation before interaction
        const initY = card.position.y;
        levelState.updatables.push((dt) => {
            if (cardBody.sleepState === CANNON.Body.SLEEPING) {
                card.position.y = initY + Math.sin(performance.now() * 0.002 + i) * 0.2;
                cardBody.position.copy(card.position);
            }
        });
    }

}
