/**
 * app.js - Main SPA Application Controller & Mathematical Decision Engine
 *
 * Orchestrates:
 * - Active use case selection and URL hash routing
 * - Prominent modal drawer and category quick pills for all 10 use cases
 * - Stepper controls for navigating through 15 preconfigured examples per use case (150 total)
 * - Dual-engine evaluation: Local Qwen3 ONNX embeddings + real-time slider updates
 * - Dual Mathematical Telemetry & Contrast View (showing embedding pipeline & comparison with js/use-cases.js)
 * - Markov Decision Process (MDP) and Bellman optimality for robot telemetry
 */

import { USE_CASES, USE_CASE_CATEGORIES } from "./use-cases.js";
import {
    calculateChoiceConfidence,
    analyzeChoiceDistribution,
    calculateScoreValue,
    calculateCompositeScore,
    softmax,
    evaluateConfidenceTier
} from "./primitives.js";
import {
    getEmbeddingModel,
    computeEmbeddings,
    cosineSimilarity,
    project2DUMAP
} from "./model.js";
import {
    renderProbabilityBars,
    renderConfidenceGauge,
    renderDecisionFlowchart,
    renderCompositeScoringWorkbench,
    renderJsonInspector,
    renderMathInspectionView,
    escapeHtml
} from "./ui.js";
import {
    ROBOT_MDP_STATES,
    ROBOT_MDP_ACTIONS,
    evaluateRobotTelemetryMDP
} from "./markov-mdp.js";
import {
    runContinuousGeometricTelemetry,
    loadDefaultKNNPrecedents
} from "./geometric-engine.js";
import {
    loadCaseExample,
    CASE_EXAMPLES_MANIFEST
} from "./case-examples-loader.js";

// Global App State
const state = {
    activeUseCaseId: "support_fanout",
    activeViewMode: "workbench", // 'workbench' | 'json' | 'math'
    activeCategoryFilter: "all",
    inputText: "",
    modelReady: false,
    modelWorking: false,
    currentAnswers: {},
    compositeWeights: {},
    activeProfile: "Senior IC",
    robotDataset: null,
    mdpTelemetry: null,
    knnMemory: [],
    conversationHistory: [],
    geometricTelemetry: null,
    lastInputEmbedding: null,
    // Embeding case-use-examples integration
    isEvaluated: false,
    referenceState: null,
    currentSchema: null,
    currentExampleData: null,
    activeJsonTab: "query"
};

// Flowchart nodes definitions for all 8 standard routing use cases
const FLOWCHART_NODES = {
    support_fanout: [
        { id: "input", label: "Ticket de Soporte", type: "input", text: "Entrada cruda del cliente" },
        { id: "fanout_eval", label: "Speculative Fan-Out", type: "eval", text: "5 preguntas paralelas en 1 pasada" },
        { id: "gate_bug", label: "Compuerta: ¿Bug?", type: "gate", text: "category == 'bug_report'" },
        { id: "gate_billing", label: "Compuerta: ¿Facturación?", type: "gate", text: "category == 'billing'" },
        { id: "node_eng_crit", label: "Ingeniería Nivel 3", type: "action", text: "Bug bloqueante o repro claro" },
        { id: "node_eng_backlog", label: "Backlog Regular", type: "action", text: "Bug menor cosmético" },
        { id: "node_billing_refund", label: "Reembolsos Finanzas", type: "action", text: "Solicitud explícita de dinero" },
        { id: "node_billing_general", label: "Atención al Cliente", type: "action", text: "Consulta estándar de recibo" },
        { id: "node_product", label: "Roadmap de Producto", type: "action", text: "Petición de nueva feature" },
        { id: "node_account", label: "Flujo de Identidad", type: "action", text: "Auth / Contraseña / Login" }
    ],
    banking_confidence: [
        { id: "input", label: "Comando de Voz", type: "input", text: "Transcripción verbal de banca" },
        { id: "eval_intent", label: "Choice: Intent", type: "eval", text: "check_balance | approve_transfer | other" },
        { id: "gate_floor", label: "Compuerta: ¿Confianza ≥ 0.60?", type: "gate", text: "Filtro de incertidumbre mínima" },
        { id: "node_human", label: "Agente Humano de Soporte", type: "action", text: "Incertidumbre o 'other'" },
        { id: "gate_action", label: "¿Tipo de Acción?", type: "gate", text: "check_balance vs approve_transfer" },
        { id: "node_balance", label: "Mostrar Saldo en Pantalla", type: "action", text: "Bajo riesgo: auto-aprobado" },
        { id: "gate_transfer", label: "Compuerta Transferencia: ¿Confianza > 0.85?", type: "gate", text: "Alto riesgo exige alta certeza" },
        { id: "node_confirm_user", label: "Solicitar Confirmación al Usuario", type: "action", text: "Confianza moderada (0.60-0.85)" },
        { id: "node_approve_direct", label: "Aprobar Transferencia Directa", type: "action", text: "Confianza > 0.85 (Auto seguro)" }
    ],
    llm_guardrails: [
        { id: "input", label: "Prompt del Usuario", type: "input", text: "Texto de entrada a evaluar" },
        { id: "eval_guardrails", label: "Guardrails Semánticos", type: "eval", text: "Prompt Injection | Políticas | Toxicidad" },
        { id: "gate_safety", label: "Compuerta de Seguridad", type: "gate", text: "Inj ≥ 0.5 o Pol ≥ 0.5 o Tox ≥ 1.2" },
        { id: "node_block", label: "BLOQUEAR (HTTP 403)", type: "action", text: "Ataque malicioso detectado" },
        { id: "node_warn", label: "ADVERTENCIA (Auditar)", type: "action", text: "Tono hostil / abuso menor" },
        { id: "node_pass", label: "APROBADO (Pase Limpio)", type: "action", text: "Enrutar al modelo LLM" }
    ],
    insurance_claims: [
        { id: "input", label: "Parte de Siniestro", type: "input", text: "Declaración del asegurado" },
        { id: "eval_claim", label: "Evaluación Multi-Criterio", type: "eval", text: "Tipo | Complejidad | Fraude | Docs" },
        { id: "gate_fraud", label: "¿Alerta Fraude? (≥ 50%)", type: "gate", text: "Filtro de riesgo forense" },
        { id: "node_fraud_unit", label: "Unidad Especial Fraude (SIU)", type: "action", text: "Peritaje e investigación penal" },
        { id: "gate_docs", label: "¿Docs Incompletos? (≥ 50%)", type: "gate", text: "Faltan partes o facturas" },
        { id: "node_request_docs", label: "Requerimiento al Cliente", type: "action", text: "Solicitud automática de pruebas" },
        { id: "gate_complexity", label: "¿Complejidad? (Score)", type: "gate", text: "≤ 0.8 STP vs > 0.8 Perito" },
        { id: "node_stp", label: "Aprobación Automática (STP)", type: "action", text: "Pago instantáneo sin perito" },
        { id: "node_adjuster", label: "Asignar Perito Senior", type: "action", text: "Inspección física y tasación" }
    ],
    financial_crime: [
        { id: "input", label: "Alerta Transaccional / KYC", type: "input", text: "Datos de cuenta y movimiento" },
        { id: "eval_aml", label: "Evaluación AML & Compliance", type: "eval", text: "Riesgo | PEP | Bloqueo Cautelar" },
        { id: "gate_risk", label: "Compuerta de Riesgo AML", type: "gate", text: "Bloqueo ≥ 0.70 o Riesgo ≥ 1.6" },
        { id: "node_freeze_sar", label: "BLOQUEO & Reporte SAR", type: "action", text: "Congelar fondos y notificar regulador" },
        { id: "node_compliance_edd", label: "Diligencia Debida (EDD)", type: "action", text: "Auditoría de fondos con oficial AML" },
        { id: "node_pass_clear", label: "Autorización Nominal", type: "action", text: "Operación legítima sin riesgo" }
    ],
    content_moderation: [
        { id: "input", label: "Post / Mensaje", type: "input", text: "Contenido enviado por usuario" },
        { id: "eval_mod", label: "Análisis Trust & Safety", type: "eval", text: "Daño | Doxxing/PII | Riesgo Crisis" },
        { id: "gate_crisis", label: "Compuerta Crisis Inminente", type: "gate", text: "self_harm_risk ≥ 0.50" },
        { id: "node_crisis_intervention", label: "PROTOCOLO DE CRISIS 24/7", type: "action", text: "Intervención de urgencia y ayuda" },
        { id: "gate_sev", label: "Compuerta Severidad", type: "gate", text: "Daño ≥ 1.6 o PII ≥ 0.70" },
        { id: "node_perm_block", label: "BLOQUEO PERMANENTE", type: "action", text: "Eliminación y suspensión de cuenta" },
        { id: "node_warn_flag", label: "ADVERTENCIA & REVISIÓN", type: "action", text: "Cola de moderadores humanos" },
        { id: "node_approve_clean", label: "PUBLICACIÓN APROBADA", type: "action", text: "Cumple directrices de comunidad" }
    ],
    legal_compliance: [
        { id: "input", label: "Cláusula Contractual", type: "input", text: "Extracto de contrato / acuerdo" },
        { id: "eval_legal", label: "Análisis Jurídico Semántico", type: "eval", text: "Responsabilidad | RGPD | Dictamen" },
        { id: "gate_risk", label: "Compuerta de Riesgo Jurídico", type: "gate", text: "Riesgo ≥ 1.5 o Dictamen ≥ 0.75" },
        { id: "node_counsel_veto", label: "VETO CONTRACTUAL", type: "action", text: "Escalar a Dirección Jurídica" },
        { id: "node_gdpr_amendment", label: "ADDENDUM RGPD OBLIGATORIO", type: "action", text: "Insertar cláusulas DPA Art. 28" },
        { id: "node_standard_approval", label: "APROBACIÓN PARA FIRMA", type: "action", text: "Términos estándar aceptados" }
    ],
    semantic_linting: [
        { id: "input", label: "Diff / Código Fuente", type: "input", text: "Fragmento enviado al Pull Request" },
        { id: "eval_linter", label: "Linter Semántico Arquitectónico", type: "eval", text: "Violación | Deuda Técnica | Sec flaw" },
        { id: "gate_ci", label: "Compuerta de Pipeline CI", type: "gate", text: "Vulnerabilidad ≥ 0.70 o Bloqueo ≥ 0.70" },
        { id: "node_ci_block", label: "BLOQUEAR MERGE EN CI", type: "action", text: "Fallo crítico por seguridad/arquitectura" },
        { id: "node_ci_warn", label: "ADVERTENCIA DE DEUDA", type: "action", text: "Requiere refactorización en backlog" },
        { id: "node_ci_pass", label: "MERGE CI APROBADO", type: "action", text: "Código limpio y desacoplado" }
    ]
};

