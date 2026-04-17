export const level5Config = {
    id: 5,
    player: {
        baseY: 0.5
    },
    environment: {
        backgroundColor: 0x4a1f1f, // Brighter red/brown background
        fogColor: 0x4a1f1f,
        fogDensity: 0.015
    },
    lighting: [
        { type: 'Directional', color: 0xffaaaa, intensity: 4, position: [10, 20, 10] },
        { type: 'Ambient', color: 0xffffff, intensity: 1.5 } // High ambient light so it's not pitch black
    ],
    postprocessing: {
        bloom: { enabled: true, strength: 0.15 }, // Stronger bloom for climax
        film: { enabled: true, intensity: 0.5 }, // Heavy film grain
        chromaticAberration: { enabled: true, amount: 0.003 }, // Noticeable color shift
        colorAdjustments: { 
            enabled: true, 
            powRGB: [1.2, 1.0, 1.0], // Boost reds
            mulRGB: [1.2, 0.9, 0.9],
            addRGB: [0.1, 0, 0]
        },
        motionBlur: { enabled: true, damp: 0.9 } // Add trailing effect for surrealism
    }
};
