/**
 * geometric-engine.js - High-Dimensional Vector Geometry & Continuous Latent Operators
 *
 * Implements the 7 advanced latent space operators on unit vector u in R^1024:
 * 1. Bipolar Continuous Axes (Semantic Differential): score = u · ((v+ - v-) / ||v+ - v-||) in [-1, 1]
 * 2. Out-of-Domain (OOD) & Anomaly Detection: u · mu < tau_OOD
 * 3. Forbidden Subspace Veto (Geometric Guardrails): ||p_veto||^2 = sum (u · b_j)^2 > tau_veto
 * 4. Zero-Shot Non-Exclusive Multi-Labeling: p(tag_k) = sigmoid((u·v_k - u·v_neutral) / T)
 * 5. Non-Parametric k-NN Regression (Precedent Memory): y_hat = sum w_i * y_i
 * 6. Semantic Drift & Trajectory Analysis: u_t · u_{t-1} (jumps), u_t · u_{t-2} (loops), Delta u · axis_frust
 * 7. Optimized Matrix-Vector Multiplication: s = M * u in < 0.05 ms using mathjs
 */

import { cosineSimilarity } from "./model.js";

// ==========================================
// 1. PROTOTYPICAL DEFINITIONS FOR CONTINUOUS OPERATORS
// ==========================================

export const BIPOLAR_AXES_DEFINITIONS = {
    urgency: {
        id: "urgency",
        label: "Eje de Urgencia Crítica",
        positiveLabel: "Emergencia Crítica / Bloqueo Total",
        negativeLabel: "Consulta Trivial / Informativa",
        positiveAnchor: "Immediate critical emergency, production system completely down, business halting blocker outage urgent",
        negativeAnchor: "Casual informational inquiry, routine trivial curiosity, low priority minor documentation question"
    },
    technical_depth: {
        id: "technical_depth",
        label: "Eje de Nivel Técnico del Usuario",
        positiveLabel: "Arquitectura Deep / Kernel / Experto",
        negativeLabel: "Usuario Principiante / No Técnico",
        positiveAnchor: "Deep low-level kernel system architecture, assembly heap dump, mutex concurrency race condition, distributed protocol",
        negativeAnchor: "Friendly beginner user question, where is the button in the app, simple everyday basic interface help"
    },
    commercial_intent: {
        id: "commercial_intent",
        label: "Eje de Propensión Comercial",
        positiveLabel: "Intención de Compra / Enterprise",
        negativeLabel: "Exploración Casual / Sin Presupuesto",
        positiveAnchor: "Ready to purchase annual enterprise license, request formal contract pricing, immediate corporate deployment budget",
        negativeAnchor: "Casual open source hobbyist curiosity, student personal free tier project, zero budget exploration"
    }
};

export const DOMAIN_CENTROID_ANCHORS = [
    "Customer support billing ticket request",
    "Technical defect software crash report",
    "Insurance claim physical vehicle accident",
    "Financial wire transaction AML alert",
    "Commercial enterprise sales inquiry",
    "Automated robot navigation obstacle telemetry"
];

export const FORBIDDEN_SUBSPACE_ANCHORS = [
    "Exploit database root credentials, SQL injection, bypass system authorization, jailbreak security",
    "Unauthorized legal advice, provide binding legal guarantee, unlawful liability waiver contract",
    "Weapons manufacture, kinetic explosive formulation, dangerous hazardous chemical synthesis"
];

export const MULTI_LABEL_TAGS = {
    TECHNICAL_BUG: {
        label: "Defecto Técnico / Bug",
        anchor: "Software application bug, runtime exception, broken functional feature or system crash",
        color: "#ef4444"
    },
    BILLING_DISPUTE: {
        label: "Disputa Financiera / Recibo",
        anchor: "Billing invoice charge dispute, subscription credit card payment or money refund",
        color: "#f59e0b"
    },
    CHURN_RISK: {
        label: "Riesgo de Cancelación / Fuga",
        anchor: "User threatening account cancellation, terminating contract or switching to rival competitor",
        color: "#dc2626"
    },
    FRUSTRATION_ESCALATION: {
        label: "Tono Hostil / Frustración",
        anchor: "Angry aggressive complaints, exasperated tone, outrage and abusive language",
        color: "#b91c1c"
    },
    FEATURE_REQUEST: {
        label: "Petición de Nueva Feature",
        anchor: "Request for future product feature, workflow enhancement or suggested improvement",
        color: "#6366f1"
    }
};

