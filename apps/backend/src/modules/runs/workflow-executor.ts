import type {
  ImageValue,
  NodeOutputMap,
  PortValue,
  Preset,
  TextValue,
  WorkflowDefinition,
  WorkflowJob,
  WorkflowNode,
  WorkflowRun,
} from "@ai-image-workflow/shared-types";
import { randomUUID } from "node:crypto";
import type { ImageGenerationProvider } from "../ai/image-generation-provider";
import { buildGenerationRequest } from "../ai/request-builder";
import type { PresetStore } from "../presets";
import {
  createWorkflowGraph,
  readNodeInputs,
  validateWorkflow,
  type WorkflowGraph,
} from "../workflows";
import type { RunStore } from "./run-store";

export interface CreateRunInput {
  workflow: WorkflowDefinition;
  presetId?: string;
}

export class WorkflowValidationError extends Error {
  constructor(public readonly issues: ReturnType<typeof validateWorkflow>["issues"]) {
    super(issues.map((issue) => issue.message).join(" "));
  }
}

export class WorkflowExecutor {
  constructor(
    private readonly store: RunStore,
    private readonly provider: ImageGenerationProvider,
    private readonly presetStore: PresetStore,
  ) {}

  createRun(input: CreateRunInput): WorkflowRun {
    const validation = validateWorkflow(input.workflow);

    if (!validation.valid) {
      throw new WorkflowValidationError(validation.issues);
    }

    const now = new Date().toISOString();
    const run: WorkflowRun = {
      id: randomUUID(),
      workflow: input.workflow,
      status: "queued",
      jobs: input.workflow.nodes.map((node) => ({
        id: randomUUID(),
        runId: "",
        nodeId: node.id,
        status: "queued",
        attempts: 0,
        queuedAt: now,
      })),
      nodeOutputs: {},
      createdAt: now,
      updatedAt: now,
    };

    if (input.presetId) {
      run.presetId = input.presetId;
    }

    run.jobs = run.jobs.map((job) => ({
      ...job,
      runId: run.id,
    }));

    this.store.create(run);
    void this.execute(run.id);

    return run;
  }

  getRun(runId: string): WorkflowRun | undefined {
    return this.store.get(runId);
  }

  async retryNode(runId: string, nodeId: string): Promise<WorkflowRun> {
    const run = this.requireRun(runId);
    const graph = createWorkflowGraph(run.workflow);
    const job = this.requireJob(run, nodeId);
    const node = graph.nodesById.get(nodeId);

    if (!node || (node.type !== "generateImage" && node.type !== "editImage")) {
      throw new Error(`Node "${nodeId}" is not retryable.`);
    }

    if (job.status !== "error") {
      throw new Error(`Node "${nodeId}" is not in error status.`);
    }

    const downstream = this.collectDownstreamNodeIds(nodeId, graph);

    for (const downstreamNodeId of downstream) {
      const downstreamJob = this.requireJob(run, downstreamNodeId);
      downstreamJob.status = "queued";
      delete downstreamJob.error;
      delete downstreamJob.output;
      delete downstreamJob.input;
      delete downstreamJob.startedAt;
      delete downstreamJob.finishedAt;
      delete run.nodeOutputs[downstreamNodeId];
    }

    job.status = "queued";
    delete job.error;
    delete job.output;
    delete job.input;
    delete job.startedAt;
    delete job.finishedAt;
    delete run.nodeOutputs[nodeId];

    run.status = "running";
    delete run.finishedAt;
    delete run.error;
    this.store.update(run);

    await this.execute(runId);
    return this.requireRun(runId);
  }

  private async execute(runId: string): Promise<void> {
    const run = this.requireRun(runId);
    const graph = createWorkflowGraph(run.workflow);

    if (run.status === "queued") {
      run.status = "running";
      run.startedAt = new Date().toISOString();
      this.store.update(run);
    }

    while (run.status === "running") {
      const readyJobs = run.jobs.filter(
        (job) =>
          job.status === "queued" &&
          this.dependenciesSucceeded(job.nodeId, graph, run),
      );

      if (readyJobs.length === 0) {
        run.finishedAt = new Date().toISOString();

        if (run.jobs.every((job) => job.status === "success")) {
          run.status = "completed";
        } else if (run.jobs.some((job) => job.status === "error")) {
          run.status = "failed";
          run.error = {
            message: "One or more workflow branches failed.",
          };
        } else {
          run.status = "failed";
          run.error = {
            message: "Workflow cannot progress because dependencies are not satisfied.",
          };
        }

        this.store.update(run);
        return;
      }

      await Promise.all(
        readyJobs.map(async (job) => {
          await this.executeJob(run, job, graph);
          this.store.update(run);
        }),
      );
    }
  }

