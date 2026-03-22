export const MOCK_SERVICES = [
  {
    id: '1',
    name: 'auth-service',
    description: 'Servicio de autenticación JWT',
    language: 'PYTHON',
    status: 'active',
    enabled: true,
    endpoint: 'http://localhost:3001',
  },
  {
    id: '2',
    name: 'static-landing',
    description: 'Página estática en HTML con Nginx',
    language: 'HTML',
    status: 'building',
    enabled: true,
    endpoint: 'http://localhost:3002',
  },
  {
    id: '3',
    name: 'data-processor',
    description: 'Procesador de archivos CSV',
    language: 'PYTHON',
    status: 'disabled',
    enabled: false,
    endpoint: 'http://localhost:3003',
  },
];