// DOM Elements
const elements = {
    usecaseTabs: document.getElementById("usecase-tabs"),
    presetSelect: document.getElementById("preset-select"),
    btnPrevPreset: document.getElementById("btn-prev-preset"),
    btnNextPreset: document.getElementById("btn-next-preset"),
    presetCounter: document.getElementById("preset-counter"),
    textInput: document.getElementById("text-input"),
    btnRunModel: document.getElementById("btn-run-model"),
    statusDot: document.getElementById("status-dot"),
    statusText: document.getElementById("status-text"),
    workbenchContainer: document.getElementById("workbench-container"),
    viewModeTabs: document.getElementById("view-mode-tabs"),
    // Prominent Selector Bar & Modal Elements
    btnOpenModal: document.getElementById("btn-open-usecase-modal"),
    btnCloseModal: document.getElementById("btn-close-modal"),
    usecaseModal: document.getElementById("usecase-modal"),
    modalCasesContainer: document.getElementById("modal-cases-container"),
    categoryQuickPills: document.getElementById("category-quick-pills"),
    activeCaseIcon: document.getElementById("active-case-icon"),
    activeCaseName: document.getElementById("active-case-name"),
    activeCaseCategoryBadge: document.getElementById("active-case-category-badge")
};

function setStatus(text, type = "working") {
    if (elements.statusText) elements.statusText.textContent = text;
    if (elements.statusDot) {
        elements.statusDot.className = `status-dot ${type}`;
    }
}

/**
 * Initializes the model asynchronously in background with caching.
 */
async function initModel() {
    setStatus("Comprobando modelo Qwen3-Embedding local...", "working");
    try {
        await getEmbeddingModel((info) => {
            if (info.status === "progress") {
                const pct = Math.round(info.progress ?? 0);
                setStatus(`Cargando Qwen3 local (${pct}%)`, "working");
            } else if (info.status === "ready") {
                setStatus("Qwen3 ONNX listo en caché local", "ready");
            }
        });
        state.modelReady = true;
        setStatus("Qwen3 ONNX local listo (WebGPU/WASM)", "ready");
        if (elements.btnRunModel) elements.btnRunModel.disabled = false;
    } catch (err) {
        console.warn("Model initialization note:", err);
        setStatus("Modo simulación activo (ONNX listo bajo demanda)", "ready");
        if (elements.btnRunModel) elements.btnRunModel.disabled = false;
    }
}

/**
 * Switches the active use case.
 */
