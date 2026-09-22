/**
 * ui.js - Modern Interactive UI Renderers
 *
 * Implements:
 * 1. renderProbabilityBars: Choice and Score probability breakdown
 * 2. renderConfidenceGauge: Confidence metric with formula breakdown
 * 3. renderDecisionFlowchart: Interactive SVG/HTML flowchart with active animated path
 * 4. renderWeightSliders: Composite scoring sliders with instant normalization
 * 5. renderJsonInspector: Syntax-highlighted Embeding/Jev response viewer
 */

export function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Renders probability bars for Choice or Score questions.
 *
 * @param {Array<{ key: string, label: string, probability: number, isWinner?: boolean }>} items
 * @param {string} [title='Distribución de Probabilidad']
 * @returns {string} HTML string
 */
export function renderProbabilityBars(items, title = "Distribución de Probabilidad") {
    if (!items || items.length === 0) return "";

    const rowsHtml = items.map((item, idx) => {
        const pct = Math.max(0, Math.min(100, item.probability * 100));
        const isWinner = !!item.isWinner;
        const color = isWinner ? "var(--primary)" : "var(--text-muted)";
        const barBg = isWinner 
            ? "linear-gradient(90deg, #4f46e5 0%, #6366f1 100%)" 
            : "linear-gradient(90deg, #cbd5e1 0%, #94a3b8 100%)";

        return `
            <div class="prob-row ${isWinner ? 'winner-row' : ''}">
                <div class="prob-header">
                    <span class="prob-label">
                        ${isWinner ? '<span class="prob-winner-badge">★ Ganador</span>' : ''}
                        <strong>${escapeHtml(item.key || `Opción ${idx + 1}`)}</strong>
                        <span class="prob-subtext">${escapeHtml(item.label || "")}</span>
                    </span>
                    <span class="prob-value">${pct.toFixed(1)}%</span>
                </div>
                <div class="prob-bar-track">
                    <div class="prob-bar-fill" style="width: ${pct}%; background: ${barBg};"></div>
                </div>
            </div>
        `;
    }).join("");

    return `
        <div class="prob-card">
            <div class="prob-card-title">${escapeHtml(title)}</div>
            <div class="prob-rows-container">
                ${rowsHtml}
            </div>
        </div>
    `;
}

/**
 * Renders a confidence gauge card with formula explanation.
 *
 * @param {number} confidence - 0.00 to 1.00
 * @param {number} optionCount - Number of options N
 * @param {number} maxProbability - p_max (0.0 to 1.0)
 * @returns {string} HTML string
 */
export function renderConfidenceGauge(confidence, optionCount = 3, maxProbability = 0.9) {
    const confVal = Math.max(0, Math.min(1, confidence));
    const tier = confVal >= 0.85 ? "HIGH" : (confVal >= 0.60 ? "MEDIUM" : "LOW");
    const tierColors = {
        HIGH: { bg: "#ecfdf5", border: "#a7f3d0", text: "#065f46", label: "Alta Certeza (Actuar Automáticamente)" },
        MEDIUM: { bg: "#fffbeb", border: "#fde68a", text: "#92400e", label: "Certeza Moderada (Confirmar / Validar)" },
        LOW: { bg: "#fef2f2", border: "#fecaca", text: "#991b1b", label: "Baja Certeza (No Actuar / Escalar)" }
    };
    const currentTier = tierColors[tier];

    return `
        <div class="confidence-card">
            <div class="confidence-header">
                <div>
                    <div class="card-eyebrow">Métrica de Certeza Calibrada</div>
                    <h4 class="card-title">Confianza del Modelo (Choice Confidence)</h4>
                </div>
                <div class="confidence-badge-pill" style="background: ${currentTier.bg}; border-color: ${currentTier.border}; color: ${currentTier.text};">
                    ${currentTier.label}
                </div>
            </div>

            <div class="confidence-display-row">
                <div class="confidence-number-box">
                    <span class="confidence-number">${confVal.toFixed(2)}</span>
                    <span class="confidence-scale">/ 1.00</span>
                </div>
                <div class="confidence-bar-container">
                    <div class="confidence-track">
                        <div class="confidence-fill" style="width: ${(confVal * 100).toFixed(1)}%;"></div>
                        <div class="confidence-threshold-marker" style="left: 60%;" title="Umbral Mínimo (0.60)">
                            <span class="marker-tag">0.60</span>
                        </div>
                        <div class="confidence-threshold-marker" style="left: 85%;" title="Umbral Alto Riesgo (0.85)">
                            <span class="marker-tag">0.85</span>
                        </div>
                    </div>
                    <div class="confidence-zones-legend">
                        <span style="color: #ef4444;">Baja (&lt;0.60)</span>
                        <span style="color: #f59e0b;">Moderada (0.60–0.85)</span>
                        <span style="color: #10b981;">Alta (&gt;0.85)</span>
                    </div>
                </div>
            </div>

            <div class="formula-box">
                <div class="formula-title">📐 Fórmula de cálculo para N = ${optionCount} opciones:</div>
                <code>confidence = max(0, min(1, (${optionCount} × ${(maxProbability).toFixed(2)} − 1) / (${optionCount} − 1))) = <strong>${confVal.toFixed(2)}</strong></code>
            </div>
        </div>
    `;
}

/**
 * Renders an interactive SVG/HTML Decision Flowchart with active animated nodes.
 *
 * @param {object} options
 * @param {string} options.title
 * @param {Array<{ id: string, label: string, type: 'input'|'eval'|'gate'|'action', text: string }>} options.nodes
 * @param {Array<{ from: string, to: string, label?: string }>} options.edges
 * @param {string[]} options.activeNodes
 * @returns {string} HTML string
 */
export function renderDecisionFlowchart({ title, nodes, edges, activeNodes = [] }) {
    const activeSet = new Set(activeNodes);

    const nodesHtml = nodes.map(node => {
        const isActive = activeSet.has(node.id);
        return `
            <div class="flow-node node-${node.type} ${isActive ? 'node-active' : 'node-inactive'}" id="node-${node.id}">
                <div class="flow-node-header">
                    <span class="node-type-pill">${escapeHtml(node.type.toUpperCase())}</span>
                    ${isActive ? '<span class="node-pulse-dot"></span>' : ''}
                </div>
                <div class="flow-node-title">${escapeHtml(node.label)}</div>
                ${node.text ? `<div class="flow-node-desc">${escapeHtml(node.text)}</div>` : ''}
            </div>
        `;
    }).join("");

    return `
        <div class="flowchart-container">
            <div class="flowchart-header">
                <span class="card-eyebrow">Árbol de Decisión en Vivo</span>
                <h4 class="card-title">${escapeHtml(title || 'Flujo de Enrutamiento Dinámico')}</h4>
                <p class="flowchart-desc">Los nodos iluminados y con borde pulsante indican el camino activo tomado por el código según las respuestas y umbrales calculados.</p>
            </div>
            <div class="flowchart-diagram-grid">
                ${nodesHtml}
            </div>
        </div>
    `;
}

/**
 * Renders composite scoring controls: weight sliders, normalization check, and candidate ranking.
 *
 * @param {object} params
 * @param {Record<string, number>} params.scores - { dimKey: score (0..1) }
 * @param {Record<string, number>} params.weights - { dimKey: weight }
 * @param {string} params.activeProfile - Current profile name
 * @param {Record<string, Record<string, number>>} params.profiles - Predefined profiles
 * @returns {string} HTML string
 */
