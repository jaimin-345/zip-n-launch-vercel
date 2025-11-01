import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App';
import '@/index.css';
import { CartProvider } from '@/hooks/useCart';
import { AuthProvider } from '@/contexts/SupabaseAuthContext';
import { ThemeProvider } from '@/components/ThemeProvider';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter } from 'react-router-dom';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
            <CartProvider>
              <App />
            </CartProvider>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>
);