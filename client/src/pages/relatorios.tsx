import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  FileBarChart, 
  Download, 
  Calendar, 
  Building2, 
  Receipt, 
  FileCheck, 
  TrendingUp,
  Filter,
  RefreshCw,
  DollarSign
} from "lucide-react";
import { addDays, format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DateRange {
  from?: Date;
  to?: Date;
}

// Função para formatar data local sem conversão de timezone
const formatDateLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function RelatoriosPage() {
  const [selectedReport, setSelectedReport] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [selectedCompany, setSelectedCompany] = useState("all");
  const [isGenerating, setIsGenerating] = useState(false);

  // Buscar empresas para o filtro
  const { data: companiesData } = useQuery({
    queryKey: ["/api/dashboard/cnpj-ativos"],
  });

  const companies = Array.isArray(companiesData) ? companiesData : [];

  const reportTypes = [
    {
      id: "nfe-summary",
      title: "Resumo de NFe",
      description: "Relatório consolidado de notas fiscais eletrônicas recebidas",
      icon: Receipt,
      color: "text-blue-500",
    },
    {
      id: "nfse-summary", 
      title: "Resumo de NFSe",
      description: "Relatório consolidado de notas fiscais de serviços recebidas",
      icon: FileCheck,
      color: "text-green-500",
    },
    {
      id: "nfse-tributos",
      title: "Relatórios de Tributos NFSe",
      description: "Análise detalhada de tributos e impostos das NFSe recebidas",
      icon: DollarSign,
      color: "text-red-500",
    },
    {
      id: "companies-activity",
      title: "Atividade por Empresa",
      description: "Análise de documentos recebidos por empresa",
      icon: Building2,
      color: "text-purple-500",
    },
    {
      id: "monthly-trends",
      title: "Tendências Mensais",
      description: "Análise de tendências de recebimento de documentos",
      icon: TrendingUp,
      color: "text-orange-500",
    },
  ];

  const handleGenerateReport = async () => {
    if (!selectedReport) {
      return;
    }

    setIsGenerating(true);
    
    try {
      if (selectedReport === 'nfe-summary') {
        // Gerar relatório de NFe
        const response = await fetch('/api/relatorios/nfe-resumo', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify({
            dataInicial: dateRange.from ? formatDateLocal(dateRange.from) : '',
            dataFinal: dateRange.to ? formatDateLocal(dateRange.to) : '',
            empresa: selectedCompany
          })
        });

        if (!response.ok) {
          throw new Error('Erro ao gerar relatório');
        }

        const data = await response.json();
        
        if (data.success && data.pdf) {
          // Converter base64 para blob
          const binaryString = window.atob(data.pdf);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: 'application/pdf' });
          
          // Abrir PDF em nova aba
          const url = window.URL.createObjectURL(blob);
          window.open(url, '_blank');
          
          // Cleanup
          setTimeout(() => window.URL.revokeObjectURL(url), 100);
        } else {
          throw new Error('Formato de resposta inválido');
        }
      } else {
        // Outros tipos de relatório (simulação)
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log("Gerando relatório:", {
          type: selectedReport,
          dateRange,
          company: selectedCompany,
        });
      }
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      alert('Erro ao gerar relatório. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const formatDateRange = () => {
    if (!dateRange.from) return "Selecionar período";
    
    if (dateRange.to) {
      return `${format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} - ${format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}`;
    }
    
    return format(dateRange.from, "dd/MM/yyyy", { locale: ptBR });
  };

  return (
    <Layout currentPage="Relatórios">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Relatórios</h2>
            <p className="text-gray-400">
              Gere relatórios detalhados sobre documentos fiscais
            </p>
          </div>
          <Badge variant="secondary" className="text-primary">
            {reportTypes.length} tipos disponíveis
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tipos de Relatórios */}
          <div className="lg:col-span-2">
            <Card className="glassmorphism border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <FileBarChart className="w-5 h-5" />
                  <span>Tipos de Relatórios</span>
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Selecione o tipo de relatório que deseja gerar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {reportTypes.map((report) => {
                    const IconComponent = report.icon;
                    return (
                      <div
                        key={report.id}
                        className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:scale-105 ${
                          selectedReport === report.id
                            ? "border-primary bg-primary/10"
                            : "border-white/20 bg-white/5 hover:bg-white/10"
                        }`}
                        onClick={() => setSelectedReport(report.id)}
                      >
                        <div className="flex items-start space-x-3">
                          <IconComponent className={`w-6 h-6 ${report.color} mt-1`} />
                          <div className="flex-1">
                            <h3 className="text-white font-medium mb-1">
                              {report.title}
                            </h3>
                            <p className="text-gray-400 text-sm">
                              {report.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filtros e Configurações */}
          <div className="space-y-6">
            <Card className="glassmorphism border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Filter className="w-5 h-5" />
                  <span>Filtros</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Período */}
                <div>
                  <Label className="text-white mb-2 block">Data Inicial</Label>
                  <Input
                    type="date"
                    value={dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : ""}
                    onChange={(e) => setDateRange(prev => ({ ...prev, from: new Date(e.target.value) }))}
                    className="bg-white/10 border-white/20 text-white mb-2"
                  />
                  <Label className="text-white mb-2 block">Data Final</Label>
                  <Input
                    type="date"
                    value={dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : ""}
                    onChange={(e) => setDateRange(prev => ({ ...prev, to: new Date(e.target.value) }))}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>

                {/* Empresa */}
                <div>
                  <Label className="text-white mb-2 block">Empresa</Label>
                  <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Selecionar empresa" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as empresas</SelectItem>
                      {companies.map((company: any) => (
                        <SelectItem key={company.cnpj} value={company.cnpj}>
                          {company.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Ações */}
            <Card className="glassmorphism border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Gerar Relatório</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={handleGenerateReport}
                  disabled={!selectedReport || isGenerating}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Gerar PDF
                    </>
                  )}
                </Button>
                
                <p className="text-xs text-gray-400 text-center">
                  O relatório será baixado automaticamente
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Estatísticas Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="glassmorphism border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Receipt className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-gray-400 text-sm">NFe este mês</p>
                  <p className="text-white text-xl font-bold">342</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glassmorphism border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <FileCheck className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-gray-400 text-sm">NFSe este mês</p>
                  <p className="text-white text-xl font-bold">156</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glassmorphism border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Building2 className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="text-gray-400 text-sm">Empresas ativas</p>
                  <p className="text-white text-xl font-bold">{companies.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glassmorphism border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <TrendingUp className="w-8 h-8 text-orange-500" />
                <div>
                  <p className="text-gray-400 text-sm">Crescimento</p>
                  <p className="text-white text-xl font-bold">+12%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}