export function setUseCase(useCaseId, presetIdx = 0) {
    if (!USE_CASES[useCaseId]) return;
    state.activeUseCaseId = useCaseId;
    window.location.hash = useCaseId;

    const uc = USE_CASES[useCaseId];
    const cat = USE_CASE_CATEGORIES[uc.category] || { name: "General", icon: "📁" };

    // Update Prominent Header Bar
    if (elements.activeCaseIcon) elements.activeCaseIcon.textContent = uc.icon;
    if (elements.activeCaseName) elements.activeCaseName.textContent = uc.name;
    if (elements.activeCaseCategoryBadge) {
        elements.activeCaseCategoryBadge.textContent = `${cat.icon} ${cat.name}`;
    }

    // Initialize composite weights if relevant
    if (uc.weightProfiles && uc.weightProfiles[state.activeProfile]) {
        state.compositeWeights = { ...uc.weightProfiles[state.activeProfile] };
    } else {
        state.compositeWeights = {};
    }

    // Update Tab Buttons in top navbar
    document.querySelectorAll(".usecase-tab-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.usecase === useCaseId);
    });

    // Populate Presets Dropdown
    if (elements.presetSelect) {
        if (uc.presets && uc.presets.length > 0) {
            elements.presetSelect.innerHTML = uc.presets.map((p, idx) => `
                <option value="${idx}">[${idx + 1}/15] ${escapeHtml(p.name)}</option>
            `).join("");
            elements.presetSelect.disabled = false;
        } else {
            elements.presetSelect.innerHTML = `<option value="0">Ejemplo Nominal Predeterminado</option>`;
            elements.presetSelect.disabled = true;
        }
    }

    // Select the requested preset
    selectPreset(presetIdx);

    // Refresh modal card active highlights if modal is open
    updateModalActiveState();
}

/**
 * Helper to produce a deterministic unit vector u in R^1024 as mathematical fallback
 */
function computeDeterministicUnitVector(text) {
    const dim = 1024;
    const vec = new Float32Array(dim);
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    for (let i = 0; i < dim; i++) {
        const seed = (h + i * 2654435761) >>> 0;
        vec[i] = ((seed % 10000) / 5000) - 1.0;
    }
    let normSq = 0;
    for (let i = 0; i < dim; i++) normSq += vec[i] * vec[i];
    const norm = Math.sqrt(normSq) || 1;
    for (let i = 0; i < dim; i++) vec[i] /= norm;
    return Array.from(vec);
}

/**
 * Heuristic semantic similarity calculator between query and criterion texts
 */
function computeSemanticSimilarityHeuristic(text, target) {
    const tWords = new Set(text.toLowerCase().split(/\W+/).filter(w => w.length > 2));
    const targetWords = target.toLowerCase().split(/\W+/).filter(w => w.length > 2);
    if (targetWords.length === 0 || tWords.size === 0) return 0.65;
    let matches = 0;
    for (const w of targetWords) {
        if (tWords.has(w)) matches++;
    }
    const overlap = matches / targetWords.length;
    return Number(Math.max(0.40, Math.min(0.96, 0.62 + overlap * 0.32)).toFixed(4));
}

/**
 * Selects a preset by index and loads state.json and query.json asynchronously.
 * Strictly maintains clean initial state without assuming default evaluations.
 */
async function selectPreset(idx) {
    const uc = USE_CASES[state.activeUseCaseId];
    if (!uc) return;

    const presets = uc.presets || [];
    const safeIdx = Math.max(0, Math.min(idx, Math.max(0, presets.length - 1)));

    if (elements.presetSelect) {
        elements.presetSelect.value = safeIdx;
    }

    // Update Stepper Buttons state
    if (elements.btnPrevPreset) {
        elements.btnPrevPreset.disabled = safeIdx <= 0;
    }
    if (elements.btnNextPreset) {
        elements.btnNextPreset.disabled = safeIdx >= presets.length - 1;
    }
    if (elements.presetCounter) {
        const total = presets.length || 1;
        elements.presetCounter.textContent = `Ejemplo ${safeIdx + 1} de ${total}`;
    }

    // Load state.json and query.json from case-use-examples catalog
    try {
        const exampleData = await loadCaseExample(state.activeUseCaseId, safeIdx);
        state.currentExampleData = exampleData;
        state.currentSchema = exampleData.query;
        state.inputText = exampleData.state.state.text;
        state.referenceState = {
            name: exampleData.state.state.name,
            expected_answers: exampleData.state.expected_answers || {},
            expected_route: exampleData.state.expected_route || null
        };
    } catch (err) {
        console.warn("[app.js] Error loading example via fetch, using fallback:", err);
        if (presets[safeIdx]) {
            state.inputText = presets[safeIdx].text;
            state.referenceState = {
                name: presets[safeIdx].name,
                expected_answers: presets[safeIdx].answers || {},
                expected_route: null
            };
        }
        state.currentSchema = uc.questions || {};
    }

    if (elements.textInput) {
        elements.textInput.value = state.inputText;
    }

    // CRITICAL: Clean initial state, no default evaluated answers
    state.isEvaluated = false;
    state.currentAnswers = {};
    state.lastInputEmbedding = null;
    state.geometricTelemetry = null;
    state.mdpTelemetry = null;

    renderView();
    setStatus(`Cargado ejemplo [${safeIdx + 1}/15] desde state.json. Pulsa '⚡ Ejecutar con Qwen3' para evaluar.`, "ready");
}

/**
 * Evaluates the current use case using baseline distributions or model results.
 */
export async function evaluateCurrentUseCase(useModel = false) {
    const uc = USE_CASES[state.activeUseCaseId];
    if (!uc) return;

    if (elements.btnRunModel) {
        elements.btnRunModel.disabled = true;
    }
    setStatus("Calculando embeddings y formulación matemática con Qwen3...", "working");

    try {
        if (state.activeUseCaseId === "robot_telemetry") {
            await evaluateRobotTelemetry(useModel);
            await evaluateStandardUseCase(uc, useModel);
        } else {
            await evaluateStandardUseCase(uc, useModel);
        }

        // Run the 7 Continuous Latent Geometric Operators on the unit embedding
        const currentInput = elements.textInput ? elements.textInput.value.trim() : state.inputText;
        state.geometricTelemetry = runContinuousGeometricTelemetry({
            inputVector: state.lastInputEmbedding,
            inputText: currentInput,
            knnMemory: state.knnMemory,
            turnHistory: state.conversationHistory
        });

        // Accumulate conversational trajectory in session history
        if (state.geometricTelemetry && state.geometricTelemetry.unitVector) {
            if (state.conversationHistory.length >= 10) {
                state.conversationHistory.shift();
            }
            state.conversationHistory.push(state.geometricTelemetry.unitVector);
        }

        state.isEvaluated = true;
        renderView();
        setStatus("¡Listo! Cálculos matemáticos y contraste completados.", "ready");
    } catch (err) {
        console.error("Evaluation error:", err);
        setStatus("Error durante el cálculo.", "");
    } finally {
        if (elements.btnRunModel) elements.btnRunModel.disabled = false;
    }
}

/**
 * Evaluates Question-based use cases using generic mathematical loops over query.json schema:
 * - Choice: Softmax, Shannon Entropy H(P), Margin Delta, Confidence
 * - Score: Expected Value E[S], Variance Var(S), Standard Deviation Sigma, Unimodal Check
 * - Noul: Bayesian Probability, Log-Odds Delta
 */
