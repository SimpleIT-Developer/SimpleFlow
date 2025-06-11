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
  TrendingUp,
  TrendingDown,
  Filter,
  RefreshCw,
  DollarSign,
  PiggyBank,
  CreditCard
} from "lucide-react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DateRange {
  from?: Date;
  to?: Date;
}

const mockRelatorioStats = {
  totalEntradas: 125000.50,
  totalSaidas: 78500.25,
  saldoLiquido: 46500.25,
  transacoes: 156,
  relatoriosGerados: 24,
  crescimentoMensal: 12.5,
  contasPagas: 45,
  contasRecebidas: 38,
  maioresEntradas: [
    { descricao: "Venda de Produtos", valor: 25000.00, data: "2024-06-10" },
    { descricao: "Prestação de Serviços", valor: 18500.00, data: "2024-06-08" },
    { descricao: "Recebimento Cliente A", valor: 15200.00, data: "2024-06-05" }
  ],
  maioresSaidas: [
    { descricao: "Pagamento Fornecedor", valor: 12000.00, data: "2024-06-09" },
    { descricao: "Folha de Pagamento", valor: 8500.00, data: "2024-06-01" },
    { descricao: "Aluguel e Despesas", valor: 6200.00, data: "2024-06-01" }
  ]
};

export default function RelatoriosPage() {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [tipoRelatorio, setTipoRelatorio] = useState<string>("fluxo-caixa");
  const [conta, setConta] = useState<string>("todas");
  const [formato, setFormato] = useState<string>("pdf");

  const { data: stats = mockRelatorioStats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/relatorios/fluxo-caixa", dateRange, conta],
    queryFn: () => Promise.resolve(mockRelatorioStats),
    retry: false,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleGerarRelatorio = () => {
    // Simular geração de relatório
    console.log('Gerando relatório:', { tipoRelatorio, dateRange, conta, formato });
  };

  if (statsLoading) {
    return (
      <Layout currentPage="Relatórios">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-gray-400">Carregando relatórios...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const statsCards = [
    {
      title: "Total Entradas",
      value: formatCurrency(stats.totalEntradas),
      icon: TrendingUp,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      trend: `+${stats.crescimentoMensal}%`
    },
    {
      title: "Total Saídas",
      value: formatCurrency(stats.totalSaidas),
      icon: TrendingDown,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      trend: "-5.2%"
    },
    {
      title: "Saldo Líquido",
      value: formatCurrency(stats.saldoLiquido),
      icon: PiggyBank,
      color: "text-primary",
      bgColor: "bg-primary/10",
      trend: "+18.3%"
    },
    {
      title: "Transações",
      value: stats.transacoes,
      icon: DollarSign,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      trend: `${stats.transacoes} movimentos`
    }
  ];

  return (
    <Layout currentPage="Relatórios">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Relatórios Financeiros</h1>
            <p className="text-gray-400 text-sm">
              Análises e relatórios detalhados do fluxo de caixa
            </p>
          </div>
          <Badge variant="secondary" className="text-primary">
            {stats.relatoriosGerados} relatórios gerados
          </Badge>
        </div>

        {/* Filtros */}
        <Card className="glassmorphism border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              Configuração do Relatório
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label className="text-gray-200">Tipo de Relatório</Label>
                <Select value={tipoRelatorio} onValueChange={setTipoRelatorio}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/20">
                    <SelectItem value="fluxo-caixa">Fluxo de Caixa</SelectItem>
                    <SelectItem value="contas-pagar">Contas a Pagar</SelectItem>
                    <SelectItem value="contas-receber">Contas a Receber</SelectItem>
                    <SelectItem value="balancete">Balancete</SelectItem>
                    <SelectItem value="demonstrativo">Demonstrativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-gray-200">Conta</Label>
                <Select value={conta} onValueChange={setConta}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/20">
                    <SelectItem value="todas">Todas as Contas</SelectItem>
                    <SelectItem value="corrente">Conta Corrente</SelectItem>
                    <SelectItem value="poupanca">Poupança</SelectItem>
                    <SelectItem value="investimento">Investimentos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-gray-200">Período</Label>
                <div className="flex space-x-2">
                  <Input
                    type="date"
                    value={dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : ''}
                    onChange={(e) => setDateRange(prev => ({ ...prev, from: new Date(e.target.value) }))}
                    className="bg-white/10 border-white/20 text-white"
                  />
                  <Input
                    type="date"
                    value={dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : ''}
                    onChange={(e) => setDateRange(prev => ({ ...prev, to: new Date(e.target.value) }))}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
              </div>

              <div>
                <Label className="text-gray-200">Formato</Label>
                <Select value={formato} onValueChange={setFormato}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/20">
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="excel">Excel</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex space-x-3">
              <Button 
                onClick={handleGerarRelatorio}
                className="bg-primary hover:bg-primary/90 text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                Gerar Relatório
              </Button>
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                <Calendar className="w-4 h-4 mr-2" />
                Agendar Relatório
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <Card key={index} className="glassmorphism border-white/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm font-medium">{card.title}</p>
                      <div className="flex items-center space-x-2">
                        <p className="text-2xl font-bold text-white">{card.value}</p>
                        {card.trend && (
                          <Badge variant="secondary" className="text-xs">
                            {card.trend}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className={`p-3 rounded-lg ${card.bgColor}`}>
                      <Icon className={`w-6 h-6 ${card.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Análises Rápidas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Maiores Entradas */}
          <Card className="glassmorphism border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Maiores Entradas</CardTitle>
              <CardDescription className="text-gray-400">
                Principais recebimentos do período
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.maioresEntradas.map((entrada, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <div>
                      <p className="text-white font-medium">{entrada.descricao}</p>
                      <p className="text-gray-400 text-sm">
                        {format(new Date(entrada.data), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-green-500 font-bold">{formatCurrency(entrada.valor)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Maiores Saídas */}
          <Card className="glassmorphism border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Maiores Saídas</CardTitle>
              <CardDescription className="text-gray-400">
                Principais pagamentos do período
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.maioresSaidas.map((saida, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <div>
                      <p className="text-white font-medium">{saida.descricao}</p>
                      <p className="text-gray-400 text-sm">
                        {format(new Date(saida.data), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-red-500 font-bold">{formatCurrency(saida.valor)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Relatórios Pré-definidos */}
        <Card className="glassmorphism border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Relatórios Pré-definidos</CardTitle>
            <CardDescription className="text-gray-400">
              Relatórios prontos para download
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { name: "Fluxo de Caixa Mensal", desc: "Movimentações do mês atual", icon: FileBarChart },
                { name: "Contas a Pagar", desc: "Obrigações pendentes", icon: CreditCard },
                { name: "Contas a Receber", desc: "Valores a receber", icon: TrendingUp },
                { name: "Balancete Geral", desc: "Posição financeira atual", icon: PiggyBank },
                { name: "Demonstrativo Anual", desc: "Resumo do exercício", icon: Calendar },
                { name: "Análise de Tendências", desc: "Projeções e insights", icon: TrendingUp }
              ].map((relatorio, index) => {
                const Icon = relatorio.icon;
                return (
                  <Card key={index} className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-primary/20">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm">{relatorio.name}</p>
                          <p className="text-gray-400 text-xs">{relatorio.desc}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}