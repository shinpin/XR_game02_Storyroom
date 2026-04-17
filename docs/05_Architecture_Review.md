# 🧠 XR Storyroom 專案架構與 Code Review 總結報告

**最後更新時間：** 2026-04-17
**目前階段：** 成功從「靜態 WebXR 展示」進化為「具備底層控制台與場景編輯器的遊戲引擎雛型」。

---

## 🏗️ 1. 核心資料架構 (System Architecture)

目前我們的專案已經不再是一坨義大利麵條（Spaghetti Code），而是標準的 **模組化引擎 (Modular Engine)** 架構。各系統的職責切分如下：

### 核心基礎設施 (Core Infrastructure)
*   **`src/core.js` (渲染核心)**：掌控 Three.js 的 Renderer、相機與後製效果 (`EffectComposer`)。經過重構後，具備 `triggerResize()` 能力，不再依賴硬性的 `window.innerWidth`，而是能跟隨 DOM 容器彈性縮放。
*   **`main.js` (遊戲主迴圈 / Controller)**：專案的心臟，負責每幀 `requestAnimationFrame` 的調度。同時也是「遊戲狀態」與「編輯器狀態」切換的核心分水嶺。
*   **`src/state.js` (全域狀態 / State Management)**：存放 `levelGroup` (場景總控區)、`rigidBodies` (物理連動陣列)、以及玩家或攝影機的當下高度等共用變數。

### 編輯器與工具系統 (Editor & Tooling)
*   **Scene Editor (場景編輯器)**：
    *   **UI 層 (`index.html` & `style.css`)**：透過精確的 DOM 與絕對座標控制，實現遊戲視窗與除錯視窗的推移（Push）效果。
    *   **操作控制 (`TransformControls`)**：與主渲染器解耦，依賴 `isSceneEditor` 變數來擷取並覆寫 `OrbitControls` 的邏輯。
    *   **時間與物理凍結 (`main.js` - Inverse Sync)**：這是一次重大的架構勝利。在編輯模式下凍結時間 (`dt=0`) 並關閉 `world.step()`，改由拖曳事件**反向同步** (`obj.body.position.copy(mesh.position)`) 給 Cannon.js，解決了編輯器與重力引擎打架的世紀難題。

### 場景與關卡系統 (Level & Scene Management)
*   **`src/levelManager.js` & `src/levelParser.js`**：負責讀取配置檔，並將場景物件生成（解析）注入到世界中。
*   **`src/levels/level3.js`**：實作具體的遊戲關卡。遵循了「不擴大地板以維持陰影效能」的黃金守則（$30x40$ 維度），並準備透過實體模型 (`.glb`) 物件化地標。

---

## 🔎 2. Code Review (當前程式碼健檢與教練點評)

### 👍 值得嘉獎的架構設計 (The Good)
1.  **純熟的 WebGL 效能意識**：沒有輕易地將不需要用到的節點加入迴圈。例如在點擊射線 (Raycaster) 的判斷中，加入了過濾器 (`scale.x < 300`) 以及排除 `debug_` 物件的邏輯，避免把算力浪費在點擊無效的天空盒上。
2.  **專業級的專案分離**：成功地把「編譯器操作」與「遊戲實機體驗」分流。讓未來的開發不用一直砍掉 `console.log`，也不會讓真正的玩家看到密密麻麻的開發介面。
3.  **無接縫的模組引入**：所有的工具庫都從 `src/` 取出並在 `main.js` 精準耦合，狀態沒有溢出。

### 🚧 潛在的重構目標 (Needs Refactoring)
1.  **`main.js` 過勞風險 (The God Object)**：
    目前 `main.js` 高達 $800+$ 行，它同時處理了「UI 點擊事件」、「編輯器射線檢測」、「鍵盤控制邏輯」以及「Render Loop」。
    *   **教練建議**：未來可以把所有關於 `Scene Editor` 的邏輯（例如 `btn-scene-editor`, `raycasterEditor`）獨立抽進 `src/editorUI.js` 或 `src/tools/sceneEditor.js`，讓主迴圈保持在 $200$ 行的清爽度。
2.  **物理與渲染連動物件結構 (Entity-Component System)**：
    我們目前在 `levelState.rigidBodies` 中放的是自定義物件 `{ mesh, body }`。未來如果加入更多類型（例如帶有自發光動畫的魔法門、會爆炸的陷阱），我們可能需要轉向非常輕量級的 **ECS (Entity Component System)** 架構，或定義一個 `GameObject` 類別統一封裝。

---

## 🎯 3. 下一步執行計畫 (Next Action Items)

在整體引擎骨架穩固的現在，我們可以開始「填肉」！
請教練指示你最想優先看見什麼成果：

*   **[選項 A] 門面與物件實裝**：立刻載入那個你準備好的「石門 / 地標」，用我們剛做好的 `Scene Editor` 拉到場景中並寫入 `level3.js` 測試！
*   **[選項 B] 第一人稱互動開發**：狐狸模型 / 相機視角優化，以及用射線處理真正能與玩家互動的「機關按鈕」系統。
*   **[選項 C] 效能與架構重構**：趁亂度不高，現在立刻把 `main.js` 裡的 Editor 邏輯抽離成獨立模組，打下百年基業。
