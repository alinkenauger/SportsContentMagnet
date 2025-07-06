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
    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;
      
      ticking = true;
      requestAnimationFrame(() => {
        if (!containerRef.current) {
          ticking = false;
          return;
        }

        const container = containerRef.current;
        const containerTop = container.offsetTop;
        const containerHeight = container.offsetHeight;
        const scrollY = window.scrollY;
        const windowHeight = window.innerHeight;

        // More precise viewport calculation
        const containerBottom = containerTop + containerHeight;
        const viewportTop = scrollY;
        const viewportBottom = scrollY + windowHeight;

        // Only animate when container is in viewport
        if (viewportBottom < containerTop || viewportTop > containerBottom) {
          ticking = false;
          return;
        }

        // Calculate smooth progress through the container
        const scrollProgress = Math.max(0, Math.min(1, 
          (scrollY + windowHeight * 0.5 - containerTop) / (containerHeight * 0.8)
        ));

        // Smooth step transitions with easing
        const easedProgress = scrollProgress < 0.5 
          ? 2 * scrollProgress * scrollProgress 
          : 1 - Math.pow(-2 * scrollProgress + 2, 3) / 2;

        const stepIndex = Math.floor(easedProgress * steps.length);
        const activeStep = Math.min(Math.max(0, stepIndex), steps.length - 1);
        
        setCurrentStep(activeStep);
        ticking = false;
      });
    };

    // Throttled scroll listener
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div ref={containerRef} className="relative h-[400vh] w-full">
      {/* Sticky container for the transformation content */}
      <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">
        <div className="relative w-full max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Background that changes with each step */}
          <div 
            className={`absolute inset-0 bg-gradient-to-br ${steps[currentStep]?.bgColor || 'from-gray-500 to-gray-600'} rounded-2xl sm:rounded-3xl transition-all duration-1000 ease-out transform`}
            style={{
              opacity: 0.95,
              transform: `scale(${1 + currentStep * 0.015}) rotate(${currentStep * 0.5}deg)`,
              filter: `blur(${Math.max(0, (steps.length - 1 - currentStep) * 0.5)}px)`,
            }}
          />
          
          {/* Floating particles effect */}
          <div className="absolute inset-0 overflow-hidden rounded-2xl sm:rounded-3xl">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-white/20 rounded-full animate-pulse"
                style={{
                  left: `${20 + i * 15}%`,
                  top: `${30 + (i % 2) * 40}%`,
                  animationDelay: `${i * 0.5}s`,
                  animationDuration: `${2 + i * 0.3}s`,
                  transform: `translateY(${currentStep * -10}px)`,
                  transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              />
            ))}
          </div>
          
          {/* Content container */}
          <div className="relative z-10 text-center py-8 sm:py-12 lg:py-16 px-4 sm:px-6 lg:px-8">
            {/* Step indicator */}
            <div className="flex justify-center mb-6 sm:mb-8">
              <div className="flex space-x-2 sm:space-x-3">
                {steps.map((_, index) => (
                  <div
                    key={index}
                    className={`transition-all duration-700 ease-out rounded-full ${
                      index <= currentStep 
                        ? 'w-4 h-4 sm:w-5 sm:h-5 bg-white scale-110 shadow-lg' 
                        : 'w-2 h-2 sm:w-3 sm:h-3 bg-white/40 scale-100'
                    }`}
                    style={{
                      transitionDelay: `${index * 100}ms`,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Title with enhanced animation */}
            <h2 
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-6 sm:mb-8 text-white leading-tight"
              style={{
                transform: `translateY(${(steps.length - 1 - currentStep) * 5}px)`,
                opacity: 1 - (steps.length - 1 - currentStep) * 0.1,
                transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                textShadow: '0 4px 12px rgba(0,0,0,0.3)',
              }}
            >
              {steps[currentStep]?.title}
            </h2>

            {/* Image container with enhanced smooth transitions */}
            <div className="relative w-full max-w-xs sm:max-w-sm lg:max-w-lg mx-auto mb-6 sm:mb-8">
              {steps[currentStep]?.image && (
                <div className="relative group">
                  <img
                    src={steps[currentStep].image}
                    alt={steps[currentStep].alt}
                    className="w-full rounded-xl sm:rounded-2xl shadow-2xl border-2 sm:border-4 border-white/30"
                    style={{
                      transform: `
                        translateY(${(steps.length - 1 - currentStep) * -3}px) 
                        scale(${0.95 + currentStep * 0.0125}) 
                        rotateY(${(steps.length - 1 - currentStep) * 2}deg)
                      `,
                      transition: 'all 0.9s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                      filter: `brightness(${0.9 + currentStep * 0.025}) contrast(${1 + currentStep * 0.05})`,
                    }}
                  />
                  
                  {/* Enhanced play button overlay for video thumbnail */}
                  {currentStep === 0 && (
                    <div className="absolute inset-0 bg-black bg-opacity-20 rounded-xl sm:rounded-2xl flex items-center justify-center transition-opacity duration-500">
                      <div 
                        className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-full flex items-center justify-center shadow-xl transform transition-transform duration-300 hover:scale-110"
                        style={{
                          animation: 'pulse 2s infinite',
                        }}
                      >
                        <Play className="h-6 w-6 sm:h-8 sm:w-8 text-red-600 ml-0.5" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Enhanced final step - INSTANTLY! with special animation */}
              {currentStep === 3 && (
                <div className="flex items-center justify-center">
                  <div 
                    className="text-6xl sm:text-7xl lg:text-8xl"
                    style={{
                      animation: 'bounce 1s infinite, pulse 2s infinite',
                      filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.5))',
                    }}
                  >
                    ⚡
                  </div>
                </div>
              )}
            </div>

            {/* Enhanced description */}
            <p 
              className="text-lg sm:text-xl lg:text-2xl font-medium leading-relaxed"
              style={{
                color: 'rgba(255,255,255,0.95)',
                transform: `translateY(${(steps.length - 1 - currentStep) * 3}px)`,
                opacity: 1 - (steps.length - 1 - currentStep) * 0.15,
                transition: 'all 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                textShadow: '0 2px 8px rgba(0,0,0,0.2)',
              }}
            >
              {steps[currentStep]?.description}
            </p>

            {/* Enhanced scroll indicator */}
            {currentStep === 0 && (
              <div 
                className="absolute bottom-4 sm:bottom-8 left-1/2 transform -translate-x-1/2"
                style={{
                  animation: 'bounce 2s infinite',
                }}
              >
                <ArrowDown className="h-5 w-5 sm:h-6 sm:w-6 text-white/80 mb-2" />
                <p className="text-xs sm:text-sm text-white/80 font-medium">Scroll to see the magic</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced features showcase */}
      <div 
        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white/98 to-white/95 backdrop-blur-md rounded-t-2xl sm:rounded-t-3xl p-4 sm:p-6 lg:p-8"
        style={{
          transform: `translateY(${Math.max(0, (3 - currentStep) * 10)}px)`,
          opacity: Math.min(1, currentStep * 0.4 + 0.6),
          transition: 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 text-center">
            <div 
              className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg border border-blue-200 transform transition-all duration-500 hover:scale-105 hover:shadow-xl"
              style={{
                transitionDelay: '100ms',
              }}
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg">
                <span className="text-lg sm:text-2xl">⚡</span>
              </div>
              <h5 className="font-bold text-gray-800 mb-2 text-sm sm:text-base">Smart Timestamping</h5>
              <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">Click buttons to jump to exact moments in original video</p>
            </div>
            
            <div 
              className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg border border-green-200 transform transition-all duration-500 hover:scale-105 hover:shadow-xl"
              style={{
                transitionDelay: '200ms',
              }}
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg">
                <span className="text-lg sm:text-2xl">🎯</span>
              </div>
              <h5 className="font-bold text-gray-800 mb-2 text-sm sm:text-base">18% Conversion Rate</h5>
              <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">9x higher than industry average of 2%</p>
            </div>
            
            <div 
              className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg border border-purple-200 transform transition-all duration-500 hover:scale-105 hover:shadow-xl sm:col-span-2 lg:col-span-1"
              style={{
                transitionDelay: '300ms',
              }}
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg">
                <span className="text-lg sm:text-2xl">⏱️</span>
              </div>
              <h5 className="font-bold text-gray-800 mb-2 text-sm sm:text-base">5 Minute Setup</h5>
              <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">Complete system ready in minutes, not weeks</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}