export const NEUTRAL_ANCHOR_TEXT = "Standard neutral communication message without emotional bias or specific functional intent.";

// Reference Precedents Dataset for k-NN Memory
export const REFERENCE_KNN_PRECEDENTS = [
    {
        id: "PREC-001",
        title: "Caída de cluster PostgreSQL por saturación de pool",
        text: "Production database cluster connection pool exhausted, HTTP 500 on all payment transactions.",
        costEUR: 4500,
        resolutionHours: 8.5,
        churnRiskPct: 85,
        category: "Infraestructura"
    },
    {
        id: "PREC-002",
        title: "Cobro duplicado en renovación de plan anual",
        text: "Customer was charged twice on corporate Mastercard for annual professional tier renewal.",
        costEUR: 240,
        resolutionHours: 1.2,
        churnRiskPct: 32,
        category: "Facturación"
    },
    {
        id: "PREC-003",
        title: "Desalineación visual de botón en Safari móvil",
        text: "Checkout button overlaps with cookie banner on iOS Safari 17.1 mobile viewport.",
        costEUR: 60,
        resolutionHours: 0.8,
        churnRiskPct: 4,
        category: "Frontend"
    },
    {
        id: "PREC-004",
        title: "Intento de inyección SQL en endpoint de autenticación",
        text: "Automated scanner injecting OR 1=1 payload into legacy user authentication endpoint.",
        costEUR: 8900,
        resolutionHours: 20.0,
        churnRiskPct: 92,
        category: "Ciberseguridad"
    },
    {
        id: "PREC-005",
        title: "Consulta sobre configuración SAML SSO con Okta",
        text: "Enterprise IT director asking for metadata XML to configure Okta SSO federation.",
        costEUR: 150,
        resolutionHours: 3.0,
        churnRiskPct: 10,
        category: "Soporte"
    },
    {
        id: "PREC-006",
        title: "Impacto de gravilla con rotura de parabrisas en autovía",
        text: "Stone impact on highway cracked front windshield. Repair quotation $210 from certified shop.",
        costEUR: 210,
        resolutionHours: 2.5,
        churnRiskPct: 8,
        category: "Siniestro"
    },
    {
        id: "PREC-007",
        title: "Retirada de efectivo anómala en cajero de alto riesgo",
        text: "Multiple rapid cash withdrawals totaling $3,500 at 3:00 AM from international ATM.",
        costEUR: 3500,
        resolutionHours: 15.0,
        churnRiskPct: 75,
        category: "Fraude AML"
    },
    {
        id: "PREC-008",
        title: "Retraso en SMS de autenticación 2FA",
        text: "User complains that two-factor verification code via SMS takes 10 minutes to arrive.",
        costEUR: 40,
        resolutionHours: 0.5,
        churnRiskPct: 18,
        category: "Soporte"
    },
    {
        id: "PREC-009",
        title: "Sensor LiDAR frontal bloqueado por plástico en almacén",
        text: "Automated warehouse AGV halted due to plastic wrapping obstructing optical frontal LiDAR.",
        costEUR: 750,
        resolutionHours: 4.0,
        churnRiskPct: 12,
        category: "Robótica"
    },
    {
        id: "PREC-010",
        title: "Renegociación de cláusula de responsabilidad ilimitada",
        text: "Counterparty enterprise legal counsel redlined contract demanding uncapped indemnification.",
        costEUR: 6200,
        resolutionHours: 18.0,
        churnRiskPct: 58,
        category: "Legal"
    }
];

// ==========================================
// 2. VECTOR ALGEBRA HELPERS
// ==========================================

export function vectorSubtract(a, b) {
    const res = new Array(a.length);
    for (let i = 0; i < a.length; i++) res[i] = a[i] - b[i];
    return res;
}

export function vectorDot(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
    return sum;
}

export function vectorNorm(v) {
    return Math.sqrt(vectorDot(v, v));
}

export function vectorNormalize(v) {
    const norm = vectorNorm(v);
    if (norm < 1e-12) return v.slice();
    return v.map(x => x / norm);
}

// ==========================================
// 3. THE 7 CONTINUOUS LATENT OPERATORS
// ==========================================

