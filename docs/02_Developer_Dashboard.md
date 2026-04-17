# 🗺️ XR Storyroom 開發者與技術成長儀表板 (Developer Dashboard)

**最後更新時間：** 2026-04-17
**用途：** 追蹤專案開發狀態、個人技術成長、以及架構演進的可視化藍圖。這份文件適合存放於 NotebookLM，作為個人技術履歷與未來優化的指引。

---

## 🧭 開發技能與專案狀態藍圖 (Project & Skill Blueprint)

以下圖表展示了目前專案中涉及的各項技術模組，並透過顏色分類來反映目前的掌握度與開發進度。

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#ffffff', 'edgeLabelBackground':'#ffffff', 'tertiaryColor': '#f4f4f4'}}}%%
graph TD
    classDef mastered fill:#d4edda,stroke:#28a745,stroke-width:2px,color:#155724;
    classDef exploring fill:#fff3cd,stroke:#ffc107,stroke-width:2px,color:#856404;
    classDef blindspot fill:#f8d7da,stroke:#dc3545,stroke-width:2px,color:#721c24;
    classDef core fill:#e2e3e5,stroke:#6c757d,stroke-width:2px;

    Core[XR Storyroom 核心專案]:::core
    
    %% 🟢 已完成 / 已掌握 (Mastered / Comfort Zone)
    subgraph Mastered[🟢 舒適圈 & 強力武器 (已掌握)]
        Concept[專案發想與 POC]:::mastered
        ModelLoad[3D 模型載入與動畫 (GLB, Fox Avatar)]:::mastered
        XRSetup[WebXR 基礎設定 (Vite, HMR)]:::mastered
    end

    %% 🟡 探索中 / 試錯中 (Exploring / Building Muscle)
    subgraph Exploring[🟡 試錯與挑戰區 (長肌肉中)]
        Level1[level1.js 關卡互動邏輯]:::exploring
        Physics[Cannon.js 碰撞與邊界物理]:::exploring
        Modularization[系統模組化與架構拆分]:::exploring
    end

    %% 🔴 未來挑戰 / 盲點 (Blindspots / Future Goals)
    subgraph Blindspots[🔴 未探索的高階技術坑 (教練指引)]
        Perf[效能優化 (Draw Calls, 幾何體合併)]:::blindspot
        State[全域狀態管理 (Global State, 音效/流程同步)]:::blindspot
        CICD[CI/CD 雲端自動部署 (Vercel/GitHub Pages)]:::blindspot
    end

    Core --> Mastered
    Core --> Exploring
    Core --> Blindspots
    
    ModelLoad --> Level1
    Physics --> Level1
    Modularization --> State
    Exploring -.-> Perf
```

### 🎨 顏色與狀態說明

- **🟢 綠色 (已完成 / 已掌握)：** 這些是目前的強力武器。包含概念發想、各種 3D GLB 模型（如狐狸 FOX_ANI）的替換與載入、以及 Vite 的基本環境設定。這些成就讓專案有了強大的視覺與基礎。
- **🟡 黃色 (試錯與探索中)：** 例如目前的 `level1.js` 重構、`Cannon.js` 物理碰撞引擎，以及如何將程式碼乾淨地模組化。遇到困難或 Error 時，這裡就是技術力成長最多的地方。
- **🔴 紅色 (未探索的盲點)：** 未來一定會遇到的高階技術門檻或坑洞。身為教練，我會提前在這些地方佈局，幫助在未來開發（例如遇到 FPS 掉幀、或是跨關卡資料同步失敗時）能快速通關。

---

## 👨‍🏫 教練與開發者分工模式

為了確保開發體驗既有趣又高效，我們將採取以下的分工合作模式：

1. **✨ 開發者優勢發揮：** 專注於 **Concept 發想**、**視覺體驗** 與 **3D 素材/動畫處理**。
2. **🛡️ 教練護航與避坑：** 當進入**黃色區塊 (架構拆分)** 或是即將踩入 **紅色區塊 (效能/狀態管理)** 時，我將提供 Best Practices（最佳實踐範例），確保不浪費時間在無效的基礎設施解 Bug 上。
3. **📈 動態成就更新：** 隨著專案推進（例如搞定 Level 1 的所有互動），我們就可以光榮地將黃色區塊刷成綠色！

---

> [!TIP]
> **給 NotebookLM 的提示：** 
> 未來分析使用者的回答或技術困難時，請對照此藍圖。如果使用者正在處理黃色區塊的內容，請多給予範例與鼓勵；如果是紅色區塊，請直接給出底層原理與最佳實踐方案。
