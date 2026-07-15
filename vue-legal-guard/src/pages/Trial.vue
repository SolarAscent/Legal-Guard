<template>
  <div class="contract-generator">
    <header class="topbar">
      <router-link to="/" class="brand" aria-label="返回首页">
        <span class="brand-mark"><i class="fa-solid fa-scale-balanced"></i></span>
        <span>岭南法务百县通</span>
      </router-link>
      <router-link to="/" class="back-link">
        <i class="fa-solid fa-arrow-left"></i>
        返回首页
      </router-link>
    </header>

    <main class="workspace">
      <section class="hero-band">
        <div class="hero-copy">
          <p class="eyebrow">乡村合同生成工作台</p>
          <h1>讲清楚交易，生成一份能看的农副产品买卖合同</h1>
          <p class="hero-description">
            选择常见场景，手填或用粤语音频辅助填表。后端会把信息写入示范文本，并生成 PDF 预览和 DOCX/PDF 下载。
          </p>
        </div>
        <div class="hero-status">
          <span><i class="fa-solid fa-file-contract"></i> GF-2025-0151</span>
          <strong>{{ contract ? '已生成合同' : '等待填写' }}</strong>
        </div>
      </section>

      <section class="scenario-section" aria-label="场景入口">
        <div class="section-title">
          <div>
            <h2>先选一个场景</h2>
            <p>入口按农户真实说法命名，当前落到农副产品买卖合同模板。</p>
          </div>
        </div>
        <div class="scenario-grid">
          <button
            v-for="scenario in scenarios"
            :key="scenario.id"
            type="button"
            class="scenario-card"
            :class="{ active: selectedScenario === scenario.id }"
            @click="applyScenario(scenario)"
          >
            <span class="scenario-icon"><i :class="scenario.icon"></i></span>
            <span>
              <strong>{{ scenario.title }}</strong>
              <small>{{ scenario.subtitle }}</small>
            </span>
          </button>
        </div>
      </section>

      <div class="content-grid">
        <section class="form-panel" aria-label="合同信息表单">
          <div class="section-title form-title">
            <div>
              <h2>合同基础信息</h2>
              <p>{{ scenarioHint }}</p>
            </div>
            <span class="template-pill">买卖合同</span>
          </div>

          <section class="voice-panel" aria-label="粤语语音输入">
            <div class="voice-header">
              <span class="voice-icon"><i class="fa-solid fa-microphone-lines"></i></span>
              <div>
                <h3>粤语语音填表</h3>
                <p>先把粤语音频转成文字，再尝试填入表单字段。</p>
              </div>
            </div>
            <div class="voice-actions">
              <button type="button" class="secondary-action" :disabled="voiceLoading" @click="toggleRecording">
                <i :class="isRecording ? 'fa-solid fa-stop' : 'fa-solid fa-microphone'"></i>
                {{ isRecording ? '停止录音' : '开始录音' }}
              </button>
              <label class="upload-action">
                <i class="fa-solid fa-file-audio"></i>
                上传音频
                <input type="file" accept="audio/*" :disabled="voiceLoading" @change="handleAudioUpload" />
              </label>
              <span v-if="voiceLoading" class="voice-loading">
                <i class="fa-solid fa-circle-notch fa-spin"></i>
                识别中
              </span>
            </div>
            <div v-if="voiceError" class="inline-alert error" role="alert">
              <i class="fa-solid fa-triangle-exclamation"></i>
              <span>{{ voiceError }}</span>
            </div>
            <div v-if="voiceText" class="transcript-box">
              <span>识别文本</span>
              <p>{{ voiceText }}</p>
            </div>
            <div v-if="missingFields.length" class="missing-fields">
              <span>还需手动补充：</span>
              <strong>{{ missingFieldLabels }}</strong>
            </div>
          </section>

          <form class="contract-form" @submit.prevent="generateContract">
            <div v-for="field in fields" :key="field.key" class="field">
              <label :for="field.key">
                {{ field.label }}
                <span>*</span>
              </label>
              <input
                :id="field.key"
                v-model.trim="form[field.key]"
                :type="field.type || 'text'"
                :placeholder="field.placeholder"
                :aria-invalid="Boolean(errors[field.key])"
                :class="{ invalid: errors[field.key] }"
                @input="errors[field.key] = ''"
              />
              <p v-if="errors[field.key]" class="field-error">{{ errors[field.key] }}</p>
            </div>

            <div class="form-actions">
              <button type="submit" class="primary-action" :disabled="loading">
                <i :class="loading ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-wand-magic-sparkles'"></i>
                {{ loading ? '正在生成合同' : '生成合同' }}
              </button>
              <button type="button" class="secondary-action" :disabled="loading" @click="resetForm">
                <i class="fa-solid fa-rotate-left"></i>
                清空
              </button>
            </div>
          </form>
        </section>

        <aside class="summary-panel" aria-label="合同生成状态">
          <div class="section-title compact">
            <div>
              <h2>生成状态</h2>
              <p>所有下载文件由同一份 DOCX 转换生成。</p>
            </div>
          </div>

          <ul class="mapping-list">
            <li><span>第 3 页</span>甲方、乙方基础信息</li>
            <li><span>第 4 页</span>产品信息表第 1 行</li>
            <li><span>第 4 页</span>交货时间与交货地点</li>
            <li><span>第 5 页</span>合同价款总价</li>
          </ul>

          <div v-if="apiError" class="status-box error" role="alert">
            <i class="fa-solid fa-circle-exclamation"></i>
            <div>
              <strong>生成失败</strong>
              <p>{{ apiError }}</p>
            </div>
          </div>

          <div v-else-if="contract" class="status-box success">
            <i class="fa-solid fa-circle-check"></i>
            <div>
              <strong>合同已生成</strong>
              <p>编号：{{ contract.id }}</p>
              <p>{{ normalizeLabel }}</p>
            </div>
          </div>

          <div v-else class="status-box neutral">
            <i class="fa-solid fa-circle-info"></i>
            <div>
              <strong>等待生成</strong>
              <p>提交表单后将在下方显示 PDF 预览。</p>
            </div>
          </div>

          <div class="download-actions" :class="{ disabled: !contract }">
            <a :href="contract?.pdfUrl || '#'" :aria-disabled="!contract">
              <i class="fa-solid fa-file-pdf"></i>
              下载 PDF
            </a>
            <a :href="contract?.docxUrl || '#'" :aria-disabled="!contract">
              <i class="fa-solid fa-file-word"></i>
              下载 DOCX
            </a>
          </div>
        </aside>
      </div>

      <section class="preview-section" aria-label="合同预览">
        <div class="preview-toolbar">
          <div>
            <h2>合同预览</h2>
            <p>{{ contract ? 'PDF 已由后端根据 DOCX 合同生成。' : '生成后将在此展示完整合同 PDF。' }}</p>
          </div>
          <a v-if="contract" class="open-preview" :href="contract.previewUrl" target="_blank" rel="noreferrer">
            <i class="fa-solid fa-up-right-from-square"></i>
            新窗口打开
          </a>
        </div>

        <div class="preview-frame">
          <iframe
            v-if="contract"
            :src="`${contract.previewUrl}#toolbar=1&navpanes=0`"
            title="农副产品买卖合同 PDF 预览"
          ></iframe>
          <div v-else class="preview-empty">
            <i class="fa-regular fa-file-lines"></i>
            <span>暂无合同预览</span>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, reactive, ref } from 'vue'

