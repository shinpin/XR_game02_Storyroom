import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// ==========================================
// 1. ENGINE & PLAYER SETUP
// ==========================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020205);
scene.fog = new THREE.FogExp2(0x020205, 0.03); 

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.8, 8); 

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.xr.enabled = true; 
document.getElementById('app').appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();
const defaultEnv = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environment = defaultEnv;
const textureLoader = new THREE.TextureLoader();

const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.81, 0) });
world.broadphase = new CANNON.SAPBroadphase(world);

const physicsMaterial = new CANNON.Material('standard');
const physicsMatConfig = new CANNON.ContactMaterial(physicsMaterial, physicsMaterial, {
    friction: 0.6, restitution: 0.1, contactEquationStiffness: 1e8, contactEquationRelaxation: 3
});
world.addContactMaterial(physicsMatConfig);

// Player Rig
const controlsGroup = new THREE.Group();
camera.add(controlsGroup);
scene.add(camera);

const flashlight = new THREE.SpotLight(0xffffff, 5); 
flashlight.angle = Math.PI / 5;
flashlight.penumbra = 0.5;
flashlight.distance = 40;
flashlight.castShadow = true;
flashlight.position.set(0, -0.2, 0); 
flashlight.target.position.set(0, 0, -5); 
controlsGroup.add(flashlight);
controlsGroup.add(flashlight.target); 

const handGeo = new THREE.CapsuleGeometry(0.08, 0.3, 4, 8);
const handMat = new THREE.MeshStandardMaterial({ color: 0xffccaa, roughness: 0.6 });
const leftHand = new THREE.Mesh(handGeo, handMat);
leftHand.rotation.x = Math.PI / 2;
leftHand.position.set(-0.3, -0.3, -0.5);
controlsGroup.add(leftHand);
const rightHand = new THREE.Mesh(handGeo, handMat);
rightHand.rotation.x = Math.PI / 2;
rightHand.position.set(0.3, -0.3, -0.5);
controlsGroup.add(rightHand);


// ==========================================
// 2. LEVEL MANAGER 
// ==========================================
let levelGroup = new THREE.Group();
scene.add(levelGroup);

let levelState = {
    rigidBodies: [], // { mesh, body }
    interactables: [],
    updatables: [],
    doorTriggerBody: null,
    nextLevelParams: null
};

// Common Materials for Quick Construction
const matWater = new THREE.MeshStandardMaterial({ color: 0x0a1a2a, roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.9 });
const matStone = new THREE.MeshStandardMaterial({ color: 0x333338, roughness: 0.9, metalness: 0.1 });
const matGrass = new THREE.MeshStandardMaterial({ color: 0x113311, roughness: 0.9 });
const matWood = new THREE.MeshStandardMaterial({ color: 0x3d2314, roughness: 0.9 });
const matLight = new THREE.MeshBasicMaterial({ color: 0xeeffff });

function clearLevel() {
    // Clear three.js visual group
    scene.remove(levelGroup);
    levelGroup.traverse(child => {
        if(child.geometry) child.geometry.dispose();
        if(child.material) {
            if(Array.isArray(child.material)) child.material.forEach(m => m.dispose());
            else child.material.dispose();
        }
    });
    levelGroup = new THREE.Group();
    scene.add(levelGroup);
    
    // Clear physics bodies
    levelState.rigidBodies.forEach(obj => world.removeBody(obj.body));
    if (levelState.doorTriggerBody) world.removeBody(levelState.doorTriggerBody);
    
    // Reset state
    levelState = {
        rigidBodies: [],
        interactables: [],
        updatables: [],
        doorTriggerBody: null,
        nextLevelParams: null
    };
    
    // Reset visual defaults
    scene.environment = defaultEnv;
    scene.background = new THREE.Color(0x020205);
    scene.fog.density = 0.03;
    
    // Reset player position safely
    if (draggedBody) releaseTelekinesis();
    camera.position.set(0, 1.8, 8);
    camera.rotation.set(0,0,0);
}

