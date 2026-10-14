# Component Catalog

This catalog summarizes the main page-level components in `src/components/`. The implementation is the source of truth for current props and behavior; review each component before extending it.

## Application views

| Component | File | Responsibility |
| --- | --- | --- |
| `Sidebar` | [`src/components/Sidebar.tsx`](../src/components/Sidebar.tsx) | Navigation, theme controls, and backend status. |
| `PromptStudio` | [`src/components/PromptStudio.tsx`](../src/components/PromptStudio.tsx) | Prompt entry, generated package display, and JSON export action. |
| `Tuner` | [`src/components/Tuner.tsx`](../src/components/Tuner.tsx) | Contract inputs and initiative volume simulation. |
| `Documents` | [`src/components/Documents.tsx`](../src/components/Documents.tsx) | Document listing, upload, and delete interactions. |
| `Search` | [`src/components/Search.tsx`](../src/components/Search.tsx) | Evidence search form and result display. |

## Shared behavior

- [`src/hooks/useBackendHealth.ts`](../src/hooks/useBackendHealth.ts) checks backend availability.
- [`src/hooks/useOpportunityGenerator.ts`](../src/hooks/useOpportunityGenerator.ts) manages response generation and export behavior.
- [`src/hooks/useTomsSimulation.ts`](../src/hooks/useTomsSimulation.ts) provides state and calculations for the tuner.
- [`src/hooks/useDocumentManager.ts`](../src/hooks/useDocumentManager.ts) manages document state and API operations.
- [`src/hooks/useTheme.ts`](../src/hooks/useTheme.ts) manages theme selection.

The API client and its current fallback behavior are described in the [API integration specification](./API_INTEGRATION_SPEC.md). Fallback values are demonstration data, not verified evidence or persistent document records.

## Styling conventions

Global CSS classes and variables are defined in [`src/index.css`](../src/index.css). Theme values and application are defined in [`src/constants/theme.ts`](../src/constants/theme.ts).

Reuse existing variables and classes where practical. When adding or changing a shared token or class, update the [UI/UX design system](./UI_UX_DESIGN_SYSTEM.md).
