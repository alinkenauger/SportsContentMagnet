export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  templateType: 'brand_voice' | 'guide_structure';
  category: string;
  analysisPrompt: string;
  guidePrompt: string;
  personalizationPrompt: string;
  specialFeatures?: string; // JSON string for special features
  minimumGuides?: number; // For templates that require minimum guide count
}

// Brand Voice Templates - How the AI writes and communicates
export const BRAND_VOICE_TEMPLATES: PromptTemplate[] = [
  {
    id: "beginner_friendly",
    name: "Beginner-Friendly",
    description: "Encouraging, supportive, and accessible for newcomers",
    templateType: "brand_voice",
    category: "beginner_friendly",
    analysisPrompt: `Analyze this content with a beginner-friendly perspective. Focus on:
- Breaking down complex concepts into simple terms
- Identifying the most essential foundational elements
- Highlighting common beginner mistakes and how to avoid them
- Finding encouraging and motivational aspects
- Extracting clear, achievable first steps
- Looking for confidence-building opportunities
Make everything approachable and non-intimidating.`,
    
    guidePrompt: `Write in an encouraging, supportive tone that makes beginners feel confident. Use:
- Simple, clear language without jargon
- Positive reinforcement and encouragement
- "You can do this" messaging throughout
- Patient explanations that don't assume prior knowledge
- Reassurance that mistakes are normal and part of learning
- Celebration of small wins and progress
- Gentle guidance rather than strict commands
Keep everything accessible and confidence-building.`,
    
    personalizationPrompt: "Adjust encouragement level and explanation depth based on the user's confidence and starting point."
  },

  {
    id: "detailed_indepth", 
    name: "Detailed and In-Depth",
    description: "Comprehensive, thorough analysis with extensive detail",
    templateType: "brand_voice",
    category: "detailed_indepth",
    analysisPrompt: `Provide extremely thorough analysis covering every aspect. Focus on:
- Comprehensive breakdown of all techniques and concepts
- Multiple layers of detail and context
- Connections between different elements
- Background theory and reasoning
- Extensive examples and case studies
- Nuanced considerations and exceptions
- Deep exploration of implications and applications
Leave no stone unturned in the analysis.`,
    
    guidePrompt: `Write with meticulous attention to detail and comprehensive coverage:
- Provide extensive explanations for every concept
- Include multiple examples and scenarios
- Cover edge cases and exceptions
- Explain the "why" behind every recommendation
- Offer multiple approaches and alternatives
- Include relevant background and context
- Use detailed step-by-step breakdowns
- Provide thorough troubleshooting sections
Make it the most complete resource possible.`,
    
    personalizationPrompt: "Scale the depth and breadth based on user's desire for comprehensive vs. focused information."
  },

  {
    id: "entertaining",
    name: "Entertaining", 
    description: "Engaging, fun, and memorable with personality",
    templateType: "brand_voice",
    category: "entertaining",
    analysisPrompt: `Analyze the content looking for engaging and entertaining elements. Focus on:
- Interesting stories, anecdotes, and examples
- Surprising facts or counterintuitive insights
- Opportunities for humor (where appropriate)
- Memorable analogies and comparisons
- Engaging challenges and games
- Personality-driven insights
- Fun ways to practice or implement
Make learning enjoyable and memorable.`,
    
    guidePrompt: `Write with personality, energy, and engagement:
- Use conversational, friendly tone
- Include interesting stories and analogies
- Add personality and character to explanations
- Use engaging challenges and activities
- Include surprising facts and insights
- Make complex topics fun and relatable
- Use memorable phrases and catchwords
- Add elements of gamification where appropriate
Keep it professional but never boring.`,
    
    personalizationPrompt: "Adjust entertainment level and humor style based on user preferences and content appropriateness."
  },

  {
    id: "advanced_performance",
    name: "Advanced Performance",
    description: "Technical, data-driven approach for serious practitioners", 
    templateType: "brand_voice",
    category: "advanced_performance",
    analysisPrompt: `Analyze with a focus on high-performance optimization. Focus on:
- Technical precision and biomechanical efficiency
- Performance metrics and measurable outcomes
- Advanced techniques and refinements
- Competitive advantages and edge cases
- Data-driven insights and analytics
- Systematic optimization approaches
- Expert-level problem solving
Target serious practitioners seeking elite performance.`,
    
    guidePrompt: `Write with technical precision and performance focus:
- Use precise, technical language
- Include specific metrics and measurements
- Focus on optimization and efficiency
- Provide data-driven recommendations
- Include advanced troubleshooting
- Reference scientific principles
- Emphasize measurable outcomes
- Target elite performance standards
Keep it authoritative and evidence-based.`,
    
    personalizationPrompt: "Adjust technical depth and performance metrics based on user's competitive level and goals."
  },

  {
    id: "worlds_greatest_teacher",
    name: "World's Greatest Teacher",
    description: "Masterful instruction with wisdom, patience, and insight",
    templateType: "brand_voice", 
    category: "worlds_greatest_teacher",
    analysisPrompt: `Analyze with the wisdom of a master teacher. Focus on:
- Deep understanding of learning progressions
- Common student challenges and solutions
- Timeless principles and foundational concepts
- Patient, methodical instruction approaches
- Wisdom from years of teaching experience
- Ability to adapt to different learning styles
- Focus on long-term development and growth
Approach with masterful teaching insight.`,
    
    guidePrompt: `Write with the wisdom and patience of a master teacher:
- Use clear, methodical instruction
- Anticipate student questions and concerns
- Provide multiple learning pathways
- Include wisdom and teaching insights
- Focus on understanding, not just performance
- Use patient, encouraging guidance
- Build systematic progressions
- Include timeless principles and concepts
- Emphasize mastery over speed
Teach for deep understanding and long-term growth.`,
    
    personalizationPrompt: "Adapt teaching style and progression based on user's learning preferences and development stage."
  }
];

