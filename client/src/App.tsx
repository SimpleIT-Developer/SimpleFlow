import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { initializeAuth } from "@/lib/auth";
import { ProtectedRoute } from "@/components/protected-route";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import LoadingPage from "@/pages/loading";
import DashboardPage from "@/pages/dashboard-flow";
import ContasPagarPage from "@/pages/contas-pagar";
import ContasReceberPage from "@/pages/contas-receber";
import ExtratoPage from "@/pages/extrato";
import FluxoCaixaPage from "@/pages/fluxo-caixa";
import ConfiguracoesPage from "@/pages/configuracoes";
import AIAssistantPage from "@/pages/ai-assistant";
import UsuariosPage from "@/pages/usuarios";
import RelatoriosPage from "@/pages/relatorios";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/loading">
        <ProtectedRoute>
          <LoadingPage />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      </Route>
      <Route path="/contas-pagar">
        <ProtectedRoute>
          <ContasPagarPage />
        </ProtectedRoute>
      </Route>
      <Route path="/contas-receber">
        <ProtectedRoute>
          <ContasReceberPage />
        </ProtectedRoute>
      </Route>
      <Route path="/extrato">
        <ProtectedRoute>
          <ExtratoPage />
        </ProtectedRoute>
      </Route>
      <Route path="/fluxo-caixa">
        <ProtectedRoute>
          <FluxoCaixaPage />
        </ProtectedRoute>
      </Route>
      <Route path="/relatorios">
        <ProtectedRoute>
          <RelatoriosPage />
        </ProtectedRoute>
      </Route>
      <Route path="/configuracoes">
        <ProtectedRoute>
          <ConfiguracoesPage />
        </ProtectedRoute>
      </Route>
      <Route path="/ai-assistant">
        <ProtectedRoute>
          <AIAssistantPage />
        </ProtectedRoute>
      </Route>
      <Route path="/usuarios">
        <ProtectedRoute>
          <UsuariosPage />
        </ProtectedRoute>
      </Route>
      <Route path="/">
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      </Route>
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    initializeAuth();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
