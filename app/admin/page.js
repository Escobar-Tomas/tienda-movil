"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { dashboardService } from "@/services/dashboardService";
import { authService } from "@/services/authService";

export default function DashboardAdmin() {
  const [metricas, setMetricas] = useState(null);
  const [cargando, setCargando] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function cargarDashboard() {
      try {
        const data = await dashboardService.obtenerMetricas();
        setMetricas(data);
      } catch (error) {
        console.error("Error al cargar métricas:", error);
      } finally {
        setCargando(false);
      }
    }
    cargarDashboard();
  }, []);

  const cerrarSesion = async () => {
    if (!confirm("¿Estás seguro de que deseas salir del panel?")) return;
    try {
      await authService.logout();
      router.push("/login");
    } catch (error) {
      alert("No se pudo cerrar sesión.");
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-10 font-sans text-slate-900 selection:bg-indigo-100">
      {/* CABECERA */}
      <header className="bg-indigo-700 text-white px-5 py-5 shadow-lg flex justify-between items-center rounded-b-3xl">
        <div>
          <h1 className="text-xl font-black tracking-tight">
            Panel de Control
          </h1>
          <p className="text-indigo-200 text-xs font-bold mt-1">
            Resumen en tiempo real
          </p>
        </div>
        <button
          onClick={cerrarSesion}
          className="bg-indigo-800/50 hover:bg-indigo-900 text-white text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl border border-indigo-600/50 transition-colors cursor-pointer"
        >
          Cerrar Sesión
        </button>
      </header>

      <main className="p-4 space-y-6 max-w-4xl mx-auto -mt-2">
        {/* SECCIÓN 1: TARJETAS DE MÉTRICAS (KPIs) */}
        {cargando ? (
          <div className="grid grid-cols-2 gap-3 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-slate-200 h-24 rounded-2xl"></div>
            ))}
          </div>
        ) : (
          metricas && (
            <section className="grid grid-cols-2 gap-3">
              <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10 text-3xl">
                  📈
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Ventas del Mes
                </p>
                <p className="text-xl font-black text-slate-800 mt-1">
                  ${metricas.ventasMes.toLocaleString("es-AR")}
                </p>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-3xl shadow-sm border border-amber-100 flex flex-col justify-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10 text-3xl">
                  ⏳
                </div>
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">
                  Dinero en la Calle
                </p>
                <p className="text-xl font-black text-amber-700 mt-1">
                  ${metricas.dineroEnLaCalle.toLocaleString("es-AR")}
                </p>
              </div>

              <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10 text-3xl">
                  👥
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Cartera de Clientes
                </p>
                <p className="text-xl font-black text-slate-800 mt-1">
                  {metricas.clientesActivos}
                </p>
              </div>

              <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10 text-3xl">
                  📦
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Alertas de Stock
                </p>
                <p className="text-xl font-black text-red-600 mt-1">
                  {metricas.alertasStock.length}
                </p>
              </div>
            </section>
          )
        )}

        {/* SECCIÓN 2: ACCESOS DIRECTOS (Menú de Navegación) */}
        <section className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-50 pb-2">
            Acciones Rápidas
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">

            <a
              href="/admin/clientes"
              className="bg-slate-100 hover:bg-slate-800 text-slate-600 hover:text-white p-4 rounded-2xl flex flex-col items-center justify-center transition-all group cursor-pointer border border-slate-200 hover:border-transparent shadow-sm"
            >
              <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">
                📒
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest">
                Clientes
              </span>
            </a>

            <a
              href="/admin/productos"
              className="bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white p-4 rounded-2xl flex flex-col items-center justify-center transition-all group cursor-pointer border border-blue-100 hover:border-transparent shadow-sm"
            >
              <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">
                📦
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest">
                Inventario
              </span>
            </a>

            <a
              href="/admin/ventas"
              className="bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white p-4 rounded-2xl flex flex-col items-center justify-center transition-all group cursor-pointer border border-indigo-100 hover:border-transparent shadow-sm"
            >
              <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">
                🛒
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest">
                Vender
              </span>
            </a>

            <a
              href="/admin/ventas/historial"
              className="bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white p-4 rounded-2xl flex flex-col items-center justify-center transition-all group cursor-pointer border border-rose-100 hover:border-transparent shadow-sm"
            >
              <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">
                📋
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-center">
                Historial y<br />
                Devoluciones
              </span>
            </a>

            <a
              href="/admin/cobros"
              className="bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white p-4 rounded-2xl flex flex-col items-center justify-center transition-all group cursor-pointer border border-emerald-100 hover:border-transparent shadow-sm"
            >
              <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">
                💵
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest">
                Cobrar
              </span>
            </a>
          </div>
        </section>

        {/* SECCIÓN 3: ALERTAS DE INVENTARIO */}
        {metricas && metricas.alertasStock.length > 0 && (
          <section className="bg-red-50 p-5 rounded-3xl shadow-sm border border-red-100">
            <h2 className="text-xs font-black text-red-600 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span>⚠️</span> Stock Crítico Detectado
            </h2>
            <div className="space-y-2">
              {metricas.alertasStock.map((alerta) => (
                <div
                  key={alerta.id}
                  className="flex justify-between items-center bg-white p-3 rounded-xl border border-red-100/50 shadow-xs"
                >
                  <div>
                    <p className="text-xs font-black text-slate-800">
                      {alerta.productos.titulo}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400">
                      Talle: {alerta.talle}
                    </p>
                  </div>
                  <div className="bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-xs font-black">
                    Quedan {alerta.stock}
                  </div>
                </div>
              ))}
            </div>
            <a
              href="/admin/productos"
              className="block text-center mt-4 text-[10px] font-black text-red-500 hover:text-red-700 uppercase tracking-widest"
            >
              Ir a reponer inventario →
            </a>
          </section>
        )}
      </main>
    </div>
  );
}
