# Documentation Policy and Pull Request Template

Documentation should describe behavior that exists, identify known limitations, and stay consistent with the implementation. Update documentation alongside changes to setup, architecture, APIs, components, or user-visible behavior.

## Documentation standards

- Write in clear, professional English.
- Use repository-relative links so documentation works after cloning on any operating system.
- Distinguish current behavior from proposed or planned work.
- Mark example values and fallback responses as illustrative when they are not verified production data.
- Explain domain-specific assumptions and data provenance where relevant.
- Add code comments when they clarify non-obvious reasoning; avoid comments that merely repeat the code.
- Prefer precise TypeScript types and existing project conventions.

## Pull request checklist

Copy this template into the pull request description:

```markdown
## Summary
Describe the change and its intended outcome.

## Scope
- [ ] Related work item or issue: <link or identifier, if applicable>
- [ ] User-visible behavior or API contract changes are described.

## Validation
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.
- [ ] Relevant manual checks have been completed.
- [ ] Responsive layouts and theme modes were reviewed for UI changes.

## Data and integration considerations
- [ ] No credentials, client evidence, or sensitive information were added.
- [ ] Sample or fallback data is identified and not presented as verified evidence.
- [ ] Backend dependencies, limitations, and configuration changes are documented.

## Documentation
- [ ] Relevant documentation has been updated.
```

## Before client handover

Run the checks in the [client handover checklist](./CLIENT_HANDOVER_CHECKLIST.md). Do not treat local fallback behavior as proof of backend availability, data persistence, or data provenance.

## Related guidance

- [Contribution guidelines](../CONTRIBUTING.md)
- [Developer quickstart](./DEVELOPER_QUICKSTART.md)
- [Developer onboarding guide](./DEVELOPER_ONBOARDING_GUIDE.md)
