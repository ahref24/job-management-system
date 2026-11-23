import { useMemo, useState } from "react";
import { STATUS } from "./constants";
import { groupJobsByStatus } from "./utils/sort";
import { useJobs } from "./hooks/useJobs";
import KanbanBoard from "./components/KanbanBoard";
import JobForm from "./components/JobForm";
import ConfirmDialog from "./components/ConfirmDialog";
import FilterBar from "./components/FilterBar";
import StatCards from "./components/StatCards";
import SyncStatus from "./components/SyncStatus";

const COLUMNS = [
  { status: STATUS.TODO, title: "To Do", color: "#6366f1" },
  { status: STATUS.IN_PROGRESS, title: "In Progress", color: "#f59e0b" },
  { status: STATUS.COMPLETE, title: "Complete", color: "#22c55e" },
];

export default function App() {
  const {
    jobs,
    employees,
    mode,
    syncState,
    syncMessage,
    lastSyncedAt,
    pendingCount,
    needsImport,
    importCandidateCount,
    saveJob,
    deleteJob,
    moveJob,
    importLocal,
    retry,
  } = useJobs();

  const [statusFilter, setStatusFilter] = useState("all");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [deletingJob, setDeletingJob] = useState(null);

  const activeEmployees = useMemo(
    () => employees.filter((employee) => employee.active !== false),
    [employees]
  );

  const visibleJobs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return jobs.filter((job) => {
      if (statusFilter !== "all" && job.status !== statusFilter) return false;
      if (employeeFilter !== "all" && job.employeeId !== employeeFilter) return false;
      if (!query) return true;
      const employee = employees.find((item) => item.id === job.employeeId);
      const haystack = [job.title, job.description, job.notes, employee?.name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [jobs, employees, statusFilter, employeeFilter, searchQuery]);

  const jobsByStatus = useMemo(() => groupJobsByStatus(visibleJobs), [visibleJobs]);

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

  const handleDelete = () => {
    if (!deletingJob) return;
    deleteJob(deletingJob);
    setDeletingJob(null);
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
        <SyncStatus
          mode={mode}
          state={syncState}
          message={syncMessage}
          lastSyncedAt={lastSyncedAt}
          pendingCount={pendingCount}
          needsImport={needsImport}
          importCount={importCandidateCount}
          onRetry={retry}
          onImport={importLocal}
        />
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
          employees={activeEmployees}
          hasActiveFilters={hasActiveFilters}
        />
        <KanbanBoard
          columns={COLUMNS}
          jobsByStatus={jobsByStatus}
          employees={employees}
          onEdit={openEditForm}
          onDelete={setDeletingJob}
          onMoveJob={moveJob}
        />
      </div>

      {formOpen && (
        <JobForm
          job={editingJob}
          employees={activeEmployees}
          onSave={saveJob}
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
          Showing {visibleJobs.length} of {jobs.length} job{jobs.length === 1 ? "" : "s"} ·{" "}
          {mode === "sheets"
            ? "Data syncs to Google Sheets"
            : "Data is stored locally in your browser"}
        </p>
      </footer>
    </div>
  );
}
