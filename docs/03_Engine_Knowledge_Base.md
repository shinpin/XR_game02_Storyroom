# 🧠 XR Storyroom - 3D 引擎架構與知識點庫 (Engine Knowledge Base)

**最後更新時間：** 2026-04-17
**用途：** 紀錄在開發 XR Storyroom 過程中，從「網頁前端思維」轉換至「大型 3D 引擎思維」的重要觀念與填坑經驗。此文件能幫助開發者未來在處理效能優化、場景配置時，不再落入相同的陷阱。

---

## 🏗️ 1. 場景編輯器模式 (Scene Editor Layout)

### 知識點：IDE 視窗裁切與座標偏移 (Viewport Shrinking & Raycasting)
*   **情境描述**：當從「全螢幕遊戲」切換至「包含左右儀表板的編輯器」時，為了不讓 UI 擋住 3D 畫面，我們將 `#app` (裝載 Canvas 的容器) 的寬度強制縮小，讓出邊緣黑色的實體 CSS 空間給介面。
*   **致命踩坑點 (`event.clientX / window.innerWidth`)**：
    網路上常見的 Three.js 射線檢測 (Raycaster) 教學，通常預設你的 Canvas 永遠撐滿一整面螢幕 (`window.innerWidth`)。但如果強制將 Canvas 縮小 (例如被左邊 220px 的 Hierarchy 推進去)，滑鼠真正的「解析度對應點」就會產生巨幅落差，點選 A 模型卻選中一旁的空氣。
*   **正確解法**：永遠使用 `BoundingClientRect`。
    ```javascript
    // 取得當前畫布這張元素的真實四邊界
    const rect = renderer.domElement.getBoundingClientRect();
    // 扣掉偏移值後，再除以真實寬高，進行 -1 到 1 的正規化
    mouseEditor.x = ( (event.clientX - rect.left) / rect.width ) * 2 - 1;
    mouseEditor.y = -( (event.clientY - rect.top) / rect.height ) * 2 + 1;
    ```
    這同時也解決了 Overflow 的問題，記得在 CSS 將包含視窗設定 `overflow: hidden;`。

---

## ⏳ 2. 物理與時間凍結 (Physics & Time Freezing)

### 知識點：可編輯物理引擎的反向同步 (Reverse Physics Sync)
*   **情境描述**：我們的遊戲裝載了 `Cannon.js` 作為剛體物理引擎。平時，所有的可動 3D 模型都會被迫「聽命於」不可見的物理碰撞體（由程式更新 `mesh.position.copy(body.position)`）。
*   **致命踩坑點 (無法拖移模型)**：
    如果在編輯模式下啟用了 `TransformControls` (十字箭頭) 去拖拉一個帶有物理特性的石頭，你的滑鼠想往上拉，但下一幀物理引擎又透過計算把它砸回地上，導致模型瘋狂抖動抽搐或根本拉不動。
*   **正確解法 (`dt = 0` 與反向寫入)**：
    編輯模式下，必須切斷/暫停 `world.step()` 的時間推進。更進階的做法是，暫停期間啟動「反向同步」，強迫不可見的物理碰撞體跟著玩家拖曳的模型走。
    ```javascript
    if (isEditorPaused) {
        // [編輯模式] 模型驅動剛體：當你用十字箭頭拖曳模型時，強迫隱形剛體跟著你的滑鼠走
        for (const obj of levelState.rigidBodies) {
            obj.body.position.copy(obj.mesh.position);
            obj.body.quaternion.copy(obj.mesh.quaternion);
        }
    } else {
        // [遊戲模式] 剛體驅動模型：重力與碰撞計算完畢，將結果套用回美麗的模型上
        world.step(1/60, dt, 3);
        // ... (正向同步迴圈)
    }
    ```

---

## 🎨 3. 大場景與邊界迷思 (Environment & Skyboxes)

### 知識點：不要往天空盒走 (Perspective Distortion & Parallax)
*   **情境描述**：為了讓玩家有目標，我們可以在遠方放一扇「門」。為了省效能，我們能把那扇門直接畫在一張全景的天空盒 (Equirectangular Map) 上，期望玩家能走過去穿過它。
*   **為何不該這麼做**：
    1.  **缺乏視差 (No Parallax)**：真實的 3D 立體物件會隨著你改變視角而展示不同面向；但畫在全景圖上的平片，永遠朝向你的攝影機，走到深處大腦會認知到這是 2D 壁紙，嚴重破壞 VR 沈浸感。
    2.  **極度拉伸 (Distortion)**：由於全景圖的球體/立體映射原理，越靠近天空盒的邊緣極點，貼圖就會產生猶如哈哈鏡一般的畸變。
    3.  **無法接收即時光影**：玩家手上的真實火把無法打光在貼圖上的假門。
*   **正確解法**：在場景極限邊界 (`30x40`) 放棄依賴天空背景，實際擺放一個低面數的 3D 門面模型 `.glb`，並在後面加上引導光源，而天空盒則持續保持無盡延伸的黑暗氛圍。

### 知識點：超大地形展開的副作用 (Terrain Scale Consequences)
單純將地板放大 (從 `30x40` 撐到 `390x390`)，三秒鐘就能寫完，但會對引擎造成三個毀滅連鎖效應：
1.  **陰影馬賽克 (Shadow Map Resolution)**：`DirectionalLight` 的正交投影攝影機必須容納 `390m` 才能捕捉陰影，這會將原本 `1024x1024` 解析度的清晰影子，瞬間撕裂成 Minecraft 般的馬賽克方塊。需引入級聯陰影 (CSM)。
2.  **破圖裁切 (Camera Far Plane)**：如果在 `core.js` 裡相機最遠只能看 100m，那放大腳邊的地板只會讓你看到一刀切痕的黑色斷層。
3.  **無謂吃效能**：巨大但空曠的地板會大幅損耗無效的 Fragment Shader 算力。
*   **最佳決策**：如同現況，不盲目擴張地板，而是採取「關卡物件收攏」策略。
