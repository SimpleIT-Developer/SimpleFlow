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
            "text-white animate-document-emit",
            iconSizes[size]
          )} 
          fill="currentColor" 
          viewBox="0 0 24 24"
        >
          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
        </svg>
        {showPulse && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-pink-400 rounded-full animate-ping"></div>
        )}
      </div>
    </div>
  );
}
