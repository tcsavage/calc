import { useRegisterSW } from "virtual:pwa-register/react";

/** Offers a reload when a new version has been downloaded, rather than reloading mid-calculation. */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  if (!needRefresh) return null;
  return (
    <div className="update-prompt" role="status">
      <span>New version available.</span>
      <button type="button" onClick={() => updateServiceWorker(true)}>
        Reload
      </button>
      <button type="button" onClick={() => setNeedRefresh(false)}>
        Later
      </button>
    </div>
  );
}
