import { describe, expect, it } from 'vitest';
import { render, sanitize } from './markdown';

describe('sanitize', () => {
  it('strips <script> tags entirely', () => {
    expect(sanitize('<script>alert(1)</script>')).toBe('');
  });

  it('removes onerror from img', () => {
    const result = sanitize('<img src="x" onerror="alert(1)">');
    expect(result).not.toContain('onerror');
    expect(result).toContain('<img');
  });

  it('preserves <input type="checkbox" disabled> for GFM task lists', () => {
    const result = sanitize('<input type="checkbox" disabled>');
    expect(result).toContain('<input');
    expect(result).toContain('type="checkbox"');
  });

  it('strips <style> tags', () => {
    expect(sanitize('<style>body{color:red}</style>')).toBe('');
  });

  it('strips onclick attribute', () => {
    const result = sanitize('<button onclick="alert(1)">click</button>');
    expect(result).not.toContain('onclick');
    expect(result).toContain('<button');
  });
});

describe('render', () => {
  it('renders a GFM table', () => {
    const md = '| a | b |\n|---|---|\n| 1 | 2 |';
    const result = render(md);
    expect(result).toContain('<table>');
    expect(result).toContain('<th>');
    expect(result).toContain('<td>');
  });

  it('renders a fenced code block', () => {
    const md = '```\ncode\n```';
    const result = render(md);
    expect(result).toContain('<pre>');
    expect(result).toContain('<code>');
  });

  it('renders a GFM task list with checked checkbox', () => {
    const result = render('- [x] done');
    expect(result).toContain('<input');
    expect(result).toContain('type="checkbox"');
    expect(result).toContain('checked');
  });

  it('does not return unsanitized HTML — script tags never reach output', () => {
    const result = render('hello <script>alert(1)</script> world');
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('alert(1)');
  });
});
