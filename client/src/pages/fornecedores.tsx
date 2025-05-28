import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, ArrowDown, Eye, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Fornecedor, FornecedorResponse } from "@shared/schema";

// Função para formatar CNPJ
function formatCNPJ(cnpj: string) {
  if (!cnpj) return cnpj;
  const numbers = cnpj.replace(/\D/g, '');
  
  if (numbers.length === 14) {
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  
  return cnpj;
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

function FornecedoresPage() {
  const { toast } = useToast();
  
  // Estados dos filtros
  const [search, setSearch] = useState("");
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [sortBy, setSortBy] = useState("data_cadastro");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const { data: fornecedorData, isLoading, error } = useQuery({
    queryKey: ["/api/fornecedores", { 
      search, 
      nome,
      cnpj,
      page, 
      limit, 
      sortBy, 
      sortOrder 
    }],
    queryFn: async () => {
      const params = new URLSearchParams({
        search,
        nome,
        cnpj,
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder
      });
      
      const response = await fetch(`/api/fornecedores?${params}`);
      if (!response.ok) {
        throw new Error("Erro ao carregar fornecedores");
      }
      return response.json() as Promise<FornecedorResponse>;
    },
  });

  const fornecedores = fornecedorData?.fornecedores || [];
  const total = fornecedorData?.total || 0;
  const totalPages = fornecedorData?.totalPages || 0;

  // Funções de ação
  const handleConsultarERP = (fornecedor: Fornecedor) => {
    toast({
      title: "Consultar Código ERP",
      description: `Consultando código ERP do fornecedor ${fornecedor.nome}`,
    });
  };

  // Função para limpar filtros
  const handleClearFilters = () => {
    setSearch("");
    setNome("");
    setCnpj("");
    setPage(1);
  };

  // Função para ordenação de colunas
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
    setPage(1);
  };

  // Função para renderizar ícone de ordenação
  const renderSortIcon = (column: string) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="w-4 h-4 ml-1 text-gray-500" />;
    }
    return sortOrder === "asc" 
      ? <ArrowUp className="w-4 h-4 ml-1 text-primary" />
      : <ArrowDown className="w-4 h-4 ml-1 text-primary" />;
  };

  // Função de busca com debounce
  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  return (
    <Layout currentPage="Fornecedores">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">
              Gerencie os fornecedores do sistema
            </p>
          </div>
          <Badge variant="secondary" className="text-primary">
            {total} {total === 1 ? "fornecedor" : "fornecedores"}
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
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400"
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Input
                  placeholder="Nome do Fornecedor"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                />

                <Input
                  placeholder="CNPJ"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                />

                <div></div>

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
            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="flex items-center justify-center min-h-[400px]">
                  <Card className="glassmorphism border-blue-500/20">
                    <CardContent className="pt-6 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-white">Carregando fornecedores...</p>
                    </CardContent>
                  </Card>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center min-h-[400px]">
                  <Card className="glassmorphism border-red-500/20">
                    <CardContent className="pt-6 text-center">
                      <p className="text-red-400">Erro ao carregar fornecedores</p>
                      <p className="text-gray-400 text-sm mt-2">
                        Verifique sua conexão e tente novamente
                      </p>
                    </CardContent>
                  </Card>
                </div>
              ) : fornecedores.length === 0 ? (
                <div className="flex items-center justify-center min-h-[400px]">
                  <Card className="glassmorphism border-yellow-500/20">
                    <CardContent className="pt-6 text-center">
                      <p className="text-yellow-400">
                        {search || nome || cnpj
                          ? "Nenhum fornecedor encontrado com os filtros aplicados"
                          : "Nenhum fornecedor encontrado"}
                      </p>
                      <p className="text-gray-400 text-sm mt-2">
                        {search || nome || cnpj
                          ? "Tente ajustar os filtros de busca"
                          : "Os fornecedores aparecerão aqui quando disponíveis"}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="bg-white/5 rounded-lg">
                  <table className="w-full table-fixed">
                    <thead className="bg-white/10">
                      <tr>
                        <th className="text-left py-3 px-2 w-40">
                          <Button
                            variant="ghost"
                            onClick={() => handleSort("nome")}
                            className="text-gray-300 hover:text-white p-0 h-auto font-semibold text-xs"
                          >
                            Nome {renderSortIcon("nome")}
                          </Button>
                        </th>
                        <th className="text-left py-3 px-2 w-32">
                          <Button
                            variant="ghost"
                            onClick={() => handleSort("cnpj")}
                            className="text-gray-300 hover:text-white p-0 h-auto font-semibold text-xs"
                          >
                            CNPJ {renderSortIcon("cnpj")}
                          </Button>
                        </th>
                        <th className="text-left py-3 px-2 w-32">
                          <Button
                            variant="ghost"
                            onClick={() => handleSort("codigo_erp")}
                            className="text-gray-300 hover:text-white p-0 h-auto font-semibold text-xs"
                          >
                            ERP {renderSortIcon("codigo_erp")}
                          </Button>
                        </th>
                        <th className="text-left py-3 px-2 w-24">
                          <Button
                            variant="ghost"
                            onClick={() => handleSort("data_cadastro")}
                            className="text-gray-300 hover:text-white p-0 h-auto font-semibold text-xs"
                          >
                            Data {renderSortIcon("data_cadastro")}
                          </Button>
                        </th>
                        <th className="text-left py-3 px-2 w-20">
                          <span className="text-gray-300 font-semibold text-xs">Ações</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {fornecedores.map((fornecedor, index) => (
                        <tr 
                          key={fornecedor.id} 
                          className="border-b border-white/5 hover:bg-white/5 transition-colors"
                        >
                          <td className="py-2 px-2 text-white text-sm truncate" title={fornecedor.nome}>
                            {fornecedor.nome}
                          </td>
                          <td className="py-2 px-2 text-gray-300 font-mono text-sm">
                            {formatCNPJ(fornecedor.cnpj)}
                          </td>
                          <td className="py-2 px-2">
                            {fornecedor.codigo_erp ? (
                              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                {fornecedor.codigo_erp}
                              </Badge>
                            ) : (
                              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Não cadastrado no ERP
                              </Badge>
                            )}
                          </td>
                          <td className="py-2 px-2 text-gray-300 text-sm">
                            {formatDate(fornecedor.data_cadastro)}
                          </td>
                          <td className="py-2 px-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleConsultarERP(fornecedor)}
                              className="border-blue-500/30 text-blue-400 hover:bg-blue-500/20 w-7 h-7 p-0"
                              title="Consultar ERP"
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
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

export default FornecedoresPage;