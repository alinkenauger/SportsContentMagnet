import { storage } from "../storage";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

// Storage cost calculator - passes costs directly to users
export class StorageCostManager {
  // Base rates (can be adjusted based on actual cloud provider costs)
  private static readonly BASE_STORAGE_RATE_PER_GB_MONTH = 0.023; // $0.023/GB/month (AWS S3 Standard)
  private static readonly PROCESSING_COST_PER_MB = 0.001; // $0.001/MB for transcription processing
  
  /**
   * Calculate monthly storage cost for a file
   */
  static calculateMonthlyCost(fileSizeMB: number): number {
    const fileSizeGB = fileSizeMB / 1024;
    return fileSizeGB * this.BASE_STORAGE_RATE_PER_GB_MONTH;
  }
  
  /**
   * Calculate one-time processing cost
   */
  static calculateProcessingCost(fileSizeMB: number): number {
    return fileSizeMB * this.PROCESSING_COST_PER_MB;
  }
  
  /**
   * Track file upload and calculate costs
   */
  static async trackFileUpload(params: {
    userId: string;
    fileName: string;
    fileType: 'video' | 'audio' | 'pdf' | 'image';
    fileSizeMB: number;
    fileUrl?: string;
    guideId?: number;
    retentionDays?: number;
  }) {
    const monthlyCost = this.calculateMonthlyCost(params.fileSizeMB);
    const processingCost = this.calculateProcessingCost(params.fileSizeMB);
    
    // Create storage usage record
    const storageRecord = await storage.createStorageUsage({
      userId: params.userId,
      fileName: params.fileName,
      fileType: params.fileType,
      fileSizeMB: params.fileSizeMB,
      fileUrl: params.fileUrl,
      storageCostUSD: monthlyCost,
      guideId: params.guideId,
      retentionDays: params.retentionDays || 30,
    });
    
    // Update user's storage usage
    await this.updateUserStorageUsage(params.userId);
    
    // Schedule automatic cleanup if enabled
    await this.scheduleFileCleanup(storageRecord.id, params.retentionDays || 30);
    
    return {
      storageRecord,
      costs: {
        monthlyStorageCost: monthlyCost,
        processingCost: processingCost,
        totalFirstMonthCost: monthlyCost + processingCost
      }
    };
  }
  
  /**
   * Mark file as processed (transcript extracted)
   */
  static async markFileProcessed(storageId: number) {
    await storage.markStorageFileProcessed(storageId);
  }
  
  /**
   * Delete file and stop storage costs
   */
  static async deleteFileAndStopCosts(storageId: number, userId: string) {
    await storage.deleteStorageFile(storageId);
    await this.updateUserStorageUsage(userId);
  }
  
  /**
   * Update user's total storage usage and costs
   */
  static async updateUserStorageUsage(userId: string) {
    const storageStats = await storage.getUserStorageStats(userId);
    
    await storage.updateUserStorageQuota(userId, {
      storageUsedMB: storageStats.totalUsedMB,
      monthlyStorageCostUSD: storageStats.totalMonthlyCost
    });
  }
  
  /**
   * Schedule file cleanup job
   */
  static async scheduleFileCleanup(storageUsageId: number, retentionDays: number) {
    const scheduledFor = new Date();
    scheduledFor.setDate(scheduledFor.getDate() + retentionDays);
    
    await storage.createFileCleanupJob({
      storageUsageId,
      scheduledFor,
      status: 'pending'
    });
  }
  
  /**
   * Process cleanup jobs (run daily via cron)
   */
  static async processCleanupJobs() {
    const pendingJobs = await storage.getPendingCleanupJobs();
    
    for (const job of pendingJobs) {
      try {
        // Delete the actual file from storage (implementation depends on storage provider)
        await this.deletePhysicalFile(job.storageUsage.fileUrl);
        
        // Mark storage record as deleted
        await storage.markStorageFileDeleted(job.storageUsageId);
        
        // Mark cleanup job as completed
        await storage.updateFileCleanupJob(job.id, {
          status: 'completed',
          completedAt: new Date()
        });
        
        // Update user storage usage
        await this.updateUserStorageUsage(job.storageUsage.userId);
        
      } catch (error) {
        await storage.updateFileCleanupJob(job.id, {
          status: 'failed',
          errorMessage: error.message
        });
      }
    }
  }
  
  /**
   * Check if user is over storage quota
   */
  static async checkStorageQuota(userId: string): Promise<{
    isOverQuota: boolean;
    usagePercent: number;
    overageCharges: number;
  }> {
    const user = await storage.getUser(userId);
    const tier = await storage.getUserSubscriptionTier(userId);
    
    if (!user || !tier) {
      return { isOverQuota: false, usagePercent: 0, overageCharges: 0 };
    }
    
    const quotaGB = parseFloat(tier.storageQuotaGB);
    const usedGB = parseFloat(user.storageUsedMB) / 1024;
    const usagePercent = (usedGB / quotaGB) * 100;
    
    const isOverQuota = usedGB > quotaGB;
    const overageGB = Math.max(0, usedGB - quotaGB);
    const overageCharges = overageGB * parseFloat(tier.storageOveragePricePerGB);
    
    return {
      isOverQuota,
      usagePercent,
      overageCharges
    };
  }
  
