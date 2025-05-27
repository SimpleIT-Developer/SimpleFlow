import { apiRequest } from "./queryClient";

export interface AuthResponse {
  user: {
    id: number;
    username: string;
    email: string;
    name: string;
  };
  token: string;
  message: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
}

// Set up axios default header for auth token
export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem("authToken", token);
    // Add token to default headers for future requests
    const originalFetch = window.fetch;
    window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
      const headers = new Headers(init?.headers);
      headers.set('Authorization', `Bearer ${token}`);
      
      return originalFetch(input, {
        ...init,
        headers,
      });
    };
  } else {
    localStorage.removeItem("authToken");
    // Reset fetch to original
    delete (window as any).fetch;
  }
}

// Initialize auth token on app start
export function initializeAuth() {
  const token = localStorage.getItem("authToken");
  if (token) {
    setAuthToken(token);
  }
}

export async function login(data: LoginData): Promise<AuthResponse> {
  const response = await apiRequest("POST", "/api/auth/login", data);
  const result = await response.json();
  
  if (result.token) {
    setAuthToken(result.token);
  }
  
  return result;
}

export async function register(data: RegisterData): Promise<AuthResponse> {
  const response = await apiRequest("POST", "/api/auth/register", data);
  const result = await response.json();
  
  if (result.token) {
    setAuthToken(result.token);
  }
  
  return result;
}

export async function logout(): Promise<void> {
  try {
    await apiRequest("POST", "/api/auth/logout");
  } catch (error) {
    // Continue with logout even if API call fails
    console.error("Logout API error:", error);
  } finally {
    setAuthToken(null);
  }
}
