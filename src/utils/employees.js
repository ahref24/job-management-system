/** Case-insensitive employee lookup by trimmed name. */
export function findEmployeeByName(employees, name) {
  const target = String(name || "")
    .trim()
    .toLowerCase();
  if (!target || !Array.isArray(employees)) return null;
  return (
    employees.find(
      (employee) =>
        String(employee && employee.name ? employee.name : "")
          .trim()
          .toLowerCase() === target
    ) || null
  );
}
