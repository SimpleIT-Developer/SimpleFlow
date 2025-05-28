import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Edit, Trash2, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Filter, Plus, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Usuario, UsuarioResponse, CreateUsuarioData, UpdateUsuarioData } from "@shared/schema";

// Schemas de validação
const createUserSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  tipo: z.enum(["user", "admin", "system"], { required_error: "Selecione um tipo" })
});

const updateUserSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").optional(),
  email: z.string().email("Email inválido").optional(),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").optional(),
  tipo: z.enum(["user", "admin", "system"]).optional(),
  ativo: z.number().optional()
});

export default function UsuariosPage() {
  const { toast } = useToast();
  
  // Estados dos filtros
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [sortBy, setSortBy] = useState("nome");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Estados dos modais
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);

  const handleRefreshUsuarios = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/usuarios"] });
    toast({
      title: "Usuários Atualizados",
      description: "Dados dos usuários atualizados com sucesso!",
    });
  };

  // Forms
  const createForm = useForm({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      nome: "",
      email: "",
      password: "",
      tipo: "user" as const
    }
  });

  const editForm = useForm({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      nome: "",
      email: "",
      password: "",
      tipo: "user" as const,
      ativo: 1
    }
  });

  // Obter dados do usuário logado para controle de acesso
  const { data: currentUser } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) {
        throw new Error("Erro ao obter dados do usuário");
      }
      const data = await response.json();
      return data.user;
    },
  });

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
      
      const response = await fetch(`/api/usuarios?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) {
        throw new Error("Erro ao carregar usuários");
      }
      return response.json() as Promise<UsuarioResponse>;
    },
  });

  // Mutações
  const createMutation = useMutation({
    mutationFn: async (data: CreateUsuarioData) => {
      const response = await fetch("/api/usuarios", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao criar usuário");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Usuário criado com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/usuarios"] });
      setCreateModalOpen(false);
      createForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar usuário",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateUsuarioData }) => {
      const response = await fetch(`/api/usuarios/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao atualizar usuário");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Usuário atualizado com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/usuarios"] });
      setEditModalOpen(false);
      setEditingUser(null);
      editForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar usuário",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/usuarios/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao excluir usuário");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Usuário excluído com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/usuarios"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir usuário",
        variant: "destructive",
      });
    },
  });

  const usuarios = usuarioData?.usuarios || [];
  const total = usuarioData?.total || 0;
  const totalPages = usuarioData?.totalPages || 0;

  // Funções de manipulação
  const handleEdit = (usuario: Usuario) => {
    setEditingUser(usuario);
    editForm.reset({
      nome: usuario.nome,
      email: usuario.email,
      password: "",
      tipo: usuario.tipo as any,
      ativo: usuario.ativo
    });
    setEditModalOpen(true);
  };

  const handleDelete = (usuario: Usuario) => {
    deleteMutation.mutate(usuario.id);
  };

  const onCreateSubmit = (data: z.infer<typeof createUserSchema>) => {
    createMutation.mutate(data);
  };

  const onEditSubmit = (data: z.infer<typeof updateUserSchema>) => {
    if (!editingUser) return;
    
    // Remove password do objeto se estiver vazio
    const updateData = { ...data };
    if (!updateData.password) {
      delete updateData.password;
    }
    
    updateMutation.mutate({ id: editingUser.id, data: updateData });
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const renderSortIcon = (field: string) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="w-3 h-3 ml-1" />;
    }
    return sortOrder === "asc" ? 
      <ArrowUp className="w-3 h-3 ml-1" /> : 
      <ArrowDown className="w-3 h-3 ml-1" />;
  };

  if (error) {
    return (
      <Layout currentPage="Usuários">
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="glassmorphism border-red-500/20">
            <CardContent className="pt-6 text-center">
              <p className="text-red-400">Erro ao carregar usuários</p>
              <p className="text-gray-400 text-sm mt-2">
                {error.message || "Tente recarregar a página"}
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

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
          <div className="flex items-center space-x-3">
            <Badge variant="secondary" className="text-primary">
              {total} {total === 1 ? "usuário" : "usuários"}
            </Badge>
            
            <Button
              onClick={handleRefreshUsuarios}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar Usuários
            </Button>
            
            {/* Botão Novo Usuário - apenas para admin e system */}
            {console.log('Debug - currentUser:', currentUser)}
            {(currentUser?.type === 'admin' || currentUser?.type === 'system') && (
              <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Usuário
                </Button>
              </DialogTrigger>
              <DialogContent className="glassmorphism border-white/20 bg-black/90">
                <DialogHeader>
                  <DialogTitle className="text-white">Criar Novo Usuário</DialogTitle>
                </DialogHeader>
                <Form {...createForm}>
                  <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                    <FormField
                      control={createForm.control}
                      name="nome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Nome</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Digite o nome do usuário"
                              {...field}
                              className="bg-white/10 border-white/20 text-white"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="Digite o email do usuário"
                              {...field}
                              className="bg-white/10 border-white/20 text-white"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Senha</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Digite a senha do usuário"
                              {...field}
                              className="bg-white/10 border-white/20 text-white"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="tipo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Tipo</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                <SelectValue placeholder="Selecione o tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="user">Usuário</SelectItem>
                              <SelectItem value="admin">Administrador</SelectItem>
                              <SelectItem value="system">Sistema</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end space-x-2 pt-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setCreateModalOpen(false)}
                        className="border-white/20 text-white hover:bg-white/10"
                      >
                        Cancelar
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createMutation.isPending}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        {createMutation.isPending ? "Criando..." : "Criar Usuário"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
            )}
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
                    placeholder="Buscar usuários..."
                    value={search}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400"
                  />
                </div>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="w-48 bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="active">Ativos</SelectItem>
                    <SelectItem value="inactive">Inativos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="glassmorphism border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Lista de Usuários</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full">
              {isLoading ? (
                <div className="flex items-center justify-center min-h-[200px]">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                    <p className="text-gray-400 mt-2">Carregando usuários...</p>
                  </div>
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
                          <td className="py-2 px-2 text-gray-300 font-mono text-sm">
                            #{usuario.id}
                          </td>
                          <td className="py-2 px-2 text-white text-sm truncate" title={usuario.nome}>
                            {usuario.nome}
                          </td>
                          <td className="py-2 px-2 text-gray-300 text-sm truncate" title={usuario.email}>
                            {usuario.email}
                          </td>
                          <td className="py-2 px-2">
                            <Badge variant="outline" className="border-blue-500/30 text-blue-400 text-xs">
                              {usuario.tipo}
                            </Badge>
                          </td>
                          <td className="py-2 px-2">
                            <Badge
                              variant={usuario.ativo === 1 ? "default" : "secondary"}
                              className={`text-xs ${
                                usuario.ativo === 1
                                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                                  : "bg-red-500/20 text-red-400 border-red-500/30"
                              }`}
                            >
                              {usuario.ativo === 1 ? "Ativo" : "Inativo"}
                            </Badge>
                          </td>
                          <td className="py-2 px-2">
                            <div className="flex space-x-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(usuario)}
                                className="border-blue-500/30 text-blue-400 hover:bg-blue-500/20 w-7 h-7 p-0"
                                title="Editar"
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-red-500/30 text-red-400 hover:bg-red-500/20 w-7 h-7 p-0"
                                    title="Excluir"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="glassmorphism border-white/20 bg-black/90">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-white">Excluir Usuário</AlertDialogTitle>
                                    <AlertDialogDescription className="text-gray-300">
                                      Tem certeza que deseja excluir o usuário <strong>{usuario.nome}</strong>? 
                                      Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="border-white/20 text-white hover:bg-white/10">
                                      Cancelar
                                    </AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleDelete(usuario)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
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
                    onClick={() => setPage(1)}
                    disabled={page <= 1}
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(prev => Math.max(1, prev - 1))}
                    disabled={page <= 1}
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-white text-sm px-3">{page}</span>
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

        {/* Edit Modal */}
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent className="glassmorphism border-white/20 bg-black/90">
            <DialogHeader>
              <DialogTitle className="text-white">Editar Usuário</DialogTitle>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Nome</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Digite o nome do usuário"
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
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Digite o email do usuário"
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
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Nova Senha (opcional)</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Deixe em branco para manter a senha atual"
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
                  name="tipo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Tipo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-white/10 border-white/20 text-white">
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="user">Usuário</SelectItem>
                          <SelectItem value="admin">Administrador</SelectItem>
                          <SelectItem value="system">Sistema</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="ativo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Status</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger className="bg-white/10 border-white/20 text-white">
                            <SelectValue placeholder="Selecione o status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">Ativo</SelectItem>
                          <SelectItem value="0">Inativo</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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