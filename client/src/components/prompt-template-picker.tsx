import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  ClipboardList, 
  GraduationCap, 
  Dumbbell, 
  Brain,
  Plus,
  Check
} from "lucide-react";

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  analysisPrompt: string;
  guidePrompt: string;
  personalizationPrompt: string;
}

const DEFAULT_TEMPLATES: PromptTemplate[] = [
  {
    id: "full_report",
    name: "Full Report",
    description: "Comprehensive analysis with detailed sections and deep dive insights",
    category: "full_report",
    analysisPrompt: `Analyze this video content and extract every major point, technique, drill, and insight. Focus on:
- Key techniques and methodologies
- Step-by-step procedures
- Common mistakes to avoid
- Advanced tips and insights
- Performance metrics and benchmarks
- Equipment or tools mentioned
Provide a comprehensive analysis that captures all valuable information.`,
    
    guidePrompt: `Create a comprehensive practice guide with these sections:
1. **Executive Summary** - Key takeaways and main objectives
2. **Detailed Analysis** - Break down each technique with explanations
3. **Practice Drills** - Specific exercises with reps, sets, and progressions
4. **Implementation Strategy** - How to incorporate into routine
5. **Troubleshooting** - Common issues and solutions
6. **Advanced Techniques** - Next-level progressions
7. **Performance Tracking** - Metrics to monitor progress
8. **Resources** - Additional tools and references

Make it actionable, detailed, and professional.`,
    
    personalizationPrompt: "Customize this guide based on the user's experience level, available time, and specific goals."
  },

  {
    id: "sop",
    name: "Standard Operating Procedure",
    description: "Clear step-by-step procedures and protocols",
    category: "sop",
    analysisPrompt: `Identify the key processes, procedures, and protocols in this video. Focus on:
- Sequential steps and order of operations
- Critical decision points
- Safety requirements and precautions
- Quality control measures
- Required tools and resources
- Time estimates for each step
Extract clear, repeatable procedures.`,
    
    guidePrompt: `Create a Standard Operating Procedure (SOP) with:
1. **Purpose & Scope** - What this SOP covers
2. **Prerequisites** - Required skills, tools, and preparation
3. **Step-by-Step Procedure** - Numbered, clear instructions
4. **Decision Trees** - What to do in different scenarios
5. **Safety & Compliance** - Important warnings and requirements
6. **Quality Checks** - How to verify successful completion
7. **Troubleshooting** - Common issues and solutions
8. **Documentation** - What to record and track

Format as a professional SOP with clear, actionable steps.`,
    
    personalizationPrompt: "Adapt the procedure complexity and detail level based on the user's role and experience."
  },

  {
    id: "step_by_step",
    name: "Step-by-Step Guide",
    description: "Simple, easy-to-follow instructions for beginners",
    category: "step_by_step",
    analysisPrompt: `Break down this video into simple, sequential steps. Focus on:
- Basic movements and techniques
- Beginner-friendly explanations
- Essential steps without overwhelming detail
- Clear progression from start to finish
- Simple language and concepts
Make it accessible for someone just starting out.`,
    
    guidePrompt: `Create a beginner-friendly step-by-step guide:
1. **Getting Started** - What you need to begin
2. **Basic Steps** - Simple, numbered instructions
3. **Visual Cues** - What to look for and feel
4. **Practice Tips** - How to improve with repetition
5. **Common Mistakes** - What beginners often do wrong
6. **Next Steps** - How to progress further

Use simple language, short sentences, and clear instructions. Perfect for beginners.`,
    
    personalizationPrompt: "Adjust the pace and detail level based on the user's learning style and confidence level."
  },

  {
    id: "workout",
    name: "Workout Plan",
    description: "Structured training program with sets, reps, and progressions",
    category: "workout",
    analysisPrompt: `Extract workout and training information from this video. Focus on:
- Specific exercises and movements
- Rep ranges, sets, and rest periods
- Progression schemes and variations
- Intensity levels and load recommendations
- Training frequency and scheduling
- Recovery and adaptation guidelines
Create a structured training program.`,
    
    guidePrompt: `Design a complete workout plan:
1. **Workout Overview** - Goals and target areas
2. **Warm-Up Routine** - Preparation exercises (5-10 minutes)
3. **Main Workout** - Core exercises with sets/reps/rest
4. **Cool-Down** - Recovery and flexibility (5-10 minutes)
5. **Progression Plan** - How to advance weekly
6. **Alternative Exercises** - Modifications and substitutions
7. **Training Schedule** - Frequency and timing
8. **Progress Tracking** - What to measure and record

Include specific numbers for sets, reps, rest periods, and progression.`,
    
    personalizationPrompt: "Modify intensity, volume, and exercises based on the user's fitness level and available equipment."
  },

  {
    id: "deeper_dive",
    name: "Deeper Dive",
    description: "Advanced analysis with theory, science, and expert insights",
    category: "deeper_dive",
    analysisPrompt: `Provide an advanced, technical analysis of this content. Focus on:
- Scientific principles and theory behind techniques
- Biomechanical analysis and movement patterns
- Advanced applications and variations
- Expert-level insights and nuances
- Research and evidence-based recommendations
- Complex interactions and systems thinking
Target this for experienced practitioners and experts.`,
    
    guidePrompt: `Create an advanced, comprehensive guide:
1. **Theoretical Foundation** - Science and principles behind the techniques
2. **Advanced Analysis** - Deep dive into mechanics and theory
3. **Expert Techniques** - High-level applications and variations
4. **System Integration** - How this fits into larger frameworks
5. **Research Insights** - Scientific backing and studies
6. **Advanced Troubleshooting** - Complex problem-solving
7. **Innovation Opportunities** - Ways to push boundaries
8. **Expert Resources** - Advanced learning materials

Target experienced practitioners with technical depth and expert insights.`,
    
    personalizationPrompt: "Customize the technical depth and focus areas based on the user's expertise and specific interests."
  }
];

