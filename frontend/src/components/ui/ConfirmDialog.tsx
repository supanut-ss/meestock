"use client";

import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmText = "ยืนยัน",
  cancelText = "ยกเลิก",
  isDestructive = false,
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      slotProps={{
        paper: {
          sx: {
            borderRadius: "16px",
            p: 1,
            maxWidth: 440,
            width: "100%",
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          fontWeight: 700,
          fontSize: "1.125rem",
          color: isDestructive ? "#b91c1c" : "#1e293b",
        }}
      >
        {isDestructive && (
          <span
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: "50%",
              backgroundColor: "#fee2e2",
              color: "#dc2626",
            }}
          >
            <WarningAmberRoundedIcon sx={{ fontSize: 22 }} />
          </span>
        )}
        {title}
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ color: "#64748b", fontSize: "0.875rem" }}>
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button
          onClick={onClose}
          disabled={loading}
          variant="outlined"
          sx={{
            color: "#64748b",
            borderColor: "#cbd5e1",
            "&:hover": {
              borderColor: "#94a3b8",
              backgroundColor: "#f8fafc",
            },
          }}
        >
          {cancelText}
        </Button>
        <Button
          onClick={onConfirm}
          disabled={loading}
          variant="contained"
          color={isDestructive ? "error" : "primary"}
          sx={{
            minWidth: 100,
            ...(isDestructive
              ? {
                  backgroundColor: "#dc2626",
                  "&:hover": { backgroundColor: "#b91c1c" },
                }
              : {}),
          }}
        >
          {loading ? "กำลังดำเนินการ..." : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
