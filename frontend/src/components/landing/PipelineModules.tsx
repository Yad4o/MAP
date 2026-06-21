const MODULES = [
  { name: 'Planner', position: 'left-[6%] top-[14%]' },
  { name: 'Executor', position: 'right-[5%] top-[18%]' },
  { name: 'Analyzer', position: 'bottom-[16%] left-[9%]' },
  { name: 'Memory', position: 'bottom-[14%] right-[7%]' },
];

export function PipelineModules() {
  return (
    <>
      {MODULES.map((mod) => (
        <div
          key={mod.name}
          className={`absolute z-20 hidden items-center gap-2 rounded-lg border border-[#1E1E1E] bg-[#0B0B0B]/80 px-3 py-2 text-xs backdrop-blur-md md:flex ${mod.position}`}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4ADE80] opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#4ADE80]" />
          </span>
          <span className="font-medium text-white">{mod.name}</span>
          <span className="text-[#A1A1AA]">· Online</span>
        </div>
      ))}
    </>
  );
}
