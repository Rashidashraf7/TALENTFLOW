import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import NotFound from "./pages/NotFound";
import Jobs from "./pages/Jobs";
import Candidates from "./pages/Candidates";
import CandidateDetail from "./pages/CandidateDetail";
import Assessments from "./pages/Assessments";
import AssessmentBuilder from "./pages/AssessmentBuilder";
import AssessmentPreview from "./pages/AssessmentPreview"; // --- IMPORT ADDED BACK ---
import { Layout } from "./components/Layout";

import Dashboard from "./pages/Dashboard";
const queryClient = new QueryClient();

const AppLayout = () => (
  <Layout>
    <Routes>
     <Route path="/" element={<Dashboard />} />
      
      <Route path="/jobs" element={<Jobs />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/candidates" element={<Candidates />} />
      <Route path="/candidates/:id" element={<CandidateDetail />} />
      <Route path="/assessments" element={<Assessments />} />
      <Route path="/assessments/:jobId/builder" element={<AssessmentBuilder />} />
      
      {/* --- ROUTE ADDED BACK --- */}
      <Route path="/assessments/:jobId/preview" element={<AssessmentPreview />} />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Layout>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/*" element={<AppLayout />} />
        </Routes>
      </BrowserRouter> 
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;