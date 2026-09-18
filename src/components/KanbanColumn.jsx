import { useState } from "react";
import JobCard from "./JobCard";

export default function KanbanColumn({ column, jobs, employees, onEdit, onDelete, onDrop }) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragOver(false);
    const jobId = event.dataTransfer.getData("application/x-job-id");
    if (jobId) onDrop(jobId, column.status);
  };

  const employeeFor = (id) => employees.find((e) => e.id === id);

  return (
    <section
      className={`kanban-column ${isDragOver ? "drop-target" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setIsDragOver(false);
      }}
      onDrop={handleDrop}
    >
      <header className="column-header" style={{ "--column-color": column.color }}>
        <span className="column-dot" />
        <h2>{column.title}</h2>
        <span className="column-count">{jobs.length}</span>
      </header>

      <div className="column-body">
        {jobs.length === 0 ? (
          <div className="column-empty">
            <p>No jobs here</p>
          </div>
        ) : (
          jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              employee={employeeFor(job.employeeId)}
              onEdit={onEdit}
              onDelete={onDelete}
              onDragStart={(event, draggedJob) => {
                event.dataTransfer.setData("application/x-job-id", draggedJob.id);
                event.dataTransfer.effectAllowed = "move";
              }}
              onDragEnd={() => setIsDragOver(false)}
            />
          ))
        )}
      </div>
    </section>
  );
}