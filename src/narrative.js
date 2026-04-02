import * as THREE from 'three';
import { camera } from './core.js';
import { setCatColor } from './player.js';

export let isAutoMode = false;
let currentSequenceIndex = 0;
let sequenceTime = 0;
let levelLoadCallback = null;

const subtitleEl = document.getElementById('cinematic-subtitle');
const cinematicOverlay = document.getElementById('cinematic-overlay');

const sequences = [
    {
        level: 1, duration: 15,
        text: '第一關：水燈大樹\n玩家化身迷路的小貓，掉入記憶與神話交織的異世界。跟隨光點，來到了水霧包圍的古樹前...',
        startPos: new THREE.Vector3(0, 1.8, 20), endPos: new THREE.Vector3(0, 3, 5),
        startRot: new THREE.Euler(0, 0, 0), endRot: new THREE.Euler(0.2, 0, 0)
    },
    {
        level: 2, duration: 12,
        text: '第二關：迷失谷迷宮\n星夜迷宮之中，充滿藝術與不真實感。從困惑中追尋那唯一的光芒...',
        startPos: new THREE.Vector3(0, 5, 20), endPos: new THREE.Vector3(0, 2, 0),
        startRot: new THREE.Euler(-0.3, 0, 0), endRot: new THREE.Euler(0, -Math.PI/4, 0)
    },
    {
        level: 3, duration: 12,
        text: '第三關：古墓棋盤\n來到古老密室，從感性探索轉入理性思考。找出正確解法，打開記憶密門...',
        startPos: new THREE.Vector3(0, 10, -5), endPos: new THREE.Vector3(0, 1.5, -5),
        startRot: new THREE.Euler(-Math.PI/2, 0, 0), endRot: new THREE.Euler(0, 0, 0)
    },
    {
        level: 4, duration: 15,
        text: '第四關：混亂的巨人\n崩毀的廢墟帶來強烈壓迫感。我們很渺小，世界卻很巨大...',
        startPos: new THREE.Vector3(0, 2, -15), endPos: new THREE.Vector3(0, 10, -35),
        startRot: new THREE.Euler(0.2, 0, 0), endRot: new THREE.Euler(0.5, 0, 0)
    },
    {
        level: 5, duration: 15,
        text: '第五關：門神與命運牌局\n最後的回家之路。與門神進行試煉，找回失落的記憶與歸屬...',
        startPos: new THREE.Vector3(0, 2, -10), endPos: new THREE.Vector3(0, 2, -35),
        startRot: new THREE.Euler(0, 0, 0), endRot: new THREE.Euler(0, 0, 0)
    }
];

export function initNarrative(loaderCallback) {
    levelLoadCallback = loaderCallback;
}

export function startAutoNarrative() {
    isAutoMode = true;
    currentSequenceIndex = 0;
    cinematicOverlay.style.display = 'flex';
    setCatColor(0xffcc00); // Yellow for auto mode
    playSequence(0);
}

export function stopAutoNarrative() {
    isAutoMode = false;
    cinematicOverlay.style.display = 'none';
    subtitleEl.style.opacity = '0';
    setCatColor(0x4a2a18); // Default brown
}

function playSequence(index) {
    if (index >= sequences.length) {
        stopAutoNarrative();
        document.getElementById('game-ui').style.display = 'none';
        document.getElementById('menu-overlay').style.display = 'flex';
        return;
    }
    
    currentSequenceIndex = index;
    sequenceTime = 0;
    const seq = sequences[index];
    
    // Load level
    if (levelLoadCallback) levelLoadCallback(seq.level);

    // Initial camera transform
    camera.position.copy(seq.startPos);
    camera.rotation.copy(seq.startRot);
    
    // UI Update
    subtitleEl.innerText = seq.text;
    subtitleEl.style.opacity = '1';
}

export function updateNarrative(dt) {
    if (!isAutoMode) return;
    
    sequenceTime += dt;
    const seq = sequences[currentSequenceIndex];
    
    let progress = sequenceTime / seq.duration;
    if (progress > 1) {
        progress = 1;
    }

    // Smooth movement
    const easeProgress = -(Math.cos(Math.PI * progress) - 1) / 2; // Sine ease-in-out
    camera.position.lerpVectors(seq.startPos, seq.endPos, easeProgress);
    
    // Rotation interpolation
    const qStart = new THREE.Quaternion().setFromEuler(seq.startRot);
    const qEnd = new THREE.Quaternion().setFromEuler(seq.endRot);
    const qCur = new THREE.Quaternion().slerpQuaternions(qStart, qEnd, easeProgress);
    camera.setRotationFromQuaternion(qCur);

    // Auto-solve Puzzles during cinematic mode
    import('./state.js').then(({ levelState }) => {
        if (seq.level === 3 && progress > 0.4 && progress < 0.6) {
            // Drag a chess piece to the pressure plate
            const piece = levelState.rigidBodies.find(r => r.body.mass === 30);
            if (piece && piece.body.position.y > 0) {
                import('cannon-es').then(CANNON => {
                    const target = new CANNON.Vec3(0, 2, -12 + 5); 
                    piece.body.position.lerp(target, 0.02, piece.body.position);
                    piece.body.wakeUp();
                });
            }
        } else if (seq.level === 5 && progress > 0.2 && progress < 0.5) {
            // Flip the fate cards
            const cards = levelState.rigidBodies.filter(r => r.body.mass === 1);
            cards.forEach((card, i) => {
                if (card.body.position.y > 0) {
                    import('cannon-es').then(CANNON => {
                        const targetPos = new CANNON.Vec3((i - 1.5) * 3, 4, -25);
                        card.body.position.lerp(targetPos, 0.03, card.body.position);
                        card.body.angularVelocity.set(0, 2, 0); 
                        card.body.wakeUp();
                    });
                }
            });
        }
    });

    // Fade out subtitle before sequence ends
    if (sequenceTime > seq.duration - 1.5) {
        subtitleEl.style.opacity = '0';
    }

    // Next sequence
    if (sequenceTime >= seq.duration) {
        playSequence(currentSequenceIndex + 1);
    }
}
