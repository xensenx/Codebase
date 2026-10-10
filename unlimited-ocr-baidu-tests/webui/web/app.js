const $ = id => document.getElementById(id);
let selectedFiles = [], currentJob = null, pollTimer = null, cleanedBaseline = "";

async function api(url, options={}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || JSON.stringify(data) || `HTTP ${response.status}`);
  return data;
}
async function health() {
  try {
    const h = await api("/api/health");
    $("serverStatus").textContent = h.model_loaded ? `Model loaded · ${h.device}` : `Server ready · ${h.device}`;
  } catch { $("serverStatus").textContent = "Server unavailable"; }
}
health();

function chooseFiles(fileList) {
  const incoming = [...(fileList || [])];
  if (!incoming.length) return;
  selectedFiles = incoming;
  const totalMB = incoming.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024;
  $("fileInfo").textContent = incoming.length === 1
    ? `${incoming[0].name} · ${(incoming[0].size/1024/1024).toFixed(2)} MB`
    : `${incoming.length} files selected · ${totalMB.toFixed(2)} MB total\n${incoming.map(f => f.name).join(" · ")}`;
  $("fileInfo").classList.remove("hidden");
  $("runBtn").disabled = false;
  $("resultCard").classList.add("hidden");
}
$("browseBtn").onclick = () => $("fileInput").click();
$("fileInput").onchange = e => chooseFiles(e.target.files);
const dz = $("dropzone");
dz.addEventListener("dragover", e => {e.preventDefault(); dz.classList.add("drag");});
dz.addEventListener("dragleave", () => dz.classList.remove("drag"));
dz.addEventListener("drop", e => {e.preventDefault(); dz.classList.remove("drag"); chooseFiles(e.dataTransfer.files);});
dz.addEventListener("keydown", e => {if(e.key==="Enter"||e.key===" "){e.preventDefault();$("fileInput").click();}});

$("runBtn").onclick = async () => {
  if (!selectedFiles.length) return;
  $("runBtn").disabled = true; $("cancelBtn").disabled = false;
  $("progressCard").classList.remove("hidden"); $("resultCard").classList.add("hidden");
  $("error").classList.add("hidden"); $("stage").textContent = "Uploading file…";
  try {
    const form = new FormData(); selectedFiles.forEach(file => form.append("files", file));
    const created = await api("/api/jobs", {method:"POST", body:form});
    currentJob = created.job_id;
    const settings = {
      mode:$("mode").value, prompt:$("prompt").value,
      base_size:Number($("baseSize").value), image_size:Number($("imageSize").value),
      max_length:Number($("maxLength").value), temperature:Number($("temperature").value),
      no_repeat_ngram_size:Number($("ngramSize").value), ngram_window:Number($("ngramWindow").value),
      crop_mode:$("cropMode").checked
    };
    await api(`/api/jobs/${currentJob}/run`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(settings)});
    pollTimer = setInterval(pollJob, 700); await pollJob();
  } catch (e) {
    $("stage").textContent = "Could not start OCR"; $("error").textContent = e.message;
    $("error").classList.remove("hidden"); $("runBtn").disabled = false; $("cancelBtn").disabled = true;
  }
};
async function pollJob() {
  if (!currentJob) return;
  try {
    const j = await api(`/api/jobs/${currentJob}`);
    $("stage").textContent = j.stage || j.status;
    $("percent").textContent = `${j.progress || 0}%`;
    $("progressFill").style.width = `${j.progress || 0}%`;
    $("progressDetail").textContent = j.progress_detail || (["running","starting","cancelling"].includes(j.status) ? "Inference progress is stage-based until the model exposes a reliable completion estimate." : "");
    if (j.status === "completed") {
      clearInterval(pollTimer); pollTimer = null; $("cancelBtn").disabled = true; $("runBtn").disabled = false;
      const result = await api(`/api/jobs/${currentJob}/result?view=clean`);
      cleanedBaseline = result.clean;
      $("resultText").value = result.clean; $("rawPane").textContent = result.raw;
      $("resultCard").classList.remove("hidden"); $("saveMessage").textContent = "Review the result. Nothing has been saved yet.";
      $("resultCard").scrollIntoView({behavior:"smooth",block:"start"});
    } else if (["cancelled","error"].includes(j.status)) {
      clearInterval(pollTimer); pollTimer = null; $("cancelBtn").disabled = true; $("runBtn").disabled = false;
      if (j.error) {$("error").textContent = j.error; $("error").classList.remove("hidden");}
    }
  } catch (e) { $("stage").textContent = `Status check failed: ${e.message}`; }
}
$("cancelBtn").onclick = async () => {
  if (!currentJob) return;
  $("cancelBtn").disabled = true;
  try { await api(`/api/jobs/${currentJob}/cancel`, {method:"POST"}); $("stage").textContent = "Cancellation requested…"; }
  catch(e) { $("stage").textContent = e.message; }
};
document.querySelectorAll(".tab").forEach(btn => btn.onclick = () => {
  document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b===btn));
  const raw = btn.dataset.view === "raw";
  $("rawPane").classList.toggle("hidden",!raw); $("previewPane").classList.toggle("hidden",raw);
});
$("discardEditsBtn").onclick = () => { $("resultText").value = cleanedBaseline; $("saveMessage").textContent = "Edits reset to cleaned OCR output."; };

$("browseFolderBtn").onclick = async () => {
  const button = $("browseFolderBtn");
  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = "Opening…";
  try {
    const result = await api("/api/pick-folder", {method:"POST"});
    if (result.cancelled) return;
    $("outputDir").value = result.path;
    $("saveMessage").textContent = `Output folder selected: ${result.path}`;
  } catch (e) {
    $("saveMessage").textContent = `Could not open the Windows folder picker: ${e.message}`;
  } finally {
    button.disabled = false;
    button.textContent = originalLabel;
  }
};
$("saveBtn").onclick = async () => {
  if (!currentJob) return;
  const outputDir = $("outputDir").value.trim();
  if (!outputDir) { $("saveMessage").textContent = "Choose an output folder first."; return; }
  const formats = [...document.querySelectorAll(".format:checked")].map(x=>x.value);
  if (!formats.length) { $("saveMessage").textContent = "Select at least one export format."; return; }
  const body = {output_dir:outputDir,filename:$("outputName").value.trim() || "Document",formats,text:$("resultText").value,overwrite:false};
  $("saveBtn").disabled = true; $("saveMessage").textContent = "Saving…";
  try {
    const result = await api(`/api/jobs/${currentJob}/save`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    $("saveMessage").textContent = "Saved:\n" + result.saved.join("\n");
  } catch(e) {
    if (e.message.includes("Files already exist")) {
      if (confirm(`${e.message}\nOverwrite the existing file(s)?`)) {
        body.overwrite = true;
        try {
          const result = await api(`/api/jobs/${currentJob}/save`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
          $("saveMessage").textContent = "Saved:\n" + result.saved.join("\n");
        } catch (e2) { $("saveMessage").textContent = e2.message; }
      } else $("saveMessage").textContent = "Save cancelled; existing files were not changed.";
    } else $("saveMessage").textContent = e.message;
  } finally { $("saveBtn").disabled = false; }
};
$("discardBtn").onclick = async () => {
  if (currentJob) { try { await api(`/api/jobs/${currentJob}`,{method:"DELETE"}); } catch {} }
  currentJob = null; cleanedBaseline = ""; $("resultCard").classList.add("hidden"); $("progressCard").classList.add("hidden");
  $("saveMessage").textContent = ""; $("runBtn").disabled = !selectedFiles.length;
};
