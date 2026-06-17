# AutoRollCall (Node.js Version)

[![npm version](https://img.shields.io/npm/v/auto-rollcall-tronclass.svg)](https://www.npmjs.com/package/auto-rollcall-tronclass)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

**TronClass 校園點名系統的全自動點名工具 (Clean Room Node.js 版本)**

這是一個專門為 TronClass 系統打造的自動點名監控與簽到工具。此版本已全面使用 JavaScript (Node.js) 徹底重構，並以 **Apache 2.0** 授權釋出，提供更輕量、更高擴充性的架構，且完美支援作為 NPM 依賴被其他專案引入。

此專案內附的 Python 版本程式碼（包含 CLI Bot、各種通知適配器與 PyQt 介面）仍然保留在專案根目錄中，但該部分的授權維持 **AGPL-3.0**。

> 請只在你自己有權限、且符合學校與課程規範的情況下使用。

---

## 主要特色

- **數字點名 (PIN Auth)**：內建多線程非同步暴力破解（0000-9999），偵測到點名自動算出並送出正確的點名碼。
- **雷達點名 (Geo Auth)**：內建基於 `@turf/turf` 與 `ml-levenberg-marquardt` 的全球定位演算法，能精確解算並自動定位打卡。
- **NPM 友善與模組化 (Modularized)**：抽離所有的 `console.log`，支援依賴注入 (Dependency Injection) 的 Logger，極度適合整合進 Discord Bot 或其他自動化系統。

---

## 安裝方式

您必須先在電腦上安裝 **Node.js (v18 或以上)**。

打開終端機，執行以下指令將工具全域安裝：

```bash
npm install -g auto-rollcall-tronclass
```

---

## 快速啟動

在任意資料夾中建立一個 `config.yaml` 檔案，用來設定您的學校與帳號：

```yaml
provider:
  base_url: "https://ilearn.thu.edu.tw" # 替換成您學校的 TronClass 網址

accounts:
  current: "default"
  profiles:
    default:
      user: "您的學號"
      passwd: "您的密碼"

monitor:
  interval: 15 # 輪詢間隔 (秒)
```

建立好檔案後，在同一個資料夾底下執行：

```bash
trothu run
```

程式就會自動登入，並開始在背景無窮迴圈監控點名。

---

## 開發者：作為 NPM 模組引入

此版本 (v3.0.0+) 已被設計為可以輕鬆作為底層依賴。您可以這樣將它整合進自己的 Node.js 專案：

```javascript
const { CampusNetworkAgent } = require('auto-rollcall-tronclass/src/lms-agent/agent');
const { AttendanceWatcher } = require('auto-rollcall-tronclass/src/attendance-tasks/watcher');

// 傳入您自訂的 Logger (例如 winston 或 irika-Logger-System)
const myLogger = require('irika-Logger-System');

const config = {
  base_url: 'https://ilearn.thu.edu.tw'
};

const agent = new CampusNetworkAgent(config, { logger: myLogger });
const watcher = new AttendanceWatcher(agent, { logger: myLogger, interval: 15 });

async function start() {
  await agent.authenticate('user', 'pass');
  await watcher.start();
}

start();
```

---

## 關於舊版 Python (AGPLv3)

原本的 Python 舊版程式碼（包含 CLI Bot、各種通知適配器與 PyQt 介面）仍然保留在專案根目錄中，但該部分的授權維持 **AGPL-3.0**。

如果您需要查看 Python 版本的說明或安裝方式，請參閱：
 **[README-Python.md](./README-Python.md)**

---

## 致謝與來源 (Credits)

雖然此 Node.js 版本完全重新編寫了架構、邏輯與演算法，以消除 AGPL 傳染性並採用 Apache 2.0 授權，但本專案最初的核心 API 逆向工程與靈感，皆源自於原作者的開源貢獻。

特別感謝原專案作者：
- **Original author**: [@silvercow002](https://github.com/silvercow002)
- **Original project**: [silvercow002/tronclass-script](https://github.com/silvercow002/tronclass-script) (MIT License)
- **衍生專案**: [hot-YUser/auto-rollcall-thu-tronclass](https://github.com/hot-YUser/auto-rollcall-thu-tronclass) (AGPL-3.0 License)

感謝他們為 TronClass 自動化開創了先河！  
不過版專案的Python版本內容僅做為參考文件使用，請勿直接使用或修改其中的程式碼，因為它已經不再維護且可能存在安全風險。
