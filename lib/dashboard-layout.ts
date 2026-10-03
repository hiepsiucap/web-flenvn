export const IMMERSIVE_DASHBOARD_PADDING = "p-0 lg:p-3";
export const IMMERSIVE_DASHBOARD_ROOT = "h-dvh overflow-hidden overscroll-none";

export function isImmersiveDashboardRoute(pathname: string) {
  return pathname === "/vocabulary";
}

export function shouldShowMobileDashboardNavigation(pathname: string) {
  return !isImmersiveDashboardRoute(pathname);
}
