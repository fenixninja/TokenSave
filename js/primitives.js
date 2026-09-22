/**
 * primitives.js - Embeding / Jev Decision Primitives & Rigorous Mathematical Calculations
 *
 * Implements:
 * 1. Choice: pick 1 of N options, with probability distribution, confidence, Shannon entropy (bits),
 *    normalized entropy, and top-1 vs top-2 margin delta.
 * 2. Score: ordered multi-level discrete dimension (0..K-1), with expected continuous position E[S],
 *    normalized score, second-order variance Var(S), and standard deviation sigma.
 * 3. Noul: probability of condition holding (0.0 to 1.0) with contrastive Bayesian log-odds.
 * 4. Softmax with Temperature scaling for calibrated probability amplification.
 * 5. Composite Scoring: MCDA (Multiple-Criteria Decision Analysis) combining arithmetic mean,
 *    zero-penalizing geometric mean, and TOPSIS ideal-solution distance.
 * 6. Confidence Gating: risk-based threshold evaluation and Shannon entropy gating.
 */

/**
 * Calculates Embeding Choice confidence and Shannon entropy from a probability distribution.
 * Formula: max(0, min(1, (N * p_max - 1) / (N - 1)))
 * Shannon Entropy: H(P) = -sum(p_i * log2(p_i))
 * Margin: Delta = p_max - p_second
 *
 * @param {number[]} probabilities - Array of probabilities (in 0..1 or 0..100)
 * @returns {number} Confidence value between 0.00 and 1.00
 */
export function calculateChoiceConfidence(probabilities) {
    if (!Array.isArray(probabilities) || probabilities.length === 0) return 0;
    const n = probabilities.length;
    if (n === 1) return 1.0;

    const sum = probabilities.reduce((a, b) => a + b, 0);
    const normalized = sum > 1.5 
        ? probabilities.map(p => p / 100) 
        : (sum > 0 ? probabilities.map(p => p / sum) : probabilities.map(() => 1 / n));

    const pMax = Math.max(...normalized);
    const conf = (n * pMax - 1) / (n - 1);
    return Number(Math.max(0, Math.min(1, conf)).toFixed(4));
}

/**
 * Extended Choice analysis including Shannon entropy and margin metrics.
 *
 * @param {number[]} probabilities
 * @returns {{ confidence: number, entropyBits: number, normalizedEntropy: number, marginDelta: number, top1: number, top2: number }}
 */
export function analyzeChoiceDistribution(probabilities) {
    if (!Array.isArray(probabilities) || probabilities.length === 0) {
        return { confidence: 0, entropyBits: 0, normalizedEntropy: 1, marginDelta: 0, top1: 0, top2: 0 };
    }
    const n = probabilities.length;
    const sum = probabilities.reduce((a, b) => a + b, 0);
    const p = sum > 1.5 ? probabilities.map(v => v / 100) : (sum > 0 ? probabilities.map(v => v / sum) : probabilities.map(() => 1 / n));

    // Sort descending
    const sorted = [...p].sort((a, b) => b - a);
    const top1 = sorted[0] || 0;
    const top2 = sorted[1] || 0;
    const marginDelta = Number((top1 - top2).toFixed(4));

    // Shannon entropy in bits (base 2)
    let entropyBits = 0;
    for (let i = 0; i < n; i++) {
        if (p[i] > 1e-12) {
            entropyBits -= p[i] * Math.log2(p[i]);
        }
    }
    const maxEntropy = Math.log2(Math.max(2, n));
    const normalizedEntropy = Number((entropyBits / maxEntropy).toFixed(4));

    const confidence = calculateChoiceConfidence(probabilities);

    return {
        confidence,
        entropyBits: Number(entropyBits.toFixed(4)),
        normalizedEntropy,
        marginDelta,
        top1: Number(top1.toFixed(4)),
        top2: Number(top2.toFixed(4))
    };
}

