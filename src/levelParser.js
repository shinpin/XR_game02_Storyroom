import * as THREE from 'three';
import { scene, textureLoader, bloomPass, filmPass, rgbShiftPass, colorCorrectionPass, afterimagePass } from './core.js';
import { updateNavMap } from './levelManager.js';
import { playLevelBGM } from './audio.js';
import { levelState, levelGroup } from './state.js';

export function parseLevel(config) {
    // 1. Update Navigation Map
    if (config.id) {
        updateNavMap(config.id);
    }
    
    // 2. Setup Audio
    if (config.audio && config.audio.bgm) {
        playLevelBGM(config.audio.bgm);
    }
    
    // 3. Setup Player State
    if (config.player) {
        if (config.player.baseY !== undefined) levelState.playerBaseY = config.player.baseY;
    }
    
    // 4. Setup Custom Intro Cinematic
    if (config.customIntro) {
        levelState.customIntro = config.customIntro;
    }
    if (config.onIntroComplete) {
        levelState.onIntroComplete = config.onIntroComplete;
    }

    // 5. Setup Environment (Skybox, Fog, Background)
    if (config.environment) {
        if (config.environment.skybox) {
            textureLoader.load(config.environment.skybox, (texture) => {
                texture.mapping = THREE.EquirectangularReflectionMapping;
                texture.colorSpace = THREE.SRGBColorSpace;
                scene.background = texture;
                scene.environment = texture;
                if (config.environment.skyboxRotationY !== undefined) {
                    scene.backgroundRotation.y = config.environment.skyboxRotationY;
                    scene.environmentRotation.y = config.environment.skyboxRotationY;
                }
            });
        } else if (config.environment.backgroundColor !== undefined) {
            scene.background = new THREE.Color(config.environment.backgroundColor);
            scene.environment = null; // Clear environment map if using solid color
        }
        
        if (config.environment.fogColor !== undefined) {
            scene.fog.color.setHex(config.environment.fogColor);
        }
        if (config.environment.fogDensity !== undefined) {
            scene.fog.density = config.environment.fogDensity;
        }
    }
    
    // 6. Setup Lighting
    if (config.lighting && Array.isArray(config.lighting)) {
        config.lighting.forEach(lightDef => {
            let light;
            if (lightDef.type === 'Directional') {
                light = new THREE.DirectionalLight(lightDef.color, lightDef.intensity);
                if (lightDef.position) light.position.fromArray(lightDef.position);
                levelGroup.add(light);
            } else if (lightDef.type === 'Ambient') {
                light = new THREE.AmbientLight(lightDef.color, lightDef.intensity);
                levelGroup.add(light);
            }
            // Future extensions for PointLight, AmbientLight, etc.
        });
    }

    // 7. Setup Post-Processing
    // Reset to defaults first
    if (bloomPass) {
        bloomPass.enabled = true;
        bloomPass.strength = 0.08;
    }
    if (filmPass) {
        filmPass.enabled = false;
        filmPass.uniforms['intensity'].value = 0.35;
    }
    if (rgbShiftPass) {
        rgbShiftPass.enabled = false;
        rgbShiftPass.uniforms['amount'].value = 0.0015;
    }
    if (colorCorrectionPass) {
        colorCorrectionPass.enabled = false;
        // reset to neutral
        colorCorrectionPass.uniforms['powRGB'].value.set(1, 1, 1);
        colorCorrectionPass.uniforms['mulRGB'].value.set(1, 1, 1);
        colorCorrectionPass.uniforms['addRGB'].value.set(0, 0, 0);
    }
    if (afterimagePass) {
        afterimagePass.enabled = false;
        afterimagePass.uniforms['damp'].value = 0.85;
    }

    // Apply level specific post-processing
    if (config.postprocessing) {
        const pp = config.postprocessing;
        
        if (pp.bloom !== undefined && bloomPass) {
            bloomPass.enabled = pp.bloom.enabled !== false;
            if (pp.bloom.strength !== undefined) bloomPass.strength = pp.bloom.strength;
        }
        
        if (pp.film !== undefined && filmPass) {
            filmPass.enabled = pp.film.enabled;
            if (pp.film.intensity !== undefined) filmPass.uniforms['intensity'].value = pp.film.intensity;
        }

        if (pp.chromaticAberration !== undefined && rgbShiftPass) {
            rgbShiftPass.enabled = pp.chromaticAberration.enabled;
            if (pp.chromaticAberration.amount !== undefined) rgbShiftPass.uniforms['amount'].value = pp.chromaticAberration.amount;
        }

        if (pp.colorAdjustments !== undefined && colorCorrectionPass) {
            colorCorrectionPass.enabled = pp.colorAdjustments.enabled;
            if (pp.colorAdjustments.powRGB) colorCorrectionPass.uniforms['powRGB'].value.fromArray(pp.colorAdjustments.powRGB);
            if (pp.colorAdjustments.mulRGB) colorCorrectionPass.uniforms['mulRGB'].value.fromArray(pp.colorAdjustments.mulRGB);
            if (pp.colorAdjustments.addRGB) colorCorrectionPass.uniforms['addRGB'].value.fromArray(pp.colorAdjustments.addRGB);
        }

        if (pp.motionBlur !== undefined && afterimagePass) {
            afterimagePass.enabled = pp.motionBlur.enabled;
            if (pp.motionBlur.damp !== undefined) afterimagePass.uniforms['damp'].value = pp.motionBlur.damp;
        }
    }

    // 8. Setup Camera Defaults
    // Reset to global defaults first
    import('./core.js').then(({ camera }) => {
        camera.fov = 75;
        camera.updateProjectionMatrix();
        levelState.cameraOffset = { distance: -2.5, height: 1.8 }; // Default values
        
        if (config.camera) {
            if (config.camera.fov !== undefined) {
                camera.fov = config.camera.fov;
                camera.updateProjectionMatrix();
            }
            if (config.camera.distance !== undefined) levelState.cameraOffset.distance = config.camera.distance;
            if (config.camera.height !== undefined) levelState.cameraOffset.height = config.camera.height;
        }
    });
}
