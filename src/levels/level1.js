import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { scene, textureLoader } from '../core.js';
import { clearLevel, updateNavMap, createPhysicsObject, createLevelDoor } from '../levelManager.js';
import { playLevelBGM } from '../audio.js';
import { levelState, levelGroup } from '../state.js';
import { matWater, matLight } from '../materials.js';

export function loadLevel1() {
    clearLevel();
    updateNavMap(1);
    playLevelBGM('/BGM_01.mp3');
    
    levelState.playerBaseY = -2.5;
    
    textureLoader.load('/BG360_Treewater.jpg', (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.colorSpace = THREE.SRGBColorSpace;
        scene.background = texture;
        scene.environment = texture;
    });
    scene.fog.color.setHex(0xaaaaaa); 
    scene.fog.density = 0.012;

    const sun = new THREE.DirectionalLight(0xffffee, 3);
    sun.position.set(10, 20, 10);
    levelGroup.add(sun);
    
    const water = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), matWater);
    water.rotation.x = -Math.PI / 2;
    water.position.y = -3.5;
    levelGroup.add(water);

    const invisibleFloor = new THREE.Mesh(new THREE.BoxGeometry(200, 1, 200), matLight);
    invisibleFloor.visible = false;
    invisibleFloor.position.y = -4.0;
    createPhysicsObject(invisibleFloor, new CANNON.Box(new CANNON.Vec3(100, 0.5, 100)), 0);

    const lanternMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0xffaa00, emissiveIntensity: 1.5 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 1.0 });
    const weedMat = new THREE.MeshStandardMaterial({ color: 0x2e8b57, roughness: 0.9 });

    for(let i=0; i<30; i++) {
        const lRadius = 0.3 + Math.random()*0.4;
        const lanternGeo = new THREE.CylinderGeometry(lRadius, lRadius, 0.15, 16);
        const lantern = new THREE.Mesh(lanternGeo, lanternMat);
        lantern.position.set((Math.random()-0.5)*40, -3.4, (Math.random()-0.5)*40);
        createPhysicsObject(lantern, new CANNON.Cylinder(lRadius, lRadius, 0.15, 16), 1, true);

        if(i < 15) {
            const wLen = 2 + Math.random()*3;
            const wRad = 0.2 + Math.random()*0.2;
            const wood = new THREE.Mesh(new THREE.CylinderGeometry(wRad, wRad, wLen, 8), woodMat);
            const q = new CANNON.Quaternion();
            q.setFromAxisAngle(new CANNON.Vec3(1,0,0), Math.PI/2);
            wood.position.set((Math.random()-0.5)*50, -3.4, (Math.random()-0.5)*50);
            const woodBody = createPhysicsObject(wood, new CANNON.Cylinder(wRad, wRad, wLen, 8), 5, true);
            woodBody.quaternion.copy(q);
        }

        if(i < 20) {
            const weedRad = 1 + Math.random();
            const weed = new THREE.Mesh(new THREE.CylinderGeometry(weedRad, weedRad, 0.05, 12), weedMat);
            weed.position.set((Math.random()-0.5)*60, -3.45, (Math.random()-0.5)*60);
            createPhysicsObject(weed, new CANNON.Cylinder(weedRad, weedRad, 0.05, 12), 2, true);
        }
    }

    const fishGroup = new THREE.Group();
    levelGroup.add(fishGroup);
    
    const fishBodyGeo = new THREE.ConeGeometry(0.3, 1.2, 4);
    fishBodyGeo.rotateX(Math.PI/2); 
    const fishMat = new THREE.MeshStandardMaterial({ color: 0xaaccff, metalness: 0.6, roughness: 0.3 });
    
    const fishes = [];
    for(let i=0; i<15; i++) {
        const fish = new THREE.Mesh(fishBodyGeo, fishMat);
        const orbitRadius = 8 + Math.random()*15;
        const orbitSpeed = 0.3 + Math.random()*0.4;
        const yOffset = 8 + Math.random()*6; 
        const theta = Math.random() * Math.PI * 2;
        fishes.push({ mesh: fish, radius: orbitRadius, speed: orbitSpeed, y: yOffset, angle: theta });
        fishGroup.add(fish);
    }

    const mistGeo = new THREE.BufferGeometry();
    const mistPos = new Float32Array(800 * 3);
    for(let i=0; i<800; i++) {
        mistPos[i*3] = (Math.random()-0.5)*80;
        mistPos[i*3+1] = (Math.random()*0.5) - 3.5; 
        mistPos[i*3+2] = (Math.random()-0.5)*80;
    }
    mistGeo.setAttribute('position', new THREE.BufferAttribute(mistPos, 3));
    const mistMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.2, transparent: true, opacity: 0.4 });
    const mist = new THREE.Points(mistGeo, mistMat);
    levelGroup.add(mist);

    const rainGeo = new THREE.BufferGeometry();
    const rainPos = new Float32Array(1500 * 3);
    for(let i=0; i<1500; i++) {
        rainPos[i*3] = (Math.random()-0.5)*60;
        rainPos[i*3+1] = Math.random()*30;
        rainPos[i*3+2] = (Math.random()-0.5)*60;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    const rainMat = new THREE.PointsMaterial({ color: 0x99ccff, size: 0.1, transparent: true, opacity: 0.6 });
    const rain = new THREE.Points(rainGeo, rainMat);
    levelGroup.add(rain);

    levelState.updatables.push((dt) => {
        fishes.forEach(f => {
            f.angle += dt * f.speed;
            f.mesh.position.set(Math.cos(f.angle)*f.radius, f.y + Math.sin(f.angle*3)*1.5, Math.sin(f.angle)*f.radius);
            f.mesh.rotation.y = -f.angle;
        });
        
        const mPositions = mistGeo.attributes.position.array;
        for(let i=0; i<800; i++) {
            mPositions[i*3] += dt * 1.5; 
            if(mPositions[i*3] > 40) mPositions[i*3] = -40; 
        }
        mistGeo.attributes.position.needsUpdate = true;
        
        const rPositions = rainGeo.attributes.position.array;
        for(let i=0; i<1500; i++) {
            rPositions[i*3+1] -= dt * 15; 
            if(rPositions[i*3+1] < -1) rPositions[i*3+1] = 30; 
        }
        rainGeo.attributes.position.needsUpdate = true;
    });

    createLevelDoor(0, -2, -20, 2); 
}