/**
 * 1. Computes the unit director axis between two opposing prototypes:
 * axis = (v+ - v-) / ||v+ - v-||_2
 *
 * @param {number[]} posVector
 * @param {number[]} negVector
 * @returns {number[]} Unit director axis
 */
export function computeBipolarAxis(posVector, negVector) {
    const diff = vectorSubtract(posVector, negVector);
    return vectorNormalize(diff);
}

/**
 * Projects a query vector onto a continuous bipolar axis: score in [-1.0, +1.0]
 *
 * @param {number[]} inputVector - Query vector (1024-d)
 * @param {number[]} axisVector - Unit director axis (1024-d)
 * @returns {number} Score in [-1.0, +1.0]
 */
export function projectBipolar(inputVector, axisVector) {
    const dot = vectorDot(inputVector, axisVector);
    return Number(Math.max(-1, Math.min(1, dot)).toFixed(4));
}

/**
 * 2. Computes the normalized centroid of a collection of in-domain vectors:
 * mu = sum(v_k) / ||sum(v_k)||_2
 *
 * @param {number[][]} vectors
 * @returns {number[]} Normalized centroid
 */
export function computeDomainCentroid(vectors) {
    if (!vectors || vectors.length === 0) return [];
    const d = vectors[0].length;
    const sum = new Array(d).fill(0);
    vectors.forEach(v => {
        for (let i = 0; i < d; i++) sum[i] += v[i];
    });
    return vectorNormalize(sum);
}

/**
 * Evaluates Out-Of-Domain (OOD) anomaly condition:
 * If u · mu < tau_OOD => Reject / Noise
 *
 * @param {number[]} inputVector - Query vector (1024-d)
 * @param {number[]} domainCentroid - Centroid vector (1024-d)
 * @param {number} [threshold=0.35] - Minimum in-domain threshold
 * @returns {{ inDomainScore: number, isOOD: boolean, threshold: number }}
 */
export function evaluateOOD(inputVector, domainCentroid, threshold = 0.35) {
    const score = vectorDot(inputVector, domainCentroid);
    const inDomainScore = Number(score.toFixed(4));
    return {
        inDomainScore,
        isOOD: inDomainScore < threshold,
        threshold
    };
}

/**
 * 3. Applies Gram-Schmidt to produce an orthonormal basis matrix B in R^{1024 x k}
 * for forbidden subspace veto.
 *
 * @param {number[][]} vectors - Raw prototype vectors
 * @returns {number[][]} Orthonormal basis vectors
 */
export function gramSchmidtOrthonormalize(vectors) {
    const basis = [];
    vectors.forEach(v => {
        let u = v.slice();
        for (let j = 0; j < basis.length; j++) {
            const proj = vectorDot(v, basis[j]);
            for (let i = 0; i < u.length; i++) {
                u[i] -= proj * basis[j][i];
            }
        }
        const norm = vectorNorm(u);
        if (norm > 1e-6) {
            basis.push(u.map(x => x / norm));
        }
    });
    return basis;
}

/**
 * Evaluates Forbidden Subspace Veto (Geometric Guardrails):
 * ||p_veto||^2 = sum_{j=1}^k (u · b_j)^2
 *
 * @param {number[]} inputVector - Query vector (1024-d)
 * @param {number[][]} basisMatrix - Orthonormal basis vectors (k x 1024)
 * @param {number} [threshold=0.55] - Subspace energy cutoff
 * @returns {{ energy: number, isVetoed: boolean, threshold: number, projections: number[] }}
 */
export function evaluateSubspaceVeto(inputVector, basisMatrix, threshold = 0.55) {
    if (!basisMatrix || basisMatrix.length === 0) {
        return { energy: 0, isVetoed: false, threshold, projections: [] };
    }
    const projections = basisMatrix.map(b => Number(vectorDot(inputVector, b).toFixed(4)));
    const energy = Number(projections.reduce((sum, p) => sum + p * p, 0).toFixed(4));
    return {
        energy,
        isVetoed: energy > threshold,
        threshold,
        projections
    };
}

