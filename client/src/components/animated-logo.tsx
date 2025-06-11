import { cn } from "@/lib/utils";

interface AnimatedLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  showPulse?: boolean;
}

export function AnimatedLogo({ size = "md", className, showPulse = false }: AnimatedLogoProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-16 h-16",
    lg: "w-20 h-20"
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-8 h-8", 
    lg: "w-10 h-10"
  };

  return (
    <div className={cn(
      "inline-flex items-center justify-center bg-gradient-to-br from-primary to-secondary rounded-2xl animate-float",
      sizeClasses[size],
      className
    )}>
      <div className="relative">
        <svg 
          className={cn(
            "text-white animate-pulse",
            iconSizes[size]
          )} 
          fill="currentColor" 
          viewBox="0 0 24 24"
        >
          <path d="M5,12L2,15L5,18V15.5H9.5V12.5H5V12M19,7H12.5V10H19V13L22,10L19,7M9,20H12V18H9A3,3 0 0,1 6,15V12H4V15A5,5 0 0,0 9,20M15,4H12V6H15A3,3 0 0,1 18,9V12H20V9A5,5 0 0,0 15,4Z"/>
        </svg>
        {showPulse && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-pink-400 rounded-full animate-ping"></div>
        )}
      </div>
    </div>
  );
}
