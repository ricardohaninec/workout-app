# TEAM.MD

Spec for the agent team that delivers every code change in this project: planner, coder, reviewer, security, tester.

The main session is the **orchestrator**. It runs the agents in `.claude/agents/`, decides what happens next and talks to the user. Agents do not talk directly: they read and write files in their task folder `handoff/<task-id>/`, and the orchestrator passes control between them.

## Handoff files

| File                         | Written by   | Read by                 |
| ---------------------------- | ------------ | ----------------------- |
| `<task>/plan.md`            | planner      | everyone                |
| `<task>/docs.md`            | orchestrator | coder, reviewer         |
| `<task>/changes.md`         | coder        | reviewer, security      |
| `<task>/review.md`          | reviewer     | coder                   |
| `<task>/security-review.md` | security     | coder                   |
| `<task>/test-report.md`     | tester       | coder                   |

`handoff/` is gitignored. Each task (one per orchestrator session) gets its own folder `handoff/<task-id>/`, so parallel sessions never touch each other's files. `<task>` above is that folder.

## Workflow

1. **Init.** Create `handoff/<task-id>/`, where `<task-id>` is `YYYYMMDD-HHMMSS-<short-slug>`. Never delete or touch other folders. Pass the folder path in every agent prompt.
2. **Plan.** Run `planner` with the user's request, word for word.
   - If `plan.md` has "Open questions", ask the user, then re-run the planner with the answers.
3. **Docs.** If `plan.md` has "Docs needed", run `DocsExplorer` and save the result to `<task>/docs.md`. The team agents have no web tools, and CLAUDE.md requires up-to-date docs for third-party libraries.
4. **Code.** Run `coder`.
   - If `changes.md` says the plan is wrong or impossible, go back to step 2 with that explanation.
5. **Review.** Run `reviewer`.
   - CHANGES REQUESTED: run `coder`, then repeat this step.
6. **Security.** Run `security`.
   - CHANGES REQUESTED: run `coder`, then go back to step 5.
7. **Test.** Run `tester`.
   - FAIL: run `coder`, then go back to step 5, so that every fix is reviewed and audited.
8. **Finish.** Done only when `review.md` and `security-review.md` say APPROVED and `test-report.md` says PASS for the same code. Report to the user:
   - what changed
   - tests run / passed / failed
   - coverage gaps, minor review and security issues, and anything else left open
9. **Clean up.** Delete only this session's `handoff/<task-id>/`. On a stop condition, keep it until the user decides.

## Stop conditions

Stop and ask the user, with the open issues, when:

- review, security and test fixes reach **3 coder rounds** in total
- two rounds in a row report the same issue
- a fix needs a decision the plan does not cover, such as a schema change or a new dependency

Never count a task as done by skipping, weakening or ignoring a failing check.

## Rules

- Agents run one at a time, because each depends on the previous agent's output.
- Each agent starts with no memory of the conversation. Everything it needs must be in the task folder.
- The coder is the only agent that edits application code. The tester edits test files only.
- Nobody commits or pushes unless the user asks.
- Use `npm run test` (Vitest).
