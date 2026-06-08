'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

export default function CatalogoPublico() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Estado del Carrito de Compras
  const [carrito, setCarrito] = useState([]); // [{ producto_id, variante_id, titulo, talle, precio, cantidad, stockMaximo }]
  const [verCarrito, setVerCarrito] = useState(false);

  // Estados para rastrear qué talle se seleccionó localmente en cada tarjeta de producto
  const [tallesSeleccionados, setTallesSeleccionados] = useState({}); // { [productoId]: varianteObjeto }

  // Estados para Búsqueda y Filtros
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('Todas');
  const [precioMin, setPrecioMin] = useState('');
  const [precioMax, setPrecioMax] = useState('');
  const [orden, setOrden] = useState('novedades');

  useEffect(() => {
    async function cargarDatos() {
      setCargando(true);
      
      // 1. Cargar categorías
      const { data: dataCategorias } = await supabase
        .from('categorias')
        .select('*')
        .order('nombre');
      if (dataCategorias) setCategorias(dataCategorias);

      // 2. Cargar productos activos con sus variantes de stock y nombres de categorías
      const { data: dataProductos } = await supabase
        .from('productos')
        .select(`
          id,
          titulo,
          descripcion,
          precio,
          imagen_url,
          categoria_id,
          categorias ( nombre ),
          stock_variantes ( id, talle, stock )
        `)
        .eq('activo', true)
        .order('created_at', { ascending: false });

      if (dataProductos) setProductos(dataProductos);
      setCargando(false);
    }
    cargarDatos();
  }, []);

  // Motor de Filtrado y Ordenamiento
  const productosMostrados = productos.filter(p => {
    const termino = busqueda.toLowerCase();
    const coincideTexto = p.titulo.toLowerCase().includes(termino) || 
                          (p.descripcion && p.descripcion.toLowerCase().includes(termino));
    const coincideCat = categoriaFiltro === 'Todas' || p.categoria_id === categoriaFiltro;
    const cumpleMin = precioMin === '' || p.precio >= parseFloat(precioMin);
    const cumpleMax = precioMax === '' || p.precio <= parseFloat(precioMax);
    
    // Solo mostrar si el producto posee variantes con stock real superior a 0
    const tieneStock = p.stock_variantes?.some(v => v.stock > 0);

    return coincideTexto && coincideCat && cumpleMin && cumpleMax && tieneStock;
  }).sort((a, b) => {
    if (orden === 'precio_asc') return a.precio - b.precio;
    if (orden === 'precio_desc') return b.precio - a.precio;
    return 0;
  });

  // Funciones de control del Carrito
  const agregarAlCarrito = (producto) => {
    const talleElegido = tallesSeleccionados[producto.id];
    
    if (!talleElegido) {
      alert('Por favor, selecciona un talle antes de cargarlo al carrito.');
      return;
    }

    const existe = carrito.find(item => item.variante_id === talleElegido.id);

    if (existe) {
      if (existe.cantidad >= talleElegido.stock) {
        alert(`Stock límite alcanzado. Solo disponemos de ${talleElegido.stock} unidades de este talle.`);
        return;
      }
      setCarrito(carrito.map(item => 
        item.variante_id === talleElegido.id ? { ...item, cantidad: item.cantidad + 1 } : item
      ));
    } else {
      setCarrito([...carrito, {
        producto_id: producto.id,
        variante_id: talleElegido.id,
        titulo: producto.titulo,
        talle: talleElegido.talle,
        precio: parseFloat(producto.precio),
        cantidad: 1,
        stockMaximo: talleElegido.stock
      }]);
    }

    // Limpiar selección de talle en esa tarjeta tras agregar
    setTallesSeleccionados({ ...tallesSeleccionados, [producto.id]: null });
  };

  const modificarCantidad = (varianteId, cambio) => {
    setCarrito(carrito.map(item => {
      if (item.variante_id === varianteId) {
        const nuevaCant = item.cantidad + cambio;
        if (nuevaCant > item.stockMaximo) {
          alert(`Disculpas, no hay más stock disponible.`);
          return item;
        }
        return nuevaCant > 0 ? { ...item, cantidad: nuevaCant } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const eliminarDelCarrito = (varianteId) => {
    setCarrito(carrito.filter(item => item.variante_id !== varianteId));
  };

  const totalCarrito = carrito.reduce((acc, i) => acc + (i.precio * i.cantidad), 0);
  const totalUnidades = carrito.reduce((acc, i) => acc + i.cantidad, 0);

  // Compilación del mensaje y salida hacia la API de WhatsApp
  // Compilación del mensaje y salida hacia la API de WhatsApp
  const enviarPedidoWhatsApp = () => {
    if (carrito.length === 0) return;

    let mensajeWA = `¡Hola! Me gustaría encargar el siguiente pedido:\n\n`;
    
    carrito.forEach(item => {
      mensajeWA += `🛍️ *${item.cantidad}x* ${item.titulo}\n`;
      mensajeWA += `   • Talle: *${item.talle}*\n`;
      mensajeWA += `   • Subtotal: *$${(item.precio * item.cantidad).toLocaleString('es-AR')}*\n\n`;
    });

    mensajeWA += `*Total estimado del pedido: $${totalCarrito.toLocaleString('es-AR')}*\n\n`;
    mensajeWA += `¿Tienen disponibilidad en stock para coordinar la entrega?`;

    // 👇 AQUÍ PONES TU NÚMERO (Ejemplo: 5493815555555)
    const numeroWhatsApp = "543815812990"; 
    
    // 👇 Modificamos la URL para incluir el número antes del ?text=
    const url = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensajeWA)}`;
    
    window.open(url, '_blank');
  };

  return (
    <div className="bg-[#F8FAFC] min-h-screen font-sans text-slate-900 pb-24 selection:bg-indigo-100">
      
      {/* HERO SECTION */}
      <header className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-800 text-white pt-14 pb-12 px-6 text-center rounded-b-[3rem] shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
        <div className="relative z-10">
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-3 drop-shadow-md">NUESTRO CATÁLOGO</h1>
          <p className="text-indigo-100 text-sm md:text-base font-medium max-w-lg mx-auto">
            Armá tu carrito con tus prendas favoritas y envianos tu pedido por WhatsApp de forma directa.
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 -mt-8 relative z-20">
        
        {/* PANEL DE CONTROL DE BÚSQUEDA Y FILTROS */}
        <div className="bg-white/90 backdrop-blur-xl p-5 rounded-3xl shadow-lg border border-slate-100 mb-10 space-y-5">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 group">
              <span className="absolute inset-y-0 left-4 flex items-center text-slate-400 group-focus-within:text-indigo-600 transition-colors text-lg">🔍</span>
              <input 
                type="text" placeholder="¿Qué prenda estás buscando hoy?" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-medium transition-all"
              />
            </div>
            
            <select
              value={orden} onChange={(e) => setOrden(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none min-w-[160px] cursor-pointer"
            >
              <option value="novedades">✨ Más Recientes</option>
              <option value="precio_asc">💵 Menor a Mayor</option>
              <option value="precio_desc">💎 Mayor a Menor</option>
            </select>
          </div>

          <hr className="border-slate-100" />

          <div className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center">
            {/* Categorías */}
            <div className="w-full lg:w-auto overflow-hidden">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2">Categorías</h3>
              <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-1">
                <button
                  onClick={() => setCategoriaFiltro('Todas')}
                  className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all ${categoriaFiltro === 'Todas' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  Todas
                </button>
                {categorias.map(cat => (
                  <button
                    key={cat.id} onClick={() => setCategoriaFiltro(cat.id)}
                    className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all ${categoriaFiltro === cat.id ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    {cat.nombre}
                  </button>
                ))}
              </div>
            </div>

            {/* Rango de Precios */}
            <div className="w-full lg:w-auto flex flex-col sm:flex-row items-start sm:items-end gap-3">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2">Precio Mínimo</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 font-bold">$</span>
                  <input type="number" placeholder="0" value={precioMin} onChange={(e) => setPrecioMin(e.target.value)} className="w-full sm:w-28 bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-sm font-bold focus:outline-none" />
                </div>
              </div>
              <span className="hidden sm:block text-slate-300 font-bold mb-2">-</span>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2">Precio Máximo</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 font-bold">$</span>
                  <input type="number" placeholder="Máx" value={precioMax} onChange={(e) => setPrecioMax(e.target.value)} className="w-full sm:w-28 bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-sm font-bold focus:outline-none" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* GRILLA DE PRODUCTOS */}
        {cargando ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
            <p className="text-sm font-bold text-slate-500 animate-pulse">Preparando catálogo...</p>
          </div>
        ) : productosMostrados.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm">
            <h3 className="text-xl font-black text-slate-800 mb-2">No encontramos coincidencias</h3>
            <p className="text-slate-500 font-medium max-w-sm mx-auto mb-6">Prueba removiendo filtros o modificando el rango de precios.</p>
            <button onClick={() => { setBusqueda(''); setCategoriaFiltro('Todas'); setPrecioMin(''); setPrecioMax(''); }} className="bg-indigo-50 text-indigo-700 font-bold px-8 py-3 rounded-xl text-sm active:scale-95 transition-transform">Borrar Filtros</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {productosMostrados.map((prod) => {
              const talleActual = tallesSeleccionados[prod.id];
              return (
                <div key={prod.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col h-full overflow-hidden group">
                  
                  {/* Contenedor imagen */}
                  <div className="aspect-[4/3] bg-slate-50 relative flex items-center justify-center overflow-hidden">
                    {prod.imagen_url ? (
                      <img src={prod.imagen_url} alt={prod.titulo} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <span className="text-5xl drop-shadow-sm group-hover:scale-105 transition-transform duration-500">🛍️</span>
                    )}
                    {prod.categorias?.nombre && (
                      <span className="absolute top-4 left-4 bg-white/90 backdrop-blur-md text-slate-800 text-[10px] font-black px-3 py-1.5 rounded-lg border border-slate-100 uppercase tracking-widest">{prod.categorias.nombre}</span>
                    )}
                  </div>

                  {/* Detalle Producto */}
                  <div className="p-5 flex flex-col flex-grow justify-between gap-4">
                    <div className="space-y-2">
                      <h2 className="text-base font-black text-slate-900 leading-snug line-clamp-2">{prod.titulo}</h2>
                      {prod.descripcion && <p className="text-xs text-slate-500 font-medium line-clamp-2">{prod.descripcion}</p>}
                    </div>

                    {/* SELECTOR INTERACTIVO INTERNO DE TALLES */}
                    <div className="space-y-2 pt-2 border-t border-slate-50">
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Talles Disponibles</label>
                      <div className="flex flex-wrap gap-1.5">
                        {prod.stock_variantes?.filter(v => v.stock > 0).map(v => {
                          const esSeleccionado = talleActual?.id === v.id;
                          return (
                            <button
                              key={v.id} type="button"
                              onClick={() => setTallesSeleccionados({ ...tallesSeleccionados, [prod.id]: v })}
                              className={`px-3 py-1.5 text-xs font-black rounded-lg border transition-all ${esSeleccionado ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-slate-50 text-slate-700 border-slate-200 active:bg-slate-100'}`}
                            >
                              {v.talle}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-3 pt-2">
                      <p className="text-2xl font-black text-emerald-600 font-mono">${prod.precio.toLocaleString('es-AR')}</p>
                      
                      <button
                        type="button" onClick={() => agregarAlCarrito(prod)}
                        className="w-full bg-slate-900 hover:bg-indigo-600 text-white text-xs font-black py-3.5 rounded-xl transition-all shadow-md shadow-slate-200 active:scale-95 cursor-pointer"
                      >
                        🛒 Agregar al Carrito {talleActual ? `(${talleActual.talle})` : ''}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* BOTÓN FLOTANTE DEL CARRITO (Aparece si hay productos agregados) */}
      {totalUnidades > 0 && (
        <button
          onClick={() => setVerCarrito(true)}
          className="fixed bottom-6 right-6 z-50 bg-indigo-600 text-white font-black p-4 rounded-full shadow-2xl flex items-center justify-center gap-2 hover:bg-indigo-700 active:scale-95 transition-transform border border-indigo-500 cursor-pointer"
        >
          <span className="text-xl">🛒</span>
          <span className="bg-white text-indigo-600 text-xs px-2 py-0.5 rounded-full font-black font-mono shadow-xs">{totalUnidades}</span>
          <span className="text-xs pr-1 font-bold">${totalCarrito.toLocaleString('es-AR')}</span>
        </button>
      )}

      {/* DETALLE/MODAL DEL CARRITO DESPLEGABLE */}
      {verCarrito && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-2 z-50 animate-fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl p-5 w-full max-w-md shadow-2xl max-h-[85vh] flex flex-col justify-between overflow-hidden space-y-4">
            
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 tracking-tight">🛒 TU PEDIDO</h3>
              <button onClick={() => setVerCarrito(false)} className="text-slate-400 hover:text-slate-600 text-xs font-black p-1 cursor-pointer">CERRAR</button>
            </div>

            {/* Listado de Productos en el Carrito */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 pr-1 max-h-[50vh]">
              {carrito.map((item) => (
                <div key={item.variante_id} className="py-3 flex justify-between items-center gap-4 text-xs font-medium">
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-800 truncate">{item.titulo}</p>
                    <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">Talle: {item.talle} • PU: ${item.precio.toLocaleString('es-AR')}</p>
                  </div>
                  
                  {/* Botonera de Ajuste de cantidad ergonómica */}
                  <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-2 py-1 bg-slate-50">
                    <button type="button" onClick={() => modificarCantidad(item.variante_id, -1)} className="font-black text-slate-500 px-1 hover:text-slate-800 text-sm cursor-pointer">-</button>
                    <span className="font-black text-slate-900 font-mono px-1">{item.amount || item.cantidad}</span>
                    <button type="button" onClick={() => modificarCantidad(item.variante_id, 1)} className="font-black text-slate-500 px-1 hover:text-slate-800 text-sm cursor-pointer">+</button>
                  </div>

                  <div className="text-right flex flex-col items-end gap-1">
                    <span className="font-black text-slate-900 font-mono">${(item.precio * item.cantidad).toLocaleString('es-AR')}</span>
                    <button type="button" onClick={() => eliminarDelCarrito(item.variante_id)} className="text-[10px] font-bold text-red-500 hover:underline cursor-pointer">Quitar</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Panel de checkout */}
            <div className="space-y-4 pt-3 border-t border-slate-100">
              <div className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center border border-slate-100">
                <span className="text-[10px] font-black text-slate-400 tracking-wider">TOTAL DEL PEDIDO</span>
                <span className="text-xl font-black text-emerald-600 font-mono">${totalCarrito.toLocaleString('es-AR')}</span>
              </div>

              <button
                type="button" onClick={enviarPedidoWhatsApp}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-xl text-xs uppercase tracking-widest shadow-md flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                💬 Enviar Pedido por WhatsApp
              </button>
            </div>

          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="mt-20 text-center pb-8">
        <div className="w-16 h-1 bg-slate-200 mx-auto rounded-full mb-6"></div>
        <p className="text-xs text-slate-400 font-bold tracking-wide">© {new Date().getFullYear()} MI TIENDA. TODOS LOS DERECHOS RESERVADOS.</p>
      </footer>

      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; scroll-behavior: smooth; }
      `}} />
    </div>
  );
}