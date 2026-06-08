import { supabase } from '@/utils/supabase';

export const authService = {
  
  // 1. Iniciar sesión con Email y Contraseña
  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Error de autenticación:', error.message);
      throw error;
    }
    
    return data;
  },

  // 2. Cerrar sesión
  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    // Eliminamos la cookie local
    document.cookie = 'sb_session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    return true;
  },

  // 3. Obtener el usuario actual
  async getUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }
};