/**
 * Tiny rehype plugin: wraps every word of regular prose in <span class="stream-fade"> so newly
 * arrived words can fade in via CSS. Existing words keep their DOM nodes when more text is
 * appended (same position in the tree), so only the new words animate.
 *
 * Code (inline and fenced) is left untouched — CodeBlock needs the raw string.
 */
interface HastNode {
  type: string;
  value?: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

const SKIP = new Set(['pre', 'code']);

function wrap(node: HastNode): void {
  if (!node.children) return;
  if (node.type === 'element' && node.tagName && SKIP.has(node.tagName)) return;

  const next: HastNode[] = [];
  for (const child of node.children) {
    if (child.type === 'text' && child.value) {
      for (const part of child.value.split(/(\s+)/)) {
        if (!part) continue;
        next.push(
          /^\s+$/.test(part)
            ? { type: 'text', value: part }
            : {
                type: 'element',
                tagName: 'span',
                properties: { className: ['stream-fade'] },
                children: [{ type: 'text', value: part }],
              },
        );
      }
    } else {
      wrap(child);
      next.push(child);
    }
  }
  node.children = next;
}

export default function rehypeStreamFade() {
  return (tree: HastNode) => wrap(tree);
}
