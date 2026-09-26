const $ = (id) => document.getElementById(id);

const text = $("text");
const chars = $("chars");
const source = $("source");
const speed = $("speed");
const speedValue = $("speedValue");
const model = $("model");
const voice = $("voice");
const cleanTextToggle = $("cleanTextToggle");
const chunkToggle = $("chunkToggle");
const chunkOptions = $("chunkOptions");
const chunkMinutes = $("chunkMinutes");
const output = $("output");
const audioName = $("audioName");
const browse = $("browse");
const documentInput = $("document");
const dropzone = $("dropzone");
const generate = $("generate");
const status = $("status");
const result = $("result");
const player = $("player");
const openFolder = $("openFolder");
const progressCard = $("progressCard");
const progressBar = $("progressBar");
const progressPercent = $("progressPercent");
const progressChunk = $("progressChunk");
const progressSegments = $("progressSegments");
const progressAudio = $("progressAudio");
const progressElapsed = $("progressElapsed");
const progressEta = $("progressEta");
const progressRate = $("progressRate");
const progressDetail = $("progressDetail");
const progressTitle = $("progressTitle");

let lastJobPath = "";
let activeJobId = null;
let liveTimer = null;
let liveStart = 0;

text.addEventListener("input", () => {
  chars.textContent = `${text.value.length.toLocaleString()} characters`;
});

speed.addEventListener("input", () => {
  speedValue.textContent = `${Number(speed.value).toFixed(2)}×`;
});

function setToggle(button, enabled) {
  button.classList.toggle("on", enabled);
  button.setAttribute("aria-pressed", enabled ? "true" : "false");
}

cleanTextToggle.addEventListener("click", () => {
  setToggle(cleanTextToggle, !cleanTextToggle.classList.contains("on"));
});

chunkToggle.addEventListener("click", () => {
  const enabled = !chunkToggle.classList.contains("on");
  setToggle(chunkToggle, enabled);
  chunkOptions.classList.toggle("hidden", !enabled);
});

async function loadOptions() {
  const [models, voices] = await Promise.all([
    fetch("/api/models").then(r => r.json()),
    fetch("/api/voices").then(r => r.json())
  ]);
  model.innerHTML = models.map(m => `<option value="${m.id}">${m.name}</option>`).join("");
  voice.innerHTML = voices.map(v => `<option>${v}</option>`).join("");
  model.value = "mini";
  voice.value = "Jasper";
}

