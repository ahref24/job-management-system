import KanbanColumn from "./KanbanColumn";

export default function KanbanBoard({ columns, jobsByStatus, employees, onEdit, onDelete, onMoveJob }) {
  return (
    <main className="kanban-board">
      {columns.map((column) => (
        <KanbanColumn
          key={column.status}
          column={column}
          jobs={jobsByStatus[column.status] || []}
          employees={employees}
          onEdit={onEdit}
          onDelete={onDelete}
          onDrop={onMoveJob}
        />
      ))}
    </main>
  );
}