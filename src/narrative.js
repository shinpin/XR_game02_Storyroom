import * as THREE from 'three';
import { camera } from './core.js';
import { playTypewriterTick } from './audio.js';
import { setCatColor } from './player.js';
import { showBigTitle } from './state.js';

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
        text: '第一幕：水燈大樹\n冷冽的水霧悄然漫過腳踝。身為一隻迷失的小狐狸，你無意間踩碎了現實的邊境，墜入由古老神話與遠古記憶交織的異次元。順著水面幽藍的光暈，一棵違反常理、如擎天柱般高聳的古樹靜靜佇立。\n「這裡是起點，也是一切的終點...」\n一個虛渺的聲音拂過耳際。去尋找那些四散的記憶碎片吧，也許它們能為你拼湊出歸途的輪廓。',
        startPos: new THREE.Vector3(0, 1.8, 20), endPos: new THREE.Vector3(0, 3, 5),
        startRot: new THREE.Euler(0, 0, 0), endRot: new THREE.Euler(0.2, 0, 0)
    },
    {
        level: 2, duration: 22,
        text: '第二幕：螢火時盤\n星月如網，時間的流動在這裡被迫停滯。四周充斥著怪誕的幾何與難以名狀的不真實感，每一次轉身，都彷彿踏入另一場迷局。\n我不禁自問：眼前閃爍的螢火，究竟是逃離此地的指路明燈，還是將靈魂永遠囚禁的迷幻誘餌？\n深吸一口氣，在混亂與困惑中，尋找那唯一真實的跳動。',
        startPos: new THREE.Vector3(0, 5, 20), endPos: new THREE.Vector3(0, 2, 0),
        startRot: new THREE.Euler(-0.3, 0, 0), endRot: new THREE.Euler(0, -Math.PI/4, 0)
    },
    {
        level: 3, duration: 20,
        text: '第三幕：古墓棋盤\n沉重的石門伴隨著轟鳴推開，揚起封塵千年的嘆息。這是一間被時光遺忘的石室，感性的探索必須退位，唯有絕對的理性方能指引前路。\n巨大的棋盤上，散落著前人未盡的宿命。將這些沉重的棋子推入命定的軌跡，那扇通往記憶核心的雙重密門才將為你敞開。',
        startPos: new THREE.Vector3(0, 10, -5), endPos: new THREE.Vector3(0, 1.5, -5),
        startRot: new THREE.Euler(-Math.PI/2, 0, 0), endRot: new THREE.Euler(0, 0, 0)
    },
    {
        level: 4, duration: 25,
        text: '第四幕：虛空石階\n蒼穹被無情地撕裂，崩毀的磚石如驟雨般墜落，帶來令人窒息的壓迫感。我們是何其微小，而這世界又是如此龐大、殘酷且無禮。\n在虛幻巨人的陰影下穿梭，你必須學會在這片無序的崩塌中找尋平衡與節奏。踩穩腳下的每一塊殘岩，越過滿目瘡痍的石階，永遠不要停下腳步。',
        startPos: new THREE.Vector3(0, 2, -15), endPos: new THREE.Vector3(0, 10, -35),
        startRot: new THREE.Euler(0.2, 0, 0), endRot: new THREE.Euler(0.5, 0, 0)
    },
    {
        level: 5, duration: 24,
        text: '第五幕：門神與命運牌局\n這是旅程的終焉，也是最後的歸途。兩尊高聳入雲的門神垂眸俯視著你，祂們並非攔路的宿敵，而是見證命運的試煉者。\n翻開命運的卡牌吧，每一張牌面都深深刻畫著你曾做出的抉擇。若能坦然接納失落的記憶與靈魂的歸屬，這座宏偉的大門將為你敞開，迎接最終的破曉。',
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
    console.log("[Debug] 自動劇情模式(Auto Narrative) 已啟動");
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
    setCatColor(0xcc5500); // Default fox orange
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
    
    const parts = seq.text.split('\n');
    const bigTitle = parts[0];
    const subtitleText = parts.slice(1).join(' ').replace(/\n/g, ' ');
    
    showBigTitle(bigTitle, () => {
        if(!isAutoMode) return;
        
        let chunks = subtitleText.split('。').map(s=>s.trim()).filter(s=>s.length>0).map(s=>s+'。');
        let chunkIdx = 0;
        
        const playNext = () => {
            if (chunkIdx >= chunks.length || !isAutoMode) return;
            subtitleEl.style.transition = 'none';
            subtitleEl.style.opacity = '1';
            subtitleEl.innerText = '';
            
            const txt = chunks[chunkIdx];
            let charIndex = 0;
            
            subtitleTypeWriterInterval = setInterval(() => {
                const char = txt.charAt(charIndex);
                if (char !== ' ' && char !== '\n' && char !== '。') {
                    playTypewriterTick();
                }
                subtitleEl.innerText += char;
                charIndex++;
                if (charIndex >= txt.length) {
                    console.log(`[Debug] 打字機動畫完成: ${txt}`);
                    clearInterval(subtitleTypeWriterInterval);
                    subtitleTypeWriterInterval = null;
                    if (chunkIdx < chunks.length - 1) {
                        setTimeout(() => {
                            subtitleEl.style.transition = 'opacity 0.5s';
                            subtitleEl.style.opacity = '0';
                            setTimeout(() => {
                                chunkIdx++;
                                playNext();
                            }, 500);
                        }, 1500);
                    }
                }
            }, 80);
        };
        console.log(`[Debug] 準備開始播放場景 ${seq.level} 的字幕動畫`);
        playNext();
    });
}

export function updateNarrative(dt) {
    if (!isAutoMode) return;
    
    sequenceTime += dt;
    const seq = sequences[currentSequenceIndex];
    
    let progress = sequenceTime / seq.duration;
    if (progress > 1) {
        progress = 1;
    }

    if (Math.abs(progress - 0.5) < 0.005) {
        console.log(`[Debug] 運鏡動畫執行中... (進度: ${(progress*100).toFixed(1)}%)`);
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
