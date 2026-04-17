# 📚 XR Storyroom 專案知識資料庫 (LM Knowledge Base)

**最後更新時間：** 2026-04-17
**專案名稱：** XR_game02_Storyroom
**用途：** 作為大型語言模型 (LM) 或是 Google NotebookLM 的根知識庫文件。

---

## 1. 專案概述 (Project Overview)
本專案為一個基於 WebXR 與 Three.js 的虛擬實境逃脫/情境解謎專案（Storyroom）。
核心開發環境使用 **Vite** 進行模組化建置與區域網路測試，並使用了第三方的 3D 渲染與物理邏輯引擎（包括 Three.js 與 Cannon-es 等）。

## 2. 核心架構與目前開發進度

目前開發已成功完成以下幾個主要模組與坑洞收斂，可作為 AI 輔助開發的先備知識：

### A. 關卡系統架構設計 (Level Design)
- 專案已實作多關卡管理邏輯（例如 `level1.js`, `level3.js` 等）。
- **古墓關卡 (Tomb Level 3)：** 目前已成功整合自訂的 3D 場景素材（如傳送門 / 門「door」模型）用於場景轉換與環境敘事。
- **渲染與碰撞除錯：** 針對常見的模型穿模（Clipping through the floor）以及資產未正確顯示（Visibility failed）等 WebXR 特有問題，已建立初步防錯機制，包含載入順序、縮放比例（Scaling）控制與 Debug 機制。

### B. 玩家化身系統 (Fox Avatar Integration)
- 將原先使用的 Debug 佔位幾何體替換成正式的自訂 3D GLB 動畫模型（`FOX_ANI`）。
- **第三人稱視角 (Third-Person Perspective)：** 處理並對齊了玩家攝影機與狐狸模型的相對位置，實現了 WebXR 控制器追蹤結合第三人稱模型的視覺表現方式。能夠確保在虛擬空間中縮放與座標配置的合理性。

### C. 開發工具配置與進度追蹤 (Development & Tracking)
- (詳見 `01_WebXR_Vite_Setup.md`)
- 本專案採用 Vite 開發環境，並具備暴露至本地 IP 與熱更新 (`HMR`) 支援，用於 Meta Quest 等實體頭盔直接連線測試。
- **(新增) 開發者儀表板：** 詳見 `02_Developer_Dashboard.md`，該文件透過 Mermaid 視覺化圖表，記錄當前專案模組的開發狀態與難易度，作為學習履歷與技術指引。

---

## 3. 下一步待解決議題 / 備忘錄 (TODO)
- 完善 `level1.js` 的核心遊玩流程。
- 更多關於 Cannon.js 物理引擎與模型碰撞的邊界條件優化。
- 不同關卡(`levelX.js`) 之間的流暢切換與音效管理。

> [!NOTE]
> **To AI Assistant / NotebookLM:** 
> 當面臨需求變更或新增關卡時，請先參照此文件以及 `docs/` 下的其他 Markdown 檔案，以確保新實作符合專案架構（如使用 `FOX_ANI` 狐狸模型及 Vite HTTPS 連線測試機制）。
