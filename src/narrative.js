import * as THREE from 'three';
import { camera } from './core.js';
import { setCatColor } from './player.js';

export let isAutoMode = false;
let currentSequenceIndex = 0;
let sequenceTime = 0;
let levelLoadCallback = null;
let subtitleTypeWriterInterval = null;

const subtitleEl = document.getElementById('cinematic-subtitle');
const cinematicOverlay = document.getElementById('cinematic-overlay');

export const sequences = [
    {
        level: 1, duration: 25,
        text: '第一關：水燈大樹\n冷冽的水霧撲面而來。身為一隻迷失的小貓，你跌入了由古老神話與記憶交織的異次元邊界。跟隨著水面上發出幽光的水母與漂浮的光點，你來到了一棵不合常理、如天柱般高聳的古樹前。\n「這裡是起點，也是終點...」一個微弱的聲音在耳邊迴盪。尋找四散的記憶碎片吧，或許它們能拼湊出回家的道路。',
        startPos: new THREE.Vector3(0, 1.8, 20), endPos: new THREE.Vector3(0, 3, 5),
        startRot: new THREE.Euler(0, 0, 0), endRot: new THREE.Euler(0.2, 0, 0)
    },
    {
        level: 2, duration: 22,
        text: '第二關：迷失谷迷宮\n星夜交錯，時間在這裡失去了意義。四周被抽象的藝術與荒誕的不真實感所包圍，每一次轉彎都可能是新的死胡同。\n你不禁開始懷疑，眼前所見的光芒究竟是出口，還是另一個幻象的引誘？深吸一口氣，從困惑中追尋那唯一的真實。',
        startPos: new THREE.Vector3(0, 5, 20), endPos: new THREE.Vector3(0, 2, 0),
        startRot: new THREE.Euler(-0.3, 0, 0), endRot: new THREE.Euler(0, -Math.PI/4, 0)
    },
    {
        level: 3, duration: 20,
        text: '第三關：古墓棋盤\n石門沉重地推開，揚起千年的塵埃。這是一間古老的封閉密室，感性的探索必須暫時退場，接管的是絕對理性的思考。\n巨大的棋盤上散落著沉澱的命運，將棋子推入正確的位置，才能解開機關，打開通往記憶核心的雙重密門。',
        startPos: new THREE.Vector3(0, 10, -5), endPos: new THREE.Vector3(0, 1.5, -5),
        startRot: new THREE.Euler(-Math.PI/2, 0, 0), endRot: new THREE.Euler(0, 0, 0)
    },
    {
        level: 4, duration: 25,
        text: '第四關：混亂的巨人\n天空被撕裂，崩毀的廢墟如雨般墜落，帶來令人窒息的強烈壓迫感。我們何其渺小，而這個世界卻如此龐大、殘酷且無禮。\n在巨人的陰影下穿梭，你必須學會在這片混亂中找到屬於自己的節奏，跨過滿目瘡痍的石階，不要停下腳步。',
        startPos: new THREE.Vector3(0, 2, -15), endPos: new THREE.Vector3(0, 10, -35),
        startRot: new THREE.Euler(0.2, 0, 0), endRot: new THREE.Euler(0.5, 0, 0)
    },
    {
        level: 5, duration: 24,
        text: '第五關：門神與命運牌局\n這是最後的回家之路。兩尊高聳的門神俯視著你，祂們並非敵人，而是最後的試煉者。\n翻開命運的卡牌，每一張都刻畫著你曾經的抉擇。若能坦然面對失落的記憶與歸屬，大門將為你敞開，迎來最終的破曉。',
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
    if (subtitleTypeWriterInterval) {
        clearInterval(subtitleTypeWriterInterval);
        subtitleTypeWriterInterval = null;
    }
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
    
    // UI Update with Typewriter
    if (subtitleTypeWriterInterval) clearInterval(subtitleTypeWriterInterval);
    subtitleEl.innerText = '';
    subtitleEl.style.opacity = '1';
    
    let charIndex = 0;
    subtitleTypeWriterInterval = setInterval(() => {
        subtitleEl.innerText += seq.text.charAt(charIndex);
        charIndex++;
        if (charIndex >= seq.text.length) {
            clearInterval(subtitleTypeWriterInterval);
            subtitleTypeWriterInterval = null;
        }
    }, 180);
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