function updateNavMap(idx) {
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

function createPhysicsObject(mesh, shape, mass, isInteractable = false) {
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

function createLevelDoor(x, y, z, nextLevelId) {
    // Visual door
    const doorMesh = new THREE.Mesh(new THREE.PlaneGeometry(3, 5), matLight);
    doorMesh.position.set(x, y + 2.5, z);
    levelGroup.add(doorMesh);
    
    const dLight = new THREE.PointLight(0xeeffff, 2, 10);
    dLight.position.set(x, y + 2.5, z + 1);
    levelGroup.add(dLight);

    // Physics Trigger (Ghost volume)
    const triggerBody = new CANNON.Body({
        isTrigger: true, mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3(1.5, 2.5, 1))
    });
    triggerBody.position.set(x, y + 2.5, z);
    world.addBody(triggerBody);
    levelState.doorTriggerBody = triggerBody;
    levelState.nextLevelParams = nextLevelId;
}


// ==========================================
// 3. THE 5 LEVELS
// ==========================================

function loadLevel1() {
    clearLevel();
    updateNavMap(1);
    
    // Skybox & Lighting
    textureLoader.load('/BG360_Treewater.jpg', (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.colorSpace = THREE.SRGBColorSpace;
        scene.background = texture;
        scene.environment = texture;
    });
    scene.fog.color.setHex(0xaaaaaa); 
    scene.fog.density = 0.01;
    
    // Water Floor
    const water = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), matWater);
    water.rotation.x = -Math.PI / 2;
    water.position.y = -1;
    levelGroup.add(water);

    // Floating Island 
    const island = new THREE.Mesh(new THREE.CylinderGeometry(15, 10, 4, 32), matGrass);
    island.position.y = -0.5;
    createPhysicsObject(island, new CANNON.Cylinder(15, 10, 4, 16), 0);
    
    // Giant Tree
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(2, 3, 10, 8), matWood);
    trunk.position.set(0, 5, -5);
    createPhysicsObject(trunk, new CANNON.Cylinder(2,3,10,8), 0);
    
    const leaves = new THREE.Mesh(new THREE.DodecahedronGeometry(8, 1), new THREE.MeshStandardMaterial({color: 0x228833}));
    leaves.position.set(0, 12, -5);
    levelGroup.add(leaves);
    
    // Sunlight
    const sun = new THREE.DirectionalLight(0xffffee, 3);
    sun.position.set(10, 20, 10);
    levelGroup.add(sun);
    
    createLevelDoor(0, 1, -2, 2); // Door in the trunk leading to level 2
}

function loadLevel2() {
    clearLevel();
    updateNavMap(2);
    
    // Skybox
    textureLoader.load('/BG360_VanGoghLabyrinth.jpg', (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.colorSpace = THREE.SRGBColorSpace;
        scene.background = texture;
        scene.environment = texture;
    });
    scene.fog.color.setHex(0x020510);
    scene.fog.density = 0.005; // less fog to see the sky
    
    // Floating Sky Island
    const platGeo = new THREE.CylinderGeometry(15, 8, 4, 8); // Octagon floating rock
    const plat = new THREE.Mesh(platGeo, matStone);
    plat.position.y = -0.75;
    createPhysicsObject(plat, new CANNON.Cylinder(15, 8, 4, 8), 0);
    
    // Fireflies (Particles)
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

    // Time Dial (Interactable massive wheel)
    const dialRadius = 3;
    const dialMesh = new THREE.Mesh(new THREE.CylinderGeometry(dialRadius, dialRadius, 1, 16), matWood);
    dialMesh.rotation.x = Math.PI / 2; // Face forward
    dialMesh.position.set(0, 5, -15);
    
    // Create interactable kinematic/dynamic body? Let's make it a free dynamic wheel anchored
    const dialShape = new CANNON.Cylinder(dialRadius, dialRadius, 1, 16);
    const dialBody = new CANNON.Body({ mass: 100, material: physicsMaterial });
    dialBody.addShape(dialShape);
    
    // Rotate body to match mesh
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
    
    // Hinge constraint to hold it in air
    const axis = new CANNON.Body({ mass: 0 });
    axis.position.copy(dialBody.position);
    world.addBody(axis);
    const hinge = new CANNON.HingeConstraint(axis, dialBody, {
        pivotA: new CANNON.Vec3(0,0,0), pivotB: new CANNON.Vec3(0,0,0),
        axisA: new CANNON.Vec3(0,0,1), axisB: new CANNON.Vec3(0,1,0) // Cylinder is Local Y
    });
    world.addConstraint(hinge);

    createLevelDoor(0, 0.5, -18, 3); 
}

