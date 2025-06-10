import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { logout } from "@/lib/auth";
import { AnimatedLogo } from "@/components/animated-logo";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { LogOut, BarChart3, Settings, FileText, Building2, Receipt, FileCheck, Users, Truck, FileBarChart } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
}

export function Layout({ children, currentPage }: LayoutProps) {
  const [location, setLocation] = useLocation();
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
          <p className="text-white/80">Carregando...</p>
        </div>
      </div>
    );
  }

  const user = userData && typeof userData === 'object' && 'user' in userData ? userData.user : null;
  const userInitials = user?.name
    ? user.name.split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
    : "U";

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleQuickAction = (action: string) => {
    toast({
      title: "Funcionalidade em desenvolvimento",
      description: `A função "${action}" será implementada em breve.`,
    });
  };

  const isActive = (path: string) => {
    if (path === "/dashboard" && (location === "/" || location === "/dashboard")) {
      return true;
    }
    return location === path;
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
              <h2 className="text-white font-semibold">SimpleDFe</h2>
              <p className="text-gray-400 text-xs">v1.0.0</p>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1">
            <ul className="space-y-2">
              <li>
                <Link href="/dashboard">
                  <a className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive("/dashboard")
                      ? "text-white bg-primary/20 border border-primary/30"
                      : "text-gray-300 hover:text-white hover:bg-white/10"
                  }`}>
                    <BarChart3 className="w-5 h-5" />
                    <span>Dashboard</span>
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/companies">
                  <a className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 cursor-pointer ${
                    isActive("/companies")
                      ? "text-white bg-primary/20 border border-primary/30"
                      : "text-gray-300 hover:text-white hover:bg-white/10"
                  }`}>
                    <Building2 className="w-5 h-5" />
                    <span>Empresas</span>
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/nfe-recebidas">
                  <a className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 cursor-pointer ${
                    isActive("/nfe-recebidas")
                      ? "text-white bg-primary/20 border border-primary/30"
                      : "text-gray-300 hover:text-white hover:bg-white/10"
                  }`}>
                    <Receipt className="w-5 h-5" />
                    <span>NFe Recebidas</span>
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/nfse-recebidas">
                  <a className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 cursor-pointer ${
                    isActive("/nfse-recebidas")
                      ? "text-white bg-primary/20 border border-primary/30"
                      : "text-gray-300 hover:text-white hover:bg-white/10"
                  }`}>
                    <FileCheck className="w-5 h-5" />
                    <span>NFSe Recebidas</span>
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/fornecedores">
                  <a className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 cursor-pointer ${
                    isActive("/fornecedores")
                      ? "text-white bg-primary/20 border border-primary/30"
                      : "text-gray-300 hover:text-white hover:bg-white/10"
                  }`}>
                    <Truck className="w-5 h-5" />
                    <span>Fornecedores</span>
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/relatorios">
                  <a className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 cursor-pointer ${
                    isActive("/relatorios")
                      ? "text-white bg-primary/20 border border-primary/30"
                      : "text-gray-300 hover:text-white hover:bg-white/10"
                  }`}>
                    <FileBarChart className="w-5 h-5" />
                    <span>Relatórios</span>
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/usuarios">
                  <a className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 cursor-pointer ${
                    isActive("/usuarios")
                      ? "text-white bg-primary/20 border border-primary/30"
                      : "text-gray-300 hover:text-white hover:bg-white/10"
                  }`}>
                    <Users className="w-5 h-5" />
                    <span>Usuários</span>
                  </a>
                </Link>
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
              <h1 className="text-2xl font-semibold text-white">{currentPage}</h1>
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

        {/* Page Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}