const initialForm = {
  partyA: '',
  partyB: '',
  productName: '',
  quantity: '',
  unitPrice: '',
  totalPrice: '',
  deliveryTime: '',
  deliveryPlace: '',
}

const fields = [
  { key: 'partyA', label: '甲方名称', placeholder: '例如：河源市某某商贸有限公司' },
  { key: 'partyB', label: '乙方名称', placeholder: '例如：连平县某某种植专业合作社' },
  { key: 'productName', label: '产品名称', placeholder: '例如：鹰嘴桃' },
  { key: 'quantity', label: '数量', placeholder: '例如：1000 斤' },
  { key: 'unitPrice', label: '单价', placeholder: '例如：12 元/斤' },
  { key: 'totalPrice', label: '总价', placeholder: '例如：12000 元' },
  { key: 'deliveryTime', label: '交货时间', placeholder: '例如：2026 年 7 月 1 日' },
  { key: 'deliveryPlace', label: '交货地点', placeholder: '例如：广东省河源市连平县' },
]

const fieldLabelMap = Object.fromEntries(fields.map((field) => [field.key, field.label]))

const scenarios = [
  {
    id: 'sell-lychee',
    title: '我要卖荔枝',
    subtitle: '农户向采购方供货',
    icon: 'fa-solid fa-seedling',
    productName: '荔枝',
    hint: '适合农户、合作社把荔枝卖给采购方。',
  },
  {
    id: 'sell-peach',
    title: '我要卖鹰嘴桃',
    subtitle: '特色水果买卖',
    icon: 'fa-solid fa-basket-shopping',
    productName: '鹰嘴桃',
    hint: '适合特色水果产地直供和批量采购。',
  },
  {
    id: 'buy-rice',
    title: '我要收购稻谷',
    subtitle: '粮食收购登记',
    icon: 'fa-solid fa-wheat-awn',
    productName: '晚稻谷',
    hint: '适合买方向农户或合作社收购稻谷。',
  },
  {
    id: 'cooperative-supply',
    title: '我要签合作社供货',
    subtitle: '合作社统一销售',
    icon: 'fa-solid fa-people-group',
    productName: '农副产品',
    hint: '适合合作社与采购商约定一批农副产品供货。',
  },
]

