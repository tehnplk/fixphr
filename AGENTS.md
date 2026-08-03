## Rule
 - Don't test  build and  deploy  if user nor ask.

## Deployment Agent
- When the user explicitly asks to deploy, always spawn the project agent with `agent_type` set to `deploy-prod` and task name `deploy_prod`. The agent is defined in `.claude/agents/deploy-prod.md`.
- Delegate the deployment workflow to `deploy-prod`; the primary agent coordinates, monitors, and reports the result.
- The explicit `deploy` command authorizes `deploy-prod` to include all legitimate current non-database project changes, commit, push to the trusted `master` branch, deploy, rebuild the webapp, and verify production without asking for repeated permission.
- `deploy-prod` must always stop for explicit user approval before committing, pushing, or deploying database schema, migration, seed/data, SQL mutation, database configuration/volume, or production data changes.
- `deploy-prod` must follow `DEPLOY_PROD.md`, inspect both local and production Git worktrees, exclude secrets/generated/local artifacts, and never overwrite a dirty production worktree.

## Test or Verify UI
- run  dev server on port 3000 only . not run another port.
- Use `playwright-cli --help`  skill
- you must to use `playwright-cli open {url}`
- Then must to show user with `playwright-cli show`

## Database tool
- Use `db-cli --help` skill
