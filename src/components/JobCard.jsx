import { useState } from "react";
import { PRIORITY_OPTIONS, STATUS_OPTIONS } from "../constants";
import { daysRemaining, formatDateDisplay, isOverdue } from "../utils/helpers";

function PriorityBadge({ priority }) {
  const option = PRIORITY_OPTIONS.find((item) => item.value === priority) || PRIORITY_OPTIONS[1];
  return (
    <span className="priority-badge" style={{ "--priority-color": option.color }}>
      {option.label}
    </span>
  );
}

function DueDate({ job }) {
  const overdue = isOverdue(job);
  const remaining = daysRemaining(job);

  let hint = "";
  if (remaining !== null) {
    if (overdue) {
      hint = remaining < 0 ? `Overdue by ${Math.abs(remaining)}d` : "Overdue";
    } else if (remaining === 0) {
      hint = "Due today";
    } else if (remaining === 1) {
      hint = "1 day left";
    } else if (remaining > 1) {
      hint = `${remaining} days left`;
    }
  }

  return (
    <span className={`due-date${overdue ? " overdue" : ""}`} title={hint || undefined}>
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <line x1="8" y1="3" x2="8" y2="7" />
        <line x1="16" y1="3" x2="16" y2="7" />
        <line x1="3" y1="11" x2="21" y2="11" />
      </svg>
      {formatDateDisplay(job.dueDate)}
      {hint && <span className="due-hint">{hint}</span>}
    </span>
  );
}

function EmployeeBadge({ employee }) {
  if (!employee) return null;
  const initials = employee.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <span className="employee-badge" title={`Assigned to ${employee.name}`}>
      <span className="avatar">{initials}</span>
      <span className="employee-name">{employee.name}</span>
    </span>
  );
}

export default function JobCard({
  job,
  employee,
  onEdit,
  onDelete,
  onStatusChange,
  onDragStart,
  onDragEnd,
}) {
  const [dragging, setDragging] = useState(false);
  const overdue = isOverdue(job);

  return (
    <article
      className={`job-card${overdue ? " is-overdue" : ""}${dragging ? " dragging" : ""}`}
      draggable
      onDragStart={(event) => {
        setDragging(true);
        onDragStart(event, job);
      }}
      onDragEnd={() => {
        setDragging(false);
        onDragEnd?.();
      }}
    >
      <header className="job-card-header">
        <PriorityBadge priority={job.priority} />
        <div className="job-actions">
          <button
            type="button"
            className="icon-btn"
            aria-label={`Edit ${job.title}`}
            title="Edit job"
            onClick={() => onEdit(job)}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </button>
          <button
            type="button"
            className="icon-btn danger"
            aria-label={`Delete ${job.title}`}
            title="Delete job"
            onClick={() => onDelete(job)}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 6h18" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </button>
        </div>
      </header>

      <h3 className="job-title" title={job.title}>
        {job.title}
      </h3>

      {job.description && <p className="job-description">{job.description}</p>}

      <footer className="job-meta">
        <EmployeeBadge employee={employee} />
        <DueDate job={job} />
      </footer>

      <div className="card-status">
        <label htmlFor={`status-${job.id}`}>Move to</label>
        <select
          id={`status-${job.id}`}
          value={job.status}
          onChange={(event) => onStatusChange?.(job.id, event.target.value)}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {job.notes && (
        <div className="job-notes">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>{job.notes}</span>
        </div>
      )}
    </article>
  );
}
