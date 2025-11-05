// Sistema de Base de Datos para Producto Nacional
// Base de datos en memoria con persistencia en localStorage

import config from '../config.js';

class Database {
  constructor() {
    this.orders = JSON.parse(localStorage.getItem('pn_orders') || '[]');
    this.products = JSON.parse(localStorage.getItem('pn_products') || '[]');
    this.tables = JSON.parse(localStorage.getItem('pn_tables') || '[]');
    this.users = JSON.parse(localStorage.getItem('pn_users') || '[]');
    this.payments = JSON.parse(localStorage.getItem('pn_payments') || '[]');
    this.initializeData();
  }

  initializeData() {
    // Inicializar productos si no existen
    if (this.products.length === 0) {
      this.products = [
        // ENTRADAS
        {
          id: 'guacamole',
          name: 'Guacamole',
          description: 'Aguacate fresco con jitomate, cebolla y cilantro',
          price: 88,
          category: 'ENTRADAS',
          station: 'kitchen',
          image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400',
          available: true,
          prepTime: 8,
          tags: ['fresco', 'vegano']
        },
        {
          id: 'caldo-hongos',
          name: 'Caldo de Hongos',
          description: 'Como recién salido de la montaña, pica un poco',
          price: 68,
          category: 'ENTRADAS',
          station: 'kitchen',
          image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400',
          available: true,
          prepTime: 12,
          tags: ['caliente', 'picante']
        },
        {
          id: 'tamalitos-verdes',
          name: 'Tamalitos Verdes',
          description: 'Dos tamales de pollo en salsa verde, estilo oaxaqueño',
          price: 68,
          category: 'ENTRADAS',
          station: 'kitchen',
          image: 'https://images.unsplash.com/photo-1620065480300-45448c2a22c6?w=400',
          available: true,
          prepTime: 10,
          tags: ['tradicionales', 'oaxaqueño']
        },
        {
          id: 'tacos-mixtos',
          name: 'Tacos Mixtos',
          description: 'Son de carne, pollo y hongos. Llevan salsa',
          price: 88,
          category: 'ENTRADAS',
          station: 'kitchen',
          image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400',
          available: true,
          prepTime: 12,
          tags: ['variados', 'sabrosos']
        },
        // PLATILLOS
        {
          id: 'carne-en-su-jugo',
          name: 'Carne en su Jugo',
          description: 'Tierna carne de res cocida en su propio jugo con frijoles, tocino y chile',
          price: 148,
          category: 'PLATILLOS',
          station: 'kitchen',
          image: 'https://images.unsplash.com/photo-1558030006-450675393462?w=400',
          available: true,
          prepTime: 25,
          tags: ['especial', 'caliente']
        },
        {
          id: 'chambarete',
          name: 'Chambarete',
          description: 'Ossobuco de res cocinado lentamente en salsa pasilla',
          price: 188,
          category: 'PLATILLOS',
          station: 'kitchen',
          image: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=400',
          available: true,
          prepTime: 45,
          tags: ['especial', 'lento']
        },
        {
          id: 'corte-magro',
          name: 'Corte Magro (300g)',
          description: 'Pregunta por el corte del mes, acompañado de verduras al grill',
          price: 251,
          category: 'PLATILLOS',
          station: 'kitchen',
          image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400',
          available: true,
          prepTime: 30,
          tags: ['premium', 'grill']
        },
        {
          id: 'estofado-res',
          name: 'Estofado de Res',
          description: 'Carne de res cocida a fuego lento 12hrs con verduras en un rico caldo',
          price: 168,
          category: 'PLATILLOS',
          station: 'kitchen',
          image: 'https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=400',
          available: true,
          prepTime: 35,
          tags: ['especial', 'lento']
        },
        {
          id: 'fajitas-pollo',
          name: 'Fajitas de Pollo',
          description: 'Tiras de pollo asadas con pimientos y cebollas',
          price: 148,
          category: 'PLATILLOS',
          station: 'kitchen',
          image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400',
          available: true,
          prepTime: 20,
          tags: ['pollo', 'asado']
        },
        {
          id: 'tacos-trompo',
          name: 'Tacos del Trompo',
          description: 'Tres tacos de sirloin, jugoso y sabroso',
          price: 125,
          category: 'PLATILLOS',
          station: 'kitchen',
          image: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400',
          available: true,
          prepTime: 15,
          tags: ['tacos', 'sirloin']
        },
        // PAQUETES
        {
          id: 'combo-1',
          name: 'Combinación 1',
          description: 'Agua del día o refresco + Caldo de hongos o guacamole + 3 tacos del trompo o fajitas de pollo',
          price: 242,
          category: 'PAQUETES',
          station: 'kitchen',
          image: 'https://images.unsplash.com/photo-1555244162-803834f70033?w=400',
          available: true,
          prepTime: 20,
          tags: ['combo', 'economico']
        },
        {
          id: 'combo-2',
          name: 'Combinación 2',
          description: 'Cerveza o copa de vino + Tamalito oaxaqueño o tacos mixtos + Carne en su jugo o corte magro',
          price: 350,
          category: 'PAQUETES',
          station: 'kitchen',
          image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400',
          available: true,
          prepTime: 25,
          tags: ['combo', 'premium']
        },
        // BEBIDAS SIN ALCOHOL
        {
          id: 'agua-dia',
          name: 'Agua del Día',
          description: 'Pregunta por el sabor del día',
          price: 38,
          category: 'BEBIDAS',
          station: 'bar',
          image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400',
          available: true,
          prepTime: 2,
          tags: ['fresco', 'natural']
        },
        {
          id: 'agua-mineral',
          name: 'Agua Mineral',
          description: 'Limonada | Naranjada - Natural o mineral',
          price: 38,
          category: 'BEBIDAS',
          station: 'bar',
          image: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=400',
          available: true,
          prepTime: 2,
          tags: ['natural', 'refrescante']
        },
        {
          id: 'refrescos',
          name: 'Refrescos',
          description: 'Coca, manzana, sprite 355ml',
          price: 38,
          category: 'BEBIDAS',
          station: 'bar',
          image: 'https://images.unsplash.com/photo-1581636625402-29b2b7024c27?w=400',
          available: true,
          prepTime: 1,
          tags: ['clasicos', 'refrescantes']
        },
        {
          id: 'cerveza-barril',
          name: 'Cerveza de Barril',
          description: 'Clara y obscura 355ml',
          price: 55,
          category: 'BEBIDAS',
          station: 'bar',
          image: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=400',
          available: true,
          prepTime: 2,
          tags: ['cerveza', 'artesanal']
        },
        // MEZCAL
        {
          id: 'espadin',
          name: 'Espadín 42%',
          description: 'Ejútla de Crespo, Oaxaca',
          price: 98,
          category: 'MEZCAL',
          station: 'bar',
          image: 'https://images.unsplash.com/photo-1607811997291-5d666d79d13a?w=400',
          available: true,
          prepTime: 1,
          tags: ['doble', 'oaxaca', 'artesanal']
        },
        {
          id: 'tobala',
          name: 'Tobalá',
          description: 'San José de Minas, Oaxaca',
          price: 128,
          category: 'MEZCAL',
          station: 'bar',
          image: 'https://images.unsplash.com/photo-1607811997291-5d666d79d13a?w=400',
          available: true,
          prepTime: 1,
          tags: ['premium', 'oaxaca', 'silvestre']
        },
        {
          id: 'arroqueno',
          name: 'Arroqueño',
          description: 'Ejútla de Crespo, Oaxaca',
          price: 158,
          category: 'MEZCAL',
          station: 'bar',
          image: 'https://images.unsplash.com/photo-1607811997291-5d666d79d13a?w=400',
          available: true,
          prepTime: 1,
          tags: ['premium', 'oaxaca', 'raro']
        },
        // DRINKS/COCTELES
        {
          id: 'boing-dada',
          name: 'Boing Dada',
          description: 'Boing de uva o mango con mezcal',
          price: 68,
          category: 'COCTELES',
          station: 'bar',
          image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400',
          available: true,
          prepTime: 3,
          tags: ['coctel', 'mezcal', 'fruta']
        },
        {
          id: 'cuba',
          name: 'Cuba',
          description: 'Ron con Coca',
          price: 88,
          category: 'COCTELES',
          station: 'bar',
          image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400',
          available: true,
          prepTime: 2,
          tags: ['coctel', 'ron', 'clasico']
        },
        {
          id: 'mezcalita',
          name: 'Mezcalita',
          description: 'Mezcal con jamaica',
          price: 108,
          category: 'COCTELES',
          station: 'bar',
          image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400',
          available: true,
          prepTime: 3,
          tags: ['coctel', 'mezcal', 'jamaica']
        },
        {
          id: 'negrete',
          name: 'Negrete',
          description: 'Sí, ese',
          price: 148,
          category: 'COCTELES',
          station: 'bar',
          image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400',
          available: true,
          prepTime: 5,
          tags: ['especial', 'premium']
        },
        {
          id: 'old-fashioned',
          name: 'Old Fashioned',
          description: 'Nuestro especial de la casa, va con Jack Daniels',
          price: 168,
          category: 'COCTELES',
          station: 'bar',
          image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400',
          available: true,
          prepTime: 5,
          tags: ['especial', 'whiskey', 'premium']
        },
        // VINO
        {
          id: 'cetto-syrah',
          name: 'LA Cetto Syrah',
          description: 'Copa $138 / Botella $488',
          price: 138,
          category: 'VINO',
          station: 'bar',
          image: 'https://images.unsplash.com/photo-1506377247379-2c1c93a91ff9?w=400',
          available: true,
          prepTime: 1,
          tags: ['vino-tinto', 'mexicano'],
          options: ['copa', 'botella']
        },
        {
          id: 'datum',
          name: 'Datum',
          description: 'Copa $218 / Botella $888',
          price: 218,
          category: 'VINO',
          station: 'bar',
          image: 'https://images.unsplash.com/photo-1506377247379-2c1c93a91ff9?w=400',
          available: true,
          prepTime: 1,
          tags: ['vino-tinto', 'premium'],
          options: ['copa', 'botella']
        },
        {
          id: 'matarromera',
          name: 'Matarromera',
          description: 'Botella $1,998',
          price: 1998,
          category: 'VINO',
          station: 'bar',
          image: 'https://images.unsplash.com/photo-1506377247379-2c1c93a91ff9?w=400',
          available: true,
          prepTime: 1,
          tags: ['vino-tinto', 'premium', 'importado'],
          options: ['botella']
        },
        {
          id: 'tablas',
          name: 'Tablas',
          description: 'Botella $980',
          price: 980,
          category: 'VINO',
          station: 'bar',
          image: 'https://images.unsplash.com/photo-1506377247379-2c1c93a91ff9?w=400',
          available: true,
          prepTime: 1,
          tags: ['vino-tinto', 'premium'],
          options: ['botella']
        }
      ];
      localStorage.setItem('pn_products', JSON.stringify(this.products));
    }

    // Inicializar mesas
    if (this.tables.length === 0) {
      this.tables = Array.from({ length: 20 }, (_, i) => ({
        id: `table-${i + 1}`,
        tableNumber: i + 1,
        status: 'available',
        currentOrder: null,
        qrCode: `${config.qrBaseURL}?table=${i + 1}`,
        location: 'cdmx'
      }));
      localStorage.setItem('pn_tables', JSON.stringify(this.tables));
    }

    // Inicializar usuarios staff
    if (this.users.length === 0) {
      this.users = [
        {
          id: 'admin-1',
          name: 'Administrador',
          email: 'admin@productonacional.mx',
          password: 'admin123',
          role: 'admin'
        },
        {
          id: 'kitchen-1',
          name: 'Cocinero Jefe',
          email: 'cocina@productonacional.mx',
          password: 'kitchen123',
          role: 'kitchen'
        },
        {
          id: 'bar-1',
          name: 'Bartender',
          email: 'barra@productonacional.mx',
          password: 'bar123',
          role: 'bar'
        },
        {
          id: 'cashier-1',
          name: 'Cajero',
          email: 'caja@productonacional.mx',
          password: 'cashier123',
          role: 'cashier'
        }
      ];
      localStorage.setItem('pn_users', JSON.stringify(this.users));
    }
  }

