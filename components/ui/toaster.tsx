"use client";

import { ToastContainer } from "react-toastify";

export function Toaster() {
  return (
    <ToastContainer
      className="app-toaster"
      toastClassName="app-toast"
      position="top-right"
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
