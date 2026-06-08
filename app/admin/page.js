'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';

export default function DashboardAdmin() {
  // Estados para las métricas del panel
  const [capitalEnCalle, setCapitalEnCalle] = useState(0);
  const [recaudacionTotal, setRecaudacionTotal] = useState(0);
  const [prendasEnMochila, setPrendasEnMochila] = useState(0);
  const [totalClientes, setTotalClientes] = useState(0);
  
  // Controles de estado
  const [cargando, setCargando] = useState(true);

  // Función central para consolidar las métricas reales
  const calcularMetricas = async () => {
    setCargando(true);
    try {
      const { count: countClientes } = await supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true });
      setTotalClientes(countClientes || 0);

      const { data: dataStocks } = await supabase
        .from('stock_variantes')
        .select('stock');
      const sumaStock = dataStocks?.reduce((acc, curr) => acc + (curr.stock || 0), 0) || 0;
      setPrendasEnMochila(sumaStock);

      const { data: dataPagos } = await supabase
        .from('pagos')
        .select('monto_pagado');
      const sumaPagos = dataPagos?.reduce((acc, curr) => acc + parseFloat(curr.monto_pagado || 0), 0) || 0;
      setRecaudacionTotal(sumaPagos);

      const { data: dataVentas } = await supabase
        .from('ventas')
        .select('total');
      const sumaVentas = dataVentas?.reduce((acc, curr) => acc + parseFloat(curr.total || 0), 0) || 0;
      
      const enCalle = sumaVentas - sumaPagos;
      setCapitalEnCalle(enCalle < 0 ? 0 : enCalle);

    } catch (error) {
      console.error("Error consolidando el panel:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    calcularMetricas();
  }, []);

  return (
    <div className="bg-gray-100 min-h-screen pb-12 font-sans text-gray-900 selection:bg-indigo-100">
      
      {/* CABECERA PRINCIPAL */}
      <header className="bg-indigo-700 text-white px-6 py-6 shadow-md rounded-b-[2.5rem] w-full sticky top-0 z-10">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div>
            <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest">Panel de Control</p>
            <h1 className="text-xl font-black tracking-tight mt-0.5">SISTEMA DE GESTIÓN</h1>
          </div>
          <button 
            onClick={calcularMetricas} disabled={cargando}
            className="w-9 h-9 rounded-xl bg-indigo-600 active:scale-95 transition-transform flex items-center justify-center font-bold text-sm shadow-xs"
          >
            {cargando ? '...' : '🔄'}
          </button>
        </div>
      </header>

      {/* CUERPO CENTRAL */}
      <main className="p-4 max-w-md mx-auto space-y-5">
        
        {/* TARJETAS DE MÉTRICAS */}
        <section className="grid grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-[20px] mb-1 block">📈</span>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider leading-tight">Capital en la Calle</p>
            </div>
            <p className="text-base font-black text-red-600 mt-2 truncate">
              {cargando ? '...' : `$${capitalEnCalle.toLocaleString('es-AR')}`}
            </p>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-[20px] mb-1 block">💰</span>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider leading-tight">Caja / Recaudado</p>
            </div>
            <p className="text-base font-black text-emerald-600 mt-2 truncate">
              {cargando ? '...' : `$${recaudacionTotal.toLocaleString('es-AR')}`}
            </p>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-[20px] mb-1 block">👕</span>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider leading-tight">Prendas en Stock</p>
            </div>
            <p className="text-base font-black text-gray-800 mt-2">
              {cargando ? '...' : `${prendasEnMochila} u.`}
            </p>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-[20px] mb-1 block">👤</span>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider leading-tight">Libreta Clientes</p>
            </div>
            <p className="text-base font-black text-indigo-600 mt-2">
              {cargando ? '...' : `${totalClientes} reg.`}
            </p>
          </div>
        </section>

        {/* MÓDULOS DE TRABAJO (Con botón de clientes agregado) */}
        <section className="space-y-2.5">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Módulos de Trabajo</p>
          
          <a 
            href="/admin/ventas/nueva"
            className="w-full bg-gray-900 text-white font-black p-4 rounded-2xl shadow-sm active:scale-[0.98] transition-transform flex items-center justify-between text-xs uppercase tracking-wider"
          >
            <span>📦 Registrar Nueva Venta (Talles)</span>
            <span className="text-gray-400 text-base">➔</span>
          </a>

          <a 
            href="/admin/cobros"
            className="w-full bg-white border border-gray-200 font-black p-4 rounded-2xl shadow-xs active:scale-[0.98] transition-transform flex items-center justify-between text-xs text-indigo-700 uppercase tracking-wider"
          >
            <span>💵 Módulo de Cobranzas Predictivo</span>
            <span className="text-indigo-300 text-base">➔</span>
          </a>

          {/* ¡EL BOTÓN QUE FALTABA!: Acceso a la Libreta de Clientes */}
          <a 
            href="/admin/clientes"
            className="w-full bg-white border border-gray-200 font-black p-4 rounded-2xl shadow-xs active:scale-[0.98] transition-transform flex items-center justify-between text-xs text-indigo-900 uppercase tracking-wider"
          >
            <span>👤 Libreta de Clientes / Direcciones</span>
            <span className="text-indigo-300 text-base">➔</span>
          </a>

          <a 
            href="/admin/productos"
            className="w-full bg-white border border-gray-200 font-black p-4 rounded-2xl shadow-xs active:scale-[0.98] transition-transform flex items-center justify-between text-xs text-gray-700 uppercase tracking-wider"
          >
            <span>👕 Control de Inventario / Catálogo</span>
            <span className="text-gray-400 text-base">➔</span>
          </a>
        </section>

        {/* ACCESO AL CATÁLOGO PÚBLICO */}
        <section className="pt-2 border-t border-dashed border-gray-200">
          <a 
            href="/" 
            target="_blank" 
            className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold p-3.5 rounded-xl text-center block text-xs transition-colors uppercase tracking-widest"
          >
            🌐 Ver Catálogo Público de Clientes
          </a>
        </section>

      </main>

    </div>
  );
}