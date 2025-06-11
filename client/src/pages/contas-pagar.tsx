import { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  CreditCard, 
  Search, 
  Calendar, 
  DollarSign, 
  Filter, 
  FileText, 
  Download,
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  Clock,
  CheckCircle
} from "lucide-react";
import { format, addDays, subDays, isBefore, isSameDay, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TituloPagar {
  id: string;
  descricao: string;
  valor: number;
  vencimento: Date;
  categoria: string;
  fornecedor: string;
  documento: string;
  observacoes?: string;
  conta: string;
  natureza: string;
  centroCusto: string;
  status: 'pendente' | 'pago' | 'simulado';
}

export default function ContasPagarPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [dataAtual, setDataAtual] = useState(new Date());
  
  // Dados de exemplo - serão substituídos pelos webhooks do ERP
  const [titulos, setTitulos] = useState<TituloPagar[]>([
    {
      id: '1',
      descricao: 'Fornecedor ABC - Material de Escritório',
      valor: 2500.00,
      vencimento: subDays(new Date(), 2), // Vencido
      categoria: 'Material de Escritório',
      fornecedor: 'ABC Suprimentos Ltda',
      documento: 'NF 12345',
      conta: 'Banco do Brasil - CC 12345',
      natureza: 'Despesas Operacionais',
      centroCusto: 'Administrativo',
      status: 'pendente'
    },
    {
      id: '2',
      descricao: 'Energia Elétrica - Janeiro',
      valor: 1800.00,
      vencimento: new Date(), // Hoje
      categoria: 'Utilidades',
      fornecedor: 'Companhia de Energia',
      documento: 'Conta 67890',
      conta: 'Itaú - CC 67890',
      natureza: 'Despesas Administrativas',
      centroCusto: 'Administrativo',
      status: 'pendente'
    },
    {
      id: '3',
      descricao: 'Aluguel - Janeiro',
      valor: 5000.00,
      vencimento: addDays(new Date(), 1), // Amanhã
      categoria: 'Imóveis',
      fornecedor: 'Imobiliária XYZ',
      documento: 'Contrato 001',
      conta: 'Banco do Brasil - CC 12345',
      natureza: 'Despesas Fixas',
      centroCusto: 'Administrativo',
      status: 'pendente'
    },
    {
      id: '4',
      descricao: 'Pagamento Fornecedor DEF',
      valor: 3200.00,
      vencimento: addDays(new Date(), 2), // Depois de amanhã
      categoria: 'Compras',
      fornecedor: 'DEF Produtos Ltda',
      documento: 'NF 54321',
      conta: 'Caixa',
      natureza: 'Custo dos Produtos',
      centroCusto: 'Produção',
      status: 'pendente'
    }
  ]);

  const navegarData = (direcao: 'anterior' | 'proximo') => {
    if (direcao === 'anterior') {
      setDataAtual(subDays(dataAtual, 1));
    } else {
      setDataAtual(addDays(dataAtual, 1));
    }
  };

  const voltarHoje = () => {
    setDataAtual(new Date());
  };

  const getTitulosVencidos = () => {
    const hoje = startOfDay(new Date());
    return titulos.filter(titulo => 
      isBefore(titulo.vencimento, hoje) && 
      titulo.status === 'pendente' &&
      (titulo.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
       titulo.fornecedor.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  const getTitulosDoDia = () => {
    return titulos.filter(titulo => 
      isSameDay(titulo.vencimento, dataAtual) && 
      titulo.status === 'pendente' &&
      (titulo.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
       titulo.fornecedor.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  const simularPagamento = (id: string) => {
    setTitulos(prev => prev.map(titulo => 
      titulo.id === id ? { ...titulo, status: 'simulado' } : titulo
    ));
    toast({
      title: "Pagamento simulado",
      description: "O título foi marcado como pago na simulação"
    });
  };

  const reverterSimulacao = (id: string) => {
    setTitulos(prev => prev.map(titulo => 
      titulo.id === id ? { ...titulo, status: 'pendente' } : titulo
    ));
    toast({
      title: "Simulação revertida",
      description: "O título voltou ao status pendente"
    });
  };

  const gerarRelatorio = () => {
    const titulosParaPagar = titulos.filter(t => t.status === 'simulado');
    const titulosParaReagendar = titulos.filter(t => t.status === 'pendente');
    
    toast({
      title: "Relatório gerado",
      description: `${titulosParaPagar.length} títulos para pagar, ${titulosParaReagendar.length} para reagendar`
    });
  };

  const titulosVencidos = getTitulosVencidos();
  const titulosDoDia = getTitulosDoDia();
  const totalVencidos = titulosVencidos.reduce((sum, titulo) => sum + titulo.valor, 0);
  const totalDoDia = titulosDoDia.reduce((sum, titulo) => sum + titulo.valor, 0);
  const totalSimulado = titulos.filter(t => t.status === 'simulado').reduce((sum, titulo) => sum + titulo.valor, 0);

  return (
    <Layout currentPage="contas-pagar">
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <CreditCard className="w-8 h-8 text-primary" />
                  <h1 className="text-3xl font-bold text-white">Contas a Pagar</h1>
                </div>
                <p className="text-gray-400">
                  Análise de títulos com simulação de pagamentos para otimização do fluxo de caixa
                </p>
              </div>
              <Button onClick={gerarRelatorio} className="bg-primary hover:bg-primary/90">
                <Download className="w-4 h-4 mr-2" />
                Gerar Relatório de Análise
              </Button>
            </div>
          </div>

          {/* Navegação de Data */}
          <Card className="glass-card border-primary/20 mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={() => navegarData('anterior')}
                  className="text-white hover:bg-white/10"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Anterior
                </Button>
                
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      <span className="text-2xl font-bold text-white">
                        {format(dataAtual, "dd 'de' MMMM, yyyy", { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">
                      {isSameDay(dataAtual, new Date()) ? 'Hoje' : 
                       isBefore(dataAtual, new Date()) ? 'Data passada' : 'Data futura'}
                    </p>
                  </div>
                  {!isSameDay(dataAtual, new Date()) && (
                    <Button
                      variant="outline"
                      onClick={voltarHoje}
                      size="sm"
                    >
                      Hoje
                    </Button>
                  )}
                </div>
                
                <Button
                  variant="ghost"
                  onClick={() => navegarData('proximo')}
                  className="text-white hover:bg-white/10"
                >
                  Próximo
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card className="glass-card border-red-500/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-400 text-sm font-medium">Títulos Vencidos</p>
                    <p className="text-lg font-bold text-white">{titulosVencidos.length}</p>
                    <p className="text-sm text-red-400">R$ {totalVencidos.toLocaleString('pt-BR')}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-red-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-yellow-500/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-400 text-sm font-medium">Vencimento Hoje</p>
                    <p className="text-lg font-bold text-white">{titulosDoDia.length}</p>
                    <p className="text-sm text-yellow-400">R$ {totalDoDia.toLocaleString('pt-BR')}</p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-green-500/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-400 text-sm font-medium">Pagamentos Simulados</p>
                    <p className="text-lg font-bold text-white">{titulos.filter(t => t.status === 'simulado').length}</p>
                    <p className="text-sm text-green-400">R$ {totalSimulado.toLocaleString('pt-BR')}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-primary text-sm font-medium">Total Geral</p>
                    <p className="text-lg font-bold text-white">{titulos.filter(t => t.status !== 'simulado').length}</p>
                    <p className="text-sm text-primary">R$ {titulos.filter(t => t.status !== 'simulado').reduce((sum, t) => sum + t.valor, 0).toLocaleString('pt-BR')}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Busca */}
          <Card className="glass-card border-primary/20 mb-6">
            <CardContent className="p-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar por descrição ou fornecedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Títulos Vencidos */}
          {titulosVencidos.length > 0 && (
            <Card className="glass-card border-red-500/20 mb-6">
              <CardHeader>
                <CardTitle className="text-red-400 flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5" />
                  <span>Títulos Vencidos ({titulosVencidos.length})</span>
                </CardTitle>
                <CardDescription>
                  Títulos com vencimento anterior à data atual
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {titulosVencidos.map((titulo) => (
                    <div key={titulo.id} className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <Badge variant="outline" className="border-red-500 text-red-400">
                              Vencido
                            </Badge>
                            <span className="text-sm text-gray-400">{titulo.documento}</span>
                          </div>
                          <h3 className="font-semibold text-white mb-1">{titulo.descricao}</h3>
                          <div className="grid grid-cols-2 gap-4 text-sm text-gray-400">
                            <span>Fornecedor: {titulo.fornecedor}</span>
                            <span>Vencimento: {format(titulo.vencimento, "dd/MM/yyyy")}</span>
                            <span>Categoria: {titulo.categoria}</span>
                            <span>Conta: {titulo.conta}</span>
                          </div>
                        </div>
                        <div className="text-right space-y-2">
                          <p className="text-xl font-bold text-red-400">
                            R$ {titulo.valor.toLocaleString('pt-BR')}
                          </p>
                          {titulo.status === 'pendente' ? (
                            <Button
                              size="sm"
                              onClick={() => simularPagamento(titulo.id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Simular Pagamento
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => reverterSimulacao(titulo.id)}
                              className="border-green-500 text-green-400"
                            >
                              Reverter Simulação
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Títulos do Dia */}
          <Card className="glass-card border-primary/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span>Títulos com Vencimento em {format(dataAtual, "dd/MM/yyyy")} ({titulosDoDia.length})</span>
              </CardTitle>
              <CardDescription>
                {titulosDoDia.length === 0 ? 'Nenhum título com vencimento nesta data' : 
                 `${titulosDoDia.length} título(s) encontrado(s)`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {titulosDoDia.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400">Nenhum título com vencimento nesta data</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {titulosDoDia.map((titulo) => (
                    <div key={titulo.id} className="p-4 rounded-lg bg-white/5 border border-white/10">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <Badge 
                              variant="outline" 
                              className={titulo.status === 'simulado' ? 
                                "border-green-500 text-green-400" : 
                                "border-yellow-500 text-yellow-400"
                              }
                            >
                              {titulo.status === 'simulado' ? 'Pago (Simulado)' : 'Pendente'}
                            </Badge>
                            <span className="text-sm text-gray-400">{titulo.documento}</span>
                          </div>
                          <h3 className="font-semibold text-white mb-1">{titulo.descricao}</h3>
                          <div className="grid grid-cols-2 gap-4 text-sm text-gray-400">
                            <span>Fornecedor: {titulo.fornecedor}</span>
                            <span>Centro de Custo: {titulo.centroCusto}</span>
                            <span>Categoria: {titulo.categoria}</span>
                            <span>Natureza: {titulo.natureza}</span>
                          </div>
                          {titulo.observacoes && (
                            <p className="text-xs text-gray-500 mt-2">{titulo.observacoes}</p>
                          )}
                        </div>
                        <div className="text-right space-y-2">
                          <p className="text-xl font-bold text-white">
                            R$ {titulo.valor.toLocaleString('pt-BR')}
                          </p>
                          {titulo.status === 'pendente' ? (
                            <Button
                              size="sm"
                              onClick={() => simularPagamento(titulo.id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Simular Pagamento
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => reverterSimulacao(titulo.id)}
                              className="border-green-500 text-green-400"
                            >
                              Reverter Simulação
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}