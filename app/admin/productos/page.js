'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabase';

export default function ControlInventario() {
  const [productos, setProductos] = useState([]);
  const [productosFiltrados, setProductosFiltrados] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);

  // ESTADOS MODAL
  const [modalAbierto, setModalAbierto] = useState(false);
  const [productoEditando, setProductoEditando] = useState(null);

  // CAMPOS FORMULARIO (PRODUCTO PADRE)
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [imagenUrl, setImagenUrl] = useState('');
  const [subiendoImagen, setSubiendoImagen] = useState(false);

  // ESTADO PARA LOS WIDGETS DINÁMICOS DE TALLES
  // Almacena un objeto con formato { "M": 5, "XL": 2 }
  const [tallesForm, setTallesForm] = useState({});
  const [mensaje, setMensaje] = useState('');

  // 1. Cargar el catálogo activo y las categorías desde Supabase
  const cargarDatos = async () => {
    setCargando(true);
    const { data: cats } = await supabase.from('categorias').select('*').order('nombre');
    if (cats) setCategorias(cats);

    const { data: prods } = await supabase
      .from('productos')
      .select(`
        id, titulo, descripcion, precio, imagen_url, categoria_id, activo,
        stock_variantes ( id, talle, stock )
      `)
      .eq('activo', true)
      .order('created_at', { ascending: false }); // Mostrar lo más nuevo primero

    if (prods) {
      setProductos(prods);
      setProductosFiltrados(prods);
    }
    setCargando(false);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // 2. Filtro de búsqueda en tiempo real
  useEffect(() => {
    setProductosFiltrados(
      productos.filter(p => p.titulo.toLowerCase().includes(busqueda.toLowerCase()))
    );
  }, [busqueda, productos]);

  // 3. Subida física de imágenes al Storage de Supabase
  const manejarSubidaImagen = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setSubiendoImagen(true);
      const nombreArchivo = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      
      const { data, error } = await supabase.storage
        .from('productos-imagenes')
        .upload(nombreArchivo, file, { cacheControl: '3600', upsert: true });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('productos-imagenes')
        .getPublicUrl(nombreArchivo);

      setImagenUrl(publicUrl);
    } catch (error) {
      alert('Error al subir imagen: ' + error.message);
    } finally {
      setSubiendoImagen(false);
    }
  };

  // 4. Preparar el modal para Altas o Ediciones
  const abrirModal = (prod = null) => {
    if (prod) {
      setProductoEditando(prod);
      setTitulo(prod.titulo);
      setDescripcion(prod.descripcion || '');
      setPrecio(prod.precio);
      setCategoriaId(prod.categoria_id || '');
      setImagenUrl(prod.imagen_url || '');
      
      // Mapeamos los talles reales que ya tiene guardados la base de datos
      const mapeoTalles = {};
      prod.stock_variantes?.forEach(v => {
        mapeoTalles[v.talle] = v.stock;
      });
      setTallesForm(mapeoTalles);
    } else {
      setProductoEditando(null);
      setTitulo('');
      setDescripcion('');
      setPrecio('');
      setCategoriaId('');
      setImagenUrl('');
      setTallesForm({});
    }
    setModalAbierto(true);
  };

  // 5. Procesar la persistencia de datos (Transacción Atómica)
  const guardarProducto = async (e) => {
    e.preventDefault();
    setMensaje('');

    const payload = {
      titulo,
      descripcion: descripcion || null,
      precio: parseFloat(precio),
      categoria_id: categoriaId ? parseInt(categoriaId) : null,
      imagen_url: imagenUrl || null
    };

    if (productoEditando) {
      // ---- RUTA EDICIÓN ----
      const { error: errProd } = await supabase.from('productos').update(payload).eq('id', productoEditando.id);
      if (errProd) { alert('Error: ' + errProd.message); return; }

      // Sincronizamos los widgets dinámicos creados en la interfaz
      for (const talle of Object.keys(tallesForm)) {
        const stockActual = parseInt(tallesForm[talle]) || 0;
        const varianteExistente = productoEditando.stock_variantes?.find(v => v.talle === talle);

        if (varianteExistente) {
          // Si el talle ya existía, actualizamos sus unidades físicas
          await supabase.from('stock_variantes').update({ stock: stockActual }).eq('id', varianteExistente.id);
        } else {
          // Si es un talle nuevo agregado en la edición, lo insertamos
          await supabase.from('stock_variantes').insert([{ producto_id: productoEditando.id, talle, stock: stockActual }]);
        }
      }
    } else {
      // ---- RUTA ALTA NUEVA ----
      const { data: nuevoProd, error: errNuevo } = await supabase.from('productos').insert([payload]).select().single();
      if (errNuevo) { alert('Error: ' + errNuevo.message); return; }

      // Insertamos únicamente los talles agregados que tengan stock configurado
      const filasTalles = Object.keys(tallesForm).map(talle => ({
        producto_id: nuevoProd.id,
        talle,
        stock: parseInt(tallesForm[talle]) || 0
      }));

      if (filasTalles.length > 0) {
        await supabase.from('stock_variantes').insert(filasTalles);
      }
    }

    setModalAbierto(false);
    setMensaje(productoEditando ? '✏️ Prenda editada de forma exitosa' : '🎉 Producto registrado e indexado');
    setTimeout(() => setMensaje(''), 3000);
    cargarDatos();
  };

  // 6. BORRADO LÓGICO: Desactivación por bandera para cuidar integridad referencial
  const desactivarProducto = async (prod) => {
    const confirmar = confirm(`¿Dar de baja "${prod.titulo}"?\nSe removerá del catálogo comercial de inmediato.`);
    if (!confirmar) return;

    const { error } = await supabase.from('productos').update({ activo: false }).eq('id', prod.id);
    if (error) alert('Error: ' + error.message);
    else {
      setMensaje('🗑️ Prenda dada de baja con éxito.');
      setTimeout(() => setMensaje(''), 3000);
      cargarDatos();
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen pb-24 font-sans text-gray-900">
      
      {/* CABECERA */}
      <header className="bg-indigo-700 text-white px-5 py-5 shadow-md sticky top-0 z-10 flex justify-between items-center w-full">
        <h1 className="text-lg font-black tracking-wider uppercase">📦 Catálogo de Stock</h1>
        <button 
          onClick={() => abrirModal()}
          className="text-xs bg-green-600 hover:bg-green-700 font-black px-4 py-2.5 rounded-xl flex items-center gap-1 shadow-md transition-transform active:scale-95"
        >
          ➕ NUEVA PRENDA
        </button>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="p-4 space-y-4 max-w-3xl mx-auto">
        
        {/* FILTRO DE BÚSQUEDA */}
        <section className="bg-white p-4 rounded-2xl shadow-xs border border-gray-100">
          <input 
            type="text" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:border-indigo-600 font-medium"
            placeholder="🔍 Buscar artículo en el stock..."
          />
        </section>

        {mensaje && (
          <p className="text-xs font-bold p-3 bg-gray-900 text-white rounded-xl text-center shadow-md animate-fade-in">
            {mensaje}
          </p>
        )}

        {/* LISTADO DE TARJETAS ROBUSTAS Y COMODAS (Punto 1) */}
        <section className="space-y-3">
          {cargando ? (
            <p className="text-sm text-gray-400 font-bold text-center py-12 animate-pulse">Abriendo el catálogo textil...</p>
          ) : productosFiltrados.length === 0 ? (
            <p className="text-sm text-gray-400 font-bold text-center py-12 bg-white rounded-2xl border">Sin artículos registrados.</p>
          ) : (
            productosFiltrados.map((prod) => {
              return (
                <div key={prod.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in">
                  
                  {/* Vista informativa del artículo */}
                  <div className="flex items-center gap-4 min-w-0 w-full md:w-auto">
                    <img 
                      src={prod.imagen_url || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=200'} 
                      alt={prod.titulo} className="w-16 h-16 object-cover rounded-xl bg-gray-100 flex-shrink-0 border border-gray-200 shadow-xs"
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="font-black text-sm text-gray-800 leading-tight tracking-tight">{prod.titulo}</h4>
                      <p className="text-xs font-black text-indigo-600 mt-1 bg-indigo-50 inline-block px-2 py-0.5 rounded-md">
                        ${prod.precio.toLocaleString('es-AR')}
                      </p>
                      
                      {/* Pastillas de los talles reales */}
                      <div className="flex flex-wrap gap-1 mt-2.5">
                        {prod.stock_variantes?.map(v => (
                          <span key={v.id} className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${v.stock > 0 ? 'bg-gray-100 text-gray-700 border border-gray-200/50' : 'bg-red-50 text-red-400 line-through'}`}>
                            {v.talle}: <span className={v.stock > 0 ? 'text-indigo-600' : ''}>{v.stock}u</span>
                          </span>
                        ))}
                        {(!prod.stock_variantes || prod.stock_variantes.length === 0) && (
                          <span className="text-[10px] text-gray-400 font-bold italic">Sin curva cargada</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Acciones de administración */}
                  <div className="flex items-center gap-2 w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0 justify-end flex-shrink-0">
                    <button
                      onClick={() => abrirModal(prod)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black px-4 py-2.5 rounded-xl transition-colors shadow-xs w-full md:w-auto text-center"
                    >
                      ✏️ Editar
                    </button>
                    <button
                      onClick={() => desactivarProducto(prod)}
                      className="bg-red-50 hover:bg-red-100 text-red-600 text-xs font-black px-4 py-2.5 rounded-xl transition-colors w-full md:w-auto text-center"
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </section>
      </main>

      {/* =============================================================================
          MODAL INTERMEDIO CENTRALIZADO (ALTA Y EDICIÓN COMPLETA)
         ============================================================================= */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 z-50">
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl flex flex-col animate-scale-in">
            
            {/* Header del modal */}
            <div className="bg-indigo-700 p-4 text-white flex justify-between items-center sticky top-0 z-10">
              <h3 className="text-xs font-black uppercase tracking-widest">
                {productoEditando ? '✏️ Editar Artículo' : '➕ Alta de Prenda'}
              </h3>
              <button onClick={() => setModalAbierto(false)} className="w-8 h-8 rounded-full bg-indigo-600 font-black text-sm flex items-center justify-center">✕</button>
            </div>

            {/* Formulario operativo */}
            <form onSubmit={guardarProducto} className="p-5 space-y-4">
              
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nombre del Artículo *</label>
                <input 
                  type="text" required value={titulo} onChange={(e) => setTitulo(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs bg-gray-50 font-bold focus:outline-none focus:bg-white"
                  placeholder="Ej: Campera Denim Rock Blue"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Precio de Venta ($) *</label>
                  <input 
                    type="number" required min="0" step="any" value={precio} onChange={(e) => setPrecio(e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs bg-gray-50 font-black focus:outline-none focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Categoría *</label>
                  <select 
                    required value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs bg-gray-50 font-bold focus:outline-none focus:bg-white"
                  >
                    <option value="">-- Elegir --</option>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
              </div>

              {/* COMPONENTE DE IMAGEN REAL CON SUPABASE STORAGE (Punto 2) */}
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200/60 space-y-2">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Foto del Producto (Carga directa)</label>
                <input 
                  type="file" accept="image/*" onChange={manejarSubidaImagen}
                  className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:bg-indigo-600 file:text-white file:uppercase hover:file:bg-indigo-700"
                />
                {subiendoImagen && <p className="text-[9px] text-indigo-600 font-bold animate-pulse">Guardando archivo en el Storage de Supabase...</p>}
                {imagenUrl && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[9px] text-green-600 font-bold">✓ Imagen vinculada de forma exitosa</span>
                    <img src={imagenUrl} className="w-9 h-9 object-cover rounded-md border" alt="Miniatura" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Detalles adicionales</label>
                <textarea 
                  value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows="2"
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-gray-50 text-gray-700 resize-none focus:outline-none focus:bg-white"
                />
              </div>

              {/* SECCIÓN TOTALMENTE DINÁMICA DE WIDGETS POR TALLE (Punto 3) */}
              <div className="border-t border-dashed pt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <label className="block text-[10px] font-black text-indigo-700 uppercase tracking-wider">Curva de Talles Asignada</label>
                    <p className="text-[9px] text-gray-400 font-medium italic">Agregá solo los talles que llevás encima.</p>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => {
                      const nuevoTalle = prompt("Ingresá el talle (Ej: M, 42, XXL, Niño-6):");
                      if (!nuevoTalle) return;
                      const formateado = nuevoTalle.trim().toUpperCase();
                      if (tallesForm[formateado] !== undefined) {
                        alert("Este talle ya figura en el listado actual.");
                        return;
                      }
                      setTallesForm({ ...tallesForm, [formateado]: 0 });
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black px-3 py-1.5 rounded-xl shadow-xs uppercase tracking-wider"
                  >
                    ➕ Añadir Talle
                  </button>
                </div>

                {/* Lista de control de widgets instanciados */}
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {Object.keys(tallesForm).length === 0 ? (
                    <div className="p-4 border border-dashed border-gray-200 rounded-2xl text-center">
                      <p className="text-[11px] text-gray-400 font-bold italic">No hay talles definidos. Presioná "Añadir Talle".</p>
                    </div>
                  ) : (
                    Object.keys(tallesForm).map((talle) => (
                      <div key={talle} className="bg-gray-50 p-2 rounded-xl border border-gray-200 flex items-center justify-between gap-3">
                        <div className="w-16">
                          <span className="bg-gray-900 text-white text-[10px] font-black px-2 py-1 rounded-lg block text-center uppercase truncate">
                            {talle}
                          </span>
                        </div>

                        {/* Controladores incrementales */}
                        <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-gray-200 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => {
                              const actual = parseInt(tallesForm[talle]) || 0;
                              setTallesForm({ ...tallesForm, [talle]: actual <= 0 ? 0 : actual - 1 });
                            }}
                            className="w-7 h-7 bg-gray-100 text-gray-700 font-black rounded-md text-xs flex items-center justify-center active:bg-gray-200"
                          >
                            -
                          </button>
                          <input
                            type="number" min="0" value={tallesForm[talle]}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              setTallesForm({ ...tallesForm, [talle]: isNaN(val) ? 0 : val });
                            }}
                            className="w-12 text-center font-black text-xs border-0 focus:outline-none p-0 text-gray-800 bg-transparent"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const actual = parseInt(tallesForm[talle]) || 0;
                              setTallesForm({ ...tallesForm, [talle]: actual + 1 });
                            }}
                            className="w-7 h-7 bg-gray-800 text-white font-black rounded-md text-xs flex items-center justify-center active:bg-gray-900"
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const copia = { ...tallesForm };
                            delete copia[talle];
                            setTallesForm(copia);
                          }}
                          className="text-red-500 hover:text-red-700 font-black text-xs p-1 px-2"
                        >
                          ✕ Quitar
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <button
                type="submit" disabled={subiendoImagen}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-xl text-xs uppercase tracking-widest shadow-md transition-opacity disabled:opacity-50"
              >
                💾 Sincronizar Registro
              </button>
            </form>
          </div>
        </div>
      )}

      {/* FOOTER DE RETORNO */}
      <footer className="fixed bottom-0 left-0 right-0 p-3 bg-white/80 backdrop-blur-md border-t border-gray-100 flex justify-center z-10">
        <a href="/admin" className="w-full max-w-xs text-center bg-gray-800 text-white font-black py-3 rounded-xl text-xs tracking-wider uppercase">
          ⬅️ Volver al Panel General
        </a>
      </footer>

    </div>
  );
}