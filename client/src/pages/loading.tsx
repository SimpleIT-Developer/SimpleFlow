import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AnimatedLogo } from "@/components/animated-logo";

export default function LoadingPage() {
  const [, setLocation] = useLocation();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Animação da barra de progresso
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 1; // Incrementa 1% a cada 100ms (10 segundos total)
      });
    }, 100);

    // Timer para redirecionar após 10 segundos
    const redirectTimer = setTimeout(() => {
      setLocation("/dashboard");
    }, 10000);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(redirectTimer);
    };
  }, [setLocation]);

  return (
    <div className="min-h-screen gradient-bg flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-8">
        {/* Logo Animado */}
        <AnimatedLogo size="lg" showPulse className="mb-8" />
        
        {/* Título e Descrição */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-white">SimpleDFe</h1>
          <p className="text-xl text-gray-300">Sistema de Gestão de Documentos Eletrônicos Inteligente</p>
        </div>

        {/* Barra de Progresso Animada - Responsiva */}
        <div className="w-full max-w-md mx-auto px-4">
          <div className="w-full bg-gray-700/50 rounded-full h-3 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-100 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}