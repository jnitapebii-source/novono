import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente (como as do Netlify)
  // O ponto '.' indica o diretório atual para buscar .env
  const env = loadEnv(mode, '.', '');
  
  return {
    plugins: [react()],
    define: {
      // Isso permite que o código 'process.env.API_KEY' funcione no navegador
      // O Netlify injeta a variável no processo de build, e o Vite a substitui aqui
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  }
})
