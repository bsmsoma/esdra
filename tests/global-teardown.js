export default async function globalTeardown() {
  const pid = parseInt(process.env.EMULATOR_PID || "0", 10);
  if (pid) {
    console.log("[teardown] Stopping Firebase emulators (PID:", pid, ")");
    try {
      process.kill(pid, "SIGTERM");
    } catch (_) {
      // Process may have already exited
    }
  }
}
