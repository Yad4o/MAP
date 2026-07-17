import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { logsApi } from "../api/logs";
import { Terminal, Ban, Activity, ChevronRight, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { FilterBar } from "../components/FilterBar";

/* ── Level config ──────────────────────────────────────────────────────────── */
const LEVEL_PILLS = [
  { key: "ALL",      label: "All",      activeBg: '#9fe870', activeColor: '#0e0f0c' },
  { key: "DEBUG",    label: "Debug",    activeBg: '#e8ebe6', activeColor: '#454745' },
  { key: "INFO",     label: "Info",     activeBg: '#e2f6d5', activeColor: '#054d28' },
  { key: "WARNING",  label: "Warning",  activeBg: '#fff5c2', activeColor: '#4a3b1c' },
  { key: "ERROR",    label: "Error",    activeBg: '#fde8e9', activeColor: '#a7000d' },
  { key: "CRITICAL", label: "Critical", activeBg: '#fde8e9', activeColor: '#a7000d' },
];

function getLevelStyle(level: string): { bg: string; color: string } {
  switch (level) {
    case 'CRITICAL':
    case 'ERROR':   return { bg: '#fde8e9', color: '#a7000d' };
    case 'WARNING': return { bg: '#fff5c2', color: '#4a3b1c' };
    case 'DEBUG':   return { bg: '#e8ebe6', color: '#454745' };
    default:        return { bg: '#e2f6d5', color: '#054d28' };
  }
}

/* ── Dedup consecutive same-message logs within 5 s ─────────────────────── */
interface LogEntry { id: string | number; timestamp: string; level: string; logger: string; event: string; task_id?: string; }
interface GroupedLog { representative: LogEntry; count: number; timestamps: string[]; }

function groupConsecutiveLogs(logs: LogEntry[]): GroupedLog[] {
  const groups: GroupedLog[] = [];
  for (const log of logs) {
    const last = groups[groups.length - 1];
    if (
      last &&
      last.representative.event === log.event &&
      last.representative.level === log.level &&
      Math.abs(new Date(log.timestamp).getTime() - new Date(last.representative.timestamp).getTime()) < 5000
    ) {
      last.count++;
      last.timestamps.push(log.timestamp);
    } else {
      groups.push({ representative: log, count: 1, timestamps: [log.timestamp] });
    }
  }
  return groups;
}

export default function LogsPage() {
  const [level, setLevel] = useState("ALL");
  const [search, setSearch] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string | number>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: logs, isLoading, isFetching, isError } = useQuery({
    queryKey: ["logs", level, search],
    queryFn: () => logsApi.getLogs({ level: level === "ALL" ? undefined : level, search }),
    refetchInterval: 5000,
    retry: 1,
  });

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const grouped = useMemo(() => groupConsecutiveLogs((logs as LogEntry[]) ?? []), [logs]);

  const toggleGroup = (id: string | number) =>
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div
      className="flex flex-col gap-4 animate-wise-fade-up"
      style={{ height: 'calc(100vh - 7rem)' }}
    >

      {/* ── Control bar ── */}
      <FilterBar
        icon={<Terminal className="w-5 h-5" style={{ color: '#2ead4b' }} />}
        title="System Logs"
        subtitle={
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full animate-pulse inline-block" style={{ background: '#2ead4b' }} />
            Live Stream Active
          </span> as unknown as string
        }
        searchValue={search}
        searchPlaceholder="Search logs…"
        onSearchChange={setSearch}
        pills={LEVEL_PILLS}
        activeFilter={level}
        onFilterChange={setLevel}
        isFetching={isFetching}
        actions={
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all duration-150 whitespace-nowrap"
            style={{
              background: autoScroll ? '#e2f6d5' : '#e8ebe6',
              color:      autoScroll ? '#054d28' : '#454745',
              border: `1px solid ${autoScroll ? '#2ead4b' : 'transparent'}`,
            }}
          >
            <Activity size={13} className={autoScroll ? 'animate-bounce' : ''} />
            {autoScroll ? 'Sticky' : 'Scroll off'}
          </button>
        }
      />

      {/* ── Log feed card ── */}
      <div
        className="wise-card flex-1 overflow-hidden flex flex-col"
        style={{ padding: 0, minHeight: 0 }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid #e8ebe6', background: '#fafcf9' }}
        >
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#868685' }}>
            Log Stream
          </span>
          <span
            className="px-2.5 py-1 rounded-full text-[11px] font-bold"
            style={{ background: '#e8ebe6', color: '#454745' }}
          >
            {grouped.length} of {logs?.length ?? 0} records
          </span>
        </div>

        {/* Scrollable log feed */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: '#e2f6d5' }}
              >
                <Terminal className="w-5 h-5 animate-pulse" style={{ color: '#2ead4b' }} />
              </div>
              <p className="text-[11px] uppercase tracking-widest font-bold" style={{ color: '#868685' }}>
                Initializing stream…
              </p>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Ban className="w-10 h-10" style={{ color: '#d03238' }} />
              <p className="text-sm font-semibold" style={{ color: '#d03238' }}>Stream error — retrying</p>
            </div>
          ) : grouped.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <Ban className="w-10 h-10" style={{ color: '#868685', opacity: 0.4 }} />
              <p className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: '#868685' }}>
                No log entries found
              </p>
            </div>
          ) : (
            grouped.map((group, rowIdx) => {
              const log = group.representative;
              const ls = getLevelStyle(log.level);
              const isExpanded = expandedGroups.has(log.id);
              const isOdd = rowIdx % 2 === 1;

              return (
                <div key={log.id}>
                  {/* Main row */}
                  <div
                    className="group flex items-start gap-3 px-4 py-2.5 font-mono text-xs transition-colors"
                    style={{
                      borderBottom: '1px solid rgba(14,15,12,0.06)',
                      background: isOdd ? 'rgba(232,235,230,0.35)' : 'transparent',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#fafcf9')}
                    onMouseLeave={e => (e.currentTarget.style.background = isOdd ? 'rgba(232,235,230,0.35)' : 'transparent')}
                  >
                    {/* Timestamp */}
                    <span
                      className="whitespace-nowrap flex-shrink-0 tabular-nums text-[10px] pt-0.5"
                      style={{ color: '#868685', minWidth: '70px' }}
                    >
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>

                    {/* Level badge */}
                    <span
                      className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wide flex-shrink-0"
                      style={{ background: ls.bg, color: ls.color, minWidth: '52px', textAlign: 'center' }}
                    >
                      {log.level}
                    </span>

                    {/* Logger */}
                    <span
                      className="font-semibold flex-shrink-0 hidden sm:block text-[10px] pt-0.5"
                      style={{ color: '#9fe870', minWidth: '80px' }}
                    >
                      {log.logger?.split('.')?.pop()}
                    </span>

                    {/* Event message */}
                    <span className="flex-1 leading-relaxed break-all sm:break-normal" style={{ color: '#454745' }}>
                      {log.event}
                    </span>

                    {/* Duplicate count badge */}
                    {group.count > 1 && (
                      <button
                        onClick={() => toggleGroup(log.id)}
                        className="flex items-center gap-1 flex-shrink-0 px-2 py-0.5 rounded-md text-[10px] font-black transition-colors"
                        style={{ background: '#e8ebe6', color: '#454745' }}
                        title={`${group.count} identical lines — click to ${isExpanded ? 'collapse' : 'expand'}`}
                      >
                        ×{group.count}
                        {isExpanded
                          ? <ChevronDown size={10} />
                          : <ChevronRight size={10} />
                        }
                      </button>
                    )}

                    {/* Task link */}
                    {log.task_id && (
                      <Link
                        to={`/tasks/${log.task_id}`}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold flex-shrink-0 transition-all opacity-0 group-hover:opacity-100"
                        style={{ background: '#e2f6d5', color: '#054d28' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = '#9fe870'; (e.currentTarget as HTMLAnchorElement).style.color = '#0e0f0c'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = '#e2f6d5'; (e.currentTarget as HTMLAnchorElement).style.color = '#054d28'; }}
                      >
                        Inspect <ChevronRight size={10} />
                      </Link>
                    )}
                  </div>

                  {/* Expanded timestamps for duplicate group */}
                  {group.count > 1 && isExpanded && group.timestamps.slice(1).map((ts, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-4 py-1.5 font-mono text-[10px]"
                      style={{
                        background: 'rgba(232,235,230,0.55)',
                        borderBottom: '1px solid rgba(14,15,12,0.04)',
                        borderLeft: '3px solid #e8ebe6',
                      }}
                    >
                      <span className="whitespace-nowrap" style={{ color: '#868685', minWidth: '70px' }}>
                        {new Date(ts).toLocaleTimeString()}
                      </span>
                      <span style={{ color: '#868685' }}>↳ duplicate</span>
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>

        {/* Status footer */}
        <div
          className="flex items-center justify-between px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest flex-shrink-0"
          style={{ borderTop: '1px solid #e8ebe6', background: '#fafcf9', color: '#868685' }}
        >
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: isError ? '#d03238' : '#2ead4b',
                  animation: isError ? 'none' : 'pulse 2s infinite',
                }}
              />
              {isError ? 'Stream disconnected' : 'Connection secure'}
            </span>
            <span>Buffer: {logs?.length ?? 0} records</span>
          </div>
          <span>MAP v2.0</span>
        </div>
      </div>
    </div>
  );
}
