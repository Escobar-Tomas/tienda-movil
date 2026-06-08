import { supabase } from '@/utils/supabase';

export const cobrosService = {
  
  // 1. Obtener todas las ventas y sus pagos (calculando deuda)
  async obtenerEstadoCuentas() {
    const { data, error } = await supabase
      .from('ventas')
      .select(`
        id,
        total,
        tipo_pago,
        cuotas_pactadas,
        fecha_venta,
        clientes ( id, nombre, telefono ),
        pagos ( id, monto_pagado, fecha_pago, metodo_pago )
      `)
      .order('fecha_venta', { ascending: false });

    if (error) throw error;
    return data;
  },

  // 2. Registrar un ingreso de dinero
  async registrarPago(payloadPago) {
    const { error } = await supabase.from('pagos').insert([payloadPago]);
    if (error) throw error;
    return true;
  },

  // 3. NUEVO: Revertir/Eliminar un pago erróneo
  async revertirPago(id) {
    const { error } = await supabase.from('pagos').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
};