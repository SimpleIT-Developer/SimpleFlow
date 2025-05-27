import { Layout } from "@/components/layout";
import { AnimatedLogo } from "@/components/animated-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, Plus, BarChart3, Settings, FileText, CheckCircle, Clock } from "lucide-react";

export default function DashboardPage() {
  const { toast } = useToast();

  const handleQuickAction = (action: string) => {
    toast({
      title: "Funcionalidade em desenvolvimento",
      description: `A função "${action}" será implementada em breve.`,
    });
  };

  return (
    <Layout currentPage="Dashboard">
      <div className="space-y-6">
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
      </div>
    </Layout>
  );
}
