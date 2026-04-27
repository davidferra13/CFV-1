Read and execute `docs/specs/build-client-relationship-closure-communications.md`.

Follow it exactly. Start only after `docs/specs/build-client-relationship-closure-data-contract.md` has landed. You can run in parallel with the server-actions agent, but avoid owning its core action file except for the explicit email-send integration described in the spec. Run all verification commands allowed by the spec at the end. If verification fails after 2 attempts, git stash your changes and report what failed. Do not fix unrelated issues.
