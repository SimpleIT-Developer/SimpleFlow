import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Trash2, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Filter, Plus, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Usuario, UsuarioResponse } from "@shared/schema";

export default function UsuariosPage() {
  const { toast } = useToast();
  
  // Estados dos filtros
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [sortBy, setSortBy] = useState("nome");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const { data: usuarioData, isLoading, error } = useQuery({
    queryKey: ["/api/usuarios", { 
      search, 
      status, 
      page, 
      limit, 
      sortBy, 
      sortOrder 
    }],
    queryFn: async () => {
      const params = new URLSearchParams({
        search,
        status,
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder
      });
      
      const response = await fetch(`/api/usuarios?${params}`);
      if (!response.ok) {
        throw new Error("Erro ao carregar usuários");
      }
      return response.json() as Promise<UsuarioResponse>;
    },
  });

  const usuarios = usuarioData?.usuarios || [];
  const total = usuarioData?.total || 0;
  const totalPages = usuarioData?.totalPages || 0;

  // Funções de ação
  const handleEdit = (usuario: Usuario) => {
    toast({
      title: "Editar Usuário",
      description: `Abrindo formulário para editar ${usuario.nome}`,
    });
  };

  const handleDelete = (usuario: Usuario) => {
    toast({
      title: "Excluir Usuário",
      description: `Confirmar exclusão do usuário ${usuario.nome}`,
    });
  };

  const handleNewUser = () => {
    toast({
      title: "Novo Usuário",
      description: "Abrindo formulário para criar novo usuário",
    });
  };

  // Função para limpar filtros
  const handleClearFilters = () => {
    setSearch("");
    setStatus("all");
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
    <Layout currentPage="Usuários">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">
              Gerencie os usuários do sistema
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="text-primary">
              {total} {total === 1 ? "usuário" : "usuários"}
            </Badge>
            <Button 
              onClick={handleNewUser}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Usuário
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
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400"
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Select value={status} onValueChange={(value: any) => setStatus(value)}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>

                <div></div>
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
                      <p className="text-white">Carregando usuários...</p>
                    </CardContent>
                  </Card>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center min-h-[400px]">
                  <Card className="glassmorphism border-red-500/20">
                    <CardContent className="pt-6 text-center">
                      <p className="text-red-400">Erro ao carregar usuários</p>
                      <p className="text-gray-400 text-sm mt-2">
                        Verifique sua conexão e tente novamente
                      </p>
                    </CardContent>
                  </Card>
                </div>
              ) : usuarios.length === 0 ? (
                <div className="flex items-center justify-center min-h-[400px]">
                  <Card className="glassmorphism border-yellow-500/20">
                    <CardContent className="pt-6 text-center">
                      <p className="text-yellow-400">
                        {search || status !== "all"
                          ? "Nenhum usuário encontrado com os filtros aplicados"
                          : "Nenhum usuário encontrado"}
                      </p>
                      <p className="text-gray-400 text-sm mt-2">
                        {search || status !== "all"
                          ? "Tente ajustar os filtros de busca"
                          : "Clique em 'Novo Usuário' para adicionar o primeiro usuário"}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="bg-white/5 rounded-lg">
                  <table className="w-full table-fixed">
                    <thead className="bg-white/10">
                      <tr>
                        <th className="text-left py-3 px-2 w-16">
                          <Button
                            variant="ghost"
                            onClick={() => handleSort("id")}
                            className="text-gray-300 hover:text-white p-0 h-auto font-semibold text-xs"
                          >
                            ID {renderSortIcon("id")}
                          </Button>
                        </th>
                        <th className="text-left py-3 px-2 w-40">
                          <Button
                            variant="ghost"
                            onClick={() => handleSort("nome")}
                            className="text-gray-300 hover:text-white p-0 h-auto font-semibold text-xs"
                          >
                            Nome {renderSortIcon("nome")}
                          </Button>
                        </th>
                        <th className="text-left py-3 px-2 w-48">
                          <Button
                            variant="ghost"
                            onClick={() => handleSort("email")}
                            className="text-gray-300 hover:text-white p-0 h-auto font-semibold text-xs"
                          >
                            E-mail {renderSortIcon("email")}
                          </Button>
                        </th>
                        <th className="text-left py-3 px-2 w-24">
                          <span className="text-gray-300 font-semibold text-xs">Tipo</span>
                        </th>
                        <th className="text-left py-3 px-2 w-20">
                          <Button
                            variant="ghost"
                            onClick={() => handleSort("ativo")}
                            className="text-gray-300 hover:text-white p-0 h-auto font-semibold text-xs"
                          >
                            Status {renderSortIcon("ativo")}
                          </Button>
                        </th>
                        <th className="text-left py-3 px-2 w-24">
                          <span className="text-gray-300 font-semibold text-xs">Ações</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {usuarios.map((usuario: Usuario, index: number) => (
                        <tr 
                          key={usuario.id} 
                          className="border-b border-white/5 hover:bg-white/5 transition-colors"
                        >
                          <td className="py-4 px-6 text-gray-300 font-mono text-sm">
                            #{usuario.id}
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex flex-col">
                              <span className="text-white font-medium">{usuario.nome}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-gray-300 text-sm">
                            {usuario.email}
                          </td>
                          <td className="py-4 px-6">
                            <Badge variant="outline" className="border-blue-500/30 text-blue-400">
                              {usuario.tipo}
                            </Badge>
                          </td>
                          <td className="py-4 px-6">
                            <Badge
                              variant={usuario.ativo === 1 ? "default" : "secondary"}
                              className={
                                usuario.ativo === 1
                                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                                  : "bg-red-500/20 text-red-400 border-red-500/30"
                              }
                            >
                              {usuario.ativo === 1 ? "Ativo" : "Inativo"}
                            </Badge>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(usuario)}
                                className="border-blue-500/30 text-blue-400 hover:bg-blue-500/20"
                                title="Editar"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDelete(usuario)}
                                className="border-red-500/30 text-red-400 hover:bg-red-500/20"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
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