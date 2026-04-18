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
        
        const initY = card.position.y;
        levelState.updatables.push((dt) => {
            if (cardBody.sleepState === CANNON.Body.SLEEPING) {
                card.position.y = initY + Math.sin(performance.now() * 0.002 + i) * 0.2;
                cardBody.position.copy(card.position);
            }
        });
    }

    // Heart Sutra Calligraphy Particles
    function createCharTexture(char) {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0,0,64,64); // Make fully transparent
        
        ctx.font = 'bold 44px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffccaa'; // glowing golden
        
        ctx.shadowColor = '#ff6600';
        ctx.shadowBlur = 10;
        
        ctx.fillText(char, 32, 32);
        
        return new THREE.CanvasTexture(canvas);
    }
    
    const chars = ['色', '不', '異', '空', '觀', '心', '無', '法', '般', '若'];
    const sutraParticles = [];
    
    chars.forEach(char => {
        const tex = createCharTexture(char);
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(30 * 3);
        const phases = new Float32Array(30);
        for(let i=0; i<30; i++) {
            pos[i*3] = (Math.random()-0.5)*40;
            pos[i*3+1] = Math.random()*25 + 5;
            pos[i*3+2] = (Math.random()-0.5)*40 - 25;
            phases[i] = Math.random() * Math.PI * 2;
        }
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('phase', new THREE.BufferAttribute(phases, 1));
        
        const mat = new THREE.PointsMaterial({
            size: 1.2,
            map: tex,
            transparent: true,
            opacity: 0.8,
            alphaTest: 0.05,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        const points = new THREE.Points(geo, mat);
        levelGroup.add(points);
        sutraParticles.push(points);
    });
    
    levelState.updatables.push((dt) => {
        const time = performance.now() * 0.001;
        sutraParticles.forEach((points, index) => {
            const positions = points.geometry.attributes.position.array;
            const phases = points.geometry.attributes.phase.array;
            for(let i=0; i<30; i++) {
                // softly drift down
                positions[i*3+1] -= dt * (0.8 + (index%3)*0.2); 
                
                // sway horizontally based on phase
                positions[i*3] += Math.sin(time*0.5 + phases[i]) * dt * 0.5;
                positions[i*3+2] += Math.cos(time*0.4 + phases[i]) * dt * 0.3;
                
                // reset at bottom
                if (positions[i*3+1] < -2) {
                    positions[i*3+1] = 25 + Math.random()*5;
                }
            }
            points.geometry.attributes.position.needsUpdate = true;
        });
    });

}
