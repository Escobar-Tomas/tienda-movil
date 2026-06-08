'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabase';

export default function ModuloCobranzas() {
  // Datos de la base de datos
  const [clientes, setClientes] = useState([]);
  const [comprasPendientes, setComprasPendientes] = useState([]);

  // Estados para el Buscador Predictivo de Clientes
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [clientesFiltrados, setClientesFiltrados] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);

  // Estados para el Modal Centralizado
  const [modalAbierto, setModalAbierto] = useState(false);
  const [compraParaCobrar, setCompraParaCobrar] = useState(null); // Almacena la venta elegida con sus detalles

  // Campos del Formulario de Cobro
  const [montoIngresado, setMontoIngresado] = useState('');
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  
  // Control de UI
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [urlWhatsApp, setUrlWhatsApp] = useState('');

  // 1. Cargar la libreta de clientes al iniciar
  useEffect(() => {
    async function cargarClientes() {
      const { data } = await supabase.from('clientes').select('*').order('nombre');
      if (data) setClientes(data);
    }
    cargarClientes();
  }, []);

  // 2. Filtrar clientes en tiempo real según lo que escriba el usuario
  useEffect(() => {
    if (busquedaCliente.trim() === '' || clienteSeleccionado?.nombre === busquedaCliente) {
      setClientesFiltrados([]);
    } else {
      setClientesFiltrados(
        clientes.filter(c => c.nombre.toLowerCase().includes(busquedaCliente.toLowerCase()))
      );
    }
  }, [busquedaCliente, clientes, clienteSeleccionado]);

  // 3. Buscar las compras pendientes del cliente seleccionado
  const consultarComprasPendientes = async (clienteId) => {
    setCargando(true);
    setComprasPendientes([]);
    
    // Traemos las ventas del cliente que tengan saldo pendiente
    // Hacemos un JOIN con detalles_venta y productos para mostrar la info completa en el modal
    const { data, error } = await supabase
      .from('ventas')
      .select(`
        id, total, tipo_pago, cuotas_pactadas, fecha_venta,
        detalles_venta (
          cantidad, precio_unitario,
          productos ( titulo )
        ),
        pagos ( monto_pagado )
      `)
      .eq('cliente_id', clienteId)
      .order('fecha_venta', { ascending: false });

    if (data) {
      // Calculamos el saldo restante de cada venta restando sus pagos en el frontend
      const ventasConSaldo = data.map(venta => {
        const totalPagado = venta.pagos?.reduce((acc, p) => acc + parseFloat(p.monto_pagado), 0) || 0;
        const saldoRestante = parseFloat(venta.total) - totalPagado;
        return { ...venta, saldoRestante };
      }).filter(v => v.saldoRestante > 0); // Solo nos interesan las pendientes de pago

      setComprasPendientes(ventasConSaldo);
    }
    setCargando(false);
  };

  // 4. Seleccionar un cliente de las coincidencias del buscador
  const seleccionarCliente = (cliente) => {
    setClienteSeleccionado(cliente);
    setBusquedaCliente(cliente.nombre);
    setMostrarSugerencias(false);
    consultarComprasPendientes(cliente.id);
  };

  // 5. Registrar el cobro e impactar en Supabase
  const procesarCobro = async (e) => {
    e.preventDefault();
    setMensaje('');
    setUrlWhatsApp('');

    const monto = parseFloat(montoIngresado);
    if (!compraParaCobrar || isNaN(monto) || monto <= 0) {
      alert('Ingresá un monto de pago válido.');
      return;
    }

    if (monto > compraParaCobrar.saldoRestante) {
      alert(`El monto ingresado ($${monto}) supera el saldo pendiente ($${compraParaCobrar.saldoRestante}).`);
      return;
    }

    setCargando(true);

    const { error } = await supabase
      .from('pagos')
      .insert([
        {
          venta_id: compraParaCobrar.id,
          cliente_id: clienteSeleccionado.id,
          monto_pagado: monto,
          metodo_pago: metodoPago
        }
      ]);

    if (error) {
      setMensaje('❌ Error: ' + error.message);
      setCargando(false);
    } else {
      const nuevoSaldo = (compraParaCobrar.saldoRestante - monto).toFixed(2);
      setMensaje('✅ Pago registrado con éxito.');
      setMontoIngresado('');

      // Generación del link automático de WhatsApp
      const textoMensaje = `Hola ${clienteSeleccionado.nombre}! 🙌 Registramos tu entrega de *$${monto}* mediante *${metodoPago}*. Tu saldo restante es de *$${nuevoSaldo}*. ¡Muchas gracias!`;
      let telefonoLimpio = clienteSeleccionado.telefono ? clienteSeleccionado.telefono.replace(/[^0-9]/g, '') : '';
      if (telefonoLimpio && !telefonoLimpio.startsWith('54')) {
        telefonoLimpio = '54' + telefonoLimpio;
      }
      const linkWA = `https://api.whatsapp.com/send?phone=${telefonoLimpio}&text=${encodeURIComponent(textoMensaje)}`;
      setUrlWhatsApp(linkWA);
      
      setCargando(false);
      
      // Actualizamos las planillas de fondo
      if (clienteSeleccionado) consultarComprasPendientes(clienteSeleccionado.id);
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen pb-24 font-sans text-gray-900">
      
      <header className="bg-indigo-700 text-white px-5 py-5 shadow-md sticky top-0 z-10 flex justify-between items-center w-full">
        <h1 className="text-base font-black tracking-wider uppercase">💵 MÓDULO DE COBRANZAS</h1>
        <a href="/admin" className="text-xs bg-indigo-600 px-3 py-1.5 rounded-lg font-bold">Panel</a>
      </header>

      <main className="p-4 space-y-4 max-w-xl mx-auto">
        
        {/* BUSCADOR PREDICTIVO DE CLIENTE (Punto 1) */}
        <section className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 relative">
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Buscar Cliente por Nombre</label>
          <div className="relative">
            <input 
              type="text"
              value={busquedaCliente}
              onChange={(e) => {
                setBusquedaCliente(e.target.value);
                setMostrarSugerencias(true);
                if (e.target.value === '') setClienteSeleccionado(null);
              }}
              onFocus={() => setMostrarSugerencias(true)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:bg-white focus:border-indigo-600 font-bold"
              placeholder="🔍 Escribí el nombre del cliente..."
            />
            
            {/* MENÚ FLOTANTE DE COINCIDENCIAS */}
            {mostrarSugerencias && clientesFiltrados.length > 0 && (
              <ul className="absolute left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto z-20 divide-y divide-gray-50">
                {clientesFiltrados.map((c) => (
                  <li 
                    key={c.id}
                    onClick={() => seleccionarCliente(c)}
                    className="px-4 py-3 text-xs font-black text-gray-700 hover:bg-indigo-50 cursor-pointer flex justify-between items-center transition-colors"
                  >
                    <span>👤 {c.nombre}</span>
                    <span className="text-[10px] font-medium text-gray-400">{c.direccion}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* LISTADO DE COMPRAS PENDIENTES ACTIVAS (Punto 2) */}
        {clienteSeleccionado && (
          <section className="space-y-2 animate-fade-in">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
              Compras Pendientes Activas
            </h3>

            {cargando ? (
              <p className="text-xs text-gray-400 font-bold text-center py-6 animate-pulse">Buscando deudas pendientes...</p>
            ) : comprasPendientes.length === 0 ? (
              <div className="bg-white p-6 rounded-2xl border text-center">
                <p className="text-xs text-green-600 font-black">🎉 ¡Al día! Este cliente no registra compras pendientes.</p>
              </div>
            ) : (
              comprasPendientes.map((compra) => (
                <div key={compra.id} className="bg-white p-4 rounded-2xl shadow-xs border border-gray-100 flex items-center justify-between gap-3 animate-fade-in">
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Compra del {new Date(compra.fecha_venta).toLocaleDateString('es-AR')}</p>
                    <p className="text-xs font-black text-red-600 mt-0.5">Saldo: ${compra.saldoRestante.toLocaleString('es-AR')}</p>
                  </div>

                  {/* BOTÓN OPERATIVO CAMBIADO (Punto 3) */}
                  <button
                    type="button"
                    onClick={() => {
                      setCompraParaCobrar(compra);
                      setMensaje('');
                      setUrlWhatsApp('');
                      setModalAbierto(true);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black px-4 py-2.5 rounded-xl transition-transform active:scale-95 shadow-xs uppercase tracking-wider"
                  >
                    🔎 Ver Detalles
                  </button>
                </div>
              ))
            )}
          </section>
        )}
      </main>

      {/* =============================================================================
          MODAL CENTRALIZADO EN MEDIO DE LA PANTALLA (Punto 3 y 4)
         ============================================================================= */}
      {modalAbierto && compraParaCobrar && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl flex flex-col animate-scale-in">
            
            {/* Cabecera */}
            <div className="bg-indigo-700 p-4 text-white flex justify-between items-center sticky top-0 z-10">
              <div className="text-left">
                <p className="text-[8px] font-black text-indigo-200 uppercase tracking-widest">Detalle e Historial</p>
                <h3 className="text-xs font-black uppercase tracking-wider">Registrar Entrega</h3>
              </div>
              <button 
                onClick={() => setModalAbierto(false)} 
                className="w-8 h-8 rounded-full bg-indigo-600 font-black text-sm flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Contenido / Cuerpo */}
            <div className="p-5 space-y-4">
              
              {/* FICHA INFORMATIVA DE LA COMPRA (Punto 4) */}
              <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200/60 space-y-2">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-1">Información de la Compra</h4>
                <div className="grid grid-cols-2 gap-y-1.5 text-xs">
                  <p className="text-gray-400 font-medium">Fecha Emisión:</p>
                  <p className="font-bold text-gray-800 text-right">{new Date(compraParaCobrar.fecha_venta).toLocaleDateString('es-AR')}</p>
                  
                  <p className="text-gray-400 font-medium">Plan Pactado:</p>
                  <p className="font-black text-gray-800 text-right">[{compraParaCobrar.tipo_pago}] en {compraParaCobrar.cuotas_pactadas} cuotas</p>

                  <p className="text-gray-400 font-medium">Valor Total Original:</p>
                  <p className="font-bold text-gray-700 text-right">${parseFloat(compraParaCobrar.total).toLocaleString('es-AR')}</p>

                  <p className="text-gray-500 font-black uppercase tracking-tighter">Saldo Pendiente Real:</p>
                  <p className="font-black text-red-600 text-right text-sm">${compraParaCobrar.saldoRestante.toLocaleString('es-AR')}</p>
                </div>

                {/* DESGLOSE DE PRENDAS LLEVADAS */}
                <div className="mt-3 pt-2.5 border-t border-dashed border-gray-200">
                  <p className="text-[9px] font-black text-indigo-700 uppercase tracking-widest mb-1.5">Artículos que se llevó:</p>
                  <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                    {compraParaCobrar.detalles_venta?.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[11px] bg-white p-1.5 rounded-lg border border-gray-100">
                        <span className="font-extrabold text-gray-700 truncate max-w-[220px]">
                          👕 {item.productos?.titulo || 'Prenda General'}
                        </span>
                        <span className="font-medium text-gray-400">
                          {item.cantidad}u. x ${parseFloat(item.precio_unitario).toLocaleString('es-AR')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* FORMULARIO DE COBRO MODIFICADO (Punto 4) */}
              <form onSubmit={procesarCobro} className="space-y-3 pt-1">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Monto a Entregar ($) *</label>
                  <input 
                    type="number" required min="1" step="any"
                    value={montoIngresado} onChange={(e) => setMontoIngresado(e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs bg-gray-50 font-black focus:outline-none focus:bg-white focus:border-indigo-600"
                    placeholder={`Máximo $${compraParaCobrar.saldoRestante}`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Canal / Método de Pago</label>
                  <select 
                    value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs bg-gray-50 font-bold focus:outline-none focus:bg-white"
                  >
                    <option value="Efectivo">💵 Efectivo Billete</option>
                    <option value="Transferencia">📱 Transferencia / Alias</option>
                    <option value="Tarjeta">💳 Tarjeta Débito/Crédito</option>
                  </select>
                </div>

                {mensaje && (
                  <div className="space-y-2 animate-fade-in mt-2">
                    <p className={`text-[10px] font-black p-3 rounded-xl text-center border ${mensaje.startsWith('❌') ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                      {mensaje}
                    </p>
                    {urlWhatsApp && (
                      <a
                        href={urlWhatsApp} target="_blank" rel="noopener noreferrer"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-xl text-xs uppercase tracking-widest shadow-md flex items-center justify-center gap-2 transition-transform active:scale-95"
                      >
                        💬 Enviar Comprobante por WhatsApp
                      </a>
                    )}
                  </div>
                )}

                {/* BOTÓN DEL FORMULARIO ACTUALIZADO */}
                <button
                  type="submit" disabled={cargando || mensaje.startsWith('✅')}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-xl text-xs uppercase tracking-widest shadow-md transition-opacity disabled:opacity-50 mt-2"
                >
                  {cargando ? 'Registrando Cobro...' : '💰 Cobrar'}
                </button>
              </form>

            </div>
          </div>
        </div>
      )}

      {/* BOTÓN DE ESCAPE GENERAL */}
      <footer className="fixed bottom-0 left-0 right-0 p-3 bg-white/80 backdrop-blur-md border-t border-gray-100 flex justify-center z-10">
        <a href="/admin" className="w-full max-w-xs text-center bg-gray-800 text-white font-black py-3 rounded-xl text-xs tracking-wider uppercase">
          ⬅️ Volver al Panel General
        </a>
      </footer>

    </div>
  );
}