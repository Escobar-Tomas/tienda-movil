'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/authService';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setCargando(true);
    setError('');

    try {
      const data = await authService.login(email, password);
      
      // Creamos una cookie segura con el token que dura 24 horas (86400 segundos)
      document.cookie = `sb_session=${data.session.access_token}; path=/; max-age=86400; SameSite=Lax`;
      
      // Redirigimos al panel de administración
      router.push('/admin');
      
    } catch (err) {
      setError('Credenciales incorrectas. Verifica tu email y contraseña.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 selection:bg-indigo-100 font-sans">
      
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        
        {/* Encabezado del Login */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 p-8 text-center">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
            <span className="text-3xl">🔒</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Acceso Restringido</h1>
          <p className="text-indigo-200 text-sm font-medium mt-1">Panel de Administración de Tienda Móvil</p>
        </div>

        {/* Formulario */}
        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Correo Electrónico</label>
              <input 
                type="email" 
                required 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 font-bold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                placeholder="admin@mitienda.com"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Contraseña</label>
              <input 
                type="password" 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 font-bold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold text-center border border-red-100 animate-fade-in">
                ❌ {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={cargando}
              className="w-full bg-slate-900 hover:bg-indigo-600 text-white font-black py-4 rounded-xl text-xs uppercase tracking-widest shadow-md transition-all active:scale-95 cursor-pointer mt-4"
            >
              {cargando ? 'Verificando...' : 'Iniciar Sesión'}
            </button>
            
          </form>
          
          <div className="mt-6 text-center">
            <a href="/" className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors">
              ← Volver al Catálogo Público
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}