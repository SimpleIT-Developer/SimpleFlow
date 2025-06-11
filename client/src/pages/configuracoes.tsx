import { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings, 
  Webhook, 
  Database, 
  CreditCard, 
  Receipt, 
  Building2, 
  Users, 
  FileText,
  DollarSign,
  TestTube,
  CheckCircle,
  XCircle
} from "lucide-react";

interface WebhookConfig {
  id: string;
  name: string;
  description: string;
  url: string;
  method: string;
  status: 'active' | 'inactive' | 'testing';
  lastTest?: Date;
  icon: any;
}

export default function ConfiguracoesPage() {
  const { toast } = useToast();
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([
    {
      id: 'contas-bancarias',
      name: 'Contas Bancárias',
      description: 'Retorna lista de contas caixas e contas bancárias',
      url: '',
      method: 'GET',
      status: 'inactive',
      icon: CreditCard
    },
    {
      id: 'titulos-pagar',
      name: 'Títulos a Pagar',
      description: 'Retorna títulos a pagar por período',
      url: '',
      method: 'GET',
      status: 'inactive',
      icon: Receipt
    },
    {
      id: 'titulos-receber',
      name: 'Títulos a Receber',
      description: 'Retorna títulos a receber por período',
      url: '',
      method: 'GET',
      status: 'inactive',
      icon: DollarSign
    },
    {
      id: 'movimentacao-bancaria',
      name: 'Movimentação Bancária',
      description: 'Retorna movimentação bancária por período e conta',
      url: '',
      method: 'GET',
      status: 'inactive',
      icon: Database
    },
    {
      id: 'tipos-documentos',
      name: 'Tipos de Documentos',
      description: 'Retorna tipos de documentos do sistema',
      url: '',
      method: 'GET',
      status: 'inactive',
      icon: FileText
    },
    {
      id: 'centro-custos',
      name: 'Centro de Custos',
      description: 'Retorna lista de centros de custos',
      url: '',
      method: 'GET',
      status: 'inactive',
      icon: Building2
    },
    {
      id: 'natureza-orcamentaria',
      name: 'Natureza Orçamentária',
      description: 'Retorna naturezas orçamentárias financeiras',
      url: '',
      method: 'GET',
      status: 'inactive',
      icon: Settings
    },
    {
      id: 'clientes-fornecedores',
      name: 'Clientes/Fornecedores',
      description: 'Retorna lista de clientes e fornecedores',
      url: '',
      method: 'GET',
      status: 'inactive',
      icon: Users
    }
  ]);

  const updateWebhook = (id: string, updates: Partial<WebhookConfig>) => {
    setWebhooks(prev => prev.map(webhook => 
      webhook.id === id ? { ...webhook, ...updates } : webhook
    ));
  };

  const testWebhook = async (webhook: WebhookConfig) => {
    if (!webhook.url) {
      toast({
        title: "URL não configurada",
        description: "Configure a URL antes de testar o webhook",
        variant: "destructive"
      });
      return;
    }

    updateWebhook(webhook.id, { status: 'testing' });

    try {
      const response = await fetch(webhook.url, {
        method: webhook.method,
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        updateWebhook(webhook.id, { 
          status: 'active', 
          lastTest: new Date() 
        });
        toast({
          title: "Teste realizado com sucesso",
          description: `Webhook ${webhook.name} está funcionando corretamente`
        });
      } else {
        updateWebhook(webhook.id, { status: 'inactive' });
        toast({
          title: "Erro no teste",
          description: `Webhook retornou status ${response.status}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      updateWebhook(webhook.id, { status: 'inactive' });
      toast({
        title: "Erro de conexão",
        description: "Não foi possível conectar ao webhook",
        variant: "destructive"
      });
    }
  };

  const saveConfiguration = () => {
    toast({
      title: "Configurações salvas",
      description: "Os webhooks foram configurados com sucesso"
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'testing': return 'bg-yellow-500';
      case 'inactive': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Ativo';
      case 'testing': return 'Testando...';
      case 'inactive': return 'Inativo';
      default: return 'Desconhecido';
    }
  };

  return (
    <Layout currentPage="configuracoes">
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-2">
              <Settings className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold text-white">Configurações</h1>
            </div>
            <p className="text-gray-400">
              Configure os webhooks para integração com seu ERP
            </p>
          </div>

          <Tabs defaultValue="webhooks" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="webhooks">Webhooks ERP</TabsTrigger>
              <TabsTrigger value="sistema">Sistema</TabsTrigger>
              <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
            </TabsList>

            <TabsContent value="webhooks" className="space-y-6">
              <Card className="glass-card border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-white">
                    <Webhook className="w-5 h-5" />
                    <span>Configuração de Webhooks</span>
                  </CardTitle>
                  <CardDescription>
                    Configure as URLs dos endpoints do seu ERP para integração automática de dados
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {webhooks.map((webhook) => {
                    const IconComponent = webhook.icon;
                    return (
                      <div key={webhook.id} className="p-4 rounded-lg bg-white/5 border border-white/10">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 rounded-lg bg-primary/20">
                              <IconComponent className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-white">{webhook.name}</h3>
                              <p className="text-sm text-gray-400">{webhook.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge 
                              variant="outline" 
                              className={`${getStatusColor(webhook.status)} text-white border-0`}
                            >
                              {getStatusText(webhook.status)}
                            </Badge>
                            {webhook.status === 'active' && (
                              <CheckCircle className="w-4 h-4 text-green-400" />
                            )}
                            {webhook.status === 'inactive' && (
                              <XCircle className="w-4 h-4 text-red-400" />
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="md:col-span-3">
                            <Label htmlFor={`url-${webhook.id}`} className="text-white">
                              URL do Endpoint
                            </Label>
                            <Input
                              id={`url-${webhook.id}`}
                              placeholder="https://seu-erp.com/api/endpoint"
                              value={webhook.url}
                              onChange={(e) => updateWebhook(webhook.id, { url: e.target.value })}
                              className="mt-1"
                            />
                          </div>
                          <div className="flex items-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => testWebhook(webhook)}
                              disabled={webhook.status === 'testing' || !webhook.url}
                              className="flex-1"
                            >
                              <TestTube className="w-4 h-4 mr-2" />
                              Testar
                            </Button>
                          </div>
                        </div>

                        {webhook.lastTest && (
                          <div className="mt-2 text-xs text-gray-400">
                            Último teste: {webhook.lastTest.toLocaleString()}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div className="flex justify-end pt-4">
                    <Button onClick={saveConfiguration} className="bg-primary hover:bg-primary/90">
                      Salvar Configurações
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sistema" className="space-y-6">
              <Card className="glass-card border-primary/20">
                <CardHeader>
                  <CardTitle className="text-white">Configurações do Sistema</CardTitle>
                  <CardDescription>
                    Configurações gerais do SimpleFlow
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="empresa" className="text-white">Nome da Empresa</Label>
                      <Input id="empresa" placeholder="Digite o nome da sua empresa" className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="moeda" className="text-white">Moeda Padrão</Label>
                      <Input id="moeda" value="BRL" disabled className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="timezone" className="text-white">Fuso Horário</Label>
                      <Input id="timezone" value="America/Sao_Paulo" disabled className="mt-1" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="relatorios" className="space-y-6">
              <Card className="glass-card border-primary/20">
                <CardHeader>
                  <CardTitle className="text-white">Configurações de Relatórios</CardTitle>
                  <CardDescription>
                    Configure como os relatórios serão gerados e enviados
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="formato-relatorio" className="text-white">Formato Padrão</Label>
                      <select className="w-full mt-1 px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white">
                        <option value="pdf">PDF</option>
                        <option value="excel">Excel</option>
                        <option value="csv">CSV</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="email-relatorio" className="text-white">Email para Envio</Label>
                      <Input id="email-relatorio" type="email" placeholder="seuemail@empresa.com" className="mt-1" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}