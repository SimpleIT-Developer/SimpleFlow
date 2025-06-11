import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  TrendingUp, 
  TrendingDown, 
  PiggyBank, 
  CreditCard, 
  Receipt, 
  DollarSign,
  Calendar,
  RefreshCw
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { format, subDays, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

// Mock data for development - replace with API calls
const mockDashboardStats = {
  totalContas: 5,
  entradas: 125000.50,
  saidas: 78500.25,
  saldoTotal: 246800.75,
  contasPagar: 12,
  contasReceber: 8,
  lancamentosHoje: 5
};

const mockFluxoCaixaData = [
  { data: "2024-06-05", entradas: 5000, saidas: 3200, saldo: 1800 },
  { data: "2024-06-06", entradas: 7500, saidas: 4100, saldo: 3400 },
  { data: "2024-06-07", entradas: 3200, saidas: 5800, saldo: -2600 },
  { data: "2024-06-08", entradas: 9800, saidas: 2100, saldo: 7700 },
  { data: "2024-06-09", entradas: 4500, saidas: 6200, saldo: -1700 },
  { data: "2024-06-10", entradas: 8200, saidas: 3500, saldo: 4700 },
  { data: "2024-06-11", entradas: 6800, saidas: 4200, saldo: 2600 }
];

const mockUltimosLancamentos = [
  { id: 1, descricao: "Venda de produtos", valor: 5800, tipo: "entrada", data: "2024-06-11", status: "pago", categoria: "vendas" },
  { id: 2, descricao: "Pagamento fornecedor", valor: -2300, tipo: "saida", data: "2024-06-11", status: "pago", categoria: "compras" },
  { id: 3, descricao: "Recebimento cliente", valor: 8900, tipo: "entrada", data: "2024-06-10", status: "pago", categoria: "vendas" },
  { id: 4, descricao: "Aluguel escritório", valor: -3200, tipo: "saida", data: "2024-06-10", status: "pago", categoria: "despesas" },
  { id: 5, descricao: "Prestação de serviços", valor: 4500, tipo: "entrada", data: "2024-06-09", status: "pendente", categoria: "servicos" }
];

const contasPorTipo = [
  { name: "Conta Corrente", value: 45, color: "#B58900" },
  { name: "Poupança", value: 25, color: "#B8860B" },
  { name: "Investimentos", value: 20, color: "#DAA520" },
  { name: "Carteira", value: 10, color: "#FFD700" }
];

export default function DashboardPage() {
  const [selectedConta, setSelectedConta] = useState<string>("todas");
  const [periodo, setPeriodo] = useState<string>("7d");

  // Mock queries - replace with actual API calls
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    queryFn: () => Promise.resolve(mockDashboardStats),
  });

  const { data: fluxoData, isLoading: fluxoLoading } = useQuery({
    queryKey: ["/api/dashboard/fluxo-caixa", periodo],
    queryFn: () => Promise.resolve(mockFluxoCaixaData),
  });

  const { data: ultimosLancamentos, isLoading: lancamentosLoading } = useQuery({
    queryKey: ["/api/dashboard/ultimos-lancamentos"],
    queryFn: () => Promise.resolve(mockUltimosLancamentos),
  });

  if (statsLoading) {
    return (
      <Layout currentPage="Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-gray-400">Carregando dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const statsCards = [
    {
      title: "Saldo Total",
      value: formatCurrency(stats?.saldoTotal || 0),
      icon: PiggyBank,
      color: "text-primary",
      bgColor: "bg-primary/10",
      trend: "+12%"
    },
    {
      title: "Entradas do Mês",
      value: formatCurrency(stats?.entradas || 0),
      icon: TrendingUp,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      trend: "+8%"
    },
    {
      title: "Saídas do Mês",
      value: formatCurrency(stats?.saidas || 0),
      icon: TrendingDown,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      trend: "-5%"
    },
    {
      title: "Contas a Pagar",
      value: stats?.contasPagar || 0,
      icon: CreditCard,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      trend: "2 vencendo"
    },
    {
      title: "Contas a Receber",
      value: stats?.contasReceber || 0,
      icon: Receipt,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      trend: "3 vencendo"
    },
    {
      title: "Lançamentos Hoje",
      value: stats?.lancamentosHoje || 0,
      icon: Calendar,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      trend: "Atualizado"
    }
  ];

  return (
    <Layout currentPage="Dashboard">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard de Fluxo de Caixa</h1>
            <p className="text-gray-400 text-sm">
              Visão geral das movimentações financeiras
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Select value={selectedConta} onValueChange={setSelectedConta}>
              <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Selecionar conta" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-white/20">
                <SelectItem value="todas">Todas as Contas</SelectItem>
                <SelectItem value="corrente">Conta Corrente</SelectItem>
                <SelectItem value="poupanca">Poupança</SelectItem>
                <SelectItem value="investimento">Investimentos</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              onClick={() => refetchStats()}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Fluxo de Caixa Chart */}
          <Card className="glassmorphism border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Evolução do Fluxo de Caixa</CardTitle>
              <CardDescription className="text-gray-400">
                Últimos 7 dias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={fluxoData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="data" 
                      stroke="#9CA3AF"
                      fontSize={12}
                      tickFormatter={(value) => format(new Date(value), 'dd/MM')}
                    />
                    <YAxis 
                      stroke="#9CA3AF"
                      fontSize={12}
                      tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#F9FAFB'
                      }}
                      formatter={(value: number) => [formatCurrency(value), '']}
                      labelFormatter={(label) => format(new Date(label), 'dd/MM/yyyy')}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="entradas" 
                      stroke="#10B981" 
                      strokeWidth={2}
                      name="Entradas"
                      dot={{ fill: '#10B981', strokeWidth: 2 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="saidas" 
                      stroke="#EF4444" 
                      strokeWidth={2}
                      name="Saídas"
                      dot={{ fill: '#EF4444', strokeWidth: 2 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="saldo" 
                      stroke="#B58900" 
                      strokeWidth={3}
                      name="Saldo Líquido"
                      dot={{ fill: '#B58900', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Distribuição por Tipo de Conta */}
          <Card className="glassmorphism border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Distribuição por Conta</CardTitle>
              <CardDescription className="text-gray-400">
                Percentual do saldo por tipo de conta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={contasPorTipo}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {contasPorTipo.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#F9FAFB'
                      }}
                      formatter={(value: number) => [`${value}%`, 'Percentual']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-4 mt-4">
                {contasPorTipo.map((item, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-gray-300">{item.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Últimos Lançamentos */}
        <Card className="glassmorphism border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Últimos Lançamentos</CardTitle>
            <CardDescription className="text-gray-400">
              Movimentações mais recentes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ultimosLancamentos?.map((lancamento) => (
                <div
                  key={lancamento.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-lg ${
                      lancamento.tipo === 'entrada' ? 'bg-green-500/20' : 'bg-red-500/20'
                    }`}>
                      {lancamento.tipo === 'entrada' ? (
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-white font-medium">{lancamento.descricao}</p>
                      <p className="text-gray-400 text-sm">
                        {format(new Date(lancamento.data), 'dd/MM/yyyy', { locale: ptBR })} • {lancamento.categoria}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${
                      lancamento.valor > 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {formatCurrency(Math.abs(lancamento.valor))}
                    </p>
                    <Badge 
                      variant={lancamento.status === 'pago' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {lancamento.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}