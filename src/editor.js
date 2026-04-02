import * as THREE from 'three';
import { camera } from './core.js';

let editorSequences = [];
let currentStartPos = null;
let currentStartRot = null;
let currentEndPos = null;
let currentEndRot = null;

export let isNoclip = false;

export function initEditor() {
    const btnDebug = document.getElementById('btn-debug');
    const editorUI = document.getElementById('editor-ui');
    const toggleNoclip = document.getElementById('noclip-toggle');
    const btnMarkStart = document.getElementById('btn-mark-start');
    const btnMarkEnd = document.getElementById('btn-mark-end');
    const btnAddSeq = document.getElementById('btn-add-seq');
    const btnExport = document.getElementById('btn-export');
    const btnCloseEditor = document.getElementById('btn-close-editor');
    const statusText = document.getElementById('ed-status');
    const countText = document.getElementById('ed-count');
    const exportModal = document.getElementById('export-modal');
    const exportCode = document.getElementById('export-code');
    const btnCloseExport = document.getElementById('btn-close-export');

    if (!btnDebug || !editorUI) return;

    btnDebug.addEventListener('click', () => {
        editorUI.style.display = editorUI.style.display === 'none' ? 'block' : 'none';
        if (editorUI.style.display === 'block') document.exitPointerLock();
    });

    if (btnCloseEditor) {
        btnCloseEditor.addEventListener('click', () => {
            editorUI.style.display = 'none';
        });
    }

    toggleNoclip.addEventListener('change', (e) => {
        isNoclip = e.target.checked;
    });

    btnMarkStart.addEventListener('click', () => {
        currentStartPos = camera.position.clone();
        currentStartRot = camera.rotation.clone();
        statusText.innerText = `[起點紀錄成功] X:${currentStartPos.x.toFixed(1)}, Y:${currentStartPos.y.toFixed(1)}, Z:${currentStartPos.z.toFixed(1)}`;
        statusText.style.color = '#0f0';
    });

    btnMarkEnd.addEventListener('click', () => {
        currentEndPos = camera.position.clone();
        currentEndRot = camera.rotation.clone();
        statusText.innerText = `[終點紀錄成功] X:${currentEndPos.x.toFixed(1)}, Y:${currentEndPos.y.toFixed(1)}, Z:${currentEndPos.z.toFixed(1)}`;
        statusText.style.color = '#0ff';
    });

    btnAddSeq.addEventListener('click', () => {
        if (!currentStartPos || !currentEndPos) {
            statusText.innerText = "!! 錯誤：請先錄製 起點 與 終點 !!";
            statusText.style.color = '#f00';
            return;
        }

        const level = document.getElementById('ed-level').value;
        const duration = document.getElementById('ed-duration').value;
        const text = document.getElementById('ed-text').value;

        editorSequences.push({
            level: parseInt(level),
            duration: parseInt(duration),
            text: text,
            startPos: currentStartPos,
            endPos: currentEndPos,
            startRot: currentStartRot,
            endRot: currentEndRot
        });

        countText.innerText = editorSequences.length;
        statusText.innerText = `已加入第 ${editorSequences.length} 段分鏡`;
        statusText.style.color = '#ffcc00';

        // Reset for next
        currentStartPos = null; currentStartRot = null;
        currentEndPos = null; currentEndRot = null;
        document.getElementById('ed-text').value = '';
    });

    btnExport.addEventListener('click', () => {
        if (editorSequences.length === 0) {
            alert("目前沒有任何分鏡資料可匯出！");
            return;
        }

        let jsCode = "const sequences = [\n";
        editorSequences.forEach(seq => {
            const sp = seq.startPos; const sr = seq.startRot;
            const ep = seq.endPos; const er = seq.endRot;
            
            // Format text to escape single quotes properly
            const safeText = seq.text.replace(/'/g, "\\'").replace(/\n/g, '\\n');

            jsCode += `    {\n`;
            jsCode += `        level: ${seq.level}, duration: ${seq.duration},\n`;
            jsCode += `        text: '${safeText}',\n`;
            jsCode += `        startPos: new THREE.Vector3(${sp.x.toFixed(3)}, ${sp.y.toFixed(3)}, ${sp.z.toFixed(3)}), endPos: new THREE.Vector3(${ep.x.toFixed(3)}, ${ep.y.toFixed(3)}, ${ep.z.toFixed(3)}),\n`;
            jsCode += `        startRot: new THREE.Euler(${sr.x.toFixed(3)}, ${sr.y.toFixed(3)}, ${sr.z.toFixed(3)}), endRot: new THREE.Euler(${er.x.toFixed(3)}, ${er.y.toFixed(3)}, ${er.z.toFixed(3)})\n`;
            jsCode += `    },\n`;
        });
        jsCode += "];";

        exportCode.value = jsCode;
        exportModal.style.display = 'flex';
    });

    btnCloseExport.addEventListener('click', () => {
        exportModal.style.display = 'none';
        // Auto copy to clipboard
        exportCode.select();
        document.execCommand('copy');
        alert("程式碼已經成功複製到剪貼簿！");
    });
}
