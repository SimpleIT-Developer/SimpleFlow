import { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Receipt, 
  Search, 
  Calendar, 
  DollarSign, 
  Download,
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  Clock,
  CheckCircle
} from "lucide-react";
import { format, addDays, subDays, isBefore, isSameDay, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TituloReceber {
  id: string;
  descricao: string;
  valor: number;
  vencimento: Date;
  categoria: string;
  cliente: string;
  documento: string;
  conta: string;
  status: 'pendente' | 'recebido' | 'simulado';
}

export default function ContasReceberPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [dataAtual, setDataAtual] = useState(new Date());
  
  const [titulos, setTitulos] = useState<TituloReceber[]>([
    {
      id: '1',
      descricao: 'Cliente XYZ - Vendas Produto A',
      valor: 8500.00,
      vencimento: subDays(new Date(), 1),
      categoria: 'Vendas',
      cliente: 'XYZ Comércio Ltda',
      documento: 'NF 98765',
      conta: 'Banco do Brasil - CC 12345',
      status: 'pendente'
    },
    {
      id: '2',
      descricao: 'Prestação de Serviços - Cliente ABC',
      valor: 3200.00,
      vencimento: new Date(),
      categoria: 'Serviços',
      cliente: 'ABC Empresa Ltd',
      documento: 'NFS 54321',
      conta: 'Itaú - CC 67890',
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

  const getTitulosVencidos = () => {
    const hoje = startOfDay(new Date());
    if (!isSameDay(dataAtual, hoje)) return [];
    
    return titulos.filter(titulo => 
      isBefore(titulo.vencimento, hoje) && 
      titulo.status === 'pendente' &&
      (titulo.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
       titulo.cliente.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  const getTitulosDoDia = () => {
    return titulos.filter(titulo => 
      isSameDay(titulo.vencimento, dataAtual) && 
      titulo.status === 'pendente' &&
      (titulo.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
       titulo.cliente.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  const simularRecebimento = (id: string) => {
    setTitulos(prev => prev.map(titulo => 
      titulo.id === id ? { ...titulo, status: 'simulado' } : titulo
    ));
    toast({
      title: "Recebimento simulado",
      description: "O título foi marcado como recebido na simulação"
    });
  };

  const gerarRelatorio = () => {
    toast({
      title: "Relatório gerado",
      description: "Relatório de análise criado com sucesso"
    });
  };

  const titulosVencidos = getTitulosVencidos();
  const titulosDoDia = getTitulosDoDia();

  return (
    <Layout currentPage="contas-receber">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Contas a Receber</h1>
            <p className="text-gray-400 text-sm">
              Análise de títulos com simulação de recebimentos para otimização do fluxo de caixa
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

        {/* Busca */}
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por descrição ou cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/10 border-white/20 text-white"
              />
            </div>
          </CardContent>
        </Card>

        {/* Títulos Vencidos */}
        {titulosVencidos.length > 0 && (
          <Card className="bg-red-500/10 border-red-500/20">
            <CardHeader>
              <CardTitle className="text-red-400 flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5" />
                <span>Títulos Vencidos ({titulosVencidos.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {titulosVencidos.map((titulo) => (
                  <div key={titulo.id} className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-white mb-1">{titulo.descricao}</h3>
                        <p className="text-sm text-gray-400">Cliente: {titulo.cliente}</p>
                      </div>
                      <div className="text-right space-y-2">
                        <p className="text-xl font-bold text-green-400">R$ {titulo.valor.toLocaleString('pt-BR')}</p>
                        <Button size="sm" onClick={() => simularRecebimento(titulo.id)} className="bg-green-600 hover:bg-green-700">
                          Simular Recebimento
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Títulos do Dia */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">
              Títulos com Vencimento em {format(dataAtual, "dd/MM/yyyy")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {titulosDoDia.length === 0 ? (
              <div className="text-center py-8">
                <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">Nenhum título com vencimento nesta data</p>
              </div>
            ) : (
              <div className="space-y-4">
                {titulosDoDia.map((titulo) => (
                  <div key={titulo.id} className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-white mb-1">{titulo.descricao}</h3>
                        <p className="text-sm text-gray-400">Cliente: {titulo.cliente}</p>
                      </div>
                      <div className="text-right space-y-2">
                        <p className="text-xl font-bold text-green-400">R$ {titulo.valor.toLocaleString('pt-BR')}</p>
                        <Button size="sm" onClick={() => simularRecebimento(titulo.id)} className="bg-green-600 hover:bg-green-700">
                          Simular Recebimento
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}