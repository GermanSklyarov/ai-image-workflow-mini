import type {
  ImageValue,
  PortDataType,
  PortDefinition,
  WorkflowDefinition,
  WorkflowNode,
  WorkflowRun
} from "@ai-image-workflow/shared-types";
import assert from "node:assert/strict";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import type {
  EditImageInput,
  GenerateImageInput,
  ImageGenerationProvider,
} from "../ai/image-generation-provider";
import { PresetStore } from "../presets";
import { validateWorkflow } from "../workflows";
import { RunStore } from "./run-store";
import { WorkflowExecutor } from "./workflow-executor";

class TestProvider implements ImageGenerationProvider {
  readonly calls: Array<{ prompt: string; startedAt: number; finishedAt?: number }> =
    [];
  private readonly delayMs: number;
  private readonly failNodeNames: string[];
  private failOncePrompts: string[];

  constructor(
    options: {
      delayMs?: number;
      failNodeNames?: string[];
      failOncePrompts?: string[];
    } = {},
  ) {
    this.delayMs = options.delayMs ?? 0;
    this.failNodeNames = options.failNodeNames ?? [];
    this.failOncePrompts = options.failOncePrompts ?? [];
  }

  async generate(input: GenerateImageInput): Promise<ImageValue> {
    const startedAt = Date.now();
    const call: { prompt: string; startedAt: number; finishedAt?: number } = {
      prompt: input.prompt,
      startedAt,
    };
    this.calls.push(call);

    if (this.delayMs) {
      await delay(this.delayMs);
    }

    const shouldFail = this.failNodeNames.some((name) =>
      input.prompt.includes(name),
    );
    const shouldFailOnce = this.failOncePrompts.some((name) =>
      input.prompt.includes(name),
    );

    if (shouldFail) {
      throw new Error(`Generation failed for "${input.prompt}".`);
    }

    if (shouldFailOnce) {
      this.failOncePrompts = this.failOncePrompts.filter(
        (name) => !input.prompt.includes(name),
      );
      throw new Error(`Temporary generation failure for "${input.prompt}".`);
    }

    call.finishedAt = Date.now();

    return {
      type: "image",
      url: `mock://${encodeURIComponent(input.prompt)}`,
      mimeType: "image/png",
    };
  }

  async edit(input: EditImageInput): Promise<ImageValue> {
    const image: ImageValue = {
      type: "image",
      url: `${input.image.url}?edited=true`,
    };

    if (input.image.mimeType) {
      image.mimeType = input.image.mimeType;
    }

    return image;
  }
}

const port = (
  nodeId: string,
  id: string,
  direction: "input" | "output",
  dataType: PortDataType,
  required = direction === "input",
): PortDefinition => ({
  id,
  nodeId,
  name: id,
  direction,
  dataType,
  required,
});

const promptNode = (id = "prompt", prompt = "User prompt"): WorkflowNode => ({
  id,
  type: "prompt",
  name: id,
  ports: [port(id, "text", "output", "text", false)],
  data: {
    prompt,
  },
});

const generateNode = (id: string, promptOverride?: string): WorkflowNode => ({
  id,
  type: "generateImage",
  name: id,
  ports: [
    port(id, "prompt", "input", "text"),
    port(id, "image", "output", "image", false),
  ],
  data: promptOverride ? { promptOverride } : {},
});

const resultNode = (id: string, dataType: PortDataType = "image"): WorkflowNode => ({
  id,
  type: "result",
  name: id,
  ports: [
    port(id, "input", "input", dataType),
    port(id, "value", "output", dataType, false),
  ],
  data: {},
});

const workflow = (
  nodes: WorkflowNode[],
  edges: WorkflowDefinition["edges"],
): WorkflowDefinition => ({
  id: "workflow",
  name: "Test workflow",
  nodes,
  edges,
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
});

const edge = (
  sourceNodeId: string,
  sourcePortId: string,
  targetNodeId: string,
  targetPortId: string,
) => ({
  id: `${sourceNodeId}-${targetNodeId}`,
  sourceNodeId,
  sourcePortId,
  targetNodeId,
  targetPortId,
});

const createExecutor = (provider = new TestProvider()) =>
  new WorkflowExecutor(new RunStore(), provider, new PresetStore());

const waitForRun = async (
  executor: WorkflowExecutor,
  runId: string,
): Promise<WorkflowRun> => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const run = executor.getRun(runId);

    if (run && (run.status === "completed" || run.status === "failed")) {
      return run;
    }

    await delay(10);
  }

  throw new Error("Run did not finish in time.");
};

test("executes a linear workflow", async () => {
  const executor = createExecutor();
  const run = executor.createRun({
    workflow: workflow(
      [promptNode(), generateNode("generate"), resultNode("result")],
      [
        edge("prompt", "text", "generate", "prompt"),
        edge("generate", "image", "result", "input"),
      ],
    ),
  });

  const completedRun = await waitForRun(executor, run.id);

  assert.equal(completedRun.status, "completed");
  assert.deepEqual(
    completedRun.jobs.map((job) => job.status),
    ["success", "success", "success"],
  );
  const resultOutput = completedRun.nodeOutputs.result?.value;
  assert.ok(resultOutput);
  assert.equal(resultOutput.type, "image");
});

