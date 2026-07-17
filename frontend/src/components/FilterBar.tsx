import { Search, RefreshCw } from 'lucide-react';

export interface FilterPill {
  key: string;
  label: string;
  count?: number;
  activeBg: string;
  activeColor: string;
  inactiveBg?: string;
  inactiveColor?: string;
}

interface FilterBarProps {
  /** Page icon + title block */
  icon: React.ReactNode;
  title: string;
  subtitle?: string;

  /** Search */
  searchValue: string;
  searchPlaceholder?: string;
  onSearchChange: (v: string) => void;

  /** Filter pills */
  pills: FilterPill[];
  activeFilter: string;
  /** "ALL" key resets the filter */
  onFilterChange: (key: string) => void;

  /** Right-side extras (e.g. Create button) */
  actions?: React.ReactNode;

  /** Shows spinning refresh indicator */
  isFetching?: boolean;
}

/**
 * Shared control bar used by HistoryPage, LogsPage, and any future
 * "search through a list of past events" page.
 */
export function FilterBar({
  icon,
  title,
  subtitle,
  searchValue,
  searchPlaceholder = 'Search\u2026',
  onSearchChange,
  pills,
  activeFilter,
  onFilterChange,
  actions,
  isFetching,
}: FilterBarProps) {
  return (
    <div
      className="wise-card flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4"
      style={{ padding: '16px 20px' }}
    >
      {/* Left: icon + title */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: '#e2f6d5' }}
        >
          {icon}
        </div>
        <div>
          <h1
            style={{
              fontFamily: 'Manrope, sans-serif',
              fontWeight: 900,
              fontSize: '22px',
              color: '#0e0f0c',
              lineHeight: '1.2',
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className="text-[11px] font-semibold uppercase tracking-widest mt-0.5"
              style={{ color: '#868685' }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right: search + pill filters + optional actions */}
      <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] xl:w-64">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: '#868685' }}
          />
          <input
            type="text"
            value={searchValue}
            onChange={e => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="wise-input"
            style={{ paddingLeft: '34px', fontSize: '14px', height: '40px' }}
          />
        </div>

        {/* Pill filter group */}
        <div
          className="flex p-1 rounded-xl gap-1 flex-wrap"
          style={{ background: '#e8ebe6' }}
        >
          {pills.map(pill => {
            const isActive = activeFilter === pill.key;
            return (
              <button
                key={pill.key}
                onClick={() => onFilterChange(isActive && pill.key !== 'ALL' ? 'ALL' : pill.key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all duration-150 whitespace-nowrap"
                style={{
                  background: isActive ? pill.activeBg : (pill.inactiveBg ?? 'transparent'),
                  color: isActive ? pill.activeColor : (pill.inactiveColor ?? '#454745'),
                  border: isActive ? `1px solid ${pill.activeColor}33` : '1px solid transparent',
                }}
              >
                {pill.label}
                {pill.count !== undefined && (
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[9px] font-black ml-0.5"
                    style={{
                      background: isActive ? `${pill.activeColor}22` : '#0e0f0c11',
                      color: isActive ? pill.activeColor : '#868685',
                    }}
                  >
                    {pill.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Refresh indicator */}
        <div
          className="transition-opacity duration-200 flex-shrink-0"
          style={{ opacity: isFetching ? 1 : 0 }}
        >
          <RefreshCw size={13} className="animate-spin" style={{ color: '#2ead4b' }} />
        </div>

        {/* Optional actions slot */}
        {actions}
      </div>
    </div>
  );
}
