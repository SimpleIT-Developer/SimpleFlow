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
import DashboardPage from "@/pages/dashboard";
import CompaniesPage from "@/pages/companies";
import NFeRecebidasPage from "@/pages/nfe-recebidas";
import NFSeRecebidasPage from "@/pages/nfse-recebidas";
import FornecedoresPage from "@/pages/fornecedores";
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
      <Route path="/companies">
        <ProtectedRoute>
          <CompaniesPage />
        </ProtectedRoute>
      </Route>
      <Route path="/nfe-recebidas">
        <ProtectedRoute>
          <NFeRecebidasPage />
        </ProtectedRoute>
      </Route>
      <Route path="/nfse-recebidas">
        <ProtectedRoute>
          <NFSeRecebidasPage />
        </ProtectedRoute>
      </Route>
      <Route path="/fornecedores">
        <ProtectedRoute>
          <FornecedoresPage />
        </ProtectedRoute>
      </Route>
      <Route path="/relatorios">
        <ProtectedRoute>
          <RelatoriosPage />
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