function loadLevel3() {
    clearLevel();
    updateNavMap(3);
    scene.fog.color.setHex(0x020205); scene.background.setHex(0x020205);
    
    // Extracted Configuration
    const tileSize = 2; 
    const boardSizeX = 8;
    const boardSizeZ = 12; // Deeper room
    const roomWidthLength = (boardSizeX * tileSize) / 2;
    const roomDepthLength = (boardSizeZ * tileSize) / 2;
    
    // 1. Chessboard Floor
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

    // 2. Walls & Seams
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

    // 3. Front Wall & Doorway
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

    // 4. Skylight
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
    
    // Moonlight
    const skyLight = new THREE.DirectionalLight(0xddeeff, 5); 
    skyLight.position.set(0, 20, 0);
    levelGroup.add(skyLight);

    // 5. Chess Pieces (Aligned along walls)
    const pieceGeoObj = new THREE.BoxGeometry(1.2, 2.5, 1.2); 
    const pieceMatObj = new THREE.MeshStandardMaterial({ color: 0x333338, roughness: 0.7, metalness: 0.3 });
    const rows = 4;
    for(let i=0; i<rows; i++) {
        const depth = -roomDepthLength + 3 + (i * 2.5);
        // Left Piece
        const ml = new THREE.Mesh(pieceGeoObj, pieceMatObj);
        ml.position.set(-roomWidthLength + 1.5, 2, depth);
        ml.castShadow = true; ml.receiveShadow = true;
        createPhysicsObject(ml, new CANNON.Box(new CANNON.Vec3(0.6, 1.25, 0.6)), 30, true);
        // Right Piece
        const mr = new THREE.Mesh(pieceGeoObj, pieceMatObj);
        mr.position.set(roomWidthLength - 1.5, 2, depth);
        mr.castShadow = true; mr.receiveShadow = true;
        createPhysicsObject(mr, new CANNON.Box(new CANNON.Vec3(0.6, 1.25, 0.6)), 30, true);
    }

    createLevelDoor(0, 0.5, -roomDepthLength + 0.1, 4);
}

function loadLevel4() {
    clearLevel();
    updateNavMap(4);
    
    // Skybox
    textureLoader.load('/BG360_Chaos_Giant.jpg', (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.colorSpace = THREE.SRGBColorSpace;
        scene.background = texture;
        scene.environment = texture;
    });
    scene.fog.color.setHex(0x1a120c); 
    scene.fog.density = 0.003;
    
    // 1. Spawning Platform (Only enough for the player to stand on)
    const stepMat = new THREE.MeshStandardMaterial({ color: 0x4a4742, roughness: 0.9, flatShading: true });
    const startObj = new THREE.Mesh(new THREE.BoxGeometry(5, 1, 5), stepMat);
    startObj.position.set(0, -0.5, 8); 
    startObj.receiveShadow = true;
    createPhysicsObject(startObj, new CANNON.Box(new CANNON.Vec3(2.5, 0.5, 2.5)), 0);

    // 2. Floating Steps & Ambient Rocks
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
    
    // 3. The Stylized Magma Giant
    const giantGroup = new THREE.Group();
    giantGroup.position.set(0, 5, -80);
    levelGroup.add(giantGroup);
    
    const giantSkinMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
    const magmaMat = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff3300, emissiveIntensity: 2 });
    
    const torso = new THREE.Mesh(new THREE.BoxGeometry(20, 30, 15), giantSkinMat);
    torso.position.set(0, 15, 0);
    torso.castShadow = true; giantGroup.add(torso);
    
    const crack1 = new THREE.Mesh(new THREE.PlaneGeometry(5, 15), magmaMat);
    crack1.position.set(-5, 15, 7.6);
    crack1.rotation.z = Math.PI/6;
    giantGroup.add(crack1);
    
    const head = new THREE.Mesh(new THREE.BoxGeometry(8, 10, 8), giantSkinMat);
    head.position.set(0, 35, 2);
    giantGroup.add(head);
    
    const eye1 = new THREE.Mesh(new THREE.SphereGeometry(1.5), magmaMat);
    eye1.position.set(-2, 36, 6);
    giantGroup.add(eye1);
    const eye2 = new THREE.Mesh(new THREE.SphereGeometry(1.5), magmaMat);
    eye2.position.set(2, 36, 6);
    giantGroup.add(eye2);
    
    const arm = new THREE.Mesh(new THREE.BoxGeometry(6, 40, 6), giantSkinMat);
    arm.position.set(13, 20, 15);
    arm.rotation.x = Math.PI / 2.5; 
    arm.rotation.z = -Math.PI / 6;  
    giantGroup.add(arm);

    const armMagma = new THREE.Mesh(new THREE.BoxGeometry(6.2, 2, 6.2), magmaMat);
    armMagma.position.set(13, 20, 15);
    armMagma.rotation.copy(arm.rotation);
    giantGroup.add(armMagma);

    // 4. Lighting & Environment Reflection
    const magmaLight = new THREE.PointLight(0xff5500, 30, 150);
    magmaLight.position.set(0, 40, -70);
    magmaLight.castShadow = true;
    levelGroup.add(magmaLight);
    
    const sunLight = new THREE.DirectionalLight(0xffd588, 3);
    sunLight.position.set(-50, 60, -100);
    sunLight.target.position.set(0, 0, 0);
    sunLight.castShadow = true;
    levelGroup.add(sunLight);
    levelGroup.add(sunLight.target);

    // Final doorway near top step
    createLevelDoor(Math.sin(9 * 0.8) * 8, 9 * 2.5 + 2, -10 - (9*6), 5); 
}