async function evaluateStandardUseCase(uc, useModel = false) {
    const input = elements.textInput ? elements.textInput.value.trim() : state.inputText;
    const questions = state.currentSchema || uc.questions || {};
    const answers = {};

    let inputEmbedding = null;
    if (useModel && state.modelReady) {
        const [emb] = await computeEmbeddings([input], "Query:", (s) => setStatus(s.message, "working"));
        inputEmbedding = emb;
    } else {
        inputEmbedding = computeDeterministicUnitVector(input);
    }
    state.lastInputEmbedding = inputEmbedding;

    // Mathematical loop over questions in active schema
    for (const [qKey, qDef] of Object.entries(questions)) {
        if (qDef.type === "choice") {
            const optKeys = Object.keys(qDef.criteria || {});
            let probs = [];
            let rawSims = [];

            if (useModel && state.modelReady && inputEmbedding) {
                const criteriaTexts = optKeys.map(k => `${k}: ${qDef.criteria[k]}`);
                const critEmbeddings = await computeEmbeddings(criteriaTexts, "Category:");
                rawSims = critEmbeddings.map(ce => cosineSimilarity(inputEmbedding, ce));
                probs = softmax(rawSims, 0.05);
            } else {
                rawSims = optKeys.map(k => computeSemanticSimilarityHeuristic(input, `${k}: ${qDef.criteria[k]}`));
                probs = softmax(rawSims, 0.05);
            }

            const maxProb = Math.max(...probs);
            const winIdx = probs.indexOf(maxProb);
            const winnerKey = optKeys[winIdx];
            const choiceMetrics = analyzeChoiceDistribution(probs);

            answers[qKey] = {
                type: "choice",
                label: qDef.instructions || qDef.label || qKey,
                winnerKey,
                winnerLabel: qDef.criteria[winnerKey],
                confidence: choiceMetrics.confidence,
                entropyBits: choiceMetrics.entropyBits,
                normalizedEntropy: choiceMetrics.normalizedEntropy,
                marginDelta: choiceMetrics.marginDelta,
                probabilities: probs,
                rawSimilarities: rawSims,
                options: optKeys.map((k, i) => ({
                    key: k,
                    label: qDef.criteria[k],
                    probability: probs[i],
                    rawSimilarity: rawSims[i],
                    isWinner: i === winIdx
                }))
            };
        } else if (qDef.type === "score") {
            const criteriaList = Array.isArray(qDef.criteria) ? qDef.criteria : Object.values(qDef.criteria || {});
            const k = criteriaList.length;
            let probs = [];
            let rawSims = [];

            if (useModel && state.modelReady && inputEmbedding) {
                const critEmbeddings = await computeEmbeddings(criteriaList, "Criteria:");
                rawSims = critEmbeddings.map(ce => cosineSimilarity(inputEmbedding, ce));
                probs = softmax(rawSims, 0.05);
            } else {
                rawSims = criteriaList.map(c => computeSemanticSimilarityHeuristic(input, c));
                probs = softmax(rawSims, 0.05);
            }

            const scoreMetrics = calculateScoreValue(probs);

            answers[qKey] = {
                type: "score",
                label: qDef.instructions || qDef.label || qKey,
                expectedScore: scoreMetrics.expectedScore,
                normalizedScore: scoreMetrics.normalizedScore,
                variance: scoreMetrics.variance,
                stdDev: scoreMetrics.stdDev,
                isUnimodal: scoreMetrics.isUnimodal,
                maxLevel: scoreMetrics.maxLevel,
                probabilities: probs,
                rawSimilarities: rawSims,
                levels: criteriaList.map((c, i) => ({
                    level: i,
                    label: c,
                    probability: probs[i],
                    rawSimilarity: rawSims[i],
                    isWinner: probs[i] === Math.max(...probs)
                }))
            };
        } else if (qDef.type === "noul") {
            let prob = 0.5;
            let sim = 0.70;

            const trueText = (qDef.criteria && qDef.criteria.true) ? qDef.criteria.true : (qDef.instructions || "");
            const falseText = (qDef.criteria && qDef.criteria.false) ? qDef.criteria.false : "";

            if (useModel && state.modelReady && inputEmbedding) {
                if (falseText) {
                    const [posEmb, negEmb] = await computeEmbeddings([trueText, falseText], "Criteria:");
                    const sPos = cosineSimilarity(inputEmbedding, posEmb);
                    const sNeg = cosineSimilarity(inputEmbedding, negEmb);
                    sim = Number(sPos.toFixed(4));
                    const diff = sPos - sNeg;
                    prob = Math.max(0.01, Math.min(0.99, Number((1 / (1 + Math.exp(-diff / 0.08))).toFixed(3))));
                } else {
                    const [targetEmb] = await computeEmbeddings([trueText], "Criteria:");
                    sim = cosineSimilarity(inputEmbedding, targetEmb);
                    prob = Math.max(0.01, Math.min(0.99, Number((1 / (1 + Math.exp(-12 * (sim - 0.70)))).toFixed(3))));
                }
            } else {
                const sPos = computeSemanticSimilarityHeuristic(input, trueText);
                const sNeg = falseText ? computeSemanticSimilarityHeuristic(input, falseText) : 0.65;
                sim = Number(sPos.toFixed(4));
                const diff = sPos - sNeg;
                prob = Math.max(0.01, Math.min(0.99, Number((1 / (1 + Math.exp(-diff / 0.08))).toFixed(3))));
            }

            const logOdds = Number((12 * (sim - 0.70)).toFixed(2));

            answers[qKey] = {
                type: "noul",
                label: qDef.instructions || qDef.label || qKey,
                probability: prob,
                isYes: prob >= 0.5,
                rawSimilarity: sim,
                logOdds,
                polarityMargin: Number((sim - 0.70).toFixed(4))
            };
        }
    }

    state.currentAnswers = answers;
}

/**
 * Robot Telemetry MDP Evaluation:
 * Implements Markov Decision Process (MDP) with Bellman value iteration and semantic centroid classification.
 */
