import { defaultTheme } from "react-admin";

export const darkTheme = {
  ...defaultTheme,
  palette: {
    mode: "dark",
    primary: {
      main: "#3b82f6",
    },
    background: {
      default: "#0f172a",
      paper: "#1e293b",
    },
  },
  components: {
    ...defaultTheme.components,
    RaLayout: {
      styleOverrides: {
        root: {
          "& .RaLayout-appFrame": {
            backgroundColor: "#0f172a",
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: "#1e293b",
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: "#1e293b",
          borderRight: "1px solid #334155",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: "#1e293b",
          border: "1px solid #334155",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          "&.priority-URGENT": {
            backgroundColor: "#7f1d1d",
            color: "#fecaca",
          },
          "&.priority-HIGH": {
            backgroundColor: "#78350f",
            color: "#fef3c7",
          },
        },
      },
    },
  },
};
