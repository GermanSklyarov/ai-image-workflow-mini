import type { WorkflowRun } from "@ai-image-workflow/shared-types";

interface RunStatusPanelProps {
  run: WorkflowRun | null;
  error: string | null;
}

export const RunStatusPanel = ({ run, error }: RunStatusPanelProps) => (
  <aside className="panel run-panel">
    <h2>Run</h2>
    {error && <div className="alert">{error}</div>}
    {!run && !error && <p className="muted">Run the workflow to see job states.</p>}
    {run && (
      <>
        <div className={`run-status run-status--${run.status}`}>{run.status}</div>
        <div className="job-list">
          {run.jobs.map((job) => (
            <div className="job-row" key={job.id}>
              <span>{job.nodeId}</span>
              <strong>{job.status}</strong>
              {job.error && <small>{job.error.message}</small>}
            </div>
          ))}
        </div>
      </>
    )}
  </aside>
);
