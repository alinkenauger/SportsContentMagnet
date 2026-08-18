import { Suspense, lazy, useEffect, type ComponentType } from "react";
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";

import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";

const lazyPage = (loader: () => Promise<{ default: ComponentType<any> }>) =>
  lazy(loader);

const NotFound = lazyPage(() => import("@/pages/not-found"));
const Dashboard = lazyPage(() => import("@/pages/dashboard"));
const CreateGuide = lazyPage(() => import("@/pages/create-guide"));
const CreateMagnet = lazyPage(() => import("@/pages/create-magnet"));
const ContentLibrary = lazyPage(() => import("@/pages/content-library"));
const BenefitLibrary = lazyPage(() => import("@/pages/benefit-library"));
const QuizEditor = lazyPage(() => import("@/pages/quiz-editor"));
const QuizRunner = lazyPage(() => import("@/pages/quiz-runner"));
const Analytics = lazyPage(() => import("@/pages/analytics"));
const Branding = lazyPage(() => import("@/pages/branding"));
const Leads = lazyPage(() => import("@/pages/leads"));
const Settings = lazyPage(() => import("@/pages/settings"));
const GuideLanding = lazyPage(() => import("@/pages/guide-landing"));
const GuideDelivery = lazyPage(() => import("@/pages/guide-delivery"));
const GuideView = lazyPage(() => import("@/pages/guide-view"));
const Library = lazyPage(() => import("@/pages/library"));
const PublicLibrary = lazyPage(() => import("@/pages/public-library"));
const GuideEditorEnhanced = lazyPage(() => import("@/pages/guide-editor-enhanced"));
const LandingPageEditor = lazyPage(() => import("@/pages/landing-page-editor"));
const AdminDashboard = lazyPage(() => import("@/pages/admin"));
const TranscriptionTest = lazyPage(() => import("@/pages/transcription-test"));
const StorageDashboard = lazyPage(() => import("@/pages/storage-dashboard"));
const KnowledgeBaseSettings = lazyPage(() => import("@/pages/knowledge-base-settings"));
const Pricing = lazyPage(() => import("@/pages/pricing"));
const TeamManagement = lazyPage(() => import("@/pages/team-management"));
const SalesPage = lazyPage(() => import("@/pages/sales-page"));
const Subscribe = lazyPage(() => import("@/pages/subscribe"));
const ResetPassword = lazyPage(() => import("@/pages/reset-password"));
const EmailSettings = lazyPage(() => import("@/pages/email-settings"));
const CompleteAccount = lazyPage(() => import("@/pages/complete-account"));
const Login = lazyPage(() => import("@/pages/login"));

function RouteLoading() {
  return (
    <main
      className="flex min-h-screen items-center justify-center bg-[#F4EFE6] px-6 text-[#101419]"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 text-sm font-semibold">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#FF6B3D]" aria-hidden="true" />
        Loading VidMagnet…
      </div>
    </main>
  );
}

function ProtectedRouteRedirect() {
  useEffect(() => {
    const returnTo = `${window.location.pathname}${window.location.search}`;
    window.location.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  }, []);

  return <RouteLoading />;
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Suspense fallback={<RouteLoading />}>
      <Switch>
        {/* Public recipient experiences stay reachable regardless of auth state. */}
        <Route path="/landing/:customUrl" component={GuideLanding} />
        <Route path="/delivery/:customUrl/:leadId" component={GuideDelivery} />
        <Route path="/guide/:guideId" component={GuideView} />
        <Route path="/quiz/:customUrl" component={QuizRunner} />
        <Route path="/public/library" component={Library} />
        <Route path="/library/:slug" component={PublicLibrary} />

        {/* These routes own their authentication or setup lifecycle. */}
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/login" component={Login} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/complete-account" component={CompleteAccount} />

        {isLoading ? (
          <Route component={RouteLoading} />
        ) : isAuthenticated ? (
          <>
            <Route path="/" component={Dashboard} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/create" component={CreateMagnet} />
            <Route path="/create/guide" component={CreateGuide} />
            <Route path="/content-library" component={ContentLibrary} />
            <Route path="/benefit-library" component={BenefitLibrary} />
            <Route path="/quiz-editor/:guideId" component={QuizEditor} />
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
            <Route path="/test-transcription" component={TranscriptionTest} />
          </>
        ) : (
          <>
            <Route path="/" component={SalesPage} />
            <Route component={ProtectedRouteRedirect} />
          </>
        )}

        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
