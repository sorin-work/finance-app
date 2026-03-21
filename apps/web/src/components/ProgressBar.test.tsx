import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('exposes its value to assistive technology', () => {
    render(<ProgressBar percent={42.4} label="Groceries spending" />);
    const bar = screen.getByRole('progressbar', { name: 'Groceries spending' });
    expect(bar).toHaveAttribute('aria-valuenow', '42');
  });

  it('caps the fill at 100% when over budget', () => {
    render(<ProgressBar percent={135} tone="danger" label="Dining" />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveClass('progress--danger');
    expect(bar.firstElementChild).toHaveStyle({ width: '100%' });
  });
});
