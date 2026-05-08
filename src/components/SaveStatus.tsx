import { lastSavedAt, saveStatus } from '../core/state';

function formatRelative(at: number, now: number): string {
  const seconds = Math.max(0, Math.floor((now - at) / 1000));
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export function SaveStatus() {
  const status = saveStatus.value;
  const at = lastSavedAt.value;

  if (status === 'saving') {
    return (
      <span class="save-status save-status-saving" aria-live="polite" data-status="saving">
        Saving…
      </span>
    );
  }
  if (status === 'saved' && at !== null) {
    return (
      <span class="save-status save-status-saved" aria-live="polite" data-status="saved">
        Saved {formatRelative(at, Date.now())}
      </span>
    );
  }
  return null;
}
