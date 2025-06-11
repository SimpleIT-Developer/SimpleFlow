import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Receipt, Search, Calendar, DollarSign, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const mockContasReceber = [
  {
    id: 1,
    descricao: "Venda de Produtos - Pedido #1234",
    valor: 5800.00,
    dataVencimento: "2024-06-20",
    status: "pendente",
    categoria: "vendas",
    cliente: "Empresa ABC Ltda"
  },
  {
    id: 2,
    descricao: "Prestação de Serviços - Consultoria",
    valor: 12000.00,
    dataVencimento: "2024-06-15",
    status: "pendente",
    categoria: "servicos",
    cliente: "Tech Solutions Corp"
  },
  {
    id: 3,
    descricao: "Venda Online - Loja Virtual",
    valor: 2340.75,
    dataVencimento: "2024-06-10",
    status: "recebido",
    categoria: "vendas",
    cliente: "Cliente Online"
  }
];

export default function ContasReceberPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: contas, isLoading } = useQuery({
    queryKey: ["/api/contas/receber", search, statusFilter],
    queryFn: () => Promise.resolve(mockContasReceber),
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'recebido':
        return <Badge className="bg-green-500/20 text-green-500">Recebido</Badge>;
      case 'vencida':
        return <Badge className="bg-red-500/20 text-red-500">Vencida</Badge>;
      case 'pendente':
        return <Badge className="bg-yellow-500/20 text-yellow-500">Pendente</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const totalPendente = contas?.filter(c => c.status === 'pendente').reduce((sum, c) => sum + c.valor, 0) || 0;
  const totalRecebido = contas?.filter(c => c.status === 'recebido').reduce((sum, c) => sum + c.valor, 0) || 0;

  return (
    <Layout currentPage="Contas a Receber">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Contas a Receber</h1>
            <p className="text-gray-400 text-sm">
              Acompanhe seus recebimentos pendentes
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glassmorphism border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium">A Receber</p>
                  <p className="text-2xl font-bold text-white">{formatCurrency(totalPendente)}</p>
                </div>
                <div className="p-3 rounded-lg bg-primary/20">
                  <Receipt className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glassmorphism border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium">Já Recebido</p>
                  <p className="text-2xl font-bold text-white">{formatCurrency(totalRecebido)}</p>
                </div>
                <div className="p-3 rounded-lg bg-green-500/20">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glassmorphism border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium">Total de Contas</p>
                  <p className="text-2xl font-bold text-white">{contas?.length || 0}</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-500/20">
                  <DollarSign className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="glassmorphism border-white/20">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por descrição ou cliente..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48 bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/20">
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="vencida">Vencida</SelectItem>
                  <SelectItem value="recebido">Recebido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="glassmorphism border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Contas a Receber</CardTitle>
            <CardDescription className="text-gray-400">
              Seus recebimentos pendentes e realizados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {contas?.map((conta) => (
                <div
                  key={conta.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-lg ${
                      conta.status === 'recebido' ? 'bg-green-500/20' : 
                      conta.status === 'pendente' ? 'bg-yellow-500/20' : 'bg-red-500/20'
                    }`}>
                      {conta.status === 'recebido' ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <Clock className="w-4 h-4 text-yellow-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-white font-medium">{conta.descricao}</p>
                      <p className="text-gray-400 text-sm">
                        {conta.cliente} • Venc: {format(new Date(conta.dataVencimento), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-white font-bold">{formatCurrency(conta.valor)}</p>
                      {getStatusBadge(conta.status)}
                    </div>
                    {conta.status !== 'recebido' && (
                      <Button
                        size="sm"
                        className="bg-primary hover:bg-primary/90 text-white"
                      >
                        Registrar Recebimento
                      </Button>
                    )}
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