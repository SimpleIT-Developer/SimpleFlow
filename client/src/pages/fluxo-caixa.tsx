import { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  TrendingUp, 
  ArrowLeft, 
  ArrowRight, 
  Calendar,
  DollarSign,
  TrendingDown,
  Wallet,
  Calculator,
  FileText,
  Download,
  Eye,
  EyeOff
} from "lucide-react";
import { format, addDays, subDays, startOfDay, isBefore, isAfter, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FluxoItem {
  id: string;
  tipo: 'entrada' | 'saida';
  descricao: string;
  valor: number;
  data: Date;
  categoria: string;
  status: 'previsto' | 'realizado';
  conta: string;
  documento?: string;
  observacoes?: string;
}

interface SaldoConta {
  conta: string;
  saldoInicial: number;
  saldoFinal: number;
}

export default function FluxoCaixaPage() {
  const { toast } = useToast();
  const [dataAtual, setDataAtual] = useState(new Date());
  const [mostrarRealizados, setMostrarRealizados] = useState(true);
  const [mostrarPrevistos, setMostrarPrevistos] = useState(true);
  
  // Dados de exemplo - serão substituídos pelos webhooks do ERP
  const [fluxoItems] = useState<FluxoItem[]>([
    {
      id: '1',
      tipo: 'entrada',
      descricao: 'Recebimento Cliente ABC Ltda',
      valor: 15000,
      data: new Date(),
      categoria: 'Vendas',
      status: 'realizado',
      conta: 'Banco do Brasil - CC 12345',
      documento: 'NF 001234'
    },
    {
      id: '2',
      tipo: 'saida',
      descricao: 'Pagamento Fornecedor XYZ',
      valor: 8500,
      data: addDays(new Date(), 1),
      categoria: 'Compras',
      status: 'previsto',
      conta: 'Itaú - CC 67890',
      documento: 'Boleto 5678'
    },
    {
      id: '3',
      tipo: 'entrada',
      descricao: 'Recebimento Vendas à Vista',
      valor: 3200,
      data: addDays(new Date(), 2),
      categoria: 'Vendas',
      status: 'previsto',
      conta: 'Caixa Loja',
    },
    {
      id: '4',
      tipo: 'saida',
      descricao: 'Pagamento Salários',
      valor: 25000,
      data: addDays(new Date(), 5),
      categoria: 'Folha de Pagamento',
      status: 'previsto',
      conta: 'Banco do Brasil - CC 12345',
      observacoes: 'Pagamento mensal da folha'
    }
  ]);

  const [saldosContas] = useState<SaldoConta[]>([
    { conta: 'Banco do Brasil - CC 12345', saldoInicial: 45000, saldoFinal: 0 },
    { conta: 'Itaú - CC 67890', saldoInicial: 23000, saldoFinal: 0 },
    { conta: 'Caixa Loja', saldoInicial: 1500, saldoFinal: 0 }
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

  const filtrarItemsPorData = (data: Date) => {
    return fluxoItems.filter(item => isSameDay(item.data, data));
  };

  const calcularSaldoDiario = (data: Date) => {
    const items = filtrarItemsPorData(data);
    const entradas = items
      .filter(item => item.tipo === 'entrada' && (mostrarRealizados && item.status === 'realizado' || mostrarPrevistos && item.status === 'previsto'))
      .reduce((sum, item) => sum + item.valor, 0);
    const saidas = items
      .filter(item => item.tipo === 'saida' && (mostrarRealizados && item.status === 'realizado' || mostrarPrevistos && item.status === 'previsto'))
      .reduce((sum, item) => sum + item.valor, 0);
    
    return { entradas, saidas, saldo: entradas - saidas };
  };

  const calcularSaldoAcumulado = (dataFim: Date) => {
    const hoje = startOfDay(new Date());
    let saldoTotal = saldosContas.reduce((sum, conta) => sum + conta.saldoInicial, 0);
    
    // Somar todos os movimentos até a data especificada
    for (let d = hoje; d <= dataFim; d = addDays(d, 1)) {
      const { saldo } = calcularSaldoDiario(d);
      saldoTotal += saldo;
    }
    
    return saldoTotal;
  };

  const gerarProjecao = (dias: number) => {
    const projecao = [];
    const hoje = startOfDay(new Date());
    
    for (let i = 0; i < dias; i++) {
      const data = addDays(hoje, i);
      const { entradas, saidas, saldo } = calcularSaldoDiario(data);
      const saldoAcumulado = calcularSaldoAcumulado(data);
      
      projecao.push({
        data,
        entradas,
        saidas,
        saldo,
        saldoAcumulado
      });
    }
    
    return projecao;
  };

  const gerarRelatorio = () => {
    toast({
      title: "Relatório gerado",
      description: "O relatório de fluxo de caixa foi gerado com sucesso"
    });
  };

  const itemsHoje = filtrarItemsPorData(dataAtual);
  const { entradas, saidas, saldo } = calcularSaldoDiario(dataAtual);
  const saldoAcumulado = calcularSaldoAcumulado(dataAtual);
  const projecao7Dias = gerarProjecao(7);

  return (
    <Layout currentPage="fluxo-caixa">
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <TrendingUp className="w-8 h-8 text-primary" />
                  <h1 className="text-3xl font-bold text-white">Fluxo de Caixa</h1>
                </div>
                <p className="text-gray-400">
                  Análise detalhada do fluxo de caixa com projeções e simulações
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  onClick={() => setMostrarRealizados(!mostrarRealizados)}
                  className={mostrarRealizados ? 'bg-green-500/20 border-green-500' : ''}
                >
                  {mostrarRealizados ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
                  Realizados
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setMostrarPrevistos(!mostrarPrevistos)}
                  className={mostrarPrevistos ? 'bg-blue-500/20 border-blue-500' : ''}
                >
                  {mostrarPrevistos ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
                  Previstos
                </Button>
                <Button onClick={gerarRelatorio} className="bg-primary hover:bg-primary/90">
                  <Download className="w-4 h-4 mr-2" />
                  Gerar Relatório
                </Button>
              </div>
            </div>
          </div>

          {/* Navegação de Data */}
          <Card className="glass-card border-primary/20 mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                {!isSameDay(dataAtual, new Date()) && (
                  <Button
                    variant="ghost"
                    onClick={() => navegarData('anterior')}
                    className="text-white hover:bg-white/10"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Anterior
                  </Button>
                )}
                {isSameDay(dataAtual, new Date()) && <div></div>}
                
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
                       isBefore(dataAtual, new Date()) ? 'Passado' : 'Futuro'}
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

          {/* Resumo do Dia */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card className="glass-card border-green-500/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-400 text-sm font-medium">Entradas</p>
                    <p className="text-2xl font-bold text-white">
                      R$ {entradas.toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-red-500/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-400 text-sm font-medium">Saídas</p>
                    <p className="text-2xl font-bold text-white">
                      R$ {saidas.toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <TrendingDown className="w-8 h-8 text-red-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-primary text-sm font-medium">Saldo do Dia</p>
                    <p className={`text-2xl font-bold ${saldo >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      R$ {saldo.toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <Calculator className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-yellow-500/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-400 text-sm font-medium">Saldo Acumulado</p>
                    <p className={`text-2xl font-bold ${saldoAcumulado >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      R$ {saldoAcumulado.toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <Wallet className="w-8 h-8 text-yellow-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="movimentacao" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="movimentacao">Movimentação do Dia</TabsTrigger>
              <TabsTrigger value="projecao">Projeção 7 Dias</TabsTrigger>
              <TabsTrigger value="contas">Saldos por Conta</TabsTrigger>
            </TabsList>

            <TabsContent value="movimentacao">
              <Card className="glass-card border-primary/20">
                <CardHeader>
                  <CardTitle className="text-white">
                    Movimentação de {format(dataAtual, "dd/MM/yyyy")}
                  </CardTitle>
                  <CardDescription>
                    {itemsHoje.length === 0 ? 'Nenhuma movimentação encontrada para esta data' : 
                     `${itemsHoje.length} movimentação(ões) encontrada(s)`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {itemsHoje.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-400">Nenhuma movimentação para esta data</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {itemsHoje.map((item) => (
                        <div key={item.id} className="p-4 rounded-lg bg-white/5 border border-white/10">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <Badge 
                                  variant="outline"
                                  className={`${item.tipo === 'entrada' ? 'border-green-500 text-green-400' : 'border-red-500 text-red-400'}`}
                                >
                                  {item.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                                </Badge>
                                <Badge 
                                  variant="outline"
                                  className={`${item.status === 'realizado' ? 'border-green-500 text-green-400' : 'border-blue-500 text-blue-400'}`}
                                >
                                  {item.status === 'realizado' ? 'Realizado' : 'Previsto'}
                                </Badge>
                              </div>
                              <h3 className="font-semibold text-white">{item.descricao}</h3>
                              <p className="text-sm text-gray-400">
                                {item.categoria} • {item.conta}
                                {item.documento && ` • ${item.documento}`}
                              </p>
                              {item.observacoes && (
                                <p className="text-xs text-gray-500 mt-1">{item.observacoes}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className={`text-xl font-bold ${item.tipo === 'entrada' ? 'text-green-400' : 'text-red-400'}`}>
                                {item.tipo === 'entrada' ? '+' : '-'}R$ {item.valor.toLocaleString('pt-BR')}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="projecao">
              <Card className="glass-card border-primary/20">
                <CardHeader>
                  <CardTitle className="text-white">Projeção - Próximos 7 Dias</CardTitle>
                  <CardDescription>
                    Análise do fluxo de caixa para os próximos dias
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {projecao7Dias.map((dia, index) => (
                      <div key={index} className="p-4 rounded-lg bg-white/5 border border-white/10">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                          <div>
                            <p className="font-semibold text-white">
                              {format(dia.data, "dd/MM/yyyy")}
                            </p>
                            <p className="text-xs text-gray-400">
                              {format(dia.data, "EEEE", { locale: ptBR })}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-green-400 font-medium">
                              +R$ {dia.entradas.toLocaleString('pt-BR')}
                            </p>
                            <p className="text-xs text-gray-400">Entradas</p>
                          </div>
                          <div className="text-center">
                            <p className="text-red-400 font-medium">
                              -R$ {dia.saidas.toLocaleString('pt-BR')}
                            </p>
                            <p className="text-xs text-gray-400">Saídas</p>
                          </div>
                          <div className="text-center">
                            <p className={`font-medium ${dia.saldo >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              R$ {dia.saldo.toLocaleString('pt-BR')}
                            </p>
                            <p className="text-xs text-gray-400">Saldo Dia</p>
                          </div>
                          <div className="text-center">
                            <p className={`font-bold ${dia.saldoAcumulado >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              R$ {dia.saldoAcumulado.toLocaleString('pt-BR')}
                            </p>
                            <p className="text-xs text-gray-400">Acumulado</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contas">
              <Card className="glass-card border-primary/20">
                <CardHeader>
                  <CardTitle className="text-white">Saldos por Conta</CardTitle>
                  <CardDescription>
                    Distribuição dos saldos por conta bancária e caixa
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {saldosContas.map((conta, index) => (
                      <div key={index} className="p-4 rounded-lg bg-white/5 border border-white/10">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-white">{conta.conta}</h3>
                            <p className="text-sm text-gray-400">Saldo inicial do período</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-white">
                              R$ {conta.saldoInicial.toLocaleString('pt-BR')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-white">Total Geral</h3>
                          <p className="text-sm text-primary">Soma de todas as contas</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary">
                            R$ {saldosContas.reduce((sum, conta) => sum + conta.saldoInicial, 0).toLocaleString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}