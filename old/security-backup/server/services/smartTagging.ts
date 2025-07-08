import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface SmartTagResult {
  category: string;
  tags: string[];
  skillLevel: "beginner" | "intermediate" | "advanced";
  bodyParts?: string[]; // For fitness content
  techniques?: string[]; // For sports/skills content
  equipment?: string[]; // Equipment needed
}

/**
 * Analyzes guide content and generates smart tags for Practice Library categorization
 */
export async function generateSmartTags(
  title: string,
  description: string,
  content: any,
  transcript?: string
): Promise<SmartTagResult> {
  try {
    // Combine all available text content
    const textContent = [
      title,
      description,
      transcript,
      // Extract text content from guide sections
      content?.sections?.map((section: any) => section.content).join(" ") || ""
    ].filter(Boolean).join(" ").slice(0, 4000); // Limit to 4000 chars

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are an expert content categorization system. Analyze the following practice guide content and generate smart tags for optimal discoverability in a Practice Library.

Focus on identifying:
1. Primary category (fitness, golf, basketball, cooking, coding, etc.)
2. Relevant tags for searchability (techniques, body parts, skills, etc.)
3. Skill level required (beginner, intermediate, advanced)
4. Body parts targeted (for fitness content)
5. Techniques taught (for skills/sports content)
6. Equipment needed

Respond with JSON in this exact format:
{
  "category": "primary category",
  "tags": ["tag1", "tag2", "tag3"],
  "skillLevel": "beginner|intermediate|advanced",
  "bodyParts": ["body part 1", "body part 2"],
  "techniques": ["technique 1", "technique 2"],
  "equipment": ["equipment 1", "equipment 2"]
}`
        },
        {
          role: "user",
          content: `Analyze this practice guide content:

Title: ${title}
Description: ${description}

Content: ${textContent}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      category: result.category || "general",
      tags: result.tags || [],
      skillLevel: result.skillLevel || "beginner",
      bodyParts: result.bodyParts || [],
      techniques: result.techniques || [],
      equipment: result.equipment || []
    };

  } catch (error) {
    console.error("Error generating smart tags:", error);
    
    // Fallback to basic categorization based on title/description
    const fallbackCategory = detectFallbackCategory(title, description);
    
    return {
      category: fallbackCategory,
      tags: extractBasicTags(title, description),
      skillLevel: "beginner",
      bodyParts: [],
      techniques: [],
      equipment: []
    };
  }
}

/**
 * Fallback category detection using keyword matching
 */
function detectFallbackCategory(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();
  
  if (text.includes("golf")) return "golf";
  if (text.includes("basketball") || text.includes("dribbl")) return "basketball";
  if (text.includes("fitness") || text.includes("workout") || text.includes("exercise")) return "fitness";
  if (text.includes("cook") || text.includes("recipe") || text.includes("chef")) return "cooking";
  if (text.includes("code") || text.includes("programming") || text.includes("javascript")) return "coding";
  if (text.includes("tennis")) return "tennis";
  if (text.includes("soccer") || text.includes("football")) return "soccer";
  if (text.includes("baseball")) return "baseball";
  if (text.includes("yoga")) return "yoga";
  if (text.includes("swimming")) return "swimming";
  
  return "general";
}

/**
 * Extract basic tags from title and description
 */
function extractBasicTags(title: string, description: string): string[] {
  const text = `${title} ${description}`.toLowerCase();
  const tags: string[] = [];
  
  // Common skill keywords
  const skillKeywords = [
    "beginner", "advanced", "basic", "fundamental", "technique", 
    "drill", "practice", "training", "improvement", "form", "posture"
  ];
  
  skillKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      tags.push(keyword);
    }
  });
  
  return tags.slice(0, 5); // Limit to 5 tags
}