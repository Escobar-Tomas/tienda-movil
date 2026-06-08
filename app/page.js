'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase'; // Ajustado con ruta relativa limpia

export default function CatalogoPublico() {
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [nombreCliente, setNombreCliente] = useState('');
  const [direccionCliente, setDirecciónCliente] = useState('');
  const [mostrarModal, setMostrarModal] = useState(false);
  const [cargando, setCargando] = useState(true);

  // 1. Cargar los productos reales desde tu Supabase
  useEffect(() => {
    async function obtenerProductos() {
      try {
        const { data, error } = await supabase
          .from('productos')
          .select('*'); // Trae todo lo que tengas cargado
        
        if (!error && data) {
          setProductos(data);
        }
      } catch (err) {
        console.error("Error al cargar productos:", err);
      } finally {
        setCargando(false);
      }
    }
    obtenerProductos();
  }, []);

  // 2. Lógica interactiva del Carrito de Compras
  const agregarAlCarrito = (producto) => {
    const existe = carrito.find((item) => item.id === producto.id);
    if (existe) {
      setCarrito(
        carrito.map((item) =>
          item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
        )
      );
    } else {
      setCarrito([...carrito, { ...producto, cantidad: 1 }]);
    }
  };

  const eliminarDelCarrito = (id) => {
    setCarrito(carrito.filter((item) => item.id !== id));
  };

  // 3. Formateo y envío automático del pedido a WhatsApp
  const enviarPedido = (e) => {
    e.preventDefault();
    if (!nombreCliente || !direccionCliente) {
      alert('Por favor, completa tus datos para coordinar la entrega.');
      return;
    }

    let mensaje = `*NUEVO PEDIDO DESDE LA WEB*\n\n`;
    mensaje += `👤 *Cliente:* ${nombreCliente}\n`;
    mensaje += `📍 *Dirección:* ${direccionCliente}\n\n`;
    mensaje += `📦 *Prendas seleccionadas:*\n`;
    
    let totalPedido = 0;
    carrito.forEach((item) => {
      mensaje += `- ${item.cantidad}x ${item.titulo} ($${item.precio} c/u)\n`;
      totalPedido += item.precio * item.cantidad;
    });

    mensaje += `\n💰 *Total Estimado a Coordinar:* $${totalPedido}`;

    // AQUÍ pones el número de celular de tu cliente (vendedor) sin el signo +
    // Por ejemplo para Tucumán, Argentina: 54381XXXXXXX
    const telefonoVendedor = '543815812990'; 
    const url = `https://wa.me/${telefonoVendedor}?text=${encodeURIComponent(mensaje)}`;
    
    window.open(url, '_blank');
    setMostrarModal(false);
    setCarrito([]); // Limpia el carrito tras confirmar
  };

  const totalItems = carrito.reduce((acc, item) => acc + item.cantidad, 0);
  const totalPrecio = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        <p className="mt-4 text-sm text-gray-500 font-medium">Cargando catálogo móvil...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-20 font-sans">
      {/* Encabezado fijo adaptable a celulares */}
      <header className="bg-white shadow-sm sticky top-0 z-10 px-4 py-4 flex justify-between items-center max-w-6xl mx-auto w-full">
        <h1 className="text-xl font-black tracking-tight text-indigo-700">CATÁLOGO MÓVIL</h1>
        <button 
          onClick={() => setMostrarModal(true)}
          className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-transform active:scale-95 ${
            carrito.length === 0 
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
              : 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
          }`}
          disabled={carrito.length === 0}
        >
          🛒 Ver Carrito ({totalItems})
        </button>
      </header>

      {/* Grilla principal optimizada para scrollear en smartphones */}
      <main className="max-w-6xl mx-auto p-4">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Ingresos Disponibles</h2>
        
        {productos.length === 0 ? (
          <div className="bg-white border rounded-2xl p-8 text-center">
            <p className="text-gray-500 text-sm font-medium">No hay prendas disponibles en este momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {productos.map((producto) => (
              <div key={producto.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="relative">
                  <img 
                    src={producto.imagen_url || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=400'} 
                    alt={producto.titulo}
                    className="w-full h-44 object-cover"
                  />
                  {producto.stock <= 0 && (
                    <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                      SIN STOCK
                    </span>
                  )}
                </div>
                
                <div className="p-3 flex flex-col flex-grow justify-between">
                  <div className="mb-2">
                    <h3 className="font-bold text-sm text-gray-800 line-clamp-1">{producto.titulo}</h3>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2 h-8 leading-normal">{producto.descripcion || 'Sin descripción disponible.'}</p>
                  </div>
                  
                  <div className="mt-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-base font-extrabold text-gray-900">${producto.precio}</span>
                      {producto.stock > 0 && (
                        <span className="text-[10px] text-green-600 font-semibold bg-green-50 px-1.5 py-0.5 rounded">
                          {producto.stock} disponibles
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => agregarAlCarrito(producto)}
                      disabled={producto.stock <= 0}
                      className={`mt-3 w-full text-xs font-bold py-2.5 rounded-xl transition-colors ${
                        producto.stock <= 0
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white'
                      }`}
                    >
                      {producto.stock <= 0 ? 'Agotado' : 'Agregar al pedido'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal / Ventana flotante de confirmación de WhatsApp */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-black text-gray-900">Tu Selección</h3>
                <button onClick={() => setMostrarModal(false)} className="text-gray-400 hover:text-gray-600 font-bold text-sm">Cerrar</button>
              </div>

              {/* Resumen de prendas en el carrito */}
              <div className="divide-y divide-gray-100 overflow-y-auto max-h-40 mb-4 pr-1">
                {carrito.map(item => (
                  <div key={item.id} className="py-2 flex justify-between items-center text-sm">
                    <div className="flex-grow">
                      <p className="font-bold text-gray-800">{item.titulo} <span className="text-xs text-gray-400 font-normal">x{item.cantidad}</span></p>
                      <p className="text-xs text-gray-500">${item.precio * item.cantidad}</p>
                    </div>
                    <button 
                      onClick={() => eliminarDelCarrito(item.id)}
                      className="text-red-500 text-xs font-semibold p-1 hover:bg-red-50 rounded"
                    >
                      Quitar
                    </button>
                  </div>
                ))}
                <div className="pt-2 flex justify-between font-black text-gray-900 text-sm">
                  <span>Total estimado:</span>
                  <span>${totalPrecio}</span>
                </div>
              </div>

              {/* Formulario de datos de entrega */}
              <form onSubmit={enviarPedido} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tu Nombre y Apellido</label>
                  <input 
                    type="text" 
                    required
                    value={nombreCliente}
                    onChange={(e) => setNombreCliente(e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-600 bg-gray-50"
                    placeholder="Ej: Lucas Silva"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Dirección / Domicilio</label>
                  <input 
                    type="text" 
                    required
                    value={direccionCliente}
                    onChange={(e) => setDirecciónCliente(e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-600 bg-gray-50"
                    placeholder="Ej: Barrio Sur, Pasaje San Martín 120"
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-green-600 text-white font-bold py-3 rounded-xl text-sm hover:bg-green-700 active:scale-[0.99] transition-transform shadow-md shadow-green-100 flex justify-center items-center gap-2 mt-4"
                >
                  💬 Enviar Pedido por WhatsApp
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}