function loadLevel5() {
    clearLevel();
    updateNavMap(5);
    scene.fog.color.setHex(0x221111); scene.background.setHex(0x221111);
    
    // Long hallway runway
    const runway = new THREE.Mesh(new THREE.BoxGeometry(20, 1, 60), matStone);
    runway.position.set(0, -0.5, -20);
    createPhysicsObject(runway, new CANNON.Box(new CANNON.Vec3(10, 0.5, 30)), 0);
    
    // Massive God Doors
    const doorGeo = new THREE.BoxGeometry(8, 20, 2);
    
    // Left Door (Red Face)
    const redMat = new THREE.MeshStandardMaterial({ color: 0xff4444, metalness: 0.5 });
    const leftDoor = new THREE.Mesh(doorGeo, redMat);
    leftDoor.position.set(-4, 10, -48);
    createPhysicsObject(leftDoor, new CANNON.Box(new CANNON.Vec3(4, 10, 1)), 0); // Closed
    
    // Right Door (Blue Face)
    const blueMat = new THREE.MeshStandardMaterial({ color: 0x4444ff, metalness: 0.5 });
    const rightDoor = new THREE.Mesh(doorGeo, blueMat);
    rightDoor.position.set(4, 10, -48);
    createPhysicsObject(rightDoor, new CANNON.Box(new CANNON.Vec3(4, 10, 1)), 0); // Closed
    
    // Epic Lights
    const l1 = new THREE.PointLight(0xff0000, 50, 50); l1.position.set(-4, 10, -40); levelGroup.add(l1);
    const l2 = new THREE.PointLight(0x0000ff, 50, 50); l2.position.set(4, 10, -40); levelGroup.add(l2);

    // End Game Goal! Nothing past here for now.
}


const levelLoaders = [null, loadLevel1, loadLevel2, loadLevel3, loadLevel4, loadLevel5];


// ==========================================
// 4. INTERACTION & CONTROLS
// ==========================================
const controls = new PointerLockControls(camera, document.body);
const gameUI = document.getElementById('game-ui');
const menuOverlay = document.getElementById('menu-overlay');

// Map UI buttons
document.getElementById('start-btn').addEventListener('click', () => {
    menuOverlay.style.display = 'none';
    gameUI.style.display = 'block';
    
    const selectedLvl = parseInt(document.getElementById('level-select').value);
    levelLoaders[selectedLvl](); // Load selected
    
    controls.lock();
});

controls.addEventListener('unlock', () => {
    // Player pressed ESC - return to menu
    gameUI.style.display = 'none';
    menuOverlay.style.display = 'flex';
});

