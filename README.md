# Save token with WebGPU

### MODEL USE
#### Qwen3 0.6B params
**DEMO** on [https://tokensave.fenix.ninja](https://tokensave.fenix.ninja)

### Tech STACK
*   **Frontend**: **JavaScript (Vanilla)**, **CSS3**, **HTML5**, 
*   **Language Model**: **Qwen3 0.6B** (Local via WebGPU)
*   **Browser Technology**: **WebGPU**, **WebNN**, **Service Workers**, **IndexedDB**
![TokenSave Screen](tokenSave_screen.png)
### LAB 
**TEST 1**
 - [x] Using qwen3 for mapping vectors 
 - [x] Using cosine similarity for finding similar vectors 

**TEST 2**
One point vector embedding $\mathbf{u} \in \mathbb{R}^D$ generated for for model **Qwen3-Embedding** ($D = 1024$), normalize euclidian ($L_2$):

$$\hat{\mathbf{u}} = \frac{\mathbf{u}}{\|\mathbf{u}\|_2} = \frac{\mathbf{u}}{\sqrt{\sum_{i=1}^D u_i^2}}$$

For two normalized vectors $\hat{\mathbf{u}}$ and $\hat{\mathbf{v}}$, cosine similarity is reduced to dot product:

$$\text{sim}(\hat{\mathbf{u}}, \hat{\mathbf{v}}) = \cos(\theta) = \hat{\mathbf{u}} \cdot \hat{\mathbf{v}} = \sum_{i=1}^D \hat{u}_i \hat{v}_i$$ 

- [x] can take decision? True
- [x] can choice? True 78% case [^1]

> [!NOTE]
> [^1] The embedding size is 1024 and the cosine similarity is calculated using the dot product of the normalized vectors. This is possible because the vectors are normalized to have a unit norm, so the dot product is equal to the cosine of the angle between the vectors.

**Test 3**
- [x] SOFMAX calibration Vector's Semantics 
> [!NOTE]
>For a set of $N$ direct cosine similarities $\mathbf{s} = [s_1, s_2, \dots, s_N]$, the probability distribution $p_i$ is calculated by applying temperature scaling $T$:
$$p_i = \frac{\exp\left(\frac{s_i - \max(\mathbf{s})}{T}\right)}{\sum_{j=1}^N \exp\left(\frac{s_j - \max(\mathbf{s})}{T}\right)}$$

**Test 4**
- [❌] Use "Choice" and "Score" primitives 
> [!NOTE]
> 2. Amplification the critial margen for decision making. To scale by $T = 0.05$ (equivalent to multiplying the differences by $20$), a real difference of just $\Delta s = 0.05$ between the first and second place is transformed into a clear probabilistic separation ($>80\%$ vs $<15\%$), allowing for unambiguous automated decisions.

**Test 5**
 - [x] Use primitive Spark with Normalitation
 > [!NOTE]
 > For a dimension graduated in $K$ discrete levels ordered $0, 1, \dots, K-1$, with associated probabilities $p_0, p_1, \dots, p_{K-1}$ such that $\sum_{i=0}^{K-1} p_i = 1$:
 --
   **Continuous Expected Value ($\mathbb{E}[\text{Score}]$):**
   $$\mathbb{E}[\text{Score}] = \sum_{i=0}^{K-1} i \times p_i$$
   **Normalized Score to Range $[0.0, 1.0]$:**
   $$\text{Score}_{\text{norm}} = \frac{\mathbb{E}[\text{Score}]}{K - 1}$$

**Test 6**
- [ ] Primitive Noul with normalitation

**Test 7**
- [ ] Primitive Score with normalitation

**Test 8**
- [ ] Primitive UMAP with normalitation

# To-DO

## FIX
- [ ] ui.js  ``isTrue`` no working.
- [ ] primitive.js NOUL No  working

## FEATURE
- [ ] Add upload json
- [ ] Export json
- [ ] Add undo
- [ ] Add redo 

# Benchmarks
## Directory Structure

```
case-use-examples/
├── support_fanout/
│   ├── support_fanout_01_cobro_doble_y_error_de_login/
│   │   ├── state.json     # Input text, preset metadata & calibrated ground-truth answers
│   │   └── query.json     # Embeding System One typed schema (Choice, Score, Noul, Final Route)
│   ├── support_fanout_02_bug_critico_bloqueante/
│   │   ├── state.json
│   │   └── query.json
│   └── ... (15 examples)
├── composite_resume/      # 15 examples (Senior IC vs Eng Manager)
├── banking_confidence/    # 15 examples (Voice banking & confidence gating)
├── robot_telemetry/       # 15 examples (Kinematics & Bellman MDP)
├── llm_guardrails/        # 15 examples (Prompt injection, safety & jailbreaks)
├── insurance_claims/      # 15 examples (STP claims triage & fraud detection)
├── financial_crime/       # 15 examples (AML, structuring & sanctions)
├── content_moderation/    # 15 examples (Trust & Safety, doxxing & harassment)
├── legal_compliance/      # 15 examples (Contract audit, liability & GDPR)
└── semantic_linting/      # 15 examples (Architectural debt & CI blockers)
```

### AreLit/PhisnhNCips
### p50 Classifier
### p95 Classifier
### Math NLI
### Who. 
[Dataset attribuition](https://github.com/tokentrim/jev-agent-failure-benchmark)
### When
### What