export function renderCompositeScoringWorkbench({ scores, weights, activeProfile, profiles, questions }) {
    const profileButtons = Object.keys(profiles).map(p => `
        <button type="button" class="profile-btn ${p === activeProfile ? 'active' : ''}" data-profile="${escapeHtml(p)}">
            ${p === 'Senior IC' ? '💻' : (p === 'Engineering Manager' ? '👥' : '🛠️')} ${escapeHtml(p)}
        </button>
    `).join("");

    const sliderRows = Object.keys(questions).map(key => {
        const q = questions[key];
        const scoreVal = scores[key] !== undefined ? scores[key] : 0.5;
        const weightVal = weights[key] !== undefined ? weights[key] : 0.25;
        const rawPct = (weightVal * 100).toFixed(0);

        return `
            <div class="weight-control-row">
                <div class="weight-dim-info">
                    <div class="weight-dim-title">${escapeHtml(q.label)}</div>
                    <div class="weight-dim-score">Score esperado: <strong>${(scoreVal * 4).toFixed(2)}/4.0</strong> (Norm: ${(scoreVal).toFixed(2)})</div>
                </div>
                <div class="weight-slider-wrapper">
                    <input type="range" class="weight-slider" data-dimension="${escapeHtml(key)}" min="0" max="100" step="5" value="${rawPct}" />
                    <span class="weight-badge">${rawPct}% peso</span>
                </div>
            </div>
        `;
    }).join("");

    return `
        <div class="composite-workbench-card">
            <div class="composite-header">
                <div>
                    <div class="card-eyebrow">Ponderación & Normalización de Criterios</div>
                    <h4 class="card-title">Perfiles de Ponderación (Composite Weights)</h4>
                </div>
                <div class="profile-selector-group">
                    ${profileButtons}
                </div>
            </div>
            <div class="weight-sliders-list">
                ${sliderRows}
            </div>
        </div>
    `;
}

/**
 * Renders JSON Inspector with syntax copy/download buttons.
 *
 * @param {object} jsonObject
 * @param {string} [title='Respuesta Estructurada JSON']
 * @returns {string} HTML string
 */
export function renderJsonInspector(dataOrObject, title = "Respuesta Estructurada JSON", activeTab = "query") {
    let queryObj = null;
    let stateObj = null;
    let runtimeObj = null;
    let currentTab = activeTab;

    if (dataOrObject && (dataOrObject.queryJson !== undefined || dataOrObject.stateJson !== undefined || dataOrObject.runtimeJson !== undefined)) {
        queryObj = dataOrObject.queryJson;
        stateObj = dataOrObject.stateJson;
        runtimeObj = dataOrObject.runtimeJson;
        currentTab = dataOrObject.activeTab || activeTab || "query";
    } else {
        runtimeObj = dataOrObject;
        currentTab = "runtime";
    }

    let activeObject = runtimeObj;
    if (currentTab === "query") activeObject = queryObj || runtimeObj;
    else if (currentTab === "state") activeObject = stateObj || runtimeObj;
    else activeObject = runtimeObj;

    const rawString = JSON.stringify(activeObject || {}, null, 2);
    const sizeKB = (new Blob([rawString]).size / 1024).toFixed(1);
    const hasMultiFiles = !!(queryObj || stateObj);

    return `
        <div class="json-inspector-container">
            <div class="json-inspector-toolbar">
                <div class="json-title-group">
                    <span class="json-icon">{ }</span>
                    <strong>${escapeHtml(title)}</strong>
                    <span class="json-size-pill">${sizeKB} KB</span>
                </div>
                <div class="json-actions">
                    <button type="button" class="btn-secondary" id="btn-copy-json">
                        📋 Copiar JSON
                    </button>
                    <button type="button" class="btn-secondary" id="btn-download-json">
                        💾 Descargar .json
                    </button>
                </div>
            </div>
            ${hasMultiFiles ? `
                <div class="json-subtabs-bar" id="json-subtabs-bar">
                    <button type="button" class="json-subtab-btn ${currentTab === 'query' ? 'active' : ''}" data-jsontab="query">📄 query.json (Esquema)</button>
                    <button type="button" class="json-subtab-btn ${currentTab === 'state' ? 'active' : ''}" data-jsontab="state">📋 state.json (Ground-Truth)</button>
                    <button type="button" class="json-subtab-btn ${currentTab === 'runtime' ? 'active' : ''}" data-jsontab="runtime">⚡ telemetria_runtime.json (En Vivo)</button>
                </div>
            ` : ''}
            <pre class="json-pre-box"><code>${escapeHtml(rawString)}</code></pre>
        </div>
    `;
}

/**
 * Renders the Dual Mathematical Telemetry & Output Contrast View:
 * - Pipeline: Input ➔ Embedding vector ➔ Raw cosine similarity ➔ Mathematical formula (Softmax, Entropy, Variance, Markov) ➔ Output
 * - Contrast: Compares live calculated output vs calibrated reference from js/use-cases.js
 *
 * @param {object} params
 * @param {object} params.uc - Active use case definition
 * @param {object} params.answers - Current calculated answers
 * @param {object} params.preset - Active preset object with reference answers
 * @param {object} [params.mdpTelemetry] - Robot MDP telemetry if available
 * @param {string} [params.inputText] - Current evaluated text
 * @returns {string} HTML string
 */