const form = reactive({ ...initialForm })
const errors = reactive({})
const loading = ref(false)
const apiError = ref('')
const contract = ref(null)
const selectedScenario = ref(scenarios[0].id)
const scenarioHint = ref(scenarios[0].hint)
const voiceText = ref('')
const voiceError = ref('')
const voiceLoading = ref(false)
const isRecording = ref(false)
const missingFields = ref([])

let mediaRecorder = null
let mediaStream = null
let recordedChunks = []

function applyScenario(scenario) {
  selectedScenario.value = scenario.id
  scenarioHint.value = scenario.hint
  if (!form.productName || fields.some((field) => field.key === 'productName')) {
    form.productName = scenario.productName
    errors.productName = ''
  }
}

function validate() {
  let valid = true
  fields.forEach((field) => {
    errors[field.key] = ''
    if (!String(form[field.key] || '').trim()) {
      errors[field.key] = `${field.label}为必填项`
      valid = false
    }
  })
  return valid
}

async function generateContract() {
  apiError.value = ''
  contract.value = null
  if (!validate()) return

  loading.value = true
  try {
    const response = await fetch('/api/contracts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(payload.error || '合同生成失败，请稍后重试')
    }
    contract.value = payload
  } catch (error) {
    apiError.value = error.message
  } finally {
    loading.value = false
  }
}

function resetForm() {
  Object.assign(form, initialForm)
  applyScenario(scenarios[0])
  Object.keys(errors).forEach((key) => {
    errors[key] = ''
  })
  apiError.value = ''
  contract.value = null
  voiceText.value = ''
  voiceError.value = ''
  missingFields.value = []
}

function preferredMimeType() {
  const options = ['audio/ogg;codecs=opus', 'audio/webm;codecs=opus', 'audio/webm']
  return options.find((type) => window.MediaRecorder?.isTypeSupported(type)) || ''
}

async function toggleRecording() {
  voiceError.value = ''
  if (isRecording.value) {
    mediaRecorder?.stop()
    return
  }

  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    voiceError.value = '当前浏览器不支持录音，请改用上传音频文件。'
    return
  }

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    recordedChunks = []
    const mimeType = preferredMimeType()
    mediaRecorder = new MediaRecorder(mediaStream, mimeType ? { mimeType } : undefined)
    mediaRecorder.ondataavailable = (event) => {
      if (event.data?.size) recordedChunks.push(event.data)
    }
    mediaRecorder.onstop = async () => {
      isRecording.value = false
      mediaStream?.getTracks().forEach((track) => track.stop())
      const blob = new Blob(recordedChunks, { type: mediaRecorder?.mimeType || 'audio/webm' })
      await submitAudio(blob)
    }
    mediaRecorder.start()
    isRecording.value = true
  } catch (error) {
    voiceError.value = error?.message || '无法打开麦克风，请检查浏览器权限。'
  }
}

async function handleAudioUpload(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  await submitAudio(file)
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '')
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

async function submitAudio(blob) {
  voiceLoading.value = true
  voiceError.value = ''
  missingFields.value = []
  try {
    const audioBase64 = await blobToBase64(blob)
    const response = await fetch('/api/speech/cantonese', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audioBase64,
        mimeType: blob.type || 'audio/wav',
      }),
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(payload.error || '粤语识别失败，请稍后重试')
    }

    voiceText.value = payload.text || ''
    applyExtractedFields(payload.fields || {})
    missingFields.value = payload.missingFields || []
  } catch (error) {
    voiceError.value = error.message
  } finally {
    voiceLoading.value = false
  }
}

function applyExtractedFields(extractedFields) {
  Object.entries(extractedFields).forEach(([key, value]) => {
    if (Object.hasOwn(form, key) && String(value || '').trim()) {
      form[key] = String(value).trim()
      errors[key] = ''
    }
  })
}

const normalizeLabel = computed(() => {
  if (!contract.value) return ''
  return contract.value.normalizedBy === 'deepseek' ? '字段已由 DeepSeek 优化' : '字段已按本地规则处理'
})

