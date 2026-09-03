# AI Image Workflow Mini

Small technical-test implementation of a node-based AI image workflow editor.

The assignment target is an 8-12 hour implementation, so the project intentionally favors a clean working slice over production infrastructure. Runs are stored in memory, and the frontend uses REST polling for run status. Both choices are deliberate scope decisions for the test task.

## Overview

The app lets a user build a typed workflow graph, run it through the backend, and inspect node/job execution states.

Default workflow on startup:

```text
Prompt
  |-- Generate A -- Result A
  `-- Generate B -- Result B
```

`Generate A` and `Generate B` are independent after `Prompt`, so the backend schedules them concurrently.

## Stack

Frontend:

- React
- TypeScript
- Vite
- `@xyflow/react`

Backend:

- Node.js
- TypeScript
- Fastify
- Stability AI Stable Image Core for text-to-image generation

Shared:

- `packages/shared-types` contains workflow, node, port, preset, run, and job contracts reused by frontend and backend.

## Architecture

```text
ai-image-workflow-mini/
  apps/
    frontend/
      src/
        app/
        pages/
        widgets/
        features/
        entities/
        shared/
    backend/
      src/
        modules/
          ai/
          generated/
          presets/
          runs/
          workflows/
        shared/
  packages/
    shared-types/
```

Frontend follows pragmatic Feature-Sliced Design:

- `app`: bootstrap and global styles.
- `pages/workflow-editor`: page-level workflow editor composition.
- `widgets`: workflow canvas, toolbar, node properties, run status panel.
- `features`: add/delete/connect/select/edit/run/retry/select-preset actions.
- `entities`: workflow, workflow-node, preset, and run models/adapters.
- `shared`: API client, tiny UI/lib helpers.

Backend modules:

- `workflows`: graph helpers and workflow validation.
- `runs`: in-memory run storage, execution engine, REST routes.
- `presets`: preset entity store and routes.
- `ai`: provider abstraction, Stability provider, mock provider, request builder, timeout helper.
- `generated`: static route for locally saved generated images.
- `shared`: Fastify app setup and environment loading.

## How To Run

Install dependencies:

```bash
npm install
```

Create `.env` in the repository root:

```text
STABILITY_API_KEY=
```

Put your Stability AI key after `=`. You can also place the same `.env` file in `apps/backend/`.

Start frontend and backend together:

```bash
npm run dev
```

Default local URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`

Run checks:

```bash
npm run typecheck
npm test
npm run build --workspace @ai-image-workflow/frontend
```

## Environment Variables

`STABILITY_API_KEY`: backend-only Stability AI API key. It is never read by frontend code, exposed through Vite, returned in API responses, or logged.

If the key is missing, generation nodes fail with a clear backend error instead of silently falling back to mock generation.

## Workflow Model

The shared workflow definition is data, separate from execution:

- `WorkflowDefinition`: nodes, edges, timestamps.
- `WorkflowNode`: one of `prompt`, `imageInput`, `generateImage`, `editImage`, `result`.
- `WorkflowEdge`: source node/port to target node/port.
- `PortDefinition`: input/output direction plus `text` or `image` data type.
- `Preset`: independent entity with `id`, `name`, `mainPrompt`, `negativePrompt`, `references`.
- `WorkflowRun`: run status, jobs, node outputs.
- `WorkflowJob`: per-node status, attempts, input, output, error.

Supported node behavior:

- `prompt`: produces text from node config.
- `imageInput`: produces an image URL/reference from node config.
- `generateImage`: consumes text, combines it with the selected preset, calls the image provider.
- `editImage`: consumes image and uses mock-compatible provider structure; real edit API integration is not implemented.
- `result`: exposes the upstream value and shows image output in the frontend when present.

## Graph Validation

Validation runs before execution:

- referenced node IDs must exist;
- referenced ports must exist;
- edges must connect output ports to input ports;
- incompatible `text`/`image` connections are rejected;
- required input ports must have upstream dependencies;
- cycles are detected and rejected.

Frontend also blocks incompatible typed connections in React Flow before they reach the backend. Backend validation remains the source of truth.

## Execution Approach

The backend executes from graph dependencies, never from visual node positions.

Simplified flow:

