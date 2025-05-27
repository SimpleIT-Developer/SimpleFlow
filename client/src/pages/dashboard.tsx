import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { logout } from "@/lib/auth";
import { AnimatedLogo } from "@/components/animated-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Upload, Plus, BarChart3, Settings, FileText, CheckCircle, Clock, Building2 } from "lucide-react";

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: userData, isLoading } = useQuery({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.clear();
      toast({
        title: "Logout realizado com sucesso",
        description: "Até logo!",
      });
      setLocation("/login");
    },
    onError: (error: any) => {
      toast({
        title: "Erro no logout",
        description: error.message || "Erro interno do servidor",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center">
          <AnimatedLogo size="lg" showPulse className="mb-4" />
          <p className="text-white/80">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  const user = userData?.user;
  const userInitials = user?.name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase() || "U";

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleQuickAction = (action: string) => {
    toast({
      title: "Funcionalidade em desenvolvimento",
      description: `A função "${action}" será implementada em breve.`,
    });
  };

  return (
    <div className="min-h-screen gradient-bg">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 glassmorphism border-r border-white/20">
        <div className="flex flex-col h-full p-6">
          {/* Logo in Sidebar */}
          <div className="flex items-center space-x-3 mb-8">
            <AnimatedLogo size="sm" />
            <div>
              <h2 className="text-white font-semibold">SimpleDoc</h2>
              <p className="text-gray-400 text-xs">v1.0.0</p>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1">
            <ul className="space-y-2">
              <li>
                <Link href="/dashboard">
                  <a className="flex items-center space-x-3 px-4 py-3 text-white bg-primary/20 rounded-lg border border-primary/30 transition-all duration-200">
                    <BarChart3 className="w-5 h-5" />
                    <span>Dashboard</span>
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/companies">
                  <a className="flex items-center space-x-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200 cursor-pointer">
                    <Building2 className="w-5 h-5" />
                    <span>Empresas</span>
                  </a>
                </Link>
              </li>
              <li>
                <a 
                  href="#" 
                  onClick={() => handleQuickAction("Documentos")}
                  className="flex items-center space-x-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
                >
                  <FileText className="w-5 h-5" />
                  <span>Documentos</span>
                </a>
              </li>
              <li>
                <a 
                  href="#" 
                  onClick={() => handleQuickAction("Perfil")}
                  className="flex items-center space-x-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
                >
                  <Settings className="w-5 h-5" />
                  <span>Perfil</span>
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 flex flex-col min-h-screen">
        {/* Top Bar */}
        <header className="glassmorphism border-b border-white/20 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
              <p className="text-gray-400 text-sm">Bem-vindo de volta ao SimpleDoc</p>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              {/* Loading indicator (shown during processing) */}
              {logoutMutation.isPending && (
                <AnimatedLogo size="sm" showPulse />
              )}

              {/* User Profile */}
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-white font-medium">{user?.name}</p>
                  <p className="text-gray-400 text-sm">{user?.email}</p>
                </div>
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold">{userInitials}</span>
                </div>
              </div>

              {/* Logout Button */}
              <Button
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
                variant="destructive"
                className="flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sair</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 p-6 space-y-6">
          {/* Welcome Section */}
          <Card className="glassmorphism border-white/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-2">
                    Bem-vindo ao SimpleDoc
                  </h2>
                  <p className="text-gray-300">
                    Gerencie seus documentos e notas fiscais de forma inteligente
                  </p>
                </div>
                <AnimatedLogo size="lg" className="animate-float" />
              </div>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="glassmorphism border-white/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-gray-300 text-sm font-medium">Documentos Totais</h3>
                    <p className="text-2xl font-bold text-white mt-1">0</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glassmorphism border-white/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-gray-300 text-sm font-medium">Processados Hoje</h3>
                    <p className="text-2xl font-bold text-white mt-1">0</p>
                  </div>
                  <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glassmorphism border-white/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-gray-300 text-sm font-medium">Em Processamento</h3>
                    <p className="text-2xl font-bold text-white mt-1">0</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                    <Clock className="w-6 h-6 text-yellow-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card className="glassmorphism border-white/20">
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold text-white mb-4">Atividade Recente</h3>
              <div className="text-center py-8">
                <p className="text-gray-400">Nenhuma atividade ainda.</p>
                <p className="text-gray-500 text-sm mt-1">
                  Comece criando ou importando seus primeiros documentos.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="glassmorphism border-white/20">
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold text-white mb-4">Ações Rápidas</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button
                  onClick={() => handleQuickAction("Upload de Documento")}
                  variant="outline"
                  className="p-4 h-auto bg-primary/20 hover:bg-primary/30 border-primary/30 text-white flex flex-col items-center space-y-3 group"
                >
                  <div className="w-12 h-12 bg-primary/30 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium">Upload</p>
                    <p className="text-gray-400 text-sm">Novo documento</p>
                  </div>
                </Button>

                <Button
                  onClick={() => handleQuickAction("Criar Nota Fiscal")}
                  variant="outline"
                  className="p-4 h-auto bg-green-500/20 hover:bg-green-500/30 border-green-500/30 text-white flex flex-col items-center space-y-3 group"
                >
                  <div className="w-12 h-12 bg-green-500/30 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Plus className="w-6 h-6 text-green-400" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium">Criar</p>
                    <p className="text-gray-400 text-sm">Nova nota fiscal</p>
                  </div>
                </Button>

                <Button
                  onClick={() => handleQuickAction("Ver Relatórios")}
                  variant="outline"
                  className="p-4 h-auto bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/30 text-white flex flex-col items-center space-y-3 group"
                >
                  <div className="w-12 h-12 bg-blue-500/30 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <BarChart3 className="w-6 h-6 text-blue-400" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium">Relatórios</p>
                    <p className="text-gray-400 text-sm">Visualizar dados</p>
                  </div>
                </Button>

                <Button
                  onClick={() => handleQuickAction("Configurações")}
                  variant="outline"
                  className="p-4 h-auto bg-purple-500/20 hover:bg-purple-500/30 border-purple-500/30 text-white flex flex-col items-center space-y-3 group"
                >
                  <div className="w-12 h-12 bg-purple-500/30 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Settings className="w-6 h-6 text-purple-400" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium">Configurações</p>
                    <p className="text-gray-400 text-sm">Gerenciar conta</p>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