const missingFieldLabels = computed(() => missingFields.value.map((key) => fieldLabelMap[key]).filter(Boolean).join('、'))

onBeforeUnmount(() => {
  if (isRecording.value) mediaRecorder?.stop()
  mediaStream?.getTracks().forEach((track) => track.stop())
})
</script>

<style scoped>
.contract-generator {
  min-height: 100vh;
  background:
    linear-gradient(135deg, rgba(6, 78, 59, 0.94), rgba(15, 23, 42, 0.96)),
    radial-gradient(circle at 12% 12%, rgba(250, 204, 21, 0.18), transparent 28rem),
    radial-gradient(circle at 90% 2%, rgba(45, 212, 191, 0.18), transparent 26rem);
  color: #f8fafc;
  font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px clamp(18px, 4vw, 52px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(4, 47, 46, 0.84);
  backdrop-filter: blur(16px);
}

.brand,
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: inherit;
  text-decoration: none;
}

.brand {
  font-size: 19px;
  font-weight: 850;
}

.brand-mark,
.voice-icon,
.scenario-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}

.brand-mark {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: #facc15;
  color: #12352d;
}

.back-link {
  color: rgba(248, 250, 252, 0.78);
  font-size: 14px;
}

.workspace {
  width: min(1220px, calc(100% - 36px));
  margin: 0 auto;
  padding: 34px 0 56px;
}

.hero-band {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 260px;
  gap: 20px;
  align-items: stretch;
  margin-bottom: 20px;
}

.hero-copy,
.hero-status,
.scenario-section,
.form-panel,
.summary-panel,
.preview-section {
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  box-shadow: 0 20px 55px rgba(2, 6, 23, 0.28);
}

.hero-copy {
  padding: clamp(24px, 4vw, 40px);
}

.eyebrow {
  margin: 0 0 12px;
  color: #fde68a;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.hero-copy h1 {
  margin: 0;
  max-width: 800px;
  font-size: clamp(30px, 4.4vw, 54px);
  line-height: 1.12;
  letter-spacing: 0;
}

.hero-description {
  margin: 16px 0 0;
  max-width: 720px;
  color: rgba(226, 232, 240, 0.78);
  font-size: 16px;
  line-height: 1.8;
}

.hero-status {
  display: grid;
  align-content: space-between;
  padding: 22px;
  background: rgba(250, 204, 21, 0.12);
}

.hero-status span,
.template-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #fde68a;
  font-size: 13px;
  font-weight: 800;
}

.hero-status strong {
  font-size: 24px;
  line-height: 1.2;
}

.scenario-section,
.form-panel,
.summary-panel {
  padding: 22px;
}

.section-title,
.preview-toolbar,
.voice-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.section-title {
  margin-bottom: 18px;
}

.section-title.compact,
.form-title {
  align-items: flex-start;
}

.section-title h2,
.preview-toolbar h2,
.voice-header h3 {
  margin: 0 0 4px;
  font-size: 20px;
  line-height: 1.3;
}

.section-title p,
.preview-toolbar p,
.voice-header p,
.status-box p {
  margin: 0;
  color: rgba(226, 232, 240, 0.68);
}

.scenario-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.scenario-card {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 86px;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  background: rgba(2, 44, 34, 0.36);
  color: #f8fafc;
  text-align: left;
  cursor: pointer;
}

.scenario-card.active {
  border-color: rgba(250, 204, 21, 0.78);
  background: rgba(250, 204, 21, 0.14);
}

.scenario-icon {
  width: 42px;
  height: 42px;
  border-radius: 8px;
  background: rgba(16, 185, 129, 0.24);
  color: #bbf7d0;
}

.scenario-card strong,
.scenario-card small {
  display: block;
}

.scenario-card strong {
  margin-bottom: 4px;
  font-size: 15px;
}

.scenario-card small {
  color: rgba(226, 232, 240, 0.66);
  font-size: 12px;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 20px;
  align-items: start;
  margin-top: 20px;
}

.voice-panel {
  margin-bottom: 20px;
  padding: 16px;
  border: 1px solid rgba(250, 204, 21, 0.22);
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.28);
}

.voice-header {
  justify-content: flex-start;
  margin-bottom: 14px;
}

.voice-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: #fde68a;
  color: #14342b;
}

.voice-actions,
.form-actions,
.download-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.voice-loading {
  color: #fde68a;
  font-size: 13px;
  font-weight: 800;
}

.upload-action input {
  display: none;
}

.primary-action,
.secondary-action,
.upload-action,
.download-actions a,
.open-preview {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 42px;
  padding: 0 16px;
  border-radius: 8px;
  font: inherit;
  font-size: 14px;
  font-weight: 800;
  text-decoration: none;
  cursor: pointer;
}

