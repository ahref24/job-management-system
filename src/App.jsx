import { useMemo, useState } from "react";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { STATUS, DEFAULT_EMPLOYEES } from "./constants";
import { SEED_JOBS } from "./utils/helpers";
import KanbanBoard from "./components/KanbanBoard";
import JobForm from "./components/JobForm";
import ConfirmDialog from "./components/ConfirmDialog";
import FilterBar from "./components/FilterBar";
import StatCards from "./components/StatCards";

const STORAGE_KEYS = {
  jobs: "jms.jobs.v1",
  employees: "jms.employees.v1",
};

const COLUMNS = [
  { status: STATUS.TODO, title: "To Do", color: "#6366f1" },
  { status: STATUS.IN_PROGRESS, title: "In Progress", color: "#f59e0b" },
  { status: STATUS.COMPLETE, title: "Complete", color: "#22c55e" },
];

export default function App() {
  const [jobs, setJobs] = useLocalStorage(STORAGE_KEYS.jobs, SEED_JOBS);
  const [employees, setEmployees] = useLocalStorage(STORAGE_KEYS.employees, DEFAULT_EMPLOYEES);

  const [statusFilter, setStatusFilter] = useState("all");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [deletingJob, setDeletingJob] = useState(null);

  const visibleJobs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return jobs.filter((job) => {
      if (statusFilter !== "all" && job.status !== statusFilter) return false;
      if (employeeFilter !== "all" && job.employeeId !== employeeFilter) return false;
      if (!query) return true;
      const employee = employees.find((e) => e.id === job.employeeId);
      const haystack = [job.title, job.description, job.notes, employee?.name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [jobs, employees, statusFilter, employeeFilter, searchQuery]);

  const jobsByStatus = useMemo(() => {
    const grouped = {
      [STATUS.TODO]: [],
      [STATUS.IN_PROGRESS]: [],
      [STATUS.COMPLETE]: [],
    };
    const now = new Date().toISOString();
    const recentFirst = [...visibleJobs].sort((a, b) => {
      const aDone = a.status === STATUS.COMPLETE;
      const bDone = b.status === STATUS.COMPLETE;
      if (aDone || bDone) {
        return new Date(b.updatedAt || b.createdAt || now) - new Date(a.updatedAt || a.createdAt || now);
      }
      const ad = a.dueDate ? new Date(a.dueDate + "T00:00:00").getTime() : Infinity;
      const bd = b.dueDate ? new Date(b.dueDate + "T00:00:00").getTime() : Infinity;
      return ad - bd;
    });
    recentFirst.forEach((job) => {
      if (grouped[job.status]) grouped[job.status].push(job);
    });
    return grouped;
  }, [visibleJobs]);

  const hasActiveFilters =
    statusFilter !== "all" || employeeFilter !== "all" || searchQuery.trim() !== "";

  const openCreateForm = () => {
    setEditingJob(null);
    setFormOpen(true);
  };

  const openEditForm = (job) => {
    setEditingJob(job);
    setFormOpen(true);
  };

  const handleSave = (savedJob) => {
    setJobs((prev) => {
      const exists = prev.some((job) => job.id === savedJob.id);
      return exists
        ? prev.map((job) => (job.id === savedJob.id ? savedJob : job))
        : [savedJob, ...prev];
    });
  };

  const handleDelete = () => {
    if (!deletingJob) return;
    setJobs((prev) => prev.filter((job) => job.id !== deletingJob.id));
    setDeletingJob(null);
  };

  const handleMoveJob = (jobId, newStatus) => {
    setJobs((prev) =>
      prev.map((job) => {
        if (job.id !== jobId || job.status === newStatus) return job;
        return { ...job, status: newStatus, updatedAt: new Date().toISOString() };
      })
    );
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-inner">
          <div className="brand">
            <span className="brand-logo">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
              </svg>
            </span>
            <span className="brand-text">
              <strong>JobBoard</strong>
              <small>Job Management System</small>
            </span>
          </div>
          <button type="button" className="btn btn-primary" onClick={openCreateForm}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Job
          </button>
        </div>
      </header>

      <div className="app-body">
        <StatCards jobs={jobs} />
        <FilterBar
          statusFilter={statusFilter}
          onStatusFilter={setStatusFilter}
          employeeFilter={employeeFilter}
          onEmployeeFilter={setEmployeeFilter}
          searchQuery={searchQuery}
          onSearchQuery={setSearchQuery}
          onClearFilters={() => {
            setStatusFilter("all");
            setEmployeeFilter("all");
            setSearchQuery("");
          }}
          employees={employees}
          hasActiveFilters={hasActiveFilters}
        />
        <KanbanBoard
          columns={COLUMNS}
          jobsByStatus={jobsByStatus}
          employees={employees}
          onEdit={openEditForm}
          onDelete={setDeletingJob}
          onMoveJob={handleMoveJob}
        />
      </div>

      {formOpen && (
        <JobForm
          job={editingJob}
          employees={employees}
          onSave={handleSave}
          onClose={() => {
            setFormOpen(false);
            setEditingJob(null);
          }}
        />
      )}

      {deletingJob && (
        <ConfirmDialog
          title="Delete job?"
          message={`"${deletingJob.title}" will be permanently removed. This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeletingJob(null)}
        />
      )}

      <footer className="app-footer">
        <p>
          Showing {visibleJobs.length} of {jobs.length} job{jobs.length === 1 ? "" : "s"} · Dragging a card moves it to
          a new status · Data is stored locally in your browser.
        </p>
      </footer>
    </div>
  );
}