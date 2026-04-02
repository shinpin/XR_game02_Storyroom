import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { scene } from '../core.js';
import { clearLevel, updateNavMap, createPhysicsObject } from '../levelManager.js';
import { levelGroup } from '../state.js';
import { matStone } from '../materials.js';

export function loadLevel5() {
    clearLevel();
    updateNavMap(5);
    scene.fog.color.setHex(0x221111); scene.background.setHex(0x221111);
    
    const runway = new THREE.Mesh(new THREE.BoxGeometry(20, 1, 60), matStone);
    runway.position.set(0, -0.5, -20);
    createPhysicsObject(runway, new CANNON.Box(new CANNON.Vec3(10, 0.5, 30)), 0);
    
    const doorGeo = new THREE.BoxGeometry(8, 20, 2);
    
    const redMat = new THREE.MeshStandardMaterial({ color: 0xff4444, metalness: 0.5 });
    const leftDoor = new THREE.Mesh(doorGeo, redMat);
    leftDoor.position.set(-4, 10, -48);
    createPhysicsObject(leftDoor, new CANNON.Box(new CANNON.Vec3(4, 10, 1)), 0); 
    
    const blueMat = new THREE.MeshStandardMaterial({ color: 0x4444ff, metalness: 0.5 });
    const rightDoor = new THREE.Mesh(doorGeo, blueMat);
    rightDoor.position.set(4, 10, -48);
    createPhysicsObject(rightDoor, new CANNON.Box(new CANNON.Vec3(4, 10, 1)), 0); 
    
    const l1 = new THREE.PointLight(0xff0000, 50, 50); l1.position.set(-4, 10, -40); levelGroup.add(l1);
    const l2 = new THREE.PointLight(0x0000ff, 50, 50); l2.position.set(4, 10, -40); levelGroup.add(l2);
}
