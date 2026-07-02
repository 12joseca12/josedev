import {
  normalizeEmulatorViewerUrl,
  parseEmulatorSession,
  parseEmulatorStatus,
  resolveScreenViewerUrl,
} from "./emulator-api";

describe("emulator-api", () => {
  it("normalizes docker android panel URL to lightweight VNC viewer", () => {
    expect(normalizeEmulatorViewerUrl("http://192.168.1.1:6080/")).toBe(
      "http://192.168.1.1:6080/vnc_lite.html?autoconnect=true&resize=scale",
    );
    expect(normalizeEmulatorViewerUrl("http://192.168.1.1:6080/index.html?foo=bar")).toBe(
      "http://192.168.1.1:6080/vnc_lite.html?foo=bar&autoconnect=true&resize=scale",
    );
  });

  it("resolves screen viewer URL against the public API base", () => {
    expect(resolveScreenViewerUrl("/emulator/screen/viewer", "https://api.example.com")).toBe(
      "https://api.example.com/emulator/screen/viewer",
    );
    expect(
      resolveScreenViewerUrl("http://127.0.0.1:4000/demo/android/screen/viewer", "https://api.example.com"),
    ).toBe("https://api.example.com/demo/android/screen/viewer");
  });

  it("parses valid session payload", () => {
    const session = parseEmulatorSession({
      status: "running",
      containerName: "android-emulator",
      packageName: "com.example.catinfo",
      packageInstalled: true,
      viewerUrl: "http://192.168.1.1:6080/vnc_lite.html",
      screenViewerUrl: "/emulator/screen/viewer",
    });
    expect(session).toBeTruthy();
    expect(session?.viewerUrl).toBe("http://localhost:8787/emulator/screen/viewer");
    expect(session?.screenViewerUrl).toBe("http://localhost:8787/emulator/screen/viewer");
  });

  it("falls back to noVNC viewer URL when screen viewer is missing", () => {
    const session = parseEmulatorSession({
      status: "running",
      containerName: "android-emulator",
      packageName: "com.example.catinfo",
      packageInstalled: true,
      viewerUrl: "http://192.168.1.1:6080/vnc_lite.html",
    });

    expect(session).toBeTruthy();
    expect(session?.viewerUrl).toBe("http://192.168.1.1:6080/vnc_lite.html?autoconnect=true&resize=scale");
    expect(session?.screenViewerUrl).toBe(null);
  });

  it("rejects missing viewerUrl", () => {
    expect(parseEmulatorSession({ status: "running" })).toBe(null);
  });

  it("parses ready status payload", () => {
    const status = parseEmulatorStatus({
      status: "ready",
      containerName: "android-emulator",
      packageName: "com.example.catinfo",
      packageInstalled: true,
      bootCompleted: true,
      containerRunning: true,
      viewerUrl: " http://192.168.1.1:6080/vnc_lite.html ",
      screenViewerUrl: "/emulator/screen/viewer",
    });

    expect(status).toBeTruthy();
    expect(status?.status).toBe("ready");
    expect(status?.viewerUrl).toBe("http://192.168.1.1:6080/vnc_lite.html?autoconnect=true&resize=scale");
    expect(status?.screenViewerUrl).toBe("http://localhost:8787/emulator/screen/viewer");
  });

  it("parses starting status without viewerUrl", () => {
    const status = parseEmulatorStatus({
      status: "starting",
      containerRunning: true,
      bootCompleted: false,
      packageInstalled: false,
    });

    expect(status).toBeTruthy();
    expect(status?.status).toBe("starting");
    expect(status?.viewerUrl).toBe(null);
  });

  it("rejects unknown status payload", () => {
    expect(parseEmulatorStatus({ status: "running" })).toBe(null);
  });

  it("parses failed status payload", () => {
    const status = parseEmulatorStatus({
      status: "failed",
      errorCode: "EMULATOR_BOOT_TIMEOUT",
      errorMessage: "Android emulator did not finish booting in time",
    });

    expect(status).toBeTruthy();
    expect(status?.status).toBe("failed");
    expect(status?.errorCode).toBe("EMULATOR_BOOT_TIMEOUT");
  });
});
