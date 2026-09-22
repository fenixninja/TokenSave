/**
 * model.js - Fenix Vector (Embeddings) & Dimension Reduction Integration
 *
 * Provides:
 * - Transformers.js pipeline initialization with browser cache & WebGPU fallback
 * - Memory & sessionStorage embedding cache
 * - Vectorized cosine similarity calculation
 * - UMAP 2D projection
 */

import { pipeline} from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.2";
import { UMAP } from "https://cdn.jsdelivr.net/npm/umap-js@1.4.0/+esm";

// Enable browser cache for models
env.useBrowserCache = true;

// Configurar carga 100% local desde el servidor web local (garantiza cero llamadas o cuotas a Hugging Face)
env.allowLocalModels = false;
env.allowRemoteModels = true;
env.localModelPath = "/models/";

// Suppress benign ONNX runtime warnings
if (env.backends && env.backends.onnx) {
    env.backends.onnx.logLevel = "error";
}

const CACHE_KEY = "fenix_session_cached_embeddings";
let memoryCache = null;

export function getEmbeddingCache() {
    if (memoryCache) return memoryCache;
    try {
        const raw = sessionStorage.getItem(CACHE_KEY);
        memoryCache = raw ? JSON.parse(raw) : {};
    } catch (_) {
        memoryCache = {};
    }
    return memoryCache;
}

export function saveEmbeddingCache(cache) {
    memoryCache = cache;
    try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (_) {
        // Handle potential quota errors gracefully
    }
}

let embedPipeline = null;
let modelLoadingPromise = null;

/**
 * Initializes or retrieves the singleton Transformers.js embedding pipeline.
 *
 * @param {function} [onProgress] - Progress callback (info: { status, progress, file })
 * @returns {Promise<any>}
 */
export async function getEmbeddingModel(onProgress) {
    if (embedPipeline) return embedPipeline;
    if (modelLoadingPromise) return modelLoadingPromise;

    modelLoadingPromise = (async () => {
        try {
            embedPipeline = await pipeline(
                "feature-extraction",
                "onnx-community/Qwen3-Embedding-0.6B-ONNX",
                {
                    device: "webgpu",
                    dtype: "q4f16",
                    session_options: {
                        logSeverityLevel: 3,
                    },
                    progress_callback: (info) => {
                        if (typeof onProgress === "function") {
                            onProgress(info);
                        }
                    }
                }
            );
            return embedPipeline;
        } catch (err) {
            console.warn("WebGPU initialization failed, falling back to WASM/CPU:", err);
            // Fallback to CPU/WASM
            embedPipeline = await pipeline(
                "feature-extraction",
                "onnx-community/Qwen3-Embedding-0.6B-ONNX",
                {
                    device: "wasm",
                    dtype: "q4f16",
                    session_options: {
                        logSeverityLevel: 3,
                    },
                    progress_callback: (info) => {
                        if (typeof onProgress === "function") {
                            onProgress(info);
                        }
                    }
                }
            );
            return embedPipeline;
        }
    })();

    return modelLoadingPromise;
}

/**
 * Computes embeddings for an array of texts, utilizing local cache.
 *
 * @param {string[]} texts - Raw string inputs
 * @param {string} [prefix='Query:'] - Optional prefix or instruction
 * @param {function} [onStatus] - Status update callback
 * @returns {Promise<number[][]>} Array of normalized embedding vectors
 */
export async function computeEmbeddings(texts, prefix = "Query:", onStatus) {
    const cache = getEmbeddingCache();
    const model = await getEmbeddingModel(onStatus);

    const formattedTexts = texts.map(t => `${prefix} ${t.trim()}`);
    const missingIndices = [];
    const missingFormatted = [];

    formattedTexts.forEach((formatted, idx) => {
        if (!cache[formatted]) {
            missingIndices.push(idx);
            missingFormatted.push(formatted);
        }
    });

    if (missingFormatted.length > 0) {
        if (typeof onStatus === "function") {
            onStatus({ status: "working", message: `Generando embeddings (${missingFormatted.length} nuevos)...` });
        }
        const output = await model(missingFormatted, { pooling: "mean", normalize: true });
        const vectors = output.tolist();
        missingIndices.forEach((origIdx, i) => {
            const key = formattedTexts[origIdx];
            cache[key] = vectors[i];
        });
        saveEmbeddingCache(cache);
    }

    return formattedTexts.map(key => cache[key]);
}

/**
 * Calculates cosine similarity between two normalized vectors (dot product).
 *
 * @param {number[]} vecA
 * @param {number[]} vecB
 * @returns {number}
 */
export function cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dot = 0;
    for (let i = 0; i < vecA.length; i++) {
        dot += vecA[i] * vecB[i];
    }
    return Number(dot.toFixed(4));
}

/**
 * Projects high-dimensional embeddings to 2D using UMAP.
 *
 * @param {number[][]} embeddings - High-dimensional vector array
 * @param {object} [options] - UMAP options (nNeighbors, minDist)
 * @returns {number[][]} 2D coordinates [ [x, y], ... ]
 */
export function project2DUMAP(embeddings, options = {}) {
    if (!embeddings || embeddings.length === 0) return [];
    if (embeddings.length === 1) return [[0, 0]];

    const nNeighbors = options.nNeighbors || Math.max(1, Math.min(embeddings.length - 1, 15));
    const minDist = options.minDist !== undefined ? options.minDist : 0.1;

    const umap = new UMAP({
        nComponents: 2,
        nNeighbors: nNeighbors,
        minDist: minDist
    });

    const coords = umap.fit(embeddings);
    return coords.map(c => [Number(c[0].toFixed(4)), Number(c[1].toFixed(4))]);
}
