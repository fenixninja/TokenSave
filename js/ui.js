/**
 * ui.js - TypeSafe AI Modern UI Architecture & Accordion Renderers
 *
 * Implements:
 * 1. Real-time JSON syntax & schema validation for State & Questions
 * 2. Synchronized line numbers gutter with error line highlights
 * 3. TypeSafe AI Expandable Accordion response viewer (Choice, Score, Noul)
 * 4. Raw JSON response viewer with syntax formatting
 * 5. Primitive template inserters (Noul, Score, Choice)
 * 6. Visual feedback toasts and layout view toggles
 */

export function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Validates State JSON syntax and structure.
 *
 * @param {string} rawText
 * @returns {{ isValid: boolean, data: any, errors: Array<{ line: number, message: string }> }}
 */
export function validateStateJson(rawText) {
    if (!rawText || !rawText.trim()) {
        return {
            isValid: false,
            data: null,
            errors: [{ line: 1, message: "State content is empty." }]
        };
    }

    try {
        const parsed = JSON.parse(rawText);
        if (typeof parsed !== "object" || parsed === null) {
            return {
                isValid: false,
                data: null,
                errors: [{ line: 1, message: "State must be a valid JSON object or structure." }]
            };
        }
        return { isValid: true, data: parsed, errors: [] };
    } catch (err) {
        const line = extractLineFromError(err.message, rawText);
        return {
            isValid: false,
            data: null,
            errors: [{ line, message: `JSON syntax error: ${err.message}` }]
        };
    }
}

/**
 * Validates Questions JSON schema and primitive typing.
 *
 * @param {string} rawText
 * @returns {{ isValid: boolean, data: any, errors: Array<{ line: number, message: string }> }}
 */
export function validateQueryJson(rawText) {
    if (!rawText || !rawText.trim()) {
        return {
            isValid: false,
            data: null,
            errors: [{ line: 1, message: "Questions content is empty." }]
        };
    }

    let parsed;
    try {
        parsed = JSON.parse(rawText);
    } catch (err) {
        const line = extractLineFromError(err.message, rawText);
        return {
            isValid: false,
            data: null,
            errors: [{ line, message: `JSON syntax error: ${err.message}` }]
        };
    }

    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        return {
            isValid: false,
            data: null,
            errors: [{ line: 1, message: "Questions must be a JSON object with question keys." }]
        };
    }

    const errors = [];
    const validTypes = new Set(["choice", "score", "noul", "bool"]);
    const lines = rawText.split("\n");

    for (const [key, q] of Object.entries(parsed)) {
        const keyLine = findKeyLineNumber(lines, key);

        if (typeof q !== "object" || q === null) {
            errors.push({
                line: keyLine,
                message: `Question '${key}' must be an object with { type, instructions, criteria }.`
            });
            continue;
        }

        const type = String(q.type || "").toLowerCase();
        if (!validTypes.has(type)) {
            errors.push({
                line: keyLine,
                message: `Question '${key}': Unknown primitive type '${q.type}'. Must be 'choice', 'score', or 'noul/bool'.`
            });
        }

        const hasInstructions = (typeof q.instructions === "string" && q.instructions.trim().length > 0) ||
            (typeof q.instructions === "object" && q.instructions !== null && Object.keys(q.instructions).length > 0);
        if (!hasInstructions) {
            errors.push({
                line: keyLine,
                message: `Question '${key}': Required field 'instructions' is missing or empty.`
            });
        }

        const isNoul = type === "noul" || type === "bool";
        if (!isNoul) {
            if (!q.criteria || typeof q.criteria !== "object") {
                errors.push({
                    line: keyLine,
                    message: `Question '${key}': Missing 'criteria' object with evaluation definitions.`
                });
            } else {
                const numCriteria = Array.isArray(q.criteria) ? q.criteria.length : Object.keys(q.criteria).length;
                if (type === "choice" && numCriteria < 2) {
                    errors.push({
                        line: keyLine,
                        message: `Question '${key}' (Choice): Must have at least 2 options in 'criteria' (found ${numCriteria}).`
                    });
                } else if (type === "score" && numCriteria < 2) {
                    errors.push({
                        line: keyLine,
                        message: `Question '${key}' (Score): Must define at least 2 levels in 'criteria'.`
                    });
                }
            }
        }
    }

    return {
        isValid: errors.length === 0,
        data: parsed,
        errors
    };
}