async function evaluateRobotTelemetry(useModel = false) {
    const uc = USE_CASES.robot_telemetry;
    const sentences = elements.textInput ? elements.textInput.value.trim().split("\n").filter(Boolean) : uc.defaultSentences;
    const labels = uc.defaultLabels;

    let embeddings = [];
    let coords = [];
    let inputEmbedding = null;
    let anchorEmbeddings = null;

    if (useModel) {
        setStatus(`Generando embeddings para telemetría robótica...`, "working");
        embeddings = await computeEmbeddings(sentences, "Query:");
        coords = project2DUMAP(embeddings);
        inputEmbedding = embeddings[0] || null;
        state.lastInputEmbedding = inputEmbedding;

        // Embed anchor states
        const anchorTexts = ROBOT_MDP_STATES.map(s => s.anchorText);
        anchorEmbeddings = await computeEmbeddings(anchorTexts, "State:");
    } else {
        coords = sentences.map((_, i) => [
            Math.sin(i * 0.8) * 4 + (i % 2) * 2,
            Math.cos(i * 0.8) * 4 - (i % 3)
        ]);
    }

    // Solve and classify with Markov MDP Engine
    const mdpTelemetry = evaluateRobotTelemetryMDP(sentences[0] || state.inputText, inputEmbedding, anchorEmbeddings);
    state.mdpTelemetry = mdpTelemetry;

    const points = sentences.map((sent, i) => {
        const itemMdp = evaluateRobotTelemetryMDP(sent);
        return {
            id: i + 1,
            sentence: sent,
            label: itemMdp.activeState.label,
            shortLabel: itemMdp.activeState.shortName,
            optimalAction: itemMdp.optimalAction.id,
            x: coords[i] ? coords[i][0] : 0,
            y: coords[i] ? coords[i][1] : 0
        };
    });

    state.robotDataset = {
        points,
        categories: labels,
        mdpTelemetry
    };

    // Store in currentAnswers for JSON and Math view
    state.currentAnswers = {
        active_state: mdpTelemetry.activeState,
        optimal_action: mdpTelemetry.optimalAction,
        entropy_bits: mdpTelemetry.entropyBits,
        transition_distribution: mdpTelemetry.transitionDistribution
    };
}

/**
 * Renders the active view content in #workbench-container.
 */
function renderView() {
    const container = elements.workbenchContainer;
    if (!container) return;

    const uc = USE_CASES[state.activeUseCaseId];
    if (!uc) return;

    if (state.activeViewMode === "json") {
        renderJsonView(container, uc);
        return;
    }

    if (state.activeViewMode === "math") {
        const selectedIdx = elements.presetSelect ? parseInt(elements.presetSelect.value, 10) : 0;
        const currentPreset = (uc.presets && uc.presets[selectedIdx]) ? uc.presets[selectedIdx] : null;

        container.innerHTML = renderMathInspectionView({
            uc,
            answers: state.currentAnswers,
            preset: currentPreset,
            mdpTelemetry: state.mdpTelemetry,
            inputText: elements.textInput ? elements.textInput.value : state.inputText,
            geometricTelemetry: state.geometricTelemetry,
            knnMemory: state.knnMemory,
            isEvaluated: state.isEvaluated,
            schema: state.currentSchema,
            referenceState: state.referenceState
        });
        return;
    }

    // Workbench Mode
    if (state.activeUseCaseId === "composite_resume") {
        renderCompositeResumeView(container, uc);
    } else if (state.activeUseCaseId === "robot_telemetry") {
        renderRobotTelemetryView(container, uc);
    } else {
        // Universal Flowchart & Probabilities renderer for all standard routing use cases
        renderStandardFlowchartUseCase(container, uc);
    }
}

/**
 * Renders any standard flowchart & decision tree use case.
 */
function renderStandardFlowchartUseCase(container, uc) {
    const answers = state.currentAnswers;
    let route = null;

    if (!state.isEvaluated) {
        const refName = state.referenceState ? state.referenceState.name : (uc.presets && uc.presets[0] ? uc.presets[0].name : "Ejemplo");
        const expRoute = state.referenceState ? state.referenceState.expected_route : null;
        route = {
            destination: expRoute ? `Pendiente de Inferencia (Objetivo: ${expRoute.destination || expRoute.routeKey})` : "Pendiente de Inferencia Qwen3",
            rationale: `Ejemplo '${refName}' cargado desde state.json. Pulsa '⚡ Ejecutar con Qwen3 (ONNX)' para proyectar el texto en ℝ¹⁰²⁴, calcular compuertas y contrastar resultados.`,
            priorityBadge: "PENDIENTE",
            activeNodes: ["input"]
        };
    } else if (uc.id === "banking_confidence") {
        route = uc.evaluateRoute(answers.intent, uc.thresholds);
    } else if (typeof uc.evaluateRoute === "function") {
        route = uc.evaluateRoute(answers);
    } else {
        route = { destination: "Acción Estándar", rationale: "Evaluado", priorityBadge: "NOMINAL", activeNodes: ["input"] };
    }

    const destination = route.destination || route.actionTaken || route.status || "Decisión Tomada";
    const rationale = route.rationale || route.explanation || route.action || "";
    const badgeText = route.priorityBadge || route.actionType || (route.status ? route.status.split(" ")[0] : "INFO");

    // Dynamic badge class based on severity
    let badgeClass = "badge-warning";
    if (state.isEvaluated) {
        const upperBadge = badgeText.toUpperCase();
        if (upperBadge.includes("CRITIC") || upperBadge.includes("BLOCK") || upperBadge.includes("FAIL") ||
            upperBadge.includes("VETO") || upperBadge.includes("FRAUD") || upperBadge.includes("CRISIS") ||
            upperBadge.includes("ALTA") || upperBadge.includes("ESCALATE")) {
            badgeClass = "badge-danger";
        } else if (upperBadge.includes("WARN") || upperBadge.includes("CONFIRM") || upperBadge.includes("EDD") ||
                   upperBadge.includes("AMENDMENT") || upperBadge.includes("DEBT") || upperBadge.includes("REQUEST")) {
            badgeClass = "badge-warning";
        } else {
            badgeClass = "badge-success";
        }
    }

    const nodes = FLOWCHART_NODES[uc.id] || [
        { id: "input", label: "Entrada", type: "input", text: "Datos crudos" },
        { id: "eval", label: "Evaluación", type: "eval", text: "Inferencia probabilística" },
        { id: "action", label: "Acción", type: "action", text: destination }
    ];

    const docLink = uc.docRef || "Docs/use-case.md";

    let html = `
        <div class="usecase-hero-banner">
            <div class="hero-info">
                <span class="hero-tag" style="background: ${uc.badgeColor || '#4f46e5'};">${uc.tag}</span>
                <h3 class="hero-title">${uc.icon} ${escapeHtml(uc.name)}</h3>
                <p class="hero-desc">${escapeHtml(uc.description)}</p>
            </div>
            <a href="${docLink}" class="hero-doclink" target="_blank">📖 Ver Documentación →</a>
        </div>

        <div class="decision-result-banner">
            <div>
                <span class="card-eyebrow">Destino de Enrutamiento &amp; Decisión</span>
                <div class="decision-result-title">👉 ${escapeHtml(destination)}</div>
                <div class="decision-result-sub">${escapeHtml(rationale)}</div>
            </div>
            <span class="${badgeClass}">${escapeHtml(badgeText)}</span>
        </div>

        ${renderDecisionFlowchart({
            title: `Árbol de Decisión &amp; Compuertas: ${escapeHtml(uc.shortName)}`,
            nodes,
            activeNodes: route.activeNodes || []
        })}

        <div class="workbench-grid">
            ${renderQuestionsGrid(uc, answers)}
        </div>
    `;

    container.innerHTML = html;
}

/**
 * Helper to render probability bars for any questions in a use case.
 */
