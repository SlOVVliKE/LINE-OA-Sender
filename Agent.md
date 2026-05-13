# Agent Guide: LINE OA Sender

Read this file before making any change in this project.

## Product

LINE OA Sender is a Render-hosted web app for sending text and image messages through LINE Official Accounts. The app stores recipients only after LINE webhook events have identified users, groups, or rooms.

## Roles

- Admin: manages UserOA accounts, botlineOA records, and assignments. Admin does not send messages.
- UserOA: sends messages, uploads images, selects recipients, and configures one daily campaign only for assigned botlineOA records.
- botlineOA: a LINE Official Account. The program has no hard limit on botlineOA count and must support at least 10+ records in normal use.

## Core Rules

- Login uses password only.
- `ADMIN_PASSWORD` logs in as Admin.
- UserOA passwords must be unique and must not match `ADMIN_PASSWORD`.
- UserOA can access only assigned botlineOA records.
- Admin can CRUD UserOA and botlineOA and assign bots with checkboxes.
- Webhook URL is per botlineOA: `/webhook/line/:webhookKey`.
- Recipient, uploaded image, campaign, and delivery history data must always be scoped by `bot_id`.
- Old single-bot data is intentionally reset by the `multi_bot_v1_reset` migration.

## Architecture

- Backend: Node.js, Express, PostgreSQL, Cloudinary, LINE Messaging API.
- Frontend: React and Vite.
- Scheduler: GitHub Actions calls `/internal/send-due`; the server checks all active botlineOA campaigns.
- Render: web service plus Postgres. Keep deploy free-tier friendly.

## Database Model

- `user_oa_accounts`: UserOA display name, password hash, active status.
- `bot_line_oas`: LINE OA name, access token, channel secret, webhook key, active status.
- `user_bot_assignments`: many-to-many relation between UserOA and botlineOA.
- `recipients`: LINE users/groups/rooms scoped to `bot_id`.
- `uploaded_images`: Cloudinary image records scoped to `bot_id`.
- `daily_campaign`: one campaign per `bot_id`.
- `delivery_logs`: send history scoped to `bot_id`.
- `webhook_events`: dedupe webhook events and record `bot_id`.

## API Rules

- Admin routes live under `/api/admin/*`.
- UserOA send routes live under `/api/bots/:botId/*`.
- Never return full channel access tokens or channel secrets to the UI.
- Use masked previews for stored LINE credentials.
- Verify LINE webhook signatures with the channel secret of the botlineOA resolved from `webhookKey`.

## LINE Constraints

- LINE OA cannot push to arbitrary users. It can push only to users/groups/rooms the bot is allowed to message.
- “Send all” means all active recipients known by webhook for the selected botlineOA.
- Personal LINE bulk friend adding is out of scope.

## Commands

- Test: `npm.cmd run test`
- Build: `npm.cmd run build`
- Start: `npm.cmd start`

## Git

- Keep unrelated changes out of commits.
- Verify `git status --short --branch` before committing or pushing.
