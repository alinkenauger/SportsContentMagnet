export interface YouTubeVideoData {
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  duration: string;
  channelTitle: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
}

export function extractVideoId(url: string): string | null {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

export async function getYouTubeVideoData(url: string): Promise<YouTubeVideoData> {
  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error("Invalid YouTube URL");
  }

  const apiKey = process.env.YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY_ENV_VAR || "default_key";
  
  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoId}&key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      throw new Error("Video not found");
    }

    const video = data.items[0];
    const snippet = video.snippet;
    const statistics = video.statistics;
    const contentDetails = video.contentDetails;

    return {
      videoId,
      title: snippet.title,
      description: snippet.description,
      thumbnailUrl: snippet.thumbnails.maxres?.url || snippet.thumbnails.high?.url || snippet.thumbnails.default?.url,
      duration: contentDetails.duration,
      channelTitle: snippet.channelTitle,
      publishedAt: snippet.publishedAt,
      viewCount: parseInt(statistics.viewCount || '0'),
      likeCount: parseInt(statistics.likeCount || '0'),
    };
  } catch (error) {
    console.error("Error fetching YouTube data:", error);
    throw new Error("Failed to fetch video data: " + (error as Error).message);
  }
}

export async function transcribeVideo(videoId: string): Promise<string> {
  // For now, we'll return a mock transcript since implementing full video transcription
  // would require additional services like speech-to-text APIs
  // In a real implementation, this would:
  // 1. Download the video audio
  // 2. Use a speech-to-text service (like OpenAI Whisper, Google Speech-to-Text, etc.)
  // 3. Return the full transcript with timestamps
  
  const mockTranscripts: Record<string, string> = {
    default: `
Welcome to today's training session. In this video, we're going to cover five essential fundamentals that every player needs to master.

First, let's talk about proper stance and positioning. Your feet should be shoulder-width apart, knees slightly bent, and your weight evenly distributed. This gives you the stability and balance you need for quick movements.

The second fundamental is ball handling. Keep your eyes up, not on the ball. Use your fingertips, not your palms, and practice both hands equally. Start slow and gradually increase your speed as you build confidence.

Third, we have footwork drills. Quick feet equal quick plays. Practice ladder drills, cone drills, and agility exercises daily. Your footwork is the foundation of all your movements on the field.

Fourth is communication. Sports are team activities. Call out plays, communicate with your teammates, and always be aware of what's happening around you. Good communication can make the difference between a good play and a great play.

Finally, let's cover conditioning and endurance. You can have all the skills in the world, but if you're tired in the fourth quarter, those skills won't help you. Build your cardiovascular endurance through running, interval training, and sport-specific drills.

Remember, mastering these fundamentals takes time and practice. Don't get discouraged if you don't see immediate results. Stay consistent, stay focused, and keep working hard. The results will come.

Practice these drills for 15-20 minutes each day, and you'll see improvement in your game within just a few weeks. Thanks for watching, and I'll see you in the next video!
    `
  };

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  return mockTranscripts[videoId] || mockTranscripts.default;
}

export function parseDuration(duration: string): number {
  // Parse YouTube duration format (PT4M13S) to seconds
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const matches = duration.match(regex);
  
  if (!matches) return 0;

  const hours = parseInt(matches[1] || '0');
  const minutes = parseInt(matches[2] || '0');
  const seconds = parseInt(matches[3] || '0');

  return hours * 3600 + minutes * 60 + seconds;
}
