/**
 * @vitest-environment jsdom
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WIPE_STORAGE_KEYS, WipeTerminal } from './WipeTerminal';

describe('WipeTerminal', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts disarmed, showing only the arm button', () => {
    render(<WipeTerminal resetProgress={vi.fn()} resetAgentProgress={vi.fn()} />);

    expect(screen.getByRole('button', { name: /wipe terminal/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/type wipe to confirm/i)).not.toBeInTheDocument();
  });

  it('arms into a confirm flow requiring the typed token, with confirm disabled until matched', () => {
    render(<WipeTerminal resetProgress={vi.fn()} resetAgentProgress={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /wipe terminal/i }));

    const confirmButton = screen.getByRole('button', { name: /confirm wipe/i });
    expect(confirmButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/type wipe to confirm/i), {
      target: { value: 'nope' },
    });
    expect(confirmButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/type wipe to confirm/i), {
      target: { value: 'wipe' },
    });
    expect(confirmButton).not.toBeDisabled();
  });

  it('cancel returns to the disarmed state without resetting anything', () => {
    const resetProgress = vi.fn();
    const resetAgentProgress = vi.fn();
    render(<WipeTerminal resetProgress={resetProgress} resetAgentProgress={resetAgentProgress} />);

    fireEvent.click(screen.getByRole('button', { name: /wipe terminal/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(screen.getByRole('button', { name: /wipe terminal/i })).toBeInTheDocument();
    expect(resetProgress).not.toHaveBeenCalled();
    expect(resetAgentProgress).not.toHaveBeenCalled();
  });

  it('confirming calls both resets, clears the mid-shift storage keys, and reboots', () => {
    vi.useFakeTimers();
    const resetProgress = vi.fn();
    const resetAgentProgress = vi.fn();
    const reboot = vi.fn();
    for (const key of WIPE_STORAGE_KEYS) {
      localStorage.setItem(key, JSON.stringify({ stale: true }));
    }

    const { rerender } = render(
      <WipeTerminal
        resetProgress={resetProgress}
        resetAgentProgress={resetAgentProgress}
        reboot={reboot}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /wipe terminal/i }));
    fireEvent.change(screen.getByLabelText(/type wipe to confirm/i), {
      target: { value: 'WIPE' },
    });
    fireEvent.click(screen.getByRole('button', { name: /confirm wipe/i }));

    expect(resetProgress).toHaveBeenCalledTimes(1);
    expect(resetAgentProgress).toHaveBeenCalledTimes(1);
    for (const key of WIPE_STORAGE_KEYS) {
      expect(localStorage.getItem(key)).toBeNull();
    }
    expect(screen.getByText(/terminal wiped/i)).toBeInTheDocument();

    // The app chrome's ticking clock re-renders Home every second; the
    // pending reboot must survive re-renders rather than being rescheduled.
    rerender(
      <WipeTerminal
        resetProgress={resetProgress}
        resetAgentProgress={resetAgentProgress}
        reboot={reboot}
      />
    );

    expect(reboot).not.toHaveBeenCalled();
    act(() => {
      vi.runAllTimers();
    });
    expect(reboot).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('does not confirm on a partial/incorrect token (case-insensitive match required)', () => {
    const resetProgress = vi.fn();
    render(<WipeTerminal resetProgress={resetProgress} resetAgentProgress={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /wipe terminal/i }));
    fireEvent.change(screen.getByLabelText(/type wipe to confirm/i), {
      target: { value: 'WIP' },
    });
    fireEvent.click(screen.getByRole('button', { name: /confirm wipe/i }));

    expect(resetProgress).not.toHaveBeenCalled();
  });
});
