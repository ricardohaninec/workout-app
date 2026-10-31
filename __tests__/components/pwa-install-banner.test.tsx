import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PwaInstallBanner from "@/components/pwa-install-banner";

function mockEnv({ standalone = false, ua = "Mozilla/5.0 Android" } = {}) {
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: standalone,
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (globalThis as unknown as { matchMedia: unknown }).matchMedia,
  });
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue(ua);
}

const IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)";

function fireInstallPrompt() {
  const e = new Event("beforeinstallprompt", { cancelable: true });
  Object.assign(e, { prompt: vi.fn(), userChoice: Promise.resolve({ outcome: "accepted" }) });
  act(() => {
    window.dispatchEvent(e);
  });
}

describe("PwaInstallBanner", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("is hidden when standalone", () => {
    mockEnv({ standalone: true, ua: IOS });
    const { container } = render(<PwaInstallBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("is hidden when previously dismissed", () => {
    mockEnv({ ua: IOS });
    localStorage.setItem("pwa-banner-dismissed", "1");
    const { container } = render(<PwaInstallBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows iOS instructions and dismisses persistently", async () => {
    mockEnv({ ua: IOS });
    render(<PwaInstallBanner />);
    expect(screen.getByText("Add to Home Screen", { selector: "p" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(screen.queryByText("Add to Home Screen", { selector: "p" })).not.toBeInTheDocument();
    expect(localStorage.getItem("pwa-banner-dismissed")).toBe("1");
  });

  it("android: hidden until beforeinstallprompt fires", () => {
    mockEnv();
    render(<PwaInstallBanner />);
    expect(screen.queryByText("Add to Home Screen", { selector: "p" })).not.toBeInTheDocument();
    fireInstallPrompt();
    expect(screen.getByRole("button", { name: "Install" })).toBeInTheDocument();
  });
});
