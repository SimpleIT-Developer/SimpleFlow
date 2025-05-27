import { useEffect } from "react";
import { useLocation } from "wouter";
import { AnimatedLogo } from "@/components/animated-logo";

export default function LoadingPage() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Aguarda 10 segundos mostrando o logo animado antes de ir para o dashboard
    const timer = setTimeout(() => {
      setLocation("/dashboard");
    }, 10000);

    return () => clearTimeout(timer);
  }, [setLocation]);

  return (
    <div className="min-h-screen gradient-bg flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-8">
        {/* Logo Animado */}
        <AnimatedLogo size="lg" showPulse className="mb-8" />
        
        {/* Título e Descrição */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-white">SimpleDoc</h1>
          <p className="text-xl text-gray-300">Sistema de Gestão Inteligente</p>
          <p className="text-gray-400">Carregando...</p>
        </div>

        {/* Indicador de Progresso */}
        <div className="w-64 bg-gray-700/50 rounded-full h-2 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary to-secondary rounded-full animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}