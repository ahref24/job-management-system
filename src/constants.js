export const STATUS = {
  TODO: "todo",
  IN_PROGRESS: "in_progress",
  COMPLETE: "complete",
};

export const STATUS_OPTIONS = [
  { value: STATUS.TODO, label: "To Do" },
  { value: STATUS.IN_PROGRESS, label: "In Progress" },
  { value: STATUS.COMPLETE, label: "Complete" },
];

const PRIORITIES = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  URGENT: "urgent",
};

export const PRIORITY_OPTIONS = [
  { value: PRIORITIES.LOW, label: "Low", color: "#64748b" },
  { value: PRIORITIES.MEDIUM, label: "Medium", color: "#0284c7" },
  { value: PRIORITIES.HIGH, label: "High", color: "#f59e0b" },
  { value: PRIORITIES.URGENT, label: "Urgent", color: "#ef4444" },
];

export const DEFAULT_EMPLOYEES = [
  { id: "emp-1", name: "Ava Martinez", active: true },
  { id: "emp-2", name: "Liam Johnson", active: true },
  { id: "emp-3", name: "Sofia Chen", active: true },
  { id: "emp-4", name: "Noah Williams", active: true },
];
