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
    
    levelState.playerBaseY = 0.5;

    textureLoader.load('/BG360_VanGoghLabyrinth.jpg', (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.colorSpace = THREE.SRGBColorSpace;
        scene.background = texture;
        scene.environment = texture;
    });
    scene.fog.color.setHex(0x080414); // Deep starry indigo
    scene.fog.density = 0.018; 

    // Abstract Lighting
    const illMat1 = new THREE.MeshStandardMaterial({ color: 0xaa22ff, emissive: 0x4400aa, transparent: true, opacity: 0.85 });
    const illMat2 = new THREE.MeshStandardMaterial({ color: 0x22aaff, emissive: 0x0044aa, transparent: true, opacity: 0.85 });
    const sun = new THREE.DirectionalLight(0xddccff, 2);
    sun.position.set(10, 20, -10);
    levelGroup.add(sun);
    
    const floorY = -0.6; // Player is at 0.5, block thickness is 1, so top is -0.1

    // Floating Maze Platform Matrix (0=void, 1=path, 2=spawn, 3=altar)
    const mazeLayout = [
        "    333    ",
        "    333    ",
        "    333    ",
        "     1     ",
        "  1111111  ",
        "  1     1  ",
        "  1 111 1  ",
        "  1 1 1 1  ",
        "  111 111  ",
        "      1    ",
        "      2    "
    ];
    const cellSize = 4;
    const startX = -6 * cellSize; // so xIndex=6 is X=0
    const startZ = -5 * cellSize;

    mazeLayout.forEach((row, zIndex) => {
        for(let xIndex=0; xIndex<row.length; xIndex++) {
            const char = row[xIndex];
            if(char === ' ' || char === '2' || char === '3') continue;

            const px = startX + xIndex * cellSize;
            const pz = startZ + zIndex * cellSize;
            
            const mat = Math.random() > 0.5 ? matWood : matGrass;
            const block = new THREE.Mesh(new THREE.BoxGeometry(cellSize, 1, cellSize), mat);
            block.position.set(px, floorY, pz);
            createPhysicsObject(block, new CANNON.Box(new CANNON.Vec3(cellSize/2, 0.5, cellSize/2)), 0);
        }
    });

    // Spawn Block
    const spawnBlock = new THREE.Mesh(new THREE.BoxGeometry(6, 1, 6), matWood);
    spawnBlock.position.set(0, floorY, startZ + 10 * cellSize);
    createPhysicsObject(spawnBlock, new CANNON.Box(new CANNON.Vec3(3, 0.5, 3)), 0);

    // Altar Base
    const altarX = startX + 5 * cellSize;
    const altarZ = startZ + 1 * cellSize;
    const altarBase = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 2, 32), matWood);
    altarBase.position.set(altarX, floorY - 0.5, altarZ);
    createPhysicsObject(altarBase, new CANNON.Cylinder(8, 8, 1, 32), 0);

    // Illusory Geometry (Floating & Rotating)
    const icosa = new THREE.Mesh(new THREE.IcosahedronGeometry(7, 0), illMat1);
    icosa.position.set(altarX - 25, 8, altarZ + 10);
    levelGroup.add(icosa);
    
    const torus = new THREE.Mesh(new THREE.TorusGeometry(12, 1, 16, 100), illMat2);
    torus.position.set(altarX + 30, 16, altarZ - 5);
    torus.rotation.x = Math.PI / 3;
    levelGroup.add(torus);

    // Deco dead-end floating islands
    for(let i=0; i<6; i++) {
        const dSize = 3;
        const block = new THREE.Mesh(new THREE.BoxGeometry(dSize, 1, dSize), matGrass);
        block.position.set(altarX + (Math.random()-0.5)*80, floorY + Math.random()*2 - 1, altarZ + 20 + Math.random()*20);
        
        const q = new CANNON.Quaternion();
        q.setFromEuler((Math.random()-0.5)*0.2, 0, (Math.random()-0.5)*0.2);
        const body = createPhysicsObject(block, new CANNON.Box(new CANNON.Vec3(dSize/2, 0.5, dSize/2)), 0);
        body.quaternion.copy(q);
    }

    levelState.updatables.push((dt) => {
        icosa.rotation.x += dt * 0.15;
        icosa.rotation.y += dt * 0.25;
        torus.rotation.z += dt * 0.1;
        torus.rotation.y -= dt * 0.15;
    });

    // Dial Puzzle mounted on Altar
    const dialRadius = 3;
    const dialMesh = new THREE.Mesh(new THREE.CylinderGeometry(dialRadius, dialRadius, 1, 16), matGrass);
    dialMesh.rotation.x = Math.PI / 2; 
    dialMesh.position.set(altarX, floorY + 4, altarZ);
    
    const dialShape = new CANNON.Cylinder(dialRadius, dialRadius, 1, 16);
    const dialBody = new CANNON.Body({ mass: 100, material: physicsMaterial });
    dialBody.addShape(dialShape);
    
    const qDial = new CANNON.Quaternion();
    qDial.setFromAxisAngle(new CANNON.Vec3(1,0,0), Math.PI/2);
    dialBody.quaternion.copy(qDial);
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

    // Starry Void Fireflies
    const fireflyGeo = new THREE.BufferGeometry();
    const fireflyCount = 600;
    const pos = new Float32Array(fireflyCount * 3);
    for(let i=0; i<fireflyCount*3; i++) pos[i] = (Math.random() - 0.5) * 80;
    fireflyGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const fireflyMat = new THREE.PointsMaterial({ color: 0xaaeeff, size: 0.15, transparent: true, blending: THREE.AdditiveBlending });
    const fireflies = new THREE.Points(fireflyGeo, fireflyMat);
    fireflies.position.y = 2;
    levelGroup.add(fireflies);
    
    let puzzleSolved = false;
    const initialRotation = new THREE.Vector3().setFromEuler(dialMesh.rotation).length();

    // Create a flash light for puzzle completion
    const flashLight = new THREE.PointLight(0xffffff, 0, 50);
    flashLight.position.set(altarX, floorY + 4, altarZ);
    levelGroup.add(flashLight);

    levelState.updatables.push((dt) => {
        if (!puzzleSolved) {
            const currentRotation = new THREE.Vector3().setFromEuler(dialMesh.rotation).length();
            const diff = Math.abs(currentRotation - initialRotation);
            // If rotated more than ~45 degrees (0.8 radians)
            if (diff > 0.8) {
                puzzleSolved = true;
                // Visual Flash
                flashLight.intensity = 5;
                dialMesh.material.color.setHex(0xaaffaa);
                setTimeout(() => { flashLight.intensity = 0; }, 500);
                
                // Spawn the Door
                createLevelDoor(altarX, floorY + 1.5, altarZ - 8, 3); 
                import('../state.js').then(({ showDialog }) => {
                    showDialog('古老的機關發出轟鳴聲... 一扇光門在祭壇後方展開。');
                });
            }
        }
        
        fireflies.rotation.y += dt * 0.04;
    });
}

