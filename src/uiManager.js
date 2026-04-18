/**
 * UIManager - UI 狀態機控制器
 * 集中管理「遊戲模式 (GAME)」、「編輯模式 (EDITOR)」、「監控模式 (GM)」三層架構的 UI 顯示開關。
 */

import { closeDirectorWindows } from './editor.js';

export const UI_MODES = {
    GAME: 'GAME',
    EDITOR: 'EDITOR',
    GM: 'GM'
};

let currentMode = UI_MODES.GAME;

export function initUIManager() {
    // 綁定全域快捷鍵
    window.addEventListener('keydown', (e) => {
        // F1 進入 GM 模式
        if (e.key === 'F1') {
            e.preventDefault();
            setUIMode(currentMode === UI_MODES.GM ? UI_MODES.GAME : UI_MODES.GM);
        }
        // F2 進入 編輯模式
        if (e.key === 'F2') {
            e.preventDefault();
            setUIMode(currentMode === UI_MODES.EDITOR ? UI_MODES.GAME : UI_MODES.EDITOR);
        }
        // ESC 返回遊戲模式
        if (e.key === 'Escape') {
            // 如果是在鎖定游標的遊戲裡，ESC會解除鎖定，這裡不完全擋掉，但確保UI退回遊戲狀態
            if (currentMode !== UI_MODES.GAME) {
                setUIMode(UI_MODES.GAME);
            }
        }
    });

    // 將按鈕點擊委派給狀態機
    document.getElementById('btn-toggle-debug-ui')?.addEventListener('click', () => {
        setUIMode(currentMode === UI_MODES.GM ? UI_MODES.GAME : UI_MODES.GM);
    });
    
    document.getElementById('btn-scene-editor')?.addEventListener('click', () => {
        setUIMode(currentMode === UI_MODES.EDITOR ? UI_MODES.GAME : UI_MODES.EDITOR);
    });
}

export function getCurrentMode() {
    return currentMode;
}

export function setUIMode(mode) {
    if (currentMode === mode) return;
    
    currentMode = mode;
    console.log(`[UIManager] 進入模式: #${mode}`);

    // 定義三大 Layer 所屬的 DOM 元素 (以 ID 陣列代表)
    const editorElements = ['hierarchy-panel', 'fx-panel', 'inspector-panel', 'coord-panel', 'btn-editor-play', 'editor-status-bar', 'editor-level-select'];
    const gmElements = ['xr-debug-panel'];
    
    // 根據模式控制元素可見性
    const btnSceneEditor = document.getElementById('btn-scene-editor');
    if (btnSceneEditor) {
        btnSceneEditor.style.background = mode === UI_MODES.EDITOR ? 'rgba(200, 40, 40, 0.8)' : 'rgba(120,40,200,0.8)';
        btnSceneEditor.innerHTML = mode === UI_MODES.EDITOR ? '<span>[⚒️] EXIT SCENE EDIT (F2)</span>' : '<span>[⚒️] SCENE EDITOR (F2)</span>';
    }

    editorElements.forEach(id => {
        const el = document.getElementById(id);
        if(!el) return;
        if (mode === UI_MODES.EDITOR) {
            el.classList.remove('hidden-element');
            if(id === 'btn-editor-play') el.style.display = 'block';
            if(id === 'hierarchy-panel') el.style.display = 'flex';
        } else {
            el.classList.add('hidden-element');
            if(id === 'btn-editor-play' || id === 'hierarchy-panel') el.style.display = 'none';
        }
    });

    // 強制隱藏附屬子視窗
    if (mode !== UI_MODES.EDITOR) {
        closeDirectorWindows();
    }

    gmElements.forEach(id => {
        const el = document.getElementById(id);
        if(!el) return;
        el.style.display = (mode === UI_MODES.GM) ? 'block' : 'none';
    });

    // 觸發全域事件，讓 main.js 根據這些事件來決定攝影機、DOM resize 和滑鼠鎖定邏輯
    window.dispatchEvent(new CustomEvent('ui-mode-changed', { detail: { mode } }));
}
