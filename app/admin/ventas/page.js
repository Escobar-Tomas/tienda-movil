'use client';
import { useState, useEffect } from 'react';
import { clientesService } from '@/services/clientesService';
import { productosService } from '@/services/productosService';
import { ventasService } from '@/services/ventasService';

export default function NuevaVenta() {
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);

  const [clienteSeleccionado, setClienteSeleccionado] = useState('');
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [talleSeleccionado, setTalleSeleccionado] = useState(null);
  const [carrito, setCarrito] = useState([]); 
  
  const [buscarCliente, setBuscarCliente] = useState('');
  const [mostrarSugerenciasClientes, setMostrarSugerenciasClientes] = useState(false);

  const [buscarProducto, setBuscarProducto] = useState('');
  const [mostrarSugerenciasProductos, setMostrarSugerenciasProductos] = useState(false);

  const [tipoPago, setTipoPago] = useState('Unico');
  const [cuotasPactadas, setCuotasPactadas] = useState('1');
  
  const [realizaAbono, setRealizaAbono] = useState(false);
  const [montoAbonado, setMontoAbonado] = useState('');
  const [metodoPagoAbono, setMetodoPagoAbono] = useState('Efectivo');

  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const totalVenta = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);

  useEffect(() => {
    async function cargarDatos() {
      try {
        const [dataClientes, dataProductos] = await Promise.all([
          clientesService.obtenerTodos(),
          productosService.obtenerParaVentas()
        ]);
        if (dataClientes) setClientes(dataClientes);
        if (dataProductos) setProductos(dataProductos);
      } catch (error) {
        console.error("Error cargando catálogos:", error);
      }
    }
    cargarDatos();
  }, []);

  const handleCambioTipoPago = (e) => {
    const nuevoTipo = e.target.value;
    setTipoPago(nuevoTipo);
    if (nuevoTipo === 'Unico') {
      setCuotasPactadas('1');
    }
  };

  const agregarAlCarrito = (e) => {
    e.preventDefault();
    if (!productoSeleccionado || !talleSeleccionado) {
      alert('Por favor, selecciona una prenda y su talle.');
      return;
    }

    const existe = carrito.find(item => item.variante_id === talleSeleccionado.id);
    if (existe) {
      if (existe.cantidad >= talleSeleccionado.stock) {
        alert(`Stock insuficiente. Solo quedan ${talleSeleccionado.stock} unidades de este talle.`);
        return;
      }
      setCarrito(carrito.map(item => 
        item.variante_id === talleSeleccionado.id ? { ...item, cantidad: item.cantidad + 1 } : item
      ));
    } else {
      setCarrito([...carrito, {
        producto_id: productoSeleccionado.id,
        variante_id: talleSeleccionado.id,
        titulo: productoSeleccionado.titulo,
        talle: talleSeleccionado.talle,
        precio: parseFloat(productoSeleccionado.precio),
        cantidad: 1,
        stockMaximo: talleSeleccionado.stock
      }]);
    }
    setProductoSeleccionado(null);
    setTalleSeleccionado(null);
    setBuscarProducto('');
  };

  // NUEVO: Función para quitar un producto específico del carrito si hubo un error
  const quitarDelCarrito = (variante_id) => {
    setCarrito(carrito.filter(item => item.variante_id !== variante_id));
  };

  const finalizarVenta = async () => {
    if (!clienteSeleccionado || carrito.length === 0) {
      alert('Faltan datos del cliente o productos en el carrito.');
      return;
    }
    
    if (realizaAbono && montoAbonado && parseFloat(montoAbonado) > totalVenta) {
      alert('El monto abonado no puede superar el total de la venta.');
      return;
    }

    setCargando(true);
    setMensaje('');

    const payloadVenta = {
      cliente_id: clienteSeleccionado,
      total: parseFloat(totalVenta),
      tipo_pago: tipoPago,
      cuotas_pactadas: parseInt(cuotasPactadas)
    };

    const pagoInicial = (realizaAbono && montoAbonado && parseFloat(montoAbonado) > 0) ? {
      monto: parseFloat(montoAbonado),
      metodo: metodoPagoAbono
    } : null;

    try {
      await ventasService.registrarNuevaVenta(payloadVenta, carrito, pagoInicial);
      
      setMensaje('✅ ¡Operación exitosa! Venta e inventario actualizados.');
      
      setCarrito([]);
      setClienteSeleccionado('');
      setBuscarCliente('');
      setTipoPago('Unico');
      setCuotasPactadas('1');
      setRealizaAbono(false);
      setMontoAbonado('');
      
      const dataProductosActualizados = await productosService.obtenerParaVentas();
      setProductos(dataProductosActualizados);
      
      setTimeout(() => setMensaje(''), 3000);
    } catch (error) {
      setMensaje(`❌ Error al procesar: ${error.message || 'Fallo transaccional'}`);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen pb-24 font-sans text-gray-900 selection:bg-indigo-100">
      
      <header className="bg-indigo-700 text-white px-4 py-4 shadow-md sticky top-0 z-10 flex justify-between items-center w-full">
        <h1 className="text-base font-black tracking-wider uppercase">📦 NUEVA VENTA</h1>
        <span className="text-xs bg-indigo-600 px-2.5 py-1 rounded-lg font-black">
          🛒 {carrito.reduce((acc, i) => acc + i.cantidad, 0)} u.
        </span>
      </header>

      <main className="p-3 space-y-4 max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* PANEL IZQUIERDO: SELECCIÓN */}
        <div className="space-y-4">
          <section className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 relative z-40">
            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest">Seleccionar Comprador</label>
            <input 
              type="text" placeholder="🔍 Escribe para buscar cliente..." value={buscarCliente}
              onFocus={() => setMostrarSugerenciasClientes(true)}
              onBlur={() => setTimeout(() => setMostrarSugerenciasClientes(false), 200)}
              onChange={(e) => { setBuscarCliente(e.target.value); setClienteSeleccionado(''); }}
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs bg-white focus:outline-none focus:border-indigo-600 font-bold"
            />
            {mostrarSugerenciasClientes && (
              <ul className="absolute left-3 right-3 bg-white border border-gray-200 rounded-xl shadow-xl max-h-40 overflow-y-auto text-xs mt-1 divide-y divide-gray-50">
                {clientes.filter(c => c.nombre.toLowerCase().includes(buscarCliente.toLowerCase())).map(c => (
                  <li key={c.id} onMouseDown={() => { setBuscarCliente(c.nombre); setClienteSeleccionado(c.id); }} className="p-2.5 hover:bg-indigo-50 cursor-pointer font-bold transition-colors">{c.nombre}</li>
                ))}
              </ul>
            )}
          </section>

          <section className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 relative z-30">
            <form onSubmit={agregarAlCarrito} className="space-y-3">
              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest">Prenda Base</label>
                <input 
                  type="text" placeholder="🔍 Escribe para buscar artículo..." value={buscarProducto}
                  onFocus={() => setMostrarSugerenciasProductos(true)}
                  onBlur={() => setTimeout(() => setMostrarSugerenciasProductos(false), 200)}
                  onChange={(e) => { setBuscarProducto(e.target.value); setProductoSeleccionado(null); setTalleSeleccionado(null); }}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs bg-gray-50 focus:outline-none focus:border-indigo-600 font-bold"
                />
                {mostrarSugerenciasProductos && (
                  <ul className="absolute left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl max-h-40 overflow-y-auto text-xs mt-1 divide-y divide-gray-50">
                    {productos.filter(p => p.titulo.toLowerCase().includes(buscarProducto.toLowerCase())).map(p => (
                      <li key={p.id} onMouseDown={() => { setBuscarProducto(`${p.titulo} - $${p.precio}`); setProductoSeleccionado(p); setTalleSeleccionado(null); }} className="p-2.5 hover:bg-indigo-50 cursor-pointer flex justify-between items-center font-bold">
                        <span>{p.titulo}</span> <span className="text-indigo-600">${p.precio}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {productoSeleccionado && (
                <div className="space-y-1.5 bg-gray-50/50 p-2 rounded-xl border border-gray-100 animate-fade-in">
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest">Talles Disponibles</label>
                  <div className="flex flex-wrap gap-1.5">
                    {productoSeleccionado.stock_variantes?.map((v) => {
                      const tieneStock = v.stock > 0;
                      return (
                        <button key={v.id} type="button" disabled={!tieneStock} onClick={() => setTalleSeleccionado(v)}
                          className={`px-3 py-2 text-xs font-black rounded-xl border flex flex-col items-center min-w-[55px] transition-all ${!tieneStock ? 'bg-gray-100 text-gray-300 border-gray-100 line-through' : 'bg-white text-gray-700 border-gray-200 hover:bg-indigo-50'} ${talleSeleccionado?.id === v.id ? 'bg-indigo-600 text-white border-indigo-600 scale-95' : ''}`}
                        >
                          <span>{v.talle}</span>
                          <span className="text-[8px]">{tieneStock ? `${v.stock}u` : '0u'}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <button type="submit" className="w-full bg-slate-900 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-widest cursor-pointer transition-colors">➕ Cargar al carrito</button>
            </form>
          </section>
        </div>

        {/* PANEL DERECHO: DETALLE, RESUMEN Y PLAN DE PAGOS */}
        <div className="space-y-4">
          <section className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-4 flex flex-col h-full">
            
            {/* NUEVO: LISTADO DETALLADO DEL CARRITO */}
            <div>
              <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 border-b border-gray-50 pb-1">Detalle del Pedido</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {carrito.length === 0 ? (
                  <p className="text-xs text-center text-gray-400 italic py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">El carrito está vacío.</p>
                ) : (
                  carrito.map((item, index) => (
                    <div key={index} className="flex justify-between items-center bg-gray-50 p-2.5 rounded-xl border border-gray-100 animate-fade-in">
                      <div className="flex-1">
                        <p className="text-[11px] font-black text-gray-800 leading-tight">{item.titulo}</p>
                        <p className="text-[10px] font-bold text-gray-500 mt-0.5">
                          Talle: <span className="text-indigo-600 bg-indigo-50 px-1 rounded">{item.talle}</span> | {item.cantidad} x ${item.precio}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-slate-800">${(item.cantidad * item.precio).toLocaleString('es-AR')}</span>
                        <button type="button" onClick={() => quitarDelCarrito(item.variante_id)} className="text-[10px] bg-red-100 text-red-600 hover:bg-red-200 px-2 py-1.5 rounded-lg font-black cursor-pointer transition-colors" title="Quitar">
                          ❌
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/50 flex justify-between items-center mt-auto">
              <span className="text-[9px] font-black text-indigo-700 uppercase tracking-wider">Total a Cobrar</span>
              <span className="text-lg font-black text-indigo-900">${totalVenta.toLocaleString('es-AR')}</span>
            </div>

            <div className="space-y-3 pt-2 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-gray-400 uppercase">Modalidad</label>
                  <select value={tipoPago} onChange={handleCambioTipoPago} className="mt-1 w-full border border-gray-200 rounded-xl px-2 py-2 text-xs font-black bg-white focus:outline-none">
                    <option value="Unico">Único/Contado</option>
                    <option value="Semanal">Plan Semanal</option>
                    <option value="Quincenal">Plan Quincenal</option>
                    <option value="Mensual">Plan Mensual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-gray-400 uppercase">Cuotas</label>
                  <select disabled={tipoPago === 'Unico'} value={cuotasPactadas} onChange={(e) => setCuotasPactadas(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-xl px-2 py-2 text-xs font-black bg-white focus:outline-none disabled:bg-gray-100 disabled:text-gray-400">
                    <option value="1">1 Pago</option>
                    <option value="2">2 Cuotas</option>
                    <option value="3">3 Cuotas</option>
                    <option value="4">4 Cuotas</option>
                    <option value="6">6 Cuotas</option>
                  </select>
                </div>
              </div>

              <div className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-xl space-y-3 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={realizaAbono}
                    onChange={(e) => setRealizaAbono(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
                    💵 ¿Abona dinero en el acto?
                  </span>
                </label>

                {realizaAbono && (
                  <div className="flex gap-2 animate-fade-in">
                    <input 
                      type="number" step="0.01" min="0" placeholder="Monto Ej: 5000"
                      value={montoAbonado} onChange={(e) => setMontoAbonado(e.target.value)}
                      className="w-1/2 border border-emerald-200 rounded-lg px-2 py-2 text-xs font-mono font-black focus:outline-none focus:border-emerald-500"
                    />
                    <select 
                      value={metodoPagoAbono} onChange={(e) => setMetodoPagoAbono(e.target.value)}
                      className="w-1/2 border border-emerald-200 rounded-lg px-2 py-2 text-[11px] font-bold bg-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Efectivo">Efectivo</option>
                      <option value="Transferencia">Transferencia</option>
                      <option value="Tarjeta">Tarjeta</option>
                    </select>
                  </div>
                )}
                
                {realizaAbono && montoAbonado && parseFloat(montoAbonado) < totalVenta && (
                  <p className="text-[10px] font-bold text-emerald-800 animate-fade-in">
                    Deuda pendiente generada: ${(totalVenta - parseFloat(montoAbonado)).toLocaleString('es-AR')}
                  </p>
                )}
              </div>

              {mensaje && <p className={`text-[10px] font-bold p-3 rounded-xl text-center ${mensaje.startsWith('❌') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>{mensaje}</p>}

              <button type="button" disabled={cargando || carrito.length === 0} onClick={finalizarVenta} className={`w-full text-white font-black py-3.5 rounded-xl text-xs uppercase tracking-widest shadow-md transition-colors cursor-pointer mt-4 ${carrito.length === 0 ? 'bg-gray-300 cursor-not-allowed shadow-none' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                {cargando ? 'Procesando...' : '✔️ CONFIRMAR VENTA'}
              </button>
            </div>
          </section>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-3 bg-white/80 backdrop-blur-md border-t border-gray-100 flex justify-center z-10">
        <a href="/admin" className="w-full max-w-sm text-center bg-gray-800 text-white font-black py-3 rounded-xl text-xs tracking-wider hover:bg-gray-900 transition-colors">⬅️ VOLVER AL PANEL</a>
      </footer>
    </div>
  );
}