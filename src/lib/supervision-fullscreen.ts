/** 在监督接管模式下请求浏览器全屏（需用户手势时可能失败，静默忽略） */
export async function requestSupervisionFullscreen(element: HTMLElement | null) {
  if (!element || typeof document === "undefined") return false;
  try {
    if (document.fullscreenElement) return true;
    await element.requestFullscreen();
    return true;
  } catch {
    return false;
  }
}

export async function exitSupervisionFullscreen() {
  if (typeof document === "undefined" || !document.fullscreenElement) return;
  try {
    await document.exitFullscreen();
  } catch {
    /* ignore */
  }
}
