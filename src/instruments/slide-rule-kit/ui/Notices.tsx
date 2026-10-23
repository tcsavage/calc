import type { Notice } from "../state/store";

export function Notices({
  notices,
  onDismiss,
}: {
  notices: readonly Notice[];
  onDismiss(id: string): void;
}) {
  if (notices.length === 0) return null;
  return (
    <ul className="notices">
      {notices.map((notice) => (
        <li key={notice.id} role="status">
          <span>{notice.message}</span>
          <button type="button" onClick={() => onDismiss(notice.id)} aria-label="Dismiss">
            ×
          </button>
        </li>
      ))}
    </ul>
  );
}