/**
 * Extracts line number from JSON parse exception string.
 */
function extractLineFromError(errMsg, text) {
    const match = errMsg.match(/line (\d+)/i) || errMsg.match(/position (\d+)/i);
    if (!match) return 1;

    if (errMsg.toLowerCase().includes("position")) {
        const pos = parseInt(match[1], 10);
        if (!isNaN(pos)) {
            const upToPos = text.slice(0, pos);
            return upToPos.split("\n").length;
        }
    }

    const line = parseInt(match[1], 10);
    return isNaN(line) ? 1 : line;
}

/**
 * Finds the line number of a given key in source lines.
 */
function findKeyLineNumber(lines, key) {
    const target = `"${key}"`;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(target)) {
            return i + 1;
        }
    }
    return 1;
}

/**
 * Synchronizes the line number gutter with textarea content and highlights error lines.
 *
 * @param {HTMLTextAreaElement} textareaEl
 * @param {HTMLElement} gutterEl
 * @param {Array<{ line: number }>} [errors=[]]
 */
export function updateEditorGutter(textareaEl, gutterEl, errors = []) {
    if (!textareaEl || !gutterEl) return;
    const lines = textareaEl.value.split("\n");
    const count = Math.max(1, lines.length);

    const errorLineSet = new Set(errors.map(e => e.line));
    let html = "";
    for (let i = 1; i <= count; i++) {
        const isError = errorLineSet.has(i);
        html += `<div class="gutter-line ${isError ? 'error-line' : ''}">${i}</div>`;
    }
    gutterEl.innerHTML = html;

    // Synchronize scroll
    gutterEl.scrollTop = textareaEl.scrollTop;
}

/**
 * Formats JSON string to 2 spaces.
 */
export function formatJson(rawText) {
    try {
        const parsed = JSON.parse(rawText);
        return JSON.stringify(parsed, null, 2);
    } catch (_) {
        return rawText;
    }
}

/**
 * Renders the Accordion Response Table in TypeSafe AI format.
 *
 * @param {Array<any>} results - Evaluated question results
 * @param {HTMLElement} containerEl - Target element
 */
