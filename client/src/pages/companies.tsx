import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatedLogo } from "@/components/animated-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  Eye, 
  Edit, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import type { Company, CompanyResponse } from "@shared/schema";

export default function CompaniesPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [sortBy, setSortBy] = useState<keyof Company>("company_id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const { data: companyData, isLoading, error } = useQuery({
    queryKey: ["/api/companies", { search, page, limit, sortBy, sortOrder }],
    queryFn: async () => {
      const params = new URLSearchParams({
        search,
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder
      });
      
      const response = await fetch(`/api/companies?${params}`);
      if (!response.ok) {
        throw new Error("Erro ao carregar empresas");
      }
      return response.json() as Promise<CompanyResponse>;
    },
  });

  const handleSort = (column: keyof Company) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
    setPage(1); // Reset to first page when sorting
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1); // Reset to first page when searching
  };

  const handleView = (company: Company) => {
    toast({
      title: "Visualizar Empresa",
      description: `Visualizando dados de ${company.company_name}`,
    });
  };

  const handleEdit = (company: Company) => {
    toast({
      title: "Editar Empresa",
      description: `Editando dados de ${company.company_name}`,
    });
  };

  const getSortIcon = (column: keyof Company) => {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AnimatedLogo size="lg" showPulse className="mb-4" />
          <p className="text-white/80">Carregando empresas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="glassmorphism border-red-500/20">
          <CardContent className="pt-6 text-center">
            <p className="text-red-400">Erro ao carregar empresas</p>
            <p className="text-gray-400 text-sm mt-2">
              Verifique sua conexão e tente novamente
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const companies = companyData?.companies || [];
  const totalPages = companyData?.totalPages || 1;
  const total = companyData?.total || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Empresas</h1>
          <p className="text-gray-400 text-sm">
            Gerencie as empresas cadastradas no sistema
          </p>
        </div>
        <Badge variant="secondary" className="text-primary">
          {total} {total === 1 ? "empresa" : "empresas"}
        </Badge>
      </div>

      {/* Search and Filters */}
      <Card className="glassmorphism border-white/20">
        <CardContent className="pt-6">
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
            {search && (
              <Button
                variant="outline"
                onClick={() => handleSearch("")}
                className="border-white/20 text-white hover:bg-white/10"
              >
                Limpar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Companies Table */}
      <Card className="glassmorphism border-white/20">
        <CardHeader>
          <CardTitle className="text-white">Lista de Empresas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("company_id")}
                      className="text-gray-300 hover:text-white p-0 h-auto font-semibold"
                    >
                      ID {getSortIcon("company_id")}
                    </Button>
                  </th>
                  <th className="text-left py-3 px-4">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("company_name")}
                      className="text-gray-300 hover:text-white p-0 h-auto font-semibold"
                    >
                      Nome {getSortIcon("company_name")}
                    </Button>
                  </th>
                  <th className="text-left py-3 px-4">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("company_fantasy")}
                      className="text-gray-300 hover:text-white p-0 h-auto font-semibold"
                    >
                      Nome Fantasia {getSortIcon("company_fantasy")}
                    </Button>
                  </th>
                  <th className="text-left py-3 px-4">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("company_cpf_cnpj")}
                      className="text-gray-300 hover:text-white p-0 h-auto font-semibold"
                    >
                      CNPJ/CPF {getSortIcon("company_cpf_cnpj")}
                    </Button>
                  </th>
                  <th className="text-left py-3 px-4">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("company_email")}
                      className="text-gray-300 hover:text-white p-0 h-auto font-semibold"
                    >
                      Email {getSortIcon("company_email")}
                    </Button>
                  </th>
                  <th className="text-left py-3 px-4">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("company_city")}
                      className="text-gray-300 hover:text-white p-0 h-auto font-semibold"
                    >
                      Cidade {getSortIcon("company_city")}
                    </Button>
                  </th>
                  <th className="text-left py-3 px-4">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("company_uf")}
                      className="text-gray-300 hover:text-white p-0 h-auto font-semibold"
                    >
                      UF {getSortIcon("company_uf")}
                    </Button>
                  </th>
                  <th className="text-left py-3 px-4">
                    <span className="text-gray-300 font-semibold">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr
                    key={company.company_id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-3 px-4 text-white font-mono">
                      {company.company_id}
                    </td>
                    <td className="py-3 px-4 text-white">
                      {company.company_name}
                    </td>
                    <td className="py-3 px-4 text-gray-300">
                      {company.company_fantasy || "-"}
                    </td>
                    <td className="py-3 px-4 text-gray-300 font-mono">
                      {formatCpfCnpj(company.company_cpf_cnpj)}
                    </td>
                    <td className="py-3 px-4 text-gray-300">
                      {company.company_email}
                    </td>
                    <td className="py-3 px-4 text-gray-300">
                      {company.company_city}
                    </td>
                    <td className="py-3 px-4 text-gray-300 uppercase">
                      {company.company_uf}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleView(company)}
                          className="border-blue-500/30 text-blue-400 hover:bg-blue-500/20"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(company)}
                          className="border-green-500/30 text-green-400 hover:bg-green-500/20"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {companies.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-400">
                  {search ? "Nenhuma empresa encontrada para sua busca." : "Nenhuma empresa cadastrada."}
                </p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
              <div className="text-gray-400 text-sm">
                Página {page} de {totalPages} • {total} {total === 1 ? "empresa" : "empresas"}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
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
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(totalPages)}
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
  );
}