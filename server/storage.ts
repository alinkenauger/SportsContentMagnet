import {
  users,
  brands,
  guides,
  landingPages,
  leads,
  qrCodes,
  analyticsEvents,
  brandingSettings,
  trainingSettings,
  knowledgebaseEntries,
  knowledgebaseCollections,
  knowledgebaseUsageSettings,
  googleConnections,
  promptTemplates,
  mediaAssets,
  storageUsage,
  storageBilling,
  subscriptionTiers,
  fileCleanupJobs,
  subscriptionPlans,
  userSubscriptions,
  brandUsers,
  emailTemplates,
  emailIntegrations,
  type User,
  type UpsertUser,
  type Brand,
  type InsertBrand,
  type Guide,
  type InsertGuide,
  type LandingPage,
  type InsertLandingPage,
  type Lead,
  type InsertLead,
  type BrandingSettings,
  type InsertBrandingSettings,
  type QrCode,
  type InsertQrCode,
  type AnalyticsEvent,
  type InsertAnalyticsEvent,
  type TrainingSettings,
  type InsertTrainingSettings,
  type KnowledgebaseEntry,
  type InsertKnowledgebaseEntry,
  type KnowledgebaseCollection,
  type InsertKnowledgebaseCollection,
  type KnowledgebaseUsageSettings,
  type InsertKnowledgebaseUsageSettings,
  type GoogleConnection,
  type InsertGoogleConnection,
  type EmailTemplate,
  type InsertEmailTemplate,
  type EmailIntegration,
  type InsertEmailIntegration,
  type PromptTemplate,
  type InsertPromptTemplate,
  type MediaAsset,
  type InsertMediaAsset,
  type StorageUsage,
  type InsertStorageUsage,
  type StorageBilling,
  type InsertStorageBilling,
  type SubscriptionTier,
  type FileCleanupJob,
  type InsertFileCleanupJob,
  type SubscriptionPlan,
  type InsertSubscriptionPlan,
  type UserSubscription,
  type InsertUserSubscription,
  type BrandUser,
  type InsertBrandUser,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, count, avg, isNull } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Authentication operations for signup/password reset
  getUserByResetToken(token: string): Promise<User | undefined>;
  updateUserResetToken(userId: string, token: string, expiry: Date): Promise<void>;
  clearUserResetToken(userId: string): Promise<void>;
  updateUserPassword(userId: string, hashedPassword: string): Promise<void>;
  getUserByEmailVerificationToken(token: string): Promise<User | undefined>;
  updateUserEmailVerificationToken(userId: string, token: string): Promise<void>;
  markEmailAsVerified(userId: string): Promise<void>;

  // Brand operations
  createBrand(brand: InsertBrand): Promise<Brand>;
  getBrandsByUser(userId: string): Promise<Brand[]>;
  getBrand(id: number): Promise<Brand | undefined>;
  updateBrand(id: number, brand: Partial<InsertBrand>): Promise<Brand>;
  deleteBrand(id: number): Promise<void>;
  setCurrentBrand(userId: string, brandId: number): Promise<void>;

  // Guide operations
  createGuide(guide: InsertGuide): Promise<Guide>;
  getGuide(id: number): Promise<Guide | undefined>;
  getGuidesByUser(userId: string): Promise<Guide[]>;
  getGuidesByUserAndBrand(userId: string, brandId: number | null, query?: string, category?: string): Promise<Guide[]>;
  updateGuide(id: number, guide: Partial<InsertGuide>): Promise<Guide>;
  deleteGuide(id: number): Promise<void>;
  searchGuides(userId: string, query?: string, category?: string): Promise<Guide[]>;
  getPublicGuides(): Promise<Array<{
    id: number;
    title: string;
    description: string;
    thumbnailUrl: string;
    category: string;
    tags: string[];
    views: number;
    downloads: number;
    createdAt: string;
    author: {
      companyName?: string;
      logoUrl?: string;
    };
  }>>;

  // Landing page operations
  createLandingPage(landingPage: InsertLandingPage): Promise<LandingPage>;
  getLandingPage(id: number): Promise<LandingPage | undefined>;
  getLandingPageByUrl(customUrl: string): Promise<LandingPage | undefined>;
  getLandingPagesByUser(userId: string): Promise<LandingPage[]>;
  updateLandingPage(id: number, landingPage: Partial<InsertLandingPage>): Promise<LandingPage>;

  // Lead operations
  createLead(lead: InsertLead): Promise<Lead>;
  getLeadsByUser(userId: string): Promise<Lead[]>;
  getLeadsByUserAndBrand(userId: string, brandId: number | null): Promise<Lead[]>;
  getLeadsByGuide(guideId: number): Promise<Lead[]>;

  // QR code operations
  createQrCode(qrCode: InsertQrCode): Promise<QrCode>;
  getQrCodesByUser(userId: string): Promise<QrCode[]>;
  incrementQrCodeScan(id: number): Promise<void>;

  // Analytics operations
  createAnalyticsEvent(event: InsertAnalyticsEvent): Promise<AnalyticsEvent>;
  getAnalyticsByUser(userId: string, brandId?: number | null): Promise<{
    totalGuides: number;
    totalLeads: number;
    totalViews: number;
    totalDownloads: number;
    avgConversionRate: number;
  }>;
  getGuideAnalytics(guideId: number): Promise<{
    views: number;
    downloads: number;
    conversions: number;
    conversionRate: number;
  }>;

  // Branding operations
  getBrandingSettings(userId: string): Promise<BrandingSettings | undefined>;
  upsertBrandingSettings(settings: InsertBrandingSettings): Promise<BrandingSettings>;

  // Training settings operations
  getTrainingSettings(userId: string): Promise<TrainingSettings | undefined>;
  upsertTrainingSettings(settings: InsertTrainingSettings): Promise<TrainingSettings>;

  // Knowledge Base Collections operations
  createKnowledgebaseCollection(collection: InsertKnowledgebaseCollection): Promise<KnowledgebaseCollection>;
  getKnowledgebaseCollections(userId: string, brandId?: number | null): Promise<KnowledgebaseCollection[]>;
  updateKnowledgebaseCollection(id: number, collection: Partial<InsertKnowledgebaseCollection>): Promise<KnowledgebaseCollection>;
  deleteKnowledgebaseCollection(id: number): Promise<void>;
  
  // Knowledge Base Usage Settings operations
  getKnowledgebaseUsageSettings(userId: string, brandId?: number | null): Promise<KnowledgebaseUsageSettings | undefined>;
  upsertKnowledgebaseUsageSettings(settings: InsertKnowledgebaseUsageSettings): Promise<KnowledgebaseUsageSettings>;
  
  // Enhanced Knowledgebase operations with collections support
  createKnowledgebaseEntry(entry: InsertKnowledgebaseEntry): Promise<KnowledgebaseEntry>;
  getKnowledgebaseEntries(userId: string, brandId?: number | null, collectionIds?: number[]): Promise<KnowledgebaseEntry[]>;
  getActiveKnowledgebaseEntries(userId: string, brandId?: number | null): Promise<KnowledgebaseEntry[]>; // Respects usage settings
  updateKnowledgebaseEntry(id: number, entry: Partial<InsertKnowledgebaseEntry>): Promise<KnowledgebaseEntry>;
  deleteKnowledgebaseEntry(id: number): Promise<void>;
  searchKnowledgebaseEntries(userId: string, query?: string, brandId?: number | null): Promise<KnowledgebaseEntry[]>;

  // Google connection operations
  getUserGoogleConnection(userId: string): Promise<GoogleConnection | undefined>;
  updateUserGoogleConnection(userId: string, connection: InsertGoogleConnection | null): Promise<GoogleConnection | null>;

  // Prompt template operations with global inheritance
  createPromptTemplate(template: InsertPromptTemplate): Promise<PromptTemplate>;
  getPromptTemplates(userId: string, brandId?: number | null): Promise<PromptTemplate[]>;
  getPromptTemplate(id: number): Promise<PromptTemplate | undefined>;
  updatePromptTemplate(id: number, template: Partial<InsertPromptTemplate>): Promise<PromptTemplate>;
  deletePromptTemplate(id: number): Promise<void>;
  getPredefinedTemplates(): Promise<PromptTemplate[]>;

  // Media asset operations with global inheritance
  createMediaAsset(asset: InsertMediaAsset): Promise<MediaAsset>;
  getMediaAssets(userId: string, brandId?: number | null, folder?: string): Promise<MediaAsset[]>;
  getMediaAsset(id: number): Promise<MediaAsset | undefined>;
  updateMediaAsset(id: number, asset: Partial<InsertMediaAsset>): Promise<MediaAsset>;
  deleteMediaAsset(id: number): Promise<void>;
  searchMediaAssets(userId: string, query?: string, brandId?: number | null): Promise<MediaAsset[]>;

  // Global admin operations
  getAllUsers(): Promise<Array<{
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    role: string | null;
    totalGuides: number;
    totalLeads: number;
    createdAt: Date | null;
  }>>;
  getUserStats(userId: string): Promise<{
    totalGuides: number;
    totalLeads: number;
    totalViews: number;
    totalDownloads: number;
    recentActivity: Array<{
      type: string;
      title: string;
      date: Date;
    }>;
  }>;
  updateUserRole(userId: string, role: string): Promise<User>;
  deleteUser(userId: string): Promise<void>;
  getSystemStats(): Promise<{
    totalUsers: number;
    totalGuides: number;
    totalLeads: number;
    totalViews: number;
    activeUsersLast30Days: number;
    newUsersLast30Days: number;
  }>;

  // Subscription operations
  getSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  getUserSubscription(userId: string): Promise<UserSubscription | null>;
  createUserSubscription(subscription: InsertUserSubscription): Promise<UserSubscription>;
  updateUserSubscription(id: number, subscription: Partial<InsertUserSubscription>): Promise<UserSubscription>;
  
  // Brand user operations
  getBrandUsers(brandId: number): Promise<BrandUser[]>;
  getUserBrands(userId: string): Promise<BrandUser[]>;
  addUserToBrand(brandUser: InsertBrandUser): Promise<BrandUser>;
  updateBrandUserRole(id: number, role: string): Promise<BrandUser>;
  removeBrandUser(id: number): Promise<void>;
  getBrandUserRole(userId: string, brandId: number): Promise<string | null>;

  // Storage management operations
  createStorageUsage(usage: InsertStorageUsage): Promise<StorageUsage>;
  getUserStorageFiles(userId: string): Promise<StorageUsage[]>;
  markStorageFileProcessed(storageId: number): Promise<void>;
  deleteStorageFile(storageId: number): Promise<void>;
  markStorageFileDeleted(storageId: number): Promise<void>;
  getUserStorageStats(userId: string): Promise<{
    totalUsedMB: number;
    totalMonthlyCost: number;
  }>;
  updateUserStorageQuota(userId: string, data: {
    storageUsedMB: number;
    monthlyStorageCostUSD: number;
  }): Promise<void>;
  createFileCleanupJob(job: InsertFileCleanupJob): Promise<FileCleanupJob>;
  getPendingCleanupJobs(): Promise<Array<FileCleanupJob & { storageUsage: StorageUsage }>>;
  updateFileCleanupJob(id: number, data: Partial<InsertFileCleanupJob>): Promise<void>;
  getUserSubscriptionTier(userId: string): Promise<SubscriptionTier | null>;
  getUserStorageStatsForMonth(userId: string, month: string): Promise<{
    totalUsedMB: number;
    totalMonthlyCost: number;
  }>;
  createStorageBilling(billing: InsertStorageBilling): Promise<StorageBilling>;
  updateStorageBilling(id: number, data: Partial<InsertStorageBilling>): Promise<void>;
  getStorageBillingHistory(userId: string): Promise<StorageBilling[]>;

  // Email template operations
  getEmailTemplates(userId: string, brandId: number | null): Promise<EmailTemplate[]>;
  createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate>;
  updateEmailTemplate(id: number, template: Partial<InsertEmailTemplate>): Promise<EmailTemplate>;

  // Email integration operations
  getEmailIntegrations(userId: string, brandId: number | null): Promise<EmailIntegration[]>;
  createEmailIntegration(integration: InsertEmailIntegration): Promise<EmailIntegration>;
  updateEmailIntegration(id: number, integration: Partial<InsertEmailIntegration>): Promise<EmailIntegration>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [connection] = await db
      .select({ user: users })
      .from(googleConnections)
      .innerJoin(users, eq(googleConnections.userId, users.id))
      .where(eq(googleConnections.googleId, googleId));
    return connection?.user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();

    // Check if user has any brands, if not create a default brand
    const existingBrands = await this.getBrandsByUser(user.id);
    if (existingBrands.length === 0) {
      const defaultBrand = await this.createBrand({
        userId: user.id,
        name: "My Brand",
        description: "Your default workspace",
        isDefault: true,
      });
      
      // Set as current brand
      await this.setCurrentBrand(user.id, defaultBrand.id);
    }

    return user;
  }

  // Authentication operations for signup/password reset
  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.resetToken, token));
    return user;
  }

  async updateUserResetToken(userId: string, token: string, expiry: Date): Promise<void> {
    await db
      .update(users)
      .set({
        resetToken: token,
        resetTokenExpiry: expiry,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async clearUserResetToken(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        resetToken: null,
        resetTokenExpiry: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async updateUserPassword(userId: string, hashedPassword: string): Promise<void> {
    await db
      .update(users)
      .set({
        tempPassword: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async getUserByEmailVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.emailVerificationToken, token));
    return user;
  }

  async updateUserEmailVerificationToken(userId: string, token: string): Promise<void> {
    await db
      .update(users)
      .set({
        emailVerificationToken: token,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async markEmailAsVerified(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        isEmailVerified: true,
        emailVerificationToken: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  // Brand operations
  async createBrand(brand: InsertBrand): Promise<Brand> {
    const [newBrand] = await db.insert(brands).values(brand).returning();
    return newBrand;
  }

  async getBrandsByUser(userId: string): Promise<Brand[]> {
    return await db
      .select()
      .from(brands)
      .where(eq(brands.userId, userId))
      .orderBy(desc(brands.createdAt));
  }

  async getBrand(id: number): Promise<Brand | undefined> {
    const [brand] = await db.select().from(brands).where(eq(brands.id, id));
    return brand;
  }

  async updateBrand(id: number, brand: Partial<InsertBrand>): Promise<Brand> {
    const [updatedBrand] = await db
      .update(brands)
      .set({
        ...brand,
        updatedAt: new Date(),
      })
      .where(eq(brands.id, id))
      .returning();
    return updatedBrand;
  }

  async deleteBrand(id: number): Promise<void> {
    await db.delete(brands).where(eq(brands.id, id));
  }

  async setCurrentBrand(userId: string, brandId: number | null): Promise<void> {
    await db
      .update(users)
      .set({ currentBrandId: brandId })
      .where(eq(users.id, userId));
  }

  // Guide operations
  async createGuide(guide: InsertGuide): Promise<Guide> {
    const [newGuide] = await db.insert(guides).values(guide).returning();
    return newGuide;
  }

  async getGuide(id: number): Promise<Guide | undefined> {
    const [guide] = await db.select().from(guides).where(eq(guides.id, id));
    return guide;
  }

  async getGuidesByUser(userId: string): Promise<Guide[]> {
    return await db
      .select()
      .from(guides)
      .where(eq(guides.userId, userId))
      .orderBy(desc(guides.createdAt));
  }

  async getGuidesByUserAndBrand(userId: string, brandId: number | null, query?: string, category?: string): Promise<Guide[]> {
    let whereConditions = [
      eq(guides.userId, userId),
      brandId ? eq(guides.brandId, brandId) : isNull(guides.brandId)
    ];

    // Add search conditions if provided
    if (query) {
      whereConditions.push(
        sql`${guides.title} ILIKE ${`%${query}%`} OR ${guides.description} ILIKE ${`%${query}%`}`
      );
    }

    if (category) {
      whereConditions.push(eq(guides.category, category));
    }

    return await db
      .select()
      .from(guides)
      .where(and(...whereConditions))
      .orderBy(desc(guides.createdAt));
  }

  async updateGuide(id: number, guide: Partial<InsertGuide>): Promise<Guide> {
    const [updatedGuide] = await db
      .update(guides)
      .set({ ...guide, updatedAt: new Date() })
      .where(eq(guides.id, id))
      .returning();
    return updatedGuide;
  }

  async deleteGuide(id: number): Promise<void> {
    await db.delete(guides).where(eq(guides.id, id));
  }

  async searchGuides(userId: string, query?: string, category?: string): Promise<Guide[]> {
    let conditions = [eq(guides.userId, userId)];

    if (query) {
      conditions.push(
        sql`${guides.title} ILIKE ${'%' + query + '%'} OR ${guides.description} ILIKE ${'%' + query + '%'}`
      );
    }

    if (category) {
      conditions.push(eq(guides.category, category));
    }

    return await db
      .select()
      .from(guides)
      .where(and(...conditions))
      .orderBy(desc(guides.createdAt));
  }

  async getPublicGuides() {
    const guidesWithBranding = await db
      .select({
        id: guides.id,
        title: guides.title,
        description: guides.description,
        thumbnailUrl: guides.thumbnailUrl,
        category: guides.category,
        tags: guides.tags,
        views: guides.views,
        downloads: guides.downloads,
        createdAt: guides.createdAt,
        companyName: brandingSettings.companyName,
        logoUrl: brandingSettings.logoUrl,
      })
      .from(guides)
      .leftJoin(brandingSettings, eq(guides.userId, brandingSettings.userId))
      .where(eq(guides.status, 'published'))
      .orderBy(desc(guides.createdAt));

    return guidesWithBranding.map(guide => ({
      id: guide.id,
      title: guide.title,
      description: guide.description || '',
      thumbnailUrl: guide.thumbnailUrl || '',
      category: guide.category || '',
      tags: guide.tags || [],
      views: guide.views || 0,
      downloads: guide.downloads || 0,
      createdAt: guide.createdAt?.toISOString() || new Date().toISOString(),
      author: {
        companyName: guide.companyName || undefined,
        logoUrl: guide.logoUrl || undefined,
      },
    }));
  }

  // Landing page operations
  async createLandingPage(landingPage: InsertLandingPage): Promise<LandingPage> {
    const [newLandingPage] = await db.insert(landingPages).values(landingPage).returning();
    return newLandingPage;
  }

  async getLandingPage(id: number): Promise<LandingPage | undefined> {
    const [landingPage] = await db.select().from(landingPages).where(eq(landingPages.id, id));
    return landingPage;
  }

  async getLandingPageByUrl(customUrl: string): Promise<LandingPage | undefined> {
    const [landingPage] = await db.select().from(landingPages).where(eq(landingPages.customUrl, customUrl));
    return landingPage;
  }

  async getLandingPageByGuideId(guideId: number): Promise<LandingPage | undefined> {
    const [landingPage] = await db.select().from(landingPages).where(eq(landingPages.guideId, guideId));
    return landingPage;
  }

  async getLandingPagesByUser(userId: string): Promise<LandingPage[]> {
    return await db
      .select()
      .from(landingPages)
      .where(eq(landingPages.userId, userId))
      .orderBy(desc(landingPages.createdAt));
  }

  async updateLandingPage(id: number, landingPage: Partial<InsertLandingPage>): Promise<LandingPage> {
    const [updatedLandingPage] = await db
      .update(landingPages)
      .set({ ...landingPage, updatedAt: new Date() })
      .where(eq(landingPages.id, id))
      .returning();
    return updatedLandingPage;
  }

  // Lead operations
  async createLead(lead: InsertLead): Promise<Lead> {
    const [newLead] = await db.insert(leads).values(lead).returning();
    
    // Update conversion count for landing page
    await db
      .update(landingPages)
      .set({ conversions: sql`${landingPages.conversions} + 1` })
      .where(eq(landingPages.id, lead.landingPageId));

    // Update downloads count for guide
    await db
      .update(guides)
      .set({ downloads: sql`${guides.downloads} + 1` })
      .where(eq(guides.id, lead.guideId));

    return newLead;
  }

  async getLeadsByUser(userId: string): Promise<Lead[]> {
    return await db
      .select()
      .from(leads)
      .where(eq(leads.userId, userId))
      .orderBy(desc(leads.createdAt));
  }

  async getLeadsByUserAndBrand(userId: string, brandId: number | null): Promise<Lead[]> {
    const whereConditions = [eq(leads.userId, userId)];
    
    let query = db
      .select({
        id: leads.id,
        landingPageId: leads.landingPageId,
        guideId: leads.guideId,
        userId: leads.userId,
        email: leads.email,
        firstName: leads.firstName,
        lastName: leads.lastName,
        phone: leads.phone,
        smsConsent: leads.smsConsent,
        tags: leads.tags,
        customFieldData: leads.customFieldData,
        ipAddress: leads.ipAddress,
        userAgent: leads.userAgent,
        referrer: leads.referrer,
        createdAt: leads.createdAt,
      })
      .from(leads)
      .innerJoin(guides, eq(leads.guideId, guides.id));
    
    if (brandId === null) {
      whereConditions.push(isNull(guides.brandId));
    } else if (brandId !== undefined) {
      whereConditions.push(eq(guides.brandId, brandId));
    }
    
    return await query
      .where(and(...whereConditions))
      .orderBy(desc(leads.createdAt));
  }

  async getLeadsByGuide(guideId: number): Promise<Lead[]> {
    return await db
      .select()
      .from(leads)
      .where(eq(leads.guideId, guideId))
      .orderBy(desc(leads.createdAt));
  }

  // QR code operations
  async createQrCode(qrCode: InsertQrCode): Promise<QrCode> {
    const [newQrCode] = await db.insert(qrCodes).values(qrCode).returning();
    return newQrCode;
  }

  async getQrCodesByUser(userId: string): Promise<QrCode[]> {
    return await db
      .select()
      .from(qrCodes)
      .where(eq(qrCodes.userId, userId))
      .orderBy(desc(qrCodes.createdAt));
  }

  async incrementQrCodeScan(id: number): Promise<void> {
    await db
      .update(qrCodes)
      .set({ scans: sql`${qrCodes.scans} + 1` })
      .where(eq(qrCodes.id, id));
  }

  // Analytics operations
  async createAnalyticsEvent(event: InsertAnalyticsEvent): Promise<AnalyticsEvent> {
    const [newEvent] = await db.insert(analyticsEvents).values(event).returning();
    return newEvent;
  }

  async getAnalyticsByUser(userId: string, brandId?: number | null): Promise<{
    totalGuides: number;
    totalLeads: number;
    totalViews: number;
    totalDownloads: number;
    avgConversionRate: number;
  }> {
    // Build where conditions for brand filtering
    const whereConditions = [eq(guides.userId, userId)];
    if (brandId !== undefined) {
      if (brandId === null) {
        whereConditions.push(isNull(guides.brandId));
      } else {
        whereConditions.push(eq(guides.brandId, brandId));
      }
    }

    const [stats] = await db
      .select({
        totalGuides: count(guides.id),
        totalViews: sql<number>`COALESCE(SUM(${guides.views}), 0)`,
        totalDownloads: sql<number>`COALESCE(SUM(${guides.downloads}), 0)`,
      })
      .from(guides)
      .where(and(...whereConditions));

    // Get actual leads count and calculate real conversion rate
    const leadsWhereConditions = [eq(leads.userId, userId)];
    
    let leadsQuery;
    if (brandId !== undefined) {
      leadsQuery = db
        .select({ totalLeads: count(leads.id) })
        .from(leads)
        .innerJoin(guides, eq(leads.guideId, guides.id));
      
      if (brandId === null) {
        leadsWhereConditions.push(isNull(guides.brandId));
      } else {
        leadsWhereConditions.push(eq(guides.brandId, brandId));
      }
    } else {
      leadsQuery = db
        .select({ totalLeads: count(leads.id) })
        .from(leads);
    }

    const [leadsCount] = await leadsQuery.where(and(...leadsWhereConditions));

    // Calculate real conversion rate: leads / views * 100
    const avgConversionRate = stats.totalViews > 0 ? 
      (leadsCount.totalLeads / stats.totalViews) * 100 : 0;

    return {
      totalGuides: stats.totalGuides,
      totalLeads: leadsCount.totalLeads,
      totalViews: stats.totalViews,
      totalDownloads: stats.totalDownloads,
      avgConversionRate: Number(avgConversionRate.toFixed(2)),
    };
  }

  async getGuideAnalytics(guideId: number): Promise<{
    views: number;
    downloads: number;
    conversions: number;
    conversionRate: number;
  }> {
    const [guide] = await db.select().from(guides).where(eq(guides.id, guideId));
    
    if (!guide) {
      return { views: 0, downloads: 0, conversions: 0, conversionRate: 0 };
    }

    const [conversions] = await db
      .select({ count: count(leads.id) })
      .from(leads)
      .where(eq(leads.guideId, guideId));

    const views = guide.views || 0;
    const downloads = guide.downloads || 0;
    const conversionRate = views > 0 ? (conversions.count / views) * 100 : 0;

    return {
      views,
      downloads,
      conversions: conversions.count,
      conversionRate: Number(conversionRate.toFixed(2)),
    };
  }

  async updateGuideConversionRate(guideId: number, conversionRate: number): Promise<void> {
    await db
      .update(guides)
      .set({ conversionRate })
      .where(eq(guides.id, guideId));
  }

  // Branding operations
  async getBrandingSettings(userId: string): Promise<BrandingSettings | undefined> {
    const [settings] = await db
      .select()
      .from(brandingSettings)
      .where(eq(brandingSettings.userId, userId));
    return settings;
  }

  async upsertBrandingSettings(settings: InsertBrandingSettings): Promise<BrandingSettings> {
    const [result] = await db
      .insert(brandingSettings)
      .values(settings)
      .onConflictDoUpdate({
        target: brandingSettings.userId,
        set: {
          ...settings,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  // Training settings operations
  async getTrainingSettings(userId: string): Promise<TrainingSettings | undefined> {
    const [settings] = await db
      .select()
      .from(trainingSettings)
      .where(eq(trainingSettings.userId, userId));
    return settings;
  }

  async upsertTrainingSettings(settings: InsertTrainingSettings): Promise<TrainingSettings> {
    const [result] = await db
      .insert(trainingSettings)
      .values(settings)
      .onConflictDoUpdate({
        target: trainingSettings.userId,
        set: {
          ...settings,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  // Knowledgebase operations
  async createKnowledgebaseEntry(entry: InsertKnowledgebaseEntry): Promise<KnowledgebaseEntry> {
    const [result] = await db
      .insert(knowledgebaseEntries)
      .values(entry)
      .returning();
    return result;
  }

  async getKnowledgebaseEntries(userId: string, brandId?: number | null): Promise<KnowledgebaseEntry[]> {
    if (brandId === null || brandId === undefined) {
      // Get global user-level entries (brandId is null)
      return await db
        .select()
        .from(knowledgebaseEntries)
        .where(and(
          eq(knowledgebaseEntries.userId, userId),
          sql`${knowledgebaseEntries.brandId} IS NULL`,
          eq(knowledgebaseEntries.isActive, true)
        ))
        .orderBy(desc(knowledgebaseEntries.createdAt));
    }

    // Get brand-specific entries first
    const brandEntries = await db
      .select()
      .from(knowledgebaseEntries)
      .where(and(
        eq(knowledgebaseEntries.userId, userId),
        eq(knowledgebaseEntries.brandId, brandId),
        eq(knowledgebaseEntries.isActive, true)
      ))
      .orderBy(desc(knowledgebaseEntries.createdAt));

    // If brand has its own entries, return only those
    if (brandEntries.length > 0) {
      return brandEntries;
    }

    // Otherwise, fall back to global user entries
    return await db
      .select()
      .from(knowledgebaseEntries)
      .where(and(
        eq(knowledgebaseEntries.userId, userId),
        sql`${knowledgebaseEntries.brandId} IS NULL`,
        eq(knowledgebaseEntries.isActive, true)
      ))
      .orderBy(desc(knowledgebaseEntries.createdAt));
  }

  async updateKnowledgebaseEntry(id: number, entry: Partial<InsertKnowledgebaseEntry>): Promise<KnowledgebaseEntry> {
    const [result] = await db
      .update(knowledgebaseEntries)
      .set({
        ...entry,
        updatedAt: new Date(),
      })
      .where(eq(knowledgebaseEntries.id, id))
      .returning();
    return result;
  }

  async deleteKnowledgebaseEntry(id: number): Promise<void> {
    await db
      .update(knowledgebaseEntries)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(knowledgebaseEntries.id, id));
  }

  async searchKnowledgebaseEntries(userId: string, query?: string, brandId?: number | null): Promise<KnowledgebaseEntry[]> {
    if (brandId === null || brandId === undefined) {
      // Search global user-level entries only
      const baseConditions = [
        eq(knowledgebaseEntries.userId, userId),
        sql`${knowledgebaseEntries.brandId} IS NULL`,
        eq(knowledgebaseEntries.isActive, true)
      ];

      if (query) {
        baseConditions.push(
          sql`(${knowledgebaseEntries.title} ILIKE ${`%${query}%`} OR ${knowledgebaseEntries.content} ILIKE ${`%${query}%`})`
        );
      }

      return await db
        .select()
        .from(knowledgebaseEntries)
        .where(and(...baseConditions))
        .orderBy(desc(knowledgebaseEntries.createdAt));
    }

    // Search brand-specific entries first
    const brandBaseConditions = [
      eq(knowledgebaseEntries.userId, userId),
      eq(knowledgebaseEntries.brandId, brandId),
      eq(knowledgebaseEntries.isActive, true)
    ];

    if (query) {
      brandBaseConditions.push(
        sql`(${knowledgebaseEntries.title} ILIKE ${`%${query}%`} OR ${knowledgebaseEntries.content} ILIKE ${`%${query}%`})`
      );
    }

    const brandEntries = await db
      .select()
      .from(knowledgebaseEntries)
      .where(and(...brandBaseConditions))
      .orderBy(desc(knowledgebaseEntries.createdAt));

    // If brand has its own entries, return only those
    if (brandEntries.length > 0) {
      return brandEntries;
    }

    // Otherwise, fall back to global user entries
    const globalBaseConditions = [
      eq(knowledgebaseEntries.userId, userId),
      sql`${knowledgebaseEntries.brandId} IS NULL`,
      eq(knowledgebaseEntries.isActive, true)
    ];

    if (query) {
      globalBaseConditions.push(
        sql`(${knowledgebaseEntries.title} ILIKE ${`%${query}%`} OR ${knowledgebaseEntries.content} ILIKE ${`%${query}%`})`
      );
    }

    return await db
      .select()
      .from(knowledgebaseEntries)
      .where(and(...globalBaseConditions))
      .orderBy(desc(knowledgebaseEntries.createdAt));
  }

  async getUserGoogleConnection(userId: string): Promise<GoogleConnection | undefined> {
    const [connection] = await db.select().from(googleConnections).where(eq(googleConnections.userId, userId));
    return connection;
  }

  async updateUserGoogleConnection(userId: string, connection: InsertGoogleConnection | null): Promise<GoogleConnection | null> {
    if (connection === null) {
      // Delete the connection
      await db.delete(googleConnections).where(eq(googleConnections.userId, userId));
      return null;
    }

    // Upsert the connection
    const [result] = await db
      .insert(googleConnections)
      .values({
        ...connection,
        userId,
      })
      .onConflictDoUpdate({
        target: googleConnections.userId,
        set: {
          ...connection,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result;
  }

  // Global admin operations
  async getAllUsers() {
    const usersWithStats = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        createdAt: users.createdAt,
        totalGuides: sql<number>`COALESCE(${count(guides.id)}, 0)`,
        totalLeads: sql<number>`COALESCE(${count(leads.id)}, 0)`,
      })
      .from(users)
      .leftJoin(guides, eq(users.id, guides.userId))
      .leftJoin(leads, eq(guides.id, leads.guideId))
      .groupBy(users.id, users.email, users.firstName, users.lastName, users.role, users.createdAt)
      .orderBy(desc(users.createdAt));

    return usersWithStats;
  }

  async getUserStats(userId: string) {
    const userGuides = await db.select().from(guides).where(eq(guides.userId, userId));
    const userLeads = await db
      .select()
      .from(leads)
      .innerJoin(guides, eq(leads.guideId, guides.id))
      .where(eq(guides.userId, userId));

    const totalViews = userGuides.reduce((sum, guide) => sum + (guide.views || 0), 0);
    const totalDownloads = userGuides.reduce((sum, guide) => sum + (guide.downloads || 0), 0);

    // Recent activity - last 10 guides and leads
    const recentGuides = userGuides
      .slice(0, 5)
      .map(guide => ({
        type: 'guide',
        title: guide.title,
        date: guide.createdAt || new Date(),
      }));

    const recentLeads = userLeads
      .slice(0, 5)
      .map(({ leads: lead, guides: guide }) => ({
        type: 'lead',
        title: `Lead from "${guide.title}"`,
        date: lead.createdAt || new Date(),
      }));

    const recentActivity = [...recentGuides, ...recentLeads]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 10);

    return {
      totalGuides: userGuides.length,
      totalLeads: userLeads.length,
      totalViews,
      totalDownloads,
      recentActivity,
    };
  }

  async updateUserRole(userId: string, role: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return user;
  }

  async deleteUser(userId: string): Promise<void> {
    // This will cascade delete all related data due to foreign key constraints
    await db.delete(users).where(eq(users.id, userId));
  }

  async getSystemStats() {
    const [userCount] = await db.select({ count: count() }).from(users);
    const [guideCount] = await db.select({ count: count() }).from(guides);
    const [leadCount] = await db.select({ count: count() }).from(leads);

    const totalViews = await db
      .select({ total: sql<number>`COALESCE(SUM(${guides.views}), 0)` })
      .from(guides);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [activeUsers] = await db
      .select({ count: count() })
      .from(guides)
      .where(sql`${guides.createdAt} >= ${thirtyDaysAgo}`)
      .innerJoin(users, eq(guides.userId, users.id));

    const [newUsers] = await db
      .select({ count: count() })
      .from(users)
      .where(sql`${users.createdAt} >= ${thirtyDaysAgo}`);

    return {
      totalUsers: userCount.count,
      totalGuides: guideCount.count,
      totalLeads: leadCount.count,
      totalViews: totalViews[0]?.total || 0,
      activeUsersLast30Days: activeUsers.count,
      newUsersLast30Days: newUsers.count,
    };
  }

  // Storage management methods
  async createStorageUsage(usage: InsertStorageUsage): Promise<StorageUsage> {
    const [storageRecord] = await db
      .insert(storageUsage)
      .values(usage)
      .returning();
    return storageRecord;
  }

  async getUserStorageFiles(userId: string): Promise<StorageUsage[]> {
    return await db
      .select()
      .from(storageUsage)
      .where(eq(storageUsage.userId, userId))
      .orderBy(desc(storageUsage.createdAt));
  }

  async markStorageFileProcessed(storageId: number): Promise<void> {
    await db
      .update(storageUsage)
      .set({ processedAt: new Date(), updatedAt: new Date() })
      .where(eq(storageUsage.id, storageId));
  }

  async deleteStorageFile(storageId: number): Promise<void> {
    await db.delete(storageUsage).where(eq(storageUsage.id, storageId));
  }

  async markStorageFileDeleted(storageId: number): Promise<void> {
    await db
      .update(storageUsage)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(storageUsage.id, storageId));
  }

  async getUserStorageStats(userId: string): Promise<{
    totalUsedMB: number;
    totalMonthlyCost: number;
  }> {
    const stats = await db
      .select({
        totalUsedMB: sql<number>`COALESCE(SUM(${storageUsage.fileSizeMB}), 0)`,
        totalMonthlyCost: sql<number>`COALESCE(SUM(${storageUsage.storageCostUSD}), 0)`
      })
      .from(storageUsage)
      .where(and(
        eq(storageUsage.userId, userId),
        isNull(storageUsage.deletedAt)
      ));

    return {
      totalUsedMB: stats[0]?.totalUsedMB || 0,
      totalMonthlyCost: stats[0]?.totalMonthlyCost || 0
    };
  }

  async updateUserStorageQuota(userId: string, data: {
    storageUsedMB: number;
    monthlyStorageCostUSD: number;
  }): Promise<void> {
    await db
      .update(users)
      .set({
        storageUsedMB: data.storageUsedMB.toString(),
        monthlyStorageCostUSD: data.monthlyStorageCostUSD.toString(),
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async createFileCleanupJob(job: InsertFileCleanupJob): Promise<FileCleanupJob> {
    const [cleanupJob] = await db
      .insert(fileCleanupJobs)
      .values(job)
      .returning();
    return cleanupJob;
  }

  async getPendingCleanupJobs(): Promise<Array<FileCleanupJob & { storageUsage: StorageUsage }>> {
    const now = new Date();
    return await db
      .select()
      .from(fileCleanupJobs)
      .leftJoin(storageUsage, eq(fileCleanupJobs.storageUsageId, storageUsage.id))
      .where(and(
        eq(fileCleanupJobs.status, 'pending'),
        sql`${fileCleanupJobs.scheduledFor} <= ${now}`
      )) as any;
  }

  async updateFileCleanupJob(id: number, data: Partial<InsertFileCleanupJob>): Promise<void> {
    await db
      .update(fileCleanupJobs)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(fileCleanupJobs.id, id));
  }

  async getUserSubscriptionTier(userId: string): Promise<SubscriptionTier | null> {
    const user = await this.getUser(userId);
    if (!user?.subscriptionTier) return null;

    const [tier] = await db
      .select()
      .from(subscriptionTiers)
      .where(eq(subscriptionTiers.name, user.subscriptionTier));
    
    return tier || null;
  }

  async getUserStorageStatsForMonth(userId: string, month: string): Promise<{
    totalUsedMB: number;
    totalMonthlyCost: number;
  }> {
    const stats = await db
      .select({
        totalUsedMB: sql<number>`COALESCE(SUM(${storageUsage.fileSizeMB}), 0)`,
        totalMonthlyCost: sql<number>`COALESCE(SUM(${storageUsage.storageCostUSD}), 0)`
      })
      .from(storageUsage)
      .where(and(
        eq(storageUsage.userId, userId),
        sql`DATE_TRUNC('month', ${storageUsage.createdAt}) = ${month}-01`,
        isNull(storageUsage.deletedAt)
      ));

    return {
      totalUsedMB: stats[0]?.totalUsedMB || 0,
      totalMonthlyCost: stats[0]?.totalMonthlyCost || 0
    };
  }

  async createStorageBilling(billing: InsertStorageBilling): Promise<StorageBilling> {
    const [billingRecord] = await db
      .insert(storageBilling)
      .values(billing)
      .returning();
    return billingRecord;
  }

  async updateStorageBilling(id: number, data: Partial<InsertStorageBilling>): Promise<void> {
    await db
      .update(storageBilling)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(storageBilling.id, id));
  }

  async getStorageBillingHistory(userId: string): Promise<StorageBilling[]> {
    return await db
      .select()
      .from(storageBilling)
      .where(eq(storageBilling.userId, userId))
      .orderBy(desc(storageBilling.createdAt));
  }

  // Email template operations
  async getEmailTemplates(userId: string, brandId: number | null): Promise<EmailTemplate[]> {
    return await db.select().from(emailTemplates).where(
      and(
        eq(emailTemplates.userId, userId),
        brandId ? eq(emailTemplates.brandId, brandId) : isNull(emailTemplates.brandId)
      )
    );
  }

  async createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate> {
    const [newTemplate] = await db.insert(emailTemplates).values(template).returning();
    return newTemplate;
  }

  async updateEmailTemplate(id: number, template: Partial<InsertEmailTemplate>): Promise<EmailTemplate> {
    const [updatedTemplate] = await db
      .update(emailTemplates)
      .set({ ...template, updatedAt: new Date() })
      .where(eq(emailTemplates.id, id))
      .returning();
    return updatedTemplate;
  }

  // Email integration operations
  async getEmailIntegrations(userId: string, brandId: number | null): Promise<EmailIntegration[]> {
    return await db.select().from(emailIntegrations).where(
      and(
        eq(emailIntegrations.userId, userId),
        brandId ? eq(emailIntegrations.brandId, brandId) : isNull(emailIntegrations.brandId)
      )
    );
  }

  async createEmailIntegration(integration: InsertEmailIntegration): Promise<EmailIntegration> {
    const [newIntegration] = await db.insert(emailIntegrations).values(integration).returning();
    return newIntegration;
  }

  async updateEmailIntegration(id: number, integration: Partial<InsertEmailIntegration>): Promise<EmailIntegration> {
    const [updatedIntegration] = await db
      .update(emailIntegrations)
      .set({ ...integration, updatedAt: new Date() })
      .where(eq(emailIntegrations.id, id))
      .returning();
    return updatedIntegration;
  }

  // Subscription operations
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.isActive, true))
      .orderBy(subscriptionPlans.price);
  }

  async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    const [subscription] = await db
      .select()
      .from(userSubscriptions)
      .where(eq(userSubscriptions.userId, userId))
      .orderBy(desc(userSubscriptions.createdAt))
      .limit(1);
    return subscription || null;
  }

  async createUserSubscription(subscription: InsertUserSubscription): Promise<UserSubscription> {
    const [newSubscription] = await db
      .insert(userSubscriptions)
      .values(subscription)
      .returning();
    return newSubscription;
  }

  async updateUserSubscription(id: number, subscription: Partial<InsertUserSubscription>): Promise<UserSubscription> {
    const [updatedSubscription] = await db
      .update(userSubscriptions)
      .set({ ...subscription, updatedAt: new Date() })
      .where(eq(userSubscriptions.id, id))
      .returning();
    return updatedSubscription;
  }

  // Brand user operations
  async getBrandUsers(brandId: number): Promise<BrandUser[]> {
    return await db
      .select()
      .from(brandUsers)
      .where(and(eq(brandUsers.brandId, brandId), eq(brandUsers.isActive, true)))
      .orderBy(brandUsers.role, desc(brandUsers.createdAt));
  }

  async getUserBrands(userId: string): Promise<BrandUser[]> {
    return await db
      .select()
      .from(brandUsers)
      .where(and(eq(brandUsers.userId, userId), eq(brandUsers.isActive, true)))
      .orderBy(desc(brandUsers.createdAt));
  }

  async addUserToBrand(brandUser: InsertBrandUser): Promise<BrandUser> {
    const [newBrandUser] = await db
      .insert(brandUsers)
      .values(brandUser)
      .returning();
    return newBrandUser;
  }

  async updateBrandUserRole(id: number, role: string): Promise<BrandUser> {
    const [updatedBrandUser] = await db
      .update(brandUsers)
      .set({ role, updatedAt: new Date() })
      .where(eq(brandUsers.id, id))
      .returning();
    return updatedBrandUser;
  }

  async removeBrandUser(id: number): Promise<void> {
    await db
      .update(brandUsers)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(brandUsers.id, id));
  }

  async getBrandUserRole(userId: string, brandId: number): Promise<string | null> {
    const [brandUser] = await db
      .select({ role: brandUsers.role })
      .from(brandUsers)
      .where(and(
        eq(brandUsers.userId, userId), 
        eq(brandUsers.brandId, brandId), 
        eq(brandUsers.isActive, true)
      ));
    return brandUser?.role || null;
  }

  // Knowledge Base Collections operations
  async createKnowledgebaseCollection(collection: InsertKnowledgebaseCollection): Promise<KnowledgebaseCollection> {
    const [result] = await db
      .insert(knowledgebaseCollections)
      .values(collection)
      .returning();
    return result;
  }

  async getKnowledgebaseCollections(userId: string, brandId?: number | null): Promise<KnowledgebaseCollection[]> {
    return await db
      .select()
      .from(knowledgebaseCollections)
      .where(and(
        eq(knowledgebaseCollections.userId, userId),
        brandId ? eq(knowledgebaseCollections.brandId, brandId) : sql`${knowledgebaseCollections.brandId} IS NULL`
      ))
      .orderBy(desc(knowledgebaseCollections.createdAt));
  }

  async updateKnowledgebaseCollection(id: number, collection: Partial<InsertKnowledgebaseCollection>): Promise<KnowledgebaseCollection> {
    const [result] = await db
      .update(knowledgebaseCollections)
      .set({
        ...collection,
        updatedAt: new Date(),
      })
      .where(eq(knowledgebaseCollections.id, id))
      .returning();
    return result;
  }

  async deleteKnowledgebaseCollection(id: number): Promise<void> {
    await db
      .delete(knowledgebaseCollections)
      .where(eq(knowledgebaseCollections.id, id));
  }

  // Knowledge Base Usage Settings operations
  async getKnowledgebaseUsageSettings(userId: string, brandId?: number | null): Promise<KnowledgebaseUsageSettings | undefined> {
    const [settings] = await db
      .select()
      .from(knowledgebaseUsageSettings)
      .where(and(
        eq(knowledgebaseUsageSettings.userId, userId),
        brandId ? eq(knowledgebaseUsageSettings.brandId, brandId) : sql`${knowledgebaseUsageSettings.brandId} IS NULL`
      ));
    return settings;
  }

  async upsertKnowledgebaseUsageSettings(settings: InsertKnowledgebaseUsageSettings): Promise<KnowledgebaseUsageSettings> {
    const [result] = await db
      .insert(knowledgebaseUsageSettings)
      .values(settings)
      .onConflictDoUpdate({
        target: [knowledgebaseUsageSettings.userId, knowledgebaseUsageSettings.brandId],
        set: {
          ...settings,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  // Enhanced Knowledgebase operations with collections support
  async getActiveKnowledgebaseEntries(userId: string, brandId?: number | null): Promise<KnowledgebaseEntry[]> {
    // This method respects usage settings - for now just return active entries
    return this.getKnowledgebaseEntries(userId, brandId);
  }

  // Prompt template operations with global inheritance
  async createPromptTemplate(template: InsertPromptTemplate): Promise<PromptTemplate> {
    const [result] = await db
      .insert(promptTemplates)
      .values(template)
      .returning();
    return result;
  }

  async getPromptTemplates(userId: string, brandId?: number | null): Promise<PromptTemplate[]> {
    return await db
      .select()
      .from(promptTemplates)
      .where(and(
        eq(promptTemplates.userId, userId),
        brandId ? eq(promptTemplates.brandId, brandId) : sql`${promptTemplates.brandId} IS NULL`
      ))
      .orderBy(desc(promptTemplates.createdAt));
  }

  async getPromptTemplate(id: number): Promise<PromptTemplate | undefined> {
    const [template] = await db
      .select()
      .from(promptTemplates)
      .where(eq(promptTemplates.id, id));
    return template;
  }

  async updatePromptTemplate(id: number, template: Partial<InsertPromptTemplate>): Promise<PromptTemplate> {
    const [result] = await db
      .update(promptTemplates)
      .set({
        ...template,
        updatedAt: new Date(),
      })
      .where(eq(promptTemplates.id, id))
      .returning();
    return result;
  }

  async deletePromptTemplate(id: number): Promise<void> {
    await db
      .delete(promptTemplates)
      .where(eq(promptTemplates.id, id));
  }

  async getPredefinedTemplates(): Promise<PromptTemplate[]> {
    return await db
      .select()
      .from(promptTemplates)
      .where(eq(promptTemplates.type, 'global'))
      .orderBy(promptTemplates.name);
  }

  // Media asset operations with global inheritance
  async createMediaAsset(asset: InsertMediaAsset): Promise<MediaAsset> {
    const [result] = await db
      .insert(mediaAssets)
      .values(asset)
      .returning();
    return result;
  }

  async getMediaAssets(userId: string, brandId?: number | null, folder?: string): Promise<MediaAsset[]> {
    const conditions = [
      eq(mediaAssets.userId, userId),
      brandId ? eq(mediaAssets.brandId, brandId) : sql`${mediaAssets.brandId} IS NULL`
    ];

    if (folder) {
      conditions.push(eq(mediaAssets.folder, folder));
    }

    return await db
      .select()
      .from(mediaAssets)
      .where(and(...conditions))
      .orderBy(desc(mediaAssets.createdAt));
  }

  async getMediaAsset(id: number): Promise<MediaAsset | undefined> {
    const [asset] = await db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.id, id));
    return asset;
  }

  async updateMediaAsset(id: number, asset: Partial<InsertMediaAsset>): Promise<MediaAsset> {
    const [result] = await db
      .update(mediaAssets)
      .set({
        ...asset,
        updatedAt: new Date(),
      })
      .where(eq(mediaAssets.id, id))
      .returning();
    return result;
  }

  async deleteMediaAsset(id: number): Promise<void> {
    await db
      .delete(mediaAssets)
      .where(eq(mediaAssets.id, id));
  }

  async searchMediaAssets(userId: string, query?: string, brandId?: number | null): Promise<MediaAsset[]> {
    const conditions = [
      eq(mediaAssets.userId, userId),
      brandId ? eq(mediaAssets.brandId, brandId) : sql`${mediaAssets.brandId} IS NULL`
    ];

    if (query) {
      conditions.push(
        sql`(${mediaAssets.name} ILIKE ${`%${query}%`} OR ${mediaAssets.description} ILIKE ${`%${query}%`})`
      );
    }

    return await db
      .select()
      .from(mediaAssets)
      .where(and(...conditions))
      .orderBy(desc(mediaAssets.createdAt));
  }
}

export const storage = new DatabaseStorage();
