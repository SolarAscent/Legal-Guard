# Legal-Guard

Legal-Guard 是一个面向合同生成场景的轻量前后端原型。本版本聚焦“农副产品买卖合同（GF-2025-0151 示范文本）”的表单填写、合同生成、PDF 预览和 DOCX/PDF 下载。

## 功能亮点

- **合同表单页**：在 `/trial` 填写甲方、乙方、产品、数量、单价、总价、交货时间、交货地点。
- **示范文本生成**：后端按农副产品买卖合同示范文本结构生成 DOCX。
- **PDF 预览与下载**：使用 LibreOffice headless 将 DOCX 转成 PDF，前端可直接预览和下载。
- **DeepSeek 字段优化**：可选接入 DeepSeek，在生成前规范化用户输入，并拒绝违法、不当或恶意内容。
- **粤语语音填表 Demo**：可选接入阿里云智能语音交互，把粤语音频识别为文字后辅助填入合同字段。
- **点开即用部署**：提供 Dockerfile，部署后前端和后端在同一个网址下运行，使用者无需安装任何环境。
- **无数据库依赖**：生成文件暂存在 `server/storage/generated/<contractId>/`，适合课堂演示、原型验证和后续扩展。

## 项目结构

```text
Legal-Guard/
├── Dockerfile               # 单容器部署：前端构建 + 后端 API + LibreOffice
├── render.yaml              # Render Blueprint，可选
├── server/                  # Node/Express 合同生成 API
│   ├── src/
│   │   ├── contractDocument.js   # DOCX 合同模板生成
│   │   ├── deepseekSanitizer.js  # DeepSeek 字段规范化与拒绝逻辑
│   │   └── index.js              # API 路由、PDF 转换、文件下载
│   └── storage/generated/         # 运行时生成文件，默认不提交
└── vue-legal-guard/         # Vue 3 + Vite 前端
    └── src/pages/Trial.vue  # 合同生成表单和预览页
```

## 最简单上线方式

上线后的使用者只需要打开一个网址，例如：

```text
https://你的服务域名/#/trial
```

他们不需要安装 Node.js、LibreOffice、DeepSeek 配置或任何本地环境。

### 推荐：Render 部署

1. 进入 Render 控制台。
2. 选择 `New` -> `Blueprint`。
3. 连接你的 GitHub 仓库。
4. Render 会读取仓库根目录的 `render.yaml` 和 `Dockerfile`。
5. 在 Render 的 Environment 页面按需设置：

```text
DEEPSEEK_API_KEY=你的 DeepSeek API Key
NLS_APP_KEY=阿里云智能语音交互项目 Appkey
ALIYUN_NLS_TOKEN=阿里云智能语音交互 Access Token
```

6. 点击部署，等待构建完成。
7. 打开 Render 分配的域名，访问：

```text
https://你的-render域名/#/trial
```

### 其他 Docker 平台

如果使用 Railway、Fly.io、阿里云、腾讯云、服务器 Docker 等平台，只要支持 Dockerfile，也可以直接部署本仓库。

需要配置的环境变量：

```text
DEEPSEEK_API_KEY=你的 DeepSeek API Key
NLS_APP_KEY=阿里云智能语音交互项目 Appkey
ALIYUN_NLS_TOKEN=阿里云智能语音交互 Access Token
PORT=3001
```

容器启动后访问服务根域名即可，不需要单独启动前端。

### 本地模拟生产部署

如果本机已安装 Docker，可以先在本地测试“单网址运行”：

```bash
docker build -t legal-guard-contract .
docker run --rm -p 3001:3001 -e DEEPSEEK_API_KEY="你的 DeepSeek API Key" legal-guard-contract
```

然后打开：

```text
http://127.0.0.1:3001/#/trial
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

## 阿里云粤语语音配置

粤语语音输入是可选 Demo。未配置时，页面仍可手动填表并生成合同；点击语音识别会返回清晰配置错误。

需要先在阿里云智能语音交互控制台创建项目，并在项目功能配置里选择粤语识别模型。语种和方言模型不能在代码里动态指定，后端只使用对应项目的 Appkey 调用。

macOS / Linux：

```bash
cd Legal-Guard/server
export NLS_APP_KEY="你的阿里云项目 Appkey"
export ALIYUN_NLS_TOKEN="你的阿里云智能语音 Access Token"
export ALIYUN_NLS_SAMPLE_RATE=16000
npm run start
```

Windows PowerShell：

```powershell
cd Legal-Guard\server
$env:NLS_APP_KEY="你的阿里云项目 Appkey"
$env:ALIYUN_NLS_TOKEN="你的阿里云智能语音 Access Token"
$env:ALIYUN_NLS_SAMPLE_RATE="16000"
npm run start
```

可选环境变量：

```text
ALIYUN_NLS_ASR_ENDPOINT=https://nls-gateway-cn-shanghai.aliyuncs.com/stream/v1/asr
ALIYUN_NLS_AUDIO_FORMAT=wav
```

建议测试音频使用 60 秒以内、单声道、16 bit、8k/16k 采样率的 WAV/MP3/AAC/OGG 音频。

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
