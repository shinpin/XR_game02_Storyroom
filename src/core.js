import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { RGBShiftShader } from 'three/examples/jsm/shaders/RGBShiftShader.js';
import { ColorCorrectionShader } from 'three/examples/jsm/shaders/ColorCorrectionShader.js';
import { VignetteShader } from 'three/examples/jsm/shaders/VignetteShader.js';
import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
export const renderer = new THREE.WebGLRenderer({ 
    antialias: true, 
    alpha: false,
    powerPreference: "high-performance"
});
export const textureLoader = new THREE.TextureLoader();

export let defaultEnv;
export let composer;
export let bloomPass;
export let filmPass;
export let rgbShiftPass;
export let colorCorrectionPass;
export let afterimagePass;
export let vignettePass;
export function initCore() {
    scene.background = new THREE.Color(0x020205);
    scene.fog = new THREE.FogExp2(0x020205, 0.03);
    camera.position.set(0, 1.8, 8);
    
    const appEl = document.getElementById('app');
    const w = appEl.clientWidth;
    const h = appEl.clientHeight;
    
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Cinematic Rendering Upgrades
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    
    // Disable autoReset so we can accumulate stats across composer passes
    renderer.info.autoReset = false;
    
    renderer.xr.enabled = true;
    document.getElementById('app').appendChild(renderer.domElement);
    document.body.appendChild(VRButton.createButton(renderer));

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    defaultEnv = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = defaultEnv;
    
    // Setup Post-processing
    const renderScene = new RenderPass(scene, camera);
    // params: resolution, strength (reduced for lower bloom/exposure), radius, threshold
    bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.08, 0.5, 0.85);
    const outputPass = new OutputPass();

    composer = new EffectComposer(renderer);
    composer.addPass(renderScene);

    // 1. Color Correction
    colorCorrectionPass = new ShaderPass(ColorCorrectionShader);
    colorCorrectionPass.enabled = false;
    composer.addPass(colorCorrectionPass);

    // 1.5 Vignette
    vignettePass = new ShaderPass(VignetteShader);
    vignettePass.uniforms['darkness'].value = 0.0; // 0 means off
    vignettePass.enabled = true; // Always on, but invisible if darkness=0
    composer.addPass(vignettePass);

    // 2. Motion Blur (Afterimage)
    afterimagePass = new AfterimagePass(0.85); // 0.85 dampening
    afterimagePass.enabled = false;
    composer.addPass(afterimagePass);

    // 3. Bloom
    composer.addPass(bloomPass);

    // 4. Chromatic Aberration (RGB Shift)
    rgbShiftPass = new ShaderPass(RGBShiftShader);
    rgbShiftPass.uniforms['amount'].value = 0.0015;
    rgbShiftPass.enabled = false;
    composer.addPass(rgbShiftPass);

    // 5. Film Grain
    filmPass = new FilmPass(0.35, false); // intensity, grayscale
    filmPass.enabled = false; // Default off
    composer.addPass(filmPass);

    composer.addPass(outputPass);
    
    window.addEventListener('resize', triggerResize);
}

export function triggerResize() {
    const appEl = document.getElementById('app');
    if(!appEl) return;
    const w = appEl.clientWidth;
    const h = appEl.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    if(composer) composer.setSize(w, h);
}

export function setBloomState(enabled) {
    if (bloomPass) {
        bloomPass.enabled = enabled;
    }
}

export function setFilmState(enabled) {
    if (filmPass) {
        filmPass.enabled = enabled;
    }
}
