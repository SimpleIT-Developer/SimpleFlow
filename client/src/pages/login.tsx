import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { loginSchema, type LoginData } from "@shared/schema";
import { login } from "@/lib/auth";
import { AnimatedLogo } from "@/components/animated-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [rememberMe, setRememberMe] = useState(false);
  const [showRegisterLink, setShowRegisterLink] = useState(false);

  const form = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Listener para a combinação de teclas CTRL + ALT + SHIFT + 9
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.altKey && event.shiftKey && event.key === '9') {
        setShowRegisterLink(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      toast({
        title: "Login realizado com sucesso!",
        description: `Bem-vindo, ${data.user.name}!`,
      });
      setLocation("/dashboard");
    },
    onError: (error: any) => {
      toast({
        title: "Erro no login",
        description: error.message || "Erro interno do servidor",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginData) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Logo */}
        <div className="text-center">
          <AnimatedLogo size="lg" showPulse className="mb-4" />
          <h1 className="text-3xl font-bold text-white">SimpleDoc</h1>
          <p className="text-gray-300 mt-2">Sistema de Gestão Inteligente</p>
        </div>

        {/* Login Form */}
        <Card className="glassmorphism border-white/20">
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-white text-center mb-2">
                  Entrar na Conta
                </h2>
                <p className="text-gray-300 text-center text-sm">
                  Entre com suas credenciais para acessar o sistema
                </p>
              </div>

              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <div>
                  <Label htmlFor="email" className="text-gray-200">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    className="bg-white/10 border-white/20 text-white placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent"
                    {...form.register("email")}
                  />
                  {form.formState.errors.email && (
                    <p className="text-red-400 text-sm mt-1">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="password" className="text-gray-200">
                    Senha
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="bg-white/10 border-white/20 text-white placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent"
                    {...form.register("password")}
                  />
                  {form.formState.errors.password && (
                    <p className="text-red-400 text-sm mt-1">
                      {form.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                      className="border-white/20"
                    />
                    <Label htmlFor="remember" className="text-sm text-gray-300">
                      Lembrar-me
                    </Label>
                  </div>
                  <a 
                    href="#" 
                    className="text-sm text-primary hover:text-secondary transition-colors"
                  >
                    Esqueceu a senha?
                  </a>
                </div>

                <Button
                  type="submit"
                  disabled={loginMutation.isPending}
                  className="w-full bg-gradient-to-r from-primary to-secondary hover:from-secondary hover:to-primary transform hover:scale-105 transition-all duration-200 shadow-lg"
                >
                  {loginMutation.isPending ? "Entrando..." : "Entrar"}
                </Button>
              </form>

              {showRegisterLink && (
                <div className="text-center">
                  <p className="text-gray-300 text-sm">
                    Não tem uma conta?{" "}
                    <Link href="/register">
                      <span className="text-primary hover:text-secondary font-medium transition-colors cursor-pointer">
                        Criar conta
                      </span>
                    </Link>
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