  private async executeJob(
    run: WorkflowRun,
    job: WorkflowJob,
    graph: WorkflowGraph,
  ): Promise<void> {
    const node = graph.nodesById.get(job.nodeId);

    if (!node || job.status !== "queued") {
      return;
    }

    const now = new Date().toISOString();
    job.status = "running";
    job.startedAt = now;
    job.attempts += 1;
    delete job.error;
    this.store.update(run);

    try {
      const input = readNodeInputs(node.id, graph, run.nodeOutputs);
      const output = await this.executeNode(node, input, this.resolvePreset(run, node));
      const finishedAt = new Date().toISOString();

      job.input = input;
      job.output = output;
      job.status = "success";
      job.finishedAt = finishedAt;
      run.nodeOutputs[node.id] = output;
    } catch (error) {
      job.status = "error";
      job.finishedAt = new Date().toISOString();
      job.error = {
        message: error instanceof Error ? error.message : "Unknown workflow node error.",
      };
    }
  }

  private async executeNode(
    node: WorkflowNode,
    input: Record<string, PortValue>,
    preset: Preset | undefined,
  ): Promise<NodeOutputMap> {
    const outputPort = node.ports.find((port) => port.direction === "output");

    if (!outputPort) {
      return {};
    }

    switch (node.type) {
      case "prompt":
        return {
          [outputPort.id]: {
            type: "text",
            value: node.data.prompt,
          } satisfies TextValue,
        };
      case "imageInput":
        {
          const image: ImageValue = {
            type: "image",
            url: node.data.imageUrl,
          };

          if (node.data.mimeType) {
            image.mimeType = node.data.mimeType;
          }

          return {
            [outputPort.id]: image,
          };
        }
      case "generateImage": {
        const prompt = this.findInput(input, "text");
        const promptText =
          node.data.promptOverride ??
          (prompt.type === "text" ? prompt.value : undefined);

        if (!promptText) {
          throw new Error(`Generate node "${node.id}" requires text input.`);
        }

        const image = await this.provider.generate(
          buildGenerationRequest(promptText, preset),
        );

        return {
          [outputPort.id]: image,
        };
      }
      case "editImage": {
        const image = this.findInput(input, "image");
        const instruction = node.data.instruction ?? "Edit image";

        if (image.type !== "image") {
          throw new Error(`Edit node "${node.id}" requires image input.`);
        }

        const editInput = {
          image,
          instruction,
        };

        if (preset?.negativePrompt) {
          Object.assign(editInput, {
            negativePrompt: preset.negativePrompt,
          });
        }

        if (preset?.references.length) {
          Object.assign(editInput, {
            references: preset.references,
          });
        }

        const editedImage = await this.provider.edit(editInput);

        return {
          [outputPort.id]: editedImage,
        };
      }
      case "result": {
        const value = Object.values(input)[0];

        if (!value) {
          throw new Error(`Result node "${node.id}" requires upstream value.`);
        }

        return {
          [outputPort.id]: value,
        };
      }
    }
  }

  private findInput(
    input: Record<string, PortValue>,
    dataType: PortValue["type"],
  ): PortValue {
    const value = Object.values(input).find((item) => item.type === dataType);

    if (!value) {
      throw new Error(`Missing ${dataType} input.`);
    }

    return value;
  }

  private dependenciesSucceeded(
    nodeId: string,
    graph: WorkflowGraph,
    run: WorkflowRun,
  ): boolean {
    return (graph.incomingByNodeId.get(nodeId) ?? []).every((edge) => {
      const dependencyJob = run.jobs.find((job) => job.nodeId === edge.sourceNodeId);
      return dependencyJob?.status === "success";
    });
  }

  private collectDownstreamNodeIds(
    nodeId: string,
    graph: WorkflowGraph,
    visited = new Set<string>(),
  ): Set<string> {
    for (const edge of graph.outgoingByNodeId.get(nodeId) ?? []) {
      if (!visited.has(edge.targetNodeId)) {
        visited.add(edge.targetNodeId);
        this.collectDownstreamNodeIds(edge.targetNodeId, graph, visited);
      }
    }

    return visited;
  }

  private resolvePreset(
    run: WorkflowRun,
    node: WorkflowNode,
  ): Preset | undefined {
    const presetId =
      node.type === "generateImage" || node.type === "editImage"
        ? node.data.presetId ?? run.presetId
        : run.presetId;

    if (!presetId) {
      return undefined;
    }

    const preset = this.presetStore.getById(presetId);

    if (!preset) {
      throw new Error(`Preset "${presetId}" does not exist.`);
    }

    return preset;
  }

  private requireRun(runId: string): WorkflowRun {
    const run = this.store.get(runId);

    if (!run) {
      throw new Error(`Run "${runId}" does not exist.`);
    }

    return run;
  }

  private requireJob(run: WorkflowRun, nodeId: string): WorkflowJob {
    const job = run.jobs.find((item) => item.nodeId === nodeId);

    if (!job) {
      throw new Error(`Job for node "${nodeId}" does not exist.`);
    }

    return job;
  }
}
