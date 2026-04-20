import { useQuery } from "@tanstack/react-query";
import { getTasks } from "../api/tasks";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  History,
  Loader2,
  Inbox,
} from "lucide-react";
import { Task } from "../types/task";

const TERMINAL_STATUSES = ["COMPLETED", "FAILED", "CANCELLED"];

function statusIcon(status: string) {
  if (status === "COMPLETED")
    return <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />;
  if (status === "FAILED")
    return <XCircle size={16} className="text-red-400 shrink-0" />;
  return <Clock size={16} className="text-slate-500 shrink-0" />;
}

function statusBadge(status: string) {
  const base =
    "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border";
  if (status === "COMPLETED")
    return `${base} bg-emerald-500/10 text-emerald-400 border-emerald-500/20`;
  if (status === "FAILED")
    return `${base} bg-red-500/10 text-red-400 border-red-500/20`;
  return `${base} bg-slate-500/10 text-slate-400 border-white/10`;
}

export default function HistoryPage() {
  const { data: tasks, isLoading, isError } = useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: getTasks,
  });

  const history = (tasks ?? []).filter((t) =>
    TERMINAL_STATUSES.includes(t.status)
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-inner">
          <History size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Task History
          </h1>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mt-0.5">
            Completed · Failed · Cancelled
          </p>
        </div>
      </div>

      {/* Summary pills */}
      {!isLoading && !isError && (
        <div className="flex flex-wrap gap-3">
          {["COMPLETED", "FAILED", "CANCELLED"].map((s) => {
            const count = history.filter((t) => t.status === s).length;
            return (
              <div
                key={s}
                className={`px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-widest border ${statusBadge(s)}`}
              >
                {count} {s}
              </div>
            );
          })}
        </div>
      )}

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 opacity-50">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-slate-400 text-sm font-semibold uppercase tracking-widest">
              Loading history…
            </p>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 opacity-50 text-red-400">
            <XCircle size={40} />
            <p className="text-sm font-semibold">Failed to load task history.</p>
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 opacity-30 text-slate-500">
            <Inbox size={48} className="opacity-50" />
            <p className="text-sm font-semibold uppercase tracking-widest">
              No completed tasks yet
            </p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 text-slate-400 text-xs font-bold uppercase tracking-widest border-b border-white/5">
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4 hidden md:table-cell">Description</th>
                <th className="px-6 py-4 hidden lg:table-cell">Completed</th>
                <th className="px-6 py-4 text-right">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {history.map((task) => (
                <tr
                  key={task.id}
                  className="hover:bg-white/[0.02] transition-colors group"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {statusIcon(task.status)}
                      <span className={statusBadge(task.status)}>
                        {task.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-white">
                      {task.title}
                    </span>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell max-w-xs">
                    <span className="text-xs text-slate-500 line-clamp-2">
                      {task.description ?? "—"}
                    </span>
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell">
                    <span className="text-xs text-slate-500 font-mono">
                      {task.updated_at
                        ? new Date(task.updated_at).toLocaleString()
                        : "—"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      to={`/tasks/${task.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-indigo-500 text-slate-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-all duration-300 border border-white/5 hover:border-indigo-500"
                    >
                      View
                      <ChevronRight size={12} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
