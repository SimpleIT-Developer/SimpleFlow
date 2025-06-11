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
  status: 'active' | 'inactive' | 'testing';
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
      status: 'inactive',
      icon: CreditCard
    },
    {
      id: 'titulos-pagar',
      name: 'Títulos a Pagar',
      description: 'Retorna títulos a pagar por período',
      url: '',
      status: 'inactive',
      icon: Receipt
    },
    {
      id: 'titulos-receber',
      name: 'Títulos a Receber',
      description: 'Retorna títulos a receber por período',
      url: '',
      status: 'inactive',
      icon: DollarSign
    },
    {
      id: 'movimentacao-bancaria',
      name: 'Movimentação Bancária',
      description: 'Retorna movimentação bancária por período e conta',
      url: '',
      status: 'inactive',
      icon: Database
    },
    {
      id: 'tipos-documentos',
      name: 'Tipos de Documentos',
      description: 'Retorna tipos de documentos do sistema',
      url: '',
      status: 'inactive',
      icon: FileText
    },
    {
      id: 'centro-custos',
      name: 'Centro de Custos',
      description: 'Retorna lista de centros de custos',
      url: '',
      status: 'inactive',
      icon: Building2
    },
    {
      id: 'natureza-orcamentaria',
      name: 'Natureza Orçamentária',
      description: 'Retorna naturezas orçamentárias financeiras',
      url: '',
      status: 'inactive',
      icon: Settings
    },
    {
      id: 'clientes-fornecedores',
      name: 'Clientes/Fornecedores',
      description: 'Retorna lista de clientes e fornecedores',
      url: '',
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
    
    // Simular teste
    setTimeout(() => {
      updateWebhook(webhook.id, { status: 'active' });
      toast({
        title: "Teste realizado com sucesso",
        description: `Webhook ${webhook.name} está funcionando corretamente`
      });
    }, 2000);
  };

  const saveConfiguration = () => {
    toast({
      title: "Configurações salvas",
      description: "Os webhooks foram configurados com sucesso"
    });
  };

  return (
    <Layout currentPage="configuracoes">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Configurações</h1>
            <p className="text-gray-400 text-sm">
              Configure os webhooks para integração com seu ERP
            </p>
          </div>
        </div>

        <Tabs defaultValue="webhooks" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white/10">
            <TabsTrigger value="webhooks">Webhooks ERP</TabsTrigger>
            <TabsTrigger value="sistema">Sistema</TabsTrigger>
            <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
          </TabsList>

          <TabsContent value="webhooks" className="space-y-6">
            <Card className="bg-white/5 border-white/10">
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
                            className={`${
                              webhook.status === 'active' ? 'bg-green-500 text-white border-0' :
                              webhook.status === 'testing' ? 'bg-yellow-500 text-white border-0' :
                              'bg-red-500 text-white border-0'
                            }`}
                          >
                            {webhook.status === 'active' ? 'Ativo' :
                             webhook.status === 'testing' ? 'Testando...' : 'Inativo'}
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
                            className="mt-1 bg-white/10 border-white/20 text-white"
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
            <Card className="bg-white/5 border-white/10">
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
                    <Input id="empresa" placeholder="Digite o nome da sua empresa" className="mt-1 bg-white/10 border-white/20 text-white" />
                  </div>
                  <div>
                    <Label htmlFor="moeda" className="text-white">Moeda Padrão</Label>
                    <Input id="moeda" value="BRL" disabled className="mt-1 bg-white/10 border-white/20 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="relatorios" className="space-y-6">
            <Card className="bg-white/5 border-white/10">
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
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}