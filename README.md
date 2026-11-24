# Project Desk

Extract brief text into reviewable tasks, then keep accepted tasks in their projects.

## Data relationships

```text
Project 1 ─── * Task * ─── 0/1 Person or Group
                         (people.type = person | group)

Data page = tasks grouped by project
Uploaded document = temporary extraction input; it is not saved
```

Tasks require a project. A task may have one registered person or group as its assignee. The Data page reads the same saved task records, so extracted facts are not duplicated in a separate table.

## Setup

1. Install dependencies with `npm run install:all`.
2. Copy `frontend/.env.example` to `frontend/.env.local` and set `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_API_URL`.
3. Copy `backend/.env.example` to `backend/.env` and set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. Set `OPENAI_API_KEY` there if using live GPT extraction; use a rotated key and never paste it into source code or chat.
4. If you already created the earlier `projects` / `people` / `tasks` tables, run `supabase/migrations/0001_authenticated_project_data.sql` in the SQL editor. For a new or empty database, run `supabase/schema.sql`.
5. Enable Email auth in Supabase, then start the API (`npm run dev:api`) and UI (`npm run dev:web`).
6. Create an account on the sign-in screen. New accounts may need to confirm their email first.

The browser and backend use only the publishable key. Every API data request carries the signed-in user's access token; the backend verifies it and queries Supabase under that user so Row Level Security applies. Never put a Supabase secret/service-role key in the frontend or these environment files.

The migration keeps legacy rows that cannot safely be assigned to an Auth user hidden by RLS. Assign a legacy project's/task's `user_id` to the intended Auth user before migrating old data into the new workflow. The legacy `documents` table is not dropped, but its API is disabled and browser roles cannot access it.

## Netlify deployment

The root `netlify.toml` builds the frontend and packages the Express API as a Netlify Function. Netlify serves the frontend and `/api/*` from the same site; no separate backend host is required.

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for the build. Leave `VITE_API_URL` unset in production so the frontend calls the same-site `/api/*` function.

Set `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `CLIENT_ORIGIN`, `OPENAI_BASE_URL`, `OPENAI_MODEL`, and `OPENAI_API_KEY` in the Netlify Functions environment scope. `CLIENT_ORIGIN` should be the deployed site URL. Only `OPENAI_API_KEY` is a secret; keep it out of build scope and the browser bundle. Do not set `PORT` for the function.

The Supabase URL and publishable key are public client configuration. Do not mark them as secrets in Netlify, because the frontend bundle intentionally contains their `VITE_` equivalents. The OpenAI key must remain secret and available only to Functions.

## Workflow

1. Upload a document or enter brief text. The authenticated app sends the extraction text to the backend; when `OPENAI_API_KEY` is configured, the backend sends it to the selected OpenAI model. The uploaded file itself is not stored. The current PDF preview uses demo text rather than parsing PDF bytes.
2. Review and accept task candidates.
3. Select a project before saving. If an extracted assignee is not in People & groups, add the person/group or clear the assignment.
4. Accepted tasks appear on the board and in Data under their project.

The extraction preview is local and is not persisted until accepted tasks are submitted. Data persistence requires Supabase configuration and an authenticated session; the API returns explicit setup/auth errors rather than silently falling back to memory.
