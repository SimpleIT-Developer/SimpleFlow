import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, RefreshCw, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Filter, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
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

// Função para determinar o status badge conforme regras de negócio
function getStatusBadge(nfse: NFSeRecebida) {
  if (nfse.nfse_status_integracao === 1) {
    return <Badge className="bg-green-100 text-green-800 border-green-200">Integrado</Badge>;
  } else if (nfse.nfse_status_integracao === 0) {
    if (!nfse.nfse_codcfo || nfse.nfse_codcfo === null) {
      return <Badge className="bg-red-100 text-red-800 border-red-200">Fornecedor não cadastrado!</Badge>;
    } else {
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Não Integrado</Badge>;
    }
  }
  return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Indefinido</Badge>;
}

export default function NFSeRecebidasPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Estados dos filtros
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "integrated" | "not_integrated">("all");
  const [empresa, setEmpresa] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [sortBy, setSortBy] = useState<keyof NFSeRecebida>("nfse_data_hora");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const { data: nfseData, isLoading, error } = useQuery({
    queryKey: ["nfse-recebidas", { 
      search, 
      status, 
      empresa, 
      fornecedor, 
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
  const handleBaixarXML = async (nfse: NFSeRecebida) => {
    try {
      const apiUrl = `https://roboeac.simpledfe.com.br/api/nfse_download_api.php?nfse_id=${nfse.nfse_id}`;
      
      // Faz a chamada para a API
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao baixar XML da NFSe');
      }

      // Baixa o arquivo
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `nfse_${nfse.nfse_id}.xml`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Download Concluído",
        description: `XML da NFSe ${nfse.nfse_id} baixado com sucesso!`,
      });
    } catch (error) {
      toast({
        title: "Erro no Download",
        description: "Não foi possível baixar o XML da NFSe. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleIntegrarERP = (nfse: NFSeRecebida) => {
    toast({
      title: "Integrar com ERP",
      description: `Iniciando integração da NFSe do emitente ${nfse.nfse_emitente} com o ERP`,
    });
  };

  // Funções de manipulação dos filtros (idênticas às da NFe Recebidas)
  const handleSort = (column: keyof NFSeRecebida) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const getSortIcon = (column: keyof NFSeRecebida) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="w-4 h-4" />;
    }
    return sortOrder === "asc" ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />;
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setEmpresa("");
    setFornecedor("");
    setDataInicio("");
    setDataFim("");
    setPage(1);
  };

  const handleRefreshNFSe = () => {
    queryClient.invalidateQueries({ queryKey: ["nfse-recebidas"] });
    toast({
      title: "NFSe Atualizadas",
      description: "Dados das NFSe recebidas atualizados com sucesso!",
    });
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
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-primary">
              {total} {total === 1 ? "NFSe" : "NFSes"}
            </Badge>
            <Button
              onClick={handleRefreshNFSe}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar NFSe
            </Button>
          </div>
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
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                  type="date"
                  placeholder="Data Início"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                />

                <Input
                  type="date"
                  placeholder="Data Fim"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                />
              </div>

              {/* Clear Filters */}
              {(search || status !== "all" || empresa || fornecedor || dataInicio || dataFim) && (
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Limpar Filtros
                  </Button>
                </div>
              )}
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
                        {search || status !== "all" || empresa || fornecedor || dataInicio || dataFim
                          ? "Nenhuma NFSe encontrada com os filtros aplicados"
                          : "Nenhuma NFSe recebida encontrada"}
                      </p>
                      <p className="text-gray-400 text-sm mt-2">
                        {search || status !== "all" || empresa || fornecedor || dataInicio || dataFim
                          ? "Tente ajustar os filtros de busca"
                          : "As NFSe recebidas aparecerão aqui quando disponíveis"}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="bg-white/5 rounded-lg">
                  <table className="w-full table-fixed">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 px-2 w-32">
                          <Button
                            variant="ghost"
                            onClick={() => handleSort("nfse_emitente")}
                            className="text-gray-300 hover:text-white p-0 h-auto font-semibold text-xs"
                          >
                            Emitente {getSortIcon("nfse_emitente")}
                          </Button>
                        </th>
                        <th className="text-left py-3 px-2 w-24">
                          <Button
                            variant="ghost"
                            onClick={() => handleSort("nfse_doc")}
                            className="text-gray-300 hover:text-white p-0 h-auto font-semibold text-xs"
                          >
                            CNPJ {getSortIcon("nfse_doc")}
                          </Button>
                        </th>
                        <th className="text-left py-3 px-2 w-32">
                          <Button
                            variant="ghost"
                            onClick={() => handleSort("nfse_tomador")}
                            className="text-gray-300 hover:text-white p-0 h-auto font-semibold text-xs"
                          >
                            Tomador {getSortIcon("nfse_tomador")}
                          </Button>
                        </th>
                        <th className="text-left py-3 px-2 w-20">
                          <Button
                            variant="ghost"
                            onClick={() => handleSort("nfse_tipo")}
                            className="text-gray-300 hover:text-white p-0 h-auto font-semibold text-xs"
                          >
                            Tipo {getSortIcon("nfse_tipo")}
                          </Button>
                        </th>
                        <th className="text-left py-3 px-2 w-24">
                          <Button
                            variant="ghost"
                            onClick={() => handleSort("nfse_data_hora")}
                            className="text-gray-300 hover:text-white p-0 h-auto font-semibold text-xs"
                          >
                            Data {getSortIcon("nfse_data_hora")}
                          </Button>
                        </th>
                        <th className="text-left py-3 px-2 w-24">
                          <Button
                            variant="ghost"
                            onClick={() => handleSort("nfse_valor_servico")}
                            className="text-gray-300 hover:text-white p-0 h-auto font-semibold text-xs"
                          >
                            Valor {getSortIcon("nfse_valor_servico")}
                          </Button>
                        </th>
                        <th className="text-left py-3 px-2 w-24">
                          <Button
                            variant="ghost"
                            onClick={() => handleSort("nfse_status_integracao")}
                            className="text-gray-300 hover:text-white p-0 h-auto font-semibold text-xs"
                          >
                            Status {getSortIcon("nfse_status_integracao")}
                          </Button>
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
                            {getStatusBadge(nfse)}
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