```text
create run
validate workflow
create queued job for each node
while run is active:
  find queued jobs whose upstream jobs all succeeded
  execute all ready jobs with Promise.all
  store each node output
  stop as completed when all jobs succeed
  stop as failed when no more jobs can progress and at least one job failed
```

Independent branches genuinely run concurrently because each ready batch is executed with `Promise.all`. There is a unit test with delayed mock generation that verifies overlapping execution.

## Retry Behavior

`POST /runs/:runId/retry/:nodeId` retries a failed executable node (`generateImage` or `editImage`).

Retry behavior:

- requires the node job to be in `error`;
- clears the failed node output/error;
- clears downstream node outputs and resets downstream jobs to `queued`;
- preserves upstream successful outputs;
- resumes dependency-based execution.

## API

`POST /runs`

```json
{
  "workflow": {},
  "presetId": "preset-demo"
}
```

Returns:

```json
{
  "runId": "..."
}
```

`GET /runs/:runId` returns the run, job statuses, node outputs, and errors.

`POST /runs/:runId/retry/:nodeId` retries a failed executable node and returns the updated run.

`GET /presets` returns available presets.

`GET /generated/:fileName` serves backend-saved generated image files.

## Presets

Preset is a domain entity, not hidden UI state.

Example:

```json
{
  "id": "preset-demo",
  "name": "Premium 3D",
  "mainPrompt": "premium minimal 3D visual",
  "negativePrompt": "clutter, noisy background",
  "references": ["/references/ref-1.png", "/references/ref-2.png"]
}
```

Preset request composition lives in backend `modules/ai/request-builder.ts`, not in React components. It combines:

- user prompt;
- `preset.mainPrompt`;
- `preset.negativePrompt`;
- `preset.references`.

## AI Provider Integration

The backend keeps a provider-independent boundary:

```ts
interface ImageGenerationProvider {
  generate(input: GenerateImageInput): Promise<ImageValue>;
  edit(input: EditImageInput): Promise<ImageValue>;
}
```

The Stability provider uses:

```text
POST https://api.stability.ai/v2beta/stable-image/generate/core
```

Implementation details:

- sends `multipart/form-data`;
- sends `prompt`;
- maps `negativePrompt` to `negative_prompt`;
- requests `webp`;
- handles raw binary image bytes;
- saves generated images under backend-controlled `generated/`;
- returns local `/generated/...` URLs usable by the frontend Result node;
- validates missing API key, non-2xx responses, content moderation errors, rate limiting, timeouts, empty image bytes, and malformed content type.

The mock provider is kept for unit tests.

## Architectural Decisions And Tradeoffs

- In-memory run storage is intentional for the 8-12 hour test scope. It keeps the execution model visible without PostgreSQL, Redis, BullMQ, Temporal, or Docker.
- REST polling is intentional for the same reason. It is enough for a small single-user workflow runner and simpler than SSE/WebSocket.
- Fastify was chosen over Nest to avoid boilerplate.
- Shared TypeScript types keep frontend/backend contracts aligned without generating clients.
- React Flow handles the canvas instead of a custom canvas engine.
- Preset composition and graph execution stay out of React components.
- The backend remains the source of truth for validation even though the frontend prevents invalid typed connections for UX.

## Known Limitations

- Run storage is process-local and resets when the backend restarts.
- Generated files are local to the backend machine and are not cleaned up automatically.
- There is no authentication or multi-user ownership.
- There is no persistent workflow library.
- File upload for image inputs is not implemented; image input uses a URL field.
- Real image editing is not integrated; `editImage` is structured for provider support but currently mock-compatible.
- Polling is simple and fixed interval.
- Presets are an in-memory demo catalog.
- No E2E browser automation is included.

## Production Improvements

- Persist workflows, runs, jobs, presets, and generated assets.
- Add object storage plus lifecycle cleanup for generated images.
- Add authentication and per-user access control.
- Add resumable/background job processing with durable queues if workflows become long-running.
- Add rate-limit/backoff controls and provider usage telemetry.
- Add schema validation at API boundaries.
- Add E2E tests for the editor and run flow.
- Add richer upload handling for image inputs and references.
- Add SSE/WebSocket updates if polling becomes too chatty.
