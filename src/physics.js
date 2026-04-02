import * as CANNON from 'cannon-es';

export const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.81, 0) });
export const physicsMaterial = new CANNON.Material('standard');
const physicsMatConfig = new CANNON.ContactMaterial(physicsMaterial, physicsMaterial, {
    friction: 0.6, restitution: 0.1, contactEquationStiffness: 1e8, contactEquationRelaxation: 3
});

export function initPhysics() {
    world.broadphase = new CANNON.SAPBroadphase(world);
    world.addContactMaterial(physicsMatConfig);
}

// Ensure physics run loop
export const clock = new CANNON.Body({ mass: 0 }); // Just a placeholder if we need it
