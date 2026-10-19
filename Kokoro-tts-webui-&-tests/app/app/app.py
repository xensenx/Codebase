from __future__ import annotations
import io, json, re, threading, uuid, zipfile, time, os
from datetime import datetime
from pathlib import Path
from typing import Optional
import numpy as np
import soundfile as sf
import torch
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from kokoro import KModel, KPipeline

APP_DIR = Path(__file__).resolve().parent
# Supports both the normal layout and the user's currently nested app/app layout.
PROJECT_ROOT = next((p for p in APP_DIR.parents if (p / 'models' / 'kokoro-v1_0.pth').is_file()), APP_DIR.parent)
MODEL_DIR = PROJECT_ROOT / 'models'; VOICE_DIR = MODEL_DIR / 'voices'; DEFAULT_OUTPUT_DIR = PROJECT_ROOT / 'output'
STATIC_DIR = APP_DIR / 'static'; WEIGHTS_PATH = MODEL_DIR / 'kokoro-v1_0.pth'; CONFIG_PATH = MODEL_DIR / 'config.json'
SAMPLE_RATE = 24000
LANGUAGES = {'a':'English (US)', 'b':'English (UK)', 'j':'Japanese', 'z':'Chinese (Mandarin)', 'e':'Spanish', 'f':'French', 'h':'Hindi', 'i':'Italian', 'p':'Portuguese (Brazil)'}
app = FastAPI(title='Kokoro Local Speech Studio', version='3.0.0')
app.mount('/static', StaticFiles(directory=str(STATIC_DIR)), name='static')
app.mount('/audio', StaticFiles(directory=str(DEFAULT_OUTPUT_DIR), check_dir=False), name='audio')
_model = None; _pipelines: dict[str, KPipeline] = {}; _model_lock = threading.Lock(); _generation_lock = threading.Lock()
_jobs: dict[str, dict] = {}; _generated_files: dict[str, Path] = {}; _jobs_lock = threading.Lock()

class GenerateRequest(BaseModel):
    text: str = Field(min_length=1, max_length=500000)
    voice: str
    speed: float = Field(default=1.0, ge=0.5, le=1.5)
    chunking_enabled: bool = False
    chunk_minutes: int = Field(default=5, ge=1, le=60)
    save_chunks: bool = False
    organize_folder: bool = True
    export_metadata: bool = True
    normalize_text: bool = True
    filename: str = Field(default='Kokoro audiobook', max_length=120)
    output_dir: str = ''

def get_voice_files():
    found=[]
    if not VOICE_DIR.is_dir(): return found
    for path in sorted(VOICE_DIR.glob('*.pt'), key=lambda p:p.stem.casefold()):
        vid=path.stem; code=vid[:1].lower()
        if code not in LANGUAGES: continue
        gender_code=vid[1:2].lower(); gender={'f':'Female','m':'Male'}.get(gender_code,'Unspecified')
        found.append({'id':vid,'label':vid,'language_code':code,'language':LANGUAGES[code],'gender':gender,'filename':path.name})
    return found

def get_model():
    global _model
    if _model is not None: return _model
    with _model_lock:
        if _model is None:
            if not WEIGHTS_PATH.is_file(): raise RuntimeError(f'Model weights not found: {WEIGHTS_PATH}')
            if not CONFIG_PATH.is_file() or CONFIG_PATH.stat().st_size == 0: raise RuntimeError(f'Model config missing or empty: {CONFIG_PATH}')
            _model=KModel(repo_id='hexgrad/Kokoro-82M', config=str(CONFIG_PATH), model=str(WEIGHTS_PATH)).to('cuda' if torch.cuda.is_available() else 'cpu').eval()
    return _model

def get_pipeline(code):
    if code not in LANGUAGES: raise ValueError(f'Unsupported language code: {code}')
    if code not in _pipelines:
        _pipelines[code]=KPipeline(lang_code=code, repo_id='hexgrad/Kokoro-82M', model=get_model(), device='cuda' if torch.cuda.is_available() else 'cpu')
    return _pipelines[code]

def clean_name(name: str) -> str:
    name = re.sub(r'[<>:"/\\|?*\x00-\x1f]', '_', name).strip(' .')
    return (name or 'Kokoro audiobook')[:100]

def normalize_text_fn(text: str) -> str:
    text = text.replace('\r\n','\n').replace('\r','\n')
    text = re.sub(r'[ \t]+',' ',text); text = re.sub(r'\n{3,}','\n\n',text)
    return text.strip()

