# Sistema de Restaurante Digital - Producto Nacional

## 🎯 Descripción General

**Producto Nacional** es un sistema completo de restaurante digital inteligente que permite a los clientes ordenar directamente desde sus mesas escaneando un código QR. El sistema incluye:

- ✅ Menú digital interactivo
- ✅ Carrito de compras inteligente
- ✅ Múltiples métodos de pago
- ✅ Notificaciones en tiempo real a cocina, barra y caja
- ✅ Panel de administración con estadísticas
- ✅ Gestión completa del restaurante

## 🚀 Características Principales

### Para Clientes
- **Escaneo QR**: Acceso rápido al menú desde cualquier mesa
- **Menú Interactivo**: Carruseles por categorías con imágenes atractivas
- **Carrito Inteligente**: Gestión de cantidades (1-8 por producto) y comentarios
- **Pagos Seguros**: Tarjeta, efectivo, transferencia o cuenta abierta
- **Confirmación Visual**: Recibe confirmación inmediata de tu orden

### Para el Restaurante
- **Cocina**: Recibe órdenes en tiempo real con priorización
- **Barra**: Gestión especializada de bebidas y cocteles
- **Caja**: Control de pagos y cuentas abiertas
- **Admin**: Dashboard completo con métricas y reportes

## 📱 Tecnología Utilizada

### Frontend
- **HTML5 & CSS3**: Estructura y estilos modernos
- **Tailwind CSS**: Framework de utilidades CSS
- **JavaScript ES6+**: Lógica de aplicación
- **Anime.js**: Animaciones suaves
- **Plotly.js**: Gráficos y visualizaciones

### Backend (Simulado)
- **JavaScript**: Lógica del servidor
- **WebSocket**: Notificaciones en tiempo real
- **LocalStorage**: Persistencia de datos
- **QR Code**: Generación de códigos únicos

### Base de Datos
- **LocalStorage**: Almacenamiento en el navegador
- **Estructura JSON**: Datos organizados y accesibles

## 📁 Estructura del Proyecto

```
producto-nacional/
├── client/              # Aplicación del cliente
│   ├── index.html      # Menú principal
│   ├── menu.js         # Lógica del menú
│   └── assets/         # Imágenes y recursos
├── dashboard/          # Pantallas del personal
│   ├── kitchen.html    # Cocina
│   ├── kitchen.js      # Lógica de cocina
│   ├── bar.html        # Barra
│   ├── bar.js          # Lógica de barra
│   ├── cashier.html    # Caja
│   └── cashier.js      # Lógica de caja
├── admin/              # Panel administrativo
│   ├── index.html      # Dashboard admin
│   └── admin.js        # Lógica de admin
├── api/                # Backend simulado
│   ├── database.js     # Base de datos
│   ├── server.js       # API REST
│   └── websocket.js    # Notificaciones en tiempo real
├── docs/               # Documentación
│   └── README.md       # Este archivo
└── qr-generator.html   # Generador de códigos QR
```

## 🛠️ Instalación y Uso

### Requisitos Previos
- Navegador web moderno (Chrome, Firefox, Safari, Edge)
- No requiere instalación de software adicional

### Pasos de Instalación

1. **Descargar el proyecto**
   ```bash
   git clone [URL_DEL_REPOSITORIO]
   cd producto-nacional
   ```

2. **Abrir en navegador**
   - Abrir `client/index.html` para el menú del cliente
   - Abrir `dashboard/kitchen.html` para la cocina
   - Abrir `dashboard/bar.html` para la barra
   - Abrir `dashboard/cashier.html` para la caja
   - Abrir `admin/index.html` para el administrador

3. **Generar códigos QR**
   - Abrir `qr-generator.html`
   - Hacer clic en "Generar Todos"
   - Imprimir los códigos para cada mesa

## 📋 Uso del Sistema

### Para Clientes
1. **Escanea el QR** en tu mesa
2. **Explora el menú** por categorías
3. **Agrega productos** al carrito
4. **Personaliza** tu orden con comentarios
5. **Selecciona método de pago**
6. **Confirma tu orden**

### Para Personal del Restaurante

#### Cocina
- Recibe órdenes en tiempo real
- Marca el inicio de preparación
- Marca como lista cuando termine
- Recibe notificaciones sonoras

#### Barra
- Recibe órdenes de bebidas
- Prioriza cocteles complejos
- Marca el estado de preparación
- Notifica cuando las bebidas están listas

#### Caja
- Ve todos los pagos recibidos
- Gestiona cuentas abiertas
- Cierra cuentas pendientes
- Monitorea estadísticas del día