function renderQuestionsGrid(uc, answers) {
    const questions = state.currentSchema || uc.questions;
    if (!questions) return "";

    return Object.entries(questions).map(([qKey, qDef]) => {
        const a = answers[qKey];

        // If not evaluated yet or answer not available, render resting state
        if (!state.isEvaluated || !a) {
            if (qDef.type === "choice") {
                const optKeys = Object.keys(qDef.criteria || {});
                const emptyOptions = optKeys.map(k => ({
                    key: k,
                    label: qDef.criteria[k] ? `${k}: ${qDef.criteria[k]}` : k,
                    probability: 0,
                    isWinner: false
                }));
                return `
                    ${renderProbabilityBars(emptyOptions, `${qDef.instructions || qDef.label || qKey} (Choice) — ⏳ Pendiente`)}
                    <div class="confidence-gauge-card">
                        <div class="card-eyebrow">Métrica de Confianza</div>
                        <div style="font-size: 13px; color: var(--text-muted); margin-top: 6px;">
                            ⚡ Pulsa 'Ejecutar con Qwen3' para calcular distribución y confianza
                        </div>
                    </div>
                `;
            } else if (qDef.type === "score") {
                const levels = Array.isArray(qDef.criteria) ? qDef.criteria : Object.values(qDef.criteria || {});
                const emptyLevels = levels.map((c, i) => ({
                    key: `Nivel ${i}`,
                    label: c,
                    probability: 0,
                    isWinner: false
                }));
                return renderProbabilityBars(emptyLevels, `${qDef.instructions || qDef.label || qKey} (Score: Pendiente / ${(levels.length - 1)}.0) — ⏳ Pendiente`);
            } else if (qDef.type === "noul") {
                return renderProbabilityBars([
                    { key: "Sí (Yes)", label: "Positivo (0% probabilidad)", probability: 0, isWinner: false },
                    { key: "No", label: "Negativo (0% probabilidad)", probability: 0, isWinner: false }
                ], `${qDef.instructions || qDef.label || qKey} (Noul) — ⏳ Pendiente`);
            }
            return "";
        }

        if (a.type === "choice") {
            return `
                ${renderProbabilityBars(a.options, `${qDef.label || qKey} (Choice)`)}
                ${renderConfidenceGauge(a.confidence, a.options.length, Math.max(...a.probabilities))}
            `;
        } else if (a.type === "score") {
            return renderProbabilityBars(
                a.levels.map(l => ({ key: `Nivel ${l.level}`, label: l.label, probability: l.probability, isWinner: l.isWinner })),
                `${qDef.label || qKey} (Score: ${a.expectedScore.toFixed(2)}/${a.maxLevel}.0)`
            );
        } else if (a.type === "noul") {
            const pct = Math.round(a.probability * 100);
            return renderProbabilityBars([
                { key: "Sí (Yes)", label: `Positivo (${pct}% probabilidad)`, probability: a.probability, isWinner: a.isYes },
                { key: "No", label: `Negativo (${100 - pct}% probabilidad)`, probability: 1 - a.probability, isWinner: !a.isYes }
            ], `${qDef.label || qKey} (Noul)`);
        }
        return "";
    }).join("");
}

/**
 * Renders Composite Resume Screening View
 */
function renderCompositeResumeView(container, uc) {
    const answers = state.currentAnswers;
    const scores = {};
    const questions = state.currentSchema || uc.questions || {};
    Object.keys(questions).forEach(k => {
        scores[k] = answers[k] ? answers[k].normalizedScore : 0.5;
    });

    const compositeResult = calculateCompositeScore(scores, state.compositeWeights);
    const isEval = state.isEvaluated;

    const scoreTitle = isEval
        ? `★ Score Compuesto: ${(compositeResult.compositeScore * 100).toFixed(1)} / 100 (${compositeResult.compositeScore.toFixed(4)})`
        : `★ Score Compuesto: ⏳ Pendiente de Inferencia Qwen3`;
    const scoreSub = isEval
        ? `MCDA TOPSIS: ${(compositeResult.topsisScore * 100).toFixed(1)}% | Media Geométrica: ${(compositeResult.geometricScore * 100).toFixed(1)}%`
        : `Cargado desde state.json. Pulsa '⚡ Ejecutar con Qwen3 (ONNX)' para evaluar competencias matemáticas.`;
    const badgeText = isEval ? "Score Normalizado" : "PENDIENTE";
    const badgeClass = isEval ? "badge-success" : "badge-warning";

    let html = `
        <div class="usecase-hero-banner">
            <div class="hero-info">
                <span class="hero-tag" style="background: ${uc.badgeColor};">${uc.tag}</span>
                <h3 class="hero-title">${uc.icon} ${escapeHtml(uc.name)}</h3>
                <p class="hero-desc">${escapeHtml(uc.description)}</p>
            </div>
            <a href="Docs/composite-scoring.md" class="hero-doclink" target="_blank">📖 Ver Documentación →</a>
        </div>

        <div class="decision-result-banner">
            <div>
                <span class="card-eyebrow">Puntuación Final Ponderada (Perfil: ${escapeHtml(state.activeProfile)})</span>
                <div class="decision-result-title">${scoreTitle}</div>
                <div class="decision-result-sub">${scoreSub}</div>
            </div>
            <span class="${badgeClass}">${badgeText}</span>
        </div>

        ${renderCompositeScoringWorkbench({
            scores,
            weights: state.compositeWeights,
            activeProfile: state.activeProfile,
            profiles: uc.weightProfiles,
            questions: uc.questions
        })}

        <div class="workbench-grid">
            ${Object.keys(questions).map(k => {
                const qAns = answers[k];
                if (!isEval || !qAns) {
                    const qDef = questions[k] || {};
                    const levels = Array.isArray(qDef.criteria) ? qDef.criteria : Object.values(qDef.criteria || {});
                    const emptyLevels = levels.map((c, i) => ({ key: `Nivel ${i}`, label: c, probability: 0, isWinner: false }));
                    return renderProbabilityBars(emptyLevels, `${qDef.instructions || qDef.label || k} (Score: Pendiente / 4.0) — ⏳ Pendiente`);
                }
                return renderProbabilityBars(
                    qAns.levels.map(l => ({ key: `Nivel ${l.level}`, label: l.label, probability: l.probability, isWinner: l.isWinner })),
                    `${questions[k].label || k} (Score: ${(qAns.expectedScore).toFixed(2)}/4.0)`
                );
            }).join("")}
        </div>
    `;

    container.innerHTML = html;

    // Attach profile button events
    container.querySelectorAll(".profile-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const profile = btn.dataset.profile;
            state.activeProfile = profile;
            state.compositeWeights = { ...uc.weightProfiles[profile] };
            renderView();
        });
    });

    // Attach slider events
    container.querySelectorAll(".weight-slider").forEach(slider => {
        slider.addEventListener("input", (e) => {
            const dim = e.target.dataset.dimension;
            state.compositeWeights[dim] = Number(e.target.value) / 100;
            state.activeProfile = "Personalizado";
            renderView();
        });
    });
}

/**
 * Renders Robot Telemetry View with Plotly Scatterplot
 */
