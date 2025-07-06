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
          <Badge className="mb-4 bg-blue-100 text-blue-800">
            AI-Powered Lead Generation
          </Badge>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Turn ANY Content Into 
            <span className="block">High-Converting Lead Magnets</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Unlike tools that just gate existing videos behind opt-ins, ConvertMag.net creates 100% fresh, valuable guides using AI-powered analysis. Turn videos, audio, blogs, or any content into educational lead magnets in minutes.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Dialog open={isSignUpOpen} onOpenChange={setIsSignUpOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  Start Free Today
                  <ArrowRight className="ml-2 h-4 w-4" />
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
              onClick={() => setShowVideoDemo(true)}
            >
              <Play className="mr-2 h-4 w-4" />
              Watch Demo
            </Button>
          </div>
          
          <div className="flex items-center justify-center text-sm text-gray-500">
            <Check className="h-4 w-4 text-green-500 mr-2" />
            No credit card required • Free forever plan available
          </div>
        </div>
      </section>

      {/* Problem Statement Section */}
      <section className="bg-gradient-to-r from-red-50 to-orange-50 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-6 text-gray-900">
              Lead Magnets Are Dying a Fast Death
            </h2>
            <p className="text-xl text-gray-700 mb-8">
              There's only two types that work well: <strong>Personal support</strong> (customized to their needs) and <strong>laser-precise focused support</strong> (like a guide specifically made for the content and goal the viewer is watching in the moment).
            </p>
            
            <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
              <h3 className="text-2xl font-bold mb-4 text-blue-600">
                ConvertMag.net Does BOTH
              </h3>
              <p className="text-lg text-gray-700 mb-6">
                Turn ANY video, audio, stream, post, blog, or book instantly into a custom made, beautiful lead magnet with a 2,000,000+ lead tested landing page design, automated delivery, tracking, follow up and more.
              </p>
              <p className="text-lg text-gray-700">
                Turn your lead magnet into an evergreen, flowing, high converting system that offers new content every time you post to social media, making personalized, in the moment solutions for the people who are focused on you and your content in the moment.
              </p>
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
                  <li>• Focuses on knowledge extraction & education</li>
                  <li>• Complete customization with AI prompting</li>
                  <li>• Builds genuine value and trust</li>
                </ul>
              </div>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
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