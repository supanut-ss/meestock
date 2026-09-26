"use client";

import React from "react";
import { Chip, ChipProps } from "@mui/material";

export type StatusVariant =
  | "success"
  | "warning"
  | "error"
  | "info"
  | "default"
  | "indigo"
  | "purple";

interface StatusBadgeProps {
  label: string;
  variant?: StatusVariant;
  size?: "small" | "medium";
  icon?: React.ReactElement;
}

const variantStyles: Record<
  StatusVariant,
  { bg: string; text: string; border: string; dot: string }
> = {
  success: {
    bg: "#ecfdf5",
    text: "#065f46",
    border: "#a7f3d0",
    dot: "#10b981",
  },
  warning: {
    bg: "#fffbeb",
    text: "#92400e",
    border: "#fde68a",
    dot: "#f59e0b",
  },
  error: {
    bg: "#fef2f2",
    text: "#991b1b",
    border: "#fecaca",
    dot: "#ef4444",
  },
  info: {
    bg: "#f0f9ff",
    text: "#075985",
    border: "#bae6fd",
    dot: "#0ea5e9",
  },
  indigo: {
    bg: "#eef2ff",
    text: "#3730a3",
    border: "#c7d2fe",
    dot: "#6366f1",
  },
  purple: {
    bg: "#faf5ff",
    text: "#581c87",
    border: "#e9d5ff",
    dot: "#a855f7",
  },
  default: {
    bg: "#f8fafc",
    text: "#475569",
    border: "#e2e8f0",
    dot: "#94a3b8",
  },
};

export default function StatusBadge({
  label,
  variant = "default",
  size = "small",
  icon,
}: StatusBadgeProps) {
  const styles = variantStyles[variant] || variantStyles.default;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding: "2px 8px",
        borderRadius: "9999px",
        fontSize: "0.6875rem",
        fontWeight: 600,
        lineHeight: "1.25",
        backgroundColor: styles.bg,
        color: styles.text,
        border: `1px solid ${styles.border}`,
        whiteSpace: "nowrap",
        boxSizing: "border-box",
        height: "22px",
      }}
    >
      <span
        style={{
          width: "5px",
          height: "5px",
          borderRadius: "50%",
          backgroundColor: styles.dot,
          flexShrink: 0,
        }}
      />
      {label}
    </span>
  );
}
