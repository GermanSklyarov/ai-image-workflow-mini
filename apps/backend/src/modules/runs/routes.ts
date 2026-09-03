import type { FastifyInstance } from "fastify";
import type { CreateRunRequest } from "@ai-image-workflow/shared-types";
import { MockImageGenerationProvider } from "../ai/mock-image-generation-provider";
import { PresetStore } from "../presets";
import { WorkflowValidationError, WorkflowExecutor } from "./workflow-executor";
import { RunStore } from "./run-store";

export interface RunsRoutesOptions {
  executor?: WorkflowExecutor;
}

export const registerRunsRoutes = (
  app: FastifyInstance,
  options: RunsRoutesOptions = {},
) => {
  const executor =
    options.executor ??
    new WorkflowExecutor(
      new RunStore(),
      new MockImageGenerationProvider(),
      new PresetStore(),
    );

  app.post<{ Body: CreateRunRequest }>("/runs", async (request, reply) => {
    try {
      const run = executor.createRun(request.body);
      return reply.code(202).send({ runId: run.id });
    } catch (error) {
      if (error instanceof WorkflowValidationError) {
        return reply.code(400).send({
          message: error.message,
          issues: error.issues,
        });
      }

      throw error;
    }
  });

  app.get<{ Params: { runId: string } }>("/runs/:runId", async (request, reply) => {
    const run = executor.getRun(request.params.runId);

    if (!run) {
      return reply.code(404).send({
        message: `Run "${request.params.runId}" does not exist.`,
      });
    }

    return run;
  });

  app.post<{ Params: { runId: string; nodeId: string } }>(
    "/runs/:runId/retry/:nodeId",
    async (request, reply) => {
      try {
        const run = await executor.retryNode(
          request.params.runId,
          request.params.nodeId,
        );

        return reply.send(run);
      } catch (error) {
        return reply.code(400).send({
          message: error instanceof Error ? error.message : "Unable to retry node.",
        });
      }
    },
  );
};
