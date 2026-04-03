import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { scene } from '../core.js';
import { clearLevel, updateNavMap, createPhysicsObject, createLevelDoor } from '../levelManager.js';
import { levelState, levelGroup, showDialog } from '../state.js';
import { world, physicsMaterial } from '../physics.js';

export function loadLevel3() {
    clearLevel();
    updateNavMap(3);
    
    levelState.playerBaseY = 0.5;
    scene.fog.color.setHex(0x0a0505); 
    scene.fog.density = 0.02; 
    scene.background = new THREE.Color(0x0a0505);
    scene.environment = scene.background;
    const matStone = new THREE.MeshStandardMaterial({ color: 0x111116, roughness: 0.9, metalness: 0.1 });
    const matGround = new THREE.MeshStandardMaterial({ color: 0x050508, roughness: 1.0 });

    const roomW = 30; // -15 to +15
    const roomZ = 40; // -20 to +20

    // Ground Floor
    const ground = new THREE.Mesh(new THREE.BoxGeometry(roomW, 1, roomZ), matGround);
    ground.position.set(0, -0.5, 0);
    createPhysicsObject(ground, new CANNON.Box(new CANNON.Vec3(roomW/2, 0.5, roomZ/2)), 0);

    // Wall Pillars (Temple feel)
    for(let z=-18; z<=18; z+=6) {
        for(let x of [-14, 14]) {
            const pillar = new THREE.Mesh(new THREE.BoxGeometry(2, 16, 2), matStone);
            pillar.position.set(x, 8, z);
            createPhysicsObject(pillar, new CANNON.Box(new CANNON.Vec3(1, 8, 1)), 0);
            
            // Wall torches
            const light = new THREE.PointLight(0xff6622, 1, 15);
            light.position.set(x > 0 ? x-1.5 : x+1.5, 4, z);
            levelGroup.add(light);
        }
    }

    const gridBaseZ = -5;
    const tileS = 2; 

    // Target Glowing Plates
    const targetPlate1 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.2, 1.8), new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xaa4400, emissiveIntensity: 2 }));
    targetPlate1.position.set(-tileS, 0.1, gridBaseZ - tileS*2);
    levelGroup.add(targetPlate1);

    const targetPlate2 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.2, 1.8), new THREE.MeshStandardMaterial({ color: 0x00aaff, emissive: 0x0044aa, emissiveIntensity: 2 }));
    targetPlate2.position.set(tileS, 0.1, gridBaseZ - tileS*2);
    levelGroup.add(targetPlate2);

    // Chessboard floor
    const darkTileMat = new THREE.MeshStandardMaterial({ color: 0x020202, roughness: 0.2 });
    const lightTileMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.2 });
    for(let i=-2; i<=2; i++) {
        for(let j=-3; j<=3; j++) {
            const isD = (i+j)%2 === 0;
            const tile = new THREE.Mesh(new THREE.PlaneGeometry(tileS, tileS), isD ? darkTileMat : lightTileMat);
            tile.rotation.x = -Math.PI/2;
            tile.position.set(i*tileS, 0.01, gridBaseZ + j*tileS);
            levelGroup.add(tile);
        }
    }

    // Interactive Obelisks (Chess pieces)
    const obeGeo = new THREE.CylinderGeometry(0.4, 0.9, 4, 4);
    obeGeo.rotateY(Math.PI/4); // Square pyramid alignment

    const obe1 = new THREE.Mesh(obeGeo, matStone.clone());
    obe1.position.set(-tileS*2, 2, gridBaseZ + tileS*2);
    const body1 = createPhysicsObject(obe1, new CANNON.Box(new CANNON.Vec3(0.65, 2, 0.65)), 80, true);

    const obe2 = new THREE.Mesh(obeGeo, matStone.clone());
    obe2.position.set(tileS*2, 2, gridBaseZ + tileS*2);
    const body2 = createPhysicsObject(obe2, new CANNON.Box(new CANNON.Vec3(0.65, 2, 0.65)), 80, true);

    // Ensure they are interactable via Telekinesis
    obe1.userData.physicsBody = body1;
    obe1.userData.isInteractable = true;
    obe2.userData.physicsBody = body2;
    obe2.userData.isInteractable = true;
    levelState.interactables.push(obe1, obe2);

    // Central Light
    const skyLight = new THREE.PointLight(0xddccff, 2, 40); 
    skyLight.position.set(0, 15, gridBaseZ);
    levelGroup.add(skyLight);

    // Puzzle Logic
    let puzzleSolved = false;

    levelState.updatables.push((dt) => {
        if (puzzleSolved) return;
        
        let p1OK = false;
        let p2OK = false;

        const checkPlate = (obeBody, plateMesh) => {
            const dx = obeBody.position.x - plateMesh.position.x;
            const dz = obeBody.position.z - plateMesh.position.z;
            return (Math.sqrt(dx*dx + dz*dz) < 1.0 && obeBody.position.y < 3);
        }

        if (checkPlate(body1, targetPlate1) || checkPlate(body2, targetPlate1)) p1OK = true;
        if (checkPlate(body1, targetPlate2) || checkPlate(body2, targetPlate2)) p2OK = true;

        if (p1OK && p2OK) {
            puzzleSolved = true;
            targetPlate1.material.emissive.setHex(0x00ff00);
            targetPlate2.material.emissive.setHex(0x00ff00);
            createLevelDoor(0, 0.5, -16, 4);
            import('../audio.js').then(({ playLevelBGM }) => {
                // optional: play unlocking sound
            });
            import('../state.js').then(({ showDialog }) => {
                showDialog('命運的雙子星已歸位，前方的路徑清晰了。');
            });
        }
    });

}

