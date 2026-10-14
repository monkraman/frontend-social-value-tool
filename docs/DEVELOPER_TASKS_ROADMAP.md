# Developer Task Roadmap

This document records proposed frontend work for product and engineering review. Items are candidates, not committed delivery dates or statements of existing functionality. Confirm priority, requirements, and backend dependencies before implementation.

## Package review

### FE-101: Package comparison view

**Objective:** Help users compare generated packages without switching between package tabs.

**Acceptance criteria:**

- Provide an accessible action to open a comparison view.
- Compare only data available in the current response contract.
- Clearly label values that are missing, simulated, or unverified.
- Support narrow viewports and both theme modes.

**Potential files:** [`src/components/PromptStudio.tsx`](../src/components/PromptStudio.tsx), related styles and types.

## Initiative simulation

### FE-102: Custom initiative support

**Objective:** Let users model an initiative that is not included in the supplied metrics.

**Acceptance criteria:**

- Define how custom unit rates are sourced, reviewed, and labelled.
- Capture the initiative name, unit rate, annual volume, and optional delivery partner.
- Calculate totals deterministically and display the calculation inputs.
- Distinguish custom assumptions from approved metric values.

**Potential files:** [`src/components/Tuner.tsx`](../src/components/Tuner.tsx), [`src/hooks/useTomsSimulation.ts`](../src/hooks/useTomsSimulation.ts), API types and backend contract.

## Document management

### FE-103: Upload progress and drag-and-drop feedback

**Objective:** Provide clearer feedback while a document is selected and processed.

**Acceptance criteria:**

- Support accessible file selection and drag-and-drop.
- Display processing, success, and error states based on actual backend responses.
- Do not show simulated success as persisted ingestion.
- Confirm the backend upload response supports progress reporting before presenting a percentage.

**Potential files:** [`src/components/Documents.tsx`](../src/components/Documents.tsx), [`src/hooks/useDocumentManager.ts`](../src/hooks/useDocumentManager.ts), API client and backend contract.

## Export options

### FE-201: Printable package report

**Objective:** Provide a print-friendly summary for review.

**Acceptance criteria:**

- Include the selected package, assumptions, validation items, and calculation details.
- Clearly identify data sources and any unverified or sample data.
- Do not describe generated output as client-approved without an approval workflow.
- Validate print layout and accessibility.

**Potential files:** [`src/utils/export.ts`](../src/utils/export.ts), [`src/components/PromptStudio.tsx`](../src/components/PromptStudio.tsx).

### FE-202: Structured proposal export

**Objective:** Export package content in a format that can be reviewed and incorporated into bid documents.

**Acceptance criteria:**

- Agree supported file formats and document structure with product stakeholders.
- Preserve assumptions, sources, and calculation details.
- Test generated files with supported office applications.

**Potential files:** [`src/utils/export.ts`](../src/utils/export.ts), related UI, and dependency configuration.

## Product configuration

### FE-301: Theme configuration

**Objective:** Assess whether users need theme customization beyond the existing light and dark modes.

**Acceptance criteria:**

- Confirm the product requirement and accessibility implications before implementation.
- Preserve the existing theme behavior when customization is disabled or reset.
- Avoid persisting arbitrary style values unless storage and validation requirements are defined.

**Potential files:** [`src/constants/theme.ts`](../src/constants/theme.ts), [`src/components/Sidebar.tsx`](../src/components/Sidebar.tsx), [`src/hooks/useTheme.ts`](../src/hooks/useTheme.ts).
