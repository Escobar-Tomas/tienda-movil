import { supabase } from '@/utils/supabase';

export const clientesService = {
  
  // 1. Obtener solo clientes activos
  async obtenerTodos() {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('activo', true) // Solo traemos los que no fueron "eliminados"
      .order('nombre');
    
    if (error) throw error;
    return data;
  },

  // 2. Guardar con validación de duplicados
  async guardar(clienteId, payload) {
    // Si es un ALTA NUEVA (no tiene clienteId), verificamos si ya existe el nombre
    if (!clienteId) {
      const { data: duplicados, error: errBusqueda } = await supabase
        .from('clientes')
        .select('id')
        .ilike('nombre', payload.nombre) // Búsqueda insensible a mayúsculas
        .eq('activo', true)
        .limit(1);

      if (errBusqueda) throw errBusqueda;
      if (duplicados && duplicados.length > 0) {
        throw new Error('Ya existe un cliente registrado con ese nombre exacto.');
      }
    }

    let error;
    if (clienteId) {
      // Modo Edición
      const res = await supabase.from('clientes').update(payload).eq('id', clienteId);
      error = res.error;
    } else {
      // Modo Alta
      const res = await supabase.from('clientes').insert([payload]);
      error = res.error;
    }
    
    if (error) throw error;
    return true;
  },

  // 3. Eliminación Lógica (Soft Delete) en lugar de DELETE físico
  async eliminar(id) {
    const { error } = await supabase
      .from('clientes')
      .update({ activo: false }) // En lugar de .delete(), lo ocultamos
      .eq('id', id);
      
    if (error) throw error;
    return true;
  }
};