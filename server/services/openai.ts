import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key" 
});

export interface VideoAnalysis {
  keyTips: string[];
  drills: Array<{
    name: string;
    description: string;
    steps: string[];
    duration: string;
    difficulty: string;
  }>;
  techniques: Array<{
    name: string;
    description: string;
    keyPoints: string[];
  }>;
  equipmentNeeded: string[];
  targetAudience: string;
  skillLevel: string;
  category: string;
  summary: string;
  keyMoments: Array<{
    timestamp: string;
    description: string;
    importance: string;
  }>;
}

export interface GuideContent {
  title: string;
  introduction: string;
  sections: Array<{
    title: string;
    content: string;
    type: 'tip' | 'drill' | 'technique' | 'equipment';
    timestamp?: string; // Time in video when this section is discussed (e.g., "2:30")
    timestampSeconds?: number; // Timestamp in seconds for YouTube API
  }>;
  conclusion: string;
  callToAction: string;
}

export async function analyzeVideoContent(transcript: string, videoTitle: string, videoDescription?: string): Promise<VideoAnalysis> {
  try {
    const prompt = `
    Analyze this sports/fitness video transcript and extract valuable coaching insights.
    
    Video Title: ${videoTitle}
    Video Description: ${videoDescription || 'Not provided'}
    
    Transcript:
    ${transcript}
    
    Please analyze the content and provide a comprehensive breakdown in the following JSON format:
    {
      "keyTips": ["tip1", "tip2", ...],
      "drills": [
        {
          "name": "drill name",
          "description": "detailed description",
          "steps": ["step1", "step2", ...],
          "duration": "estimated time",
          "difficulty": "beginner/intermediate/advanced"
        }
      ],
      "techniques": [
        {
          "name": "technique name",
          "description": "detailed description",
          "keyPoints": ["point1", "point2", ...]
        }
      ],
      "equipmentNeeded": ["equipment1", "equipment2", ...],
      "targetAudience": "who this is for",
      "skillLevel": "beginner/intermediate/advanced",
      "category": "sport/fitness category",
      "summary": "brief summary of the video content",
      "keyMoments": [
        {
          "timestamp": "MM:SS format",
          "description": "what happens at this moment",
          "importance": "why this moment is important"
        }
      ]
    }
    
    Focus on extracting actionable, practical advice that can be turned into a valuable practice guide.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert sports and fitness coach analyzer. Extract valuable coaching insights from video transcripts and provide structured, actionable advice."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 4000,
    });

    const analysis = JSON.parse(response.choices[0].message.content || '{}');
    return analysis as VideoAnalysis;
  } catch (error) {
    console.error("Error analyzing video content:", error);
    throw new Error("Failed to analyze video content: " + (error as Error).message);
  }
}

export async function generatePracticeGuide(analysis: VideoAnalysis, videoTitle: string, channelTitle?: string, brandingSettings?: any): Promise<GuideContent> {
  try {
    const prompt = `
    Create a comprehensive practice guide based on this video analysis.
    
    Video Title: ${videoTitle}
    Channel Name: ${channelTitle || 'the channel'}
    Brand Name: ${brandingSettings?.companyName || 'Your Coach'}
    Brand Tagline: ${brandingSettings?.tagline || 'Elevate Your Game'}
    
    Video Analysis:
    ${JSON.stringify(analysis, null, 2)}
    
    Create a well-structured practice guide in the following JSON format:
    {
      "title": "practice guide title",
      "introduction": "engaging introduction paragraph that specifically mentions this is based on content from ${channelTitle || 'the original channel'} and references the video creators expertise",
      "sections": [
        {
          "title": "section title",
          "content": "detailed content with actionable steps",
          "type": "tip|drill|technique|equipment",
          "timestamp": "2:30",
          "timestampSeconds": 150
        }
      ],
      "conclusion": "motivating conclusion paragraph",
      "callToAction": "compelling call to action"
    }
    
    Guidelines:
    - Make it actionable and practical
    - Use clear, motivating language
    - Include specific steps and measurements where possible
    - Structure it as a comprehensive practice guide
    - Make it valuable enough to be worth exchanging an email for
    - Include ${brandingSettings?.companyName || 'your coach'} branding naturally
    - IMPORTANT: In the introduction, specifically mention that this guide is based on insights from ${channelTitle || 'the original content creator'} to give proper attribution
    - For each section, include a "timestamp" field (format: "2:30") and "timestampSeconds" field (format: 150) based on when that topic is discussed in the keyMoments data
    - Match sections to relevant keyMoments timestamps when possible - if a section covers drills mentioned at 3:45, use "3:45" and 225 seconds
    - If no specific timestamp matches, estimate a reasonable time based on the overall video structure
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert content creator who specializes in creating valuable practice guides for sports and fitness content creators. Create guides that are worth exchanging contact information for."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 4000,
    });

    const guide = JSON.parse(response.choices[0].message.content || '{}');
    return guide as GuideContent;
  } catch (error) {
    console.error("Error generating practice guide:", error);
    throw new Error("Failed to generate practice guide: " + (error as Error).message);
  }
}

export async function personalizeGuideContent(
  baseContent: GuideContent,
  leadData: { firstName?: string; customFieldData?: Record<string, any> }
): Promise<GuideContent> {
  try {
    const prompt = `
    Personalize this practice guide content based on the lead's information.
    
    Lead Information:
    - Name: ${leadData.firstName || 'there'}
    - Custom Field Data: ${JSON.stringify(leadData.customFieldData || {}, null, 2)}
    
    Base Guide Content:
    ${JSON.stringify(baseContent, null, 2)}
    
    Personalize the content by:
    1. Using the person's name naturally throughout
    2. Adjusting advice based on their skill level, goals, or limitations (if provided)
    3. Making it feel like custom coaching
    4. Keeping the same structure but making it more personal
    
    Return the personalized content in the same JSON format.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert at personalizing coaching content to make it feel custom-created for each individual."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 4000,
    });

    const personalizedGuide = JSON.parse(response.choices[0].message.content || '{}');
    return personalizedGuide as GuideContent;
  } catch (error) {
    console.error("Error personalizing guide content:", error);
    // Return original content if personalization fails
    return baseContent;
  }
}
