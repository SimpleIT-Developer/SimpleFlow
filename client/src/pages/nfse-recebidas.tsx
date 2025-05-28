import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, RefreshCw, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { NFSeRecebida, NFSeResponse } from "@shared/schema";

// Função para formatar CNPJ/CPF
function formatCNPJCPF(doc: string) {
  if (!doc) return doc;
  const numbers = doc.replace(/\D/g, '');
  
  if (numbers.length === 11) {
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  } else if (numbers.length === 14) {
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  
  return doc;
}

// Função para formatar moeda
function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

// Função para formatar data
function formatDate(dateString: string) {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  } catch {
    return dateString;
  }
}

export default function NFSeRecebidasPage() {
  const { toast } = useToast();
  
  // Estados dos filtros
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [empresa, setEmpresa] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [local, setLocal] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [sortBy] = useState("nfse_data_hora");
  const [sortOrder] = useState("desc");

  const { data: nfseData, isLoading, error } = useQuery({
    queryKey: ["nfse-recebidas", { 
      search, 
      status, 
      empresa, 
      fornecedor, 
      local,
      dataInicio, 
      dataFim, 
      page, 
      limit, 
      sortBy, 
      sortOrder 
    }],
    queryFn: async () => {
      const params = new URLSearchParams({
        search,
        status,
        empresa,
        fornecedor,
        local,
        dataInicio,
        dataFim,
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder
      });
      
      const response = await fetch(`/api/nfse-recebidas?${params}`);
      if (!response.ok) {
        throw new Error("Erro ao carregar NFSe recebidas");
      }
      return response.json() as Promise<NFSeResponse>;
    },
  });

  const nfses = nfseData?.nfses || [];
  const total = nfseData?.total || 0;
  const totalPages = nfseData?.totalPages || 0;

  // Funções de ação
  const handleBaixarXML = (nfse: NFSeRecebida) => {
    toast({
      title: "Baixar XML",
      description: `Iniciando download do XML da NFSe do emitente ${nfse.nfse_emitente}`,
    });
  };

  const handleIntegrarERP = (nfse: NFSeRecebida) => {
    toast({
      title: "Integrar com ERP",
      description: `Iniciando integração da NFSe do emitente ${nfse.nfse_emitente} com o ERP`,
    });
  };

  // Função para limpar filtros
  const handleClearFilters = () => {
    setSearch("");
    setStatus("all");
    setEmpresa("");
    setFornecedor("");
    setLocal("");
    setDataInicio("");
    setDataFim("");
    setPage(1);
  };

  return (
    <Layout currentPage="NFSe Recebidas">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">
              Gerencie as notas fiscais de serviço eletrônicas recebidas
            </p>
          </div>
          <Badge variant="secondary" className="text-primary">
            {total} {total === 1 ? "NFSe" : "NFSes"}
          </Badge>
        </div>

        {/* Search and Filters */}
        <Card className="glassmorphism border-white/20">
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="flex items-center space-x-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar em todos os campos..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400"
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <Select value={status} onValueChange={(value: any) => setStatus(value)}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="integrated">Integrado</SelectItem>
                    <SelectItem value="not_integrated">Não Integrado</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  placeholder="Empresa"
                  value={empresa}
                  onChange={(e) => setEmpresa(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                />

                <Input
                  placeholder="Fornecedor"
                  value={fornecedor}
                  onChange={(e) => setFornecedor(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                />

                <Input
                  placeholder="Local"
                  value={local}
                  onChange={(e) => setLocal(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                />

                <Input
                  type="date"
                  placeholder="Data Início"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="bg-white/10 border-white/20 text-white"
                />

                <Button 
                  variant="outline" 
                  onClick={handleClearFilters}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Grid */}
        <Card className="glassmorphism border-white/20">
          <CardContent className="pt-6">
            <div className="w-full">
              {isLoading ? (
                <div className="flex items-center justify-center min-h-[400px]">
                  <Card className="glassmorphism border-blue-500/20">
                    <CardContent className="pt-6 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-white">Carregando NFSe recebidas...</p>
                    </CardContent>
                  </Card>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center min-h-[400px]">
                  <Card className="glassmorphism border-red-500/20">
                    <CardContent className="pt-6 text-center">
                      <p className="text-red-400">Erro ao carregar NFSe recebidas</p>
                      <p className="text-gray-400 text-sm mt-2">
                        Verifique sua conexão e tente novamente
                      </p>
                    </CardContent>
                  </Card>
                </div>
              ) : nfses.length === 0 ? (
                <div className="flex items-center justify-center min-h-[400px]">
                  <Card className="glassmorphism border-yellow-500/20">
                    <CardContent className="pt-6 text-center">
                      <p className="text-yellow-400">
                        {search || status !== "all" || empresa || fornecedor || local || dataInicio || dataFim
                          ? "Nenhuma NFSe encontrada com os filtros aplicados"
                          : "Nenhuma NFSe recebida encontrada"}
                      </p>
                      <p className="text-gray-400 text-sm mt-2">
                        {search || status !== "all" || empresa || fornecedor || local || dataInicio || dataFim
                          ? "Tente ajustar os filtros de busca"
                          : "As NFSe recebidas aparecerão aqui quando disponíveis"}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="bg-white/5 rounded-lg">
                  <table className="w-full table-fixed">
                    <thead className="bg-white/10">
                      <tr>
                        <th className="text-left py-3 px-2 w-32">
                          <span className="text-gray-300 font-semibold text-xs">Emitente</span>
                        </th>
                        <th className="text-left py-3 px-2 w-24">
                          <span className="text-gray-300 font-semibold text-xs">CNPJ</span>
                        </th>
                        <th className="text-left py-3 px-2 w-32">
                          <span className="text-gray-300 font-semibold text-xs">Tomador</span>
                        </th>
                        <th className="text-left py-3 px-2 w-20">
                          <span className="text-gray-300 font-semibold text-xs">Tipo</span>
                        </th>
                        <th className="text-left py-3 px-2 w-24">
                          <span className="text-gray-300 font-semibold text-xs">Data</span>
                        </th>
                        <th className="text-left py-3 px-2 w-24">
                          <span className="text-gray-300 font-semibold text-xs">Valor</span>
                        </th>
                        <th className="text-left py-3 px-2 w-24">
                          <span className="text-gray-300 font-semibold text-xs">Status</span>
                        </th>
                        <th className="text-left py-3 px-2 w-28">
                          <span className="text-gray-300 font-semibold text-xs">Ações</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {nfses.map((nfse, index) => (
                        <tr 
                          key={index} 
                          className="border-b border-white/5 hover:bg-white/5 transition-colors"
                        >
                          <td className="py-2 px-2 text-white text-sm truncate" title={nfse.nfse_emitente}>
                            {nfse.nfse_emitente}
                          </td>
                          <td className="py-2 px-2 text-gray-300 font-mono text-sm">
                            {formatCNPJCPF(nfse.nfse_doc)}
                          </td>
                          <td className="py-2 px-2 text-gray-300 text-sm truncate" title={nfse.nfse_tomador}>
                            {nfse.nfse_tomador}
                          </td>
                          <td className="py-2 px-2 text-gray-300 text-xs">
                            {nfse.nfse_tipo}
                          </td>
                          <td className="py-2 px-2 text-gray-300 text-sm">
                            {formatDate(nfse.nfse_data_hora)}
                          </td>
                          <td className="py-2 px-2 text-gray-300 font-mono text-sm">
                            {formatCurrency(nfse.nfse_valor_servico)}
                          </td>
                          <td className="py-2 px-2">
                            <Badge
                              variant={nfse.nfse_status_integracao === 1 ? "default" : "secondary"}
                              className={`text-xs ${
                                nfse.nfse_status_integracao === 1
                                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                                  : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                              }`}
                            >
                              {nfse.nfse_status_integracao === 1 ? "Integrado" : "Não integrado"}
                            </Badge>
                          </td>
                          <td className="py-2 px-2">
                            <div className="flex space-x-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleBaixarXML(nfse)}
                                className="border-blue-500/30 text-blue-400 hover:bg-blue-500/20 w-7 h-7 p-0"
                                title="Baixar XML"
                              >
                                <Download className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleIntegrarERP(nfse)}
                                className="border-green-500/30 text-green-400 hover:bg-green-500/20 w-7 h-7 p-0"
                                title="Integrar com ERP"
                              >
                                <RefreshCw className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
                <div className="text-gray-400 text-sm">
                  Mostrando {((page - 1) * limit) + 1} a {Math.min(page * limit, total)} de {total} {total === 1 ? "registro" : "registros"} • Página {page} de {totalPages}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (page > 1) {
                        setPage(1);
                      }
                    }}
                    disabled={page === 1}
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (page > 1) {
                        setPage(prev => prev - 1);
                      }
                    }}
                    disabled={page === 1}
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-white px-3 py-1 bg-primary/20 rounded border border-primary/30">
                    {page}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (page < totalPages) {
                        setPage(prev => prev + 1);
                      }
                    }}
                    disabled={page >= totalPages}
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (page < totalPages) {
                        setPage(totalPages);
                      }
                    }}
                    disabled={page >= totalPages}
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}