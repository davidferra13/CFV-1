# Always-On Autonomous Delivery

For every explicit build, fix, implement, proceed, do it, keep building, or ship request, execute the complete lifecycle without waiting for another prompt:

1. inspect the canonical repo, dirty state, upstream, deployment target, and live revision;
2. implement and verify the requested behavior;
3. review and stage only task-owned changes;
4. commit and push immediately;
5. deploy website/runtime changes to the established production target;
6. verify the canonical live domain and deployed revision;
7. finish only as LIVE, COMPLETE, or BLOCKED with evidence.

The build queue is for tracking, not permission. Never ask David to separately say fire the queue, commit, push, publish, or deploy. Preserve unrelated work and never guess a repository or deployment target.

Before implementation, read the repository-root file `docs/autonomous-delivery-contract.md` and follow it in full.