  saveData() {
    localStorage.setItem('pn_orders', JSON.stringify(this.orders));
    localStorage.setItem('pn_products', JSON.stringify(this.products));
    localStorage.setItem('pn_tables', JSON.stringify(this.tables));
    localStorage.setItem('pn_users', JSON.stringify(this.users));
    localStorage.setItem('pn_payments', JSON.stringify(this.payments));
  }

  // Métodos para productos
  getProducts() {
    return this.products;
  }

  getProductById(id) {
    return this.products.find(p => p.id === id);
  }

  getProductsByCategory(category) {
    return this.products.filter(p => p.category === category);
  }

  getProductsByStation(station) {
    return this.products.filter(p => p.station === station);
  }

  // Métodos para órdenes
  createOrder(orderData) {
    const order = {
      id: `PN-${Date.now()}`,
      orderNumber: `PN-${this.orders.length + 1}`,
      ...orderData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'pending'
    };
    this.orders.push(order);
    this.saveData();
    return order;
  }

  getOrders() {
    return this.orders;
  }

  getOrdersByStatus(status) {
    return this.orders.filter(o => o.status === status);
  }

  getOrdersByStation(station) {
    return this.orders.filter(o => 
      o.items.some(item => {
        const product = this.getProductById(item.productId);
        return product && product.station === station;
      })
    );
  }

