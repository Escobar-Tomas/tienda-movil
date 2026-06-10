'use client';
import { useState, useEffect } from 'react';
import { ventasService } from '@/services/ventasService';

export default function HistorialVentas() {
  const [ventas, setVentas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [procesandoId, setProcesandoId] = useState(null);

  // Estados para Filtros y Búsqueda
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('Todos');

  useEffect(() => {
    cargarHistorial();
  }, []);

  async function cargarHistorial() {
    setCargando(true);
    try {
      const data = await ventasService.obtenerHistorial();
      setVentas(data || []);
    } catch (error) {
      console.error("Error al cargar historial:", error);
      alert("Hubo un error al cargar las ventas.");
    } finally {
      setCargando(false);
    }
  }

  const handleDevolucion = async (ventaId) => {
    if (!confirm('¿Estás seguro de anular esta venta? El stock se repondrá automáticamente y esta acción no se puede deshacer.')) return;
    
    setProcesandoId(ventaId);
    try {
      await ventasService.procesarDevolucion(ventaId);
      alert('✅ Venta devuelta y stock repuesto correctamente.');
      await cargarHistorial();
    } catch (error) {
      console.error("Error en devolución:", error);
      alert("No se pudo procesar la devolución.");
    } finally {
      setProcesandoId(null);
    }
  };

  // Limpiar todos los filtros rápidamente
  const limpiarFiltros = () => {
    setBusquedaCliente('');
    setFechaDesde('');
    setFechaHasta('');
    setEstadoFiltro('Todos');
  };

  // Lógica de Filtrado en tiempo real (Frontend)
  const ventasFiltradas = ventas.filter((venta) => {
    // 1. Filtrar por Cliente
    const nombreCliente = venta.clientes?.nombre?.toLowerCase() || 'cliente final';
    const coincideCliente = nombreCliente.includes(busquedaCliente.toLowerCase());

    // 2. Filtrar por Fechas
    const fechaVentaObj = new Date(venta.fecha_venta);
    let coincideDesde = true;
    let coincideHasta = true;

    if (fechaDesde) {
      const desde = new Date(fechaDesde + 'T00:00:00');
      coincideDesde = fechaVentaObj >= desde;
    }
    if (fechaHasta) {
      const hasta = new Date(fechaHasta + 'T23:59:59');
      coincideHasta = fechaVentaObj <= hasta;
    }

    // 3. Filtrar por Estado
    const estadoActual = venta.estado || 'Completada';
    const coincideEstado = estadoFiltro === 'Todos' || estadoActual === estadoFiltro;

    return coincideCliente && coincideDesde && coincideHasta && coincideEstado;
  });

  // KPI Dinámico: Calcula el total neto facturado según los filtros activos (excluye anuladas)
  const totalFacturadoFiltrado = ventasFiltradas
    .filter(v => v.estado !== 'Devuelta' && v.estado !== 'Cancelada')
    .reduce((acc, v) => acc + parseFloat(v.total), 0);

  return (
    <div className="bg-slate-50 min-h-screen pb-24 font-sans text-slate-900 selection:bg-indigo-100">
      
      {/* CABECERA */}
      <header className="bg-slate-900 text-white px-4 py-4 shadow-md sticky top-0 z-50 flex justify-between items-center w-full">
        <div>
          <h1 className="text-sm font-black tracking-wider uppercase">📋 Control de Ventas</h1>
          <p className="text-[10px] text-slate-400 font-bold mt-0.5">Historial, estados y devoluciones</p>
        </div>
        <a href="/admin" className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-xl font-black transition-colors border border-slate-700">
          VOLVER
        </a>
      </header>

      <main className="p-4 max-w-4xl mx-auto space-y-4">
        
        {/* PANEL DE FILTROS (UI/UX Mejorada) */}
        <section className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 space-y-3">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Herramientas de búsqueda</h2>
            {(busquedaCliente || fechaDesde || fechaHasta || estadoFiltro !== 'Todos') && (
              <button onClick={limpiarFiltros} className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 transition-colors">
                ✨ Limpiar Filtros
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Filtro Cliente */}
            <div className="md:col-span-2 relative">
              <span className="absolute left-3 top-2.5 text-xs opacity-40">🔍</span>
              <input 
                type="text" 
                placeholder="Buscar por nombre de cliente..." 
                value={busquedaCliente}
                onChange={(e) => setBusquedaCliente(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Filtro Estado */}
            <div>
              <select 
                value={estadoFiltro} 
                onChange={(e) => setEstadoFiltro(e.target.value)}
                className="w-full px-3 py-2 text-xs font-black bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 cursor-pointer text-slate-700"
              >
                <option value="Todos">📦 Todos los estados</option>
                <option value="Completada">🟢 Completadas</option>
                <option value="Pendiente">🟡 Pendientes</option>
                <option value="Devuelta">🔴 Devueltas</option>
                <option value="Cancelada">⚫ Canceladas</option>
              </select>
            </div>

            {/* Filtros Fechas */}
            <div className="flex gap-2 md:col-span-4 grid grid-cols-2 md:grid-cols-2">
              <div className="relative">
                <label className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">Desde</label>
                <input 
                  type="date" 
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-600"
                />
              </div>
              <div>
                <label className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">Hasta</label>
                <input 
                  type="date" 
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-600"
                />
              </div>
            </div>
          </div>
        </section>

        {/* CONTADOR DE FACTURACIÓN FILTRADA */}
        {!cargando && ventasFiltradas.length > 0 && (
          <section className="bg-indigo-900 text-white p-4 rounded-3xl shadow-md flex justify-between items-center animate-fade-in">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-indigo-300">Cómputo de Caja Filtrado</p>
              <p className="text-xs font-medium text-indigo-200 mt-0.5">Mostrando {ventasFiltradas.length} operaciones</p>
            </div>
            <p className="text-xl font-black font-mono">${totalFacturadoFiltrado.toLocaleString('es-AR')}</p>
          </section>
        )}

        {/* LISTADO DE RESULTADOS */}
        <section className="space-y-3">
          {cargando ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map(i => <div key={i} className="bg-white h-24 rounded-2xl border border-slate-100"></div>)}
            </div>
          ) : ventasFiltradas.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-xs">
              <span className="text-3xl block mb-2">🔎</span>
              <p className="text-xs font-black text-slate-800">No hay registros que coincidan con los filtros.</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Intenta modificando los parámetros de búsqueda.</p>
            </div>
          ) : (
            ventasFiltradas.map((venta) => {
              const estado = venta.estado || 'Completada';
              
              // Mapeo dinámico de colores según estado para mejorar UX visual
              const badges = {
                Completada: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                Pendiente: 'bg-amber-50 text-amber-700 border-amber-200',
                Devuelta: 'bg-rose-50 text-rose-600 border-rose-200',
                Cancelada: 'bg-slate-100 text-slate-600 border-slate-200'
              };

              return (
                <div 
                  key={venta.id} 
                  className={`bg-white p-4 rounded-2xl shadow-sm border transition-all ${estado === 'Devuelta' ? 'border-red-100 opacity-70 bg-slate-50/50' : 'border-slate-100 hover:border-slate-200'}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">
                        {venta.clientes?.nombre || 'Cliente Final'}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <p className="text-[10px] font-bold text-slate-400">
                          {new Date(venta.fecha_venta).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                        <span className="text-slate-300 text-[10px]">•</span>
                        <span className="text-[9px] font-black bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded uppercase">
                          {venta.tipo_pago}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className={`text-sm font-black font-mono ${estado === 'Devuelta' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                        ${venta.total.toLocaleString('es-AR')}
                      </p>
                      <span className={`inline-block mt-1 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 border rounded-lg ${badges[estado] || badges.Completada}`}>
                        {estado}
                      </span>
                    </div>
                  </div>

                  {/* Acciones contextuales */}
                  {estado !== 'Devuelta' && estado !== 'Cancelada' && (
                    <div className="border-t border-slate-100 pt-3 mt-3 flex justify-end">
                      <button 
                        onClick={() => handleDevolucion(venta.id)}
                        disabled={procesandoId === venta.id}
                        className="text-[9px] font-black uppercase tracking-widest bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white px-3 py-2 rounded-xl transition-all disabled:opacity-50 flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                      >
                        {procesandoId === venta.id ? 'Procesando...' : '🔄 Anular e Invertir Stock'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </section>
      </main>
    </div>
  );
}