def split_sentences(text: str, max_chars: int = 850) -> list[str]:
    paragraphs = [p.strip() for p in re.split(r'\n\s*\n', text) if p.strip()]; out=[]
    for para in paragraphs:
        if len(para) <= max_chars: out.append(para); continue
        sentences = re.split(r'(?<=[.!?。！？])\s+', para); current=''
        for sentence in sentences:
            if len(sentence) > max_chars:
                words=sentence.split(); sub=''
                for word in words:
                    if sub and len(sub)+1+len(word)>max_chars: out.append(sub); sub=word
                    else: sub=(sub+' '+word).strip()
                if sub:
                    if current: out.append(current); current=''
                    out.append(sub)
            elif not current: current=sentence
            elif len(current)+1+len(sentence)<=max_chars: current += ' '+sentence
            else: out.append(current); current=sentence
        if current: out.append(current)
    return out or [text]

def time_chunks(text: str, minutes: int) -> list[str]:
    target_words=max(80, minutes*150); sentences=split_sentences(text, max_chars=5000); chunks=[]; current=[]; words=0
    for part in sentences:
        count=len(part.split())
        if current and words+count>target_words: chunks.append('\n\n'.join(current)); current=[]; words=0
        current.append(part); words += count
    if current: chunks.append('\n\n'.join(current))
    return chunks or [text]

@app.get('/')
def index(): return FileResponse(STATIC_DIR/'index.html')
@app.get('/api/status')
def status():
    return {'model_files_present':WEIGHTS_PATH.is_file() and CONFIG_PATH.is_file(),'voice_count':len(get_voice_files()),'device':'cuda' if torch.cuda.is_available() else 'cpu','gpu_available':torch.cuda.is_available(),'model_loaded':_model is not None,'sample_rate':SAMPLE_RATE,'output_dir':str(DEFAULT_OUTPUT_DIR),'gpu_name':torch.cuda.get_device_name(0) if torch.cuda.is_available() else None}
@app.get('/api/voices')
def voices():
    found=get_voice_files()
    if not found: raise HTTPException(500,detail=f'No .pt voice files found in {VOICE_DIR}')
    return {'voices':found,'languages':LANGUAGES}

@app.post('/api/pick-folder')
def pick_folder():
    """Open a native Windows folder picker on the machine running this localhost app."""
    try:
        import tkinter as tk
        from tkinter import filedialog
        root=tk.Tk(); root.withdraw(); root.attributes('-topmost', True)
        selected=filedialog.askdirectory(title='Choose Kokoro output folder', mustexist=True)
        root.destroy()
        return {'path':selected or ''}
    except Exception as exc:
        raise HTTPException(500, detail=f'Could not open native folder picker: {exc}. You can type a folder path instead.')

async def read_doc(file: UploadFile) -> tuple[str,str]:
    name=file.filename or 'document.txt'; suffix=Path(name).suffix.lower()
    if suffix not in {'.txt','.md','.markdown','.pdf','.epub'}: raise ValueError(f'{name}: unsupported format. Use PDF, EPUB, TXT, or Markdown.')
    raw=await file.read()
    if len(raw)>50*1024*1024: raise ValueError(f'{name}: file exceeds 50 MB.')
    if suffix in {'.txt','.md','.markdown'}: text=raw.decode('utf-8-sig',errors='replace')
    elif suffix=='.pdf':
        from pypdf import PdfReader
        reader=PdfReader(io.BytesIO(raw)); text='\n\n'.join((page.extract_text() or '') for page in reader.pages)
    else:
        from bs4 import BeautifulSoup
        with zipfile.ZipFile(io.BytesIO(raw)) as z:
            candidates=[n for n in z.namelist() if n.lower().endswith(('.xhtml','.html','.htm')) and not n.lower().endswith('nav.xhtml')]
            pieces=[]
            for n in candidates:
                soup=BeautifulSoup(z.read(n),'html.parser')
                for tag in soup(['script','style','nav']): tag.decompose()
                body=soup.body or soup; piece=body.get_text('\n',strip=True)
                if piece: pieces.append(piece)
            text='\n\n'.join(pieces)
    if not text.strip(): raise ValueError(f'{name}: no extractable text found. Scanned PDFs need OCR first.')
    return name,text

