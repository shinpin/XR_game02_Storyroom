export const level2Config = {
    id: 2,
    audio: {
        bgm: '/BGM_02.mp3'
    },
    player: {
        baseY: 0.5
    },
    environment: {
        skybox: '/BG360_VanGoghLabyrinth.jpg',
        fogColor: 0x080414, // Deep starry indigo
        fogDensity: 0.018
    },
    lighting: [
        { type: 'Directional', color: 0xddccff, intensity: 2, position: [10, 20, -10] }
    ]
};
