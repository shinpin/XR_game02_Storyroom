/**
 * SceneSerializer.js
 * 
 * Handles serialization (saving/loading) of editable object transforms 
 * into LocalStorage. Allows WYSIWYG level layout in F2 mode.
 */

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

    localStorage.setItem('level_layout_save', JSON.stringify(saveDict));
    console.log(`[Serializer] 已儲存場景狀態至 LocalStorage，共 ${Object.keys(saveDict).length} 個物件。`, saveDict);
}

export function restoreSceneState(levelGroup) {
    if (!levelGroup) return;
    
    const saveStr = localStorage.getItem('level_layout_save');
    if (!saveStr) return;

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
        console.error('[Serializer] 解析存檔失敗', e);
    }
}
