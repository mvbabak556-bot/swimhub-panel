/* Estakhrjo CV translation worker — runs Mozilla Bergamot / Firefox Translations locally. */
/* Model and engine are static application assets; this worker never calls a translation API. */
'use strict';

const MODEL_BASE = new URL('../assets/cv-translator/model/', self.location.href).href;
const CACHE_NAME = 'estakhrjo-cv-fa-en-v1';
let translationService;
let translationModel;
let modelMemories = [];
let runtimeReady = false;

var Module = {
  locateFile: path => new URL(`cv-translator/${path}`, self.location.href).href,
  onRuntimeInitialized: () => {
    runtimeReady = true;
    postMessage({ type: 'ready' });
  }
};

function postError(id, error) {
  postMessage({ type: 'error', id, message: error && error.message ? error.message : String(error || 'Translation failed') });
}

async function localAsset(name) {
  const url = new URL(name, MODEL_BASE).href;
  let response;
  try {
    const cache = await caches.open(CACHE_NAME);
    response = await cache.match(url);
    if (!response) {
      response = await fetch(url, { cache: 'force-cache' });
      if (!response.ok) throw new Error(`Could not load local translation asset: ${name}`);
      await cache.put(url, response.clone());
    }
  } catch (cacheError) {
    response = await fetch(url, { cache: 'force-cache' });
    if (!response.ok) throw new Error(`Could not load local translation asset: ${name}`);
  }
  return response.arrayBuffer();
}

async function alignedMemory(name, alignment) {
  const buffer = await localAsset(name);
  const bytes = new Int8Array(buffer);
  const memory = new Module.AlignedMemory(bytes.byteLength, alignment);
  memory.getByteArrayView().set(bytes);
  return memory;
}

async function ensureModel() {
  if (!runtimeReady) throw new Error('Offline translation engine is not ready');
  if (translationModel) return;

  postMessage({ type: 'progress', message: 'در حال آماده‌سازی مترجم آفلاین روی دستگاه…' });
  translationService = new Module.BlockingService({ cacheSize: 0 });
  const [modelMemory, shortlistMemory, sourceVocabMemory, targetVocabMemory] = await Promise.all([
    alignedMemory('model.faen.intgemm.alphas.bin', 256),
    alignedMemory('lex.50.50.faen.s2t.bin', 64),
    alignedMemory('vocab.faen.spm', 64),
    alignedMemory('vocab.faen.spm', 64)
  ]);
  const vocabs = new Module.AlignedMemoryList();
  vocabs.push_back(sourceVocabMemory);
  vocabs.push_back(targetVocabMemory);
  const config = `beam-size: 1
normalize: 1.0
word-penalty: 0
max-length-break: 128
mini-batch-words: 1024
workspace: 128
max-length-factor: 2.0
skip-cost: true
cpu-threads: 0
quiet: true
quiet-translation: true
gemm-precision: int8shiftAll
`;
  translationModel = new Module.TranslationModel(config, modelMemory, shortlistMemory, vocabs, null);
  modelMemories = [modelMemory, shortlistMemory, sourceVocabMemory, targetVocabMemory, vocabs];
  postMessage({ type: 'model-ready' });
}

async function translate(id, texts) {
  await ensureModel();
  const input = new Module.VectorString();
  const options = new Module.VectorResponseOptions();
  try {
    texts.forEach(text => input.push_back(String(text || '').trim()));
    const result = translationService.translate(translationModel, input, options);
    const translated = [];
    for (let index = 0; index < result.size(); index++) translated.push(result.get(index).getTranslatedText());
    if (result.delete) result.delete();
    postMessage({ type: 'translated', id, texts: translated });
  } finally {
    options.delete();
    input.delete();
  }
}

onmessage = async event => {
  const data = event.data || {};
  try {
    if (data.type === 'init') {
      importScripts('cv-translator/bergamot-translator-worker.js');
    } else if (data.type === 'translate') {
      await translate(data.id, Array.isArray(data.texts) ? data.texts : []);
    }
  } catch (error) {
    postError(data.id, error);
  }
};
