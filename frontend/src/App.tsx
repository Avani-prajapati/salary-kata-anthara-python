import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AnalyticsPage } from "./features/analytics/AnalyticsPage";
import { AddEmployeePage } from "./features/employees/AddEmployeePage";
import { DirectoryPage } from "./features/employees/DirectoryPage";
import { ProfilePage } from "./features/employees/ProfilePage";
import { AppShell } from "./shared/ui/AppShell";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<Navigate to="/employees" replace />} />
            <Route path="/employees" element={<DirectoryPage />} />
            <Route path="/employees/new" element={<AddEmployeePage />} />
            <Route path="/employees/:employeeId" element={<ProfilePage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