@app.post('/api/extract-many')
async def extract_many(files: list[UploadFile] = File(...)):
    if len(files)>30: raise HTTPException(413, detail='Import up to 30 documents at a time.')
    pieces=[]; names=[]; chars=0
    for f in files:
        try: name,text=await read_doc(f)
        except Exception as exc: raise HTTPException(400, detail=str(exc)) from exc
        names.append(name); pieces.append(f'\n\n{("="*12)} {name} {("="*12)}\n\n{text}'); chars += len(text)
    combined='\n'.join(pieces)
    return {'filenames':names,'text':combined,'characters':len(combined),'source_characters':chars,'count':len(names)}

@app.post('/api/extract')
async def extract_document(file: UploadFile = File(...)):
    try: name,text=await read_doc(file)
    except Exception as exc: raise HTTPException(400,detail=str(exc)) from exc
    return {'filename':name,'text':text,'characters':len(text)}

@app.post('/api/generate')
def start_generation(req: GenerateRequest):
    text=normalize_text_fn(req.text) if req.normalize_text else req.text.strip()
    if not text: raise HTTPException(400,detail='Enter text or import a document first.')
    available={v['id']:v for v in get_voice_files()}
    if req.voice not in available: raise HTTPException(400,detail='That voice is not in the local voice collection.')
    output_path=Path(req.output_dir).expanduser() if req.output_dir.strip() else DEFAULT_OUTPUT_DIR
    try: output_path=output_path.resolve(); output_path.mkdir(parents=True,exist_ok=True)
    except Exception as exc: raise HTTPException(400,detail=f'Cannot use output folder: {exc}')
    jobid=uuid.uuid4().hex
    with _jobs_lock:
        _jobs[jobid]={'id':jobid,'state':'queued','percent':0,'message':'Queued for local inference…','started_at':None,'elapsed_seconds':0,'characters':len(text),'phoneme_tokens':0,'chunks_done':0,'chunks_total':0,'error':None,'result':None}
    thread=threading.Thread(target=_run_generation,args=(jobid,req,text,available[req.voice],output_path),daemon=True)
    thread.start()
    return {'job_id':jobid}

def _update_job(jobid, **kwargs):
    with _jobs_lock:
        if jobid in _jobs: _jobs[jobid].update(kwargs)

