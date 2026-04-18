import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { scene, textureLoader } from '../core.js';
import { clearLevel, createPhysicsObject, createLevelDoor } from '../levelManager.js';
import { levelState, levelGroup, showDialog } from '../state.js';
import { parseLevel } from '../levelParser.js';
import { level3Config } from '../configs/level3_config.js';
import { world, physicsMaterial } from '../physics.js';
import { playLevelBGM } from '../audio.js';
import { restoreSceneState } from '../serializer.js';

export function loadLevel3() {
    clearLevel();
    parseLevel(level3Config);
    
    
    const matStone = new THREE.MeshStandardMaterial({ color: 0x111116, roughness: 0.9, metalness: 0.1 });
    const matGround = new THREE.MeshStandardMaterial({ color: 0x050508, roughness: 1.0 });

    const roomW = 30; // -15 to +15
    const roomZ = 40; // -20 to +20

    // Ground Floor (Terrain)
    const terrainGeo = new THREE.PlaneGeometry(roomW, roomZ, 16, 16);
    const terrain = new THREE.Mesh(terrainGeo, matGround);
    terrain.rotation.x = -Math.PI / 2; // Flat on ground
    terrain.position.set(0, 0, 0);     // 中心 0.0
    levelGroup.add(terrain);
    
    // Physics body for Terrain, physically slightly offset down to match surface at 0.0
    // We create the body manually instead of using createPhysicsObject so the main loop DOES NOT overwrite our PlaneGeometry's -90 degree rotation!
    const groundShape = new CANNON.Box(new CANNON.Vec3(roomW/2, 0.05, roomZ/2));
    const terrainBody = new CANNON.Body({ mass: 0, material: physicsMaterial, shape: groundShape });
    terrainBody.position.set(0, -0.05, 0); // 貼近下方的面
    world.addBody(terrainBody);
    // Explicitly do not push this to levelState.rigidBodies so its rotation is not overwritten.


    // Warrior Statues (Tomb feel)
    const gltfLoader = new GLTFLoader();
    gltfLoader.load('/worrior_x5.glb?time=' + Date.now(), (gltf) => {
        const warriorModel = gltf.scene;
        // Adjust scale to match the 4-unit tall obelisks
        warriorModel.scale.set(0.16, 0.16, 0.16); 
        
        warriorModel.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                if (child.material) {
                    child.material.envMapIntensity = 0.3;
                    // Force disable emissive so they do not glow
                    if (child.material.emissive) {
                        child.material.emissive.setHex(0x000000);
                        child.material.emissiveIntensity = 0;
                    }
                }
            }
        });

        // Arrange them like board edges, pushed outwards so they don't overlap the floor
        const zPositions = [-11, -7, -3, 1];
        for(let z of zPositions) {
            for(let x of [-7, 7]) {
                const statue = warriorModel.clone();
                statue.position.set(x, 0, z);
                
                if (x > 0) statue.rotation.y = -Math.PI / 2;
                else statue.rotation.y = Math.PI / 2;
                
                levelGroup.add(statue);
                
                const dummyPillar = new THREE.Mesh(new THREE.BoxGeometry(2, 6, 2));
                dummyPillar.visible = false;
                dummyPillar.position.set(x, 3, z);
                createPhysicsObject(dummyPillar, new CANNON.Box(new CANNON.Vec3(1, 3, 1)), 0);
            }
        }
    });

    // Tiger Statues (老虎雕像) at A and B Positions
    gltfLoader.load('/warrior_taiger.glb?time=' + Date.now(), (gltf) => {
        const tigerModel = gltf.scene;
        tigerModel.scale.set(0.16, 0.16, 0.16); // adjust scale as needed
        
        tigerModel.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                if (child.material) {
                    child.material.envMapIntensity = 0.3;
                    if (child.material.emissive) {
                        child.material.emissive.setHex(0x000000);
                        child.material.emissiveIntensity = 0;
                    }
                }
            }
        });

        // Place at A positions (near foreground)
        const tigerA1 = tigerModel.clone();
        tigerA1.position.set(-6, 0, -1);
        tigerA1.rotation.y = Math.PI / 4;
        levelGroup.add(tigerA1);

        const tigerA2 = tigerModel.clone();
        tigerA2.position.set(6, 0, -1);
        tigerA2.rotation.y = -Math.PI / 4;
        levelGroup.add(tigerA2);

        // Place at B positions (near back door)
        const tigerB1 = tigerModel.clone();
        tigerB1.name = 'Tiger_B1';
        tigerB1.userData.editable = true;
        tigerB1.position.set(-6, 0, -14);
        tigerB1.rotation.y = Math.PI * 0.8;
        levelGroup.add(tigerB1);

        const tigerB2 = tigerModel.clone();
        tigerB2.name = 'Tiger_B2';
        tigerB2.userData.editable = true;
        tigerB2.position.set(6, 0, -14);
        tigerB2.rotation.y = -Math.PI * 0.8;
        levelGroup.add(tigerB2);
    });

    gltfLoader.load('/FOX_ANI.glb?time=' + Date.now(), (gltf) => {
        const fox = gltf.scene;
        fox.name = 'Fox_NPC';
        fox.userData.editable = true;
        fox.scale.set(3, 3, 3);
        fox.position.set(-6, 0.5, -5);
        fox.rotation.y = Math.PI / 4;
        levelGroup.add(fox);
        
        // Setup simple physics collision (cylinder) for the Fox so you can't walk through IT
        const foxShape = new CANNON.Cylinder(1, 1, 3, 16);
        const foxBody = new CANNON.Body({ mass: 0, shape: foxShape }); // static
        foxBody.position.copy(fox.position);
        foxBody.position.y += 1.5; // Offset cylinder center
        
        // Wait until physics world is fully ready, but since it's async load, safe to assume it's created.
        import('../physics.js').then(({ world }) => {
            world.addBody(foxBody);
        });
        fox.userData.physicsBody = foxBody;
        
        // Restore layout overrides if any
        restoreSceneState(levelGroup);
    });

    const gridBaseZ = -5;
    const tileS = 2; 

    // Ceiling Skylight (天井照下來的光)
    const ceilingLight = new THREE.SpotLight(0xaaccff, 800, 40, Math.PI / 6, 0.6, 1);
    ceilingLight.name = 'CeilingSpotLight';
    ceilingLight.userData.editable = true;
    ceilingLight.position.set(0, 20, gridBaseZ);
    ceilingLight.target.position.set(0, 0, gridBaseZ);
    ceilingLight.castShadow = true;
    levelGroup.add(ceilingLight);
    levelGroup.add(ceilingLight.target);

    // Fenced ceiling (柵欄的天井)
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8, roughness: 0.2 });
    const fenceGroup = new THREE.Group();
    fenceGroup.position.set(0, 19.5, gridBaseZ);
    // Create bars crossing each other
    for(let i=-3; i<=3; i++) {
        const barX = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 8), ironMat);
        barX.rotation.z = Math.PI / 2;
        barX.position.set(0, 0, i * 1.5);
        fenceGroup.add(barX);
        
        const barZ = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 10), ironMat);
        barZ.rotation.x = Math.PI / 2;
        barZ.position.set(i * 1.2, 0, 0);
        fenceGroup.add(barZ);
    }
    levelGroup.add(fenceGroup);

    // Door crack light (門縫有光)
    const doorCrackLight = new THREE.PointLight(0xff8844, 200, 20);
    doorCrackLight.position.set(0, 0.5, -20);
    levelGroup.add(doorCrackLight);

    // Target Glowing Plates
    const targetPlate1 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.2, 1.8), new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xaa4400, emissiveIntensity: 2 }));
    targetPlate1.position.set(-tileS, 0.1, gridBaseZ - tileS*2);
    levelGroup.add(targetPlate1);

    const targetPlate2 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.2, 1.8), new THREE.MeshStandardMaterial({ color: 0x00aaff, emissive: 0x0044aa, emissiveIntensity: 2 }));
    targetPlate2.position.set(tileS, 0.1, gridBaseZ - tileS*2);
    levelGroup.add(targetPlate2);

    // Chessboard floor - made glossy and reflective
    const darkTileMat = new THREE.MeshStandardMaterial({ color: 0x020202, roughness: 0.1, metalness: 0.8 });
    const lightTileMat = new THREE.MeshStandardMaterial({ color: 0x777788, roughness: 0.15, metalness: 0.6 });
    for(let i=-2; i<=2; i++) {
        for(let j=-3; j<=3; j++) {
            const isD = (i+j)%2 === 0;
            const tile = new THREE.Mesh(new THREE.PlaneGeometry(tileS, tileS), isD ? darkTileMat : lightTileMat);
            tile.rotation.x = -Math.PI/2;
            tile.position.set(i*tileS, 0.01, gridBaseZ + j*tileS);
            levelGroup.add(tile);
        }
    }

    // Interactive Obelisks (Chess pieces)
    const obeGeo = new THREE.CylinderGeometry(0.4, 0.9, 4, 4);
    obeGeo.rotateY(Math.PI/4); // Square pyramid alignment

    const obe1 = new THREE.Mesh(obeGeo, matStone.clone());
    obe1.name = 'Pillar_Left';
    obe1.userData.editable = true;
    obe1.position.set(-tileS*2, 2, gridBaseZ + tileS*2);
    const body1 = createPhysicsObject(obe1, new CANNON.Box(new CANNON.Vec3(0.65, 2, 0.65)), 80, true);

    const obe2 = new THREE.Mesh(obeGeo, matStone.clone());
    obe2.name = 'Pillar_Right';
    obe2.userData.editable = true;
    obe2.position.set(tileS*2, 2, gridBaseZ + tileS*2);
    const body2 = createPhysicsObject(obe2, new CANNON.Box(new CANNON.Vec3(0.65, 2, 0.65)), 80, true);

    // Ensure they are interactable via Telekinesis
    obe1.userData.physicsBody = body1;
    obe1.userData.isInteractable = true;
    obe2.userData.physicsBody = body2;
    obe2.userData.isInteractable = true;
    levelState.interactables.push(obe1, obe2);

    // A+B Implementation: Interactive Pillars and Stone Door
    let activatedPillars = 0;
    
    // Hide the door initially by placing it in the world but scaling it down
    // The door is located at Z: -18 (edge of the 30x40 floor)
    let finalDoor = null;
    let doorPhysicsBody = null;
    const gltfLoader2 = new GLTFLoader();
    gltfLoader2.load('/door.glb?time=' + Date.now(), (gltf) => {
        finalDoor = gltf.scene;
        finalDoor.name = 'StoneDoor';
        finalDoor.userData.editable = true;
        finalDoor.scale.set(0.001, 0.001, 0.001); // Hidden scale
        finalDoor.position.set(0, 0, -18);
        levelGroup.add(finalDoor);
        
        // Create an invisible physics wall blocking the hallway BEFORE the door opens entirely.
        // It's static so player can't walk past Z = -18 initially.
        doorPhysicsBody = new CANNON.Body({ 
            mass: 0, 
            shape: new CANNON.Box(new CANNON.Vec3(6, 6, 1)) // large wall spanning 12x12
        });
        doorPhysicsBody.position.set(0, 6, -18);
        import('../physics.js').then(({ world }) => world.addBody(doorPhysicsBody));
        
        // Restore layout overrides if any
        restoreSceneState(levelGroup);
    });

    const activatePillar = (obeMesh) => {
        if (obeMesh.userData.isActivated) return;
        obeMesh.userData.isActivated = true;
        activatedPillars++;
        
        // Visual feedback
        obeMesh.material.color.setHex(0xaaaa55);
        obeMesh.material.emissive.setHex(0xffff00);
        obeMesh.material.emissiveIntensity = 0.5;

        // BGM or feedback SFX
        import('../audio.js').then(({ playLevelBGM }) => { /* play sfx */ });

        if (activatedPillars === 2) {
            import('../state.js').then(({ showDialog }) => {
                showDialog('封印解除... 古老的門面於深淵中浮現。');
            });
            // Reveal Door
            if (finalDoor) {
                // simple pop-up animation in update loop
                levelState.updatables.push((dt) => {
                    if (finalDoor.scale.x < 9.0) {
                        finalDoor.scale.addScalar(dt * 10);
                        finalDoor.position.y = (finalDoor.scale.x / 9.0) * 0.5; // slight rise
                    }
                });
                // Remove physics wall so player can walk through
                if (doorPhysicsBody) {
                    import('../physics.js').then(({ world }) => world.removeBody(doorPhysicsBody));
                }
            }
        } else {
             import('../state.js').then(({ showDialog }) => {
                showDialog('石柱發出微光，似乎還缺少什麼...');
            });
        }
    };

    // Bind interaction logic to the pillars
    obe1.userData.onInteract = () => activatePillar(obe1);
    obe2.userData.onInteract = () => activatePillar(obe2);

    // Initial restore for all synchronous objects
    restoreSceneState(levelGroup);
}

