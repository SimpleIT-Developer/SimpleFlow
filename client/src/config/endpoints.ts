/**
 * Configuração de Endpoints para Integração com ERP
 * 
 * Configure aqui as URLs dos endpoints do seu ERP para integração
 * com o SimpleFlow. Todos os endpoints devem retornar dados em formato JSON.
 */

export interface ERPEndpoints {
  // Autenticação
  login: string;
  logout: string;
  validateToken: string;
  
  // Fluxo de Caixa
  entradas: string;
  saidas: string;
  saldoAtual: string;
  
  // Contas
  contasPagar: string;
  contasReceber: string;
  marcarComoPago: string;
  registrarRecebimento: string;
  
  // Extrato
  extratoBancario: string;
  
  // Relatórios
  relatorioFluxoCaixa: string;
  resumoDiario: string;
  
  // IA Assistant (opcional)
  aiQuery: string;
}

/**
 * Configuração padrão dos endpoints
 * Modifique essas URLs para apontar para seu ERP
 */
export const defaultEndpoints: ERPEndpoints = {
  // Autenticação
  login: '/api/auth/login',
  logout: '/api/auth/logout',
  validateToken: '/api/auth/validate',
  
  // Fluxo de Caixa
  entradas: '/api/fluxo/entradas',
  saidas: '/api/fluxo/saidas',
  saldoAtual: '/api/fluxo/saldo',
  
  // Contas
  contasPagar: '/api/contas/pagar',
  contasReceber: '/api/contas/receber',
  marcarComoPago: '/api/contas/marcar-pago',
  registrarRecebimento: '/api/contas/registrar-recebimento',
  
  // Extrato
  extratoBancario: '/api/extrato',
  
  // Relatórios
  relatorioFluxoCaixa: '/api/relatorios/fluxo-caixa',
  resumoDiario: '/api/relatorios/resumo-diario',
  
  // IA Assistant
  aiQuery: '/api/ai/query'
};

/**
 * Configuração personalizada de endpoints
 * Você pode modificar essas configurações conforme necessário
 */
export const erpEndpoints: ERPEndpoints = {
  ...defaultEndpoints,
  // Sobrescreva aqui os endpoints específicos do seu ERP
  // Exemplo:
  // login: 'https://meu-erp.com/api/login',
  // entradas: 'https://meu-erp.com/api/financeiro/entradas',
};

/**
 * Base URL do seu ERP (se aplicável)
 * Configure aqui se todos os endpoints compartilham uma base URL
 */
export const ERP_BASE_URL = process.env.VITE_ERP_BASE_URL || '';

/**
 * Headers padrão para requisições ao ERP
 */
export const defaultHeaders = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

/**
 * Timeout padrão para requisições (em ms)
 */
export const REQUEST_TIMEOUT = 30000; // 30 segundos