/** @type {import('next').NextConfig} */
const nextConfig = {
  // Genera un build optimizado e independiente ideal para Vercel
  output: 'standalone', 
  // Si vas a cargar imágenes externas (como las del Bucket de Supabase), 
  // debés habilitar el dominio de Supabase aquí
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;