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
import Leads from "@/pages/leads";
import Settings from "@/pages/settings";
import GuideLanding from "@/pages/guide-landing";
import GuideDelivery from "@/pages/guide-delivery";
import GuideView from "@/pages/guide-view";
import Library from "@/pages/library";
import GuideEditorEnhanced from "@/pages/guide-editor-enhanced";

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
          <Route path="/guide-editor/:guideId" component={GuideEditorEnhanced} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/leads" component={Leads} />
          <Route path="/branding" component={Branding} />
          <Route path="/settings" component={Settings} />
        </>
      )}
      
      {/* Public routes for landing and delivery pages */}
      <Route path="/landing/:customUrl" component={GuideLanding} />
      <Route path="/delivery/:customUrl/:leadId" component={GuideDelivery} />
      <Route path="/guide/:guideId" component={GuideLanding} />
      <Route path="/public/library" component={Library} />
      
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
