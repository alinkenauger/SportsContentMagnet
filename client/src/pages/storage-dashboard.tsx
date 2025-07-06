import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  HardDrive, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  Trash2, 
  Download,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileVideo,
  FileAudio,
  FileText,
  Image as ImageIcon,
  Calendar,
  CreditCard,
  Settings,
  Zap,
  Shield
} from "lucide-react";

export default function StorageDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [autoCleanupEnabled, setAutoCleanupEnabled] = useState(true);

  // Queries
  const { data: storageStats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/storage/stats"],
    enabled: true
  });

  const { data: storageUsage = [], isLoading: usageLoading } = useQuery({
    queryKey: ["/api/storage/usage"],
    enabled: true
  });

  const { data: billingHistory = [], isLoading: billingLoading } = useQuery({
    queryKey: ["/api/storage/billing"],
    enabled: true
  });

  const { data: subscriptionTier } = useQuery({
    queryKey: ["/api/storage/subscription-tier"],
    enabled: true
  });

  // Mutations
  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: number) => {
      return await apiRequest("DELETE", `/api/storage/files/${fileId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/storage"] });
      toast({ title: "Success", description: "File deleted and storage costs reduced!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete file", variant: "destructive" });
    }
  });

  const toggleAutoCleanupMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      return await apiRequest("/api/storage/settings", "PUT", { autoCleanupEnabled: enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/storage"] });
      toast({ title: "Success", description: "Auto-cleanup settings updated!" });
    }
  });

  const upgradeSubscriptionMutation = useMutation({
    mutationFn: async (tierName: string) => {
      return await apiRequest("/api/storage/upgrade", "POST", { tierName });
    },
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to initiate upgrade", variant: "destructive" });
    }
  });

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'video': return <FileVideo className="w-4 h-4" />;
      case 'audio': return <FileAudio className="w-4 h-4" />;
      case 'pdf': return <FileText className="w-4 h-4" />;
      case 'image': return <ImageIcon className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const formatFileSize = (sizeMB: number) => {
    if (sizeMB < 1) return `${(sizeMB * 1024).toFixed(0)} KB`;
    if (sizeMB < 1024) return `${sizeMB.toFixed(1)} MB`;
    return `${(sizeMB / 1024).toFixed(1)} GB`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const storageUsedPercent = subscriptionTier 
    ? (storageStats?.totalStorageUsedMB / (subscriptionTier.storageQuotaGB * 1024)) * 100 
    : 0;

  const isNearLimit = storageUsedPercent > 80;
  const isOverLimit = storageUsedPercent > 100;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <HardDrive className="w-8 h-8" />
            Storage & Cost Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Monitor your storage usage and manage costs efficiently
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/storage"] })}
          >
            Refresh Data
          </Button>
          {subscriptionTier && (
            <Badge variant={subscriptionTier.name === 'free' ? "secondary" : "default"}>
              {subscriptionTier.displayName}
            </Badge>
          )}
        </div>
      </div>

      {/* Storage Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatFileSize(storageStats?.totalStorageUsedMB || 0)}
            </div>
            {subscriptionTier && (
              <>
                <Progress value={storageUsedPercent} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  of {subscriptionTier.storageQuotaGB} GB quota
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(storageStats?.monthlyStorageCost || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Current month charges
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Files Stored</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {storageStats?.totalFiles || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Active files
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Auto-Cleanup</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Switch
                checked={autoCleanupEnabled}
                onCheckedChange={(checked) => {
                  setAutoCleanupEnabled(checked);
                  toggleAutoCleanupMutation.mutate(checked);
                }}
              />
              <Label>Enabled</Label>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Delete files after processing
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Storage Warning */}
      {(isNearLimit || isOverLimit) && (
        <Card className={`border-2 ${isOverLimit ? 'border-red-500' : 'border-yellow-500'}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className={`w-5 h-5 ${isOverLimit ? 'text-red-500' : 'text-yellow-500'}`} />
              {isOverLimit ? 'Storage Limit Exceeded!' : 'Storage Warning'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {isOverLimit 
                ? 'You have exceeded your storage quota. Additional charges apply.'
                : 'You are approaching your storage limit. Consider upgrading or cleaning up files.'
              }
            </p>
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => upgradeSubscriptionMutation.mutate('pro')}
                className="flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Upgrade Plan
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                Clean Up Files
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="files" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="files">File Management</TabsTrigger>
          <TabsTrigger value="billing">Billing History</TabsTrigger>
          <TabsTrigger value="settings">Cost Settings</TabsTrigger>
          <TabsTrigger value="upgrade">Upgrade Plans</TabsTrigger>
        </TabsList>

        {/* File Management Tab */}
        <TabsContent value="files" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>File Storage Management</CardTitle>
              <p className="text-sm text-muted-foreground">
                Manage your uploaded files and associated storage costs
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {storageUsage.map((file: any) => (
                  <div key={file.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getFileIcon(file.fileType)}
                      <div>
                        <p className="font-medium">{file.fileName}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{formatFileSize(file.fileSizeMB)}</span>
                          <span>•</span>
                          <span>{formatCurrency(file.storageCostUSD)}/month</span>
                          <span>•</span>
                          <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {file.processedAt && (
                        <Badge variant="success" className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Processed
                        </Badge>
                      )}
                      
                      {file.deletedAt ? (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          Deleted
                        </Badge>
                      ) : (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete File</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete "{file.fileName}" and stop associated storage charges.
                                The processed content (transcripts, guides) will remain available.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteFileMutation.mutate(file.id)}>
                                Delete & Save Costs
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing History Tab */}
        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Storage Billing History</CardTitle>
              <p className="text-sm text-muted-foreground">
                Review your monthly storage costs and charges
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {billingHistory.map((billing: any) => (
                  <div key={billing.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{billing.billingMonth}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(billing.totalStorageUsedMB)} storage used
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(billing.totalCostUSD)}</p>
                        <Badge 
                          variant={billing.status === 'charged' ? 'success' : 
                                   billing.status === 'pending' ? 'secondary' : 'destructive'}
                        >
                          {billing.status}
                        </Badge>
                      </div>
                      {billing.stripeChargeId && (
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cost Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Storage Cost Management Settings</CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure how storage costs are managed for your account
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label className="text-base font-medium">Automatic File Cleanup</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically delete uploaded files after processing to minimize storage costs
                  </p>
                </div>
                <Switch
                  checked={autoCleanupEnabled}
                  onCheckedChange={(checked) => toggleAutoCleanupMutation.mutate(checked)}
                />
              </div>

              <div className="p-4 border rounded-lg">
                <Label className="text-base font-medium">File Retention Policy</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Files are automatically deleted after {subscriptionTier?.retentionDays || 30} days
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <p className="text-sm text-blue-800">
                    <strong>How it works:</strong> We extract transcripts and content immediately after upload, 
                    then delete the original files to keep your storage costs minimal while preserving all functionality.
                  </p>
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <Label className="text-base font-medium">Storage Cost Pass-Through</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Storage costs are calculated and charged monthly based on actual usage
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Base storage rate:</span>
                    <span>$0.02/GB/month</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Overage rate:</span>
                    <span>{formatCurrency(subscriptionTier?.storageOveragePricePerGB || 0.05)}/GB/month</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Upgrade Plans Tab */}
        <TabsContent value="upgrade" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                name: 'basic',
                displayName: 'Basic',
                monthlyPrice: 29,
                storageQuota: 10,
                maxFileSize: 500,
                overage: 0.03
              },
              {
                name: 'pro',
                displayName: 'Professional',
                monthlyPrice: 99,
                storageQuota: 100,
                maxFileSize: 2000,
                overage: 0.02
              },
              {
                name: 'enterprise',
                displayName: 'Enterprise',
                monthlyPrice: 299,
                storageQuota: 1000,
                maxFileSize: 10000,
                overage: 0.01
              }
            ].map((plan) => (
              <Card key={plan.name} className={subscriptionTier?.name === plan.name ? 'border-primary' : ''}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {plan.displayName}
                    {subscriptionTier?.name === plan.name && (
                      <Badge>Current</Badge>
                    )}
                  </CardTitle>
                  <div className="text-3xl font-bold">
                    {formatCurrency(plan.monthlyPrice)}
                    <span className="text-sm font-normal text-muted-foreground">/month</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      <span>{plan.storageQuota} GB storage included</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileVideo className="w-4 h-4" />
                      <span>Up to {plan.maxFileSize} MB file size</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      <span>{formatCurrency(plan.overage)}/GB overage</span>
                    </div>
                  </div>
                  
                  {subscriptionTier?.name !== plan.name && (
                    <Button 
                      className="w-full"
                      onClick={() => upgradeSubscriptionMutation.mutate(plan.name)}
                    >
                      Upgrade to {plan.displayName}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}