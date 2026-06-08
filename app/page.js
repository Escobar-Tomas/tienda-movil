"use client";
import { useState, useEffect } from "react";
import { categoriasService } from "@/services/categoriasService";
import { productosService } from "@/services/productosService";

export default function CatalogoPublico() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Estados del Carrito y Drawer
  const [carrito, setCarrito] = useState([]);
  const [verCarrito, setVerCarrito] = useState(false);
  const [tallesSeleccionados, setTallesSeleccionados] = useState({});

  // Estado del Toast (Notificaciones)
  const [toast, setToast] = useState({
    visible: false,
    mensaje: "",
    tipo: "success",
  });

  // Búsqueda y Filtros
  const [busqueda, setBusqueda] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("Todas");

  useEffect(() => {
    async function cargarDatos() {
      setCargando(true);
      try {
        const [dataCats, dataProds] = await Promise.all([
          categoriasService.obtenerTodas(),
          productosService.obtenerCatalogoPublico(),
        ]);
        if (dataCats) setCategorias(dataCats);
        if (dataProds) setProductos(dataProds);
      } catch (error) {
        mostrarToast("Error al cargar el catálogo.", "error");
      } finally {
        setCargando(false);
      }
    }
    cargarDatos();
  }, []);

  // Función para mostrar notificaciones flotantes
  const mostrarToast = (mensaje, tipo = "success") => {
    setToast({ visible: true, mensaje, tipo });
    setTimeout(() => {
      setToast({ visible: false, mensaje: "", tipo: "success" });
    }, 3000);
  };

  const seleccionarTalle = (productoId, variante) => {
    setTallesSeleccionados({
      ...tallesSeleccionados,
      [productoId]: variante,
    });
  };

  const agregarAlCarrito = (producto) => {
    const varianteSeleccionada = tallesSeleccionados[producto.id];

    if (!varianteSeleccionada) {
      mostrarToast("Selecciona un talle antes de agregar", "error");
      return;
    }

    const existe = carrito.find(
      (item) => item.variante_id === varianteSeleccionada.id,
    );

    if (existe) {
      if (existe.cantidad >= varianteSeleccionada.stock) {
        mostrarToast(
          `Solo quedan ${varianteSeleccionada.stock} unidades disponibles`,
          "error",
        );
        return;
      }
      setCarrito(
        carrito.map((item) =>
          item.variante_id === varianteSeleccionada.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item,
        ),
      );
    } else {
      setCarrito([
        ...carrito,
        {
          producto_id: producto.id,
          variante_id: varianteSeleccionada.id,
          titulo: producto.titulo,
          talle: varianteSeleccionada.talle,
          precio: parseFloat(producto.precio),
          cantidad: 1,
          stockMaximo: varianteSeleccionada.stock,
          imagen: producto.imagen_url,
        },
      ]);
    }

    // Limpiamos la selección y mostramos confirmación
    const nuevosTalles = { ...tallesSeleccionados };
    delete nuevosTalles[producto.id];
    setTallesSeleccionados(nuevosTalles);

    mostrarToast("🛍️ ¡Prenda agregada al carrito!");
  };

  const quitarDelCarrito = (variante_id) => {
    setCarrito(carrito.filter((item) => item.variante_id !== variante_id));
  };

  const totalCarrito = carrito.reduce(
    (acc, item) => acc + item.precio * item.cantidad,
    0,
  );

  const enviarPedidoWhatsApp = () => {
    if (carrito.length === 0) return;

    let mensajeWA = `¡Hola! Me gustaría encargar el siguiente pedido:\n\n`;
    carrito.forEach((item) => {
      mensajeWA += `🛍️ *${item.cantidad}x* ${item.titulo}\n`;
      mensajeWA += `   • Talle: *${item.talle}*\n`;
      mensajeWA += `   • Subtotal: *$${(item.precio * item.cantidad).toLocaleString("es-AR")}*\n\n`;
    });
    mensajeWA += `*Total estimado: $${totalCarrito.toLocaleString("es-AR")}*\n\n`;
    mensajeWA += `¿Tienen disponibilidad para coordinar la entrega?`;

    // RECUERDA: Coloca tu número de WhatsApp real aquí
    const numeroWhatsApp = "5493815555555";
    const url = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensajeWA)}`;
    window.open(url, "_blank");
  };

  const productosFiltrados = productos.filter((prod) => {
    const coincideCategoria =
      categoriaFiltro === "Todas" ||
      prod.categorias?.nombre === categoriaFiltro;
    const coincideBusqueda = prod.titulo
      .toLowerCase()
      .includes(busqueda.toLowerCase());
    return coincideCategoria && coincideBusqueda;
  });

  return (
    <div className="bg-slate-50 min-h-screen font-sans text-slate-900 pb-20">
      {/* TOAST FLOTANTE */}
      <div
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-[60] transition-all duration-300 ${toast.visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"}`}
      >
        <div
          className={`px-4 py-3 rounded-full shadow-xl flex items-center gap-2 text-white text-xs font-black tracking-wide ${toast.tipo === "error" ? "bg-red-600" : "bg-slate-900"}`}
        >
          <span>{toast.tipo === "error" ? "❌" : "✅"}</span>
          {toast.mensaje}
        </div>
      </div>

      {/* CABECERA */}
      <header className="bg-white px-4 py-4 shadow-sm sticky top-0 z-30 flex justify-between items-center w-full">
        <h1 className="text-xl font-black tracking-tighter text-slate-900">
          Tienda<span className="text-indigo-600">Móvil</span>
        </h1>
        <button
          onClick={() => setVerCarrito(true)}
          className="relative bg-slate-100 hover:bg-slate-200 p-2.5 rounded-full transition-colors"
        >
          <span className="text-lg">🛒</span>
          {carrito.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[9px] font-black w-5 h-5 flex items-center justify-center rounded-full shadow-md">
              {carrito.reduce((acc, i) => acc + i.cantidad, 0)}
            </span>
          )}
        </button>
      </header>

      <main className="p-4 max-w-5xl mx-auto space-y-6">
        {/* BUSCADOR Y CATEGORÍAS TÁCTILES */}
        <section className="space-y-4">
          <div className="relative">
            <span className="absolute left-4 top-3 text-slate-400">🔍</span>
            <input
              type="text"
              placeholder="¿Qué estás buscando?"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-full pl-10 pr-4 py-3 text-sm font-bold shadow-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
            <button
              onClick={() => setCategoriaFiltro("Todas")}
              className={`px-5 py-2 rounded-full text-xs font-black whitespace-nowrap transition-colors border ${categoriaFiltro === "Todas" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
            >
              Todas
            </button>
            {categorias.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoriaFiltro(cat.nombre)}
                className={`px-5 py-2 rounded-full text-xs font-black whitespace-nowrap transition-colors border ${categoriaFiltro === cat.nombre ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
              >
                {cat.nombre}
              </button>
            ))}
          </div>
        </section>

        {/* CATÁLOGO DE PRODUCTOS */}
        <section>
          {cargando ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 animate-pulse">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-white p-3 rounded-3xl h-64 border border-slate-100 flex flex-col justify-between"
                >
                  <div className="bg-slate-100 h-32 rounded-2xl mb-3"></div>
                  <div className="bg-slate-100 h-4 rounded w-3/4 mb-2"></div>
                  <div className="bg-slate-100 h-4 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : productosFiltrados.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-sm">
              <span className="text-4xl mb-3 block">🕵️‍♂️</span>
              <p className="text-sm font-black text-slate-800">
                No encontramos productos.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Intenta con otra búsqueda o categoría.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 md:gap-6 gap-3">
              {productosFiltrados.map((prod) => {
                const varianteActiva = tallesSeleccionados[prod.id];
                const stockTotal =
                  prod.stock_variantes?.reduce((acc, v) => acc + v.stock, 0) ||
                  0;
                const sinStock = stockTotal === 0;

                return (
                  <div
                    key={prod.id}
                    className="bg-white rounded-3xl p-3 shadow-sm border border-slate-100 flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative mb-3 aspect-square rounded-2xl overflow-hidden bg-slate-50">
                        {prod.imagen_url ? (
                          <img
                            src={prod.imagen_url}
                            alt={prod.titulo}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl">
                            🛍️
                          </div>
                        )}
                        {stockTotal > 0 && stockTotal <= 3 && (
                          <span className="absolute top-2 left-2 bg-red-600 text-white text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-widest shadow-md">
                            ¡Últimas {stockTotal}!
                          </span>
                        )}
                      </div>

                      <h3 className="font-black text-slate-800 text-sm leading-tight mb-1">
                        {prod.titulo}
                      </h3>
                      <p className="font-mono font-black text-indigo-600 text-base mb-3">
                        ${prod.precio.toLocaleString("es-AR")}
                      </p>

                      {!sinStock && (
                        <div className="mb-3">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                            Elegir Talle
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {prod.stock_variantes?.map((v) => (
                              <button
                                key={v.id}
                                disabled={v.stock === 0}
                                onClick={() => seleccionarTalle(prod.id, v)}
                                className={`w-8 h-8 rounded-full text-xs font-black flex items-center justify-center transition-all border ${v.stock === 0 ? "bg-slate-50 text-slate-300 border-slate-100" : varianteActiva?.id === v.id ? "bg-slate-900 text-white border-slate-900 shadow-md scale-110" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}
                              >
                                {v.talle}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => agregarAlCarrito(prod)}
                      disabled={sinStock}
                      className={`w-full py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all mt-2 ${sinStock ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white"}`}
                    >
                      {sinStock ? "Agotado" : "Añadir"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* =========================================
          DRAWER DEL CARRITO LATERAL
      ========================================= */}

      {/* Fondo Oscuro */}
      {verCarrito && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setVerCarrito(false)}
        ></div>
      )}

      {/* Panel Deslizante */}
      <div
        className={`fixed top-0 right-0 h-full w-[85vw] sm:w-[400px] bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${verCarrito ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Cabecera del Drawer */}
        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
            <span>🛒</span> Tu Pedido
          </h2>
          <button
            onClick={() => setVerCarrito(false)}
            className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-sm border border-slate-200"
          >
            ✕
          </button>
        </div>

        {/* Lista de Productos */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {carrito.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
              <span className="text-4xl mb-2">🛍️</span>
              <p className="text-sm font-black">Tu carrito está vacío</p>
              <p className="text-xs font-medium">¡Agrega algunos productos!</p>
            </div>
          ) : (
            carrito.map((item, index) => (
              <div
                key={index}
                className="flex gap-3 bg-white border border-slate-100 p-3 rounded-2xl shadow-sm"
              >
                <div className="w-16 h-16 bg-slate-50 rounded-xl overflow-hidden shrink-0 flex items-center justify-center border border-slate-100">
                  {item.imagen ? (
                    <img
                      src={item.imagen}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    "👕"
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-black text-slate-800 leading-tight pr-4">
                    {item.titulo}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="bg-slate-100 text-slate-600 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                      Talle {item.talle}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      Cant: {item.cantidad}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="font-mono font-black text-indigo-600 text-sm">
                      ${(item.precio * item.cantidad).toLocaleString("es-AR")}
                    </span>
                    <button
                      onClick={() => quitarDelCarrito(item.variante_id)}
                      className="text-[10px] font-black text-red-500 hover:bg-red-50 px-2 py-1 rounded-md transition-colors"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer del Drawer (Total y Checkout) */}
        {carrito.length > 0 && (
          <div className="p-5 bg-white border-t border-slate-100 space-y-4">
            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1">
                Datos para el Pedido
              </h3>

              <input
                type="text"
                placeholder="Tu nombre"
                id="nombreCliente"
                className="w-full text-xs font-bold bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500"
              />
              <input
                type="text"
                placeholder="Barrio o zona de entrega"
                id="zonaEntrega"
                className="w-full text-xs font-bold bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500"
              />
              <select
                id="metodoPago"
                className="w-full text-xs font-bold bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 focus:outline-none"
              >
                <option value="Efectivo">💵 Pago en efectivo</option>
                <option value="Transferencia">📱 Transferencia bancaria</option>
                <option value="Tarjeta">💳 Tarjeta / MercadoPago</option>
              </select>
            </div>

            <div className="flex justify-between items-center bg-slate-900 p-4 rounded-2xl">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Total
              </span>
              <span className="text-lg font-black text-white">
                ${totalCarrito.toLocaleString("es-AR")}
              </span>
            </div>

            <button
              onClick={() => {
                const nombre = document.getElementById("nombreCliente").value;
                const zona = document.getElementById("zonaEntrega").value;
                const pago = document.getElementById("metodoPago").value;

                if (!nombre || !zona) {
                  mostrarToast("Por favor, completa nombre y zona.", "error");
                  return;
                }

                let mensajeWA = `📦 *NUEVO PEDIDO DE: ${nombre.toUpperCase()}*\n\n`;
                carrito.forEach((item) => {
                  mensajeWA += `• ${item.cantidad}x ${item.titulo} (Talle: ${item.talle})\n`;
                });
                mensajeWA += `\n📍 *Zona:* ${zona}\n💳 *Pago:* ${pago}\n`;
                mensajeWA += `\n💰 *Total:* $${totalCarrito.toLocaleString("es-AR")}`;

                const numeroWhatsApp = "5493815555555";
                window.open(
                  `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensajeWA)}`,
                  "_blank",
                );
              }}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-black py-4 rounded-2xl text-xs uppercase tracking-widest shadow-lg shadow-green-500/20 transition-all active:scale-95 cursor-pointer"
            >
              💬 Confirmar y enviar pedido
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