#### Administrador
- Accede al dashboard completo
- Gestiona productos y disponibilidad
- Genera reportes y estadísticas
- Administra mesas y personal

## 🔐 Credenciales de Prueba

### Personal del Restaurante
- **Admin**: admin@productonacional.mx / admin123
- **Cocina**: cocina@productonacional.mx / kitchen123
- **Barra**: barra@productonacional.mx / bar123
- **Caja**: caja@productonacional.mx / cashier123

## 📊 Características Avanzadas

### Notificaciones en Tiempo Real
- WebSocket para comunicación instantánea
- Notificaciones sonoras personalizadas
- Actualización automática de estados

### Sistema de Pagos
- Simulación de Stripe, PayPal, MercadoPago
- Registro de efectivo y transferencias
- Gestión de cuentas abiertas

### Analytics y Reportes
- Ventas por hora
- Productos más vendidos
- Métodos de pago preferidos
- Tiempo de preparación promedio

## 🔧 Personalización

### Modificar el Menú
1. Abrir `api/database.js`
2. Editar el array de productos
3. Agregar/modificar categorías
4. Actualizar precios y descripciones

### Cambiar Diseño
1. Editar estilos en cada archivo HTML
2. Modificar colores en `:root`
3. Ajustar tamaños y espaciados
4. Personalizar animaciones

### Agregar Funcionalidades
1. Crear nuevos endpoints en `api/server.js`
2. Agregar lógica en archivos JavaScript
3. Actualizar la base de datos si es necesario
4. Probar en todas las secciones

## 🚀 Despliegue

### Opción 1: GitHub Pages (Recomendado)
1. **Crear repositorio en GitHub**
   - Ve a GitHub y crea un nuevo repositorio
   - Sube todos los archivos del proyecto

2. **Configurar GitHub Pages**
   - Ve a Settings > Pages en tu repositorio
   - Selecciona "Deploy from a branch"
   - Elige la rama `main` y carpeta `/ (root)`
   - Guarda los cambios

3. **Actualizar configuración**
   - Edita `config.js` y cambia el `repoName` por el nombre de tu repositorio:
   ```javascript
   const repoName = 'tu-nombre-de-repositorio'; // Cambia esto
   ```

4. **Acceder a tu sitio**
   - Tu sitio estará disponible en: `https://tu-usuario.github.io/tu-repositorio/`

### Opción 2: Servidor Local
```bash
# Python
python -m http.server 8000

# Node.js
npx serve .

# PHP
php -S localhost:8000
```

### Opción 3: Otros Servicios de Hosting
- **Vercel**: Arrastra y suelta la carpeta
- **Netlify**: Conectar repositorio Git
- **Railway**: Despliegue automático desde Git

### Opción 3: Servidor Web
1. Subir archivos a servidor web
2. Configurar rutas correctamente
3. Asegurar HTTPS para producción

## 📞 Soporte y Ayuda

### Problemas Comunes
1. **No carga el menú**: Verificar conexión a internet
2. **No genera QR**: Asegurar que JavaScript esté habilitado
3. **No recibe notificaciones**: Verificar permisos del navegador
4. **Datos no se guardan**: Limpiar LocalStorage y recargar

### Mejores Prácticas
1. **Backup regular**: Exportar datos de LocalStorage
2. **Testing**: Probar en múltiples dispositivos
3. **Actualizaciones**: Mantener sistema actualizado
4. **Seguridad**: Usar HTTPS en producción

## 🎯 Próximas Mejoras

### Funcionalidades Planificadas
- [ ] Sistema de reservaciones
- [ ] Programa de lealtad
- [ ] Chat con meseros
- [ ] Calificaciones y reseñas
- [ ] Integración con impresoras térmicas
- [ ] App móvil para staff
- [ ] Análisis predictivo de ventas
- [ ] Gestión de inventario

### Optimizaciones
- [ ] Mejorar rendimiento en móviles
- [ ] Implementar Service Worker
- [ ] Optimizar imágenes
- [ ] Minificar archivos para producción

## 📄 Licencia

Este proyecto es de código abierto y está disponible para uso educativo y comercial.

## 🤝 Contribuciones

Las contribuciones son bienvenidas:
1. Fork del proyecto
2. Crear rama para características
3. Commit de cambios
4. Push a la rama
5. Crear Pull Request

## 📞 Contacto

Para soporte técnico o consultas:
- Email: soporte@productonacional.mx
- Teléfono: +52 1 555 123 4567
- WhatsApp: +52 1 555 123 4567

---

**Producto Nacional** - Tecnología que sabe a México 🇲🇽

*Última actualización: Enero 2025*
