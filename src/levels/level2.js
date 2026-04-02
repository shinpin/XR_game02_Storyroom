import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { scene, textureLoader } from '../core.js';
import { clearLevel, updateNavMap, createPhysicsObject, createLevelDoor } from '../levelManager.js';
import { playLevelBGM } from '../audio.js';
import { levelState, levelGroup } from '../state.js';
import { matGrass, matWood } from '../materials.js';
import { world, physicsMaterial } from '../physics.js';

export function loadLevel2() {
    clearLevel();
    updateNavMap(2);
    playLevelBGM('/BGM_02.mp3');
    
    textureLoader.load('/BG360_VanGoghLabyrinth.jpg', (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.colorSpace = THREE.SRGBColorSpace;
        scene.background = texture;
        scene.environment = texture;
    });
    scene.fog.color.setHex(0x020510);
    scene.fog.density = 0.005; 
    
    for(let i=0; i<15; i++) {
        const size = 3 + Math.random()*4;
        const block = new THREE.Mesh(new THREE.BoxGeometry(size, 0.5, size), matGrass);
        const px = (Math.random()-0.5)*30;
        const pz = (Math.random()-0.5)*30;
        const py = -1.0 + (Math.random()*1.0); 
        block.position.set(px, py, pz);
        createPhysicsObject(block, new CANNON.Box(new CANNON.Vec3(size/2, 0.25, size/2)), 0);
    }
    
    const spawnBlock = new THREE.Mesh(new THREE.BoxGeometry(10, 0.5, 10), matGrass);
    spawnBlock.position.set(0, -1.0, 8);
    createPhysicsObject(spawnBlock, new CANNON.Box(new CANNON.Vec3(5, 0.25, 5)), 0);
    
    const dialPad = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 0.5, 16), matGrass);
    dialPad.position.set(0, -1.0, -15);
    createPhysicsObject(dialPad, new CANNON.Cylinder(5, 5, 0.5, 16), 0);
    
    const fireflyGeo = new THREE.BufferGeometry();
    const fireflyCount = 200;
    const pos = new Float32Array(fireflyCount * 3);
    for(let i=0; i<fireflyCount*3; i++) pos[i] = (Math.random() - 0.5) * 40;
    fireflyGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const fireflyMat = new THREE.PointsMaterial({ color: 0xaaff00, size: 0.2, transparent: true, blending: THREE.AdditiveBlending });
    const fireflies = new THREE.Points(fireflyGeo, fireflyMat);
    fireflies.position.y = 5;
    levelGroup.add(fireflies);
    
    levelState.updatables.push((dt) => {
        fireflies.rotation.y += dt * 0.1;
    });

    const dialRadius = 3;
    const dialMesh = new THREE.Mesh(new THREE.CylinderGeometry(dialRadius, dialRadius, 1, 16), matWood);
    dialMesh.rotation.x = Math.PI / 2; 
    dialMesh.position.set(0, 5, -15);
    
    const dialShape = new CANNON.Cylinder(dialRadius, dialRadius, 1, 16);
    const dialBody = new CANNON.Body({ mass: 100, material: physicsMaterial });
    dialBody.addShape(dialShape);
    
    const q = new CANNON.Quaternion();
    q.setFromAxisAngle(new CANNON.Vec3(1,0,0), Math.PI/2);
    dialBody.quaternion.copy(q);
    dialBody.position.copy(dialMesh.position);
    world.addBody(dialBody);
    
    levelGroup.add(dialMesh);
    levelState.rigidBodies.push({ mesh: dialMesh, body: dialBody });
    dialMesh.userData.physicsBody = dialBody;
    dialMesh.userData.isInteractable = true;
    levelState.interactables.push(dialMesh);
    
    const axis = new CANNON.Body({ mass: 0 });
    axis.position.copy(dialBody.position);
    world.addBody(axis);
    const hinge = new CANNON.HingeConstraint(axis, dialBody, {
        pivotA: new CANNON.Vec3(0,0,0), pivotB: new CANNON.Vec3(0,0,0),
        axisA: new CANNON.Vec3(0,0,1), axisB: new CANNON.Vec3(0,1,0)
    });
    world.addConstraint(hinge);

    createLevelDoor(0, 0.5, -18, 3); 
}
