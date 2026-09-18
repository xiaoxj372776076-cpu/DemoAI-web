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

/* ---------------------------------------------------------------------------
 * 后端提供数据，前端只负责渲染。
 * 导航产品目录与算子目录都由 DemoAI-server 返回，页面里不再硬编码任何条目。
 * ------------------------------------------------------------------------- */

function frontendURL(url) {
  if (!url) return "#";
  if (/^https?:\/\//i.test(url)) return url;
  return url.replace(/^\/+/, "");
}

async function readJSON(path) {
  const response = await fetch(`${apiBase}${path}`, { cache: "no-store" });
  return parseResponse(response);
}

function catalogMessage(text, isError = false) {
  const node = document.createElement("span");
  node.className = isError ? "catalog-loading is-error" : "catalog-loading";
  node.textContent = text;
  return node;
}

function renderProductItem(item) {
  const linkable = Boolean(item.enabled && item.url);
  const entry = document.createElement(linkable ? "a" : "div");
  entry.className = linkable ? "dropdown-item" : "dropdown-item is-disabled";
  entry.setAttribute("role", "menuitem");
  if (linkable) {
    entry.href = frontendURL(item.url);
  } else {
    entry.setAttribute("aria-disabled", "true");
  }

  const name = document.createElement("strong");
  name.textContent = item.name || "";
  const description = document.createElement("span");
  description.textContent = item.description || "";
  entry.append(name, description);
  return entry;
}

async function loadProductCatalog() {
  const lists = [...document.querySelectorAll("[data-product-list]")];
  if (!lists.length) return;
  try {
    const catalog = await readJSON("/api/v1/catalog/products");
    const items = Array.isArray(catalog.items) ? catalog.items : [];
    if (!items.length) {
      lists.forEach((list) => list.replaceChildren(catalogMessage("暂无产品")));
      return;
    }
    lists.forEach((list) => list.replaceChildren(...items.map(renderProductItem)));
  } catch (error) {
    lists.forEach((list) => list.replaceChildren(catalogMessage(error.message, true)));
  }
}

function renderOperatorCard(operator) {
  const linkable = Boolean(operator.available && operator.url);
  const card = document.createElement(linkable ? "a" : "article");
  card.className = "operator-card";
  if (linkable) card.href = frontendURL(operator.url);

  const top = document.createElement("div");
  top.className = "operator-card-top";
  const mark = document.createElement("span");
  mark.className = "operator-mark";
  mark.textContent = (operator.name || "?").trim().charAt(0).toUpperCase();
  const status = document.createElement("span");
  status.className = operator.available ? "availability is-available" : "availability";
  status.textContent = operator.available ? "AVAILABLE" : "UNAVAILABLE";
  top.append(mark, status);

  const category = document.createElement("p");
  category.className = "operator-category";
  category.textContent = operator.category || "";
  const title = document.createElement("h2");
  title.textContent = operator.name || "";
  const description = document.createElement("p");
  description.className = "operator-description";
  description.textContent = operator.description || "";

  const footer = document.createElement("div");
  footer.className = "operator-card-footer";
  const price = document.createElement("strong");
  price.textContent = operator.pricing?.display || "免费";
  const action = document.createElement("span");
  action.textContent = linkable ? "打开算子 →" : "暂不可用";
  footer.append(price, action);

  card.append(top, category, title, description, footer);
  return card;
}

async function loadOperatorCatalog() {
  const grid = document.querySelector("[data-operator-grid]");
  const state = document.querySelector("[data-catalog-state]");
  if (!grid) return;
  try {
    const catalog = await readJSON("/api/v1/operators");
    const items = Array.isArray(catalog.items) ? catalog.items : [];
    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "catalog-empty";
      empty.textContent = "后端暂未发布任何算子。";
      grid.replaceChildren(empty);
      if (state) state.textContent = "暂无可用算子";
      return;
    }
    grid.replaceChildren(...items.map(renderOperatorCard));
    if (state) {
      const available = items.filter((item) => item.available).length;
      state.textContent = `${items.length} 个算子 · ${available} 个可运行`;
      state.classList.add("is-online");
    }
  } catch (error) {
    const failed = document.createElement("div");
    failed.className = "catalog-empty is-error";
    failed.textContent = error.message;
    grid.replaceChildren(failed);
    if (state) state.textContent = "算子目录连接失败";
  }
}

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
  const hasAudio = transcript.audio_present !== false;
  resultLanguage.textContent = hasAudio ? transcript.language || "未知" : "--";
  resultDuration.textContent = formatDuration(transcript.duration_seconds);
  resultSegments.textContent = String(transcript.segments?.length || 0);
  resultText.textContent = hasAudio
    ? transcript.text || "没有检测到可转写的语音。"
    : "这个视频没有音轨，因此没有可转写的语音。";
  downloadResult.href = artifactUrl;
  transcriptResult.hidden = false;
}