export function renderResponseAccordion(results, containerEl) {
    if (!containerEl) return;
    if (!results || results.length === 0) {
        containerEl.innerHTML = `
            <div class="response-empty-state">
                <div class="empty-state-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                    </svg>
                </div>
                <div class="empty-state-title">Blank Response Panel</div>
                <div class="empty-state-subtitle">
                    Click <strong>"Run request <kbd>⌘↵</kbd>"</strong> to run Fenix Vector &amp; POMDP inference.
                </div>
            </div>
        `;
        return;
    }

    const rowsHtml = results.map((res, idx) => {
        const isExpanded = idx === 0; // First row expanded by default
        const typeNorm = (res.type || "choice").toLowerCase();
        const badgeClass = (typeNorm === "bool" || typeNorm === "noul") ? "noul" : typeNorm;
        const displayType = (typeNorm === "bool" || typeNorm === "noul") ? "Noul" : (typeNorm === "score" ? "Score" : "Choice");

        // Column 2: Fenix Vector & POMDP summary representation
        let modelSummaryHtml = "";
        let expandedContentHtml = "";
        let typeSubtext = "";

        if (displayType === "Choice") {
            const winner = res.winnerOption || (res.options && res.options[0]) || { key: "N/A", pct: 0 };
            const subOptions = (res.options || [])
                .filter(o => o.key !== winner.key)
                .map(o => `${escapeHtml(o.key)} ${o.pct.toFixed(0)}%`)
                .join(" &nbsp; ");

            const confPct = Math.round((res.confidence || 0) * 100);
            typeSubtext = `${(res.options || []).length} options`;

            modelSummaryHtml = `
                <div class="model-winner-line">
                    <span>${escapeHtml(winner.key)}</span>
                    <span>${winner.pct.toFixed(0)}%</span>
                    <span class="pie-indicator ${winner.pct > 75 ? 'full' : ''}"></span>
                </div>
                ${subOptions ? `<div class="model-sub-options">${subOptions}</div>` : ''}
                <div class="confidence-indicator-text">Confidence: ${confPct}%</div>
            `;

            // Expanded Breakdown
            const optionRows = (res.options || []).map(opt => `
                <div class="breakdown-row">
                    <div class="breakdown-label">
                        <strong>${escapeHtml(opt.key)}</strong>: ${escapeHtml(opt.description || opt.label || "")}
                    </div>
                    <div class="breakdown-level-num"></div>
                    <div class="breakdown-bar-track">
                        <div class="breakdown-bar-fill" style="width: ${opt.pct}%;"></div>
                    </div>
                    <div class="breakdown-pct">${opt.pct.toFixed(0)}%</div>
                </div>
            `).join("");

            expandedContentHtml = `
                <div class="breakdown-table">
                    ${optionRows}
                </div>
                <div class="math-sub-metrics">
                    <span>Shannon Entropy: <strong>${res.entropyBits || "0.00"} bits</strong></span>
                    <span>Margin Delta: <strong>${((res.marginDelta || 0) * 100).toFixed(1)}%</strong></span>
                    <span>Calibrated Confidence: <strong>${confPct}%</strong></span>
                </div>
            `;
        } else if (displayType === "Score") {
            const expected = Number(res.expectedScore || 0).toFixed(2);
            const maxLevel = res.maxLevel || (res.levels ? res.levels.length - 1 : 2);
            const confPct = Math.round((res.confidence || 0.5) * 100);
            typeSubtext = `${(res.levels || []).length || (maxLevel + 1)} levels · 0–${maxLevel}`;

            modelSummaryHtml = `
                <div class="model-winner-line">
                    <span>${expected} of ${maxLevel}</span>
                </div>
                <div class="confidence-indicator-text">Confidence: ${confPct}%</div>
            `;

            // Expanded Breakdown (matches screenshot 2)
            const levelRows = (res.levels || []).map((lvl, lIdx) => `
                <div class="breakdown-row">
                    <div class="breakdown-label">${escapeHtml(lvl.description || lvl.label || `Level ${lIdx}`)}</div>
                    <div class="breakdown-level-num">${lIdx}</div>
                    <div class="breakdown-bar-track">
                        <div class="breakdown-bar-fill" style="width: ${lvl.pct}%;"></div>
                    </div>
                    <div class="breakdown-pct">${lvl.pct.toFixed(0)}%</div>
                </div>
            `).join("");

            expandedContentHtml = `
                <div class="breakdown-table">
                    ${levelRows}
                </div>
                <div class="math-sub-metrics">
                    <span>Expected Score E[S]: <strong>${expected}</strong></span>
                    <span>Variance Var(S): <strong>${Number(res.variance || 0).toFixed(4)}</strong></span>
                    <span>StdDev σ: <strong>${Number(res.stdDev || 0).toFixed(3)}</strong></span>
                </div>
            `;
        } else {
            // Noul (Bool)
            const truePct = Math.round((res.probabilityTrue || res.probability || 0.5) * 100);
            const falsePct = 100 - truePct;
            typeSubtext = `Bool`;

            modelSummaryHtml = `
                <div class="model-winner-line">
                    <span>${truePct}% true</span>
                </div>
                <div class="confidence-indicator-text">${falsePct}% false</div>
            `;

            expandedContentHtml = `
                <div class="noul-meter-box">
                    <div style="font-weight: 600; font-size: 12.5px;">
                        <span>${truePct}% true</span>
                        <span style="color: var(--text-muted); font-weight: normal; margin-left: 8px;">${falsePct}% false</span>
                    </div>

                    <div class="noul-track-container">
                        <div class="noul-line-track">
                            <div class="noul-dot-indicator" style="left: ${truePct}%;"></div>
                        </div>
                    </div>

                    <div class="noul-criteria-list">
                        <div class="noul-criteria-item">
                            <span class="noul-tag true">True</span>
                            <span class="noul-desc">${escapeHtml(res.trueCriteria || "Involves executing an outgoing financial payment or high risk.")}</span>
                        </div>
                        <div class="noul-criteria-item">
                            <span class="noul-tag false">False</span>
                            <span class="noul-desc">${escapeHtml(res.falseCriteria || "Read-only balance inspection or low-stakes informational inquiry.")}</span>
                        </div>
                    </div>

                    <div class="math-sub-metrics">
                        <span>P(True): <strong>${(truePct / 100).toFixed(4)}</strong></span>
                        <span>Odds Ratio: <strong>${falsePct > 0 ? (truePct / falsePct).toFixed(2) : "∞"}</strong></span>
                    </div>
                </div>
            `;
        }

        const instructionsStr = typeof res.instructions === "object" && res.instructions !== null
            ? (res.instructions.question || res.instructions.text || JSON.stringify(res.instructions))
            : String(res.instructions || "");

        return `
            <div class="accordion-item ${isExpanded ? 'expanded' : ''}" data-key="${escapeHtml(res.key)}">
                <div class="accordion-row-header" data-toggle="accordion">
                    <div class="col-key col-key-content">
                        <svg class="accordion-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                        <div class="key-text-wrapper">
                            <span class="key-title">${escapeHtml(res.key)}</span>
                            <span class="key-instructions">${escapeHtml(instructionsStr)}</span>
                        </div>
                    </div>

                    <div class="col-model col-model-content">
                        ${modelSummaryHtml}
                    </div>

                    <div class="col-type col-type-content">
                        <span class="primitive-badge ${badgeClass}">${displayType}</span>
                        ${typeSubtext ? `<span class="primitive-levels-count">${typeSubtext}</span>` : ''}
                    </div>
                </div>

                <div class="accordion-body">
                    ${expandedContentHtml}
                </div>
            </div>
        `;
    }).join("");

    containerEl.innerHTML = rowsHtml;

    // Attach row toggle listeners
    containerEl.querySelectorAll("[data-toggle='accordion']").forEach(headerEl => {
        headerEl.addEventListener("click", () => {
            const item = headerEl.closest(".accordion-item");
            if (item) {
                item.classList.toggle("expanded");
            }
        });
    });
}

