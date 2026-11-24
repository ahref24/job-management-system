import { STATUS_OPTIONS } from "../constants";

export default function FilterBar({
  statusFilter,
  onStatusFilter,
  employeeFilter,
  onEmployeeFilter,
  searchQuery,
  onSearchQuery,
  onClearFilters,
  employees,
  hasActiveFilters,
}) {
  return (
    <div className="filter-bar">
      <div className="search-wrap">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchQuery(event.target.value)}
          placeholder="Search jobs…"
          aria-label="Search jobs"
        />
      </div>

      <select
        value={statusFilter}
        onChange={(event) => onStatusFilter(event.target.value)}
        aria-label="Filter by status"
      >
        <option value="all">All statuses</option>
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <select
        value={employeeFilter}
        onChange={(event) => onEmployeeFilter(event.target.value)}
        aria-label="Filter by volunteer"
      >
        <option value="all">All member</option>
        {employees.map((employee) => (
          <option key={employee.id} value={employee.id}>
            {employee.name}
          </option>
        ))}
      </select>

      {hasActiveFilters && (
        <button type="button" className="btn btn-ghost clear-filters" onClick={onClearFilters}>
          Clear filters
        </button>
      )}
    </div>
  );
}