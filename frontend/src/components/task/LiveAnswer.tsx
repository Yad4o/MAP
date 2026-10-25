import { Markdown } from './Markdown';
import { sliceBlocks, useSmoothedLength } from '../../lib/smoothText';

/**
 * The answer as it is being written. Text arrives from the server in bursts; it is released at a
 * steady pace and each new word fades in (see .stream-fade in index.css). Rendered with the same
 * Markdown component as the final result, so when the task completes the swap is seamless.
 */
export default function LiveAnswer({ blocks }: { blocks: string[] }) {
  const total = blocks.reduce((n, b) => n + b.length, 0);
  const visible = useSmoothedLength(total);
  const shown = sliceBlocks(blocks, visible);

  return (
    <div aria-busy="true">
      {shown.map((text, idx) =>
        text.trim() ? (
          <div key={idx} className={idx > 0 ? 'mt-6 pt-6 border-t border-white/[0.06]' : ''}>
            <Markdown text={text} streaming />
          </div>
        ) : null,
      )}
    </div>
  );
}
