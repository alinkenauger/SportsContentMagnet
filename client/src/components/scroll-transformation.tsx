import { useState, useEffect, useRef } from "react";
import { ArrowDown, Play } from "lucide-react";

interface TransformationStep {
  id: string;
  title: string;
  image: string;
  alt: string;
  description: string;
  bgColor: string;
  textColor: string;
}

const steps: TransformationStep[] = [
  {
    id: "step1",
    title: "Turn A YouTube Video...",
    image: "/attached_assets/mqdefault_1751825204492.jpg",
    alt: "YouTube Golf Video Thumbnail",
    description: "Any YouTube video becomes the source of transformation",
    bgColor: "from-red-500 to-red-600",
    textColor: "text-red-100"
  },
  {
    id: "step2", 
    title: "Into A High Converting Landing Page...",
    image: "/attached_assets/CleanShot 2025-07-06 at 13.58.18@2x_1751825245756.png",
    alt: "High Converting Landing Page",
    description: "AI generates professional landing page with compelling copy",
    bgColor: "from-blue-500 to-blue-600",
    textColor: "text-blue-100"
  },
  {
    id: "step3",
    title: "And a Custom Highly Detailed Guide...",
    image: "/attached_assets/CleanShot 2025-07-06 at 13.59.43_1751825178398.gif",
    alt: "Interactive Practice Guide",
    description: "Complete interactive guide with smart timestamping",
    bgColor: "from-green-500 to-green-600", 
    textColor: "text-green-100"
  },
  {
    id: "step4",
    title: "INSTANTLY!",
    image: "",
    alt: "",
    description: "Complete lead magnet system ready in 5 minutes",
    bgColor: "from-purple-500 to-purple-600",
    textColor: "text-purple-100"
  }
];

export function ScrollTransformation() {
  const [currentStep, setCurrentStep] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;

      const container = containerRef.current;
      const containerTop = container.offsetTop;
      const containerHeight = container.offsetHeight;
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;

      // Calculate if the container is in viewport
      const containerCenter = containerTop + containerHeight / 2;
      const viewportCenter = scrollY + windowHeight / 2;
      
      // Calculate progress through the container (0 to 1)
      const progress = Math.max(0, Math.min(1, 
        (viewportCenter - containerTop) / containerHeight
      ));

      // Determine which step should be active based on scroll progress
      const stepIndex = Math.floor(progress * steps.length);
      const activeStep = Math.min(stepIndex, steps.length - 1);
      
      setCurrentStep(activeStep);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div ref={containerRef} className="relative h-[400vh] w-full">
      {/* Sticky container for the transformation content */}
      <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">
        <div className="relative w-full max-w-2xl mx-auto px-8">
          {/* Background that changes with each step */}
          <div 
            className={`absolute inset-0 bg-gradient-to-br ${steps[currentStep]?.bgColor || 'from-gray-500 to-gray-600'} rounded-3xl transition-all duration-1000 ease-in-out transform`}
            style={{
              opacity: 0.95,
              transform: `scale(${1 + currentStep * 0.02})`,
            }}
          />
          
          {/* Content container */}
          <div className="relative z-10 text-center py-16 px-8">
            {/* Step indicator */}
            <div className="flex justify-center mb-8">
              <div className="flex space-x-2">
                {steps.map((_, index) => (
                  <div
                    key={index}
                    className={`w-3 h-3 rounded-full transition-all duration-500 ${
                      index <= currentStep 
                        ? 'bg-white scale-125' 
                        : 'bg-white/30 scale-100'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Title with animation */}
            <h2 
              className={`text-4xl md:text-5xl font-bold mb-8 text-white transition-all duration-700 transform ${
                currentStep === steps.findIndex(s => s.id === steps[currentStep]?.id)
                  ? 'translate-y-0 opacity-100' 
                  : 'translate-y-4 opacity-70'
              }`}
            >
              {steps[currentStep]?.title}
            </h2>

            {/* Image container with smooth transitions */}
            <div className="relative w-full max-w-lg mx-auto mb-8">
              {steps[currentStep]?.image && (
                <div className="relative">
                  <img
                    src={steps[currentStep].image}
                    alt={steps[currentStep].alt}
                    className="w-full rounded-2xl shadow-2xl border-4 border-white/20 transform transition-all duration-700 hover:scale-105"
                    style={{
                      transform: `translateY(${currentStep * -2}px) scale(${1 + currentStep * 0.01})`,
                    }}
                  />
                  
                  {/* Play button overlay for video thumbnail */}
                  {currentStep === 0 && (
                    <div className="absolute inset-0 bg-black bg-opacity-20 rounded-2xl flex items-center justify-center">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
                        <Play className="h-8 w-8 text-red-600 ml-1" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Final step - INSTANTLY! with special animation */}
              {currentStep === 3 && (
                <div className="flex items-center justify-center">
                  <div className="text-8xl animate-pulse">⚡</div>
                </div>
              )}
            </div>

            {/* Description */}
            <p 
              className={`text-xl ${steps[currentStep]?.textColor || 'text-white'} transition-all duration-500 transform ${
                currentStep === steps.findIndex(s => s.id === steps[currentStep]?.id)
                  ? 'translate-y-0 opacity-100' 
                  : 'translate-y-2 opacity-80'
              }`}
            >
              {steps[currentStep]?.description}
            </p>

            {/* Scroll indicator (only show on first step) */}
            {currentStep === 0 && (
              <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
                <ArrowDown className="h-6 w-6 text-white/70" />
                <p className="text-sm text-white/70 mt-2">Scroll to see the magic</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Features showcase after the transformation */}
      <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm rounded-t-3xl p-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div className="bg-white rounded-xl p-6 shadow-lg border border-blue-200">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚡</span>
              </div>
              <h5 className="font-bold text-gray-800 mb-2">Smart Timestamping</h5>
              <p className="text-gray-600 text-sm">Click buttons to jump to exact moments in original video</p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-lg border border-green-200">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎯</span>
              </div>
              <h5 className="font-bold text-gray-800 mb-2">18% Conversion Rate</h5>
              <p className="text-gray-600 text-sm">9x higher than industry average of 2%</p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-lg border border-purple-200">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⏱️</span>
              </div>
              <h5 className="font-bold text-gray-800 mb-2">5 Minute Setup</h5>
              <p className="text-gray-600 text-sm">Complete system ready in minutes, not weeks</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}