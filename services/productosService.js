import { supabase } from "@/utils/supabase";

export const productosService = {
  // 1. Obtiene el catálogo público
  async obtenerCatalogoPublico() {
    const { data, error } = await supabase
      .from("productos")
      .select(
        `
        id, titulo, descripcion, precio, imagen_url, categoria_id,
        categorias ( nombre ),
        stock_variantes ( id, talle, stock )
      `,
      )
      .eq("activo", true)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  // 2. Obtiene la versión simplificada (usada en Ventas)
  async obtenerParaVentas() {
    const { data, error } = await supabase
      .from("productos")
      .select(`id, titulo, precio, stock_variantes ( id, talle, stock )`)
      .eq("activo", true)
      .order("titulo");

    if (error) throw error;
    return data;
  },

  // 3. Obtiene TODOS los productos para administrar (activos e inactivos)
  async obtenerTodosAdmin() {
    const { data, error } = await supabase
      .from("productos")
      .select(
        `
        id, titulo, descripcion, precio, imagen_url, activo, categoria_id,
        categorias ( nombre ),
        stock_variantes ( id, talle, stock )
      `,
      )
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  // 4. Guardar Producto y sus Variantes (Alta / Edición)
  // En tu archivo productosService.js
  async guardarProducto(productoId, payload, variantes) {
    const variantesPayload = variantes.map((v) => ({
      talle: v.talle,
      stock: parseInt(v.stock),
    }));

    const { data, error } = await supabase.rpc("guardar_producto_completo", {
      p_id: productoId || null,
      p_titulo: payload.titulo,
      p_precio: parseFloat(payload.precio),
      p_imagen_url: payload.imagen_url,
      // Forzamos el uso de entero/bigint explícito
      p_categoria_id: payload.categoria_id
        ? parseInt(payload.categoria_id)
        : null,
      p_variantes: variantesPayload,
    });

    if (error) throw error;
    return data;
  },

  // 5. Ocultar Producto
  async eliminar(id) {
    const { error } = await supabase
      .from("productos")
      .update({ activo: false })
      .eq("id", id);
    if (error) throw error;
    return true;
  },

  // 6. Volver a activar Producto
  async reactivar(id) {
    const { error } = await supabase
      .from("productos")
      .update({ activo: true })
      .eq("id", id);
    if (error) throw error;
    return true;
  },

  // 7. NUEVO: Subir imagen al Bucket de Supabase
  async subirImagen(file) {
    // Generamos un nombre de archivo único para que no se sobreescriban imágenes con el mismo nombre
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

    // ATENCIÓN: Reemplaza 'productos' por el nombre real de tu bucket en Supabase si es diferente
    const bucketName = "prendas";

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(`imagenes/${fileName}`, file);

    if (error) {
      console.error("Error al subir imagen al bucket:", error);
      throw new Error("No se pudo subir la imagen al servidor.");
    }

    // Obtenemos la URL pública de la imagen recién subida
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(`imagenes/${fileName}`);

    return publicUrlData.publicUrl;
  },
};
