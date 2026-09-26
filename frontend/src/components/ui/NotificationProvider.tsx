"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { Snackbar, Alert, AlertColor } from "@mui/material";

interface NotificationContextType {
  notify: (message: string, severity?: AlertColor) => void;
  notifySuccess: (message: string) => void;
  notifyError: (message: string) => void;
  notifyWarning: (message: string) => void;
  notifyInfo: (message: string) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<AlertColor>("info");

  const notify = useCallback((msg: string, sev: AlertColor = "info") => {
    setMessage(msg);
    setSeverity(sev);
    setOpen(true);
  }, []);

  const notifySuccess = useCallback((msg: string) => notify(msg, "success"), [notify]);
  const notifyError = useCallback((msg: string) => notify(msg, "error"), [notify]);
  const notifyWarning = useCallback((msg: string) => notify(msg, "warning"), [notify]);
  const notifyInfo = useCallback((msg: string) => notify(msg, "info"), [notify]);

  const handleClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === "clickaway") return;
    setOpen(false);
  };

  return (
    <NotificationContext.Provider
      value={{ notify, notifySuccess, notifyError, notifyWarning, notifyInfo }}
    >
      {children}
      <Snackbar
        open={open}
        autoHideDuration={4000}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={handleClose}
          severity={severity}
          variant="filled"
          sx={{
            width: "100%",
            borderRadius: "12px",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
            fontWeight: 500,
          }}
        >
          {message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    return {
      notify: (msg: string) => console.log(msg),
      notifySuccess: (msg: string) => console.log(msg),
      notifyError: (msg: string) => console.error(msg),
      notifyWarning: (msg: string) => console.warn(msg),
      notifyInfo: (msg: string) => console.info(msg),
    };
  }
  return context;
}
