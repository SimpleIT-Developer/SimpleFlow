import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Layout } from "@/components/layout";
import { AnimatedLogo } from "@/components/animated-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Search, 
  Eye, 
  Edit, 
  ChevronLeft,
  RefreshCw, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import type { Company, CompanyResponse } from "@shared/schema";

// Schema de validação para edição de empresa
const updateCompanySchema = z.object({
  company_name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  company_fantasy: z.string().min(2, "Nome fantasia deve ter pelo menos 2 caracteres"),
  company_cpf_cnpj: z.string().min(11, "CPF/CNPJ deve ter pelo menos 11 caracteres"),
  company_email: z.string().email("Email inválido"),
  company_city: z.string().min(2, "Cidade deve ter pelo menos 2 caracteres"),
  company_uf: z.string().length(2, "UF deve ter 2 caracteres")
});

export default function CompaniesPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [sortBy, setSortBy] = useState<keyof Company>("company_id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Estados dos modais
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  const handleRefreshEmpresas = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
    toast({
      title: "Empresas Atualizadas",
      description: "Dados das empresas atualizados com sucesso!",
    });
  };

  // Form para edição
  const editForm = useForm({
    resolver: zodResolver(updateCompanySchema),
    defaultValues: {
      company_name: "",
      company_fantasy: "",
      company_cpf_cnpj: "",
      company_email: "",
      company_city: "",
      company_uf: ""
    }
  });

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
      
      const response = await fetch(`/api/companies?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) {
        throw new Error("Erro ao carregar empresas");
      }
      return response.json() as Promise<CompanyResponse>;
    },
  });

  // Mutação para editar empresa
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof updateCompanySchema> }) => {
      const response = await fetch(`/api/companies/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao atualizar empresa");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Empresa atualizada com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      setEditModalOpen(false);
      setSelectedCompany(null);
      editForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar empresa",
        variant: "destructive",
      });
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
    setSelectedCompany(company);
    setViewModalOpen(true);
  };

  const handleEdit = (company: Company) => {
    setSelectedCompany(company);
    editForm.reset({
      company_name: company.company_name,
      company_fantasy: company.company_fantasy,
      company_cpf_cnpj: company.company_cpf_cnpj,
      company_email: company.company_email,
      company_city: company.company_city,
      company_uf: company.company_uf
    });
    setEditModalOpen(true);
  };

  const onEditSubmit = (data: z.infer<typeof updateCompanySchema>) => {
    if (!selectedCompany) return;
    updateMutation.mutate({ id: selectedCompany.company_id, data });
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
      <Layout currentPage="Empresas">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AnimatedLogo size="lg" showPulse className="mb-4" />
            <p className="text-white/80">Carregando empresas...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout currentPage="Empresas">
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
      </Layout>
    );
  }

  const companies = companyData?.companies || [];
  const totalPages = companyData?.totalPages || 1;
  const total = companyData?.total || 0;

  return (
    <Layout currentPage="Empresas">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">
              Gerencie as empresas cadastradas no sistema
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-primary">
              {total} {total === 1 ? "empresa" : "empresas"}
            </Badge>
            <Button
              onClick={handleRefreshEmpresas}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar Empresas
            </Button>
          </div>
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
          <div className="w-full">
            <table className="w-full table-fixed">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-2 w-16">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("company_id")}
                      className="text-gray-300 hover:text-white p-0 h-auto font-semibold text-xs"
                    >
                      ID {getSortIcon("company_id")}
                    </Button>
                  </th>
                  <th className="text-left py-3 px-2 w-32">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("company_name")}
                      className="text-gray-300 hover:text-white p-0 h-auto font-semibold text-xs"
                    >
                      Nome {getSortIcon("company_name")}
                    </Button>
                  </th>
                  <th className="text-left py-3 px-2 w-32">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("company_fantasy")}
                      className="text-gray-300 hover:text-white p-0 h-auto font-semibold text-xs"
                    >
                      Fantasia {getSortIcon("company_fantasy")}
                    </Button>
                  </th>
                  <th className="text-left py-3 px-2 w-28">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("company_cpf_cnpj")}
                      className="text-gray-300 hover:text-white p-0 h-auto font-semibold text-xs"
                    >
                      CNPJ {getSortIcon("company_cpf_cnpj")}
                    </Button>
                  </th>
                  <th className="text-left py-3 px-2 w-24">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("company_city")}
                      className="text-gray-300 hover:text-white p-0 h-auto font-semibold text-xs"
                    >
                      Cidade {getSortIcon("company_city")}
                    </Button>
                  </th>
                  <th className="text-left py-3 px-2 w-16">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("company_uf")}
                      className="text-gray-300 hover:text-white p-0 h-auto font-semibold text-xs"
                    >
                      UF {getSortIcon("company_uf")}
                    </Button>
                  </th>
                  <th className="text-left py-3 px-2 w-24">
                    <span className="text-gray-300 font-semibold text-xs">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr
                    key={company.company_id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-2 px-2 text-white font-mono text-sm">
                      {company.company_id}
                    </td>
                    <td className="py-2 px-2 text-white text-sm truncate" title={company.company_name}>
                      {company.company_name}
                    </td>
                    <td className="py-2 px-2 text-gray-300 text-sm truncate" title={company.company_fantasy}>
                      {company.company_fantasy || "-"}
                    </td>
                    <td className="py-2 px-2 text-gray-300 font-mono text-sm">
                      {formatCpfCnpj(company.company_cpf_cnpj)}
                    </td>
                    <td className="py-2 px-2 text-gray-300 text-sm truncate" title={company.company_city}>
                      {company.company_city}
                    </td>
                    <td className="py-2 px-2 text-gray-300 uppercase text-sm">
                      {company.company_uf}
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleView(company)}
                          className="border-blue-500/30 text-blue-400 hover:bg-blue-500/20 w-7 h-7 p-0"
                          title="Visualizar"
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(company)}
                          className="border-green-500/30 text-green-400 hover:bg-green-500/20 w-7 h-7 p-0"
                          title="Editar"
                        >
                          <Edit className="w-3 h-3" />
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

      {/* Modal de Visualização */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="glassmorphism border-white/20 bg-black/90 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Visualizar Empresa</DialogTitle>
          </DialogHeader>
          {selectedCompany && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-300 text-sm font-medium">ID</label>
                  <p className="text-white">{selectedCompany.company_id}</p>
                </div>
                <div>
                  <label className="text-gray-300 text-sm font-medium">CPF/CNPJ</label>
                  <p className="text-white">{selectedCompany.company_cpf_cnpj}</p>
                </div>
              </div>
              <div>
                <label className="text-gray-300 text-sm font-medium">Nome da Empresa</label>
                <p className="text-white">{selectedCompany.company_name}</p>
              </div>
              <div>
                <label className="text-gray-300 text-sm font-medium">Nome Fantasia</label>
                <p className="text-white">{selectedCompany.company_fantasy}</p>
              </div>
              <div>
                <label className="text-gray-300 text-sm font-medium">Email</label>
                <p className="text-white">{selectedCompany.company_email}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-300 text-sm font-medium">Cidade</label>
                  <p className="text-white">{selectedCompany.company_city}</p>
                </div>
                <div>
                  <label className="text-gray-300 text-sm font-medium">UF</label>
                  <p className="text-white">{selectedCompany.company_uf}</p>
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button 
                  onClick={() => setViewModalOpen(false)}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Edição */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="glassmorphism border-white/20 bg-black/90 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Editar Empresa</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="company_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Nome da Empresa</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Digite o nome da empresa"
                          {...field}
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="company_fantasy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Nome Fantasia</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Digite o nome fantasia"
                          {...field}
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="company_cpf_cnpj"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">CPF/CNPJ</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Digite o CPF/CNPJ"
                        {...field}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="company_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Digite o email"
                        {...field}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="company_city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Cidade</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Digite a cidade"
                          {...field}
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="company_uf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">UF</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Digite a UF"
                          maxLength={2}
                          {...field}
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditModalOpen(false)}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      </div>
    </Layout>
  );
}