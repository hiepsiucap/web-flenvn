"use client";

import { CheckCircle, Info, Warning, WarningCircle, X } from "@phosphor-icons/react";
import { ToastContainer, type CloseButtonProps, type IconProps } from "react-toastify";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

function ToastIcon({ type }: IconProps) {
  const icon = {
    success: CheckCircle,
    error: WarningCircle,
    warning: Warning,
    info: Info,
    default: Info,
  }[type];

  return <Icon icon={icon} size="lg" weight="fill" />;
}

function DismissToast({ closeToast }: CloseButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="app-toast-dismiss"
      aria-label="Dismiss notification"
      onClick={closeToast}
    >
      <Icon icon={X} size="sm" />
    </Button>
  );
}

export function Toaster() {
  return (
    <ToastContainer
      className="app-toaster"
      toastClassName="app-toast"
      position="top-right"
      icon={ToastIcon}
      closeButton={DismissToast}
      hideProgressBar
      autoClose={5000}
      closeOnClick={false}
      pauseOnFocusLoss
      pauseOnHover
      newestOnTop
      limit={3}
      aria-label="Notifications"
    />
  );
}
