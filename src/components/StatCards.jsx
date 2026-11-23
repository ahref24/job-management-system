import { STATUS } from "../constants";
import { isOverdue } from "../utils/helpers";

export default function StatCards({ jobs }) {
  const todo = jobs.filter((job) => job.status === STATUS.TODO).length;
  const inProgress = jobs.filter((job) => job.status === STATUS.IN_PROGRESS).length;
  const complete = jobs.filter((job) => job.status === STATUS.COMPLETE).length;
  const overdue = jobs.filter((job) => isOverdue(job)).length;

  const stats = [
    { label: "Total Jobs", value: jobs.length, className: "stat-total" },
    { label: "To Do", value: todo, className: "stat-todo" },
    { label: "In Progress", value: inProgress, className: "stat-progress" },
    { label: "Complete", value: complete, className: "stat-complete" },
    { label: "Overdue", value: overdue, className: "stat-overdue" },
  ];

  return (
    <section className="stats-strip" aria-label="Job statistics">
      {stats.map((stat) => (
        <div key={stat.label} className={`stat-card ${stat.className}`}>
          <span className="stat-value">{stat.value}</span>
          <span className="stat-label">{stat.label}</span>
        </div>
      ))}
    </section>
  );
}