const keys = { w: false, a: false, s: false, d: false };
document.addEventListener('keydown', (e) => { if (keys[e.key.toLowerCase()] !== undefined) keys[e.key.toLowerCase()] = true; });
document.addEventListener('keyup', (e) => { if (keys[e.key.toLowerCase()] !== undefined) keys[e.key.toLowerCase()] = false; });

// Telekinesis Logic
const raycaster = new THREE.Raycaster();
const crosshair = document.getElementById('crosshair');
let draggedBody = null;
let constraint = null;
const telekDistance = 5; 

const ghostBody = new CANNON.Body({ mass: 0, type: CANNON.BODY_TYPES.KINEMATIC, position: new CANNON.Vec3() });
world.addBody(ghostBody);

function releaseTelekinesis() {
    if (constraint) {
        world.removeConstraint(constraint);
        constraint = null; draggedBody = null;
        crosshair.classList.remove('active');
        rightHand.position.y -= 0.1; leftHand.position.y -= 0.1;
    }
}

window.addEventListener('mousedown', () => {
    if (!controls.isLocked) return;
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(levelState.interactables);
    if (intersects.length > 0) {
        draggedBody = intersects[0].object.userData.physicsBody;
        draggedBody.wakeUp();

        const targetPos = new THREE.Vector3();
        camera.getWorldDirection(targetPos);
        targetPos.multiplyScalar(telekDistance).add(camera.position);
        ghostBody.position.copy(targetPos);
        
        constraint = new CANNON.PointToPointConstraint(ghostBody, new CANNON.Vec3(0,0,0), draggedBody, new CANNON.Vec3(0,0,0));
        world.addConstraint(constraint);
        crosshair.classList.add('active');
        rightHand.position.y += 0.1; leftHand.position.y += 0.1;
    }
});
window.addEventListener('mouseup', releaseTelekinesis);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ==========================================
// 5. RENDER LOOP
// ==========================================
const clock = new THREE.Clock();
const moveSpeed = 6;
// physics update proxy
const playerBodyShape = new CANNON.Sphere(0.5);

renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.1);
    
    // Pre-menu background rotation/panning (Optional polish)
    if (!controls.isLocked && menuOverlay.style.display !== 'none') {
         camera.rotation.y += dt * 0.1; 
    }

    if (controls.isLocked) {
        if (keys.w) controls.moveForward(moveSpeed * dt);
        if (keys.s) controls.moveForward(-moveSpeed * dt);
        if (keys.a) controls.moveRight(-moveSpeed * dt);
        if (keys.d) controls.moveRight(moveSpeed * dt);
        
        const bob = Math.sin(clock.elapsedTime * 8) * 0.02;
        const baseBob = (keys.w||keys.s||keys.a||keys.d) ? bob : 0;
        if(!constraint){
            rightHand.position.y = -0.3 + baseBob;
            leftHand.position.y = -0.3 + baseBob;
        }

        // Check Door Trigger
        if (levelState.doorTriggerBody) {
            // Simple distance check from camera to trigger volume
            const dx = camera.position.x - levelState.doorTriggerBody.position.x;
            const dz = camera.position.z - levelState.doorTriggerBody.position.z;
            const dist = Math.sqrt(dx*dx + dz*dz);
            if (dist < 2.0) { // Walked into trigger radius
                if(levelLoaders[levelState.nextLevelParams]) {
                   levelLoaders[levelState.nextLevelParams](); // Load next!
                }
            }
        }
    }
    
    if (constraint) {
        const targetPos = new THREE.Vector3();
        camera.getWorldDirection(targetPos);
        targetPos.multiplyScalar(telekDistance).add(camera.position);
        
        const curPos = new THREE.Vector3().copy(ghostBody.position);
        curPos.lerp(targetPos, 0.4);
        ghostBody.position.copy(curPos);
        
        draggedBody.angularVelocity.scale(0.9, draggedBody.angularVelocity);
        draggedBody.velocity.scale(0.9, draggedBody.velocity);
    }
    
    world.step(1/60, dt, 3);
    
    for (const obj of levelState.rigidBodies) {
        obj.mesh.position.copy(obj.body.position);
        obj.mesh.quaternion.copy(obj.body.quaternion);
    }
    
    for (const updateFn of levelState.updatables) {
        updateFn(dt);
    }
    
    renderer.render(scene, camera);
});

// Load a default background scene for the menu
loadLevel3(); 