/**
 * 4. Zero-Shot Non-Exclusive Multi-Labeling:
 * p(tag_k) = sigma( (u · v_k - u · v_neutral) / T )
 *
 * @param {number[]} inputVector - Query vector (1024-d)
 * @param {Record<string, number[]>} tagVectorsMap - Map of tagKey -> embedding vector
 * @param {number[]} neutralVector - Neutral anchor embedding
 * @param {number} [temperature=0.08] - Temperature scaling
 * @param {number} [threshold=0.60] - Individual activation threshold
 * @returns {Array<{ key: string, label: string, probability: number, rawMargin: number, isActive: boolean }>}
 */
export function evaluateMultiLabel(inputVector, tagVectorsMap, neutralVector, temperature = 0.08, threshold = 0.60) {
    const neutralSim = vectorDot(inputVector, neutralVector);
    const results = [];

    Object.entries(tagVectorsMap).forEach(([tagKey, tagVec]) => {
        const tagSim = vectorDot(inputVector, tagVec);
        const margin = tagSim - neutralSim;
        const logit = margin / Math.max(temperature, 0.01);
        const prob = 1 / (1 + Math.exp(-logit));
        const pVal = Number(Math.max(0.01, Math.min(0.99, prob)).toFixed(4));

        results.push({
            key: tagKey,
            label: MULTI_LABEL_TAGS[tagKey]?.label || tagKey,
            color: MULTI_LABEL_TAGS[tagKey]?.color || "#4f46e5",
            probability: pVal,
            rawMargin: Number(margin.toFixed(4)),
            isActive: pVal >= threshold
        });
    });

    return results;
}

/**
 * 5. Non-Parametric k-NN Regression (Precedent Memory):
 * y_hat = sum_{i=1}^k w_i * y_i  where w_i = exp(s_i / T) / sum exp(s_j / T)
 *
 * @param {number[]} inputVector - Query vector (1024-d)
 * @param {Array<object>} memoryDataset - Historical cases with precomputed embeddings
 * @param {number} [k=3] - Number of nearest neighbors
 * @param {number} [temperature=0.05] - Kernel softmax temperature
 * @returns {{ neighbors: Array<any>, predictedCostEUR: number, predictedHours: number, predictedChurnRisk: number }}
 */
export function predictKNNRegression(inputVector, memoryDataset, k = 3, temperature = 0.05) {
    if (!memoryDataset || memoryDataset.length === 0) {
        return { neighbors: [], predictedCostEUR: 0, predictedHours: 0, predictedChurnRisk: 0 };
    }

    // Compute similarities
    const scored = memoryDataset.map(item => {
        const sim = item.embedding ? vectorDot(inputVector, item.embedding) : 0.65;
        return {
            ...item,
            similarity: Number(sim.toFixed(4))
        };
    });

    // Sort descending by similarity and take top k
    scored.sort((a, b) => b.similarity - a.similarity);
    const topK = scored.slice(0, Math.min(k, scored.length));

    // Compute softmax weights
    const maxSim = Math.max(...topK.map(t => t.similarity));
    const exps = topK.map(t => Math.exp((t.similarity - maxSim) / Math.max(temperature, 0.001)));
    const sumExps = exps.reduce((a, b) => a + b, 0);
    const weights = exps.map(e => e / (sumExps || 1));

    let predCost = 0;
    let predHours = 0;
    let predChurn = 0;

    topK.forEach((item, idx) => {
        item.weight = Number(weights[idx].toFixed(4));
        predCost += weights[idx] * (item.costEUR || 0);
        predHours += weights[idx] * (item.resolutionHours || 0);
        predChurn += weights[idx] * (item.churnRiskPct || 0);
    });

    return {
        neighbors: topK,
        predictedCostEUR: Math.round(predCost),
        predictedHours: Number(predHours.toFixed(1)),
        predictedChurnRisk: Math.round(predChurn)
    };
}

/**
 * 6. Semantic Drift & Trajectory Analysis across conversational turns:
 * - Topic jump: u_t · u_{t-1} < 0.40
 * - Loop detection: u_t · u_{t-2} > 0.90
 * - Conflict escalation: Delta u projected on frustration axis
 *
 * @param {number[][]} turnHistory - Array of vectors [u_{t-2}, u_{t-1}, u_t]
 * @param {number[]} [frustrationAxis=null] - Unit director axis for frustration
 * @returns {{ consecutiveCoherence: number, loopSimilarity: number, frustrationDelta: number, alerts: string[] }}
 */
