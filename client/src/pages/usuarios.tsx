import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Trash2, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Filter, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Usuario, UsuarioResponse } from "@shared/schema";

export default function UsuariosPage() {
  const { toast } = useToast();
  
  // Estados dos filtros
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [sortBy] = useState("nome");
  const [sortOrder] = useState("asc");

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

  return (
    <Layout currentPage="Usuários">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Usuários</h1>
            <p className="text-gray-400 mt-2">Gerencie os usuários do sistema</p>
          </div>
          <Button 
            onClick={handleNewUser}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Usuário
          </Button>
        </div>

        <Card className="bg-gray-800/50 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nome, e-mail, tipo..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-gray-700/50 border-white/20 text-white placeholder:text-gray-400"
                />
              </div>
              
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="bg-gray-700/50 border-white/20 text-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>

              <div></div>

              <Button 
                variant="outline" 
                onClick={handleClearFilters}
                className="border-white/20 text-white hover:bg-white/10"
              >
                Limpar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">
              Usuários ({total} {total === 1 ? "registro" : "registros"})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-white">Carregando usuários...</div>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="text-red-400 mb-2">Erro ao carregar usuários</div>
                  <div className="text-gray-400 text-sm">Verifique sua conexão e tente novamente</div>
                </div>
              ) : usuarios.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-gray-400">
                    {search || status !== "all"
                      ? "Nenhum usuário encontrado com os filtros aplicados."
                      : "Nenhum usuário encontrado."}
                  </p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-white font-medium">ID</th>
                      <th className="text-left py-3 px-4 text-white font-medium">Nome</th>
                      <th className="text-left py-3 px-4 text-white font-medium">E-mail</th>
                      <th className="text-left py-3 px-4 text-white font-medium">Tipo</th>
                      <th className="text-left py-3 px-4 text-white font-medium">Status</th>
                      <th className="text-left py-3 px-4 text-white font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.map((usuario: Usuario, index: number) => (
                      <tr key={index} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-3 px-4 text-gray-300 font-mono">
                          {usuario.id}
                        </td>
                        <td className="py-3 px-4 text-gray-300">
                          {usuario.nome}
                        </td>
                        <td className="py-3 px-4 text-gray-300">
                          {usuario.email}
                        </td>
                        <td className="py-3 px-4 text-gray-300">
                          {usuario.tipo}
                        </td>
                        <td className="py-3 px-4">
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
                        <td className="py-3 px-4">
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