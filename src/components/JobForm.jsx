import { useEffect, useState } from "react";
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from "../constants";
import { uid } from "../utils/helpers";

const EMPTY_FORM = {
  title: "",
  description: "",
  employeeId: "",
  dueDate: "",
  priority: "medium",
  status: "todo",
  notes: "",
};

export default function JobForm({ job, employees, onSave, onClose }) {
  const [form, setForm] = useState(() =>
    job
      ? {
          title: job.title,
          description: job.description || "",
          employeeId: job.employeeId || "",
          dueDate: job.dueDate || "",
          priority: job.priority || "medium",
          status: job.status || "todo",
          notes: job.notes || "",
        }
      : { ...EMPTY_FORM }
  );

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.title.trim()) {
      nextErrors.title = "Job title is required.";
    } else if (form.title.trim().length < 3) {
      nextErrors.title = "Job title must be at least 3 characters.";
    } else if (form.title.trim().length > 120) {
      nextErrors.title = "Job title must be 120 characters or fewer.";
    }
    if (form.description && form.description.trim().length > 500) {
      nextErrors.description = "Description must be 500 characters or fewer.";
    }
    if (!form.employeeId) {
      nextErrors.employeeId = "Please assign the job to an employee.";
    }
    if (form.dueDate) {
      const date = new Date(form.dueDate + "T00:00:00");
      if (Number.isNaN(date.getTime())) {
        nextErrors.dueDate = "Please provide a valid due date.";
      }
    }
    if (!form.status) {
      nextErrors.status = "Please choose a status.";
    }
    if (form.notes && form.notes.trim().length > 1000) {
      nextErrors.notes = "Notes must be 1000 characters or fewer.";
    }
    return nextErrors;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    const now = new Date().toISOString();
    onSave({
      ...(job || {}),
      id: job ? job.id : uid("job"),
      title: form.title.trim(),
      description: form.description.trim(),
      employeeId: form.employeeId,
      dueDate: form.dueDate,
      priority: form.priority,
      status: form.status,
      notes: form.notes.trim(),
      createdAt: job ? job.createdAt : now,
      updatedAt: now,
    });
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="job-form-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <h2 id="job-form-title">{job ? "Edit Job" : "Add New Job"}</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="title">Job Title *</label>
            <input
              id="title"
              name="title"
              type="text"
              value={form.title}
              onChange={handleChange}
              placeholder="e.g. Redesign pricing page"
              className={errors.title ? "invalid" : ""}
            />
            {errors.title && <span className="field-error">{errors.title}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows="3"
              placeholder="What needs to be done?"
              className={errors.description ? "invalid" : ""}
            />
            {errors.description && <span className="field-error">{errors.description}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="employeeId">Assigned Employee *</label>
              <select
                id="employeeId"
                name="employeeId"
                value={form.employeeId}
                onChange={handleChange}
                className={errors.employeeId ? "invalid" : ""}
              >
                <option value="">Select employee…</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
              {errors.employeeId && <span className="field-error">{errors.employeeId}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="dueDate">Due Date</label>
              <input
                id="dueDate"
                name="dueDate"
                type="date"
                value={form.dueDate}
                onChange={handleChange}
                className={errors.dueDate ? "invalid" : ""}
              />
              {errors.dueDate && <span className="field-error">{errors.dueDate}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="priority">Priority</label>
              <div className="pill-select" role="radiogroup" aria-label="Priority">
                {PRIORITY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={form.priority === option.value}
                    className={`pill ${form.priority === option.value ? "selected" : ""}`}
                    style={{ "--pill-color": option.color }}
                    onClick={() => setForm((prev) => ({ ...prev, priority: option.value }))}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                value={form.status}
                onChange={handleChange}
                className={errors.status ? "invalid" : ""}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.status && <span className="field-error">{errors.status}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows="3"
              placeholder="Any additional details…"
              className={errors.notes ? "invalid" : ""}
            />
            {errors.notes && <span className="field-error">{errors.notes}</span>}
          </div>

          <footer className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Saving…" : job ? "Save Changes" : "Add Job"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}