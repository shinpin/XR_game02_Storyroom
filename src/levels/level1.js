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
    
    
    // Enhanced Water with Flow & Ripples Shader
    const lakeMat = matWater.clone();
    lakeMat.opacity = 0.95; // Boost opacity to preserve PBR reflections nicely
    
    const waveUniforms = { uTime: { value: 0 } };
    
    lakeMat.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = waveUniforms.uTime;
        
        // --- 1. Vertex Shader: Inject vWorldPos ---
        shader.vertexShader = `
            varying vec3 vWorldPos;
            ${shader.vertexShader}
        `.replace(
            `#include <project_vertex>`,
            `
            #include <project_vertex>
            vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
            `
        );

        // --- 2. Fragment Shader: Use vWorldPos for Ripples ---
        shader.fragmentShader = `
        uniform float uTime;
        varying vec3 vWorldPos;
        
        vec2 hash2(vec2 p) {
            p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
            return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
        }
        ` + shader.fragmentShader;
        
        shader.fragmentShader = shader.fragmentShader.replace(
            `#include <normal_fragment_begin>`,
            `
            #include <normal_fragment_begin>
            
            // --- Flowing River Normal ---
            vec2 uvScaled = vWorldPos.xz * 0.5; // use World XZ instead of undefined vUv
            vec2 flowUV = uvScaled + vec2(uTime * 0.4, uTime * 0.2);
            vec2 waveNormal = vec2(
                sin(flowUV.x) * cos(flowUV.y),
                cos(flowUV.x) * sin(flowUV.y)
            ) * 0.08; 
            
            // --- Rain Drops Ripples ---
            vec2 dropNormal = vec2(0.0);
            vec2 grid = floor(uvScaled * 2.0);
            vec2 fr = fract(uvScaled * 2.0);
            
            for(int y=-1; y<=1; y++) {
                for(int x=-1; x<=1; x++) {
                    vec2 offset = vec2(float(x), float(y));
                    vec2 cell = grid + offset;
                    
                    vec2 cellP = hash2(cell); 
                    vec2 center = offset + 0.5 + cellP * 0.4;
                    
                    vec2 diff = center - fr; 
                    float dist = length(diff);
                    
                    float randTime = fract(uTime * 1.5 + hash2(cell).x); 
                    float maxR = randTime * 1.2; 
                    
                    if (dist < maxR && dist > maxR - 0.2) {
                        float ring = sin((dist - maxR) * 15.0); 
                        float fade = 1.0 - randTime; 
                        dropNormal += diff * ring * fade * 0.3;
                    }
                }
            }
            
            // Perturb the view-space normal directly for quick fake-bump
            normal.xy += (waveNormal + dropNormal);
            normal = normalize(normal);
            `
        );
    };

    // Enlarge from 200 to 500 to prevent seeing edges
    const water = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), lakeMat);
    water.name = 'level1_lake_water'; // required for serializer
    water.userData.editable = true;   // required for serializer
    water.rotation.x = -Math.PI / 2;
    water.position.y = -15.0;
    water.position.z = 0; // Revert Z shift so it centers properly
    levelGroup.add(water);

    // Rain Lines (Falling Streaks)
    const rainCount = 1100; // Decreased particle count by another 50%
    const rainGeo = new THREE.BufferGeometry();
    const rainPositions = new Float32Array(rainCount * 2 * 3); // 2 points per line
    const rainVelocities = new Float32Array(rainCount);

    for (let i = 0; i < rainCount; i++) {
        const x = (Math.random() - 0.5) * 150;
        const y = Math.random() * 40 - 15;
        const z = (Math.random() - 0.5) * 150;
        const speed = -(Math.random() * 12 + 24); // dropping speed (Slowed by ~20%)

        rainPositions[i * 6 + 0] = x;
        rainPositions[i * 6 + 1] = y;
        rainPositions[i * 6 + 2] = z;
        
        // Second point of the line (streaks slightly upwards)
        rainPositions[i * 6 + 3] = x;
        rainPositions[i * 6 + 4] = y + (speed * -0.04); // Decreased line length by 20%
        rainPositions[i * 6 + 5] = z;

        rainVelocities[i] = speed;
    }

    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    const rainSystem = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({
        color: 0x88ccff, transparent: true, opacity: 0.4
    }));
    levelGroup.add(rainSystem);

    levelState.updatables.push((dt) => {
        // Update Shaders
        waveUniforms.uTime.value += dt;
        
        // Update Rain
        const positions = rainGeo.attributes.position.array;
        for (let i = 0; i < rainCount; i++) {
            const dy = rainVelocities[i] * dt;
            positions[i * 6 + 1] += dy;
            positions[i * 6 + 4] += dy;
            
            if (positions[i * 6 + 1] < -15.0) { // hit water
                const length = positions[i * 6 + 4] - positions[i * 6 + 1];
                positions[i * 6 + 1] = 25.0; // reset to sky
                positions[i * 6 + 4] = 25.0 + length;
                const newX = (Math.random() - 0.5) * 150;
                const newZ = (Math.random() - 0.5) * 150;
                positions[i * 6 + 0] = newX;
                positions[i * 6 + 3] = newX;
                positions[i * 6 + 2] = newZ;
                positions[i * 6 + 5] = newZ;
            }
        }
        rainGeo.attributes.position.needsUpdate = true;
    });

    const invisibleFloor = new THREE.Mesh(new THREE.BoxGeometry(500, 1, 500), matLight);
    invisibleFloor.visible = false;
    invisibleFloor.position.y = -15.50; // Top surface exactly at -15.0 for mathematically perfect physics resting
    createPhysicsObject(invisibleFloor, new CANNON.Box(new CANNON.Vec3(250, 0.5, 250)), 0);

    const lanternMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0xffaa00, emissiveIntensity: 3.5 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 1.0 });
    const weedMat = new THREE.MeshStandardMaterial({ color: 0x2e8b57, roughness: 0.9 });

    for(let i=0; i<360; i++) {
        if (i < 60) {
            const lRadius = 0.3 + Math.random()*0.4;
            const lanternGeo = new THREE.CylinderGeometry(lRadius, lRadius, 0.15, 16);
            const lantern = new THREE.Mesh(lanternGeo, lanternMat);
            lantern.position.set((Math.random()-0.5)*40, -14.9, (Math.random()-0.5)*40);
            createPhysicsObject(lantern, new CANNON.Cylinder(lRadius, lRadius, 0.15, 16), 1, true);
        }

        if(i < 30) {
            const wLen = 2 + Math.random()*3;
            const wRad = 0.2 + Math.random()*0.2;
            const wood = new THREE.Mesh(new THREE.CylinderGeometry(wRad, wRad, wLen, 8), woodMat);
            const q = new CANNON.Quaternion();
            q.setFromAxisAngle(new CANNON.Vec3(1,0,0), Math.PI/2);
            wood.position.set((Math.random()-0.5)*50, -14.9, (Math.random()-0.5)*50);
            const woodBody = createPhysicsObject(wood, new CANNON.Cylinder(wRad, wRad, wLen, 8), 5, true);
            woodBody.quaternion.copy(q);
        }

        const weedRad = 1 + Math.random();
        const weed = new THREE.Mesh(new THREE.CylinderGeometry(weedRad, weedRad, 0.05, 12), weedMat);
        weed.position.set((Math.random()-0.5)*120, -14.95, (Math.random()-0.5)*120);
        createPhysicsObject(weed, new CANNON.Cylinder(weedRad, weedRad, 0.05, 12), 2, true);
    }

    // Memory Crystals (Interactive puzzle elements)
    const crystalGeo = new THREE.OctahedronGeometry(0.5);
    const crystalMat = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x0088cc, emissiveIntensity: 4.0, transparent: true, opacity: 0.8 });
    
    for(let i=0; i<3; i++) {
        const crystal = new THREE.Mesh(crystalGeo, crystalMat.clone()); // clone material so each can change independently
        crystal.position.set((Math.random()-0.5)*20, -11.5, (Math.random()-0.5)*20 + 5);
        
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
    fishGroup.position.set(0, -10, -30); // Center the group right over the newly moved door
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
    mist.name = "Particles";
    mist.position.set(0, -7, -80);
    levelGroup.add(mist);



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
    });

    createLevelDoor(0, -8, -30, 2); 

    // Enable shadows for environment objects
    levelGroup.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.name === 'level1_lake_water' || child.name.includes('mist')) {
                child.castShadow = false; // Water shouldn't cast shadow
            }
        }
    });
}
