const header = document.querySelector("[data-header]");
const nav = document.querySelector("[data-nav]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const dropdowns = [...document.querySelectorAll("[data-dropdown]")];
const desktopMedia = window.matchMedia("(min-width: 901px)");

function setDropdown(group, open) {
  group.classList.toggle("is-open", open);
  group.querySelector(".nav-trigger").setAttribute("aria-expanded", String(open));
}

function closeDropdowns(except = null) {
  dropdowns.forEach((group) => {
    if (group !== except) setDropdown(group, false);
  });
}

dropdowns.forEach((group) => {
  const trigger = group.querySelector(".nav-trigger");

  group.addEventListener("pointerenter", () => {
    if (!desktopMedia.matches) return;
    closeDropdowns(group);
    setDropdown(group, true);
  });

  group.addEventListener("pointerleave", () => {
    if (desktopMedia.matches) setDropdown(group, false);
  });

  group.addEventListener("focusin", () => {
    if (!desktopMedia.matches) return;
    closeDropdowns(group);
    setDropdown(group, true);
  });

  group.addEventListener("focusout", (event) => {
    if (desktopMedia.matches && !group.contains(event.relatedTarget)) {
      setDropdown(group, false);
    }
  });

  trigger.addEventListener("click", () => {
    if (desktopMedia.matches) {
      closeDropdowns(group);
      setDropdown(group, true);
      return;
    }

    const nextState = !group.classList.contains("is-open");
    closeDropdowns(group);
    setDropdown(group, nextState);
  });
});

menuToggle.addEventListener("click", () => {
  const open = !nav.classList.contains("is-open");
  nav.classList.toggle("is-open", open);
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "关闭导航菜单" : "打开导航菜单");
  if (!open) closeDropdowns();
});

document.addEventListener("click", (event) => {
  if (header.contains(event.target)) return;
  closeDropdowns();
  nav.classList.remove("is-open");
  menuToggle.setAttribute("aria-expanded", "false");
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  closeDropdowns();
  nav.classList.remove("is-open");
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.focus();
});

desktopMedia.addEventListener("change", () => {
  nav.classList.remove("is-open");
  menuToggle.setAttribute("aria-expanded", "false");
  closeDropdowns();
});

const apiBase = document
  .querySelector('meta[name="demoai-api-base"]')
  ?.content.replace(/\/$/, "") || "http://localhost:8080";
const asrForm = document.querySelector("[data-asr-form]");
const fileInput = document.querySelector("[data-file-input]");
const uploadZone = document.querySelector("[data-upload-zone]");
const selectedFile = document.querySelector("[data-selected-file]");
const fileName = document.querySelector("[data-file-name]");
const clearFile = document.querySelector("[data-clear-file]");
const runButton = document.querySelector("[data-run-button]");
const formError = document.querySelector("[data-form-error]");
const serviceState = document.querySelector("[data-service-state]");
const mediaPreview = document.querySelector("[data-media-preview]");
const jobProgress = document.querySelector("[data-job-progress]");
const jobStage = document.querySelector("[data-job-stage]");
const jobProgressValue = document.querySelector("[data-job-progress-value]");
const jobId = document.querySelector("[data-job-id]");
const progressBar = document.querySelector("[data-progress-bar]");
const progressSteps = [...document.querySelectorAll("[data-step]")];
const transcriptResult = document.querySelector("[data-transcript-result]");
const resultLanguage = document.querySelector("[data-result-language]");
const resultDuration = document.querySelector("[data-result-duration]");
const resultSegments = document.querySelector("[data-result-segments]");
const resultText = document.querySelector("[data-result-text]");
const downloadResult = document.querySelector("[data-download-result]");

let serviceOnline = false;
let previewUrl = null;
let activeJob = null;

const stageLabels = {
  queued: "任务已进入队列",
  transcribing: "正在进行 ASR 转写",
  completed: "转写完成",
  failed: "转写失败",
};

const stageOrder = ["upload", "queued", "transcribing", "completed"];

function setRunAvailability() {
  runButton.disabled = !serviceOnline || !fileInput.files.length || Boolean(activeJob);
}

function setServiceState(online) {
  serviceOnline = online;
  serviceState.classList.toggle("is-online", online);
  serviceState.classList.toggle("is-offline", !online);
  serviceState.querySelector("strong").textContent = online
    ? "ASR 服务已连接"
    : "ASR 服务未连接";
  setRunAvailability();
}

async function checkService() {
  try {
    const response = await fetch(`${apiBase}/healthz`, { cache: "no-store" });
    const payload = await response.json();
    setServiceState(response.ok && payload.ready === true);
  } catch {
    setServiceState(false);
  }
}

function placeholderPreview() {
  mediaPreview.innerHTML = `
    <div class="waveform" aria-hidden="true">
      <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
    </div>
    <p>上传文件后，这里会显示处理状态和转写结果。</p>
  `;
}

