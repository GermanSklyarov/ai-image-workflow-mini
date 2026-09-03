# AI Image Workflow Mini

Minimal technical-test implementation plan and scaffold.

## Target Architecture

This project is a small TypeScript monorepo:

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
          workflows/
          runs/
          presets/
          ai/
        shared/
  packages/
    shared-types/
  README.md
```

Frontend: React, TypeScript, Vite, `@xyflow/react`.

Backend: Fastify, TypeScript.

Shared domain contracts live in `packages/shared-types` and are reused by both apps. Runs and jobs are stored in memory. The browser talks to the backend via REST and polls run status. AI API keys belong only to the backend.

## Frontend Responsibilities

`app`: app bootstrap, providers, routing composition.

`pages`: route-level screens such as the workflow editor page and run details page.

`widgets`: composed UI blocks, for example graph canvas, run status panel, preset selector.

`features`: user actions with business intent, for example creating a run, retrying a failed node, connecting graph ports, selecting a preset.

`entities`: domain-facing frontend models and adapters for workflows, presets, runs, jobs, nodes, and ports.

`shared`: UI primitives, API client, config, utility code with no domain ownership.

## Backend Responsibilities

`modules/workflows`: workflow definition validation, typed port compatibility, dependency graph helpers.

`modules/runs`: run creation, in-memory run/job storage, graph execution orchestration, retry failed node.

`modules/presets`: preset catalog/storage and lookup.

`modules/ai`: `ImageGenerationProvider` boundary, Stability AI provider, mock provider for tests, and generated image storage.

`shared`: Fastify setup, environment parsing, common errors/utilities.

## Execution Algorithm

```text
startRun(workflow):
  validate workflow graph and port compatibility
  create run with queued status
  create queued jobs for workflow nodes
  mark source/input nodes as success with their provided outputs
  set run status to running
  scheduleReadyJobs()

scheduleReadyJobs():
  readyJobs = executable jobs where:
    job status is queued
    every upstream dependency has status success

  if readyJobs is empty:
    if any job is running:
      return
    if any executable job is error:
      mark run failed
    else:
      mark run completed
    return

  for each ready job:
    mark job running
    execute job asynchronously
      on success:
        store outputs
        mark job success
        scheduleReadyJobs()
      on error:
        store error
        mark job error
        if no other jobs can progress, mark run failed

retryNode(runId, nodeId):
  require failed executable job
  clear its error/output
  mark it queued
  clear downstream job outputs and reset downstream jobs to queued
  set run status running
  scheduleReadyJobs()
```

Because `scheduleReadyJobs` starts every currently ready job without waiting for sibling branches, this graph can execute `Generate A` and `Generate B` concurrently:

```text
Prompt
  |-- Generate A -- Result A
  `-- Generate B -- Result B
```

## Current Scope

Implemented:

- project scaffold;
- pragmatic FSD frontend folders;
- Fastify backend module folders;
- reusable shared TypeScript domain types;
- AI provider interface, Stability AI provider, and mock provider for tests;
- workflow validation for missing references, typed ports, required inputs, and cycles;
- in-memory runs;
- dependency-based graph execution with concurrent ready nodes;
- REST endpoints for creating, reading, and retrying runs;
- React Flow editor with typed handles and polling run status;
- local generated image storage served from `/generated/:fileName`.

Not implemented yet:

- real edit-image provider call.

## Stability AI Setup

The backend uses Stability AI Stable Image Core:

```text
POST https://api.stability.ai/v2beta/stable-image/generate/core
```

Create a local `.env` file in the repository root or in `apps/backend/`:

```text
STABILITY_API_KEY=
```

Put the Stability API key after `=`. The key is read only by the backend and is never sent to frontend code. Generated image bytes are saved under a backend-controlled `generated/` directory and returned to the frontend as local `/generated/...` URLs.

Run both apps from the repository root:

```bash
npm run dev
```
