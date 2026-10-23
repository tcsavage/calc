export type ShareOutcome = "shared" | "copied" | "failed";

/** Uses the system share sheet where there is one, otherwise copies the link. */
export async function shareUrl(
  url: string,
  title: string,
  nav: Navigator = navigator,
): Promise<ShareOutcome> {
  if (typeof nav.share === "function") {
    try {
      await nav.share({ title, url });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "shared";
    }
  }
  try {
    await nav.clipboard.writeText(url);
    return "copied";
  } catch {
    return "failed";
  }
}
