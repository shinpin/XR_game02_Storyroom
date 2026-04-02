import * as THREE from 'three';
import * as CANNON from 'cannon-es';
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
    const doorMesh = new THREE.Mesh(new THREE.PlaneGeometry(3, 5), matLight);
    doorMesh.position.set(x, y + 2.5, z);
    levelGroup.add(doorMesh);
    
    const dLight = new THREE.PointLight(0xeeffff, 2, 10);
    dLight.position.set(x, y + 2.5, z + 1);
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
    for(let i=1; i<=5; i++) {
        const node = document.getElementById(`nav-val-${i}`);
        const link = document.getElementById(`nav-link-${i}`);
        if(node) {
            node.className = 'nav-point';
            if(i < idx) node.classList.add('passed');
            else if(i === idx) node.classList.add('active');
        }
        if(link && i < 5) {
            link.className = 'nav-link';
            if(i < idx) link.classList.add('passed');
        }
    }
}
