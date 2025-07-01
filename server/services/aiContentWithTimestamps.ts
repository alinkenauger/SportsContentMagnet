import OpenAI from 'openai';

interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

interface TimestampedSection {
  title: string;
  content: string;
  timestamp: number;
  duration: number;
  type: 'tip' | 'drill' | 'technique' | 'equipment';
  drillBreakdown?: {
    painPoint: string;
    technique: string;
    repetitions: string;
    duration: string;
    keyFocus: string;
  };
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateTimestampedContent(
  transcript: string,
  segments: TranscriptSegment[],
  videoData: any,
  trainingSettings?: any
): Promise<{
  title: string;
  introduction: string;
  sections: TimestampedSection[];
  conclusion: string;
  callToAction: string;
}> {
  // Create a detailed prompt that includes both transcript and segment timing
  const segmentData = segments.map(seg => 
    `${formatTime(seg.start)} - ${formatTime(seg.end)}: ${seg.text.trim()}`
  ).join('\n');

  const prompt = `
You are an expert content creator analyzing a ${videoData.channelTitle || 'content creator'} video titled "${videoData.title}".

TRANSCRIPT WITH TIMESTAMPS:
${segmentData}

FULL TRANSCRIPT:
${transcript}

VIDEO METADATA:
- Duration: ${videoData.duration}
- Channel: ${videoData.channelTitle}
- Views: ${videoData.viewCount?.toLocaleString() || 'N/A'}

${trainingSettings ? `
TRAINING CONTEXT:
- Analysis Style: ${trainingSettings.analysisPrompt}
- Content Focus: ${trainingSettings.contentGenerationPrompt}
- Personalization: ${trainingSettings.personalizationPrompt}
` : ''}

Create a comprehensive practice guide with accurate timestamps that match the video timing. Each section should include:
1. The exact timestamp (in seconds) where that topic begins in the video
2. How long that segment lasts
3. Specific, actionable content from that time period

Structure your response as a JSON object with the following format:
{
  "title": "Concise, actionable guide title",
  "introduction": "Personal introduction mentioning the original video and channel",
  "sections": [
    {
      "title": "Section title based on video content",
      "content": "Detailed content from this specific time period with step-by-step instructions",
      "timestamp": 123, // exact start time in seconds
      "duration": 45, // how long this section lasts in seconds  
      "type": "drill", // one of: tip, drill, technique, equipment
      "drillBreakdown": { // only include if type is "drill"
        "painPoint": "What problem this drill solves",
        "technique": "The specific technique being taught",
        "repetitions": "How many reps or sets",
        "duration": "How long to practice",
        "keyFocus": "The most important point to remember"
      }
    }
  ],
  "conclusion": "Summary connecting all sections",
  "callToAction": "Next steps for continued improvement"
}

CRITICAL REQUIREMENTS:
- Timestamps must be accurate to the actual video content
- Only create sections for content that actually exists in the transcript
- Map each section to the specific time period where that information is discussed
- Ensure timestamps are in ascending order
- Include 4-6 main sections covering the key teaching points
- Make drill breakdowns specific to the actual techniques shown
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an expert content analyst who creates practice guides with precise timestamps. Always respond with valid JSON matching the exact structure requested."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 4000,
      temperature: 0.3
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    // Validate and ensure proper timestamp format
    if (result.sections) {
      result.sections = result.sections.map((section: any) => ({
        ...section,
        timestamp: Math.max(0, Math.floor(section.timestamp || 0)),
        duration: Math.max(1, Math.floor(section.duration || 30))
      }));
      
      // Sort sections by timestamp
      result.sections.sort((a: any, b: any) => a.timestamp - b.timestamp);
    }

    return result;
  } catch (error) {
    console.error('Error generating timestamped content:', error);
    throw new Error('Failed to generate timestamped content');
  }
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export { formatTime };