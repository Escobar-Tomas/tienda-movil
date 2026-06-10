import { supabase } from '@/utils/supabase';

export const ventasService = {
  
  // 1. Método para obtener el listado de ventas para el historial
  async obtenerHistorial() {
    const { data, error } = await supabase
      .from('ventas')
      .select(`
        id,
        total,
        fecha_venta,
        estado,
        tipo_pago,
        clientes ( nombre )
      `)
      .order('fecha_venta', { ascending: false });

    if (error) throw error;
    return data;
  },

  async registrarNuevaVenta(ventaData, carrito, pagoInicial) {
    
    // NUEVO: Calculamos si la venta nace Completada o Pendiente de pago
    const estadoVenta = (pagoInicial && parseFloat(pagoInicial.monto) >= parseFloat(ventaData.total)) 
      ? 'Completada' 
      : 'Pendiente';

    // Se lo inyectamos a los datos de la venta
    const payloadConEstado = {
      ...ventaData,
      estado: estadoVenta
    };

    // 1. Inserción en la tabla principal 'ventas'
    const { data: ventaNueva, error: errorVenta } = await supabase
      .from('ventas')
      .insert([payloadConEstado])
      .select()
      .single();

    if (errorVenta) throw errorVenta;

    for (const item of carrito) {
      const { error: errDetalle } = await supabase.from('detalles_venta').insert([{
        venta_id: ventaNueva.id,
        producto_id: item.producto_id,
        variante_id: item.variante_id, // ESTO ES CRÍTICO PARA LAS DEVOLUCIONES
        cantidad: parseInt(item.cantidad),
        precio_unitario: parseFloat(item.precio)
      }]);
      if (errDetalle) throw errDetalle;

      const nuevoStock = item.stockMaximo - item.cantidad;
      const { error: errStock } = await supabase
        .from('stock_variantes')
        .update({ stock: nuevoStock })
        .eq('id', item.variante_id);
      if (errStock) throw errStock;
    }

    if (pagoInicial && pagoInicial.monto > 0) {
      const { error: errPago } = await supabase.from('pagos').insert([{
        venta_id: ventaNueva.id,
        cliente_id: ventaData.cliente_id,
        monto_pagado: parseFloat(pagoInicial.monto),
        metodo_pago: pagoInicial.metodo
      }]);
      if (errPago) throw errPago;
    }

    return ventaNueva;
  },

  // 2. Método que llama al procedimiento almacenado en Supabase
  async procesarDevolucion(ventaId) {
    const { error } = await supabase.rpc('procesar_devolucion_venta', {
      p_venta_id: ventaId
    });
    if (error) throw error;
    return true;
  }
};