function showMediaPreview(file) {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(file);
  const media = document.createElement(file.type.startsWith("audio/") ? "audio" : "video");
  media.className = "selected-media-preview";
  media.controls = true;
  media.preload = "metadata";
  media.src = previewUrl;
  mediaPreview.replaceChildren(media);
}

function selectFile(file) {
  if (!file) {
    selectedFile.hidden = true;
    fileName.textContent = "";
    placeholderPreview();
    setRunAvailability();
    return;
  }
  formError.hidden = true;
  if (file.size > 500 * 1024 * 1024) {
    fileInput.value = "";
    selectedFile.hidden = true;
    fileName.textContent = "";
    placeholderPreview();
    setRunAvailability();
    formError.textContent = "文件不能超过 500 MB。";
    formError.hidden = false;
    return;
  }
  fileName.textContent = `${file.name} · ${formatBytes(file.size)}`;
  selectedFile.hidden = false;
  showMediaPreview(file);
  setRunAvailability();
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return "--";
  const rounded = Math.round(Number(seconds));
  const minutes = Math.floor(rounded / 60);
  const remainder = rounded % 60;
  return minutes ? `${minutes}:${String(remainder).padStart(2, "0")}` : `${remainder}s`;
}

function updateJobUI(job) {
  const progress = Math.max(0, Math.min(100, Number(job.progress) || 0));
  jobProgress.hidden = false;
  jobStage.textContent = stageLabels[job.stage] || "正在处理";
  jobProgressValue.textContent = `${progress}%`;
  jobId.textContent = job.id || "";
  progressBar.style.width = `${progress}%`;

  const currentStage = job.status === "succeeded" ? "completed" : job.stage;
  const currentIndex = stageOrder.indexOf(currentStage);
  progressSteps.forEach((step, index) => {
    step.classList.toggle("is-complete", index < currentIndex || job.status === "succeeded");
    step.classList.toggle("is-active", index === currentIndex && job.status !== "succeeded");
  });
}

async function parseResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error?.message || `请求失败（${response.status}）`);
  }
  return payload;
}

async function pollJob(id) {
  const deadline = Date.now() + 45 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => window.setTimeout(resolve, 1000));
    const response = await fetch(`${apiBase}/api/v1/jobs/${id}`, { cache: "no-store" });
    const job = await parseResponse(response);
    updateJobUI(job);
    if (job.status === "succeeded") {
      await loadTranscript(job);
      return;
    }
    if (job.status === "failed") {
      throw new Error(job.error?.message || "ASR 转写失败。请查看服务端日志。");
    }
  }
  throw new Error("任务等待超时，请稍后重新尝试。");
}

async function loadTranscript(job) {
  const artifactUrl = `${apiBase}${job.artifacts.transcript_url}`;
  const response = await fetch(artifactUrl, { cache: "no-store" });
  const transcript = await parseResponse(response);
  resultLanguage.textContent = transcript.language || "未知";
  resultDuration.textContent = formatDuration(transcript.duration_seconds);
  resultSegments.textContent = String(transcript.segments?.length || 0);
  resultText.textContent = transcript.text || "没有检测到可转写的语音。";
  downloadResult.href = artifactUrl;
  transcriptResult.hidden = false;
}

fileInput.addEventListener("change", () => selectFile(fileInput.files[0]));

clearFile.addEventListener("click", () => {
  fileInput.value = "";
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = null;
  selectFile(null);
});

["dragenter", "dragover"].forEach((eventName) => {
  uploadZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    uploadZone.classList.add("is-dragging");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  uploadZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    uploadZone.classList.remove("is-dragging");
  });
});

uploadZone.addEventListener("drop", (event) => {
  const file = event.dataTransfer.files[0];
  if (!file) return;
  const transfer = new DataTransfer();
  transfer.items.add(file);
  fileInput.files = transfer.files;
  selectFile(file);
});

asrForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const file = fileInput.files[0];
  if (!file || !serviceOnline || activeJob) return;

  activeJob = "uploading";
  formError.hidden = true;
  transcriptResult.hidden = true;
  progressBar.style.background = "";
  updateJobUI({ id: "", stage: "upload", status: "processing", progress: 5 });
  setRunAvailability();

  const formData = new FormData();
  formData.append("operator", "asr");
  formData.append("file", file, file.name);
  try {
    const response = await fetch(`${apiBase}/api/v1/jobs`, {
      method: "POST",
      body: formData,
    });
    const job = await parseResponse(response);
    activeJob = job.id;
    updateJobUI(job);
    await pollJob(job.id);
  } catch (error) {
    formError.textContent = error.message;
    formError.hidden = false;
    jobStage.textContent = "任务失败";
    progressBar.style.background = "var(--coral)";
  } finally {
    activeJob = null;
    setRunAvailability();
  }
});

checkService();
window.setInterval(checkService, 10000);
