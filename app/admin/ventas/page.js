'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabase';

export default function NuevaVenta() {
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);

  // Estados del Formulario y Carrito
  const [clienteSeleccionado, setClienteSeleccionado] = useState('');
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [talleSeleccionado, setTalleSeleccionado] = useState(null);
  const [carrito, setCarrito] = useState([]); // [{ producto_id, variante_id, titulo, talle, precio, cantidad, stockMaximo }]
  
  // Estados para los buscadores de autocompletado
  const [buscarCliente, setBuscarCliente] = useState('');
  const [mostrarSugerenciasClientes, setMostrarSugerenciasClientes] = useState(false);

  const [buscarProducto, setBuscarProducto] = useState('');
  const [mostrarSugerenciasProductos, setMostrarSugerenciasProductos] = useState(false);

  // Estados para cumplir los constraints de 'ventas'
  const [tipoPago, setTipoPago] = useState('Unico'); // 'Unico', 'Semanal', 'Quincenal', 'Mensual'
  const [cuotasPactadas, setCuotasPactadas] = useState('1');

  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  // 1. Cargar datos iniciales respetando la relación con stock_variantes
  useEffect(() => {
    async function cargarDatos() {
      const { data: dataClientes } = await supabase.from('clientes').select('*').order('nombre');
      if (dataClientes) setClientes(dataClientes);

      const { data: dataProductos } = await supabase
        .from('productos')
        .select(`
          id,
          titulo,
          precio,
          stock_variantes (
            id,
            talle,
            stock
          )
        `)
        .eq('activo', true)
        .order('titulo');
      
      if (dataProductos) setProductos(dataProductos);
    }
    cargarDatos();
  }, []);

  // 2. Controlar la adición de prendas por talle al carrito móvil
  const agregarAlCarrito = (e) => {
    e.preventDefault();
    if (!productoSeleccionado || !talleSeleccionado) {
      alert('Por favor, selecciona una prenda y su talle.');
      return;
    }

    const existe = carrito.find(item => item.variante_id === talleSeleccionado.id);
    if (existe) {
      if (existe.cantidad >= talleSeleccionado.stock) {
        alert(`Stock insuficiente en mochila. Solo quedan ${talleSeleccionado.stock} unidades de este talle.`);
        return;
      }
      setCarrito(carrito.map(item => 
        item.variante_id === talleSeleccionado.id 
          ? { ...item, cantidad: item.cantidad + 1 } 
          : item
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
    setBuscarProducto(''); // Limpia el buscador de producto tras añadir
  };

  // 3. Envío transaccional mapeado exactamente a tus columnas
  const finalizarVenta = async () => {
    if (!clienteSeleccionado || carrito.length === 0) {
      alert('Faltan datos del cliente o productos en el carrito.');
      return;
    }

    setCargando(true);
    setMensaje('');

    const totalVenta = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);

    // PASO A: Inserción estricta en 'ventas' (coincidencia de nombres y constraints)
    const { data: ventaNueva, error: errorVenta } = await supabase
      .from('ventas')
      .insert([
        {
          cliente_id: clienteSeleccionado,
          total: parseFloat(totalVenta),
          tipo_pago: tipoPago, // 'Unico', 'Semanal', 'Quincenal', 'Mensual'
          cuotas_pactadas: parseInt(cuotasPactadas)
        }
      ])
      .select()
      .single();

    if (errorVenta) {
      setMensaje(`❌ Error en tabla ventas: ${errorVenta.message}`);
      setCargando(false);
      return;
    }

    // PASO B: Inserción en 'detalles_venta' y rebaja en 'stock_variantes'
    try {
      for (const item of carrito) {
        // Estructura exacta de tu tabla detalles_venta
        await supabase.from('detalles_venta').insert([
          {
            venta_id: ventaNueva.id,
            producto_id: item.producto_id,
            cantidad: parseInt(item.cantidad),
            precio_unitario: parseFloat(item.precio)
          }
        ]);

        // Descuento físico en la tabla hija stock_variantes
        const nuevoStock = item.stockMaximo - item.cantidad;
        await supabase
          .from('stock_variantes')
          .update({ stock: nuevoStock })
          .eq('id', item.variante_id);
      }

      setMensaje('✅ ¡Venta registrada e inventario por talle actualizado!');
      setCarrito([]);
      setClienteSeleccionado('');
      setBuscarCliente('');
      setTipoPago('Unico');
      setCuotasPactadas('1');
    } catch (err) {
      setMensaje('❌ Error al procesar los artículos del pedido.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen pb-24 font-sans text-gray-900 selection:bg-indigo-100">
      
      <header className="bg-indigo-700 text-white px-4 py-4 shadow-md sticky top-0 z-10 flex justify-between items-center w-full">
        <h1 className="text-base font-black tracking-wider uppercase">📦 NUEVA VENTA POR TALLE</h1>
        <span className="text-xs bg-indigo-600 px-2.5 py-1 rounded-lg font-black">
          🛒 {carrito.reduce((acc, i) => acc + i.cantidad, 0)} u.
        </span>
      </header>

      <main className="p-3 space-y-4 max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* PANEL IZQUIERDO: CLIENTE Y SELECCIÓN DE PRENDAS */}
        <div className="space-y-4">
          
          {/* SELECCIONAR COMPRADOR CON CAMPO DE TEXTO E HILO DE COINCIDENCIAS */}
          <section className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 relative">
            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest">Seleccionar Comprador</label>
            <input 
              type="text"
              placeholder="🔍 Escribe para buscar en la libreta..."
              value={buscarCliente}
              onFocus={() => setMostrarSugerenciasClientes(true)}
              onBlur={() => setTimeout(() => setMostrarSugerenciasClientes(false), 200)}
              onChange={(e) => {
                setBuscarCliente(e.target.value);
                setClienteSeleccionado(''); // Desmarca el ID interno si sigue modificando el campo
              }}
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs bg-white text-gray-900 font-bold focus:outline-none focus:border-indigo-600"
            />
            
            {/* Lista Flotante de Clientes */}
            {mostrarSugerenciasClientes && (
              <ul className="absolute left-3 right-3 z-30 bg-white border border-gray-200 rounded-xl shadow-xl max-h-40 overflow-y-auto text-xs mt-1 divide-y divide-gray-50">
                {clientes
                  .filter(c => c.nombre.toLowerCase().includes(buscarCliente.toLowerCase()))
                  .map(c => (
                    <li
                      key={c.id}
                      onMouseDown={() => {
                        setBuscarCliente(c.nombre);
                        setClienteSeleccionado(c.id);
                      }}
                      className="p-2.5 hover:bg-indigo-50 cursor-pointer font-bold text-gray-800 transition-colors"
                    >
                      {c.nombre}
                    </li>
                  ))}
                {clientes.filter(c => c.nombre.toLowerCase().includes(buscarCliente.toLowerCase())).length === 0 && (
                  <li className="p-2.5 text-gray-400 italic text-center">Sin coincidencias en la libreta</li>
                )}
              </ul>
            )}
          </section>

          <section className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
            <form onSubmit={agregarAlCarrito} className="space-y-3">
              
              {/* SELECCIONAR PRENDA BASE CON CAMPO DE TEXTO E HILO DE COINCIDENCIAS */}
              <div className="relative">
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest">Prenda Base</label>
                <input 
                  type="text"
                  placeholder="🔍 Escribe para buscar artículo..."
                  value={buscarProducto}
                  onFocus={() => setMostrarSugerenciasProductos(true)}
                  onBlur={() => setTimeout(() => setMostrarSugerenciasProductos(false), 200)}
                  onChange={(e) => {
                    setBuscarProducto(e.target.value);
                    setProductoSeleccionado(null);
                    setTalleSeleccionado(null);
                  }}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs bg-gray-50 text-gray-900 font-bold focus:outline-none focus:border-indigo-600"
                />

                {/* Lista Flotante de Productos */}
                {mostrarSugerenciasProductos && (
                  <ul className="absolute left-0 right-0 z-30 bg-white border border-gray-200 rounded-xl shadow-xl max-h-40 overflow-y-auto text-xs mt-1 divide-y divide-gray-50">
                    {productos
                      .filter(p => p.titulo.toLowerCase().includes(buscarProducto.toLowerCase()))
                      .map(p => (
                        <li
                          key={p.id}
                          onMouseDown={() => {
                            setBuscarProducto(`${p.titulo} - $${p.precio}`);
                            setProductoSeleccionado(p);
                            setTalleSeleccionado(null);
                          }}
                          className="p-2.5 hover:bg-indigo-50 cursor-pointer flex justify-between items-center text-gray-800 font-bold transition-colors"
                        >
                          <span>{p.titulo}</span>
                          <span className="text-indigo-600">${p.precio}</span>
                        </li>
                      ))}
                    {productos.filter(p => p.titulo.toLowerCase().includes(buscarProducto.toLowerCase())).length === 0 && (
                      <li className="p-2.5 text-gray-400 italic text-center">Sin coincidencias en stock</li>
                    )}
                  </ul>
                )}
              </div>

              {/* SELECTOR DE BURBUJAS ERGONÓMICO (Se mantiene intacto) */}
              {productoSeleccionado && (
                <div className="space-y-1.5 animate-fade-in bg-gray-50/50 p-2 rounded-xl border border-gray-100">
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest">Curva de Talles en Mochila</label>
                  <div className="flex flex-wrap gap-1.5">
                    {productoSeleccionado.stock_variantes?.map((v) => {
                      const tieneStock = v.stock > 0;
                      const esElElegido = talleSeleccionado?.id === v.id;
                      
                      return (
                        <button
                          key={v.id} type="button" disabled={!tieneStock}
                          onClick={() => setTalleSeleccionado(v)}
                          className={`px-3 py-2 text-xs font-black rounded-xl border transition-all flex flex-col items-center min-w-[55px]
                            ${!tieneStock ? 'bg-gray-100 text-gray-300 border-gray-100 line-through cursor-not-allowed' : 'bg-white text-gray-700 border-gray-200 active:bg-gray-50'}
                            ${esElElegido ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs scale-95' : ''}
                          `}
                        >
                          <span>{v.talle}</span>
                          <span className={`text-[8px] font-medium ${esElElegido ? 'text-indigo-200' : 'text-gray-400'}`}>
                            {tieneStock ? `${v.stock}u` : '0u'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <button 
                type="submit"
                className="w-full bg-gray-900 text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider active:scale-[0.98] transition-transform"
              >
                ＋ Cargar al carrito
              </button>
            </form>
          </section>
        </div>

        {/* PANEL DERECHO: PLANIFICACIÓN DE COBRO Y CARRITO */}
        <div className="space-y-4">
          <section className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider">Resumen de Venta</h3>
            
            {carrito.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4 font-medium italic">Ningún artículo seleccionado.</p>
            ) : (
              <div className="divide-y divide-gray-50 max-h-40 overflow-y-auto pr-1">
                {carrito.map((item, idx) => (
                  <div key={idx} className="py-2 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-extrabold text-gray-800 truncate">{item.titulo}</p>
                      <p className="text-[10px] text-indigo-600 font-bold">Talle: {item.talle} • {item.cantidad} u. x ${item.precio}</p>
                    </div>
                    <p className="font-black text-gray-900">${(item.precio * item.cantidad).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/50 flex justify-between items-center">
              <span className="text-[9px] font-black text-indigo-700 uppercase tracking-wider">Total del Pedido</span>
              <span className="text-base font-black text-indigo-900">
                ${carrito.reduce((acc, i) => acc + (i.precio * i.cantidad), 0).toFixed(2)}
              </span>
            </div>

            {/* CONFIGURACIÓN DEL PLAN DE COBROS CON CONSTRAINTS EXACTOS */}
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <div>
                <label className="block text-[9px] font-bold text-gray-400 uppercase">Modalidad (`tipo_pago` Check)</label>
                <select
                  value={tipoPago} onChange={(e) => setTipoPago(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs bg-white text-gray-900 font-black focus:outline-none"
                >
                  <option value="Unico">📦 Único / Contado</option>
                  <option value="Semanal">📅 Plan Semanal</option>
                  <option value="Quincenal">📅 Plan Quincenal</option>
                  <option value="Mensual">📅 Plan Mensual</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-gray-400 uppercase">Cuotas (`cuotas_pactadas`)</label>
                <select
                  value={cuotasPactadas} onChange={(e) => setCuotasPactadas(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs bg-white text-gray-900 font-black focus:outline-none"
                >
                  <option value="1">1 Pago único</option>
                  <option value="2">2 Cuotas</option>
                  <option value="3">3 Cuotas</option>
                  <option value="4">4 Cuotas</option>
                  <option value="6">6 Cuotas</option>
                </select>
              </div>

              {mensaje && (
                <p className={`text-xs font-bold p-3 rounded-xl text-center ${mensaje.startsWith('❌') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                  {mensaje}
                </p>
              )}

              <button
                type="button" disabled={cargando || carrito.length === 0} onClick={finalizarVenta}
                className={`w-full text-white font-black py-3.5 rounded-xl text-xs uppercase tracking-widest shadow-md active:scale-[0.99] transition-transform ${carrito.length === 0 ? 'bg-gray-300 cursor-not-allowed shadow-none' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {cargando ? 'Impactando en Supabase...' : '💾 Confirmar Operación'}
              </button>
            </div>
          </section>
        </div>

      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-3 bg-white/80 backdrop-blur-md border-t border-gray-100 flex justify-center z-10">
        <a href="/admin" className="w-full max-w-sm text-center bg-gray-800 text-white font-black py-3 rounded-xl text-xs tracking-wider">
          ⬅️ VOLVER AL PANEL GENERAL
        </a>
      </footer>

    </div>
  );
}