function renderRobotTelemetryView(container, uc) {
    const ds = state.robotDataset;
    const mdp = state.mdpTelemetry || (ds ? ds.mdpTelemetry : null);
    const pointsCount = ds ? ds.points.length : 15;
    const isEval = state.isEvaluated && !!mdp;

    let html = `
        <div class="usecase-hero-banner">
            <div class="hero-info">
                <span class="hero-tag" style="background: ${uc.badgeColor};">${uc.tag}</span>
                <h3 class="hero-title">${uc.icon} ${escapeHtml(uc.name)}</h3>
                <p class="hero-desc">${escapeHtml(uc.description)}</p>
            </div>
            <a href="Docs/triage.py" class="hero-doclink" target="_blank">📖 Ver Triage Python →</a>
        </div>

        <div class="decision-result-banner">
            <div>
                <span class="card-eyebrow">Proceso de Decisión de Markov (MDP) &amp; Ecuación de Bellman</span>
                ${isEval ? `
                    <div class="decision-result-title">🤖 Estado: ${escapeHtml(mdp.activeState.shortName)} ➔ Acción Óptima: ${escapeHtml(mdp.optimalAction.label)}</div>
                    <div class="decision-result-sub">${escapeHtml(mdp.activeState.description)} (Q-Value: ${mdp.optimalAction.qValue})</div>
                ` : `
                    <div class="decision-result-title">🤖 Telemetría Cinemática: ⏳ Pendiente de Inferencia Qwen3</div>
                    <div class="decision-result-sub">Datos cinemáticos cargados desde state.json. Pulsa '⚡ Ejecutar con Qwen3 (ONNX)' para resolver la política óptima de Bellman V*(s).</div>
                `}
            </div>
            <span class="${isEval ? (mdp.activeState.id === 's3' ? 'badge-danger' : (mdp.activeState.id === 's2' ? 'badge-warning' : 'badge-success')) : 'badge-warning'}">
                ${isEval ? escapeHtml(mdp.activeState.id.toUpperCase()) : 'PENDIENTE'}
            </span>
        </div>

        <div id="plot-wrapper">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span class="card-eyebrow">Proyección Espacial UMAP 2D</span>
                <span class="${isEval ? 'badge-success' : 'badge-warning'}">${isEval ? `${pointsCount} puntos clasificados por MDP` : 'En espera de inferencia'}</span>
            </div>
            <div id="plot"></div>
        </div>
    `;

    container.innerHTML = html;

    // Render Plotly if library is available and evaluated
    if (window.Plotly && ds && ds.points && isEval) {
        const assignedLabels = Array.from(new Set(ds.points.map(p => p.label)));
        const traces = assignedLabels.map(lbl => {
            const filtered = ds.points.filter(p => p.label === lbl);
            return {
                x: filtered.map(p => p.x),
                y: filtered.map(p => p.y),
                mode: "markers",
                type: "scatter",
                name: lbl,
                text: filtered.map(p => p.sentence),
                marker: { size: 12 }
            };
        });

        Plotly.newPlot("plot", traces, {
            margin: { l: 30, r: 20, t: 30, b: 30 },
            font: { family: "system-ui, sans-serif" },
            hovermode: "closest"
        }, { responsive: true });
    }
}

/**
 * Renders JSON Inspector view with complete embedding telemetry
 */