  /**
   * Generate monthly billing record
   */
  static async generateMonthlyBilling(userId: string, billingMonth: string) {
    const storageStats = await storage.getUserStorageStatsForMonth(userId, billingMonth);
    const quotaCheck = await this.checkStorageQuota(userId);
    
    const totalCost = storageStats.totalMonthlyCost + quotaCheck.overageCharges;
    
    const billing = await storage.createStorageBilling({
      userId,
      billingMonth,
      totalStorageUsedMB: storageStats.totalUsedMB,
      totalCostUSD: totalCost,
      status: 'pending'
    });
    
    // If cost > $0, create Stripe charge
    if (totalCost > 0) {
      try {
        const charge = await this.createStripeCharge(userId, totalCost, `Storage costs for ${billingMonth}`);
        
        await storage.updateStorageBilling(billing.id, {
          stripeChargeId: charge.id,
          status: 'charged',
          chargedAt: new Date()
        });
      } catch (error) {
        await storage.updateStorageBilling(billing.id, {
          status: 'failed'
        });
      }
    }
    
    return billing;
  }
  
  /**
   * Create Stripe charge for storage costs
   */
  private static async createStripeCharge(userId: string, amount: number, description: string) {
    // This would integrate with your existing Stripe setup
    // Implementation depends on your Stripe integration
    throw new Error("Stripe integration needed for storage billing");
  }
  
  /**
   * Delete physical file from storage
   */
  private static async deletePhysicalFile(fileUrl?: string) {
    if (!fileUrl) return;
    
    // Implementation depends on your storage provider
    // For Replit, files might be in a specific directory
    // For cloud storage (S3, etc.), use the appropriate SDK
    
    try {
      // Example for local file deletion
      if (fileUrl.startsWith('/')) {
        const fs = await import('fs/promises');
        await fs.unlink(fileUrl);
      }
    } catch (error) {
      console.warn(`Failed to delete physical file ${fileUrl}:`, error);
    }
  }
  
  /**
   * Get storage statistics for dashboard
   */
  static async getStorageDashboardStats(userId: string) {
    const user = await storage.getUser(userId);
    const storageFiles = await storage.getUserStorageFiles(userId);
    const tier = await storage.getUserSubscriptionTier(userId);
    const quotaCheck = await this.checkStorageQuota(userId);
    
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const monthlyStats = await storage.getUserStorageStatsForMonth(userId, currentMonth);
    
    return {
      totalStorageUsedMB: parseFloat(user?.storageUsedMB || '0'),
      monthlyStorageCost: parseFloat(user?.monthlyStorageCostUSD || '0') + quotaCheck.overageCharges,
      totalFiles: storageFiles.length,
      activeFiles: storageFiles.filter(f => !f.deletedAt).length,
      processedFiles: storageFiles.filter(f => f.processedAt).length,
      quotaUsagePercent: quotaCheck.usagePercent,
      isOverQuota: quotaCheck.isOverQuota,
      overageCharges: quotaCheck.overageCharges,
      subscriptionTier: tier,
      fileBreakdown: {
        video: storageFiles.filter(f => f.fileType === 'video').length,
        audio: storageFiles.filter(f => f.fileType === 'audio').length,
        pdf: storageFiles.filter(f => f.fileType === 'pdf').length,
        image: storageFiles.filter(f => f.fileType === 'image').length,
      }
    };
  }
}

// Default subscription tiers
export const DEFAULT_SUBSCRIPTION_TIERS = [
  {
    name: 'free',
    displayName: 'Free',
    monthlyPriceUSD: 0,
    storageQuotaGB: 1, // 1GB free
    storageOveragePricePerGB: 0.05, // $0.05/GB overage
    maxFileSizeMB: 100, // 100MB max file
    maxGuidesPerMonth: 5,
    retentionDays: 7, // Delete files after 7 days
    isActive: true
  },
  {
    name: 'basic',
    displayName: 'Basic',
    monthlyPriceUSD: 29,
    storageQuotaGB: 10, // 10GB included
    storageOveragePricePerGB: 0.03, // $0.03/GB overage
    maxFileSizeMB: 500, // 500MB max file
    maxGuidesPerMonth: 25,
    retentionDays: 30, // Keep files for 30 days
    isActive: true
  },
  {
    name: 'pro',
    displayName: 'Professional',
    monthlyPriceUSD: 99,
    storageQuotaGB: 100, // 100GB included
    storageOveragePricePerGB: 0.02, // $0.02/GB overage  
    maxFileSizeMB: 2000, // 2GB max file
    maxGuidesPerMonth: 100,
    retentionDays: 90, // Keep files for 90 days
    isActive: true
  },
  {
    name: 'enterprise',
    displayName: 'Enterprise',
    monthlyPriceUSD: 299,
    storageQuotaGB: 1000, // 1TB included
    storageOveragePricePerGB: 0.01, // $0.01/GB overage
    maxFileSizeMB: 10000, // 10GB max file
    maxGuidesPerMonth: 1000,
    retentionDays: 365, // Keep files for 1 year
    isActive: true
  }
];

export default StorageCostManager;