test("executes branching workflow outputs", async () => {
  const executor = createExecutor();
  const run = executor.createRun({
    workflow: workflow(
      [
        promptNode(),
        generateNode("generateA"),
        generateNode("generateB"),
        resultNode("resultA"),
        resultNode("resultB"),
      ],
      [
        edge("prompt", "text", "generateA", "prompt"),
        edge("prompt", "text", "generateB", "prompt"),
        edge("generateA", "image", "resultA", "input"),
        edge("generateB", "image", "resultB", "input"),
      ],
    ),
  });

  const completedRun = await waitForRun(executor, run.id);

  assert.equal(completedRun.status, "completed");
  const resultAOutput = completedRun.nodeOutputs.resultA?.value;
  const resultBOutput = completedRun.nodeOutputs.resultB?.value;
  assert.ok(resultAOutput);
  assert.ok(resultBOutput);
  assert.equal(resultAOutput.type, "image");
  assert.equal(resultBOutput.type, "image");
});

test("executes independent generation nodes in parallel", async () => {
  const provider = new TestProvider({ delayMs: 80 });
  const executor = createExecutor(provider);
  const run = executor.createRun({
    workflow: workflow(
      [promptNode(), generateNode("generateA"), generateNode("generateB")],
      [
        edge("prompt", "text", "generateA", "prompt"),
        edge("prompt", "text", "generateB", "prompt"),
      ],
    ),
  });

  await waitForRun(executor, run.id);

  assert.equal(provider.calls.length, 2);
  const [first, second] = provider.calls;
  assert.ok(first);
  assert.ok(second);
  assert.ok(
    second.startedAt < (first.finishedAt ?? Number.MAX_SAFE_INTEGER),
    "second generation should start before first generation finishes",
  );
});

test("respects dependency ordering", async () => {
  const provider = new TestProvider();
  const executor = createExecutor(provider);
  const run = executor.createRun({
    workflow: workflow(
      [
        promptNode(),
        resultNode("middle", "text"),
        generateNode("generate"),
      ],
      [
        edge("prompt", "text", "middle", "input"),
        edge("middle", "value", "generate", "prompt"),
      ],
    ),
  });

  const completedRun = await waitForRun(executor, run.id);
  const middleJob = completedRun.jobs.find((job) => job.nodeId === "middle");
  const generateJob = completedRun.jobs.find((job) => job.nodeId === "generate");

  assert.equal(completedRun.status, "completed");
  assert.ok(middleJob?.finishedAt);
  assert.ok(generateJob?.startedAt);
  assert.ok(
    Date.parse(generateJob.startedAt) >= Date.parse(middleJob.finishedAt),
    "generate should start only after its upstream result node succeeds",
  );
});

test("represents failure in one branch clearly", async () => {
  const provider = new TestProvider({ failNodeNames: ["fail"] });
  const executor = createExecutor(provider);
  const run = executor.createRun({
    workflow: workflow(
      [
        promptNode("prompt", "prompt"),
        generateNode("fail", "fail"),
        generateNode("ok"),
        resultNode("resultOk"),
      ],
      [
        edge("prompt", "text", "fail", "prompt"),
        edge("prompt", "text", "ok", "prompt"),
        edge("ok", "image", "resultOk", "input"),
      ],
    ),
  });

  const failedRun = await waitForRun(executor, run.id);

  assert.equal(failedRun.status, "failed");
  assert.equal(failedRun.jobs.find((job) => job.nodeId === "fail")?.status, "error");
  assert.equal(failedRun.jobs.find((job) => job.nodeId === "ok")?.status, "success");
  assert.equal(
    failedRun.jobs.find((job) => job.nodeId === "resultOk")?.status,
    "success",
  );
});

test("retries a failed executable node and continues downstream nodes", async () => {
  const provider = new TestProvider({ failOncePrompts: ["retry me"] });
  const executor = createExecutor(provider);
  const run = executor.createRun({
    workflow: workflow(
      [promptNode("prompt", "retry me"), generateNode("generate"), resultNode("result")],
      [
        edge("prompt", "text", "generate", "prompt"),
        edge("generate", "image", "result", "input"),
      ],
    ),
  });

  const failedRun = await waitForRun(executor, run.id);
  assert.equal(failedRun.status, "failed");
  assert.equal(
    failedRun.jobs.find((job) => job.nodeId === "generate")?.status,
    "error",
  );

  const completedRun = await executor.retryNode(run.id, "generate");

  assert.equal(completedRun.status, "completed");
  assert.equal(
    completedRun.jobs.find((job) => job.nodeId === "generate")?.attempts,
    2,
  );
  assert.equal(
    completedRun.jobs.find((job) => job.nodeId === "result")?.status,
    "success",
  );
});

test("detects cycles", () => {
  const prompt = promptNode("prompt");
  const result = resultNode("result", "text");
  const cyclicWorkflow = workflow(
    [prompt, result],
    [
      edge("prompt", "text", "result", "input"),
      edge("result", "value", "prompt", "text"),
    ],
  );

  const validation = validateWorkflow(cyclicWorkflow);

  assert.equal(validation.valid, false);
  assert.ok(validation.issues.some((issue) => issue.code === "cycle_detected"));
});
