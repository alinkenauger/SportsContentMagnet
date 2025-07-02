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
  googleConnections,
  type GoogleConnection,
  type InsertGoogleConnection,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, count, avg } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

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
  getLeadsByGuide(guideId: number): Promise<Lead[]>;

  // QR code operations
  createQrCode(qrCode: InsertQrCode): Promise<QrCode>;
  getQrCodesByUser(userId: string): Promise<QrCode[]>;
  incrementQrCodeScan(id: number): Promise<void>;

  // Analytics operations
  createAnalyticsEvent(event: InsertAnalyticsEvent): Promise<AnalyticsEvent>;
  getAnalyticsByUser(userId: string): Promise<{
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

  // Knowledgebase operations
  createKnowledgebaseEntry(entry: InsertKnowledgebaseEntry): Promise<KnowledgebaseEntry>;
  getKnowledgebaseEntries(userId: string): Promise<KnowledgebaseEntry[]>;
  updateKnowledgebaseEntry(id: number, entry: Partial<InsertKnowledgebaseEntry>): Promise<KnowledgebaseEntry>;
  deleteKnowledgebaseEntry(id: number): Promise<void>;
  searchKnowledgebaseEntries(userId: string, query?: string): Promise<KnowledgebaseEntry[]>;

  // Google connection operations
  getUserGoogleConnection(userId: string): Promise<GoogleConnection | undefined>;
  updateUserGoogleConnection(userId: string, connection: InsertGoogleConnection | null): Promise<GoogleConnection | null>;
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

  async setCurrentBrand(userId: string, brandId: number): Promise<void> {
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
    let queryBuilder = db
      .select()
      .from(guides)
      .where(eq(guides.userId, userId));

    if (query) {
      queryBuilder = queryBuilder.where(
        sql`${guides.title} ILIKE ${'%' + query + '%'} OR ${guides.description} ILIKE ${'%' + query + '%'}`
      );
    }

    if (category) {
      queryBuilder = queryBuilder.where(eq(guides.category, category));
    }

    return await queryBuilder.orderBy(desc(guides.createdAt));
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
      .orderBy(desc(guides.createdAt));

    return guidesWithBranding.map(guide => ({
      id: guide.id,
      title: guide.title,
      description: guide.description,
      thumbnailUrl: guide.thumbnailUrl,
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

  async getAnalyticsByUser(userId: string): Promise<{
    totalGuides: number;
    totalLeads: number;
    totalViews: number;
    totalDownloads: number;
    avgConversionRate: number;
  }> {
    const [stats] = await db
      .select({
        totalGuides: count(guides.id),
        totalLeads: sql<number>`COALESCE(SUM(${guides.downloads}), 0)`,
        totalViews: sql<number>`COALESCE(SUM(${guides.views}), 0)`,
        totalDownloads: sql<number>`COALESCE(SUM(${guides.downloads}), 0)`,
        avgConversionRate: sql<number>`COALESCE(AVG(${guides.conversionRate}), 0)`,
      })
      .from(guides)
      .where(eq(guides.userId, userId));

    const [leadsCount] = await db
      .select({ totalLeads: count(leads.id) })
      .from(leads)
      .where(eq(leads.userId, userId));

    return {
      totalGuides: stats.totalGuides,
      totalLeads: leadsCount.totalLeads,
      totalViews: stats.totalViews,
      totalDownloads: stats.totalDownloads,
      avgConversionRate: Number(stats.avgConversionRate),
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

    const conversionRate = guide.views > 0 ? (conversions.count / guide.views) * 100 : 0;

    return {
      views: guide.views,
      downloads: guide.downloads,
      conversions: conversions.count,
      conversionRate: Number(conversionRate.toFixed(2)),
    };
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

  async getKnowledgebaseEntries(userId: string): Promise<KnowledgebaseEntry[]> {
    return await db
      .select()
      .from(knowledgebaseEntries)
      .where(and(
        eq(knowledgebaseEntries.userId, userId),
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

  async searchKnowledgebaseEntries(userId: string, query?: string): Promise<KnowledgebaseEntry[]> {
    let queryBuilder = db
      .select()
      .from(knowledgebaseEntries)
      .where(and(
        eq(knowledgebaseEntries.userId, userId),
        eq(knowledgebaseEntries.isActive, true)
      ));

    if (query) {
      queryBuilder = queryBuilder.where(
        and(
          eq(knowledgebaseEntries.userId, userId),
          eq(knowledgebaseEntries.isActive, true),
          sql`(${knowledgebaseEntries.title} ILIKE ${`%${query}%`} OR ${knowledgebaseEntries.content} ILIKE ${`%${query}%`})`
        )
      );
    }

    return await queryBuilder.orderBy(desc(knowledgebaseEntries.createdAt));
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
}

export const storage = new DatabaseStorage();
