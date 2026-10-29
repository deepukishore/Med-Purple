export function isLowEndDevice(nav = typeof navigator === "undefined" ? {} : navigator) {
  return Boolean(
    (nav.hardwareConcurrency && nav.hardwareConcurrency <= 4) ||
      (nav.deviceMemory && nav.deviceMemory <= 4) ||
      nav.connection?.saveData,
  );
}
