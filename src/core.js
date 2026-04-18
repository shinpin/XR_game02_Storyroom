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
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
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
export let ssaoPass;
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
    // 1. Render Scene
    composer.addPass(renderScene);

    // 1.5. Screen Space Ambient Occlusion (SSAO)
    ssaoPass = new SSAOPass(scene, camera, w, h);
    ssaoPass.kernelRadius = 16;       
    ssaoPass.minDistance = 0.005;
    ssaoPass.maxDistance = 0.1;
    ssaoPass.enabled = false; // Default off, toggle per level
    composer.addPass(ssaoPass);

    // 2. Motion Blur (Afterimage)
    afterimagePass = new AfterimagePass(0.85); 
    afterimagePass.enabled = false;
    composer.addPass(afterimagePass);

    // 3. Bloom (Must be in Linear space, BEFORE OutputPass)
    composer.addPass(bloomPass);

    // 4. Color Correction (Linear space)
    colorCorrectionPass = new ShaderPass(ColorCorrectionShader);
    colorCorrectionPass.enabled = false;
    composer.addPass(colorCorrectionPass);

    // --- COLOR SPACE CONVERSION ---
    // ToneMapping and Linear to sRGB conversion
    composer.addPass(outputPass);

    // 5. Chromatic Aberration (RGB Shift) - safe on sRGB
    rgbShiftPass = new ShaderPass(RGBShiftShader);
    rgbShiftPass.uniforms['amount'].value = 0.0015;
    rgbShiftPass.enabled = false;
    composer.addPass(rgbShiftPass);

    // 6. Vignette - strictly 2D overlay on sRGB to prevent hue shifting
    vignettePass = new ShaderPass(VignetteShader);
    vignettePass.uniforms['darkness'].value = 0.0; 
    vignettePass.enabled = true; 
    composer.addPass(vignettePass);

    // 7. Film Grain - strictly 2D overlay on sRGB
    filmPass = new FilmPass(0.45, false); 
    filmPass.enabled = false; 
    composer.addPass(filmPass);
    
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
