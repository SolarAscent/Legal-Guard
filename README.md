# Legal-Guard

Legal-Guard 是一个面向合同生成场景的轻量前后端原型。本版本聚焦“农副产品买卖合同（GF-2025-0151 示范文本）”的表单填写、合同生成、PDF 预览和 DOCX/PDF 下载。

## 功能亮点

- **合同表单页**：在 `/trial` 填写甲方、乙方、产品、数量、单价、总价、交货时间、交货地点。
- **示范文本生成**：后端按农副产品买卖合同示范文本结构生成 DOCX。
- **PDF 预览与下载**：使用 LibreOffice headless 将 DOCX 转成 PDF，前端可直接预览和下载。
- **DeepSeek 字段优化**：可选接入 DeepSeek，在生成前规范化用户输入，并拒绝违法、不当或恶意内容。
- **无数据库依赖**：生成文件暂存在 `server/storage/generated/<contractId>/`，适合课堂演示、原型验证和后续扩展。

## 项目结构

```text
Legal-Guard/
├── server/                  # Node/Express 合同生成 API
│   ├── src/
│   │   ├── contractDocument.js   # DOCX 合同模板生成
│   │   ├── deepseekSanitizer.js  # DeepSeek 字段规范化与拒绝逻辑
│   │   └── index.js              # API 路由、PDF 转换、文件下载
│   └── storage/generated/         # 运行时生成文件，默认不提交
└── vue-legal-guard/         # Vue 3 + Vite 前端
    └── src/pages/Trial.vue  # 合同生成表单和预览页
```

## 运行环境

- Node.js 18+
- npm
- LibreOffice，用于 DOCX 转 PDF

## 安装命令

### macOS

安装 Node.js 和 npm：

```bash
brew install node
```

安装 LibreOffice：

```bash
brew install --cask libreoffice
```

### Linux - Ubuntu / Debian

安装 Node.js、npm 和 LibreOffice：

```bash
sudo apt update
sudo apt install -y nodejs npm libreoffice
```

检查版本：

```bash
node -v
npm -v
soffice --version
```

### Linux - Fedora

安装 Node.js、npm 和 LibreOffice：

```bash
sudo dnf install -y nodejs npm libreoffice
```

检查版本：

```bash
node -v
npm -v
soffice --version
```

### Linux - CentOS / RHEL

启用 NodeSource Node.js 20，并安装 LibreOffice：

```bash
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs libreoffice
```

检查版本：

```bash
node -v
npm -v
soffice --version
```

### Windows

使用 winget 安装 Node.js LTS 和 LibreOffice：

```powershell
winget install OpenJS.NodeJS.LTS
winget install TheDocumentFoundation.LibreOffice
```

关闭并重新打开 PowerShell 后检查版本：

```powershell
node -v
npm -v
& "C:\Program Files\LibreOffice\program\soffice.exe" --version
```

如果 LibreOffice 不在默认路径，启动后端前设置 `SOFFICE_PATH`：

```powershell
$env:SOFFICE_PATH="C:\Program Files\LibreOffice\program\soffice.exe"
```

## 本地启动

### macOS / Linux

启动后端：

```bash
cd Legal-Guard/server
npm install
npm run start
```

启动前端：

```bash
cd Legal-Guard/vue-legal-guard
npm install
npm run dev -- --host 127.0.0.1
```

### Windows PowerShell

启动后端：

```powershell
cd Legal-Guard\server
npm install
npm run start
```

启动前端：

```powershell
cd Legal-Guard\vue-legal-guard
npm install
npm run dev -- --host 127.0.0.1
```

访问：

```text
http://127.0.0.1:5173/#/trial
```

## DeepSeek 配置

DeepSeek 是可选能力。未配置时，系统仍会使用本地规则生成合同；配置后，会在生成前调用 DeepSeek 优化字段。

不要把 API Key 写入代码、README、`.env` 或提交记录。建议使用临时环境变量：

macOS / Linux：

```bash
cd Legal-Guard/server
read -s DEEPSEEK_API_KEY
export DEEPSEEK_API_KEY
npm run start
```

Windows PowerShell：

```powershell
cd Legal-Guard\server
$secureKey = Read-Host "DeepSeek API Key" -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
$env:DEEPSEEK_API_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
npm run start
```

可选环境变量，macOS / Linux：

```bash
export DEEPSEEK_BASE_URL=https://api.deepseek.com
export DEEPSEEK_MODEL=deepseek-v4-flash
```

可选环境变量，Windows PowerShell：

```powershell
$env:DEEPSEEK_BASE_URL="https://api.deepseek.com"
$env:DEEPSEEK_MODEL="deepseek-v4-flash"
```

健康检查：

macOS / Linux：

```bash
curl http://127.0.0.1:3001/api/health
```

Windows PowerShell：

```powershell
Invoke-RestMethod http://127.0.0.1:3001/api/health
```

返回中的 `deepSeekConfigured` 可用于确认 DeepSeek 是否已启用。

## API

### 生成合同

```http
POST /api/contracts
Content-Type: application/json
```

请求体：

```json
{
  "partyA": "甲方名称",
  "partyB": "乙方名称",
  "productName": "鹰嘴桃",
  "quantity": "1000 斤",
  "unitPrice": "12 元/斤",
  "totalPrice": "12000 元",
  "deliveryTime": "2026 年 7 月 1 日",
  "deliveryPlace": "广东省河源市连平县"
}
```

成功响应：

```json
{
  "id": "contractId",
  "previewUrl": "/api/contracts/contractId/preview.pdf",
  "docxUrl": "/api/contracts/contractId/download.docx",
  "pdfUrl": "/api/contracts/contractId/download.pdf",
  "normalizedBy": "local"
}
```

若 DeepSeek 判定内容违法、不当、恶意或不适合写入合同，接口会返回 `422 CONTRACT_INPUT_REJECTED`，前端会展示拒绝原因。

## 开发说明

- DOCX 是合同生成的源格式，PDF 从 DOCX 转换而来，避免维护两套版式。
- 当前只实现农副产品买卖合同生成，不包含登录、电子签约、合同管理、AI 法审报告等功能。
- 生成文件和依赖目录已通过 `.gitignore` 排除，不应提交运行时产物。
