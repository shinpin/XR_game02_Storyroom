import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { scene, textureLoader } from '../core.js';
import { clearLevel, createPhysicsObject, createLevelDoor } from '../levelManager.js';
import { levelGroup } from '../state.js';
import { parseLevel } from '../levelParser.js';
import { level4Config } from '../configs/level4_config.js';

export function loadLevel4() {
    clearLevel();
    parseLevel(level4Config);
    
    const stepMat = new THREE.MeshStandardMaterial({ color: 0x4a4742, roughness: 0.9, flatShading: true });
    
    // Extend start platform to span from Z=0 to Z=10 to meet the ramp properly
    const startObj = new THREE.Mesh(new THREE.BoxGeometry(5, 1, 10), stepMat);
    startObj.position.set(0, -0.5, 5); 
    startObj.receiveShadow = true;
    createPhysicsObject(startObj, new CANNON.Box(new CANNON.Vec3(2.5, 0.5, 5)), 0);

    const rampQ = new CANNON.Quaternion();
    rampQ.setFromAxisAngle(new CANNON.Vec3(1,0,0), 0.12); 
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(6, 0.5, 30), stepMat);
    // Lower center height from 3 to 1.8 so the ramp edge (Z=0) matches Y=0 platform
    ramp.position.set(0, 1.8, -15);
    const rampBody = createPhysicsObject(ramp, new CANNON.Box(new CANNON.Vec3(3, 0.25, 15)), 0);
    rampBody.quaternion.copy(rampQ);
    ramp.quaternion.copy(rampQ);

    const boulder = new THREE.Mesh(new THREE.SphereGeometry(2, 16, 16), stepMat);
    boulder.position.set(0, 8, -28); 
    createPhysicsObject(boulder, new CANNON.Sphere(2), 200, false); 

    const rockGeo = new THREE.DodecahedronGeometry(1.5, 0); 
    
    const numSteps = 10;
    for(let i=0; i<numSteps; i++) {
        const zPos = -10 - (i*6);
        const yPos = i * 2.5;
        const xPos = Math.sin(i * 0.8) * 8;
        
        const step = new THREE.Mesh(new THREE.BoxGeometry(4, 1.5, 4), stepMat);
        step.position.set(xPos, yPos, zPos);
        step.castShadow = true; step.receiveShadow = true;
        createPhysicsObject(step, new CANNON.Box(new CANNON.Vec3(2, 0.75, 2)), 0); 
    }
    
    for(let j=0; j<40; j++) {
        const floatRock = new THREE.Mesh(rockGeo, stepMat);
        const s = Math.random() * 2 + 1;
        floatRock.scale.set(s, s, s);
        floatRock.position.set((Math.random()-0.5)*80, Math.random()*40 + 5, -30 - Math.random()*60);
        floatRock.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, 0);
        levelGroup.add(floatRock);
    }
    

    const sunLight = new THREE.DirectionalLight(0xffd588, 3);
    sunLight.position.set(-50, 60, -100);
    sunLight.target.position.set(0, 0, 0);
    sunLight.castShadow = true;
    levelGroup.add(sunLight);
    levelGroup.add(sunLight.target);

    // 第一景保留門，其他景拿掉
    // createLevelDoor(Math.sin(9 * 0.8) * 8, 9 * 2.5 + 2, -10 - (9*6), 5); 
}
