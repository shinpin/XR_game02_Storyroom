# 📊 XR Storyroom 開發與學習可視化儀表板 (Learning Dashboard)

這是一份為您量身打造的動態可視化儀表板。它打破了傳統死板的文字筆記，透過視覺化的地圖，幫助您：
1. **定位開發周期**：清楚知道專案走到哪裡。
2. **釐清試錯階段 (探索中)**：將我們正在進行的難題標示出來。
3. **發現技術盲區 (未探索)**：由我（技術教練）幫您標註出您**可能忽略的進階技術**。

## 🗺️ 學習與架構藍圖 (目前狀態)

```mermaid
flowchart TD
    %% 狀態定義
    classDef mastered fill:#d4edda,stroke:#28a745,stroke-width:2px,color:#155724;
    classDef exploring fill:#fff3cd,stroke:#ffc107,stroke-width:2px,stroke-dasharray: 5 5,color:#856404;
    classDef unexplored fill:#f8d7da,stroke:#dc3545,stroke-width:2px,color:#721c24;

    %% 圖例
    subgraph Legend [狀態圖例]
        direction LR
        L1[✅ 已掌握 / 已完成]:::mastered
        L2[🚧 探索試錯中 / 開發中]:::exploring
        L3[⚠️ 未探索 / 忽略的盲區]:::unexplored
    end

    %% 開發生命周期
    subgraph Lifecycle [🔄 開發周期階段 (Lifecycle)]
        direction LR
        Concept[1. 概念 Concept]:::mastered --> POC[2. 驗證 POC]:::mastered
        POC --> Feature[3. 功能開發]:::exploring
        Feature --> Test[4. 測試除錯]:::exploring
        Test --> Refactor[5. 系統重構]:::unexplored
        Refactor --> Deploy[6. 佈署發布]:::unexplored
    end

    %% 技術層面：成像與邏輯
    subgraph Domains [🧠 技術領域矩陣 (Knowledge Domains)]
        direction TB
        
        subgraph Render [🎨 成像與素材 (Assets & Render)]
            R1(GLB 模型與動畫載入):::mastered
            R2(Three.js 光影與環境):::mastered
            R3(效能最佳化/Draw Calls):::unexplored
            R4(自訂 Shader 特效):::unexplored
        end
        
        subgraph Interact [🎮 物理與互動 (Physics & Logic)]
            I1(Cannon.js 邊界碰撞):::exploring
            I2(WebXR 操作與傳送):::exploring
            I3(多人連線同步機制):::unexplored
            I4(空間沉浸音效 Spatial Audio):::unexplored
        end
        
        subgraph Arch [🏗️ 系統與資料架構 (Architecture)]
            A1(Vite 本地網路與 HTTPS 設定):::mastered
            A2(CoreEngine 模組化拆分):::exploring
            A3(全域狀態管理 State/Redux):::unexplored
            A4(自動化 CI/CD 發布流程):::unexplored
            A5(資料庫 / API 串接):::unexplored
        end
    end

    %% 關聯性連結
    Feature -.要求.-> Interact
    POC -.基礎.-> Render
    Refactor -.關聯.-> Arch

```

---

## 👨‍🏫 教練點評與專注建議 (Coach Insights)

基於這張儀表板，為您分析目前的戰略調整：

1. **您擅長且已建立信心的領域 (綠色)**：
   您在**場景成像 (載入 3D 模型)** 與 **環境基礎設定 (Vite 開發環境)** 已經駕輕就熟。這代表您具備強大的「視覺化實作能力」，能迅速把想法轉換為畫面上看得到的成果 (POC 階段極強)！

2. **火力集中的試錯區 (黃色)**：
   我們目前深陷在 **物理邊界邏輯** 與 **系統模組拆分**。這是在從「玩具化專案」跨越到「可擴充化專案」必經的陣痛期。建議我們目前的精力 80% 都留在這裡，不要急著跳到下一個階段。

3. **目前忽略，但未來會成為瓶頸的盲區 (紅色)**：
   做為教練，我標出了幾項您尚未觸及的底層技術：
   * **效能最佳化 (Draw calls)**：在 WebXR 裡，如果缺乏效能管理，頭盔的幀數 (FPS) 會卡頓導致玩家暈眩。
   * **狀態管理 (State)**：當關卡從 1 關變 10 關，或是涉及玩家分數與道具時，純靠 `ui.js` 傳值會大崩潰，需提早規劃統一的狀態管理器。
   * **自動部署 (CI/CD)**：目前我們都在 Local 端跑，尚未規劃怎麼把遊戲放上網頁讓全世界的人玩（如 GitHub Pages 或 Vercel）。