function fmt(seconds) {
  seconds = Math.max(0, Math.round(Number(seconds) || 0));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h ? `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`
           : `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

function updateProgress(job) {
  const pct = Number(job.progress || 0);

  const knownTotal = Number(job.segments_total || 0) > 0;
  progressBar.classList.toggle("indeterminate", !knownTotal && job.status === "generating");
  progressBar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
  progressPercent.textContent = knownTotal ? `${pct.toFixed(0)}%` : "Preparing…";
  progressChunk.textContent = `${job.chunks_done || 0} / ${job.chunks_total || 1}`;
  progressSegments.textContent = knownTotal
    ? `${job.segments_done || 0} / ${job.segments_total}`
    : `${job.segments_done || 0} completed`;
  progressAudio.textContent = fmt(job.elapsed_audio || 0);

  if (job.elapsed_seconds) {
    progressElapsed.textContent = fmt(job.elapsed_seconds);
  }

  if (job.elapsed_audio > 0 && job.elapsed_seconds > 0) {
    const rate = job.elapsed_audio / job.elapsed_seconds;
    progressRate.textContent = `${rate.toFixed(2)}× real-time`;
  }

  // ETA is based only on observed completed KittenTTS segments.
  // Before enough observations exist, we deliberately say "Learning"
  // rather than inventing a misleading percentage.
  if (pct > 0 && job.elapsed_seconds > 1) {
    const eta = job.elapsed_seconds * (100 - pct) / pct;
    progressEta.textContent = fmt(eta);
  } else {
    progressEta.textContent = "Learning…";
  }

  if (job.status === "merging") {
    progressTitle.textContent = "Merging chunks";
    progressDetail.textContent = "Combining completed audio chunks into the final WAV…";
  } else if (job.status === "generating") {
    progressTitle.textContent = "Generating audio";
    progressDetail.textContent =
      `KittenTTS segment ${job.current_segment || 0} of ${job.segments_total || "?"} · outer chunk ${job.current_chunk || 1} of ${job.chunks_total || 1}`;
  } else if (job.status === "complete") {
    progressTitle.textContent = "Generation complete";
    progressDetail.textContent = `Finished in ${fmt(job.elapsed_seconds)}.`;
    $("progressSpinner").style.display = "none";
  }
}

function startLiveTimer() {
  clearInterval(liveTimer);
  liveStart = performance.now();
  liveTimer = setInterval(() => {
    if (activeJobId) {
      const seconds = (performance.now() - liveStart) / 1000;
      progressElapsed.textContent = fmt(seconds);
    }
  }, 250);
}

function stopLiveTimer() {
  clearInterval(liveTimer);
  liveTimer = null;
}
async function loadDocument(file) {
  if (!file) return;
  status.textContent = `Reading ${file.name}…`;
  const form = new FormData();
  form.append("file", file);
  try {
    const response = await fetch("/api/document", { method: "POST", body: form });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not read document.");
    text.value = data.text;
    source.textContent = data.filename;
    chars.textContent = `${text.value.length.toLocaleString()} characters`;
    status.textContent = "Document loaded.";
  } catch (err) {
    status.textContent = `Error: ${err.message}`;
  }
}

documentInput.addEventListener("change", () => loadDocument(documentInput.files[0]));

["dragenter", "dragover"].forEach(event => {
  dropzone.addEventListener(event, e => {
    e.preventDefault();
    dropzone.classList.add("dragging");
  });
});
["dragleave", "drop"].forEach(event => {
  dropzone.addEventListener(event, e => {
    e.preventDefault();
    dropzone.classList.remove("dragging");
  });
});
dropzone.addEventListener("drop", e => loadDocument(e.dataTransfer.files[0]));

browse.addEventListener("click", async () => {
  browse.disabled = true;
  status.textContent = "Opening Windows folder picker…";
  try {
    const response = await fetch("/api/pick-folder");
    const data = await response.json();
    if (data.path) {
      output.value = data.path;
      status.textContent = "Output folder selected.";
    } else status.textContent = "Folder selection cancelled.";
  } catch (err) {
    status.textContent = `Error: ${err.message}`;
  } finally {
    browse.disabled = false;
  }
});

async function waitForJob(jobId) {
  activeJobId = jobId;
  while (true) {
    const data = await fetch(`/api/jobs/${jobId}`).then(r => r.json());
    updateProgress(data);
    if (data.status === "complete") return data;
    if (data.status === "error") throw new Error(data.error);
    await new Promise(resolve => setTimeout(resolve, 700));
  }
}

generate.addEventListener("click", async () => {
  if (!text.value.trim()) {
    status.textContent = "Paste some text or add a document first.";
    text.focus();
    return;
  }
  if (!audioName.value.trim()) {
    status.textContent = "Enter an audio filename first.";
    audioName.focus();
    return;
  }

  generate.disabled = true;
  result.classList.add("hidden");
  progressCard.classList.remove("hidden");
  progressBar.style.width = "0%";
  progressTitle.textContent = "Starting";
  progressDetail.textContent = "Preparing the generation job…";
  $("progressSpinner").style.display = "block";
  progressPercent.textContent = "0%";
  progressEta.textContent = "Calculating…";
  status.textContent = "Starting…";
  startLiveTimer();

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        text: text.value,
        model: model.value,
        voice: voice.value,
        speed: Number(speed.value),
        clean_text: cleanTextToggle.classList.contains("on"),
        chunk_enabled: chunkToggle.classList.contains("on"),
        chunk_minutes: Number(chunkMinutes.value),
        output_root: output.value.trim(),
        audio_name: audioName.value.trim()
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not start generation.");

    const job = await waitForJob(data.job_id);
    lastJobPath = job.path;
    status.textContent = "Done.";
    resultPath.textContent = job.path;
    player.src = `/api/audio/${encodeURIComponent(data.job_id)}`;
    player.load();
    result.classList.remove("hidden");
    progressTitle.textContent = "Generation complete";
    progressDetail.textContent = `Finished in ${fmt(job.elapsed_seconds)}.`;
    $("progressSpinner").style.display = "none";
  } catch (err) {
    status.textContent = `Error: ${err.message}`;
    progressTitle.textContent = "Generation failed";
    progressDetail.textContent = err.message;
  } finally {
    generate.disabled = false;
    activeJobId = null;
    stopLiveTimer();
  }
});

openFolder.addEventListener("click", async () => {
  if (!lastJobPath) return;
  const response = await fetch("/api/open-folder", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({path: lastJobPath})
  });
  const data = await response.json();
  status.textContent = response.ok ? "Opened in File Explorer." : `Error: ${data.error}`;
});

$("newGeneration").addEventListener("click", () => {
  text.value = "";
  audioName.value = "";
  source.textContent = "No document loaded";
  chars.textContent = "0 characters";
  result.classList.add("hidden");
  progressCard.classList.add("hidden");
  $("progressSpinner").style.display = "block";
  setToggle(cleanTextToggle, true);
  setToggle(chunkToggle, false);
  chunkOptions.classList.add("hidden");
  player.removeAttribute("src");
  player.load();
  lastJobPath = "";
  status.textContent = "Ready for a new generation.";
  text.focus();
});

loadOptions().catch(err => {
  status.textContent = `Could not load options: ${err.message}`;
});
