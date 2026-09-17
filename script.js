const apiBase = document
  .querySelector('meta[name="demoai-api-base"]')
  ?.content.replace(/\/$/, "") || "http://localhost:8080";

async function readJSON(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, { cache: "no-store", ...options });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error?.message || `请求失败（${response.status}）`);
  }
  return payload;
}

function frontendURL(path) {
  return new URL(path, window.location.origin).href;
}

function initializeNavigation() {
  const header = document.querySelector("[data-header]");
  const nav = document.querySelector("[data-nav]");
  const menuToggle = document.querySelector("[data-menu-toggle]");
  const dropdowns = [...document.querySelectorAll("[data-dropdown]")];
  if (!header || !nav || !menuToggle) return;

  const desktopMedia = window.matchMedia("(min-width: 901px)");
  const setDropdown = (group, open) => {
    group.classList.toggle("is-open", open);
    group.querySelector(".nav-trigger").setAttribute("aria-expanded", String(open));
  };
  const closeDropdowns = (except = null) => {
    dropdowns.forEach((group) => {
      if (group !== except) setDropdown(group, false);
    });
  };

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
      const nextState = desktopMedia.matches || !group.classList.contains("is-open");
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
}

function makeCatalogCopy(item, container) {
  const name = document.createElement("strong");
  name.textContent = item.name;
  const description = document.createElement("span");
  description.textContent = item.description;
  container.append(name, description);
}

async function loadProductNavigation() {
  const lists = [...document.querySelectorAll("[data-product-list]")];
  if (!lists.length) return;
  try {
    const catalog = await readJSON("/api/v1/catalog/products");
    lists.forEach((list) => {
      list.replaceChildren();
      catalog.items.forEach((item) => {
        const entry = item.enabled && item.url
          ? document.createElement("a")
          : document.createElement("div");
        entry.className = "dropdown-item";
        entry.setAttribute("role", "menuitem");
        if (item.enabled && item.url) {
          entry.href = frontendURL(item.url);
        } else {
          entry.classList.add("is-disabled");
          entry.setAttribute("aria-disabled", "true");
        }
        makeCatalogCopy(item, entry);
        list.append(entry);
      });
    });
  } catch {
    lists.forEach((list) => {
      const message = document.createElement("span");
      message.className = "catalog-loading is-error";
      message.textContent = "产品服务暂时不可用";
      list.replaceChildren(message);
    });
  }
}

function renderOperatorCard(operator) {
  const card = document.createElement(operator.available ? "a" : "article");
  card.className = "operator-card";
  if (operator.available) card.href = frontendURL(operator.url);

  const top = document.createElement("div");
  top.className = "operator-card-top";
  const mark = document.createElement("span");
  mark.className = "operator-mark";
  mark.textContent = "A";
  const status = document.createElement("span");
  status.className = operator.available ? "availability is-available" : "availability";
  status.textContent = operator.available ? "AVAILABLE" : "UNAVAILABLE";
  top.append(mark, status);

  const category = document.createElement("p");
  category.className = "operator-category";
  category.textContent = operator.category;
  const title = document.createElement("h2");
  title.textContent = operator.name;
  const description = document.createElement("p");
  description.className = "operator-description";
  description.textContent = operator.description;

  const footer = document.createElement("div");
  footer.className = "operator-card-footer";
  const price = document.createElement("strong");
  price.textContent = operator.pricing.display;
  const action = document.createElement("span");
  action.textContent = operator.available ? "打开算子 →" : "暂不可用";
  footer.append(price, action);
  card.append(top, category, title, description, footer);
  return card;
}

