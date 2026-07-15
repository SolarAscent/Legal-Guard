import cors from "cors";
import express from "express";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { nanoid } from "nanoid";
import { z } from "zod";
import { createContractDocx } from "./contractDocument.js";
import {
  extractContractFieldsFromTranscript,
  isDeepSeekConfigured,
  sanitizeContractFieldsWithDeepSeek,
} from "./deepseekSanitizer.js";
import { isAliyunSpeechConfigured, transcribeCantoneseAudio } from "./speechService.js";

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SERVER_ROOT = resolve(__dirname, "..");
const STORAGE_ROOT = resolve(SERVER_ROOT, "storage", "generated");
const PUBLIC_DIR = resolve(SERVER_ROOT, "public");
const PUBLIC_INDEX = join(PUBLIC_DIR, "index.html");
const PORT = Number(process.env.PORT || 3001);

const app = express();

const contractSchema = z.object({
  partyA: z.string().trim().min(1, "甲方名称为必填项").max(120),
  partyB: z.string().trim().min(1, "乙方名称为必填项").max(120),
  productName: z.string().trim().min(1, "产品名称为必填项").max(120),
  quantity: z.string().trim().min(1, "数量为必填项").max(80),
  unitPrice: z.string().trim().min(1, "单价为必填项").max(80),
  totalPrice: z.string().trim().min(1, "总价为必填项").max(80),
  deliveryTime: z.string().trim().min(1, "交货时间为必填项").max(120),
  deliveryPlace: z.string().trim().min(1, "交货地点为必填项").max(160),
});

const speechSchema = z.object({
  audioBase64: z.string().min(1, "请上传音频"),
  mimeType: z.string().max(100).optional(),
  sampleRate: z.number().int().positive().optional(),
});

let sofficePathCache;

async function findSoffice() {
  if (sofficePathCache !== undefined) return sofficePathCache;

  const candidates = [
    process.env.SOFFICE_PATH,
    "/Applications/LibreOffice.app/Contents/MacOS/soffice",
    "/usr/local/bin/soffice",
    "/opt/homebrew/bin/soffice",
    "/usr/bin/soffice",
    "/usr/local/bin/libreoffice",
    "/opt/homebrew/bin/libreoffice",
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      sofficePathCache = candidate;
      return sofficePathCache;
    }
  }

  for (const command of ["soffice", "libreoffice"]) {
    try {
      const { stdout } = await execFileAsync("/bin/sh", ["-lc", `command -v ${command}`]);
      const resolvedCommand = stdout.trim();
      if (resolvedCommand) {
        sofficePathCache = resolvedCommand;
        return sofficePathCache;
      }
    } catch {
      // Continue probing other candidates.
    }
  }

  sofficePathCache = null;
  return sofficePathCache;
}

async function convertDocxToPdf(docxPath, outDir) {
  const soffice = await findSoffice();
  if (!soffice) {
    const error = new Error("请安装 LibreOffice 以生成 PDF");
    error.statusCode = 503;
    error.code = "LIBREOFFICE_MISSING";
    throw error;
  }

  await execFileAsync(soffice, [
    "--headless",
    "--convert-to",
    "pdf",
    "--outdir",
    outDir,
    docxPath,
  ]);
}

function contractPaths(contractId) {
  if (!/^[A-Za-z0-9_-]{8,32}$/.test(contractId)) {
    const error = new Error("合同编号无效");
    error.statusCode = 404;
    throw error;
  }

  const dir = join(STORAGE_ROOT, contractId);
  return {
    dir,
    docx: join(dir, "contract.docx"),
    pdf: join(dir, "contract.pdf"),
  };
}

async function assertReadable(filePath) {
  try {
    const stats = await stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

function sendMissing(res, type) {
  return res.status(404).json({
    error: `${type} 文件不存在或尚未生成`,
  });
}

app.use(cors());
app.use(express.json({ limit: "14mb" }));

app.get("/api/health", async (_req, res) => {
  const soffice = await findSoffice();
  res.json({
    ok: true,
    libreOffice: Boolean(soffice),
    sofficePath: soffice,
    deepSeekConfigured: isDeepSeekConfigured(),
    aliyunSpeechConfigured: isAliyunSpeechConfigured(),
  });
});

app.post("/api/speech/cantonese", async (req, res, next) => {
  const result = speechSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: "语音请求不完整",
      details: result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  try {
    const transcription = await transcribeCantoneseAudio(result.data);
    const extraction = await extractContractFieldsFromTranscript(transcription.text);

    if (!extraction.approved) {
      return res.status(422).json({
        error: extraction.reason || "语音内容不适合生成合同，请重新录入",
        code: "VOICE_INPUT_REJECTED",
        text: transcription.text,
        fields: extraction.fields,
      });
    }

    return res.json({
      text: transcription.text,
      taskId: transcription.taskId,
      provider: transcription.provider,
      fields: extraction.fields,
      missingFields: extraction.missingFields,
      parsedBy: extraction.source,
    });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/contracts", async (req, res, next) => {
  const result = contractSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: "表单信息不完整",
      details: result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  const contractId = nanoid(12);
  const paths = contractPaths(contractId);

  try {
    const sanitized = await sanitizeContractFieldsWithDeepSeek(result.data);
    await mkdir(paths.dir, { recursive: true });
    await createContractDocx(sanitized.fields, paths.docx);
    await convertDocxToPdf(paths.docx, paths.dir);

    return res.status(201).json({
      id: contractId,
      previewUrl: `/api/contracts/${contractId}/preview.pdf`,
      docxUrl: `/api/contracts/${contractId}/download.docx`,
      pdfUrl: `/api/contracts/${contractId}/download.pdf`,
      normalizedFields: sanitized.fields,
      normalizedBy: sanitized.source,
    });
  } catch (error) {
    return next(error);
  }
});

app.get("/api/contracts/:id/preview.pdf", async (req, res) => {
  const paths = contractPaths(req.params.id);
  if (!(await assertReadable(paths.pdf))) return sendMissing(res, "PDF");
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="contract-${req.params.id}.pdf"`);
  return res.sendFile(paths.pdf);
});

app.get("/api/contracts/:id/download.pdf", async (req, res) => {
  const paths = contractPaths(req.params.id);
  if (!(await assertReadable(paths.pdf))) return sendMissing(res, "PDF");
  return res.download(paths.pdf, `nongfu-contract-${req.params.id}.pdf`);
});

app.get("/api/contracts/:id/download.docx", async (req, res) => {
  const paths = contractPaths(req.params.id);
  if (!(await assertReadable(paths.docx))) return sendMissing(res, "DOCX");
  return res.download(paths.docx, `nongfu-contract-${req.params.id}.docx`);
});

if (existsSync(PUBLIC_INDEX)) {
  app.use(express.static(PUBLIC_DIR));
  app.use((req, res, next) => {
    if ((req.method === "GET" || req.method === "HEAD") && !req.path.startsWith("/api/")) {
      return res.sendFile(PUBLIC_INDEX);
    }
    return next();
  });
}

app.use((error, _req, res, _next) => {
  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({
    error: error.message || "服务器生成合同失败",
    code: error.code || "CONTRACT_GENERATION_FAILED",
    fields: error.fields,
  });
});

await mkdir(STORAGE_ROOT, { recursive: true });
const soffice = await findSoffice();
if (!soffice) {
  console.warn("LibreOffice not found. POST /api/contracts will return: 请安装 LibreOffice 以生成 PDF");
}

app.listen(PORT, () => {
  console.log(`Legal-Guard contract API listening on http://localhost:${PORT}`);
});