/**
 * Inserts a primitive template snippet at cursor position in textarea.
 */
export function insertPrimitiveSnippet(textareaEl, type) {
    if (!textareaEl) return;
    const pos = textareaEl.selectionStart || textareaEl.value.length;
    let snippet = "";

    if (type === "noul") {
        snippet = `\n  "new_condition_check": {
    "type": "noul",
    "instructions": "Is this condition satisfied by the current state?",
    "criteria": {
      "true": "The condition is fully met with explicit supporting evidence.",
      "false": "Condition is not met or evidence is insufficient."
    }
  },`;
    } else if (type === "score") {
        snippet = `\n  "new_score_rubric": {
    "type": "score",
    "instructions": "At what level is this dimension evaluated?",
    "criteria": {
      "0": "Low: Negligible risk or baseline minimal tier.",
      "1": "Medium: Standard operational or moderate tier.",
      "2": "High: Critical or high-priority tier."
    }
  },`;
    } else {
        snippet = `\n  "new_choice_selection": {
    "type": "choice",
    "instructions": "Which category best classifies this request?",
    "criteria": {
      "option_a": "Description for Option A.",
      "option_b": "Description for Option B.",
      "other": "Ambiguous case or out of domain."
    }
  },`;
    }

    const text = textareaEl.value;
    textareaEl.value = text.slice(0, pos) + snippet + text.slice(pos);
    textareaEl.selectionStart = textareaEl.selectionEnd = pos + snippet.length;
    textareaEl.focus();
}

/**
 * Displays a non-intrusive toast notification.
 */
export function showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span>${type === "success" ? "✓" : type === "error" ? "✕" : "ℹ"}</span>
        <span>${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(10px)";
        setTimeout(() => toast.remove(), 250);
    }, 3200);
}
