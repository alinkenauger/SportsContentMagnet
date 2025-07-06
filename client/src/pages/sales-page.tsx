import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Check, Star, Users, Zap, Crown, Play, ArrowRight, CheckCircle, Target, TrendingUp, Shield, Clock, Mail, Phone } from "lucide-react";
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
    content: "VidMagnet helped me turn my workout videos into a consistent lead generation system. I now capture 50+ leads per week!",
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
      "VidMagnet branding"
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
        title: "Welcome to VidMagnet!",
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
            Transform Your Videos Into 
            <span className="block">High-Converting Lead Magnets</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Turn your YouTube videos into professional practice guides that capture leads automatically. 
            Perfect for fitness coaches, instructors, and content creators.
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
                    Get started with VidMagnet in less than 60 seconds
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

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Everything You Need to Succeed</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            VidMagnet combines AI-powered content analysis with professional lead generation tools
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
              <h3 className="text-xl font-bold mb-4">VidMagnet</h3>
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
            <p>&copy; 2025 VidMagnet. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}