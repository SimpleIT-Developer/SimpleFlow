import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { AnimatedLogo } from "@/components/animated-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  Download, 
  RefreshCw, 
  Printer,
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter
} from "lucide-react";
import type { NFeRecebida, NFeResponse } from "@shared/schema";

export default function NFeRecebidasPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "integrated" | "not_integrated">("all");
  const [empresa, setEmpresa] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [sortBy, setSortBy] = useState<keyof NFeRecebida>("doc_num");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const { data: nfeData, isLoading, error } = useQuery({
    queryKey: ["/api/nfe-recebidas", { 
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
      
      const response = await fetch(`/api/nfe-recebidas?${params}`);
      if (!response.ok) {
        throw new Error("Erro ao carregar NFe recebidas");
      }
      return response.json() as Promise<NFeResponse>;
    },
  });

  const handleSort = (column: keyof NFeRecebida) => {
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

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setEmpresa("");
    setFornecedor("");
    setDataInicio("");
    setDataFim("");
    setPage(1);
  };

  const handleBaixarXML = (nfe: NFeRecebida) => {
    toast({
      title: "Baixar XML",
      description: `Baixando XML da NFe ${nfe.doc_num}`,
    });
  };

  const handleIntegrarERP = (nfe: NFeRecebida) => {
    toast({
      title: "Integrar com ERP",
      description: `Integrando NFe ${nfe.doc_num} com o ERP`,
    });
  };

  const handleImprimirDANFE = (nfe: NFeRecebida) => {
    toast({
      title: "Imprimir DANFE",
      description: `Imprimindo DANFE da NFe ${nfe.doc_num}`,
    });
  };

  const getSortIcon = (column: keyof NFeRecebida) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="w-4 h-4" />;
    }
    return sortOrder === "asc" ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />;
  };

  const formatCpfCnpj = (value: string) => {
    if (!value) return "";
    const cleanValue = value.replace(/\D/g, "");
    if (cleanValue.length === 11) {
      // CPF
      return cleanValue.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    } else if (cleanValue.length === 14) {
      // CNPJ
      return cleanValue.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
    }
    return value;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  if (isLoading) {
    return (
      <Layout currentPage="NFe Recebidas">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AnimatedLogo size="lg" showPulse className="mb-4" />
            <p className="text-white/80">Carregando NFe recebidas...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout currentPage="NFe Recebidas">
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="glassmorphism border-red-500/20">
            <CardContent className="pt-6 text-center">
              <p className="text-red-400">Erro ao carregar NFe recebidas</p>
              <p className="text-gray-400 text-sm mt-2">
                Verifique sua conexão e tente novamente
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const nfes = nfeData?.nfes || [];
  const totalPages = nfeData?.totalPages || 1;
  const total = nfeData?.total || 0;

  return (
    <Layout currentPage="NFe Recebidas">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">
              Gerencie as notas fiscais eletrônicas recebidas
            </p>
          </div>
          <Badge variant="secondary" className="text-primary">
            {total} {total === 1 ? "NFe" : "NFes"}
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

        {/* NFe Table */}
        <Card className="glassmorphism border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Lista de NFe Recebidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("doc_num")}
                        className="text-gray-300 hover:text-white p-0 h-auto font-semibold"
                      >
                        Número {getSortIcon("doc_num")}
                      </Button>
                    </th>
                    <th className="text-left py-3 px-4">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("doc_dest_nome")}
                        className="text-gray-300 hover:text-white p-0 h-auto font-semibold"
                      >
                        Empresa {getSortIcon("doc_dest_nome")}
                      </Button>
                    </th>
                    <th className="text-left py-3 px-4">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("doc_emit_nome")}
                        className="text-gray-300 hover:text-white p-0 h-auto font-semibold"
                      >
                        Fornecedor {getSortIcon("doc_emit_nome")}
                      </Button>
                    </th>
                    <th className="text-left py-3 px-4">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("doc_emit_documento")}
                        className="text-gray-300 hover:text-white p-0 h-auto font-semibold"
                      >
                        CNPJ {getSortIcon("doc_emit_documento")}
                      </Button>
                    </th>
                    <th className="text-left py-3 px-4">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("doc_date_emi")}
                        className="text-gray-300 hover:text-white p-0 h-auto font-semibold"
                      >
                        Data Emissão {getSortIcon("doc_date_emi")}
                      </Button>
                    </th>
                    <th className="text-left py-3 px-4">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("doc_valor")}
                        className="text-gray-300 hover:text-white p-0 h-auto font-semibold"
                      >
                        Valor {getSortIcon("doc_valor")}
                      </Button>
                    </th>
                    <th className="text-left py-3 px-4">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("doc_nat_op")}
                        className="text-gray-300 hover:text-white p-0 h-auto font-semibold"
                      >
                        CFOP {getSortIcon("doc_nat_op")}
                      </Button>
                    </th>
                    <th className="text-left py-3 px-4">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("doc_status_integracao")}
                        className="text-gray-300 hover:text-white p-0 h-auto font-semibold"
                      >
                        Status {getSortIcon("doc_status_integracao")}
                      </Button>
                    </th>
                    <th className="text-left py-3 px-4">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("doc_id_integracao")}
                        className="text-gray-300 hover:text-white p-0 h-auto font-semibold"
                      >
                        ID ERP {getSortIcon("doc_id_integracao")}
                      </Button>
                    </th>
                    <th className="text-left py-3 px-4">
                      <span className="text-gray-300 font-semibold">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {nfes.map((nfe, index) => (
                    <tr
                      key={`${nfe.doc_num}-${index}`}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-3 px-4 text-white font-mono">
                        {nfe.doc_num}
                      </td>
                      <td className="py-3 px-4 text-white">
                        {nfe.doc_dest_nome}
                      </td>
                      <td className="py-3 px-4 text-gray-300">
                        {nfe.doc_emit_nome}
                      </td>
                      <td className="py-3 px-4 text-gray-300 font-mono">
                        {formatCpfCnpj(nfe.doc_emit_documento)}
                      </td>
                      <td className="py-3 px-4 text-gray-300">
                        {formatDate(nfe.doc_date_emi)}
                      </td>
                      <td className="py-3 px-4 text-gray-300 font-mono">
                        {formatCurrency(nfe.doc_valor)}
                      </td>
                      <td className="py-3 px-4 text-gray-300">
                        {nfe.doc_nat_op}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={nfe.doc_status_integracao === 1 ? "default" : "secondary"}
                          className={
                            nfe.doc_status_integracao === 1
                              ? "bg-green-500/20 text-green-400 border-green-500/30"
                              : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                          }
                        >
                          {nfe.doc_status_integracao === 1 ? "Integrado" : "Não Integrado"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-gray-300 font-mono">
                        {nfe.doc_id_integracao || "-"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleBaixarXML(nfe)}
                            className="border-blue-500/30 text-blue-400 hover:bg-blue-500/20"
                            title="Baixar XML"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleIntegrarERP(nfe)}
                            className="border-green-500/30 text-green-400 hover:bg-green-500/20"
                            title="Integrar com ERP"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleImprimirDANFE(nfe)}
                            className="border-purple-500/30 text-purple-400 hover:bg-purple-500/20"
                            title="Imprimir DANFE"
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {nfes.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-400">
                    {search || status !== "all" || empresa || fornecedor || dataInicio || dataFim
                      ? "Nenhuma NFe encontrada para os filtros aplicados."
                      : "Nenhuma NFe recebida encontrada."}
                  </p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
                <div className="text-gray-400 text-sm">
                  Página {page} de {totalPages} • {total} {total === 1 ? "NFe" : "NFes"}
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