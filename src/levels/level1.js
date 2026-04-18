import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { scene, textureLoader, camera } from '../core.js';
import { clearLevel, updateNavMap, createPhysicsObject, createLevelDoor } from '../levelManager.js';
import { playLevelBGM } from '../audio.js';
import { levelState, levelGroup } from '../state.js';
import { parseLevel } from '../levelParser.js';
import { level1Config } from '../configs/level1_config.js';
import { matWater, matLight } from '../materials.js';
import { catGroup, playerBody, catTail } from '../player.js';

export function loadLevel1() {
    clearLevel();
    parseLevel(level1Config);
    
    
    const water = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), matWater);
    water.rotation.x = -Math.PI / 2;
    water.position.y = -5.5;
    levelGroup.add(water);

    const invisibleFloor = new THREE.Mesh(new THREE.BoxGeometry(200, 1, 200), matLight);
    invisibleFloor.visible = false;
    invisibleFloor.position.y = -6.0;
    createPhysicsObject(invisibleFloor, new CANNON.Box(new CANNON.Vec3(100, 0.5, 100)), 0);

    const lanternMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0xffaa00, emissiveIntensity: 3.5 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 1.0 });
    const weedMat = new THREE.MeshStandardMaterial({ color: 0x2e8b57, roughness: 0.9 });

    for(let i=0; i<360; i++) {
        if (i < 60) {
            const lRadius = 0.3 + Math.random()*0.4;
            const lanternGeo = new THREE.CylinderGeometry(lRadius, lRadius, 0.15, 16);
            const lantern = new THREE.Mesh(lanternGeo, lanternMat);
            lantern.position.set((Math.random()-0.5)*40, -5.4, (Math.random()-0.5)*40);
            createPhysicsObject(lantern, new CANNON.Cylinder(lRadius, lRadius, 0.15, 16), 1, true);
        }

        if(i < 30) {
            const wLen = 2 + Math.random()*3;
            const wRad = 0.2 + Math.random()*0.2;
            const wood = new THREE.Mesh(new THREE.CylinderGeometry(wRad, wRad, wLen, 8), woodMat);
            const q = new CANNON.Quaternion();
            q.setFromAxisAngle(new CANNON.Vec3(1,0,0), Math.PI/2);
            wood.position.set((Math.random()-0.5)*50, -5.4, (Math.random()-0.5)*50);
            const woodBody = createPhysicsObject(wood, new CANNON.Cylinder(wRad, wRad, wLen, 8), 5, true);
            woodBody.quaternion.copy(q);
        }

        const weedRad = 1 + Math.random();
        const weed = new THREE.Mesh(new THREE.CylinderGeometry(weedRad, weedRad, 0.05, 12), weedMat);
        weed.position.set((Math.random()-0.5)*120, -5.45, (Math.random()-0.5)*120);
        createPhysicsObject(weed, new CANNON.Cylinder(weedRad, weedRad, 0.05, 12), 2, true);
    }

    // Memory Crystals (Interactive puzzle elements)
    const crystalGeo = new THREE.OctahedronGeometry(0.5);
    const crystalMat = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x0088cc, emissiveIntensity: 4.0, transparent: true, opacity: 0.8 });
    
    for(let i=0; i<3; i++) {
        const crystal = new THREE.Mesh(crystalGeo, crystalMat.clone()); // clone material so each can change independently
        crystal.position.set((Math.random()-0.5)*20, -2, (Math.random()-0.5)*20 + 5);
        
        const crystalDialogs = [
            {
                text: "這是一塊閃爍著微光的記憶碎片... 裡面似乎封存著一段呢喃：\n「我好像曾在那棵巨大得不合常理的樹下睡著... 然後世界就變成了這樣。」\n\n你要試著去觸碰並吸收這段記憶嗎？",
                options: [
                    { text: "【觸碰碎片】吸收這段遺失的記憶", action: () => { crystal.material.emissiveIntensity = 8; } },
                    { text: "【轉身離開】先不要去碰", action: () => {} }
                ]
            },
            {
                text: "水母的光芒映照在這塊碎片上... 耳邊響起細雨的聲音：\n「發光的水滴... 是牠們帶我來這裡的。如果跟著水流走，是不是就能回到熟悉的那個房間？」",
                options: [
                    { text: "【跟隨光芒】感受水流的溫度", action: () => { crystal.material.color.setHex(0xaaccff); } },
                    { text: "【保持警戒】退後一步觀察", action: () => {} }
                ]
            },
            {
                text: "碎片散發著孤獨且冰冷的光...\n「還有誰在等我回家嗎？那個總會在門口叫我吃飯的聲音，越來越模糊了... 我不能就在這裡停下來。」",
                options: [
                    { text: "【輕輕閉眼】試著用力回想那個聲音", action: () => { crystal.material.emissiveIntensity = 10; } },
                    { text: "【睜開雙眼】看著眼前這片不真實的風景", action: () => {} }
                ]
            }
        ];

        crystal.userData.dialogData = crystalDialogs[i];
        
        // Add floating animation updatable
        const initY = crystal.position.y;
        const offset = Math.random() * 10;
        levelState.updatables.push((dt) => {
            const time = performance.now() * 0.002;
            crystal.position.y = initY + Math.sin(time + offset) * 0.5;
            crystal.rotation.y += dt;
            crystal.rotation.x += dt * 0.5;
            // Update physics body to match floating unless dragged
            if(crystal.userData.physicsBody) {
                if(crystal.userData.physicsBody.sleepState === CANNON.Body.SLEEPING) {
                    crystal.userData.physicsBody.position.copy(crystal.position);
                    crystal.userData.physicsBody.quaternion.copy(crystal.quaternion);
                }
            }
        });
        
        createPhysicsObject(crystal, new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)), 1, true);
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

    createLevelDoor(0, -0.5, -20, 2); 
}
