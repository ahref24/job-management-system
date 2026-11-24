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
    saveEmployee,
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

  // Keep the currently assigned employee selectable even if they are inactive.
  const formEmployees = useMemo(() => {
    const list = [...activeEmployees];
    if (editingJob) {
      const assigned = employees.find((employee) => employee.id === editingJob.employeeId);
      if (assigned && !list.some((employee) => employee.id === assigned.id)) {
        list.push(assigned);
      }
    }
    return list;
  }, [activeEmployees, employees, editingJob]);

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

  /**
   * A job form can submit an employee name that is not on the list yet. Create
   * (or reuse) that employee first, then attach the job to their id so both
   * rows land in the same Google Sheets write queue.
   */
  const handleSaveJob = (job, options = {}) => {
    if (options.newEmployeeName) {
      const employee = saveEmployee({ name: options.newEmployeeName });
      saveJob(employee ? { ...job, employeeId: employee.id } : job);
      return;
    }
    saveJob(job);
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
              <strong>TaskBoard</strong>
              <small>DGM Core task management</small>
            </span>
          </div>
          <button type="button" className="btn btn-primary" onClick={openCreateForm}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Task
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
          employees={formEmployees}
          onSave={handleSaveJob}
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
