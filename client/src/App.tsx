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
import PublicLibrary from "@/pages/public-library";
import GuideEditorEnhanced from "@/pages/guide-editor-enhanced";
import LandingPageEditor from "@/pages/landing-page-editor";
import AdminDashboard from "@/pages/admin";
import TranscriptionTest from "@/pages/transcription-test";
import StorageDashboard from "@/pages/storage-dashboard";
import KnowledgeBaseSettings from "@/pages/knowledge-base-settings";
import Pricing from "@/pages/pricing";
import TeamManagement from "@/pages/team-management";
import SalesPage from "@/pages/sales-page";
import Subscribe from "@/pages/subscribe";
import ResetPassword from "@/pages/reset-password";
import EmailSettings from "@/pages/email-settings";


function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <>
          <Route path="/" component={SalesPage} />
          <Route path="/reset-password" component={ResetPassword} />
        </>
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/create" component={CreateGuide} />
          <Route path="/content-library" component={ContentLibrary} />
          <Route path="/guide-editor/:guideId" component={GuideEditorEnhanced} />
          <Route path="/landing-editor/:customUrl" component={LandingPageEditor} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/leads" component={Leads} />
          <Route path="/branding" component={Branding} />
          <Route path="/settings" component={Settings} />
          <Route path="/storage" component={StorageDashboard} />
          <Route path="/knowledge-base" component={KnowledgeBaseSettings} />
          <Route path="/pricing" component={Pricing} />
          <Route path="/team" component={TeamManagement} />
          <Route path="/email-settings" component={EmailSettings} />
          <Route path="/subscribe" component={Subscribe} />
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/test-transcription" component={TranscriptionTest} />

        </>
      )}
      
      {/* Public routes for landing and delivery pages */}
      <Route path="/landing/:customUrl" component={GuideLanding} />
      <Route path="/delivery/:customUrl/:leadId" component={GuideDelivery} />
      <Route path="/guide/:guideId" component={GuideView} />
      <Route path="/public/library" component={Library} />
      <Route path="/library/public" component={PublicLibrary} />
      
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