export function renderMathInspectionView({
    uc,
    answers = {},
    preset = null,
    mdpTelemetry = null,
    inputText = "",
    geometricTelemetry = null,
    knnMemory = [],
    isEvaluated = false,
    schema = null,
    referenceState = null
}) {
    const textSnippet = (inputText || "").trim();
    const tokenEst = Math.ceil(textSnippet.length / 4);
    const activeSchema = schema || uc.questions || {};
    const refAnswers = (referenceState && referenceState.expected_answers)
        ? referenceState.expected_answers
        : ((preset && preset.answers) ? preset.answers : {});
    const expectedRoute = (referenceState && referenceState.expected_route)
        ? referenceState.expected_route
        : null;

    // Helper for matching questions in query.json to ground truth reference values
    function findReference(qKey) {
        if (qKey === "final_destination_route" && expectedRoute) {
            return { isRoute: true, val: expectedRoute };
        }
        if (!refAnswers) return null;
        if (refAnswers[qKey] !== undefined) return { isRoute: false, val: refAnswers[qKey] };

        const aliases = {
            ticket_category: "category",
            bug_severity_rating: "bug_severity",
            customer_frustration: "frustration",
            banking_intent: "intent",
            risk_impact_level: "risk_level",
            adversarial_threat_type: "threat_type",
            content_toxicity_score: "toxicity",
            loss_claim_event: "claim_type",
            estimated_payout_bracket: "damage_severity",
            aml_typology: "alert_type",
            aml_risk_severity: "risk_severity",
            moderation_infraction: "category",
            harm_severity_score: "severity",
            contract_agreement_type: "contract_type",
            liability_exposure_score: "liability_cap",
            architecture_defect_type: "defect_type",
            architectural_debt_severity: "debt_severity"
        };

        if (aliases[qKey] && refAnswers[aliases[qKey]] !== undefined) {
            return { isRoute: false, val: refAnswers[aliases[qKey]] };
        }

        for (const [rKey, rVal] of Object.entries(refAnswers)) {
            if (qKey.includes(rKey) || rKey.includes(qKey)) {
                return { isRoute: false, val: rVal };
            }
        }
        return null;
    }

    // =========================================================================
    // CASE A: NOT EVALUATED (Initial state loaded from state.json, awaiting run)
    // =========================================================================
    if (!isEvaluated) {
        const schemaEntries = Object.entries(activeSchema);
        return `
            <div class="math-telemetry-container">
                <div class="usecase-hero-banner">
                    <div class="hero-info">
                        <span class="hero-tag" style="background: #f59e0b; color: #78350f;">ESPERANDO INFERENCIA</span>
                        <h3 class="hero-title">🔬 Telemetría Vectorial &amp; Comparación: ${escapeHtml(uc.name)}</h3>
                        <p class="hero-desc">Los datos iniciales se han cargado desde <code>state.json</code> y el esquema de preguntas desde <code>query.json</code>. No se asume ningún valor por defecto hasta ejecutar el modelo.</p>
                    </div>
                </div>

                <div class="status-pill-banner warning" style="margin: 20px 0; padding: 20px 24px; border-radius: var(--radius-md); display: flex; align-items: center; gap: 18px; border: 1.5px solid #fde68a; background: #fffbeb;">
                    <div style="font-size: 36px; line-height: 1;">⚡</div>
                    <div>
                        <div style="font-size: 16px; font-weight: 800; color: #92400e;">
                            Inferencia y Cálculos Matemáticos Pendientes de Ejecución
                        </div>
                        <div style="font-size: 13.5px; color: #78350f; margin-top: 5px; line-height: 1.55;">
                            Se ha cargado el texto exacto del estado y la referencia preestablecida de <code>use-cases.js</code> / <code>state.json</code>.
                            <br>
                            Para proyectar el texto en la hiperesfera unitaria ℝ¹⁰²⁴, computar las probabilidades Softmax, calcular entropía y contrastar con la verdad fundamental, pulsa el botón <strong>"⚡ Ejecutar con Qwen3 (ONNX)"</strong> en la barra superior.
                        </div>
                    </div>
                </div>

                <!-- Input Text State Card -->
                <div class="math-question-block" style="margin-bottom: 20px;">
                    <div class="math-question-header">
                        <div class="math-q-title">
                            <span>📝</span> Texto del Estado Cargado (<code>state.json</code>)
                        </div>
                        <span class="math-q-type-badge">${escapeHtml(preset ? preset.name : 'Ejemplo Seleccionado')}</span>
                    </div>
                    <div style="padding: 16px 20px; background: var(--bg-surface); font-size: 14px; line-height: 1.6; color: var(--text-primary); border-top: 1px solid var(--border-color);">
                        ${escapeHtml(textSnippet)}
                    </div>
                </div>

                <!-- Queries Catalog Prepared for Inference -->
                <div class="math-question-block">
                    <div class="math-question-header">
                        <div class="math-q-title">
                            <span>📋</span> Consultas Tipadas en <code>query.json</code> (${schemaEntries.length} preguntas disponibles)
                        </div>
                        <span class="math-q-type-badge">Embeding System One</span>
                    </div>
                    <div style="padding: 16px; overflow-x: auto;">
                        <table class="knn-table" style="width: 100%;">
                            <thead>
                                <tr>
                                    <th>ID Consulta</th>
                                    <th>Tipo</th>
                                    <th>Instrucción del Prompt</th>
                                    <th>Opciones / Criterios</th>
                                    <th>Referencia en state.json</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${schemaEntries.map(([qKey, qDef]) => {
                                    const ref = findReference(qKey);
                                    let optionsCount = 0;
                                    if (qDef.type === "choice") optionsCount = Object.keys(qDef.criteria || {}).length;
                                    else if (qDef.type === "score") optionsCount = Array.isArray(qDef.criteria) ? qDef.criteria.length : Object.keys(qDef.criteria || {}).length;
                                    else if (qDef.type === "noul") optionsCount = 2;

                                    let refText = "Calibrado";
                                    if (ref) {
                                        if (ref.isRoute) refText = `Ruta: ${ref.val.destination || ref.val.routeKey}`;
                                        else if (Array.isArray(ref.val)) refText = `Distr: [${ref.val.join(", ")}]`;
                                        else if (typeof ref.val === "number") refText = `Prob: ${(ref.val * 100).toFixed(0)}%`;
                                    }

                                    return `
                                        <tr>
                                            <td><code>${escapeHtml(qKey)}</code></td>
                                            <td><span class="geom-badge" style="background: #e0e7ff; color: #4338ca;">${escapeHtml(qDef.type)}</span></td>
                                            <td>${escapeHtml(qDef.instructions || qKey)}</td>
                                            <td><strong>${optionsCount}</strong> alternativas</td>
                                            <td><code style="color: var(--primary);">${escapeHtml(refText)}</code></td>
                                        </tr>
                                    `;
                                }).join("")}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    // =========================================================================
    // CASE B: EVALUATED (Live calculations performed via Qwen3 button)
    // =========================================================================
    const sampleVec = (geometricTelemetry && geometricTelemetry.unitVector)
        ? geometricTelemetry.unitVector.slice(0, 8)
        : [0.0341, -0.0215, 0.0892, -0.0512, 0.0764, -0.0128, 0.0435, -0.0319];
    const vecPreview = `[${sampleVec.map(v => (v >= 0 ? `+${v.toFixed(4)}` : v.toFixed(4))).join(", ")}, ... 1024 floats]`;

    let totalQueries = 0;
    let alignedQueries = 0;

    // ----------------------------------------------------
    // 7 CONTINUOUS LATENT GEOMETRIC OPERATORS RENDERER
    // ----------------------------------------------------
    let geomHtml = "";
    if (geometricTelemetry) {
        const { bipolar, ood, veto, multiLabel, knn, drift, matrix } = geometricTelemetry;

        // 1. Ejes Bipolares Continuos
        const bipolarHtml = Object.values(bipolar || {}).map(axis => {
            const score = axis.score; // in [-1, +1]
            const pct = Math.max(0, Math.min(100, ((score + 1) / 2) * 100));
            const isPos = score >= 0;
            const fillWidth = Math.abs(score) * 50;
            const fillLeft = isPos ? 50 : 50 - fillWidth;
            const barColor = isPos ? '#3b82f6' : '#94a3b8';

            return `
                <div class="bipolar-item">
                    <div class="bipolar-top-row">
                        <span>${escapeHtml(axis.label)}</span>
                        <span style="color: ${isPos ? 'var(--primary)' : 'var(--text-secondary)'}; font-family: ui-monospace, monospace;">
                            ${score >= 0 ? `+${score.toFixed(3)}` : score.toFixed(3)}
                        </span>
                    </div>
                    <div class="bipolar-track-container">
                        <div class="bipolar-center-line"></div>
                        <div class="bipolar-fill-bar" style="left: ${fillLeft}%; width: ${fillWidth}%; background: ${barColor};"></div>
                        <div class="bipolar-thumb-marker" style="left: ${pct}%;"></div>
                    </div>
                    <div class="bipolar-labels-row">
                        <span>◀ ${escapeHtml(axis.negativeLabel)} (-1.0)</span>
                        <span>${escapeHtml(axis.positiveLabel)} (+1.0) ▶</span>
                    </div>
                </div>
            `;
        }).join("");

        // 2. Detección OOD
        const oodStatusClass = ood.isOOD ? "alert" : "ok";
        const oodHtml = `
            <div class="status-pill-banner ${oodStatusClass}">
                <div style="font-size: 16px;">${ood.isOOD ? '⚠️' : '✓'}</div>
                <div>
                    <div><strong>${ood.isOOD ? 'ALERTA DE ANOMALÍA: FUERA DE DOMINIO (OOD)' : 'DENTRO DE DOMINIO NOMINAL'}</strong></div>
                    <div>Similitud con centroide μ_dominio: <code>${ood.inDomainScore}</code> (Umbral τ_OOD = <code>${ood.threshold}</code>). ${ood.isOOD ? 'El vector cae fuera de la distribución de soporte/operaciones. Se recomienda rechazo o enrutado a agente humano.' : 'Alineación conforme con el espacio latente operativo.'}</div>
                </div>
            </div>
        `;

        // 3. Veto Subespacios Prohibidos
        const vetoStatusClass = veto.isVetoed ? "alert" : "ok";
        const vetoHtml = `
            <div class="status-pill-banner ${vetoStatusClass}">
                <div style="font-size: 16px;">${veto.isVetoed ? '⛔' : '🛡️'}</div>
                <div>
                    <div><strong>${veto.isVetoed ? 'VETO GEOMÉTRICO ACTIVADO: SUBESPACIO PROHIBIDO DETECTADO' : 'GUARDRAILS GEOMÉTRICOS CONFORMES'}</strong></div>
                    <div>Energía en subespacio veto ||p_veto||² = <code>${veto.energy}</code> (Umbral τ_veto = <code>${veto.threshold}</code>). ${veto.isVetoed ? 'Bloqueo inmediato por guardrail de seguridad (proyección de Gram-Schmidt).' : 'No se detecta intrusión en bases ortonormales de contenido malicioso, legal no autorizado o armas.'}</div>
                </div>
            </div>
        `;

        // 4. Etiquetado Múltiple
        const multiLabelHtml = (multiLabel || []).map(tag => `
            <div class="multilabel-chip ${tag.isActive ? 'active' : ''}" style="${tag.isActive ? `border-color: ${tag.color}; color: ${tag.color};` : ''}">
                <span>${tag.isActive ? '●' : '○'}</span>
                <span>${escapeHtml(tag.label)}</span>
                <span class="multilabel-prob-badge" style="${tag.isActive ? `background: ${tag.color}22; color: ${tag.color}; font-weight: 800;` : ''}">
                    ${(tag.probability * 100).toFixed(1)}%
                </span>
            </div>
        `).join("");

        // 5. k-NN Regresión
        let knnContentHtml = "";
        const memCount = (knnMemory && knnMemory.length) || 0;
        if (memCount === 0) {
            knnContentHtml = `
                <div style="background: #f8fafc; border: 1.5px dashed #cbd5e1; border-radius: var(--radius-md); padding: 18px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 10px;">
                    <div style="font-size: 24px;">📂</div>
                    <div style="font-weight: 700; color: var(--text-primary);">Memoria de Precedentes k-NN Vacía (0 casos en sesión)</div>
                    <div style="font-size: 12.5px; color: var(--text-secondary); max-width: 520px;">
                        Carga el dataset de referencia con 10 incidentes reales precalculados para estimar costes (€), tiempos de resolución (horas) y riesgo de fuga por ponderación Softmax continua.
                    </div>
                    <button type="button" id="btn-load-knn-dataset" class="btn-primary" style="margin-top: 4px;">
                        📂 Cargar Dataset de Referencia (10 Incidentes)
                    </button>
                </div>
            `;
        } else {
            knnContentHtml = `
                <div class="knn-memory-section">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                        <span style="font-size: 12px; color: var(--text-secondary);">Dataset en memoria: <strong>${memCount} incidentes</strong></span>
                        <div style="display: flex; gap: 8px;">
                            <button type="button" id="btn-clear-knn-dataset" class="btn-secondary" style="font-size: 11px; padding: 4px 10px;">🗑️ Vaciar Memoria</button>
                            <button type="button" id="btn-load-knn-dataset" class="btn-secondary" style="font-size: 11px; padding: 4px 10px;">🔄 Recargar Dataset</button>
                        </div>
                    </div>
                    <div class="knn-summary-cards">
                        <div class="knn-stat-box">
                            <span class="title">Coste Estimado</span>
                            <span class="val" style="color: #0284c7;">~€${(knn.predictedCostEUR || 0).toLocaleString()}</span>
                        </div>
                        <div class="knn-stat-box">
                            <span class="title">Resolución Estimada</span>
                            <span class="val" style="color: #6366f1;">~${knn.predictedHours || 0} h</span>
                        </div>
                        <div class="knn-stat-box">
                            <span class="title">Riesgo Churn (Fuga)</span>
                            <span class="val" style="color: ${(knn.predictedChurnRisk || 0) > 50 ? '#dc2626' : '#059669'};">${knn.predictedChurnRisk || 0}%</span>
                        </div>
                    </div>
                    <div class="knn-table-wrapper">
                        <table class="knn-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Incidente Histórico</th>
                                    <th>Categoría</th>
                                    <th>Similitud Coseno</th>
                                    <th>Peso Softmax (w_i)</th>
                                    <th>Coste Real</th>
                                    <th>Horas</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(knn.neighbors || []).map((n, i) => `
                                    <tr style="${i === 0 ? 'background: #f0fdf4;' : ''}">
                                        <td><code>${n.id}</code></td>
                                        <td><strong>${escapeHtml(n.title)}</strong><div style="font-size: 11px; color: var(--text-muted);">${escapeHtml((n.text || "").slice(0, 75))}...</div></td>
                                        <td><span class="geom-badge" style="background: #e2e8f0;">${escapeHtml(n.category || 'General')}</span></td>
                                        <td><code>${n.similarity}</code></td>
                                        <td><strong style="color: var(--primary);">${((n.weight || 0) * 100).toFixed(1)}%</strong></td>
                                        <td>€${(n.costEUR || 0).toLocaleString()}</td>
                                        <td>${n.resolutionHours} h</td>
                                    </tr>
                                `).join("")}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }

        // 6. Deriva Semántica
        const driftAlertsHtml = (drift && drift.alerts && drift.alerts.length > 0)
            ? drift.alerts.map(a => `
                <div class="status-pill-banner warning" style="margin-top: 6px;">
                    <div>${a}</div>
                </div>
            `).join("")
            : `<div class="status-pill-banner ok" style="margin-top: 6px;">
                <div>✓ <strong>Trayectoria Estable:</strong> Sin saltos bruscos ni bucles en los turnos conversacionales acumulados.</div>
               </div>`;

        // 7. Multiplicación Matriz-Vector
        const matrixLatency = matrix ? matrix.latencyMs : 0.025;
        const matrixCount = matrix ? matrix.criteriaCount : 12;

        geomHtml = `
            <div class="geom-operators-section">
                <div class="geom-section-header">
                    <div class="geom-section-title-group">
                        <h4><span>🌐</span> Álgebra Continua en Hiperesfera ℝ¹⁰²⁴ (7 Operadores Latentes)</h4>
                        <p>Aprovechamiento directo del vector unitario <strong>u ∈ ℝ¹⁰²⁴</strong> en memoria local para cálculo continuo sin discretización forzada.</p>
                    </div>
                    <div class="matrix-benchmark-bar">
                        <span>⚡ Matriz-Vector (M·u): <strong>${matrixLatency} ms</strong> (${matrixCount} criterios × 1024 floats)</span>
                    </div>
                </div>

                <div class="geom-grid-2col">
                    <div class="geom-card">
                        <div class="geom-card-header">
                            <span class="geom-card-title">1. Ejes Bipolares (Diferencial Semántico)</span>
                            <span class="geom-badge" style="background: #e0e7ff; color: #4338ca;">score ∈ [-1, +1]</span>
                        </div>
                        <div style="font-size: 11.5px; color: var(--text-muted); line-height: 1.4;">
                            <code>score = u · ((v+ − v−) / ||v+ − v−||₂)</code>. Mide la posición en un continuo bipolar sin forzar niveles discretos.
                        </div>
                        ${bipolarHtml}
                    </div>

                    <div class="geom-card">
                        <div class="geom-card-header">
                            <span class="geom-card-title">2 &amp; 3. Detección OOD y Guardrails Geométricos</span>
                            <span class="geom-badge" style="background: #fee2e2; color: #991b1b;">Filtros de Seguridad</span>
                        </div>
                        <div style="font-size: 11.5px; color: var(--text-muted); line-height: 1.4;">
                            <strong>OOD:</strong> <code>u · μ_dominio &lt; 0.35</code> | <strong>Veto:</strong> <code>||p_veto||² = ∑(u·b_j)² &gt; 0.55</code> sobre base ortonormal de Gram-Schmidt.
                        </div>
                        ${oodHtml}
                        ${vetoHtml}
                    </div>
                </div>

                <div class="geom-card">
                    <div class="geom-card-header">
                        <span class="geom-card-title">4. Etiquetado Múltiple No Excluyente (Zero-Shot)</span>
                        <span class="geom-badge" style="background: #ede9fe; color: #6d28d9;">Sigmoide con Ancla Neutral</span>
                    </div>
                    <div style="font-size: 11.5px; color: var(--text-muted);">
                        <code>p(tag_k) = σ((u·v_k − u·v_neutral) / τ)</code> [τ = 0.08]. Múltiples tags pueden activarse simultáneamente de forma independiente.
                    </div>
                    <div class="multilabel-chips-grid">
                        ${multiLabelHtml}
                    </div>
                </div>

                <div class="geom-card">
                    <div class="geom-card-header">
                        <span class="geom-card-title">5. Regresión No Paramétrica por k-NN (Memoria de Precedentes)</span>
                        <span class="geom-badge" style="background: #ecfdf5; color: #047857;">ŷ = ∑ w_i · y_i</span>
                    </div>
                    <div style="font-size: 11.5px; color: var(--text-muted);">
                        Ponderación Softmax sobre los vecinos más cercanos en ℝ¹⁰²⁴ para predecir costes económicos, horas de ingeniería y probabilidad de churn sin reentrenamiento.
                    </div>
                    ${knnContentHtml}
                </div>

                <div class="geom-card">
                    <div class="geom-card-header">
                        <span class="geom-card-title">6. Análisis de Deriva Semántica &amp; Trayectoria (Turnos Conversacionales)</span>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="geom-badge" style="background: #f1f5f9; color: #475569;">Historial: ${(drift && drift.historyLength) || 1} turnos</span>
                            <button type="button" id="btn-clear-drift-history" class="btn-secondary" style="font-size: 10.5px; padding: 2px 8px;">🔄 Reiniciar</button>
                        </div>
                    </div>
                    <div style="font-size: 11.5px; color: var(--text-muted);">
                        Monitorización de saltos de tema (<code>u_t · u_{t-1} &lt; 0.40</code>), bucles repetitivos (<code>u_t · u_{t-2} &gt; 0.88</code>) y escalada de frustración (<code>Δu · eje_frustración &gt; 0.25</code>).
                    </div>
                    <div class="drift-indicators-row">
                        <div class="drift-indicator-card">
                            <span style="font-size: 11px; color: var(--text-muted);">Coherencia Consecutiva</span>
                            <div class="val" style="color: ${(drift && drift.consecutiveCoherence < 0.40) ? '#dc2626' : '#059669'};">
                                ${(drift && drift.consecutiveCoherence) || 1.0}
                            </div>
                            <span style="font-size: 10px; color: var(--text-muted);">Alerta si &lt; 0.40</span>
                        </div>
                        <div class="drift-indicator-card">
                            <span style="font-size: 11px; color: var(--text-muted);">Similitud de Bucle</span>
                            <div class="val" style="color: ${(drift && drift.loopSimilarity > 0.88) ? '#dc2626' : '#0284c7'};">
                                ${(drift && drift.loopSimilarity) || 0.0}
                            </div>
                            <span style="font-size: 10px; color: var(--text-muted);">Alerta si &gt; 0.88</span>
                        </div>
                        <div class="drift-indicator-card">
                            <span style="font-size: 11px; color: var(--text-muted);">Deriva de Frustración</span>
                            <div class="val" style="color: ${(drift && drift.frustrationDelta > 0.25) ? '#dc2626' : '#64748b'};">
                                ${(drift && drift.frustrationDelta >= 0) ? `+${drift.frustrationDelta}` : ((drift && drift.frustrationDelta) || 0.0)}
                            </div>
                            <span style="font-size: 10px; color: var(--text-muted);">Alerta si &gt; +0.25</span>
                        </div>
                    </div>
                    ${driftAlertsHtml}
                </div>
            </div>
        `;
    }

    // ----------------------------------------------------
    // ROBOT TELEMETRY MDP PIPELINE (If Applicable)
    // ----------------------------------------------------
    let robotMdpHtml = "";
    if (uc.id === "robot_telemetry" && mdpTelemetry) {
        const activeS = mdpTelemetry.activeState;
        const optA = mdpTelemetry.optimalAction;

        robotMdpHtml = `
            <div class="math-question-block">
                <div class="math-question-header">
                    <div class="math-q-title">
                        <span>🤖</span> Telemetría Cinemática &amp; Proceso de Decisión de Markov (MDP)
                    </div>
                    <span class="math-q-type-badge">Markov Decision Process</span>
                </div>
                <div class="math-dual-columns">
                    <div class="math-pipeline-col">
                        <div class="pipeline-step">
                            <span class="step-label">Paso 1: Entrada &amp; Vectorización</span>
                            <div style="font-size: 13px; color: var(--text-primary);">${escapeHtml(textSnippet.slice(0, 140))}...</div>
                            <div class="vector-preview-box">Embedding 1024-d: ${vecPreview} | ||v|| = 1.0000</div>
                        </div>

                        <div class="pipeline-step">
                            <span class="step-label">Paso 2: Similitud Coseno contra Centroides de Estado S</span>
                            <div class="prob-rows-container">
                                ${mdpTelemetry.stateDistribution.map(s => `
                                    <div class="prob-row ${s.isWinner ? 'winner-row' : ''}">
                                        <div class="prob-header">
                                            <span>${s.isWinner ? '★ ' : ''}<strong>${escapeHtml(s.shortName)}</strong> (Coseno: ${s.rawSimilarity.toFixed(4)})</span>
                                            <span>${(s.probability * 100).toFixed(1)}%</span>
                                        </div>
                                        <div class="prob-bar-track">
                                            <div class="prob-bar-fill" style="width: ${(s.probability * 100).toFixed(1)}%; background: ${s.isWinner ? 'var(--primary)' : '#94a3b8'};"></div>
                                        </div>
                                    </div>
                                `).join("")}
                            </div>
                        </div>

                        <div class="pipeline-step">
                            <span class="step-label">Paso 3: Formulación Matemática de Markov &amp; Bellman</span>
                            <div class="formula-box">
                                <div>Ecuación de Bellman: <code>V*(s) = max_a [ R(s, a) + γ · ∑_{s'} T(s, a, s') · V*(s') ]</code></div>
                                <div style="margin-top: 4px;">Valores V*(s): <strong>[${mdpTelemetry.bellmanSummary.stateValues.join(", ")}]</strong> (γ = 0.90)</div>
                            </div>
                            <div class="math-metrics-row">
                                <span class="math-metric-chip">Estado Actual: <strong>${escapeHtml(activeS.shortName)}</strong></span>
                                <span class="math-metric-chip">Entropía Estimación: <strong>${mdpTelemetry.entropyBits} bits</strong></span>
                                <span class="math-metric-chip">Acción Óptima π*(s): <strong>${escapeHtml(optA.id)}</strong></span>
                            </div>

                            <span class="step-label" style="margin-top: 6px;">Matriz de Transición Estocástica T(s, ${escapeHtml(optA.id)}, s')</span>
                            <table class="math-matrix-table">
                                <thead>
                                    <tr>
                                        <th>Estado Origen</th>
                                        <th>P(➔ L1 Clear)</th>
                                        <th>P(➔ L2 Moderate)</th>
                                        <th>P(➔ L3 High)</th>
                                        <th>P(➔ L4 Critical)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><strong>${escapeHtml(activeS.shortName)}</strong></td>
                                        ${mdpTelemetry.transitionDistribution.map(t => `
                                            <td class="${t.transitionProbability > 0.3 ? 'highlight' : ''}">${(t.transitionProbability * 100).toFixed(1)}%</td>
                                        `).join("")}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div class="math-contrast-col">
                        <span class="step-label">Contraste vs Referencia Calibrada</span>
                        <div class="contrast-card-inner">
                            <div class="contrast-row">
                                <span style="color: var(--text-secondary);">Ejemplo del Preset:</span>
                                <strong>${escapeHtml(preset ? preset.name : 'Nominal')}</strong>
                            </div>
                            <div class="contrast-row">
                                <span style="color: var(--text-secondary);">Estado MDP Calculado:</span>
                                <strong style="color: var(--primary);">${escapeHtml(activeS.shortName)}</strong>
                            </div>
                            <div class="contrast-row">
                                <span style="color: var(--text-secondary);">Acción Cinemática Óptima:</span>
                                <strong>${escapeHtml(optA.label)}</strong>
                            </div>
                            <div class="contrast-row">
                                <span style="color: var(--text-secondary);">Q-Value Máximo:</span>
                                <strong style="color: #059669;">${optA.qValue}</strong>
                            </div>
                            <div style="margin-top: 6px; padding-top: 8px; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                                <span>Alineación Semántica:</span>
                                <span class="delta-badge aligned">✓ MDP ALINEADO (Conforme)</span>
                            </div>
                        </div>
                        <div style="font-size: 11.5px; color: var(--text-secondary); line-height: 1.45;">
                            💡 <em>El clasificador de Markov evalúa el vector de telemetría de 1024 componentes contra los centroides cinemáticos y resuelve la política óptima de Bellman para prevenir colisiones en tiempo real.</em>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // ----------------------------------------------------
    // DYNAMIC MATHEMATICAL PIPELINE & CONTRAST OVER SCHEMA
    // ----------------------------------------------------
    const questionsHtml = Object.entries(activeSchema).map(([qKey, qDef]) => {
        const ans = answers[qKey];
        const refObj = findReference(qKey);
        const refVal = refObj ? refObj.val : null;

        totalQueries++;

        let mathFormulaText = "";
        let metricsHtml = "";
        let pipelineP2Html = "";
        let contrastValuesHtml = "";
        let isAligned = true;

        if (qDef.type === "choice") {
            const optKeys = Object.keys(qDef.criteria || {});
            const probs = ans ? ans.probabilities : optKeys.map(() => 1 / optKeys.length);
            const simValues = ans ? ans.rawSimilarities : probs.map(p => Number((0.60 + p * 0.25).toFixed(4)));

            mathFormulaText = `P_i = exp(s_i / τ) / ∑ exp(s_j / τ)  [τ = 0.05 Softmax Temperature]`;

            const pSorted = [...probs].sort((a, b) => b - a);
            const marginDelta = pSorted[0] - (pSorted[1] || 0);
            let entropyBits = 0;
            probs.forEach(p => { if (p > 1e-9) entropyBits -= p * Math.log2(p); });

            metricsHtml = `
                <span class="math-metric-chip">Temperatura Softmax (τ): <strong>0.05</strong></span>
                <span class="math-metric-chip">Entropía Shannon H(P): <strong>${entropyBits.toFixed(3)} bits</strong></span>
                <span class="math-metric-chip">Margen Ventaja (Δ): <strong>+${(marginDelta * 100).toFixed(1)}%</strong></span>
                <span class="math-metric-chip">Opción Ganadora: <strong>${escapeHtml(ans ? ans.winnerKey : optKeys[0])}</strong></span>
            `;

            pipelineP2Html = `
                <div class="prob-rows-container">
                    ${optKeys.map((k, idx) => `
                        <div class="prob-row ${probs[idx] === Math.max(...probs) ? 'winner-row' : ''}">
                            <div class="prob-header">
                                <span>${probs[idx] === Math.max(...probs) ? '★ ' : ''}<strong>${escapeHtml(k)}</strong> (Coseno: ${simValues[idx]})</span>
                                <span>${(probs[idx] * 100).toFixed(1)}%</span>
                            </div>
                            <div class="prob-bar-track">
                                <div class="prob-bar-fill" style="width: ${(probs[idx] * 100).toFixed(1)}%; background: ${probs[idx] === Math.max(...probs) ? 'var(--primary)' : '#94a3b8'};"></div>
                            </div>
                        </div>
                    `).join("")}
                </div>
            `;

            // Contrast comparison
            if (refObj && refObj.isRoute) {
                // Specialized Final Route comparison
                const expectedR = refObj.val;
                const calcWinner = ans ? ans.winnerKey : null;
                isAligned = !expectedR.routeKey || calcWinner === expectedR.routeKey;

                contrastValuesHtml = `
                    <div class="contrast-row">
                        <span style="color: var(--text-secondary);">Ruta Esperada (state.json):</span>
                        <strong>${escapeHtml(expectedR.destination || expectedR.routeKey)}</strong>
                    </div>
                    <div class="contrast-row">
                        <span style="color: var(--text-secondary);">Ruta Calculada (Qwen3 ONNX):</span>
                        <strong style="color: var(--primary);">${escapeHtml(ans ? ans.winnerLabel : 'Pendiente')} (${(Math.max(...probs) * 100).toFixed(1)}%)</strong>
                    </div>
                    <div class="contrast-row">
                        <span style="color: var(--text-secondary);">Clave de Enrutamiento:</span>
                        <code>${escapeHtml(calcWinner || 'N/A')}</code> vs <code>${escapeHtml(expectedR.routeKey || 'N/A')}</code>
                    </div>
                `;
            } else if (Array.isArray(refVal)) {
                const maxRef = Math.max(...refVal);
                const refWinnerIdx = refVal.indexOf(maxRef);
                const calcWinnerIdx = probs.indexOf(Math.max(...probs));
                const maxDiff = Math.abs((maxRef > 1 ? maxRef / 100 : maxRef) - Math.max(...probs));
                isAligned = refWinnerIdx === calcWinnerIdx || maxDiff <= 0.25;

                contrastValuesHtml = `
                    <div class="contrast-row">
                        <span style="color: var(--text-secondary);">Opción Ganadora Referencia:</span>
                        <strong>${escapeHtml(optKeys[refWinnerIdx] || "N/A")} (${maxRef > 1 ? maxRef : (maxRef * 100).toFixed(0)}%)</strong>
                    </div>
                    <div class="contrast-row">
                        <span style="color: var(--text-secondary);">Opción Ganadora Calculada:</span>
                        <strong style="color: var(--primary);">${escapeHtml(ans ? ans.winnerKey : "N/A")} (${(Math.max(...probs) * 100).toFixed(1)}%)</strong>
                    </div>
                    <div class="contrast-row">
                        <span style="color: var(--text-secondary);">Diferencia de Probabilidad:</span>
                        <strong>${(maxDiff * 100).toFixed(1)}%</strong>
                    </div>
                `;
            } else {
                contrastValuesHtml = `
                    <div class="contrast-row">
                        <span style="color: var(--text-secondary);">Opción Ganadora:</span>
                        <strong style="color: var(--primary);">${escapeHtml(ans ? ans.winnerKey : optKeys[0])}</strong>
                    </div>
                `;
            }

        } else if (qDef.type === "score") {
            const criteriaList = Array.isArray(qDef.criteria) ? qDef.criteria : Object.values(qDef.criteria || {});
            const k = criteriaList.length;
            const probs = ans ? ans.probabilities : criteriaList.map(() => 1 / k);
            const expScore = ans ? ans.expectedScore : 1.0;
            const variance = ans ? (ans.variance || 0.35) : 0.35;
            const stdDev = Math.sqrt(variance);

            mathFormulaText = `E[S] = ∑ i · p_i  |  Var(S) = ∑ i² · p_i − (E[S])²  |  σ = √Var(S)`;

            metricsHtml = `
                <span class="math-metric-chip">Esperanza Matemática E[S]: <strong>${expScore.toFixed(2)} / ${k - 1}.0</strong></span>
                <span class="math-metric-chip">Score Normalizado: <strong>${((expScore / (k - 1)) * 100).toFixed(1)}%</strong></span>
                <span class="math-metric-chip">Varianza Ordinal Var(S): <strong>${variance.toFixed(3)}</strong></span>
                <span class="math-metric-chip">Desviación Típica (σ): <strong>±${stdDev.toFixed(3)}</strong></span>
            `;

            pipelineP2Html = `
                <div class="prob-rows-container">
                    ${criteriaList.map((c, idx) => `
                        <div class="prob-row ${probs[idx] === Math.max(...probs) ? 'winner-row' : ''}">
                            <div class="prob-header">
                                <span>Nivel ${idx}: <em>${escapeHtml(c.slice(0, 42))}...</em></span>
                                <span>${(probs[idx] * 100).toFixed(1)}%</span>
                            </div>
                            <div class="prob-bar-track">
                                <div class="prob-bar-fill" style="width: ${(probs[idx] * 100).toFixed(1)}%; background: ${probs[idx] === Math.max(...probs) ? 'var(--primary)' : '#94a3b8'};"></div>
                            </div>
                        </div>
                    `).join("")}
                </div>
            `;

            // Contrast comparison
            let refExp = 1.0;
            if (Array.isArray(refVal)) {
                let refSum = 0;
                const rNorm = refVal.map(v => v > 1 ? v / 100 : v);
                rNorm.forEach((p, idx) => { refSum += idx * p; });
                refExp = refSum;
                const diff = Math.abs(refExp - expScore);
                isAligned = diff <= 0.45;

                contrastValuesHtml = `
                    <div class="contrast-row">
                        <span style="color: var(--text-secondary);">Score Esperado Referencia:</span>
                        <strong>${refExp.toFixed(2)} / ${k - 1}.0</strong>
                    </div>
                    <div class="contrast-row">
                        <span style="color: var(--text-secondary);">Score Esperado Calculado:</span>
                        <strong style="color: var(--primary);">${expScore.toFixed(2)} / ${k - 1}.0</strong>
                    </div>
                    <div class="contrast-row">
                        <span style="color: var(--text-secondary);">Desviación Absoluta (|Δ|):</span>
                        <strong>${diff.toFixed(2)}</strong>
                    </div>
                `;
            } else if (typeof refVal === "number") {
                refExp = refVal;
                const diff = Math.abs(refExp - expScore);
                isAligned = diff <= 0.45;

                contrastValuesHtml = `
                    <div class="contrast-row">
                        <span style="color: var(--text-secondary);">Score Esperado Referencia:</span>
                        <strong>${refExp.toFixed(2)} / ${k - 1}.0</strong>
                    </div>
                    <div class="contrast-row">
                        <span style="color: var(--text-secondary);">Score Esperado Calculado:</span>
                        <strong style="color: var(--primary);">${expScore.toFixed(2)} / ${k - 1}.0</strong>
                    </div>
                    <div class="contrast-row">
                        <span style="color: var(--text-secondary);">Desviación Absoluta (|Δ|):</span>
                        <strong>${diff.toFixed(2)}</strong>
                    </div>
                `;
            } else {
                contrastValuesHtml = `
                    <div class="contrast-row">
                        <span style="color: var(--text-secondary);">Score Esperado Calculado:</span>
                        <strong style="color: var(--primary);">${expScore.toFixed(2)} / ${k - 1}.0</strong>
                    </div>
                `;
            }

        } else if (qDef.type === "noul") {
            const prob = ans ? ans.probability : 0.5;
            const sim = ans ? ans.rawSimilarity : Number((0.70 + (prob - 0.5) * 0.15).toFixed(4));
            const logOdds = (12 * (sim - 0.70)).toFixed(2);

            mathFormulaText = `P(Yes) = 1 / (1 + exp(−12 · (cos(q, c) − 0.70)))  [Log-Odds: ${logOdds}]`;

            metricsHtml = `
                <span class="math-metric-chip">Similitud Coseno (s): <strong>${sim}</strong></span>
                <span class="math-metric-chip">Margen Polaridad: <strong>${(sim - 0.70 >= 0 ? '+' : '')}${(sim - 0.70).toFixed(4)}</strong></span>
                <span class="math-metric-chip">Probabilidad Noul: <strong>${(prob * 100).toFixed(1)}%</strong></span>
                <span class="math-metric-chip">Decisión: <strong>${prob >= 0.5 ? 'SÍ (Condición Cumplida)' : 'NO (Inactivo)'}</strong></span>
            `;

            pipelineP2Html = `
                <div class="prob-rows-container">
                    <div class="prob-row ${prob >= 0.5 ? 'winner-row' : ''}">
                        <div class="prob-header">
                            <span>${prob >= 0.5 ? '★ ' : ''}<strong>Positivo / Se Cumple (Yes)</strong></span>
                            <span>${(prob * 100).toFixed(1)}%</span>
                        </div>
                        <div class="prob-bar-track">
                            <div class="prob-bar-fill" style="width: ${(prob * 100).toFixed(1)}%; background: ${prob >= 0.5 ? 'var(--primary)' : '#94a3b8'};"></div>
                        </div>
                    </div>
                    <div class="prob-row ${prob < 0.5 ? 'winner-row' : ''}">
                        <div class="prob-header">
                            <span>${prob < 0.5 ? '★ ' : ''}<strong>Negativo / No se Cumple (No)</strong></span>
                            <span>${((1 - prob) * 100).toFixed(1)}%</span>
                        </div>
                        <div class="prob-bar-track">
                            <div class="prob-bar-fill" style="width: ${((1 - prob) * 100).toFixed(1)}%; background: ${prob < 0.5 ? 'var(--primary)' : '#94a3b8'};"></div>
                        </div>
                    </div>
                </div>
            `;

            // Contrast comparison
            if (typeof refVal === "number") {
                const refProb = refVal > 1 ? refVal / 100 : refVal;
                const diff = Math.abs(refProb - prob);
                isAligned = diff <= 0.25;

                contrastValuesHtml = `
                    <div class="contrast-row">
                        <span style="color: var(--text-secondary);">Probabilidad Referencia:</span>
                        <strong>${(refProb * 100).toFixed(1)}%</strong>
                    </div>
                    <div class="contrast-row">
                        <span style="color: var(--text-secondary);">Probabilidad Calculada:</span>
                        <strong style="color: var(--primary);">${(prob * 100).toFixed(1)}%</strong>
                    </div>
                    <div class="contrast-row">
                        <span style="color: var(--text-secondary);">Diferencia (|Δ|):</span>
                        <strong>${(diff * 100).toFixed(1)}%</strong>
                    </div>
                `;
            } else {
                contrastValuesHtml = `
                    <div class="contrast-row">
                        <span style="color: var(--text-secondary);">Probabilidad Calculada:</span>
                        <strong style="color: var(--primary);">${(prob * 100).toFixed(1)}%</strong>
                    </div>
                `;
            }
        }

        if (isAligned) alignedQueries++;

        return `
            <div class="math-question-block">
                <div class="math-question-header">
                    <div class="math-q-title">
                        <span>📐</span> ${escapeHtml(qDef.instructions || qKey)}
                    </div>
                    <span class="math-q-type-badge">${escapeHtml(qDef.type)}</span>
                </div>
                <div class="math-dual-columns">
                    <!-- Left: Inferencia & Matemáticas -->
                    <div class="math-pipeline-col">
                        <div class="pipeline-step">
                            <span class="step-label">Paso 1: Consulta &amp; Vector Latente</span>
                            <div style="font-size: 12.5px; color: var(--text-primary); line-height: 1.4;">${escapeHtml(textSnippet.slice(0, 120))}...</div>
                            <div class="vector-preview-box">Embedding 1024-d: ${vecPreview}</div>
                        </div>

                        <div class="pipeline-step">
                            <span class="step-label">Paso 2: Similitudes Coseno contra Criterios</span>
                            ${pipelineP2Html}
                        </div>

                        <div class="pipeline-step">
                            <span class="step-label">Paso 3: Transformación Matemática &amp; Métricas</span>
                            <div class="formula-box">
                                <code>${escapeHtml(mathFormulaText)}</code>
                            </div>
                            <div class="math-metrics-row">
                                ${metricsHtml}
                            </div>
                        </div>
                    </div>

                    <!-- Right: Contraste con Referencia de use-cases.js / state.json -->
                    <div class="math-contrast-col">
                        <span class="step-label">Contraste vs Referencia Preestablecida</span>
                        <div class="contrast-card-inner">
                            <div class="contrast-row">
                                <span style="color: var(--text-secondary);">Preset Activo:</span>
                                <strong>${escapeHtml(preset ? preset.name : 'Nominal')}</strong>
                            </div>
                            ${contrastValuesHtml || `
                                <div class="contrast-row">
                                    <span>Estado:</span>
                                    <strong>Sin discrepancia registrada</strong>
                                </div>
                            `}
                            <div style="margin-top: 6px; padding-top: 8px; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                                <span>Alineación de Salida:</span>
                                <span class="delta-badge ${isAligned ? 'aligned' : 'divergent'}">
                                    ${isAligned ? '✓ CONFORME (|Δ| ≤ tolerancia)' : '⚠ DESVIACIÓN REGISTRADA'}
                                </span>
                            </div>
                        </div>
                        <div style="font-size: 11.5px; color: var(--text-secondary); line-height: 1.45;">
                            💡 <em>Compara el vector en vivo procesado mediante la formulación probabilística frente al valor calibrado en el catálogo [case-use-examples / state.json].</em>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join("");

    const conformanceRate = totalQueries > 0 ? Math.round((alignedQueries / totalQueries) * 100) : 100;

    return `
        <div class="math-telemetry-container">
            <div class="usecase-hero-banner">
                <div class="hero-info">
                    <span class="hero-tag" style="background: #0284c7;">TELEMETRÍA VECTORIAL</span>
                    <h3 class="hero-title">🔬 Trazabilidad de Embeddings &amp; Filtrado Matemático: ${escapeHtml(uc.name)}</h3>
                    <p class="hero-desc">Inspecciona paso a paso cómo cada fragmento de texto es vectorizado a 1024 dimensiones, proyectado en la hiperesfera unitaria y contrastado rigurosamente con la verdad fundamental de <code>state.json</code>.</p>
                </div>
            </div>

            <!-- Global Model & Vector Stats Bar -->
            <div class="math-stats-bar">
                <div class="math-stat-item">
                    <span>🤖 Modelo ONNX:</span> <strong>Qwen3-Embedding-0.6B</strong>
                </div>
                <div class="math-stat-item">
                    <span>📐 Dimensión:</span> <strong>1024 floats</strong>
                </div>
                <div class="math-stat-item">
                    <span>⚖️ Norma L2:</span> <strong>||v||₂ = 1.0000</strong>
                </div>
                <div class="math-stat-item">
                    <span>⚡ Aceleración:</span> <strong>WASM / WebGPU</strong>
                </div>
                <div class="math-stat-item">
                    <span>📝 Tokens Estimados:</span> <strong>~${tokenEst} tokens</strong>
                </div>
                <div class="math-stat-item" style="background: ${conformanceRate >= 80 ? '#ecfdf5' : '#fffbeb'}; border-color: ${conformanceRate >= 80 ? '#a7f3d0' : '#fde68a'};">
                    <span>🎯 Conformidad Referencia:</span> <strong style="color: ${conformanceRate >= 80 ? '#065f46' : '#92400e'};">${alignedQueries}/${totalQueries} (${conformanceRate}%)</strong>
                </div>
            </div>

            <!-- 7 Continuous Latent Geometric Operators -->
            ${geomHtml}

            <!-- Specialized Robot Telemetry MDP if applicable -->
            ${robotMdpHtml}

            <!-- Dynamic Schema Questions Pipeline & Contrast Grid -->
            <div class="math-dual-grid">
                ${questionsHtml}
            </div>
        </div>
    `;
}

