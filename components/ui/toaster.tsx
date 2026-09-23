"use client";

import { ToastContainer } from "react-toastify";

export function Toaster() {
  return (
    <ToastContainer
      position="top-right"
      autoClose={4000}
      closeOnClick
      pauseOnFocusLoss
      pauseOnHover
      newestOnTop
      aria-label="Notifications"
    />
  );
}
