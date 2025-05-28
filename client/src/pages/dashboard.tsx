import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Building, FileText, CheckCircle, XCircle, AlertTriangle, Users, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import type { DashboardStats, ChartData, UltimosDocumentos, CNPJAtivo } from "@shared/schema";

const PERIOD_BUTTONS = [
  { key: 'daily', label: 'Diário' },
  { key: 'weekly', label: 'Semanal' },
  { key: 'monthly', label: 'Mensal' },
  { key: 'yearly', label: 'Anual' }
];

const PIE_COLORS = ['#3b82f6', '#ef4444']; // Azul e Vermelho

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('pt-BR');
}

export default function DashboardPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('daily');
  const { toast } = useToast();

  const handleRefreshDashboard = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
    toast({
      title: "Dashboard Atualizado",
      description: "Dados do dashboard atualizados com sucesso!",
    });
  };

  // Consulta para estatísticas principais
  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
  });

  // Consulta para dados do gráfico de barras
  const { data: chartData } = useQuery<ChartData[]>({
    queryKey: ['/api/dashboard/chart', selectedPeriod],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/chart?period=${selectedPeriod}`);
      if (!response.ok) {
        throw new Error("Erro ao carregar dados do gráfico");
      }
      return response.json();
    },
  });

  // Consulta para últimos documentos
  const { data: ultimosDocumentos } = useQuery<UltimosDocumentos[]>({
    queryKey: ['/api/dashboard/ultimos-documentos'],
  });

  // Consulta para CNPJs ativos
  const { data: cnpjAtivos } = useQuery<CNPJAtivo[]>({
    queryKey: ['/api/dashboard/cnpj-ativos'],
  });

  // Dados para o gráfico de pizza
  const pieData = stats ? [
    { name: 'DOC (NFe)', value: stats.nfeRecebidas, color: PIE_COLORS[0] },
    { name: 'NFSe', value: stats.nfseRecebidas, color: PIE_COLORS[1] }
  ] : [];

  const statsCards = [
    {
      title: "Total de CNPJ",
      value: stats?.totalCNPJ || 0,
      icon: Building,
      color: "text-blue-500"
    },
    {
      title: "NFe Recebidas", 
      value: stats?.nfeRecebidas || 0,
      icon: FileText,
      color: "text-green-500"
    },
    {
      title: "NFe Integradas",
      value: stats?.nfeIntegradas || 0,
      icon: CheckCircle,
      color: "text-emerald-500"
    },
    {
      title: "NFSe Recebidas",
      value: stats?.nfseRecebidas || 0,
      icon: FileText,
      color: "text-purple-500"
    },
    {
      title: "NFSe Integradas", 
      value: stats?.nfseIntegradas || 0,
      icon: CheckCircle,
      color: "text-violet-500"
    },
    {
      title: "Fornecedores sem ERP",
      value: stats?.fornecedoresSemERP || 0,
      icon: AlertTriangle,
      color: "text-orange-500"
    }
  ];

  return (
    <Layout currentPage="Dashboard">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <p className="text-gray-400 mt-2">Visão geral do sistema SimpleDFe</p>
          </div>
          <Button
            onClick={handleRefreshDashboard}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar Dashboard
          </Button>
        </div>

        {/* Stats Cards - 6 cards em grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {statsCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-medium text-gray-300">
                    {stat.title}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-white">{stat.value.toLocaleString('pt-BR')}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Resumo dos Documentos Fiscais */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Gráfico de Barras */}
          <div className="lg:col-span-2">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white">Resumo dos Documentos Fiscais</CardTitle>
                    <CardDescription className="text-gray-400">
                      Quantidade de NFe e NFSe capturadas
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {PERIOD_BUTTONS.map((period) => (
                      <Button
                        key={period.key}
                        variant={selectedPeriod === period.key ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedPeriod(period.key)}
                        className={selectedPeriod === period.key ? 
                          "bg-primary text-white" : 
                          "border-gray-600 text-gray-300 hover:bg-gray-700"
                        }
                      >
                        {period.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="date" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(31, 41, 55, 0.95)', 
                          border: '1px solid #374151',
                          color: '#F9FAFB',
                          borderRadius: '6px'
                        }}
                        cursor={{ fill: 'transparent' }}
                      />
                      <Legend />
                      <Bar dataKey="nfe" fill="#3b82f6" name="NFe" />
                      <Bar dataKey="nfse" fill="#ef4444" name="NFSe" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de Pizza */}
          <div>
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Distribuição de Documentos</CardTitle>
                <CardDescription className="text-gray-400">
                  NFe vs NFSe capturadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1F2937', 
                          border: '1px solid #374151',
                          color: '#F9FAFB'
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Grids na parte inferior */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Últimas Notas Fiscais Recebidas */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Últimas Notas Fiscais Recebidas</CardTitle>
              <CardDescription className="text-gray-400">
                Documentos recentemente capturados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-300">Tipo</TableHead>
                    <TableHead className="text-gray-300">Número</TableHead>
                    <TableHead className="text-gray-300">Emitente</TableHead>
                    <TableHead className="text-gray-300">Valor</TableHead>
                    <TableHead className="text-gray-300">Data</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ultimosDocumentos?.slice(0, 5).map((doc, index) => {
                    // Separar tipo e número
                    const tipoNumero = doc.tipo.split(' ');
                    const tipo = tipoNumero[0]; // NFe, NFS-e
                    const numero = tipoNumero.slice(1).join(' '); // Resto da string
                    
                    return (
                      <TableRow key={index} className="border-gray-700">
                        <TableCell className="text-gray-300 font-medium">{tipo}</TableCell>
                        <TableCell className="text-gray-300">{numero}</TableCell>
                        <TableCell className="text-gray-300">{doc.emitente}</TableCell>
                        <TableCell className="text-gray-300">{formatCurrency(doc.valor)}</TableCell>
                        <TableCell className="text-gray-300">{formatDate(doc.data)}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={doc.status === 'Integrado' ? 'default' : 'secondary'}
                            className={doc.status === 'Integrado' ? 
                              'bg-green-600 text-white' : 
                              'bg-yellow-600 text-white'
                            }
                          >
                            {doc.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* CNPJs Ativos */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">CNPJs Ativos</CardTitle>
              <CardDescription className="text-gray-400">
                Empresas com documentos capturados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-300">CNPJ</TableHead>
                    <TableHead className="text-gray-300">Nome</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cnpjAtivos?.map((cnpj, index) => (
                    <TableRow key={index} className="border-gray-700">
                      <TableCell className="text-gray-300 font-mono text-sm">{cnpj.cnpj}</TableCell>
                      <TableCell className="text-gray-300">{cnpj.nome}</TableCell>
                      <TableCell>
                        <Badge className="bg-green-600 text-white">
                          {cnpj.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}