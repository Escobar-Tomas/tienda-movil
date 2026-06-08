'use client';
import { useState, useEffect } from 'react';
import { cobrosService } from '@/services/cobrosService';

export default function GestionCobros() {
  const [cuentas, setCuentas] = useState([]);
  const [cargando, setCargando] = useState(true);
  
  // Estados para el Modal de Pago
  const [mostrarModal, setMostrarModal] = useState(false);
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);
  
  // Formulario de Pago
  const [montoPago, setMontoPago] = useState('');
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [procesandoPago, setProcesandoPago] = useState(false);
  const [mensaje, setMensaje] = useState('');

  // Filtros
  const [filtroEstado, setFiltroEstado] = useState('Pendientes');
  const [busqueda, setBusqueda] = useState('');

  const cargarCuentas = async () => {
    setCargando(true);
    try {
      const data = await cobrosService.obtenerEstadoCuentas();
      
      const cuentasCalculadas = data.map(venta => {
        const totalPagado = venta.pagos.reduce((acc, pago) => acc + parseFloat(pago.monto_pagado), 0);
        const saldoPendiente = parseFloat(venta.total) - totalPagado;
        
        return {
          ...venta,
          totalPagado,
          saldoPendiente,
          estado: saldoPendiente <= 0 ? 'Saldada' : 'Pendiente' // Estado en SINGULAR
        };
      });
      
      setCuentas(cuentasCalculadas);
      
      // Actualizar la venta seleccionada en el modal si estaba abierto
      if (ventaSeleccionada) {
        const ventaActualizada = cuentasCalculadas.find(c => c.id === ventaSeleccionada.id);
        setVentaSeleccionada(ventaActualizada);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarCuentas();
  }, []);

  const abrirModalPago = (venta) => {
    setVentaSeleccionada(venta);
    setMontoPago(venta.saldoPendiente > 0 ? venta.saldoPendiente.toString() : '');
    setMetodoPago('Efectivo');
    setMensaje('');
    setMostrarModal(true);
  };

  const registrarCobro = async (e) => {
    e.preventDefault();
    setProcesandoPago(true);
    setMensaje('');

    const monto = parseFloat(montoPago);

    if (monto <= 0) {
      setMensaje('❌ El monto a cobrar debe ser mayor a 0.');
      setProcesandoPago(false);
      return;
    }

    if (monto > ventaSeleccionada.saldoPendiente) {
      setMensaje('❌ El monto supera el saldo pendiente de la deuda.');
      setProcesandoPago(false);
      return;
    }

    const payloadPago = {
      venta_id: ventaSeleccionada.id,
      cliente_id: ventaSeleccionada.clientes.id,
      monto_pagado: monto,
      metodo_pago: metodoPago
    };

    try {
      await cobrosService.registrarPago(payloadPago);
      setMensaje('✅ Pago registrado correctamente.');
      setMontoPago(''); 
      cargarCuentas(); 
      
      setTimeout(() => setMensaje(''), 3000);
    } catch (error) {
      setMensaje('❌ Hubo un error al registrar el pago.');
    } finally {
      setProcesandoPago(false);
    }
  };

  const anularPago = async (pagoId) => {
    if (!confirm('¿Estás seguro de que deseas anular este recibo? El saldo volverá a figurar como pendiente.')) return;
    
    try {
      await cobrosService.revertirPago(pagoId);
      cargarCuentas();
    } catch (error) {
      alert('Error al intentar anular el pago.');
    }
  };

  // AQUÍ ESTÁ LA SOLUCIÓN: Emparejamos el filtro en plural con el estado en singular
  const cuentasMostradas = cuentas.filter(cuenta => {
    const coincideEstado = 
      filtroEstado === 'Todas' || 
      (filtroEstado === 'Pendientes' && cuenta.estado === 'Pendiente') ||
      (filtroEstado === 'Saldadas' && cuenta.estado === 'Saldada');
      
    const coincideNombre = cuenta.clientes?.nombre?.toLowerCase().includes(busqueda.toLowerCase()) || false;
    
    return coincideEstado && coincideNombre;
  });

  return (
    <div className="bg-gray-100 min-h-screen pb-24 font-sans text-gray-900 selection:bg-indigo-100">
      
      <header className="bg-indigo-700 text-white px-4 py-4 shadow-md sticky top-0 z-10 flex justify-between items-center w-full">
        <h1 className="text-base font-black tracking-wider uppercase">💰 GESTIÓN DE COBROS</h1>
        <div className="text-xs bg-indigo-600 px-3 py-1 rounded-lg font-bold">
          {cuentas.filter(c => c.estado === 'Pendiente').length} Cuentas Activas
        </div>
      </header>

      <main className="p-3 space-y-4 max-w-4xl mx-auto">
        
        <section className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3">
          <input 
            type="text" placeholder="🔍 Buscar cliente..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs bg-gray-50 focus:outline-none focus:border-indigo-600 font-medium"
          />
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
            {['Pendientes', 'Saldadas', 'Todas'].map(filtro => (
              <button
                key={filtro} onClick={() => setFiltroEstado(filtro)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${filtroEstado === filtro ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'}`}
              >
                {filtro}
              </button>
            ))}
          </div>
        </section>

        <section>
          {cargando && cuentas.length === 0 ? (
            <div className="text-center py-10 text-xs font-bold text-gray-500 animate-pulse">Cargando cuentas corrientes...</div>
          ) : cuentasMostradas.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl border border-gray-100 text-xs font-bold text-gray-400">
              No se encontraron coincidencias.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cuentasMostradas.map((cuenta) => (
                <div key={cuenta.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                  
                  <div className="p-4 flex-grow border-b border-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-black text-gray-800 truncate pr-2">{cuenta.clientes?.nombre}</h3>
                      <span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-wider ${cuenta.estado === 'Pendiente' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {cuenta.estado}
                      </span>
                    </div>
                    
                    <p className="text-[10px] text-gray-400 font-bold mb-3 uppercase">
                      Venta {new Date(cuenta.fecha_venta).toLocaleDateString('es-AR')} • {cuenta.tipo_pago}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-gray-50 p-2 rounded-lg">
                        <span className="block text-[9px] text-gray-400 font-bold uppercase">Total Compra</span>
                        <span className="font-mono font-bold text-gray-800">${cuenta.total}</span>
                      </div>
                      <div className={`p-2 rounded-lg ${cuenta.estado === 'Pendiente' ? 'bg-amber-50' : 'bg-emerald-50'}`}>
                        <span className={`block text-[9px] font-bold uppercase ${cuenta.estado === 'Pendiente' ? 'text-amber-600' : 'text-emerald-600'}`}>Saldo Actual</span>
                        <span className={`font-mono font-black ${cuenta.estado === 'Pendiente' ? 'text-amber-700' : 'text-emerald-700'}`}>${cuenta.saldoPendiente}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50/50 p-3">
                    <button 
                      onClick={() => abrirModalPago(cuenta)}
                      className="w-full bg-slate-900 hover:bg-indigo-700 text-white text-xs font-black py-2.5 rounded-xl transition-colors cursor-pointer"
                    >
                      {cuenta.estado === 'Pendiente' ? '💵 INGRESAR PAGO' : '🔍 VER HISTORIAL'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-3 bg-white/80 backdrop-blur-md border-t border-gray-100 flex justify-center z-10 md:max-w-4xl md:mx-auto md:rounded-t-3xl">
        <a href="/admin" className="w-full text-center bg-gray-800 text-white font-black py-3 rounded-xl text-xs active:scale-95 tracking-wider">
          ⬅️ VOLVER AL PANEL GENERAL
        </a>
      </footer>

      {/* MODAL DE GESTIÓN (Ingresar Pago + Historial) */}
      {mostrarModal && ventaSeleccionada && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-5 w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="flex justify-between items-center pb-2 border-b border-gray-100 mb-4 shrink-0">
              <h3 className="text-sm font-black text-gray-900 tracking-tight">DETALLE DE CUENTA</h3>
              <button onClick={() => setMostrarModal(false)} className="text-gray-400 hover:text-gray-600 text-xs font-black p-1 cursor-pointer">CERRAR</button>
            </div>

            <div className="overflow-y-auto pr-1 space-y-4 flex-grow">
              
              <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                <p className="text-[10px] text-blue-600 font-bold uppercase mb-1">Cliente:</p>
                <p className="text-sm font-black text-blue-900">{ventaSeleccionada.clientes?.nombre}</p>
                <div className="flex justify-between mt-2 pt-2 border-t border-blue-100/50">
                  <span className="text-[10px] font-bold text-blue-700">Deuda Restante:</span>
                  <span className="text-xs font-mono font-black text-blue-800">${ventaSeleccionada.saldoPendiente}</span>
                </div>
              </div>

              {/* SECCIÓN 1: FORMULARIO DE COBRO (Solo si hay deuda) */}
              {ventaSeleccionada.saldoPendiente > 0 && (
                <form onSubmit={registrarCobro} className="space-y-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <h4 className="text-[10px] font-black text-gray-800 uppercase tracking-widest border-b border-gray-200 pb-1 mb-2">➕ Ingresar Nuevo Pago</h4>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold text-gray-500 uppercase">Monto ($)</label>
                      <input 
                        type="number" step="0.01" min="0.01" max={ventaSeleccionada.saldoPendiente} required
                        value={montoPago} onChange={(e) => setMontoPago(e.target.value)}
                        className="mt-1 w-full border border-gray-200 rounded-lg px-2 py-2 text-xs font-mono font-black focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-gray-500 uppercase">Método</label>
                      <select 
                        value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}
                        className="mt-1 w-full border border-gray-200 rounded-lg px-2 py-2 text-[11px] font-bold focus:outline-none focus:border-indigo-600"
                      >
                        <option value="Efectivo">Efectivo</option>
                        <option value="Transferencia">Transferencia</option>
                        <option value="Tarjeta">Tarjeta</option>
                      </select>
                    </div>
                  </div>

                  <button 
                    type="submit" disabled={procesandoPago}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 rounded-lg text-xs uppercase tracking-widest shadow-sm cursor-pointer mt-1"
                  >
                    {procesandoPago ? 'Procesando...' : 'Confirmar Ingreso'}
                  </button>
                  
                  {mensaje && (
                    <p className={`text-[10px] font-bold p-2 rounded-md text-center ${mensaje.includes('❌') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                      {mensaje}
                    </p>
                  )}
                </form>
              )}

              {/* SECCIÓN 2: HISTORIAL DE PAGOS */}
              <div>
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-1 mb-2">Auditoría de Pagos Realizados</h4>
                
                {ventaSeleccionada.pagos?.length === 0 ? (
                  <p className="text-xs text-gray-400 italic text-center py-2">No hay pagos registrados aún.</p>
                ) : (
                  <ul className="space-y-2">
                    {ventaSeleccionada.pagos.sort((a,b) => new Date(b.fecha_pago) - new Date(a.fecha_pago)).map(pago => (
                      <li key={pago.id} className="flex justify-between items-center bg-white border border-gray-100 p-2.5 rounded-xl shadow-xs">
                        <div>
                          <p className="text-[10px] text-gray-400 font-bold">{new Date(pago.fecha_pago).toLocaleDateString('es-AR')} • {pago.metodo_pago}</p>
                          <p className="text-sm font-mono font-black text-gray-800">${pago.monto_pagado}</p>
                        </div>
                        <button 
                          onClick={() => anularPago(pago.id)}
                          className="text-[10px] font-bold text-red-500 hover:bg-red-50 px-2 py-1 rounded-md cursor-pointer transition-colors"
                        >
                          Anular
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}