export default function ApproachView() {
  return (
    <>
      <div className="page-header">
        <div>
          <h1>Approach notes</h1>
          <p>
            Talking points for the interview — how the prototype was scoped, how accuracy is
            checked, and what would come next for a real product.
          </p>
        </div>
      </div>

      <div className="layout-split">
        <section className="panel">
          <h2>What I built first</h2>
          <p className="subtle">
            Extraction contract → human approval gate → persistence. Presentation polish came after
            the data path was trustworthy.
          </p>
          <div className="notes">
            <div className="note">
              <strong>Schema-first extraction.</strong> Zod validates LLM JSON. Invalid shapes fall
              back to a deterministic mock instead of crashing or inventing fields.
            </div>
            <div className="note">
              <strong>Nulls over guesses.</strong> Missing owner / deadline / priority stay null and
              are labelled as unknowns in the UI.
            </div>
            <div className="note">
              <strong>Approval is mandatory.</strong> <code>POST /api/tasks/approve</code> only
              persists items with <code>approved: true</code>.
            </div>
            <div className="note">
              <strong>Authenticated ownership.</strong> Every API request is tied to a Supabase
              Auth user; Row Level Security scopes projects, people, and tasks to that user.
            </div>
          </div>
        </section>

        <aside className="panel">
          <h2>Discussion answers</h2>
          <p className="subtle">Ready for the 20–25 minute Q&amp;A.</p>
          <div className="notes">
            <div className="note">
              <strong>Prevent inaccurate AI output becoming fact:</strong> schema validation,
              confidence + evidence quotes, unknown fields, and a human approval step before write.
            </div>
            <div className="note">
              <strong>Required human approval:</strong> already enforced server-side — rejected
              tasks are discarded; edits are applied before insert.
            </div>
            <div className="note">
              <strong>Project data model:</strong> each task belongs to one project and may link to
              one registered person or group. Data is the project-grouped task view, not a second copy.
            </div>
            <div className="note">
              <strong>Source files:</strong> uploads are extraction-only inputs. The app persists
              accepted structured task fields and evidence, not the uploaded file.
            </div>
            <div className="note">
              <strong>Before launch:</strong> golden-message regression tests, contract tests for
              OpenAPI, audit log of approvals, and production auth/email configuration.
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
