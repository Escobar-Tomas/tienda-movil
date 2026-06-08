'use client';
import { useState, useEffect } from 'react';
import { productosService } from '@/services/productosService';
import { categoriasService } from '@/services/categoriasService';

export default function GestionProductos() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  
  const [busqueda, setBusqueda] = useState('');
  const [mostrarModal, setMostrarModal] = useState(false);

  // Estados del Formulario
  const [editandoId, setEditandoId] = useState(null);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  
  // Estados para manejo de Imagen
  const [imagenUrl, setImagenUrl] = useState(''); // Guarda la URL de la base de datos o la vista previa local
  const [archivoImagen, setArchivoImagen] = useState(null); // Guarda el archivo físico (File) listo para subir
  
  const [variantes, setVariantes] = useState([{ id: null, talle: '', stock: 0 }]);

  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [dataProds, dataCats] = await Promise.all([
        productosService.obtenerTodosAdmin(),
        categoriasService.obtenerTodas()
      ]);
      setProductos(dataProds);
      setCategorias(dataCats);
    } catch (error) {
      console.error(error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const abrirModalNuevo = () => {
    setEditandoId(null);
    setTitulo('');
    setDescripcion('');
    setPrecio('');
    setCategoriaId(categorias.length > 0 ? categorias[0].id : '');
    setImagenUrl('');
    setArchivoImagen(null);
    setVariantes([{ id: null, talle: '', stock: 0 }]);
    setMensaje('');
    setMostrarModal(true);
  };

  const prepararEdicion = (prod) => {
    setEditandoId(prod.id);
    setTitulo(prod.titulo);
    setDescripcion(prod.descripcion || '');
    setPrecio(prod.precio.toString());
    setCategoriaId(prod.categoria_id || '');
    setImagenUrl(prod.imagen_url || '');
    setArchivoImagen(null); // Reseteamos el archivo local al editar
    
    if (prod.stock_variantes && prod.stock_variantes.length > 0) {
      setVariantes(prod.stock_variantes);
    } else {
      setVariantes([{ id: null, talle: '', stock: 0 }]);
    }
    
    setMensaje('');
    setMostrarModal(true);
  };

  // En tu función abrirModalNuevo o agregarVarianteFila
  const agregarVarianteFila = () => {
    setVariantes([...variantes, { id: null, talle: '', stock: 0 }]); // id: null es correcto aquí
  };

  const actualizarVariante = (index, campo, valor) => {
    const nuevasVariantes = [...variantes];
    nuevasVariantes[index][campo] = valor;
    setVariantes(nuevasVariantes);
  };

  const quitarVarianteFila = (index) => {
    const nuevasVariantes = variantes.filter((_, i) => i !== index);
    setVariantes(nuevasVariantes);
  };

  // Manejo de la selección del archivo local
  const handleSeleccionImagen = (e) => {
    const file = e.target.files[0];
    if (file) {
      setArchivoImagen(file);
      setImagenUrl(URL.createObjectURL(file)); // Crea una URL temporal para previsualizar la foto
    }
  };

  // Persistencia global
  const guardarProducto = async (e) => {
    e.preventDefault();
    setProcesando(true);
    setMensaje('');

    const variantesValidas = variantes.filter(v => v.talle.trim() !== '');

    try {
      let urlFinal = imagenUrl; // Por defecto mantenemos la URL que ya exista

      // Si el usuario seleccionó un archivo nuevo desde su computadora, lo subimos al bucket
      if (archivoImagen) {
        setMensaje('⏳ Subiendo fotografía al servidor...');
        urlFinal = await productosService.subirImagen(archivoImagen);
      }

      setMensaje('⏳ Guardando datos del producto...');
      const payload = {
        titulo,
        descripcion: descripcion || null,
        precio: parseFloat(precio),
        categoria_id: categoriaId || null,
        imagen_url: urlFinal || null
      };

      await productosService.guardarProducto(editandoId, payload, variantesValidas);
      
      setMensaje('✅ Producto guardado con éxito.');
      setTimeout(() => {
        setMostrarModal(false);
        cargarDatos();
      }, 800);
      
    } catch (error) {
      setMensaje(`❌ Error al guardar: ${error.message}`);
    } finally {
      setProcesando(false);
    }
  };

  const cambiarEstadoProducto = async (id, estadoActual) => {
    try {
      if (estadoActual) {
        await productosService.eliminar(id);
      } else {
        await productosService.reactivar(id);
      }
      cargarDatos();
    } catch (error) {
      alert("Error al cambiar el estado del producto.");
    }
  };

  const productosFiltrados = productos.filter(p => 
    p.titulo.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="bg-gray-100 min-h-screen pb-24 font-sans text-gray-900">
      
      <header className="bg-indigo-700 text-white px-4 py-4 shadow-md sticky top-0 z-10 flex justify-between items-center w-full">
        <h1 className="text-base font-black tracking-wider">📦 INVENTARIO</h1>
        <button 
          onClick={abrirModalNuevo}
          className="bg-green-600 hover:bg-green-700 text-white font-extrabold py-2 px-3 rounded-xl text-xs shadow-md active:scale-95 flex items-center gap-1 cursor-pointer"
        >
          <span>➕</span> Nuevo Artículo
        </button>
      </header>

      <main className="p-3 space-y-4 max-w-5xl mx-auto">
        <section className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
          <input 
            type="text" placeholder="🔍 Buscar artículo..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs bg-gray-50 focus:outline-none focus:border-indigo-600 font-medium"
          />
        </section>

        <section>
          {cargando ? (
            <p className="text-center py-10 text-xs font-bold text-gray-400">Cargando inventario...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {productosFiltrados.map((prod) => {
                const stockTotal = prod.stock_variantes?.reduce((acc, v) => acc + v.stock, 0) || 0;
                
                return (
                  <div key={prod.id} className={`bg-white p-4 rounded-2xl shadow-sm border ${prod.activo ? 'border-gray-100' : 'border-red-200 opacity-75'} flex flex-col justify-between`}>
                    <div>
                      {/* Cabecera de la Tarjeta y Preview de Imagen */}
                      <div className="flex justify-between items-start mb-3">
                        {prod.imagen_url ? (
                           <img src={prod.imagen_url} alt="Prod" className="w-12 h-12 rounded-lg object-cover border border-gray-200 shadow-xs" />
                        ) : (
                           <div className="w-12 h-12 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center text-xl">🛍️</div>
                        )}
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[9px] bg-gray-100 text-gray-500 font-black px-2 py-0.5 rounded-md uppercase tracking-widest border border-gray-200">
                            {prod.categorias?.nombre || 'Sin Categoría'}
                          </span>
                          {!prod.activo && (
                            <span className="text-[9px] bg-red-100 text-red-600 font-black px-2 py-0.5 rounded-md uppercase tracking-widest border border-red-200">
                              Oculto
                            </span>
                          )}
                        </div>
                      </div>

                      <h3 className="font-extrabold text-gray-800 text-sm leading-tight">{prod.titulo}</h3>
                      <p className="text-xs text-gray-400 font-medium line-clamp-1 mb-2">{prod.descripcion || 'Sin descripción'}</p>
                      
                      <div className="flex justify-between items-end mb-3">
                        <p className="font-mono font-black text-emerald-600 text-lg">${prod.precio}</p>
                        <p className={`text-xs font-black ${stockTotal === 0 ? 'text-red-500' : 'text-indigo-600'}`}>
                          {stockTotal} uds. total
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-1 mb-3">
                        {prod.stock_variantes?.map(v => (
                          <div key={v.id} className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${v.stock > 0 ? 'bg-indigo-50 border-indigo-100 text-indigo-700' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                            {v.talle}: {v.stock}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-50">
                      <button onClick={() => prepararEdicion(prod)} className="bg-blue-50 text-blue-700 font-extrabold text-xs py-2 rounded-xl cursor-pointer">✏️ Editar</button>
                      <button 
                        onClick={() => cambiarEstadoProducto(prod.id, prod.activo)} 
                        className={`${prod.activo ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'} font-extrabold text-xs py-2 rounded-xl cursor-pointer`}
                      >
                        {prod.activo ? '👁️ Ocultar' : '♻️ Reactivar'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-3 bg-white/80 backdrop-blur-md border-t border-gray-100 flex justify-center z-10">
        <a href="/admin" className="w-full max-w-md text-center bg-gray-800 text-white font-black py-3 rounded-xl text-xs active:scale-95 tracking-wider">⬅️ VOLVER AL PANEL GENERAL</a>
      </footer>

      {/* MODAL ALTA / EDICIÓN */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-5 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="text-sm font-black text-gray-900 tracking-tight">{editandoId ? '✏️ MODIFICAR ARTÍCULO' : '➕ NUEVO ARTÍCULO'}</h3>
              <button onClick={() => setMostrarModal(false)} className="text-gray-400 hover:text-gray-600 text-xs font-black p-1 cursor-pointer">CERRAR</button>
            </div>

            <form onSubmit={guardarProducto} className="space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[9px] font-bold text-gray-400 uppercase">Título del Producto *</label>
                  <input type="text" required value={titulo} onChange={(e) => setTitulo(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 bg-gray-50 focus:outline-none focus:border-indigo-600 font-bold" />
                </div>
                
                <div>
                  <label className="block text-[9px] font-bold text-gray-400 uppercase">Categoría</label>
                  <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 bg-gray-50 focus:outline-none focus:border-indigo-600 font-bold">
                    <option value="">-- Ninguna --</option>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-gray-400 uppercase">Precio ($) *</label>
                  <input type="number" step="0.01" min="0" required value={precio} onChange={(e) => setPrecio(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 bg-gray-50 focus:outline-none focus:border-indigo-600 font-mono font-bold" />
                </div>

                {/* NUEVO INPUT PARA CARGA DE FOTOGRAFÍAS */}
                <div className="sm:col-span-2 bg-gray-50 border border-gray-200 p-3 rounded-2xl flex items-center gap-4">
                  <div className="flex-grow">
                    <label className="block text-[9px] font-bold text-gray-400 uppercase">Fotografía del Artículo</label>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleSeleccionImagen} 
                      className="mt-1 w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                    />
                  </div>
                  {imagenUrl && (
                    <img src={imagenUrl} alt="Vista Previa" className="w-14 h-14 object-cover rounded-xl border border-gray-200 shadow-xs flex-shrink-0" />
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[9px] font-bold text-gray-400 uppercase">Descripción</label>
                  <textarea rows="2" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-900 bg-gray-50 resize-none focus:outline-none focus:border-indigo-600 font-medium" />
                </div>
              </div>

              {/* CURVA DE TALLES */}
              <div className="bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-[10px] font-black text-indigo-800 uppercase tracking-widest">Curva de Talles y Stock</label>
                  <button type="button" onClick={agregarVarianteFila} className="text-[10px] bg-indigo-600 text-white px-2 py-1 rounded-md font-bold shadow-sm cursor-pointer">+ Añadir Talle</button>
                </div>
                
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {variantes.map((v, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <input 
                        type="text" placeholder="Talle (Ej: XL)" value={v.talle} onChange={(e) => actualizarVariante(index, 'talle', e.target.value)} 
                        className="flex-1 border border-indigo-200 rounded-lg px-2 py-1.5 text-xs font-bold focus:outline-none"
                      />
                      <input 
                        type="number" min="0" placeholder="Cant." value={v.stock} onChange={(e) => actualizarVariante(index, 'stock', e.target.value)} 
                        className="w-20 border border-indigo-200 rounded-lg px-2 py-1.5 text-xs font-mono font-bold focus:outline-none"
                      />
                      {variantes.length > 1 && (
                        <button type="button" onClick={() => quitarVarianteFila(index)} className="text-red-500 hover:bg-red-50 p-1 rounded-md font-black cursor-pointer">X</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {mensaje && (
                <p className={`text-[10px] font-bold p-2 rounded-lg text-center ${mensaje.includes('❌') ? 'bg-red-50 text-red-600' : 'bg-indigo-100 text-indigo-800'}`}>{mensaje}</p>
              )}

              <button type="submit" disabled={procesando} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3.5 rounded-xl text-xs uppercase tracking-widest shadow-md transition-colors cursor-pointer">
                {procesando ? 'Impactando en Base de Datos...' : '💾 GUARDAR INVENTARIO'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}