.primary-action {
  border: 0;
  background: #facc15;
  color: #14342b;
}

.secondary-action,
.upload-action,
.open-preview,
.download-actions a {
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.08);
  color: #f8fafc;
}

.primary-action:disabled,
.secondary-action:disabled {
  cursor: not-allowed;
  opacity: 0.62;
}

.inline-alert,
.transcript-box,
.missing-fields {
  margin-top: 12px;
}

.inline-alert {
  display: flex;
  gap: 10px;
  padding: 12px;
  border-radius: 8px;
  font-size: 13px;
}

.inline-alert.error {
  border: 1px solid rgba(251, 113, 133, 0.36);
  background: rgba(190, 18, 60, 0.18);
  color: #fecdd3;
}

.transcript-box {
  padding: 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.07);
}

.transcript-box span,
.missing-fields span {
  display: block;
  margin-bottom: 5px;
  color: #fde68a;
  font-size: 12px;
  font-weight: 850;
}

.transcript-box p {
  margin: 0;
  color: rgba(248, 250, 252, 0.86);
  line-height: 1.7;
}

.missing-fields strong {
  color: #f8fafc;
}

.contract-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.field label {
  display: flex;
  gap: 4px;
  margin-bottom: 7px;
  color: rgba(248, 250, 252, 0.84);
  font-size: 14px;
  font-weight: 750;
}

.field label span,
.field-error {
  color: #fb7185;
}

.field input {
  width: 100%;
  box-sizing: border-box;
  min-height: 44px;
  padding: 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.38);
  color: #f8fafc;
  font: inherit;
  outline: none;
}

.field input:focus {
  border-color: rgba(250, 204, 21, 0.86);
  box-shadow: 0 0 0 3px rgba(250, 204, 21, 0.14);
}

.field input.invalid {
  border-color: rgba(251, 113, 133, 0.8);
}

.field-error {
  margin: 6px 0 0;
  min-height: 18px;
  font-size: 12px;
}

.form-actions {
  grid-column: 1 / -1;
  padding-top: 8px;
}

.mapping-list {
  display: grid;
  gap: 10px;
  margin: 0 0 18px;
  padding: 0;
  list-style: none;
}

.mapping-list li {
  display: grid;
  gap: 4px;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(248, 250, 252, 0.86);
  font-size: 13px;
}

.mapping-list span {
  color: #fde68a;
  font-weight: 850;
}

.status-box {
  display: flex;
  gap: 12px;
  padding: 14px;
  border-radius: 8px;
  margin-bottom: 14px;
}

.status-box strong {
  display: block;
  margin-bottom: 4px;
}

.status-box.success {
  border: 1px solid rgba(34, 197, 94, 0.36);
  background: rgba(22, 163, 74, 0.15);
  color: #bbf7d0;
}

.status-box.error {
  border: 1px solid rgba(251, 113, 133, 0.36);
  background: rgba(190, 18, 60, 0.18);
  color: #fecdd3;
}

.status-box.neutral {
  border: 1px solid rgba(125, 211, 252, 0.28);
  background: rgba(14, 165, 233, 0.12);
  color: #bae6fd;
}

.download-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.download-actions.disabled {
  opacity: 0.45;
  pointer-events: none;
}

.preview-section {
  margin-top: 20px;
  padding: 18px;
}

.preview-toolbar {
  margin-bottom: 16px;
}

.preview-frame {
  min-height: 620px;
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.42);
  overflow: hidden;
}

.preview-frame iframe {
  width: 100%;
  height: 720px;
  border: 0;
  background: #ffffff;
}

.preview-empty {
  min-height: 620px;
  display: grid;
  place-items: center;
  gap: 12px;
  color: rgba(226, 232, 240, 0.64);
}

.preview-empty i {
  font-size: 48px;
  color: rgba(250, 204, 21, 0.68);
}

@media (max-width: 980px) {
  .hero-band,
  .content-grid {
    grid-template-columns: 1fr;
  }

  .scenario-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 680px) {
  .topbar,
  .section-title,
  .preview-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .workspace {
    width: min(100% - 24px, 1220px);
    padding-top: 22px;
  }

  .scenario-grid,
  .contract-form,
  .download-actions {
    grid-template-columns: 1fr;
  }

  .hero-copy,
  .scenario-section,
  .form-panel,
  .summary-panel,
  .preview-section {
    padding: 16px;
  }

  .preview-frame,
  .preview-empty {
    min-height: 460px;
  }

  .preview-frame iframe {
    height: 520px;
  }
}
</style>
