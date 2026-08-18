import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  ArrowRight,
  Bell,
  BookOpen,
  Check,
  Download,
  Eye,
  FileQuestion,
  Menu,
  Plus,
  Users,
  X,
} from "lucide-react";

import Sidebar from "@/components/sidebar";
import StatsCard from "@/components/stats-card";
import FirstTimeUserSetup from "@/components/first-time-user-setup";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Guide, Lead, Notification } from "@shared/schema";

interface DashboardStats {
  totalGuides: number;
  totalLeads: number;
  totalViews: number;
  totalDownloads: number;
  avgConversionRate: number;
}

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readableDate(value: Date | string | null | undefined): string {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

function readableDateTime(value: Date | string | null | undefined): string {
  if (!value) return "Time unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time unavailable";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function titleCase(value: string | null | undefined): string {
  if (!value) return "Draft";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function statusClass(status: string | null | undefined): string {
  switch (status) {
    case "published":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "unlisted":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "archived":
      return "border-slate-200 bg-slate-100 text-slate-600";
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

function userString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

export default function Dashboard() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [showFirstTimeSetup, setShowFirstTimeSetup] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const notificationsQuery = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    enabled: isAuthenticated && Boolean(user),
    queryFn: async () => {
      const response = await fetch("/api/notifications", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch notifications");
      return response.json();
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const statsQuery = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats", user?.currentBrandId],
    enabled: isAuthenticated && Boolean(user),
  });

  const guidesQuery = useQuery<Guide[]>({
    queryKey: ["/api/guides", user?.currentBrandId],
    enabled: isAuthenticated && Boolean(user),
  });

  const leadsQuery = useQuery<Lead[]>({
    queryKey: ["/api/leads", user?.currentBrandId],
    enabled: isAuthenticated && Boolean(user),
  });

  const notifications = notificationsQuery.data ?? [];
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const recentMagnets = useMemo(
    () =>
      [...(guidesQuery.data ?? [])]
        .sort(
          (a, b) =>
            new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
        )
        .slice(0, 6),
    [guidesQuery.data],
  );

  const recentLeads = useMemo(
    () =>
      [...(leadsQuery.data ?? [])]
        .sort(
          (a, b) =>
            new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
        )
        .slice(0, 5),
    [leadsQuery.data],
  );

  const guideTitles = useMemo(
    () => new Map((guidesQuery.data ?? []).map((guide) => [guide.id, guide.title])),
    [guidesQuery.data],
  );

  useEffect(() => {
    if (user?.tempPassword) setShowFirstTimeSetup(true);
  }, [user?.tempPassword]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      const timeout = window.setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return () => window.clearTimeout(timeout);
    }
  }, [isAuthenticated, isLoading, toast]);

  useEffect(() => {
    if (!showNotifications) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNotifications]);

  const markAsRead = async (notificationId: number) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to update notification");
      await notificationsQuery.refetch();
    } catch {
      toast({
        title: "Notification not updated",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const openEditor = (guide: Guide) => {
    const editor = guide.magnetType === "quiz" ? "quiz-editor" : "guide-editor";
    setLocation(`/${editor}/${guide.id}`);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center" role="status" aria-live="polite">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
          <p className="text-sm text-muted-foreground">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const stats = statsQuery.data;
  const statsLoading = statsQuery.isLoading;
  const totalMagnets = stats ? numberValue(stats.totalGuides) : 0;
  const totalLeads = stats ? numberValue(stats.totalLeads) : 0;
  const totalViews = stats ? numberValue(stats.totalViews) : 0;
  const totalDownloads = stats ? numberValue(stats.totalDownloads) : 0;
  const conversionRate = stats ? numberValue(stats.avgConversionRate) : 0;

  return (
    <div className="flex h-screen overflow-hidden bg-muted/20">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {showMobileNav && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
            aria-label="Close navigation"
            onClick={() => setShowMobileNav(false)}
          />
          <div className="relative z-10 w-64 shadow-2xl">
            <Sidebar />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-border bg-background/95 px-4 py-4 backdrop-blur sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <Button
                variant="outline"
                size="icon"
                className="mt-0.5 shrink-0 rounded-xl lg:hidden"
                aria-label="Open navigation"
                onClick={() => setShowMobileNav(true)}
              >
                <Menu aria-hidden="true" />
              </Button>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  Brand command center
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create, publish, and monitor your Guides and Interactive Quizzes.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative" ref={notificationsRef}>
                <Button
                  variant="outline"
                  size="icon"
                  className="relative rounded-xl"
                  aria-label={
                    unreadCount > 0
                      ? `Notifications, ${unreadCount} unread`
                      : "Notifications"
                  }
                  aria-expanded={showNotifications}
                  onClick={() => setShowNotifications((open) => !open)}
                >
                  <Bell aria-hidden="true" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-destructive px-1 text-[10px] font-bold leading-4 text-destructive-foreground">
                      {unreadCount}
                    </span>
                  )}
                </Button>

                {showNotifications && (
                  <div
                    className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-popover shadow-xl"
                    role="dialog"
                    aria-label="Notifications"
                  >
                    <div className="flex items-center justify-between border-b border-border px-4 py-3">
                      <div>
                        <p className="font-semibold text-popover-foreground">Notifications</p>
                        <p className="text-xs text-muted-foreground">
                          {unreadCount === 0 ? "You are all caught up" : `${unreadCount} unread`}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label="Close notifications"
                        onClick={() => setShowNotifications(false)}
                      >
                        <X aria-hidden="true" />
                      </Button>
                    </div>

                    <div className="max-h-80 overflow-y-auto py-1">
                      {notificationsQuery.isLoading ? (
                        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                          Loading notifications...
                        </p>
                      ) : notifications.length > 0 ? (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`border-b border-border/60 px-4 py-3 last:border-0 ${
                              notification.read ? "" : "bg-primary/5"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-popover-foreground">
                                  {notification.title}
                                </p>
                                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                  {notification.message}
                                </p>
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                  {readableDateTime(notification.createdAt)}
                                </p>
                              </div>
                              {!notification.read && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0"
                                  aria-label={`Mark ${notification.title} as read`}
                                  onClick={() => markAsRead(notification.id)}
                                >
                                  <Check aria-hidden="true" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                          No notifications yet.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <Button
                className="rounded-xl shadow-sm"
                onClick={() => setLocation("/create")}
              >
                <Plus aria-hidden="true" />
                <span className="hidden sm:inline">Create lead magnet</span>
                <span className="sm:hidden">Create</span>
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
          <section aria-labelledby="overview-heading">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 id="overview-heading" className="text-lg font-semibold text-foreground">
                  Workspace overview
                </h2>
                <p className="text-sm text-muted-foreground">Current totals for the active brand.</p>
              </div>
              {!statsLoading && totalViews > 0 && (
                <p className="text-sm text-muted-foreground">
                  Lead conversion: <span className="font-semibold text-foreground">{conversionRate.toFixed(1)}%</span>
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatsCard
                title="Lead magnets"
                value={statsLoading ? "—" : totalMagnets}
                icon={BookOpen}
                iconColor="text-primary"
              />
              <StatsCard
                title="Leads captured"
                value={statsLoading ? "—" : totalLeads}
                icon={Users}
                iconColor="text-secondary"
              />
              <StatsCard
                title="Magnet views"
                value={statsLoading ? "—" : totalViews}
                icon={Eye}
                iconColor="text-accent"
              />
              <StatsCard
                title="Downloads"
                value={statsLoading ? "—" : totalDownloads}
                icon={Download}
                iconColor="text-purple-600"
              />
            </div>

            {statsQuery.isError && (
              <p className="mt-3 text-sm text-destructive" role="alert">
                Workspace totals could not be loaded.
              </p>
            )}
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(18rem,0.8fr)]">
            <Card className="overflow-hidden rounded-2xl">
              <CardHeader className="border-b border-border pb-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">Recent lead magnets</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Guides and Interactive Quizzes in the active brand.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg"
                    onClick={() => setLocation("/content-library")}
                  >
                    View library
                    <ArrowRight aria-hidden="true" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {guidesQuery.isLoading ? (
                  <div className="space-y-3 p-5" role="status" aria-label="Loading recent lead magnets">
                    {[0, 1, 2].map((item) => (
                      <div key={item} className="h-16 animate-pulse rounded-xl bg-muted" />
                    ))}
                  </div>
                ) : guidesQuery.isError ? (
                  <div className="p-8 text-center">
                    <p className="text-sm text-destructive" role="alert">
                      Recent lead magnets could not be loaded.
                    </p>
                  </div>
                ) : recentMagnets.length > 0 ? (
                  <ul className="divide-y divide-border">
                    {recentMagnets.map((guide) => {
                      const isQuiz = guide.magnetType === "quiz";
                      const MagnetIcon = isQuiz ? FileQuestion : BookOpen;
                      return (
                        <li key={guide.id}>
                          <button
                            type="button"
                            className="group flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5"
                            onClick={() => openEditor(guide)}
                          >
                            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                              <MagnetIcon aria-hidden="true" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-foreground">
                                {guide.title}
                              </span>
                              <span className="mt-1 block text-xs text-muted-foreground">
                                {isQuiz ? "Interactive Quiz" : "Guide"} · {readableDate(guide.createdAt)}
                              </span>
                            </span>
                            <Badge
                              variant="outline"
                              className={`shrink-0 ${statusClass(guide.status)}`}
                            >
                              {titleCase(guide.status)}
                            </Badge>
                            <ArrowRight
                              className="hidden h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 sm:block"
                              aria-hidden="true"
                            />
                            <span className="sr-only">Open editor</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="px-5 py-12 text-center">
                    <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
                      <BookOpen aria-hidden="true" />
                    </span>
                    <h3 className="mt-4 font-semibold text-foreground">No lead magnets yet</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Start with a Guide or Interactive Quiz.
                    </p>
                    <Button className="mt-5 rounded-xl" onClick={() => setLocation("/create")}>
                      <Plus aria-hidden="true" />
                      Create lead magnet
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-2xl">
              <CardHeader className="border-b border-border pb-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">Recent lead activity</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">Latest captured leads.</p>
                  </div>
                  {recentLeads.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-lg"
                      onClick={() => setLocation("/leads")}
                    >
                      View all
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {leadsQuery.isLoading ? (
                  <div className="space-y-3 p-5" role="status" aria-label="Loading recent leads">
                    {[0, 1, 2].map((item) => (
                      <div key={item} className="h-14 animate-pulse rounded-xl bg-muted" />
                    ))}
                  </div>
                ) : leadsQuery.isError ? (
                  <p className="p-8 text-center text-sm text-destructive" role="alert">
                    Lead activity could not be loaded.
                  </p>
                ) : recentLeads.length > 0 ? (
                  <ul className="divide-y divide-border">
                    {recentLeads.map((lead) => {
                      const displayName = [lead.firstName, lead.lastName].filter(Boolean).join(" ");
                      const magnetTitle = guideTitles.get(lead.guideId);
                      return (
                        <li key={lead.id} className="px-4 py-4 sm:px-5">
                          <div className="flex items-start gap-3">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
                              {(displayName || lead.email).charAt(0).toUpperCase()}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-foreground">
                                {displayName || lead.email}
                              </p>
                              {displayName && (
                                <p className="truncate text-xs text-muted-foreground">{lead.email}</p>
                              )}
                              <p className="mt-1 truncate text-xs text-muted-foreground">
                                {magnetTitle ? `${magnetTitle} · ` : ""}{readableDateTime(lead.createdAt)}
                              </p>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="px-5 py-12 text-center">
                    <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-muted text-muted-foreground">
                      <Users aria-hidden="true" />
                    </span>
                    <h3 className="mt-4 font-semibold text-foreground">No lead activity yet</h3>
                    <p className="mt-1 text-sm leading-5 text-muted-foreground">
                      Captured leads will appear here.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </main>
      </div>

      {showFirstTimeSetup && user && (
        <FirstTimeUserSetup
          user={{
            firstName: userString(user.firstName, "User"),
            email: userString(user.email, ""),
          }}
          onComplete={() => {
            setShowFirstTimeSetup(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