const getTemplateIcon = (category: string) => {
  switch (category) {
    case "full_report": return FileText;
    case "sop": return ClipboardList;
    case "step_by_step": return GraduationCap;
    case "workout": return Dumbbell;
    case "deeper_dive": return Brain;
    default: return FileText;
  }
};

const getTemplateColor = (category: string) => {
  switch (category) {
    case "full_report": return "bg-blue-500";
    case "sop": return "bg-green-500";
    case "step_by_step": return "bg-purple-500";
    case "workout": return "bg-orange-500";
    case "deeper_dive": return "bg-red-500";
    default: return "bg-gray-500";
  }
};

interface PromptTemplatePickerProps {
  selectedTemplate?: string;
  onTemplateSelect: (template: PromptTemplate) => void;
  onCustomTemplate?: () => void;
  compact?: boolean;
}

export function PromptTemplatePicker({
  selectedTemplate,
  onTemplateSelect,
  onCustomTemplate,
  compact = false
}: PromptTemplatePickerProps) {
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {DEFAULT_TEMPLATES.map((template) => {
            const Icon = getTemplateIcon(template.category);
            const isSelected = selectedTemplate === template.id;
            
            return (
              <Button
                key={template.id}
                variant={isSelected ? "default" : "outline"}
                onClick={() => onTemplateSelect(template)}
                className={`h-auto p-3 ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
              >
                <div className="flex items-center space-x-2">
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{template.name}</span>
                  {isSelected && <Check className="w-4 h-4" />}
                </div>
              </Button>
            );
          })}
          {onCustomTemplate && (
            <Button
              variant="outline"
              onClick={onCustomTemplate}
              className="h-auto p-3 border-dashed"
            >
              <div className="flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">Custom</span>
              </div>
            </Button>
          )}
        </div>
        
        {selectedTemplate && (
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {DEFAULT_TEMPLATES.find(t => t.id === selectedTemplate)?.description}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {DEFAULT_TEMPLATES.map((template) => {
          const Icon = getTemplateIcon(template.category);
          const isSelected = selectedTemplate === template.id;
          const isExpanded = expandedTemplate === template.id;
          
          return (
            <Card 
              key={template.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                isSelected ? 'ring-2 ring-blue-500 shadow-lg' : ''
              }`}
              onClick={() => {
                onTemplateSelect(template);
                setExpandedTemplate(isExpanded ? null : template.id);
              }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className={`w-10 h-10 rounded-lg ${getTemplateColor(template.category)} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  {isSelected && (
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <CardDescription className="text-sm">
                  {template.description}
                </CardDescription>
              </CardHeader>
              
              {isExpanded && (
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div>
                      <Badge variant="secondary" className="mb-2">Analysis Focus</Badge>
                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3">
                        {template.analysisPrompt.substring(0, 150)}...
                      </p>
                    </div>
                    <div>
                      <Badge variant="secondary" className="mb-2">Guide Structure</Badge>
                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3">
                        {template.guidePrompt.substring(0, 150)}...
                      </p>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
        
        {onCustomTemplate && (
          <Card 
            className="cursor-pointer transition-all duration-200 hover:shadow-md border-dashed border-2"
            onClick={onCustomTemplate}
          >
            <CardHeader className="pb-3">
              <div className="w-10 h-10 rounded-lg bg-gray-300 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                <Plus className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </div>
              <CardTitle className="text-lg">Custom Template</CardTitle>
              <CardDescription className="text-sm">
                Create your own custom prompt template with personalized instructions
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  );
}