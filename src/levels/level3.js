import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { scene } from '../core.js';
import { clearLevel, updateNavMap, createPhysicsObject, createLevelDoor } from '../levelManager.js';
import { levelState, levelGroup, showDialog } from '../state.js';
import { world, physicsMaterial } from '../physics.js';

export function loadLevel3() {
    clearLevel();
    updateNavMap(3);
    scene.fog.color.setHex(0x020205); scene.background.setHex(0x020205);
    
    const tileSize = 2; 
    const boardSizeX = 8;
    const boardSizeZ = 12; 
    const roomWidthLength = (boardSizeX * tileSize) / 2;
    const roomDepthLength = (boardSizeZ * tileSize) / 2;
    
    const boardGroup = new THREE.Group();
    const groundShape = new CANNON.Box(new CANNON.Vec3(roomWidthLength, 0.5, roomDepthLength));
    const groundBody = new CANNON.Body({ mass: 0, material: physicsMaterial });
    groundBody.addShape(groundShape);
    groundBody.position.set(0, -0.5, 0); 
    world.addBody(groundBody);
    levelState.rigidBodies.push({ mesh: new THREE.Mesh(), body: groundBody });

    const darkMat = new THREE.MeshStandardMaterial({ color: 0x050511, roughness: 0.05, metalness: 0.8 });
    const lightMat = new THREE.MeshStandardMaterial({ color: 0x8899aa, roughness: 0.05, metalness: 0.8 });
    const tileGeo = new THREE.BoxGeometry(tileSize, 0.2, tileSize);

    for (let i = 0; i < boardSizeX; i++) {
        for (let j = 0; j < boardSizeZ; j++) {
            const isDark = (i + j) % 2 === 0;
            const tile = new THREE.Mesh(tileGeo, isDark ? darkMat : lightMat);
            const xPos = (i - boardSizeX / 2 + 0.5) * tileSize;
            const zPos = (j - boardSizeZ / 2 + 0.5) * tileSize;
            tile.position.set(xPos, -0.1, zPos);
            tile.receiveShadow = true;
            boardGroup.add(tile);
        }
    }
    levelGroup.add(boardGroup);

    const archMat = new THREE.MeshStandardMaterial({ color: 0x111115, roughness: 0.8, metalness: 0.2 });
    const emissiveMat = new THREE.MeshStandardMaterial({ color: 0x4488ff, emissive: 0x2266ff, emissiveIntensity: 2 });
    
    const addStaticPhysicsBox = (w, h, d, x, y, z) => {
        const body = new CANNON.Body({ mass: 0, material: physicsMaterial });
        body.addShape(new CANNON.Box(new CANNON.Vec3(w/2, h/2, d/2)));
        body.position.set(x, y, z);
        world.addBody(body);
        levelState.rigidBodies.push({ mesh: new THREE.Mesh(), body: body });
    };

    function buildSideWall(xOffset) {
        const numBlocksZ = 6;
        const blockDepth = (boardSizeZ * tileSize) / numBlocksZ;
        for(let i=0; i<numBlocksZ; i++) {
            const zPos = -roomDepthLength + (i * blockDepth) + (blockDepth/2);
            const wMesh = new THREE.Mesh(new THREE.BoxGeometry(2, 10, blockDepth - 0.2), archMat);
            wMesh.position.set(xOffset, 5, zPos);
            wMesh.receiveShadow = true;
            levelGroup.add(wMesh);
            if (i < numBlocksZ - 1) {
                const seam = new THREE.Mesh(new THREE.BoxGeometry(1.9, 10, 0.2), emissiveMat);
                seam.position.set(xOffset, 5, zPos + (blockDepth/2));
                levelGroup.add(seam);
                const seamLight = new THREE.PointLight(0x4488ff, 1, 8);
                seamLight.position.copy(seam.position);
                levelGroup.add(seamLight);
            }
        }
        addStaticPhysicsBox(2, 10, boardSizeZ * tileSize, xOffset, 5, 0);
    }
    buildSideWall(-roomWidthLength - 1);
    buildSideWall(roomWidthLength + 1);

    const doorWidth = 4;
    const doorHeight = 6;
    const fwLeftGeo = new THREE.BoxGeometry((roomWidthLength * 2 - doorWidth)/2, 10, 2);
    const fwLeft = new THREE.Mesh(fwLeftGeo, archMat);
    fwLeft.position.set(-roomWidthLength + ((roomWidthLength * 2 - doorWidth)/4), 5, -roomDepthLength - 1);
    levelGroup.add(fwLeft);
    addStaticPhysicsBox((roomWidthLength * 2 - doorWidth)/2, 10, 2, fwLeft.position.x, fwLeft.position.y, fwLeft.position.z);

    const fwRight = new THREE.Mesh(fwLeftGeo, archMat);
    fwRight.position.set(roomWidthLength - ((roomWidthLength * 2 - doorWidth)/4), 5, -roomDepthLength - 1);
    levelGroup.add(fwRight);
    addStaticPhysicsBox((roomWidthLength * 2 - doorWidth)/2, 10, 2, fwRight.position.x, fwRight.position.y, fwRight.position.z);

    const fwTop = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, 10 - doorHeight, 2), archMat);
    fwTop.position.set(0, doorHeight + (10 - doorHeight)/2, -roomDepthLength - 1);
    levelGroup.add(fwTop);
    addStaticPhysicsBox(doorWidth, 10 - doorHeight, 2, fwTop.position.x, fwTop.position.y, fwTop.position.z);

    const ceilGeo = new THREE.BoxGeometry(roomWidthLength*2 + 4, 1, roomDepthLength*2 + 4);
    const ceiling = new THREE.Mesh(ceilGeo, archMat);
    ceiling.position.set(0, 10, 0); 
    levelGroup.add(ceiling);
    
    const grillMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9, metalness: 0.5 });
    const cross1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 6), grillMat);
    cross1.position.set(0, 9.5, 0);
    levelGroup.add(cross1);
    const cross2 = new THREE.Mesh(new THREE.BoxGeometry(6, 0.5, 0.5), grillMat);
    cross2.position.set(0, 9.5, 0);
    levelGroup.add(cross2);
    
    const skyLight = new THREE.DirectionalLight(0xddeeff, 5); 
    skyLight.position.set(0, 20, 0);
    levelGroup.add(skyLight);

    const pieceGeoObj = new THREE.BoxGeometry(1.2, 2.5, 1.2); 
    const pieceMatObj = new THREE.MeshStandardMaterial({ color: 0x333338, roughness: 0.7, metalness: 0.3 });
    const rows = 4;
    for(let i=0; i<rows; i++) {
        const depth = -roomDepthLength + 3 + (i * 2.5);
        const ml = new THREE.Mesh(pieceGeoObj, pieceMatObj);
        ml.position.set(-roomWidthLength + 1.5, 2, depth);
        ml.castShadow = true; ml.receiveShadow = true;
        createPhysicsObject(ml, new CANNON.Box(new CANNON.Vec3(0.6, 1.25, 0.6)), 30, true);
        const mr = new THREE.Mesh(pieceGeoObj, pieceMatObj);
        mr.position.set(roomWidthLength - 1.5, 2, depth);
        mr.castShadow = true; mr.receiveShadow = true;
        createPhysicsObject(mr, new CANNON.Box(new CANNON.Vec3(0.6, 1.25, 0.6)), 30, true);
    }

    // Pressure Plate Puzzle
    const plateGeo = new THREE.BoxGeometry(3, 0.2, 3);
    const plateMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0x550000, emissiveIntensity: 1 });
    const plate = new THREE.Mesh(plateGeo, plateMat);
    const targetZ = -roomDepthLength + 5;
    plate.position.set(0, -0.4, targetZ);
    levelGroup.add(plate);

    let doorUnlocked = false;

    levelState.updatables.push((dt) => {
        if(doorUnlocked) return;
        let pressed = false;
        for (const obj of levelState.rigidBodies) {
            if (obj.body.mass > 0) {
                const dist = Math.sqrt(
                    Math.pow(obj.body.position.x - plate.position.x, 2) + 
                    Math.pow(obj.body.position.z - plate.position.z, 2)
                );
                if (dist < 2.0 && obj.body.position.y < 2.0) {
                    pressed = true;
                    break;
                }
            }
        }
        
        if (pressed) {
            plateMat.color.setHex(0x00ff00);
            plateMat.emissive.setHex(0x008800);
            doorUnlocked = true;
            createLevelDoor(0, 0.5, -roomDepthLength + 0.1, 4);
            showDialog('祭壇感應到實體... 古老的遺忘之門開啟了。');
        }
    });

}

