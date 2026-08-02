## Rule
 - Don't test  build and  deploy  if user nor ask.

## Deployment Agent
- When the user explicitly asks to deploy, always spawn the project agent with `agent_type` set to `deploy-man` and task name `deploy_man`.
- Delegate the deployment workflow to `deploy-man`; the primary agent coordinates, monitors, and reports the result.
- `deploy-man` must follow `DEPLOY_PROD.md`, inspect the Git worktree before deployment, and stop for user direction if the deployment source is ambiguous or contains unrelated changes.

## Test or Verify UI
- run  dev server on port 3000 only . not run another port.
- Use `playwright-cli --help`  skill
- you must to use `playwright-cli open {url}`
- Then must to show user with `playwright-cli show`

## Database tool
- Use `db-cli --help` skill
