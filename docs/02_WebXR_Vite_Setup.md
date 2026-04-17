# 🚀 WebXR 與 Vite 開發設定須知

本文件整理了為何在 WebXR 專案（如結合 Three.js）中推薦使用 Vite 的核心知識點。這份紀錄設計為**模組化知識點**，方便您未來直接匯出並上傳到 **Google NotebookLM** 等知識庫進行快速問答。

---

## 1. 為何選擇 Vite 進行 WebXR 開發？

在純 HTML/JS 搭配瀏覽器直譯的環境下開發 3D 與 XR 應用會有許多限制，Vite 解決了以下主要痛點：

### A. 支援現代化 npm 套件解析 (Bare Imports)
WebXR 開發幾乎一定會用到開源引擎（如 `three`、`cannon-es` 等）。如果沒有打包工具，在瀏覽器端寫 `import * as THREE from 'three'` 會引發路徑錯誤（瀏覽器不認得 node_modules）。
*   **Vite 的作用：** 會自動在背景攔截並補齊這些路徑。您可以維持舒服的現代化 JavaScript 語法來開發。

### B. 毫秒級熱更新 (HMR - Hot Module Replacement)
開發 3D 遊戲與 XR 體驗，開發者需要頻繁微調以下屬性：
*   燈光強度與色調
*   攝影機與模型的座標 (`x`, `y`, `z`)
*   物理引擎的摩擦力與反彈係數
*   **Vite 的作用：** 每當您儲存檔案，畫面裡的場景能做到「局部熱更新」，不用整頁刷新。能讓微調畫面的效率提升數倍。

### C. 輕鬆解決素材讀取與跨域 (CORS) 問題
載入 `.glb` (3D 模型)、`.jpg` (貼圖) 或 `.mp3` (音效) 如果只用普通的本地檔案（`file://`），瀏覽器會因為安全性而阻擋資源。Vite 幫您架設好的本機伺服器完美避開這些問題。

---

## 2. 實用：VR 頭盔實機測試指南（重要！）

WebXR 規範要求**最高層級的網路環境安全**。這代表 WebXR 只能在以下兩種情況被啟用：
1. 本機端：`http://localhost` 或 `http://127.0.0.1` 
2. **具備 SSL 憑證的安全網路 (HTTPS)**

如果您把 **Meta Quest 等實體頭盔**跟電腦連在同一個 Wi-Fi 下，用頭盔連到電腦的區網 IP（例如 `http://192.168.1.50:5173`），因為這不是 localhost 也沒有 HTTPS，**WebXR 按鈕會直接失效或報錯**！

### 解決方案：如何用 Vite 實現頭盔測試
要解決這個問題，Vite 有極為簡易的流程：

1. **暴露到區網 IP 讓頭盔連線：**
   在 `package.json` 修改指令：
   ```json
   "scripts": {
     "dev": "vite --host"
   }
   ```
   *輸入指令後，終端機會顯示您的 Network IP，頭盔輸入此 IP 即可連線。*

2. **啟用 HTTPS（讓 XR 模式能順利啟動）：**
   如果您透過區網 IP 連線遇到 XR 被擋下的問題，您可以安裝官方套件快速生出本機 HTTPS 憑證。
   * 安裝：`npm install @vitejs/plugin-basic-ssl -D`
   * 在根目錄新增 `vite.config.js` 並填入：
     ```javascript
     import { defineConfig } from 'vite';
     import basicSsl from '@vitejs/plugin-basic-ssl';
     
     export default defineConfig({
       plugins: [basicSsl()]
     });
     ```
