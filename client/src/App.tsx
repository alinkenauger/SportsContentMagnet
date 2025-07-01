import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import CreateGuide from "@/pages/create-guide";
import ContentLibrary from "@/pages/content-library";
import Analytics from "@/pages/analytics";
import Branding from "@/pages/branding";
import GuideLanding from "@/pages/guide-landing";
import GuideDelivery from "@/pages/guide-delivery";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/create" component={CreateGuide} />
          <Route path="/library" component={ContentLibrary} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/branding" component={Branding} />
        </>
      )}
      
      {/* Public routes for landing and delivery pages */}
      <Route path="/landing/:customUrl" component={GuideLanding} />
      <Route path="/delivery/:customUrl/:leadId" component={GuideDelivery} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