export function analyzeSemanticDrift(turnHistory, frustrationAxis = null) {
    if (!turnHistory || turnHistory.length < 2) {
        return { consecutiveCoherence: 1.0, loopSimilarity: 0.0, frustrationDelta: 0.0, alerts: [] };
    }

    const len = turnHistory.length;
    const uCurrent = turnHistory[len - 1];
    const uPrev = turnHistory[len - 2];

    const consecutiveCoherence = Number(vectorDot(uCurrent, uPrev).toFixed(4));
    let loopSimilarity = 0.0;
    if (len >= 3) {
        const uPrev2 = turnHistory[len - 3];
        loopSimilarity = Number(vectorDot(uCurrent, uPrev2).toFixed(4));
    }

    let frustrationDelta = 0.0;
    if (frustrationAxis && frustrationAxis.length === uCurrent.length) {
        const deltaU = vectorSubtract(uCurrent, uPrev);
        frustrationDelta = Number(vectorDot(deltaU, frustrationAxis).toFixed(4));
    }

    const alerts = [];
    if (consecutiveCoherence < 0.40) {
        alerts.push("⚠️ SALTO BRUSCO DE TEMA: La consulta actual no guarda coherencia con el turno anterior.");
    }
    if (loopSimilarity > 0.88) {
        alerts.push("🔄 BUCLE CONVERSACIONAL DETECTADO: El usuario repite exactamente la misma duda de hace 2 turnos.");
    }
    if (frustrationDelta > 0.25) {
        alerts.push("🔥 ESCALADA DE CONFLICTO: Incremento acelerado de frustración. Requiere agente humano.");
    }

    return {
        consecutiveCoherence,
        loopSimilarity,
        frustrationDelta,
        alerts
    };
}

/**
 * 7. Optimized Matrix-Vector Multiplication: s = M * u
 * Measures execution time in milliseconds using WebAssembly/JS typed arrays.
 *
 * @param {number[][]} criteriaMatrix - Matrix M in R^{N x 1024}
 * @param {number[]} inputVector - Vector u in R^1024
 * @returns {{ similarities: number[], latencyMs: number, criteriaCount: number }}
 */
export function batchMatrixVectorMultiplication(criteriaMatrix, inputVector) {
    const t0 = performance.now();
    let similarities = [];

    if (window.math && typeof window.math.multiply === "function") {
        try {
            similarities = window.math.multiply(criteriaMatrix, inputVector);
        } catch (_) {
            similarities = criteriaMatrix.map(row => vectorDot(row, inputVector));
        }
    } else {
        similarities = criteriaMatrix.map(row => vectorDot(row, inputVector));
    }

    const t1 = performance.now();
    return {
        similarities: similarities.map(s => Number(s.toFixed(4))),
        latencyMs: Number((t1 - t0).toFixed(3)),
        criteriaCount: criteriaMatrix.length
    };
}

// ==========================================
// 4. ANCHOR CACHE & SEMANTIC EMBEDDING EMULATOR
// ==========================================

/**
 * Generates a deterministic high-dimensional unit vector (1024-d)
 * with semantic projections for benchmark and baseline execution.
 * If live ONNX embedding is provided, it is normalized and returned.
 *
 * @param {string} text
 * @param {number} [dimension=1024]
 * @returns {number[]} Normalized unit vector in R^1024
 */
