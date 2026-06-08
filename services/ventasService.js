import { supabase } from '@/utils/supabase';

export const ventasService = {
  
  async registrarNuevaVenta(ventaData, carrito, pagoInicial) {
    // 1. Inserción en la tabla principal 'ventas'
    const { data: ventaNueva, error: errorVenta } = await supabase
      .from('ventas')
      .insert([ventaData])
      .select()
      .single();

    if (errorVenta) throw errorVenta;

    // 2. Inserción en 'detalles_venta' y rebaja en 'stock_variantes'
    for (const item of carrito) {
      const { error: errDetalle } = await supabase.from('detalles_venta').insert([{
        venta_id: ventaNueva.id,
        producto_id: item.producto_id,
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

    // 3. NUEVO: Si el cliente entregó dinero en el momento, registramos el pago
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
  }
};