async function initializeOperatorCatalog() {
  const grid = document.querySelector("[data-operator-grid]");
  const state = document.querySelector("[data-catalog-state]");
  if (!grid) return;
  try {
    const catalog = await readJSON("/api/v1/operators");
    grid.replaceChildren(...catalog.items.map(renderOperatorCard));
    if (state) {
      state.textContent = `${catalog.items.filter((item) => item.available).length} 个算子可用`;
      state.classList.add("is-online");
    }
  } catch (error) {
    const message = document.createElement("div");
    message.className = "catalog-empty is-error";
    message.textContent = error.message;
    grid.replaceChildren(message);
    if (state) state.textContent = "算子目录连接失败";
  }
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(bytes % (1024 * 1024) ? 1 : 0)} MB`;
}

function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return "--";
  const rounded = Math.round(Number(seconds));
  const minutes = Math.floor(rounded / 60);
  const remainder = rounded % 60;
  return minutes ? `${minutes}:${String(remainder).padStart(2, "0")}` : `${remainder}s`;
}

function initializeASR() {
  const form = document.querySelector("[data-asr-form]");
  if (!form) return;
  const elements = {
    fileInput: form.querySelector("[data-file-input]"),
    uploadZone: form.querySelector("[data-upload-zone]"),
    selectedFile: form.querySelector("[data-selected-file]"),
    fileName: form.querySelector("[data-file-name]"),
    clearFile: form.querySelector("[data-clear-file]"),
    runButton: form.querySelector("[data-run-button]"),
    formError: form.querySelector("[data-form-error]"),
    uploadLimit: form.querySelector("[data-upload-limit]"),
    formOperatorName: form.querySelector("[data-form-operator-name]"),
    operatorStatus: form.querySelector("[data-operator-status]"),
    serviceState: document.querySelector("[data-service-state]"),
    mediaPreview: document.querySelector("[data-media-preview]"),
    jobProgress: document.querySelector("[data-job-progress]"),
    jobStage: document.querySelector("[data-job-stage]"),
    jobProgressValue: document.querySelector("[data-job-progress-value]"),
    jobId: document.querySelector("[data-job-id]"),
    progressBar: document.querySelector("[data-progress-bar]"),
    progressSteps: [...document.querySelectorAll("[data-step]")],
    transcriptResult: document.querySelector("[data-transcript-result]"),
    resultLanguage: document.querySelector("[data-result-language]"),
    resultDuration: document.querySelector("[data-result-duration]"),
    resultSegments: document.querySelector("[data-result-segments]"),
    resultText: document.querySelector("[data-result-text]"),
    downloadResult: document.querySelector("[data-download-result]"),
  };
  const operatorId = form.dataset.operatorId || "asr";
  const stageLabels = {
    queued: "任务已进入队列",
    transcribing: "正在进行 ASR 转写",
    completed: "转写完成",
    failed: "转写失败",
  };
  const stageOrder = ["upload", "queued", "transcribing", "completed"];
  let operator = null;
  let previewUrl = null;
  let activeJob = null;

  const setRunAvailability = () => {
    elements.runButton.disabled = !operator?.available || !elements.fileInput.files.length || Boolean(activeJob);
  };
  const setServiceState = (online) => {
    elements.serviceState.classList.toggle("is-online", online);
    elements.serviceState.classList.toggle("is-offline", !online);
    elements.serviceState.querySelector("strong").textContent = online ? "ASR 服务已连接" : "ASR 服务未连接";
    elements.operatorStatus.textContent = online ? "READY" : "OFFLINE";
    setRunAvailability();
  };
  const showOperator = (details) => {
    document.querySelector("[data-operator-name]").textContent = details.name;
    document.querySelector("[data-operator-category]").textContent = details.category;
    document.querySelector("[data-operator-description]").textContent = details.long_description;
    document.querySelector("[data-pricing-display]").textContent = details.pricing.display;
    document.querySelector("[data-pricing-note]").textContent = details.pricing.note;
    elements.formOperatorName.textContent = details.name;
    elements.fileInput.accept = details.accepted_extensions.join(",");
    elements.uploadLimit.textContent = `支持 ${details.accepted_extensions.join("、")}，最大 ${formatBytes(details.max_upload_bytes)}`;
  };
  const loadOperator = async () => {
    try {
      operator = await readJSON(`/api/v1/operators/${operatorId}`);
      showOperator(operator);
      setServiceState(operator.available);
    } catch (error) {
      operator = null;
      elements.formError.textContent = error.message;
      elements.formError.hidden = false;
      setServiceState(false);
    }
  };
  const placeholderPreview = () => {
    elements.mediaPreview.innerHTML = `
      <div class="waveform" aria-hidden="true">
        <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
      </div>
      <p>上传文件后，这里会显示处理状态和转写结果。</p>
    `;
  };
  const showMediaPreview = (file) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(file);
    const media = document.createElement(file.type.startsWith("audio/") ? "audio" : "video");
    media.className = "selected-media-preview";
    media.controls = true;
    media.preload = "metadata";
    media.src = previewUrl;
    elements.mediaPreview.replaceChildren(media);
  };
  const selectFile = (file) => {
    if (!file) {
      elements.selectedFile.hidden = true;
      elements.fileName.textContent = "";
      placeholderPreview();
      setRunAvailability();
      return;
    }
    elements.formError.hidden = true;
    if (!operator || file.size > operator.max_upload_bytes) {
      elements.fileInput.value = "";
      elements.selectedFile.hidden = true;
      elements.fileName.textContent = "";
      placeholderPreview();
      setRunAvailability();
      elements.formError.textContent = operator
        ? `文件不能超过 ${formatBytes(operator.max_upload_bytes)}。`
        : "算子配置尚未加载完成。";
      elements.formError.hidden = false;
      return;
    }
    const extension = `.${file.name.split(".").pop()?.toLowerCase()}`;
    if (!operator.accepted_extensions.includes(extension)) {
      elements.fileInput.value = "";
      elements.formError.textContent = "该文件格式不受当前算子支持。";
      elements.formError.hidden = false;
      setRunAvailability();
      return;
    }
    elements.fileName.textContent = `${file.name} · ${formatBytes(file.size)}`;
    elements.selectedFile.hidden = false;
    showMediaPreview(file);
    setRunAvailability();
  };
  const updateJobUI = (job) => {
    const progress = Math.max(0, Math.min(100, Number(job.progress) || 0));
    elements.jobProgress.hidden = false;
    elements.jobStage.textContent = stageLabels[job.stage] || "正在处理";
    elements.jobProgressValue.textContent = `${progress}%`;
    elements.jobId.textContent = job.id || "";
    elements.progressBar.style.width = `${progress}%`;
    const currentStage = job.status === "succeeded" ? "completed" : job.stage;
    const currentIndex = stageOrder.indexOf(currentStage);
    elements.progressSteps.forEach((step, index) => {
      step.classList.toggle("is-complete", index < currentIndex || job.status === "succeeded");
      step.classList.toggle("is-active", index === currentIndex && job.status !== "succeeded");
    });
  };
  const loadTranscript = async (job) => {
    const artifactURL = `${apiBase}${job.artifacts.transcript_url}`;
    const transcript = await readJSON(job.artifacts.transcript_url);
    const hasAudio = transcript.audio_present !== false;
    elements.resultLanguage.textContent = hasAudio ? transcript.language || "未知" : "--";
    elements.resultDuration.textContent = formatDuration(transcript.duration_seconds);
    elements.resultSegments.textContent = String(transcript.segments?.length || 0);
    elements.resultText.textContent = hasAudio
      ? transcript.text || "没有检测到可转写的语音。"
      : "这个视频没有音轨，因此没有可转写的语音。";
    elements.downloadResult.href = artifactURL;
    elements.transcriptResult.hidden = false;
  };
  const pollJob = async (id) => {
    const deadline = Date.now() + 45 * 60 * 1000;
    while (Date.now() < deadline) {
      await new Promise((resolve) => window.setTimeout(resolve, 1000));
      const job = await readJSON(`/api/v1/jobs/${id}`);
      updateJobUI(job);
      if (job.status === "succeeded") {
        await loadTranscript(job);
        return;
      }
      if (job.status === "failed") throw new Error(job.error?.message || "ASR 转写失败。请查看服务端日志。");
    }
    throw new Error("任务等待超时，请稍后重新尝试。");
  };

  elements.fileInput.addEventListener("change", () => selectFile(elements.fileInput.files[0]));
  elements.clearFile.addEventListener("click", () => {
    elements.fileInput.value = "";
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
    selectFile(null);
  });
  ["dragenter", "dragover"].forEach((eventName) => {
    elements.uploadZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      elements.uploadZone.classList.add("is-dragging");
    });
  });
  ["dragleave", "drop"].forEach((eventName) => {
    elements.uploadZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      elements.uploadZone.classList.remove("is-dragging");
    });
  });
  elements.uploadZone.addEventListener("drop", (event) => {
    const file = event.dataTransfer.files[0];
    if (!file) return;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    elements.fileInput.files = transfer.files;
    selectFile(file);
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const file = elements.fileInput.files[0];
    if (!file || !operator?.available || activeJob) return;
    activeJob = "uploading";
    elements.formError.hidden = true;
    elements.transcriptResult.hidden = true;
    elements.progressBar.style.background = "";
    updateJobUI({ id: "", stage: "upload", status: "processing", progress: 5 });
    setRunAvailability();
    const formData = new FormData();
    formData.append("operator", operator.id);
    formData.append("file", file, file.name);
    try {
      const job = await readJSON("/api/v1/jobs", { method: "POST", body: formData });
      activeJob = job.id;
      updateJobUI(job);
      await pollJob(job.id);
    } catch (error) {
      elements.formError.textContent = error.message;
      elements.formError.hidden = false;
      elements.jobStage.textContent = "任务失败";
      elements.progressBar.style.background = "var(--coral)";
    } finally {
      activeJob = null;
      setRunAvailability();
    }
  });

  loadOperator();
  window.setInterval(loadOperator, 10000);
}

initializeNavigation();
loadProductNavigation();
initializeOperatorCatalog();
initializeASR();
