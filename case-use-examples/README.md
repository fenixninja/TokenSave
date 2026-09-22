# Case Use Examples Catalog (Embeding / Jev Decision Engine)

This directory contains the production-grade dataset of **150 structured test examples** across all **10 decision use cases** supported by the JEV Decision Workbench.

Each use case directory contains 15 discrete example folders named `<use_case_id>_<index>_<descriptive_slug>`.

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

## File Formats

### `state.json`
Represents the runtime state and ground-truth expectation:
```json
{
  "state": {
    "text": "User input text string...",
    "name": "Human-readable example name",
    "use_case": "support_fanout",
    "example_index": 1
  },
  "expected_answers": {
    "category": [18, 56, 12, 14],
    "bug_severity": [20, 60, 20]
  },
  "expected_route": {
    "routeKey": "billing_refund",
    "destination": "Finance / Priority Refunds",
    "rationale": "Detección de solicitud explícita de devolución..."
  }
}
```

### `query.json`
The Embeding System One typed judgment schema in English:
```json
{
  "question_id": {
    "type": "choice" | "score" | "noul",
    "instructions": "Clear prompt instruction for the embedding model",
    "criteria": { ... } | [ ... ]
  }
}
```
