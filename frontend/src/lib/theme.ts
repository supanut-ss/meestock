import { createTheme } from "@mui/material/styles";

export const meestockTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#4f46e5", // Indigo 600
      light: "#6366f1",
      dark: "#4338ca",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#7c3aed", // Violet 600
      light: "#8b5cf6",
      dark: "#6d28d9",
      contrastText: "#ffffff",
    },
    success: {
      main: "#059669", // Emerald 600
      light: "#10b981",
      dark: "#047857",
      contrastText: "#ffffff",
    },
    warning: {
      main: "#f97316", // Orange 500
      light: "#fb923c",
      dark: "#ea580c",
      contrastText: "#ffffff",
    },
    error: {
      main: "#ef4444", // Red 500
      light: "#f87171",
      dark: "#dc2626",
      contrastText: "#ffffff",
    },
    background: {
      default: "#f8fafc", // Slate 50
      paper: "#ffffff",
    },
    text: {
      primary: "#0f172a", // Slate 900
      secondary: "#64748b", // Slate 500
    },
    divider: "#e2e8f0", // Slate 200
  },
  typography: {
    fontFamily: [
      '"Prompt"',
      '"Plus Jakarta Sans"',
      '"Inter"',
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "Roboto",
      "sans-serif",
    ].join(","),
    button: {
      textTransform: "none",
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: "10px",
          fontWeight: 600,
          boxShadow: "none",
          "&:hover": {
            boxShadow: "none",
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
        rounded: {
          borderRadius: "16px",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: "8px",
        },
      },
    },
  },
});
