/**
 * SceneSerializer.js
 * 
 * Handles serialization (saving/loading) of editable object transforms 
 * into LocalStorage. Allows WYSIWYG level layout in F2 mode.
 */

import { levelState } from './state.js';

export function saveSceneState(levelGroup) {
    if (!levelGroup) return;
    const saveDict = {};
    levelGroup.traverse((child) => {
        // 唯獨標記為 editable 且有 name 的幾何體，才允許被寫入存檔
        if (child.name && child.userData.editable === true) {
            saveDict[child.name] = {
                position: child.position.toArray(),
                rotation: child.rotation.toArray(),
                scale: child.scale.toArray()
            };
        }
    });

    const fxDict = {
        bloom: document.getElementById('toggle-bloom')?.checked,
        film: document.getElementById('toggle-film')?.checked,
        skyExp: document.getElementById('ctrl-sky-exp')?.value,
        fogDensity: document.getElementById('ctrl-fog-density')?.value,
        fogColor: document.getElementById('ctrl-fog-color')?.value,
        ambBright: document.getElementById('ctrl-ambient-int')?.value,
        ambColor: document.getElementById('ctrl-ambient-color')?.value,
        mainInt: document.getElementById('ctrl-main-int')?.value,
        vignette: document.getElementById('ctrl-vignette')?.value,
        filter: document.getElementById('ctrl-filter')?.value
    };

    const curLvl = levelState.currentLevel || 1;
    localStorage.setItem(`level_layout_save_${curLvl}`, JSON.stringify(saveDict));
    localStorage.setItem(`level_fx_save_${curLvl}`, JSON.stringify(fxDict));
    console.log(`[Serializer] 已儲存場景與 FX 狀態至 LocalStorage (關卡 ${curLvl})，共 ${Object.keys(saveDict).length} 個物件。`, saveDict, fxDict);
}

export function restoreSceneState(levelGroup) {
    restoreLayoutState(levelGroup);
    restoreFXState();
}

export function restoreLayoutState(levelGroup) {
    if (!levelGroup) return;
    const curLvl = levelState.currentLevel || 1;
    
    const saveStr = localStorage.getItem(`level_layout_save_${curLvl}`);
    if (saveStr) {
        try {
            const saveDict = JSON.parse(saveStr);
            let restoredCount = 0;
            
            levelGroup.traverse((child) => {
                if (child.name && child.userData.editable === true && saveDict[child.name]) {
                    const data = saveDict[child.name];
                    
                    // 套用儲存的 Transform
                    child.position.fromArray(data.position);
                    child.rotation.fromArray(data.rotation);
                    child.scale.fromArray(data.scale);
                    
                    // 同步物理引擎碰撞體 (如果有綁定的話)
                    if (child.userData.physicsBody) {
                        child.userData.physicsBody.position.copy(child.position);
                        child.userData.physicsBody.quaternion.copy(child.quaternion);
                    }
                    
                    restoredCount++;
                }
            });
            console.log(`[Serializer] 已從 LocalStorage 恢復 ${restoredCount} 個物件座標。`);
        } catch (e) {
            console.error('[Serializer] 解析場景存檔失敗', e);
        }
    }
}

export function restoreFXState() {
    const curLvl = levelState.currentLevel || 1;
    // Restore FX State
    const fxStr = localStorage.getItem(`level_fx_save_${curLvl}`);
    if (fxStr) {
        try {
            const fxDict = JSON.parse(fxStr);
            const triggerEvent = (id, eventTarget, eventName) => {
                const el = document.getElementById(id);
                if (el && fxDict[eventTarget] !== undefined) {
                    el.value = fxDict[eventTarget];
                    el.dispatchEvent(new Event(eventName));
                }
            };
            const triggerCheckbox = (id, eventTarget) => {
                const el = document.getElementById(id);
                if (el && fxDict[eventTarget] !== undefined) {
                    el.checked = fxDict[eventTarget];
                    el.dispatchEvent(new Event('change'));
                }
            }
            
            triggerCheckbox('toggle-bloom', 'bloom');
            triggerCheckbox('toggle-film', 'film');
            
            triggerEvent('ctrl-sky-exp', 'skyExp', 'input');
            triggerEvent('ctrl-fog-density', 'fogDensity', 'input');
            triggerEvent('ctrl-fog-color', 'fogColor', 'input');
            triggerEvent('ctrl-ambient-int', 'ambBright', 'input');
            triggerEvent('ctrl-ambient-color', 'ambColor', 'input');
            triggerEvent('ctrl-main-int', 'mainInt', 'input');
            triggerEvent('ctrl-vignette', 'vignette', 'input');
            triggerEvent('ctrl-filter', 'filter', 'change');
            
            console.log(`[Serializer] 已從 LocalStorage 恢復 FX 設定。`);
        } catch(e) {
            console.error('[Serializer] 解析 FX 存檔失敗', e);
        }
    } else {
        // Fallback to default if no save exists for this level
        const defaultFX = {
            bloom: true,
            film: false,
            skyExp: 1.0,
            fogDensity: 0.015,
            fogColor: "#020205",
            ambBright: 0.5,
            ambColor: "#ffffff",
            mainInt: 3,
            vignette: 0.0,
            filter: "none"
        };
        const triggerEvent = (id, val, eventName) => {
            const el = document.getElementById(id);
            if (el) { el.value = val; el.dispatchEvent(new Event(eventName)); }
        };
        const triggerCheckbox = (id, val) => {
           const el = document.getElementById(id);
           if(el) { el.checked = val; el.dispatchEvent(new Event('change')); }
        };
        triggerCheckbox('toggle-bloom', defaultFX.bloom);
        triggerCheckbox('toggle-film', defaultFX.film);
        triggerEvent('ctrl-sky-exp', defaultFX.skyExp, 'input');
        triggerEvent('ctrl-fog-density', defaultFX.fogDensity, 'input');
        triggerEvent('ctrl-fog-color', defaultFX.fogColor, 'input');
        triggerEvent('ctrl-ambient-int', defaultFX.ambBright, 'input');
        triggerEvent('ctrl-ambient-color', defaultFX.ambColor, 'input');
        triggerEvent('ctrl-main-int', defaultFX.mainInt, 'input');
        triggerEvent('ctrl-vignette', defaultFX.vignette, 'input');
        triggerEvent('ctrl-filter', defaultFX.filter, 'change');
        console.log(`[Serializer] 關卡 ${curLvl} 無 FX 存檔，已重置為預設。`);
    }
}
