import { supabase } from '@/utils/supabase';

export const dashboardService = {
  
  async obtenerMetricas() {
    // 1. Contar Clientes Activos
    const { count: clientesCount, error: errClientes } = await supabase
      .from('clientes')
      .select('*', { count: 'exact', head: true })
      .eq('activo', true);

    if (errClientes) throw errClientes;

    // 2. Calcular Ventas y Deudas
    const { data: ventas, error: errVentas } = await supabase.from('ventas').select('total, fecha_venta');
    if (errVentas) throw errVentas;

    const { data: pagos, error: errPagos } = await supabase.from('pagos').select('monto_pagado');
    if (errPagos) throw errPagos;

    const totalVentasHistorial = ventas?.reduce((acc, v) => acc + parseFloat(v.total), 0) || 0;
    const totalPagado = pagos?.reduce((acc, p) => acc + parseFloat(p.monto_pagado), 0) || 0;
    
    const dineroEnLaCalle = totalVentasHistorial - totalPagado;

    // Calcular solo las ventas del mes actual
    const mesActual = new Date().getMonth();
    const añoActual = new Date().getFullYear();
    const ventasDelMes = ventas?.filter(v => {
      const fecha = new Date(v.fecha_venta);
      return fecha.getMonth() === mesActual && fecha.getFullYear() === añoActual;
    }).reduce((acc, v) => acc + parseFloat(v.total), 0) || 0;

    // 3. Alerta de Stock Crítico (3 unidades o menos)
    const { data: stockCritico, error: errStock } = await supabase
      .from('stock_variantes')
      .select(`id, talle, stock, productos!inner(titulo, activo)`)
      .eq('productos.activo', true)
      .lte('stock', 3)
      .order('stock', { ascending: true })
      .limit(6);

    if (errStock) throw errStock;

    return {
      clientesActivos: clientesCount || 0,
      ventasMes: ventasDelMes,
      dineroEnLaCalle: dineroEnLaCalle > 0 ? dineroEnLaCalle : 0,
      alertasStock: stockCritico || []
    };
  }
};