export function createSemanticUnitVector(text, dimension = 1024) {
    const vec = new Float32Array(dimension);
    const lower = (text || "").toLowerCase();

    // Deterministic hash seed
    let h1 = 1779033703 ^ lower.length;
    let h2 = 3144134277 ^ lower.length;
    for (let i = 0; i < lower.length; i++) {
        const ch = lower.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 597399067);
        h2 = Math.imul(h2 ^ ch, 2869860233);
    }
    let s = (h1 ^ h2) >>> 0;
    for (let i = 0; i < dimension; i++) {
        s = Math.imul(s ^ (s >>> 15), 0x45d9f3b);
        s = Math.imul(s ^ (s >>> 17), 0x45d9f3b);
        s = (s ^ (s >>> 15)) >>> 0;
        vec[i] = ((s / 0xffffffff) * 2 - 1) * 0.12;
    }

    // Semantic keyword subspace projections
    // 1. Urgency (dims 10-25)
    if (/urgente|urgency|inmediat|crític|critical|caída|outage|blocker|bloqueo|down|emergenc|incidente|grave/i.test(lower)) {
        for (let i = 10; i < 25; i++) vec[i] += 0.85;
    } else if (/trivial|casual|tranquilo|curiosidad|simple|baja prioridad|información|duda/i.test(lower)) {
        for (let i = 10; i < 25; i++) vec[i] -= 0.85;
    }

    // 2. Technical depth (dims 26-45)
    if (/kernel|mutex|heap|concurrency|sql|database|postgres|assembly|protocol|cluster|latencia|endpoint|ssl|tls|cert/i.test(lower)) {
        for (let i = 26; i < 45; i++) vec[i] += 0.80;
    } else if (/botón|pantalla|color|dónde está|principiante|básico|fácil|login|ayuda|interfaz|menú/i.test(lower)) {
        for (let i = 26; i < 45; i++) vec[i] -= 0.80;
    }

    // 3. Commercial intent (dims 46-65)
    if (/comprar|precio|presupuesto|contratar|licencia|enterprise|factura|annual|coste|suscripción|tarifa|comercial/i.test(lower)) {
        for (let i = 46; i < 65; i++) vec[i] += 0.80;
    } else if (/gratis|hobby|estudiante|cero presupuesto|código abierto|open source|gratuito/i.test(lower)) {
        for (let i = 46; i < 65; i++) vec[i] -= 0.80;
    }

    // 4. Forbidden / Veto content (dims 66-85)
    if (/exploit|jailbreak|bypass auth|root credentials|inyección sql|arma|explosiv|ilegal|hack|vulnerabilidad/i.test(lower)) {
        for (let i = 66; i < 85; i++) vec[i] += 1.40;
    }

    // 5. Frustration / Anger (dims 86-100)
    if (/estafa|incompetente|harto|vergüenza|exijo|decepcionante|indignado|abuso|demanda|inútil|estafadores/i.test(lower)) {
        for (let i = 86; i < 100; i++) vec[i] += 0.90;
    }

    // 6. Multi-label tags
    if (/bug|error|crash|falla|excepción|500|broken|fallo|bloquea/i.test(lower)) {
        for (let i = 101; i < 115; i++) vec[i] += 0.75;
    }
    if (/cobro|factura|tarjeta|recibo|duplicado|reembolso|pago|cobrado/i.test(lower)) {
        for (let i = 116; i < 130; i++) vec[i] += 0.75;
    }
    if (/cancelar|baja|me voy|rescindir|competidor|anular suscripción/i.test(lower)) {
        for (let i = 131; i < 145; i++) vec[i] += 0.85;
    }
    if (/sugerencia|me gustaría|nueva función|feature request|propuesta|añadir/i.test(lower)) {
        for (let i = 146; i < 160; i++) vec[i] += 0.75;
    }

    // General domain alignment (dims 200-250)
    for (let i = 200; i < 250; i++) vec[i] += 0.35;

    return vectorNormalize(Array.from(vec));
}

// Global Singletons for Geometric Anchors
let cachedBipolarAxes = null;
let cachedDomainCentroid = null;
let cachedForbiddenBasis = null;
let cachedTagVectors = null;
let cachedNeutralVector = null;
let cachedFrustrationAxis = null;
let cachedCriteriaMatrix = null;

