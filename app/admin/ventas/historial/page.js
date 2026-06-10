'use client';
import { useState, useEffect } from 'react';
import { ventasService } from '@/services/ventasService';

export default function HistorialVentas() {
  const [ventas, setVentas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [procesandoId, setProcesandoId] = useState(null);

  useEffect(() => {
    cargarHistorial();
  }, []);

  async function cargarHistorial() {
    setCargando(true);
    try {
      const data = await ventasService.obtenerHistorial();
      setVentas(data);
    } catch (error) {
      console.error("Error al cargar historial:", error);
      alert("Hubo un error al cargar las ventas.");
    } finally {
      setCargando(false);
    }
  }

  const handleDevolucion = async (ventaId) => {
    if (!confirm('¿Estás seguro de anular esta venta? El stock se repondrá automáticamente. Esta acción no se puede deshacer.')) return;
    
    setProcesandoId(ventaId);
    try {
      await ventasService.procesarDevolucion(ventaId);
      alert('✅ Venta devuelta y stock repuesto correctamente.');
      await cargarHistorial(); // Recargamos para actualizar el estado visual
    } catch (error) {
      console.error("Error en devolución:", error);
      alert("No se pudo procesar la devolución. Verifica la consola.");
    } finally {
      setProcesandoId(null);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-24 font-sans text-slate-900">
      <header className="bg-slate-900 text-white px-4 py-4 shadow-md sticky top-0 z-10 flex justify-between items-center w-full">
        <h1 className="text-base font-black tracking-wider uppercase">📋 Historial y Devoluciones</h1>
        <a href="/admin" className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg font-black transition-colors">Volver</a>
      </header>

      <main className="p-4 max-w-5xl mx-auto space-y-4">
        {cargando ? (
          <p className="text-center py-10 text-slate-500 font-bold">Cargando registros...</p>
        ) : ventas.length === 0 ? (
          <p className="text-center py-10 text-slate-500 font-bold bg-white rounded-2xl shadow-sm border border-slate-100">No hay ventas registradas aún.</p>
        ) : (
          <div className="space-y-3">
            {ventas.map((venta) => (
              <div key={venta.id} className={`bg-white p-4 rounded-2xl shadow-sm border transition-all ${venta.estado === 'Devuelta' ? 'border-red-200 opacity-75' : 'border-slate-100'}`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-800">{venta.clientes?.nombre || 'Cliente Final'}</h3>
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                      {new Date(venta.fecha_venta).toLocaleString('es-AR')} | Pago: {venta.tipo_pago}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-black ${venta.estado === 'Devuelta' ? 'text-slate-400 line-through' : 'text-emerald-600'}`}>
                      ${venta.total.toLocaleString('es-AR')}
                    </p>
                    <span className={`inline-block mt-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${venta.estado === 'Devuelta' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>
                      {venta.estado || 'Completada'}
                    </span>
                  </div>
                </div>

                {venta.estado !== 'Devuelta' && (
                  <div className="border-t border-slate-50 pt-3 mt-1 flex justify-end">
                    <button 
                      onClick={() => handleDevolucion(venta.id)}
                      disabled={procesandoId === venta.id}
                      className="text-[10px] font-black uppercase tracking-widest bg-red-50 hover:bg-red-500 text-red-600 hover:text-white px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
                    >
                      {procesandoId === venta.id ? 'Procesando...' : '🔄 Procesar Devolución'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}