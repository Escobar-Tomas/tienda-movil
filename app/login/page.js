'use client';
import { useState } from 'react';
import { supabase } from '../../utils/supabase';

export default function LoginAdmin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

const manejarLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setCargando(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // 1. Esto nos va a mostrar el objeto entero en la consola de inspección del navegador
      console.error("DEBUG ERROR COMPLETO DE SUPABASE:", error);
      
      // 2. Pintamos en la pantalla el mensaje real que devuelve PostgreSQL/Supabase
      setErrorMsg(`❌ Código [${error.status}]: ${error.message}`);
      
      setCargando(false);
      return;
    }

    const token = data?.session?.access_token;
    if (token) {
      document.cookie = `session_secreta=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
      window.location.href = '/admin';
    } else {
      setErrorMsg('❌ Error inesperado al generar la sesión.');
      setCargando(false);
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen flex items-center justify-center p-4 font-sans text-gray-900">
      <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100 w-full max-w-sm space-y-5">
        <div className="text-center">
          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Acceso Privado</p>
          <h2 className="text-xl font-black text-gray-800 mt-1">SISTEMA DE GESTIÓN</h2>
        </div>

        <form onSubmit={manejarLogin} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase">Correo Electrónico</label>
            <input 
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs bg-gray-50 focus:outline-none focus:border-indigo-600 font-medium"
              placeholder="admin@tienda.com"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase">Contraseña</label>
            <input 
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs bg-gray-50 focus:outline-none focus:border-indigo-600 font-bold"
              placeholder="••••••••"
            />
          </div>

          {errorMsg && <p className="text-[10px] font-bold text-red-600 text-center">{errorMsg}</p>}

          <button 
            type="submit" disabled={cargando}
            className="w-full bg-indigo-600 text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider shadow-md active:scale-95 transition-transform"
          >
            {cargando ? 'Verificando...' : '🔑 Ingresar al Panel'}
          </button>
        </form>
      </div>
    </div>
  );
}