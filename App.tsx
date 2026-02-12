import React, { useState, useEffect, useCallback } from 'react';
import { SiteConfig, LinkItem, DEFAULT_CONFIG } from './types';
import * as storage from './services/storageService';
import Button from './components/Button';

// --- SVGs ---
const LockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
);
const LinkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
);
const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
);

const App: React.FC = () => {
  const [isAdminPath, setIsAdminPath] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [config, setConfig] = useState<SiteConfig>(DEFAULT_CONFIG);
  const [queue, setQueue] = useState<LinkItem[]>([]);
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  
  // Admin State
  const [newUrl, setNewUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Client State
  const [clientLoading, setClientLoading] = useState(false);
  const [clientError, setClientError] = useState('');

  // Initial Load
  useEffect(() => {
    const loadData = async () => {
        // Load config regardless of session (it's public)
        const loadedConfig = await storage.getConfig();
        setConfig(loadedConfig);

        // Check active session
        const currentSession = await storage.getSession();
        setSession(currentSession);

        // Load Queue only if necessary
        const loadedQueue = await storage.getLinkQueue();
        setQueue(loadedQueue);
    };

    const handleHashChange = () => {
      setIsAdminPath(window.location.hash === '#admin');
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    loadData();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // --- Auth Handlers ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      const data = await storage.login(email, password);
      setSession(data.session);
    } catch (err: any) {
      alert("Erro no login: " + err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await storage.logout();
    setSession(null);
    handleExitAdmin(); // Go back to home
  };

  // --- Admin Handlers ---

  const handleExitAdmin = () => {
    window.location.hash = '';
    setIsAdminPath(false);
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      await storage.saveConfig(config);
      alert('Configurações salvas!');
    } catch (e: any) {
      alert('Erro ao salvar: ' + e.message);
    }
    setIsSaving(false);
  };

  const handleAddLink = async () => {
    if (!newUrl) return;
    try {
      new URL(newUrl); // Validate URL format
      const updatedQueue = await storage.addLinkToQueue(newUrl);
      setQueue(updatedQueue);
      setNewUrl('');
    } catch (e) {
      alert('Por favor, insira uma URL válida (ex: https://example.com)');
    }
  };

  const handleRemoveLink = async (id: string) => {
    const updatedQueue = await storage.removeLinkFromQueue(id);
    setQueue(updatedQueue);
  };

  const handleClearQueue = async () => {
      if(confirm('Limpar toda a fila?')) { 
          await storage.clearQueue(); 
          setQueue([]); 
      }
  };

  const handleClientContinue = useCallback(async () => {
    setClientLoading(true);
    setClientError('');
    // UX delay
    await new Promise(r => setTimeout(r, 500));
    
    try {
        const url = await storage.consumeNextLink();
      
        if (url) {
            window.location.href = url;
        } else {
            setClientLoading(false);
            setClientError('Nenhum link disponível no momento. Tente novamente mais tarde.');
            // Refresh queue just in case
            const currentQueue = await storage.getLinkQueue();
            setQueue(currentQueue);
        }
    } catch (error) {
        console.error(error);
        setClientLoading(false);
        setClientError('Erro ao processar redirecionamento.');
    }
  }, []);

  // --- VIEW: LOGIN (Intercepts Admin if not authenticated) ---
  if (isAdminPath && !session) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-6">
            <div className="p-3 bg-blue-900/30 rounded-full text-blue-400 mb-4">
              <LockIcon />
            </div>
            <h2 className="text-2xl font-bold text-white">Acesso Restrito</h2>
            <p className="text-slate-400 text-sm mt-1">Faça login para gerenciar o site</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Senha</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <Button type="submit" isLoading={loginLoading} className="w-full">
              Entrar
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button onClick={handleExitAdmin} className="text-sm text-slate-500 hover:text-white">
              ← Voltar ao site
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- VIEW: ADMIN DASHBOARD (Authenticated) ---
  if (isAdminPath && session) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          
          <header className="flex items-center justify-between border-b border-slate-700 pb-6">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold flex items-center gap-3 text-blue-400">
                <LockIcon /> Painel Admin
              </h1>
              <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400 hidden sm:inline-block">
                {session.user.email}
              </span>
            </div>
            <div className="flex gap-2">
               <button 
                onClick={handleLogout} 
                className="px-4 py-2 text-red-400 hover:bg-red-900/20 rounded border border-transparent hover:border-red-900/50 transition-colors text-sm"
              >
                Sair
              </button>
              <button 
                onClick={handleExitAdmin} 
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-600 transition-colors text-sm font-medium"
              >
                Ver Site
              </button>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Visual Customization */}
            <section className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
              <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
                Personalização Visual
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">URL da Imagem (Logo/Hero)</label>
                  <input 
                    type="text" 
                    value={config.imageUrl}
                    onChange={(e) => setConfig({...config, imageUrl: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="https://..."
                  />
                  <div className="mt-2 h-32 bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center border border-slate-700 border-dashed">
                    {config.imageUrl ? (
                      <img src={config.imageUrl} alt="Preview" className="h-full object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    ) : (
                      <span className="text-slate-600 text-sm">Sem imagem</span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Legenda</label>
                  <textarea 
                    value={config.caption}
                    onChange={(e) => setConfig({...config, caption: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px]"
                    placeholder="Deixe em branco para esconder"
                  />
                </div>

                <Button onClick={handleSaveConfig} isLoading={isSaving} className="w-full mt-4">Salvar Alterações</Button>
              </div>
            </section>

            {/* Link Management */}
            <section className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
              <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
                <LinkIcon /> Gerenciamento de Links
              </h2>
              
              <div className="space-y-4">
                 <div className="bg-emerald-900/20 text-emerald-200 text-xs p-3 rounded border border-emerald-900/50 mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                  Conectado ao Supabase (DB + Auth)
                </div>

                <div className="flex gap-2">
                  <input 
                    type="url"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="https://destino.com/usuario-x"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <Button onClick={handleAddLink} variant="secondary">Add</Button>
                </div>

                <div className="mt-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-slate-400 font-medium">Fila de Redirecionamento ({queue.length})</span>
                    <button onClick={handleClearQueue} className="text-xs text-red-400 hover:text-red-300">Limpar Fila</button>
                  </div>
                  
                  <div className="bg-slate-900 rounded-lg border border-slate-700 h-64 overflow-y-auto custom-scrollbar">
                    {queue.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-slate-600">
                        <LinkIcon />
                        <span className="mt-2 text-sm">Fila vazia</span>
                      </div>
                    ) : (
                      <ul className="divide-y divide-slate-800">
                        {queue.map((item, index) => (
                          <li key={item.id} className="p-3 flex items-center justify-between hover:bg-slate-800 transition-colors group">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <span className="text-xs bg-slate-800 text-slate-500 px-2 py-1 rounded-full">{index + 1}</span>
                              <span className="text-sm text-slate-300 truncate max-w-[200px]" title={item.url}>{item.url}</span>
                            </div>
                            <button 
                              onClick={() => handleRemoveLink(item.id)}
                              className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <TrashIcon />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  // --- VIEW: CLIENT (Public) ---
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-3xl"></div>
      </div>

      <main className="relative z-10 w-full max-w-md bg-slate-900/50 backdrop-blur-md border border-slate-800 p-8 rounded-2xl shadow-2xl flex flex-col items-center text-center space-y-8 animate-fade-in-up">
        
        {/* Company Image - Only if set */}
        {config.imageUrl && (
          <div className="w-48 h-32 flex items-center justify-center mb-4">
              <img 
                src={config.imageUrl} 
                alt="Logo" 
                className="max-w-full max-h-full object-contain drop-shadow-lg"
              />
          </div>
        )}

        {/* Caption - Only if set */}
        {config.caption && (
          <div className="space-y-4">
            <h1 className="text-xl font-medium text-slate-100 leading-relaxed">
              {config.caption}
            </h1>
            <div className="h-1 w-16 bg-blue-500 mx-auto rounded-full opacity-50"></div>
          </div>
        )}

        {/* Action */}
        <div className="w-full pt-4">
          <Button 
            onClick={handleClientContinue} 
            isLoading={clientLoading}
            className="w-full text-lg py-4 shadow-blue-900/20"
          >
            CONTINUAR
          </Button>
          
          {clientError && (
            <p className="mt-4 text-sm text-red-400 bg-red-950/30 p-2 rounded animate-pulse">
              {clientError}
            </p>
          )}
        </div>

      </main>

      {/* Hidden Admin Access - No visual footer text */}
    </div>
  );
};

export default App;