  updateOrderStatus(orderId, status) {
    const order = this.orders.find(o => o.id === orderId);
    if (order) {
      order.status = status;
      order.updatedAt = new Date().toISOString();
      this.saveData();
    }
    return order;
  }

  // Métodos para mesas
  getTables() {
    return this.tables;
  }

  getTableByNumber(tableNumber) {
    return this.tables.find(t => t.tableNumber === parseInt(tableNumber));
  }

  updateTableStatus(tableNumber, status, orderId = null) {
    const table = this.getTableByNumber(tableNumber);
    if (table) {
      table.status = status;
      table.currentOrder = orderId;
      this.saveData();
    }
    return table;
  }

  // Métodos para usuarios
  getUsers() {
    return this.users;
  }

  authenticateUser(email, password) {
    return this.users.find(u => u.email === email && u.password === password);
  }

  // Métodos para pagos
  createPayment(paymentData) {
    const payment = {
      id: `PAY-${Date.now()}`,
      ...paymentData,
      createdAt: new Date().toISOString()
    };
    this.payments.push(payment);
    this.saveData();
    return payment;
  }

  getPayments() {
    return this.payments;
  }

  // Métodos de utilidad
  getStats() {
    const today = new Date().toDateString();
    const todayOrders = this.orders.filter(o => 
      new Date(o.createdAt).toDateString() === today
    );
    
    return {
      totalOrders: this.orders.length,
      todayOrders: todayOrders.length,
      totalRevenue: this.payments.reduce((sum, p) => sum + p.amount, 0),
      todayRevenue: this.payments.filter(p => 
        new Date(p.createdAt).toDateString() === today
      ).reduce((sum, p) => sum + p.amount, 0),
      pendingOrders: this.orders.filter(o => o.status === 'pending').length,
      preparingOrders: this.orders.filter(o => o.status === 'preparing').length
    };
  }
}

// Exportar instancia única
const db = new Database();
export default db;
