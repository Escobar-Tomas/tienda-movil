import { supabase } from '@/utils/supabase';

export const dashboardService = {
  
  async obtenerMetricas() {
    // 1. Contar Clientes Activos
    const { count: clientesCount, error: errClientes } = await supabase
      .from('clientes')
      .select('*', { count: 'exact', head: true })
      .eq('activo', true);

    if (errClientes) throw errClientes;

    // 2. Calcular Ventas y Deudas (EXCLUYENDO devoluciones y cancelaciones)
    const { data: ventas, error: errVentas } = await supabase
      .from('ventas')
      .select('total, fecha_venta, estado')
      .not('estado', 'in', '("Devuelta","Cancelada")');

    if (errVentas) throw errVentas;

    const { data: pagos, error: errPagos } = await supabase.from('pagos').select('monto_pagado');
    if (errPagos) throw errPagos;

    // Sumatoria total histórica válida
    const totalVentasValidas = ventas?.reduce((acc, v) => acc + parseFloat(v.total), 0) || 0;
    const totalPagado = pagos?.reduce((acc, p) => acc + parseFloat(p.monto_pagado), 0) || 0;
    
    // Lo que falta cobrar de las ventas que siguen en pie
    const dineroEnLaCalle = totalVentasValidas - totalPagado;

    // Calcular solo las ventas válidas del mes actual
    const mesActual = new Date().getMonth();
    const añoActual = new Date().getFullYear();
    const ventasDelMes = ventas?.filter(v => {
      const fecha = new Date(v.fecha_venta);
      return fecha.getMonth() === mesActual && fecha.getFullYear() === añoActual;
    }).reduce((acc, v) => acc + parseFloat(v.total), 0) || 0;

    return {
      clientesActivos: clientesCount || 0,
      ventasMes: ventasDelMes,
      dineroEnLaCalle: dineroEnLaCalle > 0 ? dineroEnLaCalle : 0
    };
  }
};