def _run_generation(jobid, req, text, voice, output_path):
    started=time.perf_counter(); _update_job(jobid,state='running',started_at=time.time(),message='Loading model and preparing text…')
    try:
        with _generation_lock:
            pipeline=get_pipeline(voice['language_code'])
            segments=time_chunks(text,req.chunk_minutes) if req.chunking_enabled else [text]
            total_chars=max(1,sum(len(s) for s in segments)); processed_chars=0; phoneme_tokens=0; wav_parts=[]; saved_chunks=[]
            base=clean_name(req.filename); job_stamp=datetime.now().strftime('%Y%m%d_%H%M%S')+'_'+jobid[:6]
            folder=output_path/(f'{base}_{job_stamp}' if req.organize_folder else '')
            _update_job(jobid,chunks_total=len(segments),message='Generating speech…')
            silence=np.zeros(int(SAMPLE_RATE*.12),dtype=np.float32)
            for index, segment in enumerate(segments,1):
                segment_parts=[]; segment_chars=0
                for gs, ps, audio in pipeline(segment,voice=str(VOICE_DIR/voice['filename']),speed=req.speed):
                    if gs is not None: segment_chars += len(str(gs))
                    if ps is not None: phoneme_tokens += len(str(ps))
                    if audio is not None:
                        arr=audio.detach().float().cpu().numpy() if isinstance(audio,torch.Tensor) else np.asarray(audio,dtype=np.float32)
                        arr=np.asarray(arr,dtype=np.float32).reshape(-1)
                        if arr.size: segment_parts.append(arr)
                    # Progress uses completed text units yielded by Kokoro, not an animated indeterminate bar.
                    approx_done=processed_chars + min(len(segment), segment_chars)
                    percent=min(98, int(approx_done/total_chars*100))
                    _update_job(jobid,percent=max(_jobs[jobid]['percent'],percent),phoneme_tokens=phoneme_tokens,elapsed_seconds=round(time.perf_counter()-started,2),message=f'Generating segment {index} of {len(segments)}…')
                if not segment_parts: raise RuntimeError(f'Kokoro returned no audio for segment {index}.')
                segment_audio=np.concatenate(segment_parts); folder.mkdir(parents=True,exist_ok=True)
                if req.save_chunks:
                    chunk_dir=folder/'chunks' if req.organize_folder else output_path/'chunks'/jobid
                    chunk_dir.mkdir(parents=True,exist_ok=True); chunk_path=chunk_dir/f'chunk_{index:04d}.wav'
                    sf.write(str(chunk_path),segment_audio,SAMPLE_RATE,subtype='PCM_16'); saved_chunks.append(str(chunk_path))
                if wav_parts: wav_parts.append(silence)
                wav_parts.append(segment_audio); processed_chars += len(segment)
                _update_job(jobid,percent=min(98,int(processed_chars/total_chars*100)),chunks_done=index,phoneme_tokens=phoneme_tokens,elapsed_seconds=round(time.perf_counter()-started,2),message=f'Finished segment {index} of {len(segments)}.')
            waveform=np.concatenate(wav_parts); folder.mkdir(parents=True,exist_ok=True)
            destination=folder/f'{base}.wav'; sf.write(str(destination),waveform,SAMPLE_RATE,subtype='PCM_16')
            elapsed=round(time.perf_counter()-started,2); duration=round(len(waveform)/SAMPLE_RATE,2)
            meta={'created_at':datetime.now().isoformat(timespec='seconds'),'model':'Kokoro-82M v1.0','voice':req.voice,'gender':voice['gender'],'language':voice['language'],'speed':req.speed,'device':'cuda' if torch.cuda.is_available() else 'cpu','sample_rate':SAMPLE_RATE,'duration_seconds':duration,'generation_seconds':elapsed,'characters':len(text),'phoneme_tokens':phoneme_tokens,'characters_per_second':round(len(text)/elapsed,2) if elapsed else None,'chunking_enabled':req.chunking_enabled,'chunks':len(segments),'saved_intermediate_chunks':req.save_chunks,'chunk_files':saved_chunks,'text':text if req.export_metadata else None}
            if req.export_metadata: (folder/'metadata.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf-8')
            fileid=uuid.uuid4().hex; _generated_files[fileid]=destination
            result={'filename':destination.name,'relative_path':str(destination),'audio_url':f'/api/audio/{fileid}','download_url':f'/api/download-file/{fileid}','duration_seconds':duration,'generation_seconds':elapsed,'characters':len(text),'phoneme_tokens':phoneme_tokens,'characters_per_second':meta['characters_per_second'],'chunks':len(segments),'voice':req.voice,'language':voice['language'],'gender':voice['gender'],'device':'cuda' if torch.cuda.is_available() else 'cpu','output_dir':str(folder),'saved_chunks':len(saved_chunks)}
            _update_job(jobid,state='completed',percent=100,message='Speech generation complete.',elapsed_seconds=elapsed,phoneme_tokens=phoneme_tokens,chunks_done=len(segments),result=result)
    except ImportError as exc:
        msg=str(exc)
        if voice['language_code']=='j': msg += ' Install Japanese support: python -m pip install "misaki[ja]"'
        elif voice['language_code']=='z': msg += ' Install Chinese support: python -m pip install "misaki[zh]"'
        _update_job(jobid,state='error',message='Generation failed.',error=msg,elapsed_seconds=round(time.perf_counter()-started,2))
    except Exception as exc:
        _update_job(jobid,state='error',message='Generation failed.',error=f'{type(exc).__name__}: {exc}',elapsed_seconds=round(time.perf_counter()-started,2))

@app.get('/api/progress/{jobid}')
def progress(jobid: str):
    with _jobs_lock: job=_jobs.get(jobid)
    if not job: raise HTTPException(404,detail='Generation job not found.')
    result=dict(job)
    if result.get('started_at') and result['state']=='running': result['elapsed_seconds']=round(time.time()-result['started_at'],2)
    return result

@app.get('/api/audio/{fileid}')
def play_audio(fileid: str):
    path=_generated_files.get(fileid)
    if not path or not path.is_file(): raise HTTPException(404,detail='Audio file not found.')
    return FileResponse(path,media_type='audio/wav')
@app.get('/api/download-file/{fileid}')
def download_file(fileid: str):
    path=_generated_files.get(fileid)
    if not path or not path.is_file(): raise HTTPException(404,detail='Audio file not found.')
    return FileResponse(path,media_type='audio/wav',filename=path.name)
