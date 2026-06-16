# AutoRollCall (純 JS / NPM 版) 使用指南

這份文件專門介紹如何使用發布在 NPM 上的純 JavaScript 版 `auto-rollcall-thu-tronclass`。此版本跨平台、輕量且高效，專注於提供最核心的全自動點名功能（支援數字、雷達、QR 點名）。

## 系統需求

- **Node.js**: v18.0.0 或以上版本。

---

## 1. 安裝

打開您的終端機（Terminal / PowerShell / 命令提示字元），輸入以下指令進行全域安裝：

```bash
npm install -g auto-rollcall-thu-tronclass
```

安裝完成後，您的系統將會多出一個全域指令 `trothu`。

---

## 2. 初次設定 (`config.yaml`)

NPM 版本使用標準的 YAML 格式來管理設定。請在您打算執行監控的資料夾（例如您的桌面或某個專案資料夾）中，建立一個名為 `config.yaml` 的檔案。

最基本的設定檔內容如下：

```yaml
accounts:
  current: default
  profiles:
    default:
      user: "你的學號"
      passwd: "你的密碼"
      label: "我的預設帳號"

# TronClass 伺服器設定 (填入您學校的 TronClass 網域)
provider:
  base_url: "https://ilearn.thu.edu.tw"

# 系統輪詢點名的頻率 (預設 15 秒)
monitor:
  interval: 15
```

> **注意**：`provider.base_url` 請替換為您學校的 TronClass 系統網址。例如：
> - 東海大學：`https://ilearn.thu.edu.tw`
> - 淡江大學：`https://iclass.tku.edu.tw`
> - 東吳大學：`https://tronclass.scu.edu.tw`
> - 輔仁大學：`https://tronclass.fju.edu.tw`

---

## 3. 啟動與執行

在包含 `config.yaml` 的資料夾下，執行以下指令：

```bash
trothu run
```

---

## 4. 終端機輸入 / 輸出範例

當您執行 `trothu run` 後，程式會在背景不斷輪詢，並將即時狀態印在終端機上。

### 範例 A：啟動與閒置狀態
啟動時，它會讀取您的設定並嘗試登入。登入成功後，若目前沒有點名，它會以印出 `.` 來代表每一次的輪詢。

```text
$ trothu run
[Boot] Starting AutoRollCall in C:\Users\user\Desktop\Rollcall
[Auth] Attempting login for user: s1234567 ...
[Auth] Login successful. Session verified.
[Monitor] Starting polling loop. Waiting for rollcalls...
.......
```

### 範例 B：偵測到「數字點名」並成功破解
一旦老師開啟了數字點名，它會立刻偵測到並啟動多線程暴力破解，找出正確的 4 碼並送出：

```text
........
[Rollcall Detected] Type: number, ID: 123456, Status: is_number
[Submit] Starting submission for number (ID: 123456)...
[Submit] Result: success. 點名碼 4821 提交成功。
[Idle] Currently on_call_fine. Idling.
..........
```

### 範例 C：偵測到「雷達點名」並自動打卡
雷達點名不需要暴力破解，程式會根據內建的地圖網格與漏洞特性，自動完成經緯度定位與簽到：

```text
..........
[Rollcall Detected] Type: radar, ID: 789012, Status: is_radar
[Submit] Starting submission for radar (ID: 789012)...
[Submit] Result: success. Radar submitted successfully.
[Idle] Currently on_call_fine. Idling.
......
```

### 範例 D：偵測到不支援自動化的 QR Code 點名
因為系統無法憑空猜測 QR Code 內容，會提示您遇到 QR 點名：

```text
..........
[Rollcall Detected] Type: qrcode, ID: 345678, Status: unsupported_qrcode
[QR] 偵測到 QR Code 點名，請貼上 QR 內容後手動送出。 (Please provide QR payload manually to the system)
```

### 範例 E：密碼錯誤或登入失敗

```text
$ trothu run
[Boot] Starting AutoRollCall in C:\Users\user\Desktop\Rollcall
[Auth] Attempting login for user: s1234567 ...
[Error] Login error: Login failed unexpectedly: Invalid credentials
```

---

## 常見問題 (FAQ)

**Q1: 我需要一直開著終端機嗎？**
是的。只要您把終端機關閉，監控程式就會停止。如果您希望它在背景默默執行，可以使用像 `pm2` 或 `tmux` 這類的工具。

```bash
# 使用 pm2 讓程式在背景常駐執行
npm install -g pm2
pm2 start trothu --name "autorollcall" -- run
```

**Q2: 它可以設定排程（只有上課時間才監控）嗎？**
NPM 版本專注於核心極簡化。如果您需要強大的排程、行事曆對接、或是推播通知 (Discord / Line / Telegram)，請參考 GitHub 上的 Python 完整版原始碼。

**Q3: 遇到錯誤 `UnauthorizedError` 怎麼辦？**
這代表您的登入 Session 已經過期或被伺服器踢出。請按下 `Ctrl+C` 結束程式，然後重新執行 `trothu run`，程式會自動使用 `config.yaml` 內的帳密重新登入。
