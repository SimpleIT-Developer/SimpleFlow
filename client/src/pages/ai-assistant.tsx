import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, User, Lightbulb, TrendingUp, Calculator } from "lucide-react";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

const initialMessages: Message[] = [
  {
    id: '1',
    role: 'assistant',
    content: 'Olá! Sou seu assistente inteligente de fluxo de caixa. Posso ajudá-lo a analisar suas finanças, responder perguntas sobre seus dados e fornecer insights financeiros. Como posso ajudá-lo hoje?',
    timestamp: new Date(),
    suggestions: [
      'Qual é meu saldo atual?',
      'Mostre as contas vencendo esta semana',
      'Como está minha projeção de fluxo de caixa?',
      'Qual categoria tem mais gastos?'
    ]
  }
];

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');

  const aiMutation = useMutation({
    mutationFn: async (query: string) => {
      // Mock AI response - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const responses: Record<string, string> = {
        'saldo': 'Seu saldo atual é de R$ 18.700,00 distribuído entre: Conta Corrente (R$ 12.500,00), Poupança (R$ 4.200,00) e Investimentos (R$ 2.000,00).',
        'contas': 'Você tem 3 contas vencendo esta semana: Aluguel (R$ 3.200,00 - vence 15/06), Energia (R$ 450,75 - vence 18/06) e Material de Escritório (R$ 890,30 - vencida em 12/06).',
        'projeção': 'Sua projeção para os próximos 30 dias mostra entrada estimada de R$ 45.000,00 e saídas de R$ 32.500,00, resultando em fluxo positivo de R$ 12.500,00.',
        'categoria': 'Sua categoria com maior gasto é "Despesas Operacionais" com R$ 8.500,00 (35% do total), seguida por "Fornecedores" com R$ 6.200,00 (26%).'
      };
      
      const lowerQuery = query.toLowerCase();
      if (lowerQuery.includes('saldo')) return responses.saldo;
      if (lowerQuery.includes('conta') || lowerQuery.includes('venc')) return responses.contas;
      if (lowerQuery.includes('projeção') || lowerQuery.includes('fluxo')) return responses.projeção;
      if (lowerQuery.includes('categoria') || lowerQuery.includes('gasto')) return responses.categoria;
      
      return 'Entendi sua pergunta. Com base nos seus dados financeiros, posso fornecer análises detalhadas. Poderia ser mais específico sobre qual informação financeira você gostaria de saber?';
    },
    onSuccess: (response) => {
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        suggestions: [
          'Gerar relatório detalhado',
          'Mostrar gráfico de tendências',
          'Comparar com mês anterior',
          'Sugerir otimizações'
        ]
      };
      setMessages(prev => [...prev, assistantMessage]);
    }
  });

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    aiMutation.mutate(input);
    setInput('');
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <Layout currentPage="Assistente IA">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Assistente de IA</h1>
            <p className="text-gray-400 text-sm">
              Análises inteligentes do seu fluxo de caixa
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
          {/* Chat Area */}
          <div className="lg:col-span-3">
            <Card className="glassmorphism border-white/20 h-full flex flex-col">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Bot className="w-5 h-5 mr-2 text-primary" />
                  Chat com IA
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Faça perguntas sobre suas finanças e receba insights inteligentes
                </CardDescription>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col p-0">
                {/* Messages */}
                <ScrollArea className="flex-1 p-6">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[80%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                          <div className={`flex items-start space-x-2 ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                            <div className={`p-2 rounded-lg flex-shrink-0 ${
                              message.role === 'user' 
                                ? 'bg-primary text-white' 
                                : 'bg-gray-700 text-white'
                            }`}>
                              {message.role === 'user' ? (
                                <User className="w-4 h-4" />
                              ) : (
                                <Bot className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <div className={`p-3 rounded-lg ${
                                message.role === 'user'
                                  ? 'bg-primary text-white'
                                  : 'bg-white/10 text-white border border-white/20'
                              }`}>
                                <p className="text-sm leading-relaxed">{message.content}</p>
                              </div>
                              <p className="text-xs text-gray-400 mt-1">
                                {formatTime(message.timestamp)}
                              </p>
                              
                              {/* Suggestions */}
                              {message.suggestions && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {message.suggestions.map((suggestion, index) => (
                                    <Button
                                      key={index}
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleSuggestionClick(suggestion)}
                                      className="text-xs bg-white/5 border-white/20 text-white hover:bg-white/10"
                                    >
                                      {suggestion}
                                    </Button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {aiMutation.isPending && (
                      <div className="flex justify-start">
                        <div className="flex items-start space-x-2">
                          <div className="p-2 rounded-lg bg-gray-700 text-white">
                            <Bot className="w-4 h-4" />
                          </div>
                          <div className="p-3 rounded-lg bg-white/10 text-white border border-white/20">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Input Area */}
                <div className="p-6 border-t border-white/20">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Digite sua pergunta sobre finanças..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                      className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                      disabled={aiMutation.isPending}
                    />
                    <Button
                      onClick={handleSend}
                      disabled={!input.trim() || aiMutation.isPending}
                      className="bg-primary hover:bg-primary/90 text-white"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar with Quick Actions */}
          <div className="space-y-6">
            <Card className="glassmorphism border-white/20">
              <CardHeader>
                <CardTitle className="text-white text-sm">Perguntas Frequentes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { icon: Calculator, text: "Qual meu saldo atual?" },
                  { icon: TrendingUp, text: "Como está minha tendência?" },
                  { icon: Lightbulb, text: "Sugestões de economia" },
                ].map((item, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    className="w-full justify-start text-left text-white hover:bg-white/10 h-auto p-3"
                    onClick={() => handleSuggestionClick(item.text)}
                  >
                    <item.icon className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="text-sm">{item.text}</span>
                  </Button>
                ))}
              </CardContent>
            </Card>

            <Card className="glassmorphism border-white/20">
              <CardHeader>
                <CardTitle className="text-white text-sm">Dicas da IA</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-gray-300">
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="text-primary font-medium mb-1">💡 Dica do Dia</p>
                    <p>Considere renegociar contratos que vencem este mês para melhorar seu fluxo de caixa.</p>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <p className="text-green-400 font-medium mb-1">📈 Insight</p>
                    <p>Suas vendas cresceram 15% comparado ao mês passado.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}