/**
 * Calculates continuous expected score, normalized score, variance, and standard deviation
 * from probability distribution over ordered levels 0..K-1.
 *
 * Formula:
 * E[S] = sum(i * p_i)
 * Var(S) = sum((i - E[S])^2 * p_i) = sum(i^2 * p_i) - (E[S])^2
 * Sigma = sqrt(Var(S))
 *
 * @param {number[]} probabilities - Probabilities for each level 0..K-1 (either in 0..1 or 0..100)
 * @returns {{ expectedScore: number, normalizedScore: number, variance: number, stdDev: number, maxLevel: number, isUnimodal: boolean }}
 */
export function calculateScoreValue(probabilities) {
    if (!Array.isArray(probabilities) || probabilities.length === 0) {
        return { expectedScore: 0, normalizedScore: 0, variance: 0, stdDev: 0, maxLevel: 0, isUnimodal: true };
    }
    const k = probabilities.length;
    const maxLevel = k - 1;
    if (maxLevel === 0) {
        return { expectedScore: 0, normalizedScore: 1.0, variance: 0, stdDev: 0, maxLevel: 0, isUnimodal: true };
    }

    const sum = probabilities.reduce((a, b) => a + b, 0);
    const p = sum > 1.5 
        ? probabilities.map(v => v / 100) 
        : (sum > 0 ? probabilities.map(v => v / sum) : probabilities.map(() => 1 / k));

    // First moment: E[S] = sum(i * p_i)
    let expectedScore = 0;
    // Second moment: E[S^2] = sum(i^2 * p_i)
    let secondMoment = 0;

    for (let i = 0; i < k; i++) {
        expectedScore += i * p[i];
        secondMoment += (i * i) * p[i];
    }

    const normalizedScore = expectedScore / maxLevel;

    // Variance Var(S) = E[S^2] - (E[S])^2
    const variance = Math.max(0, secondMoment - (expectedScore * expectedScore));
    const stdDev = Math.sqrt(variance);

    // Unimodal check: check if probabilities have at most one local peak
    let peaks = 0;
    for (let i = 0; i < k; i++) {
        const left = i > 0 ? p[i - 1] : -Infinity;
        const right = i < k - 1 ? p[i + 1] : -Infinity;
        if (p[i] >= left && p[i] >= right && (p[i] > left || p[i] > right)) {
            peaks++;
        }
    }

    return {
        expectedScore: Number(expectedScore.toFixed(3)),
        normalizedScore: Number(normalizedScore.toFixed(4)),
        variance: Number(variance.toFixed(4)),
        stdDev: Number(stdDev.toFixed(4)),
        maxLevel,
        isUnimodal: peaks <= 1
    };
}

/**
 * Calibrates and amplifies raw similarity margins using Softmax with temperature scaling.
 *
 * @param {number[]} similarities - Raw cosine similarities
 * @param {number} [temperature=0.05] - Scaling temperature
 * @returns {number[]} Probabilities that sum to 1.0
 */
export function softmax(similarities, temperature = 0.05) {
    if (!Array.isArray(similarities) || similarities.length === 0) return [];
    const maxVal = Math.max(...similarities);
    const temp = Math.max(temperature, 0.001);
    const exps = similarities.map(s => Math.exp((s - maxVal) / temp));
    const sumExps = exps.reduce((a, b) => a + b, 0);
    return exps.map(e => (sumExps > 0 ? e / sumExps : 1 / similarities.length));
}

/**
 * Evaluates binary condition (Noul) with contrastive Bayesian log-odds.
 *
 * @param {number} simPos - Cosine similarity with positive proposition
 * @param {number} [simNeg=null] - Cosine similarity with negative proposition (optional)
 * @param {number} [temperature=0.08] - Calibrated temperature
 * @returns {{ probability: number, isYes: boolean, logOdds: number, marginDelta: number }}
 */
