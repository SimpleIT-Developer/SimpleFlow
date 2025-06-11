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
  Download
} from "lucide-react";
import { format, addDays, subDays, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function FluxoCaixaPage() {
  const { toast } = useToast();
  const [dataAtual, setDataAtual] = useState(new Date());
  
  const navegarData = (direcao: 'anterior' | 'proximo') => {
    if (direcao === 'anterior') {
      setDataAtual(subDays(dataAtual, 1));
    } else {
      setDataAtual(addDays(dataAtual, 1));
    }
  };

  const gerarRelatorio = () => {
    toast({
      title: "Relatório gerado",
      description: "O relatório de fluxo de caixa foi gerado com sucesso"
    });
  };

  return (
    <Layout currentPage="fluxo-caixa">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Fluxo de Caixa</h1>
            <p className="text-gray-400 text-sm">
              Análise detalhada do fluxo de caixa com projeções e simulações
            </p>
          </div>
          <Button onClick={gerarRelatorio} className="bg-primary hover:bg-primary/90">
            <Download className="w-4 h-4 mr-2" />
            Gerar Relatório
          </Button>
        </div>

        {/* Navegação de Data */}
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              {!isSameDay(dataAtual, new Date()) && (
                <Button variant="ghost" onClick={() => navegarData('anterior')} className="text-white hover:bg-white/10">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Anterior
                </Button>
              )}
              {isSameDay(dataAtual, new Date()) && <div></div>}
              
              <div className="text-center">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  <span className="text-2xl font-bold text-white">
                    {format(dataAtual, "dd 'de' MMMM, yyyy", { locale: ptBR })}
                  </span>
                </div>
              </div>
              
              <Button variant="ghost" onClick={() => navegarData('proximo')} className="text-white hover:bg-white/10">
                Próximo
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Resumo do Dia */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-400 text-sm font-medium">Entradas</p>
                  <p className="text-2xl font-bold text-white">R$ 15.800</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-400 text-sm font-medium">Saídas</p>
                  <p className="text-2xl font-bold text-white">R$ 8.500</p>
                </div>
                <TrendingDown className="w-8 h-8 text-red-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-primary text-sm font-medium">Saldo do Dia</p>
                  <p className="text-2xl font-bold text-green-400">R$ 7.300</p>
                </div>
                <TrendingUp className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-400 text-sm font-medium">Saldo Acumulado</p>
                  <p className="text-2xl font-bold text-green-400">R$ 246.800</p>
                </div>
                <Wallet className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs de Fluxo */}
        <Tabs defaultValue="movimentacao" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white/10">
            <TabsTrigger value="movimentacao">Movimentação do Dia</TabsTrigger>
            <TabsTrigger value="projecao">Projeção 7 Dias</TabsTrigger>
            <TabsTrigger value="contas">Saldos por Conta</TabsTrigger>
          </TabsList>

          <TabsContent value="movimentacao">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">
                  Movimentação de {format(dataAtual, "dd/MM/yyyy")}
                </CardTitle>
                <CardDescription>
                  Entradas e saídas do dia selecionado
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400">Configure os webhooks para ver as movimentações reais</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="projecao">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Projeção - Próximos 7 Dias</CardTitle>
                <CardDescription>
                  Análise do fluxo de caixa para os próximos dias
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400">Configure os webhooks para ver as projeções reais</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contas">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Saldos por Conta</CardTitle>
                <CardDescription>
                  Distribuição dos saldos por conta bancária e caixa
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400">Configure os webhooks para ver os saldos reais</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}