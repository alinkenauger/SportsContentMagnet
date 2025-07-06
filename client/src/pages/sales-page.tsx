import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Check, Star, Users, Zap, Crown, Play, ArrowRight, CheckCircle, Target, TrendingUp, Shield, Clock, Mail, Phone, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const signUpSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
  company: z.string().optional(),
  niche: z.string().optional(),
});

type SignUpData = z.infer<typeof signUpSchema>;

const features = [
  {
    icon: Target,
    title: "AI-Powered Content Analysis",
    description: "Transform your videos into structured, actionable guides using advanced AI technology"
  },
  {
    icon: Users,
    title: "Lead Generation Machine",
    description: "Convert viewers into qualified leads with professional landing pages and forms"
  },
  {
    icon: TrendingUp,
    title: "Real-Time Analytics",
    description: "Track conversion rates, lead quality, and guide performance with detailed insights"
  },
  {
    icon: Shield,
    title: "Professional Branding",
    description: "Customize your guides with your brand colors, logos, and messaging"
  },
  {
    icon: Clock,
    title: "Automated Delivery",
    description: "Instant guide delivery and follow-up sequences to nurture your leads"
  },
  {
    icon: CheckCircle,
    title: "Multi-Niche Support",
    description: "Perfect for fitness, sports, cooking, coding, and any skill-based content"
  }
];

const testimonials = [
  {
    name: "Sarah Johnson",
    role: "Fitness Coach",
    content: "ConvertMag.net helped me turn my workout videos into a consistent lead generation system. I now capture 50+ leads per week!",
    rating: 5
  },
  {
    name: "Mike Chen",
    role: "Coding Instructor",
    content: "The AI analysis is incredibly accurate. It extracts the key teaching points from my tutorials and creates perfect practice guides.",
    rating: 5
  },
  {
    name: "Emma Rodriguez",
    role: "Cooking Channel Owner",
    content: "My recipe guides now look professional and convert amazingly well. The branding features are a game-changer.",
    rating: 5
  }
];

const pricingPlans = [
  {
    name: "Free",
    price: "$0",
    description: "Perfect for getting started",
    features: [
      "Up to 50 leads per month",
      "500 landing page visits",
      "Basic guide templates",
      "Email support",
      "ConvertMag.net branding"
    ],
    popular: false,
    cta: "Start Free Now"
  },
  {
    name: "Personal",
    price: "$24.95",
    description: "Best for individual creators",
    features: [
      "Unlimited leads & visits",
      "Custom branding",
      "Advanced templates",
      "Priority support",
      "Analytics dashboard",
      "Custom landing pages"
    ],
    popular: true,
    cta: "Upgrade to Personal"
  },
  {
    name: "Business",
    price: "$33",
    description: "Perfect for teams & agencies",
    features: [
      "Everything in Personal",
      "Team collaboration",
      "White-label solutions",
      "Multi-brand management",
      "Advanced analytics",
      "Priority phone support"
    ],
    popular: false,
    cta: "Go Business"
  }
];

