import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';

import PreviewPane from './PreviewPane';

describe('PreviewPane', () => {
  it('renders html inside a .markdown-body container', () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <PreviewPane
        html="<p>hi</p>"
        previewRef={ref}
        onScroll={() => undefined}
      />,
    );

    const wrapper = container.querySelector('.markdown-body');
    expect(wrapper).not.toBeNull();
    expect(wrapper?.innerHTML).toBe('<p>hi</p>');
  });

  it('renders the passed html content', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <PreviewPane
        html="<h1>Title</h1><p>Body</p>"
        previewRef={ref}
        onScroll={() => undefined}
      />,
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Title');
  });
});
