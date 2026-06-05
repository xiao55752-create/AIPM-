<script setup lang="ts">
const router = useRouter()
const text = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const uploadError = ref('')
const uploadInfo = ref('')

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB

function isReadableText(raw: string) {
  if (!raw) return false
  const cleaned = raw.replace(/\u0000/g, '')
  const printable = cleaned.replace(/[^\x09\x0A\x0D\x20-\x7E\u4e00-\u9fa5]/g, '')
  return printable.length / cleaned.length > 0.7
}

function openFilePicker() {
  fileInput.value?.click()
}

async function onUploadResume(event: Event) {
  uploadError.value = ''
  uploadInfo.value = ''
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (file.size > MAX_FILE_SIZE) {
    uploadError.value = '文件过大，请上传 2MB 以内的简历文件。'
    input.value = ''
    return
  }

  try {
    const raw = await file.text()
    if (!raw.trim() || !isReadableText(raw)) {
      uploadError.value = '该文件格式暂无法直接解析，请改为复制文本或上传 txt / md。'
      input.value = ''
      return
    }
    const normalized = raw.replace(/\u0000/g, '').trim().slice(0, 12000)
    text.value = text.value.trim()
      ? `${text.value.trim()}\n\n${normalized}`
      : normalized
    uploadInfo.value = `已导入：${file.name}`
  } catch {
    uploadError.value = '上传失败，请重试或改为手动粘贴。'
  } finally {
    input.value = ''
  }
}

function continueToQuiz() {
  if (import.meta.client && text.value.trim()) {
    sessionStorage.setItem('apgc-resume-paste', text.value.slice(0, 8000))
  }
  router.push('/assessment/quiz')
}
</script>

<template>
  <div class="mx-auto max-w-lg space-y-6">
    <h1 class="text-2xl font-bold text-primary">粘贴或上传简历（可选）</h1>
    <p class="text-sm text-slate-600">
      建议去掉手机号等敏感信息。上传或粘贴后仍需完成 18 道场景题。数据默认仅存于本机浏览器。
    </p>
    <div class="rounded-xl border border-slate-200 bg-white p-4">
      <p class="text-xs text-slate-500">支持上传：txt / md（其他格式可能无法自动解析）</p>
      <div class="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="rounded-lg border border-primary px-3 py-1.5 text-sm font-medium text-primary hover:bg-slate-50"
          @click="openFilePicker"
        >
          上传简历文件
        </button>
        <span v-if="uploadInfo" class="text-xs text-emerald-700">{{ uploadInfo }}</span>
        <span v-if="uploadError" class="text-xs text-rose-600">{{ uploadError }}</span>
      </div>
      <input
        ref="fileInput"
        type="file"
        class="hidden"
        accept=".txt,.md,.markdown,.doc,.docx,.pdf"
        @change="onUploadResume"
      />
    </div>
    <textarea
      v-model="text"
      rows="12"
      class="w-full rounded-xl border border-slate-200 p-4 text-sm focus:border-accent focus:outline-none"
      placeholder="粘贴简历正文…"
    />
    <button
      type="button"
      class="w-full rounded-lg bg-accent py-3 font-medium text-white hover:bg-accent-hover"
      @click="continueToQuiz"
    >
      继续答题
    </button>
    <NuxtLink to="/assessment/quiz" class="block text-center text-sm text-slate-500 hover:text-accent">
      跳过，直接答题
    </NuxtLink>
  </div>
</template>
