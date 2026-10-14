# UI/UX Design System

This guide describes the current theme and styling conventions for the Social Value RFP Response Builder.

## Theme implementation

- Theme definitions are maintained in [`src/constants/theme.ts`](../src/constants/theme.ts).
- Global styles, CSS variables, and shared classes are maintained in [`src/index.css`](../src/index.css).
- Theme selection is exposed through [`src/hooks/useTheme.ts`](../src/hooks/useTheme.ts).

Use these files as the starting point when changing application colors or typography. Review both theme modes after making visual changes.

## Styling conventions

- Prefer existing CSS variables and shared classes over introducing duplicate values.
- Keep component styling consistent with adjacent screens and existing responsive behavior.
- Avoid adding new colors, gradients, or visual treatments without a clear product requirement.
- Use semantic HTML elements and preserve visible keyboard focus.
- Make form controls identifiable with labels and provide accessible names for icon-only controls.
- Do not rely on color alone to communicate status or errors.
- Check layouts at narrow and wide viewport sizes.

## Updating shared styles

1. Identify whether the change belongs in the theme definition, global stylesheet, or component.
2. Reuse existing tokens where possible; add a new token only when it represents a reusable design value.
3. Verify the affected views in light and dark themes.
4. Update the [component catalog](./COMPONENT_CATALOG.md) or this guide if the change introduces a shared class or token.

## Related files

- [Theme definitions](../src/constants/theme.ts)
- [Global stylesheet](../src/index.css)
- [Theme hook](../src/hooks/useTheme.ts)
- [Component catalog](./COMPONENT_CATALOG.md)
