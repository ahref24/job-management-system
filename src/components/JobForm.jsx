import { useMemo, useRef, useState } from "react";
import { PRIORITY_OPTIONS, STATUS, STATUS_OPTIONS } from "../constants";
import { formatDateTimeDisplay, normalizeDueDate, uid } from "../utils/helpers";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { appendHistory, describeHistoryEntry, parseHistory } from "../utils/history";
import { findEmployeeByName } from "../utils/employees";

const EMPTY_FORM = {
  title: "",
  description: "",
  employeeName: "",
  dueDate: "",
  priority: "medium",
  status: "todo",
  notes: "",
};

const PRIORITY_KEYS = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];

const employeeNameFor = (employees, employeeId) =>
  employees.find((employee) => employee.id === employeeId)?.name || "";

export default function JobForm({ job, employees, onSave, onClose }) {
  const [form, setForm] = useState(() =>
    job
      ? {
          title: job.title,
          description: job.description || "",
          employeeName: employeeNameFor(employees, job.employeeId),
          dueDate: normalizeDueDate(job.dueDate),
          priority: job.priority || "medium",
          status: job.status || "todo",
          notes: job.notes || "",
        }
      : { ...EMPTY_FORM }
  );

  const historyEntries = useMemo(() => {
    if (!job) return [];
    return parseHistory(job.history).slice().reverse().slice(0, 6);
  }, [job]);

  const [errors, setErrors] = useState({});
  const modalRef = useRef(null);
  const titleRef = useRef(null);

  useFocusTrap(modalRef, { onEscape: onClose, initialFocusRef: titleRef });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handlePriorityKeyDown = (event) => {
    if (!PRIORITY_KEYS.includes(event.key)) return;
    event.preventDefault();
    const currentIndex = PRIORITY_OPTIONS.findIndex((option) => option.value === form.priority);
    const delta = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
    const nextIndex = (currentIndex + delta + PRIORITY_OPTIONS.length) % PRIORITY_OPTIONS.length;
    setForm((prev) => ({ ...prev, priority: PRIORITY_OPTIONS[nextIndex].value }));
    const buttons = event.currentTarget.querySelectorAll("button[role='radio']");
    if (buttons[nextIndex]) buttons[nextIndex].focus();
  };

  const validate = () => {
    const nextErrors = {};
    const title = form.title.trim();
    if (!title) {
      nextErrors.title = "Job title is required.";
    } else if (title.length < 3) {
      nextErrors.title = "Job title must be at least 3 characters.";
    } else if (title.length > 120) {
      nextErrors.title = "Job title must be 120 characters or fewer.";
    }
    if (form.description.trim().length > 500) {
      nextErrors.description = "Description must be 500 characters or fewer.";
    }
    if (!form.employeeName.trim()) {
      nextErrors.employeeName = "Please assign the job to an employee.";
    }
    if (form.dueDate.trim() && !normalizeDueDate(form.dueDate)) {
      nextErrors.dueDate = "Please provide a valid due date.";
    }
    if (!form.status) {
      nextErrors.status = "Please choose a status.";
    }
    if (form.notes.trim().length > 1000) {
      nextErrors.notes = "Notes must be 1000 characters or fewer.";
    }
    return nextErrors;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const now = new Date().toISOString();
    const employeeName = form.employeeName.trim();
    const matchedEmployee = findEmployeeByName(employees, employeeName);
    const employeeId = matchedEmployee ? matchedEmployee.id : "";

    const nextJob = {
      ...(job || {}),
      id: job ? job.id : uid("job"),
      title: form.title.trim(),
      description: form.description.trim(),
      employeeId,
      dueDate: normalizeDueDate(form.dueDate),
      priority: form.priority,
      status: form.status,
      notes: form.notes.trim(),
      createdAt: job ? job.createdAt : now,
      updatedAt: now,
    };

    let history = job ? job.history || "" : "";
    if (job) {
      const changedFields = [];
      if ((job.title || "") !== nextJob.title) changedFields.push("title");
      if ((job.description || "") !== nextJob.description) changedFields.push("description");
      if ((job.employeeId || "") !== nextJob.employeeId) changedFields.push("employeeId");
      if (normalizeDueDate(job.dueDate) !== nextJob.dueDate) changedFields.push("dueDate");
      if ((job.priority || "medium") !== nextJob.priority) changedFields.push("priority");
      if ((job.notes || "") !== nextJob.notes) changedFields.push("notes");

      if ((job.status || STATUS.TODO) !== form.status) {
        history = appendHistory(history, {
          at: now,
          type: "status",
          from: job.status,
          to: form.status,
        });
      }
      if (changedFields.length > 0) {
        history = appendHistory(history, { at: now, type: "edit", fields: changedFields });
      }
    } else {
      history = appendHistory("", { at: now, type: "created" });
    }

    nextJob.history = history;
    nextJob.completedAt =
      form.status === STATUS.COMPLETE
        ? job && job.status === STATUS.COMPLETE
          ? job.completedAt || now
          : now
        : "";

    onSave(
      nextJob,
      matchedEmployee ? undefined : { newEmployeeName: employeeName }
    );
    onClose();
  };

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="job-form-title"
        ref={modalRef}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <h2 id="job-form-title">{job ? "Edit Task" : "Add New Task"}</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="title">Task Title *</label>
            <input
              id="title"
              name="title"
              type="text"
              ref={titleRef}
              value={form.title}
              onChange={handleChange}
              placeholder="e.g. Redesign pricing page"
              className={errors.title ? "invalid" : ""}
              maxLength={120}
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? "title-error" : undefined}
            />
            {errors.title && (
              <span className="field-error" id="title-error">
                {errors.title}
              </span>
            )}
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
              maxLength={500}
              aria-invalid={Boolean(errors.description)}
              aria-describedby={errors.description ? "description-error" : undefined}
            />
            {errors.description && (
              <span className="field-error" id="description-error">
                {errors.description}
              </span>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="employeeName">Assigned Member *</label>
              <input
                id="employeeName"
                name="employeeName"
                type="text"
                list="employee-options"
                value={form.employeeName}
                onChange={handleChange}
                placeholder="Select or type a name…"
                autoComplete="off"
                className={errors.employeeName ? "invalid" : ""}
                aria-invalid={Boolean(errors.employeeName)}
                aria-describedby={
                  errors.employeeName ? "employeeName-error employeeName-hint" : "employeeName-hint"
                }
              />
              <datalist id="employee-options">
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.name} />
                ))}
              </datalist>
              <span className="field-hint" id="employeeName-hint">
                Pick someone from the list or type a new name — they are added to the
                member list automatically.
              </span>
              {errors.employeeName && (
                <span className="field-error" id="employeeName-error">
                  {errors.employeeName}
                </span>
              )}
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
                aria-invalid={Boolean(errors.dueDate)}
                aria-describedby={errors.dueDate ? "dueDate-error" : undefined}
              />
              {errors.dueDate && (
                <span className="field-error" id="dueDate-error">
                  {errors.dueDate}
                </span>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <span className="form-label" id="priority-label">
                Priority
              </span>
              <div
                className="pill-select"
                role="radiogroup"
                aria-labelledby="priority-label"
                onKeyDown={handlePriorityKeyDown}
              >
                {PRIORITY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={form.priority === option.value}
                    tabIndex={form.priority === option.value ? 0 : -1}
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
                aria-invalid={Boolean(errors.status)}
                aria-describedby={errors.status ? "status-error" : undefined}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.status && (
                <span className="field-error" id="status-error">
                  {errors.status}
                </span>
              )}
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
              maxLength={1000}
              aria-invalid={Boolean(errors.notes)}
              aria-describedby={errors.notes ? "notes-error" : undefined}
            />
            {errors.notes && (
              <span className="field-error" id="notes-error">
                {errors.notes}
              </span>
            )}
          </div>

          {job && historyEntries.length > 0 && (
            <section className="job-history" aria-label="Update history">
              <h3>Update history</h3>
              <ul>
                {historyEntries.map((entry, index) => (
                  <li key={`${entry.at}-${index}`}>
                    <time dateTime={entry.at}>{formatDateTimeDisplay(entry.at)}</time>
                    <span>{describeHistoryEntry(entry)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <footer className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {job ? "Save Changes" : "Add Task"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
