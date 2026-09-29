import type { ReactNode } from "react";
import { AppBar, Box, Tab, Tabs, Toolbar, Typography } from "@mui/material";
import { Link, useLocation } from "react-router-dom";

const NAV_TABS = [
  { label: "Directory", path: "/employees" },
  { label: "Analytics", path: "/analytics" },
] as const;

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: Readonly<AppShellProps>) {
  const location = useLocation();
  const activeTab = NAV_TABS.find((tab) => tab.path === location.pathname)?.path ?? NAV_TABS[0].path;

  return (
    <Box sx={{ minHeight: "100%", overflowX: "hidden" }}>
      <AppBar position="static">
        <Toolbar sx={{ flexWrap: "wrap", rowGap: 1 }}>
          <Typography variant="h6" component="span" sx={{ marginRight: 4 }}>
            ACME HR
          </Typography>
          <Tabs value={activeTab} textColor="inherit" indicatorColor="secondary">
            {NAV_TABS.map((tab) => (
              <Tab key={tab.path} label={tab.label} value={tab.path} component={Link} to={tab.path} />
            ))}
          </Tabs>
        </Toolbar>
      </AppBar>
      <Box component="main" sx={{ padding: 2, overflowX: "hidden" }}>
        {children}
      </Box>
    </Box>
  );
}
