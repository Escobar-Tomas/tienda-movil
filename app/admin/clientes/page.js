'use client';
import { useState, useEffect } from 'react';
import { clientesService } from '@/services/clientesService';

export default function GestionClientes() {
  const [clientes, setClientes] = useState([]);
  const [clientesFiltrados, setClientesFiltrados] = useState([]);
  
  // Estado para el buscador
  const [busqueda, setBusqueda] = useState('');

  // Estado del Modal
  const [mostrarModal, setMostrarModal] = useState(false);

  // Estados del Formulario (Alta / Edición)
  const [editandoId, setEditandoId] = useState(null); // null = Alta, UUID = Edición
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [notas, setNotas] = useState('');

  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState('');

  // 1. Cargar la libreta (Usando el Servicio)
  const cargarClientes = async () => {
    setCargando(true);
    try {
      const data = await clientesService.obtenerTodos();
      setClientes(data);
      setClientesFiltrados(data);
    } catch (error) {
      console.error(error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarClientes();
  }, []);

  // 2. Motor de búsqueda en tiempo real
  useEffect(() => {
    let resultado = clientes;
    if (busqueda) {
      const termino = busqueda.toLowerCase();
      resultado = clientes.filter(c => 
        c.nombre.toLowerCase().includes(termino) || 
        (c.direccion && c.direccion.toLowerCase().includes(termino))
      );
    }
    setClientesFiltrados(resultado);
  }, [busqueda, clientes]);

  // 3. Abrir modal en modo Edición con datos pre-cargados
  const prepararEdicion = (cliente) => {
    setEditandoId(cliente.id);
    setNombre(cliente.nombre);
    setTelefono(cliente.telefono || '');
    setDireccion(cliente.direccion || '');
    // Leemos la columna correcta de la base de datos
    setNotas(cliente.referencia_domicilio || ''); 
    setMensaje('');
    setMostrarModal(true);
  };

  // 4. Abrir modal en modo Alta Limpia
  const abrirModalNuevo = () => {
    setEditandoId(null);
    setNombre('');
    setTelefono('');
    setDireccion('');
    setNotas('');
    setMensaje('');
    setMostrarModal(true);
  };

  // 5. Guardar Cambios (Usando el Servicio)
  const guardarCliente = async (e) => {
    e.preventDefault();
    setMensaje('');
    setCargando(true);

    if (!nombre) {
      alert('El nombre del comprador es obligatorio.');
      setCargando(false);
      return;
    }

    const payload = {
      nombre,
      telefono: telefono || null,
      direccion: direccion || null,
      referencia_domicilio: notas || null // Adaptado a tu esquema SQL
    };

    try {
      await clientesService.guardar(editandoId, payload);
      setMensaje('✅ Cambios guardados con éxito.');
      setTimeout(() => {
        setMostrarModal(false);
        cargarClientes();
      }, 800);
    } catch (error) {
      setMensaje('❌ Error al procesar: ' + error.message);
    } finally {
      setCargando(false);
    }
  };

  // 6. Eliminar Cliente (Usando el Servicio)
  const eliminarCliente = async (id, nombreCliente) => {
    if (!confirm(`¿Estás seguro de eliminar a ${nombreCliente}? Esta acción no se puede deshacer si no registra ventas asociadas.`)) return;

    try {
      await clientesService.eliminar(id);
      cargarClientes();
    } catch (error) {
      alert('No se pudo eliminar el cliente. Posiblemente posea ventas registradas en la base de datos.');
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen pb-24 font-sans text-gray-900 selection:bg-indigo-100">
      
      {/* CABECERA FIJA */}
      <header className="bg-indigo-700 text-white px-4 py-4 shadow-md sticky top-0 z-10 flex justify-between items-center w-full">
        <h1 className="text-base font-black tracking-wider">📒 CLIENTES</h1>
        <button 
          onClick={abrirModalNuevo}
          className="bg-green-600 hover:bg-green-700 text-white font-extrabold py-2 px-3 rounded-xl text-xs shadow-md transition-transform active:scale-95 flex items-center gap-1 cursor-pointer"
        >
          <span>➕</span> Nuevo
        </button>
      </header>

      <main className="p-3 space-y-4 max-w-4xl mx-auto">
        
        {/* BUSCADOR */}
        <section className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
          <input 
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs bg-gray-50 text-gray-900 focus:outline-none focus:border-indigo-600 font-medium"
            placeholder="🔍 Buscar por nombre o barrio/dirección..."
          />
        </section>

        {/* LISTADO DE CLIENTES */}
        <section className="w-full">
          {cargando && clientes.length === 0 ? (
            <p className="text-center py-10 text-xs text-gray-400 font-bold">Leyendo libreta de clientes...</p>
          ) : clientesFiltrados.length === 0 ? (
            <p className="text-center py-10 text-xs text-gray-400 font-bold bg-white rounded-2xl border border-gray-100">No hay clientes agendados con ese criterio.</p>
          ) : (
            <>
              {/* VISTA SMARTPHONE */}
              <div className="grid grid-cols-1 gap-3 md:hidden">
                {clientesFiltrados.map((cli) => (
                  <div key={cli.id} className="bg-white p-4 rounded-2xl shadow-xs border border-gray-100 flex flex-col justify-between">
                    <div className="space-y-1">
                      <div className="flex justify-between items-start">
                        <h3 className="font-extrabold text-gray-800 text-sm truncate max-w-[70%]">{cli.nombre}</h3>
                        {cli.telefono && (
                          <a href={`tel:${cli.telefono}`} className="text-[10px] bg-green-50 text-green-700 font-black px-2 py-0.5 rounded-md border border-green-100">
                            📞 Llamar
                          </a>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 font-medium flex items-center gap-1">
                        <span className="text-gray-400">📍</span> {cli.direccion || 'Sin dirección registrada.'}
                      </p>
                      {cli.referencia_domicilio && (
                        <div className="bg-amber-50/50 p-2 rounded-xl border border-amber-100/50 text-[11px] text-amber-800 font-medium mt-2">
                          <span className="font-bold">📝 Nota de entrega:</span> {cli.referencia_domicilio}
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-4 pt-2 border-t border-gray-50">
                      <button onClick={() => prepararEdicion(cli)} className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-xs py-2.5 rounded-xl cursor-pointer">
                        ✏️ Editar Ficha
                      </button>
                      <button onClick={() => eliminarCliente(cli.id, cli.nombre)} className="bg-red-50 hover:bg-red-100 text-red-600 font-extrabold text-xs py-2.5 rounded-xl cursor-pointer">
                        🗑️ Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* VISTA ESCRITORIO */}
              <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 text-[10px] uppercase font-black tracking-wider">
                      <th className="p-4">Nombre Completo</th>
                      <th className="p-4">Teléfono</th>
                      <th className="p-4">Dirección Particular</th>
                      <th className="p-4">Notas Internas</th>
                      <th className="p-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {clientesFiltrados.map((cli) => (
                      <tr key={cli.id} className="hover:bg-gray-50/50">
                        <td className="p-4 font-extrabold text-gray-800">{cli.nombre}</td>
                        <td className="p-4 text-gray-600 font-medium">{cli.telefono || '-'}</td>
                        <td className="p-4 text-gray-600 font-medium">{cli.direccion || '-'}</td>
                        <td className="p-4 text-xs text-gray-400 max-w-xs truncate">{cli.referencia_domicilio || '-'}</td>
                        <td className="p-4 text-right space-x-2 whitespace-nowrap">
                          <button onClick={() => prepararEdicion(cli)} className="text-xs bg-indigo-50 text-indigo-600 font-bold py-1.5 px-3 rounded-lg cursor-pointer">✏️ Editar</button>
                          <button onClick={() => eliminarCliente(cli.id, cli.nombre)} className="text-xs bg-red-50 text-red-600 font-bold py-1.5 px-3 rounded-lg cursor-pointer">🗑️ Borrar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-3 bg-white/80 backdrop-blur-md border-t border-gray-100 flex justify-center z-10 md:max-w-4xl md:mx-auto md:rounded-t-3xl">
        <a href="/admin" className="w-full text-center bg-gray-800 text-white font-black py-3 rounded-xl text-xs active:scale-95 transition-transform tracking-wider">
          ⬅️ VOLVER AL PANEL GENERAL
        </a>
      </footer>

      {/* MODAL CENTRADO EN TODAS LAS PANTALLAS */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 z-50">
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-2xl max-h-[85vh] overflow-y-auto space-y-4 animate-fade-in">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="text-sm font-black text-gray-900 tracking-tight">
                {editandoId ? '✏️ MODIFICAR CLIENTE' : '➕ REGISTRAR COMPRADOR'}
              </h3>
              <button onClick={() => setMostrarModal(false)} className="text-gray-400 hover:text-gray-600 text-xs font-black p-1 cursor-pointer">
                CERRAR
              </button>
            </div>

            <form onSubmit={guardarCliente} className="space-y-3">
              <div>
                <label className="block text-[9px] font-bold text-gray-400 uppercase">Nombre y Apellido *</label>
                <input type="text" required value={nombre} onChange={(e) => setNombre(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 bg-gray-50 focus:outline-none focus:border-indigo-600 font-medium" placeholder="Ej: María Belén Silva"/>
              </div>
              <div>
                <label className="block text-[9px] font-bold text-gray-400 uppercase">Teléfono Celular</label>
                <input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 bg-gray-50 focus:outline-none focus:border-indigo-600 font-medium" placeholder="Ej: 3815551234"/>
              </div>
              <div>
                <label className="block text-[9px] font-bold text-gray-400 uppercase">Dirección de Entrega</label>
                <input type="text" value={direccion} onChange={(e) => setDireccion(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 bg-gray-50 focus:outline-none focus:border-indigo-600 font-medium" placeholder="Ej: Barrio San José..."/>
              </div>
              <div>
                <label className="block text-[9px] font-bold text-gray-400 uppercase">Indicaciones / Notas</label>
                <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows="3" className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-900 bg-gray-50 resize-none focus:outline-none focus:border-indigo-600 font-medium" placeholder="Ej: Portón blanco..."/>
              </div>

              {mensaje && (
                <p className={`text-[10px] font-bold p-2 rounded-lg text-center ${mensaje.includes('❌') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>{mensaje}</p>
              )}

              <button type="submit" disabled={cargando} className="w-full bg-indigo-600 text-white font-black py-3 rounded-xl text-xs shadow-md active:scale-[0.99] transition-transform uppercase tracking-wider mt-2 cursor-pointer">
                {cargando ? 'Procesando...' : '💾 Guardar Ficha'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}