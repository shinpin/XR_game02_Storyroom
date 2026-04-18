import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { scene, camera, defaultEnv } from './core.js';
import { world, physicsMaterial } from './physics.js';
import { levelGroup, levelState, resetLevelGroup, resetLevelState } from './state.js';
import { releaseTelekinesis, draggedBody } from './player.js';
import { stopLevelBGM } from './audio.js';
import { globalMaterials, matLight } from './materials.js';

export function clearLevel() {
    // Release textures to prevent memory leaks
    if (scene.background && scene.background.isTexture && scene.background !== defaultEnv) {
        scene.background.dispose();
    }
    if (scene.environment && scene.environment.isTexture && scene.environment !== defaultEnv) {
        scene.environment.dispose();
    }

    scene.remove(levelGroup);
    levelGroup.traverse(child => {
        if(child.geometry) child.geometry.dispose();
        if(child.material) {
            // Only dispose non-global materials
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach(m => {
                if (!globalMaterials.includes(m)) {
                    m.dispose();
                }
            });
        }
    });

    resetLevelGroup();
    scene.add(levelGroup);
    
    levelState.rigidBodies.forEach(obj => world.removeBody(obj.body));
    if (levelState.doorTriggerBody) world.removeBody(levelState.doorTriggerBody);
    
    resetLevelState();
    
    scene.environment = defaultEnv;
    scene.background = new THREE.Color(0x020205);
    scene.fog.density = 0.03;
    
    if (draggedBody) releaseTelekinesis();
    stopLevelBGM();
    camera.position.set(0, 1.8, 8);
    camera.rotation.set(0,0,0);
}

export function createPhysicsObject(mesh, shape, mass, isInteractable = false) {
    levelGroup.add(mesh);
    const body = new CANNON.Body({ mass, material: physicsMaterial, shape, linearDamping: 0.2, angularDamping: 0.2 });
    body.position.copy(mesh.position);
    body.quaternion.copy(mesh.quaternion);
    world.addBody(body);
    levelState.rigidBodies.push({ mesh, body });
    if(isInteractable) {
        mesh.userData.physicsBody = body;
        mesh.userData.isInteractable = true;
        levelState.interactables.push(mesh);
    }
    return body;
}

export function createLevelDoor(x, y, z, nextLevelId) {
    const gltfLoader = new GLTFLoader();
    // Use a unique query string to bypass browser cache and prevent disposed geometry bugs when changing levels
    gltfLoader.load('/door.glb?time=' + Date.now() + Math.random(), (gltf) => {
        const doorModel = gltf.scene;
        
        // Enlarge by 6 times (base was 1.5, so 1.5 * 6 = 9.0)
        doorModel.scale.set(9.0, 9.0, 9.0);
        doorModel.position.set(x, y, z);
        doorModel.name = 'level_door_target'; // Set unique name for Saving
        doorModel.userData.editable = true;   // Allow editing in Inspector
        
        doorModel.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                if (child.material) {
                    if (child.material.emissive) {
                        child.material.emissive.setHex(0xaaaaaa); 
                        child.material.emissiveIntensity = 0.2;
                        child.material.side = THREE.DoubleSide;
                    } else {
                        child.material = new THREE.MeshStandardMaterial({
                            color: child.material.color || 0xffffff,
                            emissive: 0xaaaaaa,
                            emissiveIntensity: 0.2,
                            side: THREE.DoubleSide
                        });
                    }
                }
            }
        });
        
        levelGroup.add(doorModel);
    });
    
    // Add a faint light so it acts as a guiding beacon
    const dLight = new THREE.PointLight(0xffddaa, 2, 8);
    dLight.position.set(x, y + 2.5, z + 1.5);
    levelGroup.add(dLight);

    const triggerBody = new CANNON.Body({
        isTrigger: true, mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3(1.5, 2.5, 1))
    });
    triggerBody.position.set(x, y + 2.5, z);
    world.addBody(triggerBody);
    levelState.doorTriggerBody = triggerBody;
    levelState.nextLevelParams = nextLevelId;
}

export function updateNavMap(idx) {
    if(!document.getElementById('nav-val-1')) return;
    
    // Pin positions (SVG centroid of each zone)
    const pinPositions = {
        1: { x: 42, y: 174 },
        2: { x: 40, y: 131 },
        3: { x: 98, y: 122 },
        4: { x: 150, y: 112 },
        5: { x: 128, y: 50 }
    };
    
    for(let i = 1; i <= 5; i++) {
        const node = document.getElementById(`nav-val-${i}`);
        if(node) {
            // SVG-safe: use setAttribute instead of className
            let cls = 'map-zone';
            if(i < idx) cls += ' passed';
            else if(i === idx) cls += ' active';
            node.setAttribute('class', cls);
        }
    }
    
    // Move the location pin to current zone
    const pin = document.getElementById('nav-pin');
    if(pin && pinPositions[idx]) {
        pin.setAttribute('x', pinPositions[idx].x);
        pin.setAttribute('y', pinPositions[idx].y);
    }
}