function bindAsrPlayground() {
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
}

/* ---------------------------------------------------------------------------
 * 手部位姿估计 playground。
 * 上传视频 → 后端 HaWoR 算子估计双手 21 关节 → 返回合成骨架视频。
 * 视频与关键点都由后端产物接口提供，页面只负责播放和展示统计。
 * ------------------------------------------------------------------------- */

const handPoseStages = {
  queued: "任务已进入队列",
  estimating_hands: "正在进行手部位姿估计",
  completed: "骨架视频已生成",
  failed: "估计失败",
};

const handPoseStageOrder = ["upload", "queued", "estimating_hands", "completed"];

function bindHandPosePlayground() {
  const form = document.querySelector("[data-handpose-form]");
  const input = form.querySelector("[data-file-input]");
  const zone = form.querySelector("[data-upload-zone]");
  const selected = form.querySelector("[data-selected-file]");
  const nameLabel = form.querySelector("[data-file-name]");
  const clearButton = form.querySelector("[data-clear-file]");
  const runButton = form.querySelector("[data-run-button]");
  const formError = form.querySelector("[data-form-error]");
  const operatorStatus = form.querySelector("[data-operator-status]");

  const serviceState = document.querySelector("[data-service-state]");
  const mediaPreview = document.querySelector("[data-media-preview]");
  const jobProgress = document.querySelector("[data-job-progress]");
  const jobStage = document.querySelector("[data-job-stage]");
  const jobProgressValue = document.querySelector("[data-job-progress-value]");
  const jobIdLabel = document.querySelector("[data-job-id]");
  const progressBar = document.querySelector("[data-progress-bar]");
  const progressSteps = [...document.querySelectorAll("[data-step]")];

  const result = document.querySelector("[data-handpose-result]");
  const framesLabel = document.querySelector("[data-result-frames]");
  const leftLabel = document.querySelector("[data-result-left]");
  const rightLabel = document.querySelector("[data-result-right]");
  const video = document.querySelector("[data-result-video]");
  const downloadVideo = document.querySelector("[data-download-video]");
  const downloadKeypoints = document.querySelector("[data-download-keypoints]");

  let online = false;
  let activeJob = null;
  let previewUrl = null;

  const setAvailability = () => {
    runButton.disabled = !online || !input.files.length || Boolean(activeJob);
  };

  const setService = (isOnline) => {
    online = isOnline;
    serviceState.classList.toggle("is-online", isOnline);
    serviceState.classList.toggle("is-offline", !isOnline);
    serviceState.querySelector("strong").textContent = isOnline
      ? "算子服务已连接"
      : "算子服务未连接";
    setAvailability();
  };

  const checkService = async () => {
    try {
      const response = await fetch(`${apiBase}/healthz`, { cache: "no-store" });
      const payload = await response.json();
      setService(response.ok && payload.ready === true);
      if (operatorStatus) {
        operatorStatus.textContent = payload.operators?.hand_pose ? "READY" : "OFFLINE";
      }
    } catch {
      setService(false);
      if (operatorStatus) operatorStatus.textContent = "OFFLINE";
    }
  };

  const placeholder = () => {
    mediaPreview.innerHTML = `
      <div class="waveform" aria-hidden="true">
        <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
      </div>
      <p>上传视频后，这里会显示处理状态与合成后的骨架视频。</p>
    `;
  };

  const select = (file) => {
    if (!file) {
      selected.hidden = true;
      nameLabel.textContent = "";
      placeholder();
      setAvailability();
      return;
    }
    formError.hidden = true;
    if (file.size > 500 * 1024 * 1024) {
      input.value = "";
      selected.hidden = true;
      nameLabel.textContent = "";
      placeholder();
      setAvailability();
      formError.textContent = "文件不能超过 500 MB。";
      formError.hidden = false;
      return;
    }
    nameLabel.textContent = `${file.name} · ${formatBytes(file.size)}`;
    selected.hidden = false;

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(file);
    const preview = document.createElement("video");
    preview.className = "selected-media-preview";
    preview.controls = true;
    preview.preload = "metadata";
    preview.src = previewUrl;
    mediaPreview.replaceChildren(preview);
    setAvailability();
  };

  const updateProgress = (job) => {
    const progress = Math.max(0, Math.min(100, Number(job.progress) || 0));
    jobProgress.hidden = false;
    jobStage.textContent = handPoseStages[job.stage] || "正在处理";
    jobProgressValue.textContent = `${progress}%`;
    jobIdLabel.textContent = job.id || "";
    progressBar.style.width = `${progress}%`;

    const currentStage = job.status === "succeeded" ? "completed" : job.stage;
    const currentIndex = handPoseStageOrder.indexOf(currentStage);
    progressSteps.forEach((step, index) => {
      step.classList.toggle("is-complete", index < currentIndex || job.status === "succeeded");
      step.classList.toggle("is-active", index === currentIndex && job.status !== "succeeded");
    });
  };

  const showArtifacts = async (job) => {
    const videoUrl = `${apiBase}${job.artifacts.video_url}`;
    const keypointsUrl = `${apiBase}${job.artifacts.keypoints_url}`;
    video.src = videoUrl;
    downloadVideo.href = videoUrl;
    downloadKeypoints.href = keypointsUrl;

    try {
      const response = await fetch(keypointsUrl, { cache: "no-store" });
      const keypoints = await parseResponse(response);
      const metadata = keypoints.metadata || {};
      const predicted = metadata.predicted_frame_counts || {};
      framesLabel.textContent = String(metadata.frame_count ?? "--");
      leftLabel.textContent = String(predicted.left ?? 0);
      rightLabel.textContent = String(predicted.right ?? 0);
    } catch {
      framesLabel.textContent = "--";
      leftLabel.textContent = "--";
      rightLabel.textContent = "--";
    }
    result.hidden = false;
  };

  const poll = async (id) => {
    const deadline = Date.now() + 45 * 60 * 1000;
    while (Date.now() < deadline) {
      await new Promise((resolve) => window.setTimeout(resolve, 2000));
      const response = await fetch(`${apiBase}/api/v1/jobs/${id}`, { cache: "no-store" });
      const job = await parseResponse(response);
      updateProgress(job);
      if (job.status === "succeeded") {
        await showArtifacts(job);
        return;
      }
      if (job.status === "failed") {
        throw new Error(job.error?.message || "手部位姿估计失败。请查看服务端日志。");
      }
    }
    throw new Error("任务等待超时，请稍后重新尝试。");
  };

  input.addEventListener("change", () => select(input.files[0]));

  clearButton.addEventListener("click", () => {
    input.value = "";
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
    select(null);
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    zone.addEventListener(eventName, (event) => {
      event.preventDefault();
      zone.classList.add("is-dragging");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    zone.addEventListener(eventName, (event) => {
      event.preventDefault();
      zone.classList.remove("is-dragging");
    });
  });

  zone.addEventListener("drop", (event) => {
    const file = event.dataTransfer.files[0];
    if (!file) return;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    select(file);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const file = input.files[0];
    if (!file || !online || activeJob) return;

    activeJob = "uploading";
    formError.hidden = true;
    result.hidden = true;
    progressBar.style.background = "";
    updateProgress({ id: "", stage: "upload", status: "processing", progress: 5 });
    setAvailability();

    const formData = new FormData();
    formData.append("operator", "hand_pose");
    formData.append("file", file, file.name);
    try {
      const response = await fetch(`${apiBase}/api/v1/jobs`, {
        method: "POST",
        body: formData,
      });
      const job = await parseResponse(response);
      activeJob = job.id;
      updateProgress(job);
      await poll(job.id);
    } catch (error) {
      formError.textContent = error.message;
      formError.hidden = false;
      jobStage.textContent = "任务失败";
      progressBar.style.background = "var(--coral)";
    } finally {
      activeJob = null;
      setAvailability();
    }
  });

  checkService();
  window.setInterval(checkService, 10000);
}

loadProductCatalog();
loadOperatorCatalog();
if (asrForm) bindAsrPlayground();
if (document.querySelector("[data-handpose-form]")) bindHandPosePlayground();
