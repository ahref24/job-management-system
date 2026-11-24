import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_EMPLOYEES, STATUS } from "../constants";
import { createRepository } from "../data/repository";
import { applyOps } from "../data/ops";
import { normalizeEmployee, normalizeJob } from "../data/normalize";
import { readOutbox, writeOutbox } from "../data/outbox";
import { appendHistory } from "../utils/history";
import { findEmployeeByName } from "../utils/employees";

const POLL_INTERVAL_MS = 20000;
const RETRY_DELAY_MS = 5000;

function describeError(error) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return "You are offline. Changes are queued and will sync when the connection returns.";
  }
  if (error && error.message) return `Sync failed: ${error.message}`;
  return "Sync failed. Changes are queued and will be retried.";
}

function emptySnapshot() {
  return { jobs: [], employees: [] };
}

/**
 * Single source of truth for jobs/employees. Applies changes optimistically,
 * persists them through the configured repository, and keeps an outbox so a
 * failed write is retried rather than lost.
 */
export function useJobs() {
  const repo = useMemo(() => createRepository(), []);
  const initialOutbox = useMemo(() => readOutbox(), []);
  const initialSnapshot = useMemo(
    () => applyOps(repo.readCached() || emptySnapshot(), initialOutbox),
    [repo, initialOutbox]
  );
  const importCandidateRef = useRef(initialSnapshot);

  const [jobs, setJobs] = useState(initialSnapshot.jobs);
  const [employees, setEmployees] = useState(() =>
    initialSnapshot.employees.length > 0
      ? initialSnapshot.employees
      : repo.kind === "sheets"
        ? DEFAULT_EMPLOYEES
        : []
  );
  const [ready, setReady] = useState(repo.kind === "local");
  const [syncState, setSyncState] = useState(repo.kind === "local" ? "local" : "loading");
  const [syncMessage, setSyncMessage] = useState("");
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [pendingCount, setPendingCount] = useState(initialOutbox.length);
  const [needsImport, setNeedsImport] = useState(false);

  const stateRef = useRef({ jobs, employees });
  stateRef.current = { jobs, employees };

  const pendingRef = useRef(initialOutbox);
  const failuresRef = useRef(0);
  const flushingRef = useRef(false);
  const retryTimerRef = useRef(null);
  const mountedRef = useRef(true);
  const flushRef = useRef(null);
  const refreshRef = useRef(null);
  const seededEmployeesRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  const updatePendingCount = useCallback(() => {
    if (mountedRef.current) setPendingCount(pendingRef.current.length);
  }, []);

  const persistOutbox = useCallback(() => {
    writeOutbox(pendingRef.current);
  }, []);

  const send = useCallback(
    (op) => {
      switch (op.type) {
        case "upsertJob":
          return repo.upsertJob(op.job);
        case "deleteJob":
          return repo.deleteJob(op.job);
        case "upsertEmployee":
          return repo.upsertEmployee(op.employee);
        default:
          return Promise.resolve();
      }
    },
    [repo]
  );

  const flush = useCallback(async () => {
    if (flushingRef.current || pendingRef.current.length === 0) return;
    flushingRef.current = true;
    if (mountedRef.current) setSyncState("saving");

    try {
      while (pendingRef.current.length > 0) {
        const op = pendingRef.current[0];
        await send(op);
        pendingRef.current.shift();
        persistOutbox();
        updatePendingCount();
      }
      if (mountedRef.current) {
        failuresRef.current = 0;
        setSyncState(repo.kind === "local" ? "local" : "saved");
        setSyncMessage("");
        setLastSyncedAt(new Date());
      }
    } catch (error) {
      if (mountedRef.current) {
        failuresRef.current += 1;
        setSyncState("error");
        setSyncMessage(describeError(error));
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        const delay = Math.min(RETRY_DELAY_MS * 2 ** (failuresRef.current - 1), 60000);
        retryTimerRef.current = setTimeout(() => {
          if (mountedRef.current) flushRef.current?.();
        }, delay);
      }
    } finally {
      flushingRef.current = false;
    }
  }, [repo.kind, send, updatePendingCount, persistOutbox]);

  flushRef.current = flush;

  const enqueue = useCallback(
    (op) => {
      pendingRef.current.push(op);
      persistOutbox();
      updatePendingCount();
      flushRef.current?.();
    },
    [updatePendingCount, persistOutbox]
  );

  const refresh = useCallback(
    async ({ initial = false } = {}) => {
      if (repo.kind !== "sheets") return;
      if (!initial && pendingRef.current.length > 0) return;

      try {
        const snapshot = await repo.load();
        if (!mountedRef.current) return;
        const merged = applyOps(snapshot, pendingRef.current);
        setJobs(merged.jobs);
        setEmployees(merged.employees);
        setReady(true);
        setLastSyncedAt(new Date());
        setSyncMessage("");
        if (pendingRef.current.length === 0) setSyncState("saved");
        repo.writeCache(snapshot);

        if (initial) {
          const candidate = importCandidateRef.current;
          setNeedsImport(
            candidate.source === "legacy" &&
              snapshot.jobs.length === 0 &&
              candidate.jobs.length > 0
          );
          if (snapshot.employees.length === 0 && !seededEmployeesRef.current) {
            seededEmployeesRef.current = true;
            DEFAULT_EMPLOYEES.forEach((employee) =>
              enqueue({ type: "upsertEmployee", employee })
            );
            setEmployees(DEFAULT_EMPLOYEES);
          }
        }
      } catch (error) {
        if (!mountedRef.current) return;
        setReady(true);
        setSyncState("error");
        setSyncMessage(describeError(error));
      }
    },
    [repo, enqueue]
  );

  refreshRef.current = refresh;

  useEffect(() => {
    let cancelled = false;

    if (repo.kind === "local") {
      repo
        .load()
        .then((snapshot) => {
          if (cancelled) return;
          const merged = applyOps(snapshot, pendingRef.current);
          setJobs(merged.jobs);
          setEmployees(merged.employees);
          setReady(true);
          setSyncState("local");
          flushRef.current?.();
        })
        .catch(() => {
          if (!cancelled) setReady(true);
        });
      return () => {
        cancelled = true;
      };
    }

    refreshRef.current?.({ initial: true });
    flushRef.current?.();

    const interval = setInterval(() => {
      if (document.visibilityState !== "hidden") refreshRef.current?.();
    }, POLL_INTERVAL_MS);

    const onFocus = () => refreshRef.current?.();
    const onOnline = () => {
      Promise.resolve(flushRef.current?.()).then(() => refreshRef.current?.());
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshRef.current?.();
    };

    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [repo]);

  const saveJob = useCallback(
    (input) => {
      const job = normalizeJob(input);
      if (!job) return;
      setJobs((prev) =>
        prev.some((item) => item.id === job.id)
          ? prev.map((item) => (item.id === job.id ? job : item))
          : [job, ...prev]
      );
      enqueue({ type: "upsertJob", job });
    },
    [enqueue]
  );

  /**
   * Add an employee to the shared list (and the Google Sheets Employees tab).
   * Names are matched case-insensitively, so typing an existing name reuses it
   * and a previously deactivated person is reactivated instead of duplicated.
   */
  const saveEmployee = useCallback(
    (input) => {
      const employee = normalizeEmployee(input);
      if (!employee) return null;

      const existing = findEmployeeByName(stateRef.current.employees, employee.name);
      if (existing) {
        if (existing.active === false) {
          const revived = { ...existing, active: true };
          setEmployees((prev) =>
            prev.map((item) => (item.id === revived.id ? revived : item))
          );
          enqueue({ type: "upsertEmployee", employee: revived });
          return revived;
        }
        return existing;
      }

      setEmployees((prev) =>
        prev.some((item) => item.id === employee.id) ? prev : [employee, ...prev]
      );
      enqueue({ type: "upsertEmployee", employee });
      return employee;
    },
    [enqueue]
  );

  const deleteJob = useCallback(
    (job) => {
      if (!job) return;
      setJobs((prev) => prev.filter((item) => item.id !== job.id));
      enqueue({ type: "deleteJob", job });
    },
    [enqueue]
  );

  const moveJob = useCallback(
    (jobId, status) => {
      const current = stateRef.current.jobs.find((item) => item.id === jobId);
      if (!current || current.status === status) return;
      const now = new Date().toISOString();
      const updated = {
        ...current,
        status,
        completedAt: status === STATUS.COMPLETE ? current.completedAt || now : "",
        history: appendHistory(current.history, {
          at: now,
          type: "status",
          from: current.status,
          to: status,
        }),
        updatedAt: now,
      };
      setJobs((prev) => prev.map((item) => (item.id === jobId ? updated : item)));
      enqueue({ type: "upsertJob", job: updated });
    },
    [enqueue]
  );

  const importLocal = useCallback(() => {
    const candidate = importCandidateRef.current;
    candidate.jobs.forEach((job) => enqueue({ type: "upsertJob", job }));
    candidate.employees.forEach((employee) => enqueue({ type: "upsertEmployee", employee }));
    setNeedsImport(false);
  }, [enqueue]);

  const retry = useCallback(async () => {
    await flushRef.current?.();
    refreshRef.current?.();
  }, []);

  return {
    jobs,
    employees,
    ready,
    mode: repo.kind,
    syncState,
    syncMessage,
    lastSyncedAt,
    pendingCount,
    needsImport,
    importCandidateCount: importCandidateRef.current.jobs.length,
    saveJob,
    saveEmployee,
    deleteJob,
    moveJob,
    importLocal,
    retry,
  };
}