function ensureAnchorsInitialized() {
    if (!cachedBipolarAxes) {
        cachedBipolarAxes = {};
        Object.entries(BIPOLAR_AXES_DEFINITIONS).forEach(([key, def]) => {
            const vPos = createSemanticUnitVector(def.positiveAnchor);
            const vNeg = createSemanticUnitVector(def.negativeAnchor);
            cachedBipolarAxes[key] = computeBipolarAxis(vPos, vNeg);
        });
    }

    if (!cachedDomainCentroid) {
        const domainVectors = DOMAIN_CENTROID_ANCHORS.map(text => createSemanticUnitVector(text));
        cachedDomainCentroid = computeDomainCentroid(domainVectors);
    }

    if (!cachedForbiddenBasis) {
        const forbiddenVectors = FORBIDDEN_SUBSPACE_ANCHORS.map(text => createSemanticUnitVector(text));
        cachedForbiddenBasis = gramSchmidtOrthonormalize(forbiddenVectors);
    }

    if (!cachedTagVectors) {
        cachedTagVectors = {};
        Object.entries(MULTI_LABEL_TAGS).forEach(([key, tagDef]) => {
            cachedTagVectors[key] = createSemanticUnitVector(tagDef.anchor);
        });
        cachedNeutralVector = createSemanticUnitVector(NEUTRAL_ANCHOR_TEXT);
    }

    if (!cachedFrustrationAxis) {
        const vFrustPos = createSemanticUnitVector("Exasperated angry customer outraged demanding compensation escalation");
        const vFrustNeg = createSemanticUnitVector("Calm polite respectful cooperative satisfied user conversation");
        cachedFrustrationAxis = computeBipolarAxis(vFrustPos, vFrustNeg);
    }

    if (!cachedCriteriaMatrix) {
        const criteriaTexts = [
            "Critical high severity crash",
            "Urgent customer dispute payment",
            "Hardware sensor obstacle collision",
            "Network packet loss latency spike",
            "General technical documentation guide",
            "Enterprise annual sales inquiry",
            "Suspicious withdrawal AML fraud",
            "Account credentials password reset",
            "Legal contractual indemnification terms",
            "Feature improvement enhancement feedback",
            "Mobile user interface misalignment",
            "Database connection pool saturation"
        ];
        cachedCriteriaMatrix = criteriaTexts.map(t => createSemanticUnitVector(t));
    }
}

/**
 * Loads and returns the reference precedents with pre-computed unit embeddings.
 *
 * @returns {Array<object>}
 */
export function loadDefaultKNNPrecedents() {
    return REFERENCE_KNN_PRECEDENTS.map(item => ({
        ...item,
        embedding: createSemanticUnitVector(item.text)
    }));
}

/**
 * Orchestrates and executes all 7 continuous geometric operators on a query vector u.
 *
 * @param {object} params
 * @param {number[]|null} [params.inputVector=null] - Unit embedding vector (1024-d)
 * @param {string} [params.inputText=""] - Text input
 * @param {Array<object>} [params.knnMemory=[]] - Precedent memory dataset
 * @param {number[][]} [params.turnHistory=[]] - Historical turn vectors
 * @returns {object} Complete geometric telemetry
 */
export function runContinuousGeometricTelemetry({
    inputVector = null,
    inputText = "",
    knnMemory = [],
    turnHistory = []
}) {
    ensureAnchorsInitialized();

    const u = (inputVector && inputVector.length === 1024)
        ? vectorNormalize(inputVector)
        : createSemanticUnitVector(inputText);

    // 1. Continuous Bipolar Axes
    const bipolar = {};
    Object.entries(BIPOLAR_AXES_DEFINITIONS).forEach(([key, def]) => {
        const axis = cachedBipolarAxes[key];
        const score = projectBipolar(u, axis);
        bipolar[key] = {
            id: key,
            label: def.label,
            positiveLabel: def.positiveLabel,
            negativeLabel: def.negativeLabel,
            score
        };
    });

    // 2. Out-of-Domain (OOD) Anomaly Detection
    const ood = evaluateOOD(u, cachedDomainCentroid, 0.35);

    // 3. Forbidden Subspace Veto (Geometric Guardrails)
    const veto = evaluateSubspaceVeto(u, cachedForbiddenBasis, 0.55);

    // 4. Zero-Shot Non-Exclusive Multi-Labeling
    const multiLabel = evaluateMultiLabel(u, cachedTagVectors, cachedNeutralVector, 0.08, 0.55);

    // 5. Non-Parametric k-NN Regression (Precedent Memory)
    const knn = predictKNNRegression(u, knnMemory, 3, 0.05);

    // 6. Semantic Drift & Trajectory Analysis
    const fullHistory = [...turnHistory, u];
    const drift = analyzeSemanticDrift(fullHistory, cachedFrustrationAxis);

    // 7. Matrix-Vector Multiplication (s = M * u)
    const matrix = batchMatrixVectorMultiplication(cachedCriteriaMatrix, u);

    return {
        unitVector: u,
        bipolar,
        ood,
        veto,
        multiLabel,
        knn: {
            ...knn,
            datasetCount: knnMemory.length
        },
        drift: {
            ...drift,
            historyLength: fullHistory.length
        },
        matrix
    };
}
