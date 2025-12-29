import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SplashScreen from "./pages/SplashScreen";
import OnboardingScreen from "./pages/OnboardingScreen";
import GroupsDiscoveryScreen from "./pages/GroupsDiscoveryScreen";
import CreateGroupScreen from "./pages/CreateGroupScreen";
import ChatRoomScreen from "./pages/ChatRoomScreen";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<SplashScreen />} />
          <Route path="/onboarding" element={<OnboardingScreen />} />
          <Route path="/groups" element={<GroupsDiscoveryScreen />} />
          <Route path="/create-group" element={<CreateGroupScreen />} />
          <Route path="/chat/:groupId" element={<ChatRoomScreen />} />
          {/* Redirect old location-permission route */}
          <Route path="/location-permission" element={<Navigate to="/onboarding" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
