import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTasks } from "../api/tasks";
import { Link } from "react-router-dom";
import {
  CheckCircle2, XCircle, Clock, ChevronRight, History, Loader2, Inbox,
} from "lucide-react";
import { Task } from "../types/task";
import { FilterBar } from "../components/FilterBar";

const TERMINAL_STATUSES = ["COMPLETED", "FAILED", "CANCELLED"];

function getStatusStyle(status: string) {
  if (status === "COMPLETED")
    return { bg: '#e2f6d5', color: '#054d28', icon: CheckCircle2 };
  if (status === "FAILED")
    return { bg: '#fde8e9', color: '#a7000d', icon: XCircle };
  return   { bg: '#e8ebe6', color: '#454745', icon: Clock };
}

export default function HistoryPage() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("ALL");

  const { data: tasks, isLoading, isError } = useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: getTasks,
  });

  const history = useMemo(
    () => (tasks ?? []).filter(t => TERMINAL_STATUSES.includes(t.status)),
    [tasks]
  );

  /* Counts per status for pill badges */
  const counts = useMemo(() => ({
    COMPLETED: history.filter(t => t.status === "COMPLETED").length,
    FAILED:    history.filter(t => t.status === "FAILED").length,
    CANCELLED: history.filter(t => t.status === "CANCELLED").length,
  }), [history]);

  /* Client-side filter: status pill + search */
  const visible = useMemo(() => {
    let list = activeFilter === "ALL"
      ? history
      : history.filter(t => t.status === activeFilter);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.title?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q)
      );
    }

    return [...list].sort(
      (a, b) => new Date(b.updated_at ?? b.created_at).getTime() -
                 new Date(a.updated_at ?? a.created_at).getTime()
    );
  }, [history, activeFilter, search]);

  const pills = [
    {
      key: "ALL",
      label: "All",
      count: history.length,
      activeBg: '#9fe870',
      activeColor: '#0e0f0c',
    },
    {
      key: "COMPLETED",
      label: "Completed",
      count: counts.COMPLETED,
      activeBg: '#e2f6d5',
      activeColor: '#054d28',
    },
    {
      key: "FAILED",
      label: "Failed",
      count: counts.FAILED,
      activeBg: '#fde8e9',
      activeColor: '#a7000d',
    },
    {
      key: "CANCELLED",
      label: "Cancelled",
      count: counts.CANCELLED,
      activeBg: '#e8ebe6',
      activeColor: '#454745',
    },
  ];

  return (
    <div className="space-y-5 animate-wise-fade-up">

      {/* ── Control bar ── */}
      <FilterBar
        icon={<History className="w-5 h-5" style={{ color: '#2ead4b' }} />}
        title="Task History"
        subtitle="Completed · Failed · Cancelled"
        searchValue={search}
        searchPlaceholder="Search by title or description…"
        onSearchChange={setSearch}
        pills={pills}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />

      {/* ── Table card ── */}
      <div className="wise-card overflow-hidden" style={{ padding: 0 }}>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#9fe870' }} />
            <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#868685' }}>
              Loading history…
            </p>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3" style={{ color: '#d03238' }}>
            <XCircle size={40} />
            <p className="text-sm font-semibold">Failed to load task history.</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: '#e8ebe6' }}
            >
              <Inbox className="w-7 h-7" style={{ color: '#868685' }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: '#868685' }}>
              {search || activeFilter !== "ALL"
                ? "No tasks match your filter"
                : "No completed tasks yet"}
            </p>
            {(search || activeFilter !== "ALL") && (
              <button
                onClick={() => { setSearch(""); setActiveFilter("ALL"); }}
                className="text-xs font-semibold underline"
                style={{ color: '#9fe870' }}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr style={{ background: '#fafcf9', borderBottom: '1px solid #e8ebe6' }}>
                {['Status', 'Title', 'Description', 'Completed', ''].map((h, i) => (
                  <th
                    key={i}
                    className={`px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest ${
                      i === 2 ? 'hidden md:table-cell' : i === 3 ? 'hidden lg:table-cell' : ''
                    } ${i === 4 ? 'text-right' : ''}`}
                    style={{ color: '#868685' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((task) => {
                const s = getStatusStyle(task.status);
                const Icon = s.icon;
                return (
                  <tr
                    key={task.id}
                    className="group transition-colors"
                    style={{ borderBottom: '1px solid #f0f2ef' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#fafcf9')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Status */}
                    <td className="px-5 py-4">
                      <span
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold"
                        style={{ background: s.bg, color: s.color }}
                      >
                        <Icon size={11} />
                        {task.status}
                      </span>
                    </td>

                    {/* Title */}
                    <td className="px-5 py-4 max-w-[220px]">
                      <span
                        className="text-sm font-semibold line-clamp-2 leading-snug"
                        style={{ color: '#0e0f0c' }}
                      >
                        {task.title}
                      </span>
                    </td>

                    {/* Description */}
                    <td className="px-5 py-4 hidden md:table-cell max-w-xs">
                      <span className="text-xs line-clamp-2" style={{ color: '#454745' }}>
                        {task.description ?? '—'}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-5 py-4 hidden lg:table-cell">
                      <span className="text-xs font-mono" style={{ color: '#868685' }}>
                        {task.updated_at ? new Date(task.updated_at).toLocaleString() : '—'}
                      </span>
                    </td>

                    {/* View link */}
                    <td className="px-5 py-4 text-right">
                      <Link
                        to={`/tasks/${task.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-150"
                        style={{ background: '#e2f6d5', color: '#054d28' }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLAnchorElement).style.background = '#9fe870';
                          (e.currentTarget as HTMLAnchorElement).style.color = '#0e0f0c';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLAnchorElement).style.background = '#e2f6d5';
                          (e.currentTarget as HTMLAnchorElement).style.color = '#054d28';
                        }}
                      >
                        View
                        <ChevronRight size={12} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Row count */}
      {!isLoading && !isError && visible.length > 0 && (
        <p className="text-xs text-right" style={{ color: '#868685' }}>
          Showing <span style={{ color: '#0e0f0c', fontWeight: 600 }}>{visible.length}</span> of {history.length} tasks
        </p>
      )}
    </div>
  );
}
