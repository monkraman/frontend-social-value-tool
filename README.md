# Infosys Social Value RFP Response Builder — Frontend

[![React](https://img.shields.io/badge/React-19.2-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?logo=vite)](https://vitejs.dev/)
[![Oxlint](https://img.shields.io/badge/Oxlint-Passing-10b981)](https://oxc.rs/)
[![National TOMs](https://img.shields.io/badge/Framework-National%20TOMs%202024-purple)](https://socialvalueportal.com/)
[![Compliance](https://img.shields.io/badge/PPN%2006%2F20-Compliant-emerald)](https://www.gov.uk/government/publications/procurement-policy-note-0620-taking-account-of-social-value-in-the-award-of-central-government-contracts)

An enterprise-grade, modular decision-support frontend engineered for **Infosys UK Public Sector Bid Teams**. This platform automates tender Social Value response formulation under the **National TOMs (Themes, Outcomes, and Measures)** framework, pairing **Retrieval-Augmented Generation (RAG)** with **strict deterministic financial calculation layers** to eliminate AI hallucinations.

---

## 🏛️ System Architecture & Workflow

```text
       ┌────────────────────────────────────────────────────────┐
       │   RFP Opportunity Criteria (Client, £ Value, %, Ward)   │
       └───────────────────────────┬────────────────────────────┘
                                   │
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │   Semantic Vector Retrieval (pgvector 1536-dim chunks)  │
       └───────────────────────────┬────────────────────────────┘
                                   │
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │   AI Structuring (Gemini 1.5 / GPT-4o JSON mode)       │
       │   • 1. Core Package (Low-risk baseline)                │
       │   • 2. Enhanced Package (Competitive score maximizer)   │
       │   • 3. Localised Package (Ward-level supply chain)     │
       └───────────────────────────┬────────────────────────────┘
                                   │
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │   Deterministic Math Engine (NO LLM ARITHMETIC)        │
       │   Total £ = Annual Volume × Years × Proxy Unit Value   │
       └───────────────────────────┬────────────────────────────┘
                                   │
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │   Client-Ready Response + Audit Trail + Pre-Submission │
       └────────────────────────────────────────────────────────┘
```

---

## ⚡ Quickstart (Zero-Config)

### 1. Prerequisites
- **Node.js**: v20+ or v22+
- **Package Manager**: `npm`

### 2. Installation & Launch
```bash
# Navigate to the frontend directory
cd Frontend-Social-value

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

> [!NOTE]
> **Intelligent Local Fallback**: If the FastAPI backend is not running, the application automatically engages a high-fidelity local engine so UI/UX designers and evaluators can interact with all 3 packages, simulation sliders, and documents with zero setup.

---

## 📁 Clean, Minimalist Codebase Architecture (Aligned 1-to-1 with Backend)

The frontend is strictly organized into simple, single-responsibility components matching the FastAPI backend API:

```text
src/
├── api/
│   └── client.ts             # Direct client connecting to FastAPI backend (/responses, /documents, /search)
├── components/               # Pure, lightweight components (Dark & Light support)
│   ├── Sidebar.tsx           # Sidebar with New Prompt, navigation & Dark/Light theme switch
│   ├── PromptStudio.tsx      # ChatGPT-style prompt bar & clean 3-package template response view
│   ├── Tuner.tsx             # Clean volume tuning simulation matching /calculations/package
│   ├── Documents.tsx         # Document dropzone & repository viewer matching /documents
│   └── Search.tsx            # Semantic vector retrieval explorer matching /search
├── constants/
│   ├── theme.ts              # SINGLE CENTRAL SOURCE OF TRUTH for all colors & fonts (Dark/Light)
│   ├── defaults.ts           # Preset tender profiles (Birmingham, Manchester, etc.)
│   └── promptPresets.ts      # Prompt templates
├── hooks/
│   ├── useTheme.ts           # Dynamic Dark/Light mode toggle hook
│   ├── useBackendHealth.ts   # Backend status polling & connection state
│   ├── useOpportunityGenerator.ts # Response generation state
│   ├── useDocumentManager.ts # Ingestion & document deletion
│   └── useTomsSimulation.ts  # Volume recalculation logic
├── types/
│   └── index.ts              # 1-to-1 TypeScript types matching backend Pydantic schemas
├── utils/
│   ├── promptParser.ts       # Natural language tender prompt parser
│   ├── formatters.ts         # Currency (£), percentage, date helpers
│   └── export.ts             # Clean JSON export utility
├── App.tsx                   # Clean, high-level coordinator
├── index.css                 # CSS variable definitions and global typography
└── main.tsx                  # React entry point with theme initialization
```

---

## 📚 Complete Documentation Suite

All specifications, guidelines, and roadmaps are located in [`docs/`](file:///f:/New%20folder/Frontend-Social-value/docs):

| Document | Purpose |
| :--- | :--- |
| [**DEVELOPER_ONBOARDING_GUIDE.md**](file:///f:/New%20folder/Frontend-Social-value/docs/DEVELOPER_ONBOARDING_GUIDE.md) | 10-minute quickstart, architectural rules, and how to build components. |
| [**UI_UX_DESIGN_SYSTEM.md**](file:///f:/New%20folder/Frontend-Social-value/docs/UI_UX_DESIGN_SYSTEM.md) | Design tokens, color palette, typography, glassmorphism, and accessibility. |
| [**COMPONENT_CATALOG.md**](file:///f:/New%20folder/Frontend-Social-value/docs/COMPONENT_CATALOG.md) | Detailed props, interfaces, and copy-paste examples for every UI primitive. |
| [**API_INTEGRATION_SPEC.md**](file:///f:/New%20folder/Frontend-Social-value/docs/API_INTEGRATION_SPEC.md) | FastAPI endpoint contracts, request/response JSON schemas, and error models. |
| [**DEVELOPER_TASKS_ROADMAP.md**](file:///f:/New%20folder/Frontend-Social-value/docs/DEVELOPER_TASKS_ROADMAP.md) | Prioritized backlog of UI/UX tickets for incoming developers to build rapidly. |
| [**DOCUMENTATION_POLICY_AND_PR_TEMPLATE.md**](file:///f:/New%20folder/Frontend-Social-value/docs/DOCUMENTATION_POLICY_AND_PR_TEMPLATE.md) | Strict documentation rules and pull request checklist for all contributors. |
| [**CLIENT_HANDOVER_CHECKLIST.md**](file:///f:/New%20folder/Frontend-Social-value/docs/CLIENT_HANDOVER_CHECKLIST.md) | Comprehensive QA matrix, demo script, and formal client sign-off sheet. |

---

## 🛠️ Available Scripts

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts the local Vite development server with HMR at `http://localhost:5173`. |
| `npm run build` | Compiles TypeScript (`tsc -b`) and bundles for production into `dist/`. |
| `npm run lint` | Runs `oxlint` across all files to ensure 0 errors and 0 warnings. |
| `npm run preview` | Previews the production build locally. |

---

## 🛡️ Key Commercial Principles

1. **Deterministic Calculations Only**: Financial impact is computed using standard UK National TOMs formulas ($Total = Volume \times Years \times Unit Value$). LLMs are never allowed to invent or calculate numbers.
2. **Anti-Hallucination Guardrails**: If an approved delivery partner is not found in the verified knowledge base, the system assigns `Partner Unassigned` and tags pre-submission action items.
3. **Audit Trail Transparency**: Every proposed initiative displays an explicit formula string for scrutiny by council and NHS evaluators.
#   f r o n t e n d - s o c i a l - v a l u e - t o o l  
 