export default function SalesPage() {
  const { toast } = useToast();
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);
  const [showVideoDemo, setShowVideoDemo] = useState(false);

  useEffect(() => {
    document.title = "ConvertMag.net - Transform Any Content into Lead Magnets";
  }, []);

  const form = useForm<SignUpData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      company: "",
      niche: "",
    },
  });

  const signUpMutation = useMutation({
    mutationFn: async (data: SignUpData) => {
      return apiRequest("POST", "/api/auth/signup", data);
    },
    onSuccess: () => {
      toast({
        title: "Welcome to ConvertMag.net!",
        description: "Check your email for login instructions and getting started guide.",
      });
      setIsSignUpOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Sign Up Failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSignUp = (data: SignUpData) => {
    signUpMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-16 pb-24">
        <div className="text-center max-w-4xl mx-auto">
          <div className="bg-red-600 text-white px-6 py-3 rounded-full mb-6 inline-block animate-pulse">
            ⚠️ YOUR LEAD MAGNETS ARE DYING (AND YOUR COMPETITORS KNOW IT)
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black mb-4 leading-tight">
            <span className="text-gray-900">ConvertMag.net Can </span>
            <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">10x Lead Flow</span>
            <span className="block text-gray-900 mt-2">From The Same Traffic...</span>
          </h1>
          
          <p className="text-2xl md:text-3xl font-bold text-gray-700 mb-6">
            ... and instantly create your high converting funnels for you.
          </p>
          
          <div className="bg-yellow-100 border-l-4 border-yellow-500 p-6 rounded-r-lg max-w-4xl mx-auto mb-8 text-left">
            <p className="text-xl font-bold text-gray-900 mb-4">
              🔥 <strong>PROVEN RESULTS:</strong> One content creator's 2024 test revealed...
            </p>
            <div className="bg-white p-4 rounded-lg border-2 border-green-500">
              <p className="text-2xl font-black text-center text-green-800">
                5 Video-Specific Lead Magnets = Same Results as 25+ Category-Based Lead Magnets
              </p>
              <p className="text-center text-gray-600 mt-2 font-semibold">
                That's a 10X improvement in lead generation efficiency
              </p>
            </div>
          </div>
          
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-gray-800 max-w-4xl mx-auto">
            <span className="text-red-600">STOP Wasting Time</span> with Generic "Top 10 Tips" PDFs That Don't Convert...
            <br />
            <span className="text-green-600">START Creating</span> Video-Specific Lead Magnets That Convert Up To 10x More Leads!
          </h2>
          
          <div className="space-y-6 mb-12">
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Dialog open={isSignUpOpen} onOpenChange={setIsSignUpOpen}>
                <DialogTrigger asChild>
                  <Button 
                    size="lg" 
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-12 py-6 text-xl font-bold shadow-2xl transform hover:scale-105 transition-all duration-300"
                  >
                    🚀 GET 10X RESULTS NOW (FREE)
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Start Your Free Account</DialogTitle>
                  <DialogDescription>
                    Get started with ConvertMag.net in less than 60 seconds
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSignUp)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="john@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone (Optional)</FormLabel>
                          <FormControl>
                            <Input type="tel" placeholder="+1 (555) 123-4567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company/Brand (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Your Company" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="niche"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Content Niche (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Fitness, Cooking, Coding, etc." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600"
                      disabled={signUpMutation.isPending}
                    >
                      {signUpMutation.isPending ? "Creating Account..." : "Create Free Account"}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
              
              <Button 
                variant="outline" 
                size="lg"
                className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 px-8 py-6 text-lg font-semibold"
                onClick={() => setShowVideoDemo(true)}
              >
                <Play className="mr-2 h-5 w-5" />
                📺 See 10X Results Proof
              </Button>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-500">
                <h3 className="font-bold text-lg mb-2 text-green-800">✅ Creates Fresh Value</h3>
                <p className="text-gray-600">100% original guides, not gated existing content</p>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
                <h3 className="font-bold text-lg mb-2 text-blue-800">⚡ Smart Timestamping</h3>
                <p className="text-gray-600">Click to jump to exact moments in source content</p>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-purple-500">
                <h3 className="font-bold text-lg mb-2 text-purple-800">🎯 ANY Content Type</h3>
                <p className="text-gray-600">Videos, audio, blogs, PDFs, streams - not just YouTube</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-center text-sm text-gray-500 mb-8">
            <Check className="h-4 w-4 text-green-500 mr-2" />
            No credit card required • Free forever plan available
          </div>
          
          {/* Social Proof Stats */}
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-5xl mx-auto">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Join Content Creators Getting REAL Results</h3>
            </div>
            
            <div className="grid md:grid-cols-4 gap-8 text-center">
              <div className="border-r border-gray-200 last:border-r-0">
                <div className="text-4xl font-black text-green-600 mb-2">10X</div>
                <div className="text-sm font-semibold text-gray-600">MORE LEADS</div>
                <div className="text-xs text-gray-500">From Same Traffic</div>
              </div>
              <div className="border-r border-gray-200 last:border-r-0">
                <div className="text-4xl font-black text-blue-600 mb-2">2-20%</div>
                <div className="text-sm font-semibold text-gray-600">CONVERSION RATE</div>
                <div className="text-xs text-gray-500">vs 2% Industry Average</div>
              </div>
              <div className="border-r border-gray-200 last:border-r-0">
                <div className="text-4xl font-black text-purple-600 mb-2">$0</div>
                <div className="text-sm font-semibold text-gray-600">STARTUP COST</div>
                <div className="text-xs text-gray-500">vs $1000+ Manual</div>
              </div>
              <div>
                <div className="text-4xl font-black text-orange-600 mb-2">5</div>
                <div className="text-sm font-semibold text-gray-600">MINUTES</div>
                <div className="text-xs text-gray-500">Per Lead Magnet</div>
              </div>
            </div>
            
            <div className="mt-8 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6">
              <div className="text-center">
                <p className="text-lg font-semibold text-green-800 mb-2">
                  "I found the 'New Way' but needed a solution to do the heavy lifting..."
                </p>
                <p className="text-gray-700 mb-4">
                  "After discovering video-specific lead magnets generated 10X more leads, I personally coded ConvertMag.net to solve the $1000+ cost barrier that prevented scaling this strategy."
                </p>
                <div className="flex items-center justify-center">
                  <div className="text-sm font-bold text-gray-800">— Founder of GetMoreViews.com</div>
                  <Badge className="ml-3 bg-green-100 text-green-800">VERIFIED CREATOR</Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Urgency/Scarcity Section */}
      <section className="bg-gradient-to-r from-red-600 to-pink-600 py-16 text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="bg-white text-red-600 rounded-full px-6 py-3 inline-block mb-6 font-bold text-lg animate-pulse">
              🚨 LIMITED TIME: EARLY ACCESS PRICING
            </div>
            
            <h2 className="text-4xl md:text-5xl font-black mb-6">
              Your Competitors Are Already Using This
            </h2>
            
            <p className="text-xl mb-8 opacity-90">
              While you're stuck with 2% converting lead magnets, smart creators are secretly getting 20% conversion rates using video-specific strategies. Don't get left behind.
            </p>
            
            <div className="bg-black bg-opacity-20 rounded-2xl p-8 backdrop-blur-sm">
              <h3 className="text-2xl font-bold mb-6">What's Happening Right Now</h3>
              <div className="grid md:grid-cols-2 gap-8 text-left">
                <div>
                  <h4 className="font-bold text-lg mb-3 text-yellow-300">❌ Content Creators Struggling:</h4>
                  <ul className="space-y-2 opacity-90">
                    <li>• Spending $1000+ per video-specific lead magnet</li>
                    <li>• Waiting weeks for manual creation</li>
                    <li>• Missing out on 10X lead generation potential</li>
                    <li>• Watching competitors pull ahead</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-lg mb-3 text-green-300">✅ ConvertMag.net Users:</h4>
                  <ul className="space-y-2 opacity-90">
                    <li>• Creating video-specific magnets in 5 minutes</li>
                    <li>• Getting 10X more leads from same traffic</li>
                    <li>• Building massive email lists automatically</li>
                    <li>• Scaling without the $1000+ cost barrier</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Problem Statement Section */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-black mb-6 text-gray-900">
                The <span className="text-red-600">$1000+ Problem</span> That's Killing Your Lead Generation
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Video-specific lead magnets generate 10X more leads, but the manual process costs $1000+ per video and takes weeks to implement. Until now.
              </p>
            </div>
            
            <div className="grid lg:grid-cols-3 gap-8 mb-12">
              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl p-8 border-2 border-red-200">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-white font-bold text-2xl">$</span>
                  </div>
                  <h3 className="text-2xl font-bold text-red-800">The Cost Barrier</h3>
                </div>
                <div className="space-y-4">
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="font-bold text-gray-800 text-center">Content Creation</div>
                    <div className="text-red-600 font-semibold text-center">$300-500 per guide</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="font-bold text-gray-800 text-center">Landing Page Design</div>
                    <div className="text-red-600 font-semibold text-center">$200-400 per page</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="font-bold text-gray-800">Funnel Integration</div>
                    <div className="text-red-600 font-semibold">$500-800 per setup</div>
                  </div>
                  <div className="bg-red-600 text-white rounded-lg p-4 text-center">
                    <div className="font-bold text-xl">Total: $1000-1700</div>
                    <div className="text-sm opacity-90">PER VIDEO</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-8 border-2 border-orange-200">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="text-white h-8 w-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-orange-800">The Time Problem</h3>
                </div>
                <div className="space-y-4 text-center">
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="font-bold text-gray-800">Manual Creation</div>
                    <div className="text-orange-600 font-semibold">2-4 hours per video</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="font-bold text-gray-800">Guide Writing</div>
                    <div className="text-orange-600 font-semibold">6-8 hours per guide</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="font-bold text-gray-800">Landing Page Creation</div>
                    <div className="text-orange-600 font-semibold">4-6 hours per page</div>
                  </div>
                  <div className="bg-orange-600 text-white rounded-lg p-4">
                    <div className="font-bold text-xl">Total: 2-3 weeks</div>
                    <div className="text-sm opacity-90">PER VIDEO</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-8 border-2 border-green-200">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Zap className="text-white h-8 w-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-green-800">ConvertMag.net</h3>
                </div>
                <div className="space-y-4 text-center">
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="font-bold text-gray-800">AI Content Analysis</div>
                    <div className="text-green-600 font-semibold">30 seconds</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="font-bold text-gray-800">Guide Generation</div>
                    <div className="text-green-600 font-semibold">2 minutes</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="font-bold text-gray-800">Landing Page Creation</div>
                    <div className="text-green-600 font-semibold">2 minutes</div>
                  </div>
                  <div className="bg-green-600 text-white rounded-lg p-4">
                    <div className="font-bold text-xl">Total: 5 minutes</div>
                    <div className="text-sm opacity-90">Cost: $0</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white text-center">
              <h3 className="text-3xl font-bold mb-4">The Game-Changing Discovery</h3>
              <p className="text-xl mb-6 opacity-90">
                One content creator's 2024 test proved video-specific lead magnets generate 10X more leads than category-based approaches. But the $1000+ cost per video made it impossible to scale.
              </p>
              <div className="bg-white bg-opacity-20 rounded-lg p-6 backdrop-blur-sm">
                <p className="text-2xl font-bold">
                  "I found the 'New Way' but needed a solution to do the heavy lifting. Unfortunately, it didn't exist. So I spent the last year personally coding it myself."
                </p>
                <p className="text-lg mt-4 opacity-90">— Founder of GetMoreViews.net (Generated millions of leads)</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* AI Solution Section */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Our AI Is Custom Designed for You</h2>
              <p className="text-xl text-gray-600">
                It doesn't just rewrite or scramble content like other tools. It becomes an extension of you.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center">
                    <Target className="h-6 w-6 mr-3 text-blue-600" />
                    Beautiful, Detailed Content
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    With templated brand guides (or make your own) - you can instantly create "Convert Magnets" that offer step-by-step instruction, deeper detailed analysis that goes far beyond the video or post they've consumed.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center">
                    <TrendingUp className="h-6 w-6 mr-3 text-green-600" />
                    Complete SOPs & Next Steps
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Create complete SOPs to hand team members, and even "Next step" guides of what to do, work on, or implement AFTER the result of the content they just consumed is completed.
                  </p>
                </CardContent>
              </Card>
            </div>
            
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8 mb-8">
              <h3 className="text-2xl font-bold mb-4 text-center">Gets Smarter as You Use It</h3>
              <p className="text-lg text-gray-700 text-center mb-6">
                As you create convert guides, the video scripts and guides are added to your knowledge base, allowing the AI to continue to get to know you, your brand, the solutions to problems, and more, getting better as you use it.
              </p>
              <p className="text-lg text-gray-700 text-center">
                You also can provide your own videos, books, guides, social posts, call recordings, or audio messages/streams to train our AI to think just like you.
              </p>
            </div>
            
            <Card className="border-2 border-green-500 shadow-xl">
              <CardHeader>
                <CardTitle className="text-xl flex items-center justify-center">
                  <Zap className="h-6 w-6 mr-3 text-green-600" />
                  Special for Fitness & Sports Training
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-center text-lg">
                  Offer Workouts or Sports Training? Our tool will even provide recommended workouts with sets and reps, even if your content doesn't based on your past content and training.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      {/* Customization & Editing Section */}
      <section className="bg-gradient-to-r from-purple-50 to-blue-50 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Complete Customization Control</h2>
              <p className="text-xl text-gray-600">
                Not only can you adapt the structure of your guide with our AI training styles, but you can also create 100% customized structures through our AI Prompting system.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center">
                    <Zap className="h-6 w-6 mr-3 text-purple-600" />
                    AI Prompting System
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Create 100% customized guide structures through our advanced AI prompting system. Tell our AI exactly what you want and watch it create the perfect format for your content.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center">
                    <Target className="h-6 w-6 mr-3 text-blue-600" />
                    Drag & Drop Editor
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Once a guide and landing page is made, if you need to tweak it, each has a complete drag and drop editor, branding adjustments, and more so you can tweak, add to, or remove what you wish.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
      {/* Library Feature Section */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">The Library Feature</h2>
              <p className="text-xl text-gray-600 mb-6">
                Turn on the "Library" feature when you create a new guide, and create the lead magnet that keeps on giving.
              </p>
              <p className="text-lg text-gray-700">
                The Library is an accessible, searchable library of all past and future guides you'd like added. As leads opt in, they also get access to the Library feature, which includes an email notification when new guides are added, making ConvertMag.net an ongoing nurturing and value system.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              <Card className="border-2 border-green-500 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Users className="h-5 w-5 mr-2 text-green-600" />
                    Forever Cookbook
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm">
                    For cooking channels that automatically turn your YouTube videos into follow along ingredient lists and/or recipe guides.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="border-2 border-blue-500 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
                    Fitness Database
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm">
                    A database of fitness workouts or exercises with sets, reps, and more, updated weekly, each with a CTA for private coaching access.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="border-2 border-purple-500 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Shield className="h-5 w-5 mr-2 text-purple-600" />
                    SOP Database
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm">
                    An implementable "SOP" database for the business space, that allows for instant implementation across your viewers' businesses that is step by step, simple.
                  </p>
                </CardContent>
              </Card>
            </div>
            
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-8 text-center">
              <h3 className="text-2xl font-bold mb-4">You Have Full Control</h3>
              <p className="text-lg text-gray-700">
                You have complete control over the library, what shows, and how it's organized. Create an ongoing value system that keeps leads engaged and coming back for more.
              </p>
            </div>
          </div>
        </div>
      </section>
      {/* Special Offers & Content Types Section */}
      <section className="bg-gradient-to-r from-orange-50 to-red-50 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center">
                    <Crown className="h-6 w-6 mr-3 text-orange-600" />
                    Special One Time Offers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Quickly add or switch out Special One Time Offers within your guide in a few clicks! Maximize your revenue with targeted upsells and special promotions.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center">
                    <Video className="h-6 w-6 mr-3 text-red-600" />
                    ALL Content Types
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Works on ALL CONTENT TYPES, not just video. Transform any audio, stream, post, blog, book, or document into high-converting lead magnets.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
      {/* CRM & Email Marketing Integration Section */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Seamless Integrations</h2>
              <p className="text-xl text-gray-600">
                We fully integrate with top CRMs and Email marketing Tools and Zapier
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center">
                    <Mail className="h-6 w-6 mr-3 text-blue-600" />
                    Email Marketing
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">
                    Connect with your favorite email marketing platforms for seamless lead nurturing and automated follow-up sequences.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">Mailchimp</Badge>
                    <Badge variant="outline">ConvertKit</Badge>
                    <Badge variant="outline">ActiveCampaign</Badge>
                    <Badge variant="outline">GetResponse</Badge>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center">
                    <Users className="h-6 w-6 mr-3 text-green-600" />
                    CRM Systems
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">
                    Sync leads directly to your CRM for comprehensive customer relationship management and sales tracking.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">HubSpot</Badge>
                    <Badge variant="outline">Salesforce</Badge>
                    <Badge variant="outline">Pipedrive</Badge>
                    <Badge variant="outline">High Level</Badge>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center">
                    <Zap className="h-6 w-6 mr-3 text-purple-600" />
                    Zapier & Automation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">
                    Connect to 5,000+ apps through Zapier. Automate your entire lead generation and nurturing workflow.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">Zapier</Badge>
                    <Badge variant="outline">Webhooks</Badge>
                    <Badge variant="outline">API Access</Badge>
                    <Badge variant="outline">Custom Triggers</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8 mt-12 text-center">
              <h3 className="text-2xl font-bold mb-4">Complete Marketing Stack Integration</h3>
              <p className="text-lg text-gray-700 mb-6">
                ConvertMag.net fits seamlessly into your existing marketing workflow. No need to change tools or learn new systems.
              </p>
              <p className="text-gray-600">
                Set up integrations in minutes, not hours. Your leads flow directly where you need them, when you need them.
              </p>
            </div>
          </div>
        </div>
      </section>
      {/* How It Works Section */}
      <section className="bg-gradient-to-r from-slate-50 to-blue-50 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-gray-600">
              Turn any content into high-converting lead magnets in 5 simple steps
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-5 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-xl">1</span>
                </div>
                <h3 className="font-bold mb-2">Upload Content</h3>
                <p className="text-sm text-gray-600">
                  Add ANY content - videos, audio, blogs, PDFs, or streams
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-xl">2</span>
                </div>
                <h3 className="font-bold mb-2">AI Analysis</h3>
                <p className="text-sm text-gray-600">
                  Our AI analyzes and extracts key insights, techniques, and knowledge
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-xl">3</span>
                </div>
                <h3 className="font-bold mb-2">Fresh Guide Creation</h3>
                <p className="text-sm text-gray-600">
                  Creates 100% original, valuable guides and step-by-step instructions
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-xl">4</span>
                </div>
                <h3 className="font-bold mb-2">Landing Page</h3>
                <p className="text-sm text-gray-600">
                  Auto-generates high-converting landing pages with your branding
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-xl">5</span>
                </div>
                <h3 className="font-bold mb-2">Capture & Convert</h3>
                <p className="text-sm text-gray-600">
                  Leads get real value while you capture emails and grow your business
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Origin Story Section */}
      <section className="bg-gradient-to-r from-blue-50 to-purple-50 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">The Story Behind ConvertMag.net</h2>
            <p className="text-xl text-gray-600">
              How one founder's testing revealed the secret to 10x lead generation
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
              <h3 className="text-2xl font-bold mb-6 text-center">The Discovery That Changed Everything</h3>
              
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-blue-600 font-bold">1</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-2">The Old Way: Category-Based Lead Magnets</h4>
                    <p className="text-gray-600">
                      I built GetMoreViews.com using "bucket categories" - grouping content under 3-6 core subjects that capture 80% of search volume. In business: Traffic, Lead Generation, Sales Conversion, Ascension & Scale. In basketball: Dribbling, Shooting, Scoring, Athleticism.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-purple-600 font-bold">2</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-2">The 2024 Test: Video-Specific Lead Magnets</h4>
                    <p className="text-gray-600">
                      I tested taking it one step further - creating lead magnets specific to individual videos instead of broad categories. The results shocked me.
                    </p>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border-l-4 border-green-500">
                  <h4 className="font-bold text-xl mb-3 text-green-800">The Results: 10x Lead Generation</h4>
                  <p className="text-gray-700 mb-4">
                    <strong>5 videos with video-specific lead magnets = Same results as 25+ videos with category-based approach</strong>
                  </p>
                  <p className="text-gray-600">
                    Video-specific lead magnets allowed me to pre-segment my audience based on the exact content they were watching, creating perfect alignment between their interest and my offer.
                  </p>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-red-600 font-bold">3</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-2">The Problem: $1000+ Cost Per Video</h4>
                    <p className="text-gray-600">
                      Each video-specific lead magnet required: New free gift creation, landing page design, funnel buildout, integrations, Zapier webhooks, and more. Over $1000 in time, effort, and costs per video.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-yellow-600 font-bold">4</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-2">The Solution: ConvertMag.net</h4>
                    <p className="text-gray-600">
                      I found the "New Way" but needed a solution to do the heavy lifting. Unfortunately, it didn't exist. So I spent the last year personally coding ConvertMag.net myself.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <div className="inline-block bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-2xl font-bold mb-4 text-gray-800">Now You Can Access This Same Strategy</h3>
                <p className="text-gray-600 mb-4">
                  What took me $1000+ per video and generated millions of leads over the years...
                </p>
                <p className="text-lg font-semibold text-blue-600">
                  Now takes minutes and costs pennies with ConvertMag.net
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Why Choose ConvertMag.net Section */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why ConvertMag.net Beats the Competition</h2>
            <p className="text-xl text-gray-600">
              We don't just gate existing content - we create fresh, valuable educational materials
            </p>
          </div>
          
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 mb-12">
              <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-r-lg">
                <h3 className="text-xl font-bold mb-4 text-red-800">❌ Other Tools (Like VidMagnet.io)</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>• Just gate existing YouTube videos behind opt-ins</li>
                  <li>• No new value created for leads</li>
                  <li>• Only works with YouTube content</li>
                  <li>• No connection between guide and source content</li>
                  <li>• Focuses on "trending" vs educational content</li>
                  <li>• Generic templates with no customization</li>
                  <li>• Basically just content theft</li>
                </ul>
              </div>
              
              <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-r-lg">
                <h3 className="text-xl font-bold mb-4 text-green-800">✅ ConvertMag.net</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>• Creates 100% original, valuable guides</li>
                  <li>• Leads get fresh educational content</li>
                  <li>• Works with ALL content types</li>
                  <li>• <strong>Smart Timestamping</strong> - Click to jump to exact moments in source content</li>
                  <li>• Focuses on knowledge extraction & education</li>
                  <li>• Complete customization with AI prompting</li>
                  <li>• Builds genuine value and trust</li>
                </ul>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center">
                    <Target className="h-6 w-6 mr-3 text-blue-600" />
                    Knowledge-Based AI
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Our AI actually understands your content and creates educational materials that add real value to your audience.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="border-2 border-yellow-500 shadow-xl hover:shadow-2xl transition-shadow">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center">
                    <Clock className="h-6 w-6 mr-3 text-yellow-600" />
                    Smart Timestamping
                  </CardTitle>
                  <Badge className="bg-yellow-100 text-yellow-800 text-xs">EXCLUSIVE</Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Refer back to exact timestamps of high value details and information in a click, allowing your source video to be part of the guide as well!
                  </p>
                </CardContent>
              </Card>
              
              <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center">
                    <Zap className="h-6 w-6 mr-3 text-purple-600" />
                    All Content Types
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Videos, audio, blogs, PDFs, streams - transform any content into lead magnets, not just YouTube videos.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center">
                    <Shield className="h-6 w-6 mr-3 text-green-600" />
                    Ethical & Valuable
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Build trust by giving real value. Your leads get fresh educational content, not just gated access to existing videos.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Everything You Need to Succeed</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            ConvertMag.net combines AI-powered content analysis with professional lead generation tools
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      {/* Testimonials Section */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">What Our Users Say</h2>
            <p className="text-gray-600">Join thousands of creators who've transformed their content into lead magnets</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-0 shadow-lg">
                <CardHeader>
                  <div className="flex items-center gap-1 mb-2">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <CardTitle className="text-lg">{testimonial.name}</CardTitle>
                  <CardDescription>{testimonial.role}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 italic">"{testimonial.content}"</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
      {/* Pricing Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Choose Your Plan</h2>
          <p className="text-gray-600">Start free, upgrade when you're ready to scale</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {pricingPlans.map((plan, index) => (
            <Card key={index} className={`relative ${plan.popular ? 'border-2 border-blue-500 shadow-xl scale-105' : 'border-0 shadow-lg'}`}>
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500">
                  Most Popular
                </Badge>
              )}
              
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <div className="text-4xl font-bold text-blue-600 mb-2">
                  {plan.price}
                  {plan.name !== "Free" && <span className="text-lg text-gray-500">/month</span>}
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  className={`w-full ${plan.popular ? 'bg-gradient-to-r from-blue-600 to-purple-600' : ''}`}
                  variant={plan.popular ? "default" : "outline"}
                  onClick={() => plan.name === "Free" ? setIsSignUpOpen(true) : null}
                >
                  {plan.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      {/* CTA Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Content?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of creators who've already started generating leads from their videos
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-white text-blue-600 hover:bg-gray-100"
              onClick={() => setIsSignUpOpen(true)}
            >
              Start Free Today
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            
            <Button 
              size="lg" 
              variant="outline" 
              className="border-white text-white hover:bg-white hover:text-blue-600"
              onClick={() => setShowVideoDemo(true)}
            >
              <Play className="mr-2 h-4 w-4" />
              Watch Demo
            </Button>
          </div>
          
          <div className="mt-8 text-sm opacity-75">
            <Check className="inline h-4 w-4 mr-2" />
            Setup takes less than 2 minutes • No credit card required
          </div>
        </div>
      </section>
      {/* Risk Reversal & Final CTA Section */}
      <section className="bg-gradient-to-r from-green-600 to-emerald-600 py-20 text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="bg-white text-green-600 rounded-full px-8 py-4 inline-block mb-8 font-bold text-xl">
              🛡️ 100% RISK-FREE GUARANTEE
            </div>
            
            <h2 className="text-4xl md:text-5xl font-black mb-8">
              Try ConvertMag.net <span className="text-yellow-300">Completely Risk-Free</span>
            </h2>
            
            <div className="bg-white bg-opacity-20 rounded-2xl p-8 backdrop-blur-sm mb-8">
              <h3 className="text-2xl font-bold mb-6">Our Iron-Clad Promise to You</h3>
              <div className="grid md:grid-cols-3 gap-6 text-center">
                <div>
                  <div className="w-16 h-16 bg-white bg-opacity-30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">✅</span>
                  </div>
                  <h4 className="font-bold text-lg mb-2">Start FREE Today</h4>
                  <p className="text-sm opacity-90">No credit card required to begin</p>
                </div>
                <div>
                  <div className="w-16 h-16 bg-white bg-opacity-30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">💰</span>
                  </div>
                  <h4 className="font-bold text-lg mb-2">30-Day Money Back</h4>
                  <p className="text-sm opacity-90">Full refund if not completely satisfied</p>
                </div>
                <div>
                  <div className="w-16 h-16 bg-white bg-opacity-30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🚀</span>
                  </div>
                  <h4 className="font-bold text-lg mb-2">See Results in 5 Minutes</h4>
                  <p className="text-sm opacity-90">Create your first lead magnet immediately</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    size="lg" 
                    className="bg-white text-green-600 hover:bg-gray-100 px-16 py-8 text-2xl font-black shadow-2xl transform hover:scale-105 transition-all duration-300"
                  >
                    🎯 START YOUR 10X TRANSFORMATION NOW
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>🚀 Start Your Risk-Free Account</DialogTitle>
                    <DialogDescription>
                      Join thousands of creators getting 10X better results
                    </DialogDescription>
                  </DialogHeader>
                  <p className="text-center text-sm text-gray-600">
                    Account creation redirects to secure signup form
                  </p>
                  <Button 
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600"
                    onClick={() => window.location.href = '/signup'}
                  >
                    Create Free Account
                  </Button>
                </DialogContent>
              </Dialog>
              
              <div className="flex items-center justify-center space-x-8 text-sm">
                <div className="flex items-center">
                  <Check className="h-4 w-4 mr-2" />
                  No credit card required
                </div>
                <div className="flex items-center">
                  <Check className="h-4 w-4 mr-2" />
                  Setup in under 2 minutes
                </div>
                <div className="flex items-center">
                  <Check className="h-4 w-4 mr-2" />
                  30-day money back guarantee
                </div>
              </div>
            </div>
            
            <div className="mt-12 bg-yellow-400 text-black rounded-2xl p-6">
              <p className="text-lg font-bold">
                ⏰ <strong>EARLY ACCESS PRICING:</strong> Lock in your account before prices increase next month
              </p>
              <p className="text-sm mt-2 opacity-80">
                Current users will be grandfathered into their pricing forever
              </p>
            </div>
          </div>
        </div>
      </section>
      {/* FAQ Section */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
              <p className="text-gray-600">Everything you need to know about ConvertMag.net</p>
            </div>
            
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="font-bold text-lg mb-3">How is this different from VidMagnet.io?</h3>
                <p className="text-gray-600">
                  VidMagnet.io just gates existing YouTube videos behind opt-ins - basically content theft. ConvertMag.net creates 100% original, valuable guides from your content using AI analysis. We build trust by giving real value, not just restricting access.
                </p>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="font-bold text-lg mb-3">What content types work with ConvertMag.net?</h3>
                <p className="text-gray-600">
                  ANY content: YouTube videos, audio files, blog posts, PDFs, live streams, podcasts, and more. Unlike tools that only work with YouTube, we transform all content types into lead magnets.
                </p>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="font-bold text-lg mb-3">How does Smart Timestamping work?</h3>
                <p className="text-gray-600">
                  Our exclusive Smart Timestamping feature lets your leads click to jump to exact moments in your source content. It's like having interactive guides that connect back to your videos - no competitor offers this.
                </p>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="font-bold text-lg mb-3">Can I really create lead magnets in 5 minutes?</h3>
                <p className="text-gray-600">
                  Yes! Our AI analyzes content in 30 seconds, generates guides in 2 minutes, and creates landing pages in 2 minutes. What used to take weeks and cost $1000+ now takes minutes and costs nothing.
                </p>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="font-bold text-lg mb-3">What if I'm not satisfied with the results?</h3>
                <p className="text-gray-600">
                  We offer a 30-day money-back guarantee. If ConvertMag.net doesn't help you generate more leads, we'll refund every penny. Plus, you can start with our free plan - no risk at all.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">ConvertMag.net</h3>
              <p className="text-gray-400">
                Transform your videos into high-converting lead magnets with AI-powered analysis.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Features</a></li>
                <li><a href="#" className="hover:text-white">Pricing</a></li>
                <li><a href="#" className="hover:text-white">Demo</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Help Center</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
                <li><a href="#" className="hover:text-white">Status</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">About</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 ConvertMag.net. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}