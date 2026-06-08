import { supabase } from '../utils/supabase';

export const categoriasService = {
  // Obtiene todas las categorías ordenadas alfabéticamente
  async obtenerTodas() {
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .order('nombre');
    
    if (error) {
      console.error('Error en categoriasService.obtenerTodas:', error);
      throw error;
    }
    return data;
  }
};