import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PiggyBank, Search, TrendingUp, TrendingDown, Download, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const mockExtrato = [
  {
    id: 1,
    data: "2024-06-11",
    descricao: "Venda - Produtos diversos",
    valor: 5800.00,
    tipo: "entrada",
    saldoAnterior: 15200.00,
    saldoAtual: 21000.00,
    categoria: "vendas"
  },
  {
    id: 2,
    data: "2024-06-11",
    descricao: "Pagamento - Fornecedor ABC",
    valor: -2300.00,
    tipo: "saida",
    saldoAnterior: 21000.00,
    saldoAtual: 18700.00,
    categoria: "compras"
  },
  {
    id: 3,
    data: "2024-06-10",
    descricao: "Recebimento PIX - Cliente XYZ",
    valor: 3200.00,
    tipo: "entrada",
    saldoAnterior: 12000.00,
    saldoAtual: 15200.00,
    categoria: "vendas"
  },
  {
    id: 4,
    data: "2024-06-10",
    descricao: "Aluguel - Escritório",
    valor: -3200.00,
    tipo: "saida",
    saldoAnterior: 15200.00,
    saldoAtual: 12000.00,
    categoria: "despesas"
  }
];

export default function ExtratoPage() {
  const [search, setSearch] = useState("");
  const [contaFilter, setContaFilter] = useState("todas");
  const [tipoFilter, setTipoFilter] = useState("all");

  const { data: extrato, isLoading } = useQuery({
    queryKey: ["/api/extrato", search, contaFilter, tipoFilter],
    queryFn: () => Promise.resolve(mockExtrato),
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const saldoAtual = extrato?.[0]?.saldoAtual || 0;
  const totalEntradas = extrato?.filter(e => e.tipo === 'entrada').reduce((sum, e) => sum + e.valor, 0) || 0;
  const totalSaidas = extrato?.filter(e => e.tipo === 'saida').reduce((sum, e) => sum + Math.abs(e.valor), 0) || 0;

  return (
    <Layout currentPage="Extrato Bancário">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Extrato Bancário</h1>
            <p className="text-gray-400 text-sm">
              Histórico completo de movimentações
            </p>
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-white">
            <Download className="w-4 h-4 mr-2" />
            Exportar Extrato
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glassmorphism border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium">Saldo Atual</p>
                  <p className="text-2xl font-bold text-white">{formatCurrency(saldoAtual)}</p>
                </div>
                <div className="p-3 rounded-lg bg-primary/20">
                  <PiggyBank className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glassmorphism border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium">Total Entradas</p>
                  <p className="text-2xl font-bold text-white">{formatCurrency(totalEntradas)}</p>
                </div>
                <div className="p-3 rounded-lg bg-green-500/20">
                  <TrendingUp className="w-6 h-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glassmorphism border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium">Total Saídas</p>
                  <p className="text-2xl font-bold text-white">{formatCurrency(totalSaidas)}</p>
                </div>
                <div className="p-3 rounded-lg bg-red-500/20">
                  <TrendingDown className="w-6 h-6 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="glassmorphism border-white/20">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por descrição..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                  />
                </div>
              </div>
              
              <Select value={contaFilter} onValueChange={setContaFilter}>
                <SelectTrigger className="w-full md:w-48 bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Selecionar conta" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/20">
                  <SelectItem value="todas">Todas as Contas</SelectItem>
                  <SelectItem value="corrente">Conta Corrente</SelectItem>
                  <SelectItem value="poupanca">Poupança</SelectItem>
                  <SelectItem value="investimento">Investimentos</SelectItem>
                </SelectContent>
              </Select>

              <Select value={tipoFilter} onValueChange={setTipoFilter}>
                <SelectTrigger className="w-full md:w-48 bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Tipo de movimentação" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/20">
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="entrada">Entradas</SelectItem>
                  <SelectItem value="saida">Saídas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Extrato List */}
        <Card className="glassmorphism border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Movimentações</CardTitle>
            <CardDescription className="text-gray-400">
              Histórico detalhado de entradas e saídas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {extrato?.map((movimento) => (
                <div
                  key={movimento.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-lg ${
                      movimento.tipo === 'entrada' ? 'bg-green-500/20' : 'bg-red-500/20'
                    }`}>
                      {movimento.tipo === 'entrada' ? (
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-white font-medium">{movimento.descricao}</p>
                      <p className="text-gray-400 text-sm">
                        {format(new Date(movimento.data), 'dd/MM/yyyy', { locale: ptBR })} • {movimento.categoria}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${
                      movimento.valor > 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {formatCurrency(Math.abs(movimento.valor))}
                    </p>
                    <p className="text-gray-400 text-sm">
                      Saldo: {formatCurrency(movimento.saldoAtual)}
                    </p>
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