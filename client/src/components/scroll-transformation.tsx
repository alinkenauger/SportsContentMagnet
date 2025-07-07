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
    image: "/attached_assets/CleanShot 2025-07-07 at 16.08.49@2x_1751918933270.png",
    alt: "YouTube Video Input",
    description: "Any YouTube video becomes the source of transformation",
    bgColor: "from-gray-100 to-gray-200",
    textColor: "text-gray-800"
  },
  {
    id: "step2", 
    title: "Into A High Converting Landing Page...",
    image: "/attached_assets/CleanShot 2025-07-07 at 16.31.56@2x_1751920318463.png",
    alt: "High Converting Landing Page",
    description: "AI generates professional landing page with compelling copy",
    bgColor: "from-red-50 to-red-100",
    textColor: "text-red-800"
  },
  {
    id: "step3",
    title: "And a Custom Highly Detailed Guide...",
    image: "/attached_assets/CleanShot 2025-07-07 at 16.35.04@2x_1751920507446.png",
    alt: "Interactive Practice Guide",
    description: "Complete interactive guide with smart timestamping",
    bgColor: "from-green-50 to-green-100", 
    textColor: "text-green-800"
  },
  {
    id: "step4",
    title: "INSTANTLY!",
    image: "",
    alt: "",
    description: "Complete lead magnet system ready in 5 minutes",
    bgColor: "from-white to-gray-50",
    textColor: "text-gray-900"
  }
];

export function ScrollTransformation() {
  const [currentStep, setCurrentStep] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isInSection, setIsInSection] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

        // Calculate precise scroll progress through the container
        const startTrigger = containerTop - windowHeight * 0.3;
        const endTrigger = containerTop + containerHeight - windowHeight * 0.7;
        const rawProgress = Math.max(0, Math.min(1, 
          (scrollY - startTrigger) / (endTrigger - startTrigger)
        ));

        // Check if user is actively viewing the transformation section
        const isInTransformationSection = scrollY >= startTrigger && scrollY <= endTrigger;

        // Apply smooth easing for buttery transitions
        const smoothProgress = rawProgress < 0.5 
          ? 4 * rawProgress * rawProgress * rawProgress
          : 1 - Math.pow(-2 * rawProgress + 2, 3) / 2;

        setScrollProgress(smoothProgress);

        // Calculate step with smoother transitions
        const stepProgress = smoothProgress * (steps.length - 1);
        const newStep = Math.round(stepProgress);
        
        // Only update step if it actually changed to reduce unnecessary re-renders
        setCurrentStep(prevStep => {
          const clampedStep = Math.min(Math.max(0, newStep), steps.length - 1);
          return prevStep !== clampedStep ? clampedStep : prevStep;
        });

        // Store whether we're in the transformation section for the progress indicator
        setIsInSection(isInTransformationSection);
        
        ticking = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative h-[400vh] w-full">
      {/* Progress indicator on the left - only visible when in transformation section */}
      <div 
        className={`fixed left-4 sm:left-8 top-1/2 transform -translate-y-1/2 z-20 hidden md:block transition-all duration-500 ${
          isInSection ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
        }`}
      >
        <div className="flex flex-col items-center space-y-4">
          {steps.map((step, index) => (
            <div key={step.id} className="relative flex flex-col items-center">
              {/* Progress line */}
              {index < steps.length - 1 && (
                <div 
                  className="absolute top-6 w-0.5 bg-white/20"
                  style={{
                    height: '32px',
                    background: index < currentStep 
                      ? 'linear-gradient(to bottom, rgba(255,255,255,0.6), rgba(255,255,255,0.2))'
                      : 'rgba(255,255,255,0.2)',
                    transition: 'background 0.6s ease-out',
                  }}
                />
              )}
              
              {/* Progress dot */}
              <div
                className={`relative w-4 h-4 rounded-full border-2 transition-all duration-500 ${
                  index <= currentStep
                    ? 'bg-white border-white shadow-lg scale-110'
                    : 'bg-transparent border-white/40 scale-100'
                }`}
                style={{
                  transitionDelay: `${index * 50}ms`,
                }}
              >
                {/* Active indicator */}
                {index === currentStep && (
                  <div className="absolute inset-0 rounded-full bg-white animate-ping opacity-30" />
                )}
              </div>
              
              {/* Step label */}
              <div 
                className={`mt-2 text-xs font-medium transition-all duration-300 ${
                  index === currentStep ? 'text-white opacity-100' : 'text-white/60 opacity-70'
                }`}
                style={{
                  transform: `scale(${index === currentStep ? 1.1 : 0.9})`,
                }}
              >
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sticky container for the transformation content */}
      <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">
        <div className="relative w-full max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Background that changes with each step */}
          <div 
            className={`absolute inset-0 bg-gradient-to-br ${steps[currentStep]?.bgColor || 'from-gray-500 to-gray-600'} rounded-2xl sm:rounded-3xl`}
            style={{
              opacity: 0.95,
              transform: `scale(${1 + scrollProgress * 0.02}) rotate(${scrollProgress * 1}deg)`,
              filter: `blur(${Math.max(0, (1 - scrollProgress) * 1)}px)`,
              transition: 'background-color 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            }}
          />
          
          {/* Floating particles effect */}
          <div className="absolute inset-0 overflow-hidden rounded-2xl sm:rounded-3xl">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 sm:w-2 sm:h-2 bg-white/30 rounded-full"
                style={{
                  left: `${15 + i * 12}%`,
                  top: `${25 + (i % 3) * 25}%`,
                  transform: `translateY(${scrollProgress * -15}px) scale(${0.5 + scrollProgress * 0.5})`,
                  opacity: 0.3 + scrollProgress * 0.4,
                  transition: 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
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
                transform: `translateY(${Math.sin(scrollProgress * Math.PI) * -10}px)`,
                opacity: 0.8 + scrollProgress * 0.2,
                transition: 'opacity 0.3s ease-out',
                textShadow: '0 4px 12px rgba(0,0,0,0.4)',
                filter: `brightness(${1 + scrollProgress * 0.1})`,
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
                        translateY(${Math.sin(scrollProgress * Math.PI) * -5}px) 
                        scale(${0.92 + scrollProgress * 0.08}) 
                        rotateX(${Math.cos(scrollProgress * Math.PI) * 3}deg)
                      `,
                      transition: 'transform 0.3s ease-out',
                      filter: `brightness(${0.9 + scrollProgress * 0.15}) contrast(${1 + scrollProgress * 0.1}) saturate(${1 + scrollProgress * 0.2})`,
                    }}
                  />
                  

                </div>
              )}

              {/* Enhanced final step - INSTANTLY! with special animation */}
              {currentStep === 3 && (
                <div className="flex items-center justify-center">
                  <div 
                    className="text-6xl sm:text-7xl lg:text-8xl"
                    style={{
                      animation: 'bounce 1s infinite, pulse 2s infinite',
                      filter: `drop-shadow(0 0 ${20 + scrollProgress * 10}px rgba(255,255,255,${0.5 + scrollProgress * 0.3}))`,
                      transform: `scale(${1 + scrollProgress * 0.2}) rotate(${scrollProgress * 10}deg)`,
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
                transform: `translateY(${Math.cos(scrollProgress * Math.PI) * 5}px)`,
                opacity: 0.85 + scrollProgress * 0.15,
                transition: 'opacity 0.3s ease-out',
                textShadow: '0 2px 8px rgba(0,0,0,0.3)',
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