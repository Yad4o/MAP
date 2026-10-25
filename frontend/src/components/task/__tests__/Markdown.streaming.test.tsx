import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Markdown } from '../Markdown';

describe('Markdown streaming fade', () => {
  it('wraps words in fade spans without changing the text', () => {
    const { container } = render(<Markdown text="Hello brave **new** world" streaming />);
    expect(container.querySelectorAll('.stream-fade').length).toBeGreaterThanOrEqual(4);
    expect(container.textContent).toBe('Hello brave new world');
  });

  it('adds no spans when not streaming', () => {
    const { container } = render(<Markdown text="Hello brave world" />);
    expect(container.querySelectorAll('.stream-fade').length).toBe(0);
  });

  it('leaves code blocks and inline code untouched', () => {
    const { container } = render(
      <Markdown text={'Use `foo bar` here\n\n```py\nprint("hi there")\n```'} streaming />,
    );
    expect(container.querySelectorAll('code .stream-fade, pre .stream-fade').length).toBe(0);
    expect(container.textContent).toContain('print("hi there")');
    expect(container.textContent).toContain('foo bar');
  });

  it('keeps existing word nodes when more text arrives, so old words do not re-fade', () => {
    const { container, rerender } = render(<Markdown text="Hello wor" streaming />);
    const first = container.querySelector('.stream-fade');
    rerender(<Markdown text="Hello world and more" streaming />);
    expect(container.querySelector('.stream-fade')).toBe(first);
    expect(container.textContent).toBe('Hello world and more');
  });
});