// Guide Structure Templates - Format and layout of the guide itself
export const GUIDE_STRUCTURE_TEMPLATES: PromptTemplate[] = [
  {
    id: "step_by_step",
    name: "Step-By-Step", 
    description: "Clear numbered instructions with one-click video timestamps",
    templateType: "guide_structure",
    category: "step_by_step",
    specialFeatures: JSON.stringify({
      timestampButtons: true,
      videoNavigation: true,
      linearProgression: true
    }),
    analysisPrompt: `Break down the content into logical, sequential steps with precise timing. Focus on:
- Clear, sequential actions in order
- Specific timestamps for each step
- Natural break points and transitions
- Prerequisites for each step
- Expected outcomes at each stage
- Critical timing and sequence requirements
Create a precise pathway from start to finish.`,
    
    guidePrompt: `Create a Step-by-Step Guide with Video Navigation:
1. **Overview** - What you'll accomplish and time required
2. **Prerequisites** - What you need before starting
3. **Step-by-Step Instructions** - Numbered sequence with timestamps
   - Each step includes a one-click timestamp button
   - Steps automatically advance video to exact moment
   - Clear actions and expected outcomes
4. **Checkpoint Reviews** - Validation points along the way
5. **Completion** - Final results and next actions

Format each step as:
**Step X: [Action Title]** [Timestamp Button: XX:XX]
Clear instruction with specific details...

Include timestamp buttons that automatically navigate to the exact video moment.`,
    
    personalizationPrompt: "Adjust step detail and pacing based on user's learning speed and experience level."
  },

  {
    id: "sop",
    name: "SOP",
    description: "Professional document for employee implementation", 
    templateType: "guide_structure",
    category: "sop",
    analysisPrompt: `Analyze content for standardizable procedures and systems. Focus on:
- Essential steps that must be followed consistently
- Critical checkpoints and quality controls
- Tools, equipment, and resources needed
- Safety considerations and precautions
- Measurable outcomes and success criteria
- Common errors and prevention methods
Extract procedures suitable for organizational implementation.`,
    
    guidePrompt: `Create a Professional Standard Operating Procedure:
1. **Document Control**
   - Purpose and scope
   - Revision date and version
   - Approval authority

2. **Procedure Overview**
   - Objective and expected outcomes
   - When and why to use this SOP
   - Required personnel and roles

3. **Prerequisites**
   - Required training and certifications
   - Tools, equipment, and materials
   - Safety requirements and PPE

4. **Step-by-Step Procedure**
   - Numbered, sequential instructions
   - Decision points and branching logic
   - Quality checkpoints and verification

5. **Documentation Requirements**
   - Records to maintain
   - Reporting procedures
   - Compliance tracking

6. **Troubleshooting Matrix**
   - Common issues and solutions
   - Escalation procedures
   - Emergency protocols

Format as a professional operational document suitable for employee training and implementation.`,
    
    personalizationPrompt: "Customize complexity and detail level based on organizational context and user responsibility level."
  },

  {
    id: "workout",
    name: "Workout",
    description: "Training plan with tracking sheets for sets, reps, and progress",
    templateType: "guide_structure", 
    category: "workout",
    specialFeatures: JSON.stringify({
      trackingSheets: true,
      progressMetrics: true,
      exerciseLogging: true,
      personalRecords: true
    }),
    analysisPrompt: `Extract all training elements for a comprehensive workout plan. Focus on:
- Specific drills, exercises, and movements
- Repetition counts, sets, and duration guidelines
- Progression patterns from beginner to advanced
- Recovery periods and rest intervals
- Equipment requirements and alternatives
- Performance indicators and tracking metrics
- Safety considerations and form cues
Build a complete training system with measurable progress.`,
    
    guidePrompt: `Create a Complete Workout & Training System:
1. **Training Overview**
   - Primary goals and target outcomes
   - Training philosophy and approach
   - Equipment requirements

2. **Workout Structure**
   - Warm-up protocols (duration and exercises)
   - Main training blocks with specific drills
   - Cool-down and recovery procedures

3. **Exercise Details**
   For each exercise include:
   - **Sets:** X sets
   - **Reps:** X repetitions (or time duration)
   - **Rest:** X seconds/minutes between sets
   - **Progression:** How to advance difficulty
   - **Form Cues:** Key technique points

4. **Training Schedule**
   - Weekly training frequency
   - Session duration and timing
   - Rest day recommendations

5. **Progress Tracking Sheets**
   Create tracking tables for:
   - Daily workout log (sets/reps completed)
   - Personal records and improvements
   - Performance metrics and benchmarks
   - Weekly progress summaries

6. **Progression System**
   - Beginner modifications
   - Intermediate challenges
   - Advanced variations
   - When and how to progress

Include downloadable tracking sheets for monitoring sets, reps, personal records, and improvements.`,
    
    personalizationPrompt: "Adapt intensity, volume, and tracking detail based on user's fitness level and available training time."
  },

  {
    id: "detailed_analysis", 
    name: "Detailed Analysis",
    description: "Comprehensive 7+ page guide with WHAT-WHERE-WHY-WHO-HOW structure",
    templateType: "guide_structure",
    category: "detailed_analysis",
    specialFeatures: JSON.stringify({
      minimumPages: 7,
      researchDepth: true,
      factualAnalysis: true,
      comprehensiveBreakdown: true
    }),
    analysisPrompt: `Conduct a comprehensive analysis requiring extensive research and detail. Focus on:
- WHAT: Complete identification of all concepts, techniques, and elements
- WHERE: Context, environment, and application settings
- WHY: Scientific reasoning, principles, and theoretical foundations  
- WHO: Target audience, practitioners, and authority figures
- HOW: Detailed mechanics, implementation, and execution
- Supporting research, studies, and factual information
- Deeper context and background information
Plan for a minimum 7-page comprehensive analysis.`,
    
    guidePrompt: `Create a Comprehensive Detailed Analysis Guide (Minimum 7 Pages):

**Section 1: WHAT - Complete Identification**
- Comprehensive overview of all concepts and techniques
- Detailed breakdown of each element
- Classification and categorization
- Key terminology and definitions

**Section 2: WHERE - Context and Application**
- Environmental factors and settings
- Optimal conditions for implementation
- Contextual considerations and variables
- Application scenarios and use cases

**Section 3: WHY - Scientific Foundation**
- Theoretical principles and scientific basis
- Research evidence and supporting studies
- Biomechanical or physiological reasoning
- Cause-and-effect relationships

**Section 4: WHO - Stakeholders and Practitioners**
- Target audience and skill levels
- Expert practitioners and authorities
- Community and cultural context
- Individual vs. group applications

**Section 5: HOW - Detailed Implementation**
- Step-by-step execution mechanics
- Technical specifications and parameters
- Troubleshooting and problem-solving
- Advanced applications and variations

**Section 6: Research and Evidence**
- Supporting studies and research
- Expert opinions and testimonials
- Historical development and evolution
- Current trends and future directions

**Section 7: Comprehensive Assessment**
- Detailed evaluation criteria
- Performance metrics and benchmarks
- Success factors and failure points
- Long-term implications and outcomes

Ensure minimum 7 pages of detailed, research-backed content with factual depth and comprehensive coverage.`,
    
    personalizationPrompt: "Scale research depth and technical detail based on user's academic background and analytical needs."
  },

  {
    id: "next_step",
    name: "Next Step",
    description: "Advanced implementation guide (requires 10+ guides created)",
    templateType: "guide_structure",
    category: "next_step", 
    minimumGuides: 10,
    specialFeatures: JSON.stringify({
      requiresExperience: true,
      advancedImplementation: true,
      continuationFocus: true
    }),
    analysisPrompt: `Analyze content specifically for advanced next-step implementation. Focus on:
- What happens AFTER the video content is mastered
- Advanced applications and progressions
- Integration with larger systems or workflows
- Long-term development pathways
- Advanced troubleshooting and optimization
- Connection to broader skill development
- Next-level challenges and goals
Target users who have mastered the basics and need advanced guidance.`,
    
    guidePrompt: `Create an Advanced Next Step Implementation Guide:

**Prerequisites Check**
- Confirm mastery of foundational concepts from video
- Validate completion of basic implementation
- Assess readiness for advanced progression

**Section 1: Beyond the Basics**
- What to focus on after mastering the video content
- Advanced variations and progressions
- Integration with existing skills and knowledge

**Section 2: Long-term Development Path**
- 30-day, 90-day, and 1-year progression plans
- Milestone markers and achievement goals
- Skill stacking and advanced combinations

**Section 3: Advanced Implementation Strategies**
- Professional-level applications
- Complex scenario management
- Advanced troubleshooting and optimization

**Section 4: Integration and Systems Thinking**
- How this fits into larger frameworks
- Connection with other advanced skills
- Building comprehensive expertise

**Section 5: Mastery and Teaching Others**
- Signs of true mastery
- How to teach and share this knowledge
- Contributing to the community

**Section 6: Continuous Improvement**
- Advanced performance metrics
- Ongoing development opportunities
- Staying current with innovations

This guide is designed for experienced practitioners ready to take their skills to the next level.`,
    
    personalizationPrompt: "Customize advanced progression based on user's specific mastery level and long-term development goals."
  }
];