export function calculateNoulBayesian(simPos, simNeg = null, temperature = 0.08) {
    let prob = 0.5;
    let logOdds = 0;
    let marginDelta = 0;

    if (simNeg !== null && typeof simNeg === "number") {
        // Orthogonal contrastive pair
        marginDelta = simPos - simNeg;
        logOdds = marginDelta / Math.max(temperature, 0.01);
        prob = 1 / (1 + Math.exp(-logOdds));
    } else {
        // Single anchor with calibrated sigmoid centered at 0.70
        marginDelta = simPos - 0.70;
        logOdds = 12 * marginDelta;
        prob = 1 / (1 + Math.exp(-logOdds));
    }

    prob = Math.max(0.005, Math.min(0.995, prob));

    return {
        probability: Number(prob.toFixed(4)),
        isYes: prob >= 0.5,
        logOdds: Number(logOdds.toFixed(3)),
        marginDelta: Number(marginDelta.toFixed(4))
    };
}

/**
 * Combines multiple normalized dimension scores using MCDA:
 * - Arithmetic weighted average (linear compensatory)
 * - Geometric weighted average (penalizes low scores in critical dimensions)
 * - TOPSIS similarity to ideal positive solution
 *
 * @param {Record<string, number>} dimensionScores - Map of dimension key -> normalized score (0.0 to 1.0)
 * @param {Record<string, number>} weights - Map of dimension key -> weight
 * @returns {{ compositeScore: number, geometricScore: number, topsisScore: number, percentage: string, breakdown: Array<any> }}
 */
export function calculateCompositeScore(dimensionScores, weights) {
    const keys = Object.keys(dimensionScores);
    let totalWeight = 0;
    keys.forEach(k => {
        totalWeight += (weights[k] !== undefined ? weights[k] : 1);
    });

    if (totalWeight <= 0) totalWeight = 1;

    let compositeArith = 0;
    let compositeGeomLog = 0;
    let dPlusSq = 0;
    let dMinusSq = 0;

    const breakdown = keys.map(k => {
        const rawWeight = weights[k] !== undefined ? weights[k] : 1;
        const normalizedWeight = rawWeight / totalWeight;
        const score = Math.max(0, Math.min(1, dimensionScores[k] || 0));
        const contribution = score * normalizedWeight;
        compositeArith += contribution;

        // Geometric: sum(w_i * ln(s_i + 0.005))
        compositeGeomLog += normalizedWeight * Math.log(score + 0.005);

        // TOPSIS: Distance to Ideal (1.0) and Anti-Ideal (0.0)
        dPlusSq += normalizedWeight * Math.pow(score - 1.0, 2);
        dMinusSq += normalizedWeight * Math.pow(score - 0.0, 2);

        return {
            dimension: k,
            score: Number(score.toFixed(4)),
            weight: Number(normalizedWeight.toFixed(4)),
            rawWeight: rawWeight,
            contribution: Number(contribution.toFixed(4))
        };
    });

    const geometricScore = Math.max(0, Math.min(1, Math.exp(compositeGeomLog)));
    const dPlus = Math.sqrt(dPlusSq);
    const dMinus = Math.sqrt(dMinusSq);
    const topsisScore = (dPlus + dMinus > 0) ? (dMinus / (dPlus + dMinus)) : compositeArith;

    return {
        compositeScore: Number(compositeArith.toFixed(4)),
        geometricScore: Number(geometricScore.toFixed(4)),
        topsisScore: Number(topsisScore.toFixed(4)),
        percentage: `${(compositeArith * 100).toFixed(1)}%`,
        breakdown
    };
}

/**
 * Evaluates confidence against risk threshold tiers.
 *
 * @param {number} confidence - Confidence value (0.0 to 1.0)
 * @param {{ low: number, high: number }} thresholds - e.g. { low: 0.60, high: 0.85 }
 * @returns {'LOW' | 'MEDIUM' | 'HIGH'}
 */
export function evaluateConfidenceTier(confidence, thresholds = { low: 0.60, high: 0.85 }) {
    if (confidence < thresholds.low) return 'LOW';
    if (confidence >= thresholds.high) return 'HIGH';
    return 'MEDIUM';
}
