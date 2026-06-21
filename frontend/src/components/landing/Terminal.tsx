import { useEffect, useState } from 'react';

const SESSIONS = [
  { cmd: 'analyze architecture', out: 'Scanned 6 services. No circular dependencies found.' },
  { cmd: 'create workflow', out: 'Workflow draft saved: 4 steps, 2 parallel branches.' },
  { cmd: 'research topic', out: 'Collected 12 sources. Summary ready for review.' },
  { cmd: 'execute task', out: 'Task complete in 3.2s. Confidence: 0.96' },
];

type Phase = 'cmd' | 'out' | 'pause';

export function Terminal() {
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('cmd');
  const [history, setHistory] = useState<{ cmd: string; out: string }[]>([]);

  const session = SESSIONS[lineIndex % SESSIONS.length];

  useEffect(() => {
    const target = phase === 'cmd' ? session.cmd : session.out;

    if (phase === 'pause') {
      const t = setTimeout(() => {
        setHistory((h) => [...h, session]);
        setLineIndex((i) => i + 1);
        setCharIndex(0);
        setPhase('cmd');
      }, 900);
      return () => clearTimeout(t);
    }

    if (charIndex >= target.length) {
      const t = setTimeout(
        () => {
          setPhase(phase === 'cmd' ? 'out' : 'pause');
          setCharIndex(0);
        },
        phase === 'cmd' ? 300 : 200,
      );
      return () => clearTimeout(t);
    }

    const t = setTimeout(() => setCharIndex((c) => c + 1), 28);
    return () => clearTimeout(t);
  }, [charIndex, phase, session]);

  const visibleCmd = phase === 'cmd' ? session.cmd.slice(0, charIndex) : session.cmd;
  const visibleOut = phase === 'out' ? session.out.slice(0, charIndex) : phase === 'pause' ? session.out : '';

  return (
    <div className="overflow-hidden rounded-xl border border-[#1E1E1E] bg-[#0B0B0B] font-mono text-xs">
      <div className="flex items-center gap-2 border-b border-[#1E1E1E] px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#1E1E1E]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#1E1E1E]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#1E1E1E]" />
        <span className="ml-2 text-[#A1A1AA]">map — terminal</span>
      </div>
      <div className="flex min-h-[180px] flex-col gap-2 p-4">
        {history.slice(-3).map((h, i) => (
          <div key={`${h.cmd}-${i}`}>
            <p className="text-white">&gt; {h.cmd}</p>
            <p className="text-[#A1A1AA]">{h.out}</p>
          </div>
        ))}
        <div>
          <p className="text-white">
            &gt; {visibleCmd}
            {phase === 'cmd' && <span className="animate-pulse">▍</span>}
          </p>
          {(phase === 'out' || phase === 'pause') && (
            <p className="text-[#A1A1AA]">
              {visibleOut}
              {phase === 'out' && <span className="animate-pulse">▍</span>}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