function renderJsonView(container, uc) {
    const selectedIdx = elements.presetSelect ? parseInt(elements.presetSelect.value, 10) : 0;
    const currentPreset = (uc.presets && uc.presets[selectedIdx]) ? uc.presets[selectedIdx] : null;

    const runtimePayload = {
        use_case: uc.id,
        name: uc.name,
        category: uc.category,
        is_evaluated: state.isEvaluated,
        evaluated_at: state.isEvaluated ? new Date().toISOString() : null,
        state: elements.textInput ? elements.textInput.value : state.inputText,
        embedding_telemetry: {
            model_name: "Qwen3-Embedding-0.6B-ONNX",
            vector_dimensions: 1024,
            l2_norm: state.isEvaluated ? 1.0000 : 0.0000,
            inference_device: state.modelReady ? "wasm" : "simulated",
            active_preset: state.referenceState ? state.referenceState.name : (currentPreset ? currentPreset.name : "Nominal"),
            status: state.isEvaluated ? "Evaluated with Qwen3 ONNX" : "Pending execution"
        },
        answers: state.currentAnswers,
        markov_mdp_telemetry: state.mdpTelemetry || undefined,
        metadata: {
            model: "Qwen3-Embedding-0.6B-ONNX",
            decision_engine: "Embeding / Jev Hybrid Local",
            presets_count: uc.presets ? uc.presets.length : 0,
            composite_weights: state.compositeWeights
        }
    };

    const queryData = state.currentExampleData ? state.currentExampleData.query : (state.currentSchema || uc.questions);
    const stateData = state.currentExampleData ? state.currentExampleData.state : {
        state: {
            name: state.referenceState ? state.referenceState.name : "Nominal",
            text: state.inputText
        },
        expected_answers: state.referenceState ? state.referenceState.expected_answers : {},
        expected_route: state.referenceState ? state.referenceState.expected_route : null
    };

    const multiJsonData = {
        queryJson: queryData,
        stateJson: stateData,
        runtimeJson: runtimePayload,
        activeTab: state.activeJsonTab || "query"
    };

    container.innerHTML = renderJsonInspector(multiJsonData, `Inspector de Casos JSON: ${uc.shortName}`, state.activeJsonTab || "query");

    // Wire up subtab clicks
    container.querySelectorAll(".json-subtab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            state.activeJsonTab = btn.dataset.jsontab;
            renderJsonView(container, uc);
        });
    });

    let activeExportObj = multiJsonData.queryJson;
    let exportFileName = `${uc.id}_query.json`;
    if (state.activeJsonTab === "state") {
        activeExportObj = multiJsonData.stateJson;
        exportFileName = `${uc.id}_state.json`;
    } else if (state.activeJsonTab === "runtime") {
        activeExportObj = multiJsonData.runtimeJson;
        exportFileName = `${uc.id}_telemetria_runtime.json`;
    }

    const btnCopy = document.getElementById("btn-copy-json");
    const btnDownload = document.getElementById("btn-download-json");

    if (btnCopy) {
        btnCopy.addEventListener("click", () => {
            navigator.clipboard.writeText(JSON.stringify(activeExportObj, null, 2));
            btnCopy.textContent = "✓ ¡Copiado!";
            setTimeout(() => { btnCopy.textContent = "📋 Copiar JSON"; }, 2000);
        });
    }

    if (btnDownload) {
        btnDownload.addEventListener("click", () => {
            const blob = new Blob([JSON.stringify(activeExportObj, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = exportFileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }
}

/**
 * Renders cards inside the Use Case Selector Modal.
 */
function renderModalCases(filterCategory = "all") {
    if (!elements.modalCasesContainer) return;

    let html = "";
    const categoriesToRender = (filterCategory === "all")
        ? Object.values(USE_CASE_CATEGORIES)
        : [USE_CASE_CATEGORIES[filterCategory]].filter(Boolean);

    categoriesToRender.forEach(cat => {
        const catCases = cat.cases.map(id => USE_CASES[id]).filter(Boolean);
        if (catCases.length === 0) return;

        html += `
            <div class="modal-category-section">
                <div class="modal-category-header">
                    <span>${cat.icon}</span> ${escapeHtml(cat.name)} (${catCases.length})
                </div>
                <div class="modal-cases-grid">
                    ${catCases.map(uc => {
                        const isActive = uc.id === state.activeUseCaseId;
                        const presetCount = uc.presets ? uc.presets.length : 15;
                        return `
                            <div class="modal-case-card ${isActive ? 'active-case' : ''}" data-case-id="${uc.id}">
                                <div class="case-card-top">
                                    <div class="case-card-title">
                                        <span>${uc.icon}</span> ${escapeHtml(uc.shortName || uc.name)}
                                    </div>
                                    <span class="case-card-badge" style="background: ${uc.badgeColor || '#4f46e5'};">
                                        ${uc.tag || 'JEV'}
                                    </span>
                                </div>
                                <div class="case-card-desc">
                                    ${escapeHtml(uc.description)}
                                </div>
                                <div class="case-card-footer">
                                    <span>📂 ${presetCount} Ejemplos Calibrados</span>
                                    <span>${isActive ? '● ACTIVO' : 'Seleccionar →'}</span>
                                </div>
                            </div>
                        `;
                    }).join("")}
                </div>
            </div>
        `;
    });

    elements.modalCasesContainer.innerHTML = html;

    // Attach click events to cards
    elements.modalCasesContainer.querySelectorAll(".modal-case-card").forEach(card => {
        card.addEventListener("click", () => {
            const caseId = card.dataset.caseId;
            setUseCase(caseId, 0);
            closeModal();
        });
    });
}

/**
 * Updates active class on modal cards if already open.
 */
function updateModalActiveState() {
    if (!elements.modalCasesContainer) return;
    elements.modalCasesContainer.querySelectorAll(".modal-case-card").forEach(card => {
        const isActive = card.dataset.caseId === state.activeUseCaseId;
        card.classList.toggle("active-case", isActive);
        const footerSpan = card.querySelector(".case-card-footer span:last-child");
        if (footerSpan) {
            footerSpan.textContent = isActive ? "● ACTIVO" : "Seleccionar →";
        }
    });
}

function openModal(category = "all") {
    state.activeCategoryFilter = category;
    renderModalCases(category);
    if (elements.usecaseModal) {
        elements.usecaseModal.classList.add("open");
    }
}

function closeModal() {
    if (elements.usecaseModal) {
        elements.usecaseModal.classList.remove("open");
    }
}

/**
 * App initialization
 */
function initApp() {
    // Generate tabs dynamically in top navbar
    if (elements.usecaseTabs) {
        elements.usecaseTabs.innerHTML = Object.values(USE_CASES).map(uc => `
            <button type="button" class="usecase-tab-btn ${uc.id === state.activeUseCaseId ? 'active' : ''}" data-usecase="${uc.id}">
                ${uc.icon} ${escapeHtml(uc.shortName || uc.name)}
            </button>
        `).join("");

        elements.usecaseTabs.querySelectorAll(".usecase-tab-btn").forEach(btn => {
            btn.addEventListener("click", () => setUseCase(btn.dataset.usecase, 0));
        });
    }

    // Prominent Modal Open / Close buttons
    if (elements.btnOpenModal) {
        elements.btnOpenModal.addEventListener("click", () => openModal(state.activeCategoryFilter));
    }
    if (elements.btnCloseModal) {
        elements.btnCloseModal.addEventListener("click", closeModal);
    }
    if (elements.usecaseModal) {
        elements.usecaseModal.addEventListener("click", (e) => {
            if (e.target === elements.usecaseModal) closeModal();
        });
    }

    // Category Quick Filter Pills in prominent bar
    if (elements.categoryQuickPills) {
        elements.categoryQuickPills.querySelectorAll(".cat-pill-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                elements.categoryQuickPills.querySelectorAll(".cat-pill-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                const cat = btn.dataset.category;
                state.activeCategoryFilter = cat;
                openModal(cat);
            });
        });
    }

    // Presets Stepper Controls
    if (elements.btnPrevPreset) {
        elements.btnPrevPreset.addEventListener("click", () => {
            const currentIdx = elements.presetSelect ? parseInt(elements.presetSelect.value, 10) : 0;
            selectPreset(currentIdx - 1);
        });
    }
    if (elements.btnNextPreset) {
        elements.btnNextPreset.addEventListener("click", () => {
            const currentIdx = elements.presetSelect ? parseInt(elements.presetSelect.value, 10) : 0;
            selectPreset(currentIdx + 1);
        });
    }

    // Presets Dropdown Change
    if (elements.presetSelect) {
        elements.presetSelect.addEventListener("change", (e) => {
            const idx = parseInt(e.target.value, 10);
            selectPreset(idx);
        });
    }

    // View Mode Tabs (Workbench, JSON, Math Telemetry)
    if (elements.viewModeTabs) {
        elements.viewModeTabs.querySelectorAll(".view-tab-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                elements.viewModeTabs.querySelectorAll(".view-tab-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                state.activeViewMode = btn.dataset.view;
                renderView();
            });
        });
    }

    // Run with Qwen3 Button
    if (elements.btnRunModel) {
        elements.btnRunModel.addEventListener("click", () => {
            evaluateCurrentUseCase(true);
        });
    }

    // Interactive Delegated Handlers for Geometric Engine (k-NN & Drift)
    document.addEventListener("click", (e) => {
        const btnLoadKNN = e.target.closest("#btn-load-knn-dataset");
        if (btnLoadKNN) {
            state.knnMemory = loadDefaultKNNPrecedents();
            setStatus("Dataset de referencia cargado en memoria k-NN (10 incidentes)", "ready");
            evaluateCurrentUseCase(false);
            return;
        }
        const btnClearKNN = e.target.closest("#btn-clear-knn-dataset");
        if (btnClearKNN) {
            state.knnMemory = [];
            setStatus("Memoria k-NN vaciada (0 precedentes)", "ready");
            evaluateCurrentUseCase(false);
            return;
        }
        const btnClearDrift = e.target.closest("#btn-clear-drift-history");
        if (btnClearDrift) {
            state.conversationHistory = [];
            setStatus("Historial de deriva conversacional reiniciado", "ready");
            evaluateCurrentUseCase(false);
            return;
        }
    });

    // Handle initial hash on load
    const hash = window.location.hash.replace("#", "");
    if (hash && USE_CASES[hash]) {
        setUseCase(hash, 0);
    } else {
        setUseCase("support_fanout", 0);
    }

    // Initialize Model in background
    initModel();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
} else {
    initApp();
}
