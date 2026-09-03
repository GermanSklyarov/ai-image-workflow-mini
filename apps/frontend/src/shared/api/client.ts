import type {
  CreateRunRequest,
  CreateRunResponse,
  Preset,
  WorkflowRun,
} from "@ai-image-workflow/shared-types";

const parseJson = async <T>(response: Response): Promise<T> => {
  const body = (await response.json().catch(() => undefined)) as
    | { message?: string }
    | undefined;

  if (!response.ok) {
    throw new Error(body?.message ?? `API request failed with ${response.status}`);
  }

  return body as T;
};

export const apiClient = {
  async listPresets(): Promise<Preset[]> {
    return parseJson<Preset[]>(await fetch("/presets"));
  },

  async createRun(request: CreateRunRequest): Promise<CreateRunResponse> {
    return parseJson<CreateRunResponse>(
      await fetch("/runs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      }),
    );
  },

  async getRun(runId: string): Promise<WorkflowRun> {
    return parseJson<WorkflowRun>(await fetch(`/runs/${runId}`));
  },

  async retryNode(runId: string, nodeId: string): Promise<WorkflowRun> {
    return parseJson<WorkflowRun>(
      await fetch(`/runs/${runId}/retry/${nodeId}`, {
        method: "POST",
      }),
    );
  },
};
