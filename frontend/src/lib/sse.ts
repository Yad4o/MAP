/**
 * Minimal incremental Server-Sent Events parser.
 *
 * We read the stream with fetch() (not EventSource) so we can send the Bearer
 * token header, which means we have to parse the wire format ourselves.
 */
export interface SSEEvent {
  id?: string;
  event?: string;
  data: string;
}

export function createSSEParser(onEvent: (event: SSEEvent) => void) {
  let buffer = '';

  const dispatch = (block: string) => {
    let id: string | undefined;
    let event: string | undefined;
    const data: string[] = [];
    for (const line of block.split('\n')) {
      if (!line || line.startsWith(':')) continue; // blank or comment (heartbeat)
      const colon = line.indexOf(':');
      const field = colon === -1 ? line : line.slice(0, colon);
      let value = colon === -1 ? '' : line.slice(colon + 1);
      if (value.startsWith(' ')) value = value.slice(1);
      if (field === 'id') id = value;
      else if (field === 'event') event = value;
      else if (field === 'data') data.push(value);
    }
    if (data.length > 0) onEvent({ id, event, data: data.join('\n') });
  };

  return {
    feed(chunk: string) {
      buffer += chunk.replace(/\r\n/g, '\n');
      let sep: number;
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        const block = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        dispatch(block);
      }
    },
  };
}
