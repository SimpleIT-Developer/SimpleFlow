/**
 * Serviços de API para integração com ERP
 * SimpleFlow - Sistema de Fluxo de Caixa
 */

import { erpEndpoints, defaultHeaders, REQUEST_TIMEOUT } from '@/config/endpoints';
import { 
  LancamentoFilters, 
  LancamentoResponse, 
  ContaFilters, 
  ContaResponse,
  DashboardStats,
  FluxoCaixaData,
  UltimosLancamentos,
  ResumoFinanceiro,
  AIQuery,
  AIResponse,
  InsertLancamento,
  InsertConta
} from '@shared/schema';

// Configuração base do axios ou fetch
const apiRequest = async (url: string, options: RequestInit = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

// ============= FLUXO DE CAIXA =============

/**
 * Busca entradas do fluxo de caixa em um período
 */
export async function fetchEntradas(periodo: { from: string; to: string }): Promise<LancamentoResponse> {
  const params = new URLSearchParams({
    dataInicio: periodo.from,
    dataFim: periodo.to,
    tipo: 'entrada',
  });
  
  return apiRequest(`${erpEndpoints.entradas}?${params}`);
}

/**
 * Busca saídas do fluxo de caixa em um período
 */
export async function fetchSaidas(periodo: { from: string; to: string }): Promise<LancamentoResponse> {
  const params = new URLSearchParams({
    dataInicio: periodo.from,
    dataFim: periodo.to,
    tipo: 'saida',
  });
  
  return apiRequest(`${erpEndpoints.saidas}?${params}`);
}

/**
 * Busca o saldo atual de uma conta específica ou total
 */
export async function fetchSaldoAtual(contaId?: string): Promise<{ saldo: number; conta?: string }> {
  const url = contaId 
    ? `${erpEndpoints.saldoAtual}?contaId=${contaId}`
    : erpEndpoints.saldoAtual;
  
  return apiRequest(url);
}

// ============= CONTAS A PAGAR/RECEBER =============

/**
 * Busca contas a pagar com filtros
 */
export async function fetchContasPagar(filters: LancamentoFilters = {}): Promise<LancamentoResponse> {
  const params = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined) {
      params.append(key, String(value));
    }
  });
  
  return apiRequest(`${erpEndpoints.contasPagar}?${params}`);
}

/**
 * Busca contas a receber com filtros
 */
export async function fetchContasReceber(filters: LancamentoFilters = {}): Promise<LancamentoResponse> {
  const params = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined) {
      params.append(key, String(value));
    }
  });
  
  return apiRequest(`${erpEndpoints.contasReceber}?${params}`);
}

/**
 * Marca uma conta como paga
 */
export async function marcarComoPago(lancamentoId: number, dataPagamento?: string): Promise<{ success: boolean; message: string }> {
  return apiRequest(erpEndpoints.marcarComoPago, {
    method: 'POST',
    body: JSON.stringify({
      lancamentoId,
      dataPagamento: dataPagamento || new Date().toISOString(),
    }),
  });
}

/**
 * Registra um recebimento
 */
export async function registrarRecebimento(lancamentoId: number, dataRecebimento?: string): Promise<{ success: boolean; message: string }> {
  return apiRequest(erpEndpoints.registrarRecebimento, {
    method: 'POST',
    body: JSON.stringify({
      lancamentoId,
      dataRecebimento: dataRecebimento || new Date().toISOString(),
    }),
  });
}

// ============= EXTRATO BANCÁRIO =============

/**
 * Busca extrato bancário de uma conta
 */
export async function fetchExtrato(contaId: string, periodo?: { from: string; to: string }): Promise<LancamentoResponse> {
  const params = new URLSearchParams({ contaId });
  
  if (periodo) {
    params.append('dataInicio', periodo.from);
    params.append('dataFim', periodo.to);
  }
  
  return apiRequest(`${erpEndpoints.extratoBancario}?${params}`);
}

// ============= DASHBOARD =============

/**
 * Busca estatísticas para o dashboard
 */
export async function fetchDashboardStats(): Promise<DashboardStats> {
  return apiRequest('/api/dashboard/stats');
}

/**
 * Busca dados do gráfico de fluxo de caixa
 */
export async function fetchFluxoCaixaChart(periodo: { from: string; to: string }): Promise<FluxoCaixaData[]> {
  const params = new URLSearchParams({
    dataInicio: periodo.from,
    dataFim: periodo.to,
  });
  
  return apiRequest(`/api/dashboard/fluxo-caixa?${params}`);
}

/**
 * Busca últimos lançamentos para o dashboard
 */
export async function fetchUltimosLancamentos(limit = 10): Promise<UltimosLancamentos[]> {
  return apiRequest(`/api/dashboard/ultimos-lancamentos?limit=${limit}`);
}

/**
 * Busca resumo financeiro do período
 */
export async function fetchResumoFinanceiro(periodo: { from: string; to: string }): Promise<ResumoFinanceiro> {
  const params = new URLSearchParams({
    dataInicio: periodo.from,
    dataFim: periodo.to,
  });
  
  return apiRequest(`/api/dashboard/resumo?${params}`);
}

// ============= RELATÓRIOS =============

/**
 * Gera relatório de fluxo de caixa
 */
export async function gerarRelatorioFluxoCaixa(filtros: {
  dataInicio: string;
  dataFim: string;
  contaId?: number;
  formato?: 'pdf' | 'excel';
}): Promise<Blob> {
  const params = new URLSearchParams();
  
  Object.entries(filtros).forEach(([key, value]) => {
    if (value !== undefined) {
      params.append(key, String(value));
    }
  });
  
  const response = await fetch(`${erpEndpoints.relatorioFluxoCaixa}?${params}`, {
    headers: defaultHeaders,
  });
  
  if (!response.ok) {
    throw new Error(`Erro ao gerar relatório: ${response.statusText}`);
  }
  
  return response.blob();
}

// ============= IA ASSISTANT =============

/**
 * Envia query para o assistente de IA
 */
export async function queryAI(query: AIQuery): Promise<AIResponse> {
  return apiRequest(erpEndpoints.aiQuery, {
    method: 'POST',
    body: JSON.stringify(query),
  });
}

// ============= CRUD OPERATIONS =============

/**
 * Cria um novo lançamento
 */
export async function criarLancamento(lancamento: InsertLancamento): Promise<{ id: number; success: boolean }> {
  return apiRequest('/api/lancamentos', {
    method: 'POST',
    body: JSON.stringify(lancamento),
  });
}

/**
 * Atualiza um lançamento existente
 */
export async function atualizarLancamento(id: number, lancamento: Partial<InsertLancamento>): Promise<{ success: boolean }> {
  return apiRequest(`/api/lancamentos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(lancamento),
  });
}

/**
 * Exclui um lançamento
 */
export async function excluirLancamento(id: number): Promise<{ success: boolean }> {
  return apiRequest(`/api/lancamentos/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Busca contas com filtros
 */
export async function fetchContas(filters: ContaFilters = {}): Promise<ContaResponse> {
  const params = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined) {
      params.append(key, String(value));
    }
  });
  
  return apiRequest(`/api/contas?${params}`);
}

/**
 * Cria uma nova conta
 */
export async function criarConta(conta: InsertConta): Promise<{ id: number; success: boolean }> {
  return apiRequest('/api/contas', {
    method: 'POST',
    body: JSON.stringify(conta),
  });
}