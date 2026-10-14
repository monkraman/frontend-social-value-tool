# Contributing

Thank you for contributing to the Social Value RFP Response Builder. Keep changes focused, preserve existing behavior unless a change is intentional, and document user-visible or architectural changes.

## Before you start

1. Follow the [developer quickstart](./docs/DEVELOPER_QUICKSTART.md) to install dependencies and run the application.
2. Review the [developer onboarding guide](./docs/DEVELOPER_ONBOARDING_GUIDE.md) and relevant component or API documentation.
3. Confirm the repository is clean before editing, and avoid including generated files, local environment settings, or unrelated changes.

## Development standards

- Use TypeScript types that describe the data being handled. Avoid introducing `any`.
- Follow the existing React, component, hook, and styling patterns.
- Keep user-facing text and documentation in clear, professional English.
- Do not add credentials, personal data, client evidence, or other sensitive information to source control.
- Treat local fallback data as demonstration data. Do not present it as verified evidence or persistent backend data.
- Update the relevant documentation when behavior, API contracts, setup, or component interfaces change.

## Validate a change

Run these commands from the repository root:

```bash
npm run lint
npm run build
```

There is no test script configured in `package.json` at this time. If a change adds or modifies test coverage, document and run the applicable test command.

For interface changes, also review the affected screens at desktop and narrow viewport widths, and check both themes where applicable.

## Pull request checklist

- [ ] The change has a clear purpose and does not include unrelated edits.
- [ ] Relevant documentation has been updated.
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.
- [ ] UI behavior has been reviewed at relevant viewport sizes and themes.
- [ ] No secrets, local configuration, or generated build output are included.
- [ ] Any limitations or backend dependencies are stated in the pull request description.

See the [documentation policy and pull request template](./docs/DOCUMENTATION_POLICY_AND_PR_TEMPLATE.md) for the full review template.
