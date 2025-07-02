import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface GuideContent {
  title: string;
  introduction: string;
  sections: Array<{
    title: string;
    content: string;
    type: 'tip' | 'drill' | 'technique' | 'equipment';
    timestamp?: string;
    timestampSeconds?: number;
    drillBreakdown?: any;
  }>;
  conclusion: string;
  callToAction: string;
}

interface VideoData {
  title: string;
  description: string;
  channelTitle: string;
}

interface Analysis {
  category: string;
  summary: string;
  keyTips: string[];
}

interface LandingPageCopy {
  headline: string;
  subheadline: string;
  description: string;
  bulletPoints: string[];
  socialProof: string;
  urgencyText: string;
  buttonText: string;
  disclaimer: string;
}

export class LandingPageCopywriter {
  
  /**
   * Generate professional landing page copy based on guide content
   */
  async generateLandingPageCopy(
    guideContent: GuideContent,
    videoData: VideoData,
    analysis: Analysis
  ): Promise<LandingPageCopy> {
    
    // Extract key elements from guide content
    const drills = guideContent.sections.filter(s => s.type === 'drill');
    const techniques = guideContent.sections.filter(s => s.type === 'technique');
    const tips = guideContent.sections.filter(s => s.type === 'tip');
    
    const prompt = `You are a world-class copywriter specializing in fitness, sports, and skill-training lead magnets. Create compelling landing page copy that converts visitors into leads.

GUIDE DETAILS:
- Title: ${guideContent.title}
- Original Video: "${videoData.title}" by ${videoData.channelTitle}
- Category: ${analysis.category}
- Summary: ${analysis.summary}

PRACTICE CONTENT:
- ${drills.length} actionable drills/exercises
- ${techniques.length} specific techniques
- ${tips.length} expert tips
- Key takeaways: ${analysis.keyTips.join(', ')}

DRILL BREAKDOWN:
${drills.map(drill => `"${drill.title}": ${drill.content.substring(0, 200)}...`).join('\n')}

TECHNIQUE BREAKDOWN:
${techniques.map(tech => `"${tech.title}": ${tech.content.substring(0, 200)}...`).join('\n')}

Write conversion-focused copy that:
1. Creates urgency and desire
2. Highlights specific, tangible benefits
3. Addresses pain points and obstacles
4. Uses power words and emotional triggers
5. Emphasizes the FREE value proposition
6. Builds credibility through specificity

Output format JSON:
{
  "headline": "Benefit-driven headline (max 60 characters)",
  "subheadline": "Supporting headline that creates urgency (max 120 characters)", 
  "description": "2-3 sentence description focusing on transformation and results (max 300 characters)",
  "bulletPoints": ["5 specific benefit bullets starting with action verbs", "Each highlighting a different aspect", "Focus on outcomes, not features", "Use numbers when possible", "Create emotional connection"],
  "socialProof": "Credibility statement referencing the original expert/channel",
  "urgencyText": "Scarcity/urgency statement to drive action",
  "buttonText": "Action-oriented CTA button text (max 25 characters)",
  "disclaimer": "Brief legal disclaimer about results"
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are an expert copywriter who writes high-converting landing pages for fitness and sports training content. Focus on benefits, transformation, and creating urgency while maintaining authenticity."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 1000
      });

      const copyData = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        headline: copyData.headline || `Master ${analysis.category} Fast`,
        subheadline: copyData.subheadline || `Get the exact practice system used by pros`,
        description: copyData.description || `Transform your skills with this step-by-step practice guide based on expert techniques.`,
        bulletPoints: copyData.bulletPoints || [
          `Master ${drills.length}+ proven drills and techniques`,
          `Follow exact practice sequences used by experts`,
          `Get specific timing and execution details`,
          `Eliminate common mistakes holding you back`,
          `See results in your very first practice session`
        ],
        socialProof: copyData.socialProof || `Based on expert insights from ${videoData.channelTitle}`,
        urgencyText: copyData.urgencyText || `Download now - Limited time free access`,
        buttonText: copyData.buttonText || `Get Free Guide Now`,
        disclaimer: copyData.disclaimer || `Individual results may vary. Consistent practice required.`
      };

    } catch (error) {
      console.error('Error generating landing page copy:', error);
      
      // Fallback copy based on content analysis
      return this.generateFallbackCopy(guideContent, videoData, analysis);
    }
  }

  /**
   * Generate fallback copy when AI generation fails
   */
  private generateFallbackCopy(
    guideContent: GuideContent,
    videoData: VideoData,
    analysis: Analysis
  ): LandingPageCopy {
    
    const drillCount = guideContent.sections.filter(s => s.type === 'drill').length;
    const techniqueCount = guideContent.sections.filter(s => s.type === 'technique').length;
    
    return {
      headline: `Master ${analysis.category} with This Free Practice Guide`,
      subheadline: `Get the exact drills and techniques that deliver real results`,
      description: `Download our comprehensive practice guide with ${drillCount} proven drills, ${techniqueCount} expert techniques, and step-by-step instructions to transform your ${analysis.category.toLowerCase()} skills.`,
      bulletPoints: [
        `${drillCount} actionable drills with precise execution details`,
        `${techniqueCount} expert techniques for immediate improvement`,
        `Step-by-step practice sequences that pros actually use`,
        `Common mistakes to avoid (saves months of frustration)`,
        `Exact timing and rep counts for maximum effectiveness`
      ],
      socialProof: `Based on proven methods from ${videoData.channelTitle}`,
      urgencyText: `Free download - Get instant access before this offer expires`,
      buttonText: `Download Free Guide`,
      disclaimer: `Results depend on consistent practice and proper execution.`
    };
  }

  /**
   * Generate category-specific copy variations
   */
  getCategorySpecificElements(category: string): {
    painPoints: string[];
    outcomes: string[];
    urgencyTriggers: string[];
  } {
    const categoryMap: Record<string, any> = {
      'Golf': {
        painPoints: ['inconsistent shots', 'high scores', 'lost balls', 'frustrating rounds'],
        outcomes: ['lower scores', 'consistent contact', 'straighter shots', 'confident swings'],
        urgencyTriggers: ['golf season', 'next tournament', 'playing partners', 'handicap improvement']
      },
      'Fitness': {
        painPoints: ['plateau results', 'workout boredom', 'slow progress', 'muscle imbalances'],
        outcomes: ['visible gains', 'strength increases', 'better form', 'faster results'],
        urgencyTriggers: ['summer body', 'fitness goals', 'workout routine', 'gym confidence']
      },
      'Cooking': {
        painPoints: ['bland food', 'kitchen disasters', 'limited recipes', 'timing issues'],
        outcomes: ['restaurant-quality meals', 'cooking confidence', 'flavor mastery', 'kitchen skills'],
        urgencyTriggers: ['dinner parties', 'family meals', 'culinary skills', 'food confidence']
      },
      'Coding': {
        painPoints: ['debugging struggles', 'slow development', 'code complexity', 'career stagnation'],
        outcomes: ['cleaner code', 'faster development', 'better problem-solving', 'career advancement'],
        urgencyTriggers: ['job interviews', 'project deadlines', 'skill advancement', 'industry changes']
      }
    };

    return categoryMap[category] || categoryMap['Fitness'];
  }
}

export const landingPageCopywriter = new LandingPageCopywriter();