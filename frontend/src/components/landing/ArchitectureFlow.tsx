const NODES = ['Client', 'Gateway', 'Redis', 'Workers', 'Agents', 'Memory', 'Models'];

export function ArchitectureFlow() {
  return (
    <div className="flex flex-col items-center">
      {NODES.map((node, i) => (
        <div key={node} className="flex flex-col items-center">
          <div className="min-w-[160px] rounded-lg border border-[#1E1E1E] bg-[#111111] px-6 py-3 text-center text-sm font-medium text-white">
            {node}
          </div>
          {i < NODES.length - 1 && (
            <div className="relative my-1 h-10 w-px overflow-hidden bg-[#1E1E1E]">
              <span
                className="packet absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-[#E5E5E5]"
                style={{ animationDelay: `${i * 0.25}s` }}
              />
            </div>
          )}
        </div>
      ))}
      <style>{`
        @keyframes packet-travel {
          0% { top: 0%; opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .packet {
          animation: packet-travel 1.8s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}