export const DEFAULT_TEMPLATES: PromptTemplate[] = [
  ...BRAND_VOICE_TEMPLATES,
  ...GUIDE_STRUCTURE_TEMPLATES
];

export function getTemplate(id: string): PromptTemplate | undefined {
  return DEFAULT_TEMPLATES.find(template => template.id === id);
}

export function getAllTemplates(): PromptTemplate[] {
  return DEFAULT_TEMPLATES;
}

export function getTemplatesByCategory(category: string): PromptTemplate[] {
  return DEFAULT_TEMPLATES.filter(template => template.category === category);
}

export function getTemplatesByType(templateType: 'brand_voice' | 'guide_structure'): PromptTemplate[] {
  return DEFAULT_TEMPLATES.filter(template => template.templateType === templateType);
}

export function getBrandVoiceTemplates(): PromptTemplate[] {
  return BRAND_VOICE_TEMPLATES;
}

export function getGuideStructureTemplates(): PromptTemplate[] {
  return GUIDE_STRUCTURE_TEMPLATES;
}

export function checkTemplateAvailability(templateId: string, userGuideCount: number): { available: boolean, reason?: string } {
  const template = getTemplate(templateId);
  if (!template) {
    return { available: false, reason: "Template not found" };
  }

  if (template.minimumGuides && userGuideCount < template.minimumGuides) {
    return { 
      available: false, 
      reason: `This template requires at least ${template.minimumGuides} guides created. You currently have ${userGuideCount}.` 
    };
  }

  return { available: true };
}