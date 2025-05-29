import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { registerSchema, type RegisterData } from "@shared/schema";
import { register as registerUser } from "@/lib/auth";
import { AnimatedLogo } from "@/components/animated-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [acceptTerms, setAcceptTerms] = useState(false);

  const form = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      name: "",
      type: "user",
    },
  });

  const registerMutation = useMutation({
    mutationFn: registerUser,
    onSuccess: (data) => {
      toast({
        title: "Conta criada com sucesso!",
        description: `Bem-vindo, ${data.user.name}!`,
      });
      setLocation("/dashboard");
    },
    onError: (error: any) => {
      toast({
        title: "Erro no cadastro",
        description: error.message || "Erro interno do servidor",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RegisterData) => {
    if (!acceptTerms) {
      toast({
        title: "Termos obrigatórios",
        description: "Você deve aceitar os termos de uso para continuar",
        variant: "destructive",
      });
      return;
    }
    registerMutation.mutate(data);
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Logo */}
        <div className="text-center">
          <AnimatedLogo size="lg" showPulse className="mb-4" />
          <h1 className="text-3xl font-bold text-white">SimpleDoc</h1>
          <p className="text-gray-300 mt-2">Crie sua conta gratuitamente</p>
        </div>

        {/* Register Form */}
        <Card className="glassmorphism border-white/20">
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-white text-center mb-2">
                  Criar Conta
                </h2>
                <p className="text-gray-300 text-center text-sm">
                  Preencha os dados para criar sua conta
                </p>
              </div>

              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <div>
                  <Label htmlFor="name" className="text-gray-200">
                    Nome Completo
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Seu nome completo"
                    className="bg-white/10 border-white/20 text-white placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent"
                    {...form.register("name")}
                  />
                  {form.formState.errors.name && (
                    <p className="text-red-400 text-sm mt-1">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="username" className="text-gray-200">
                    Nome de Usuário
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="seunomeusuario"
                    className="bg-white/10 border-white/20 text-white placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent"
                    {...form.register("username")}
                  />
                  {form.formState.errors.username && (
                    <p className="text-red-400 text-sm mt-1">
                      {form.formState.errors.username.message}
                    </p>
                  )}
                </div>

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
                  <Label htmlFor="type" className="text-gray-200">
                    Tipo de Usuário
                  </Label>
                  <Select
                    value={form.watch("type")}
                    onValueChange={(value) => form.setValue("type", value)}
                  >
                    <SelectTrigger className="bg-white/10 border-white/20 text-white focus:ring-2 focus:ring-primary focus:border-transparent">
                      <SelectValue placeholder="Selecione o tipo de usuário" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Usuário</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="system">Sistema</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.type && (
                    <p className="text-red-400 text-sm mt-1">
                      {form.formState.errors.type.message}
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
                  <p className="text-xs text-gray-400 mt-1">Mínimo 8 caracteres</p>
                  {form.formState.errors.password && (
                    <p className="text-red-400 text-sm mt-1">
                      {form.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="confirmPassword" className="text-gray-200">
                    Confirmar Senha
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    className="bg-white/10 border-white/20 text-white placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent"
                    {...form.register("confirmPassword")}
                  />
                  {form.formState.errors.confirmPassword && (
                    <p className="text-red-400 text-sm mt-1">
                      {form.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="terms"
                    checked={acceptTerms}
                    onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                    className="border-white/20"
                  />
                  <Label htmlFor="terms" className="text-sm text-gray-300">
                    Aceito os{" "}
                    <a href="#" className="text-primary hover:text-secondary">
                      Termos de Uso
                    </a>{" "}
                    e{" "}
                    <a href="#" className="text-primary hover:text-secondary">
                      Política de Privacidade
                    </a>
                  </Label>
                </div>

                <Button
                  type="submit"
                  disabled={registerMutation.isPending}
                  className="w-full bg-gradient-to-r from-primary to-secondary hover:from-secondary hover:to-primary transform hover:scale-105 transition-all duration-200 shadow-lg"
                >
                  {registerMutation.isPending ? "Criando conta..." : "Criar Conta"}
                </Button>
              </form>

              <div className="text-center">
                <p className="text-gray-300 text-sm">
                  Já tem uma conta?{" "}
                  <Link href="/login">
                    <span className="text-primary hover:text-secondary font-medium transition-colors cursor-pointer">
                      Entrar
                    </span>
                  </Link>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
