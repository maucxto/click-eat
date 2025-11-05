import db from '../../api/database.js';
import ws from '../../api/websocket.js';

class AdminPanel {
    constructor() {
        this.currentView = 'dashboard';
        this.charts = {};
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadDashboard();
        this.setupWebSocket();
        this.startRealTimeUpdates();
    }

    setupEventListeners() {
        // Navigation
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('nav-item')) {
                const view = e.target.dataset.view;
                this.switchView(view);
            }

            // Product management
            if (e.target.classList.contains('add-product-btn')) {
                this.showAddProductModal();
            }

            if (e.target.classList.contains('edit-product-btn')) {
                const productId = e.target.dataset.productId;
                this.showEditProductModal(productId);
            }

            if (e.target.classList.contains('delete-product-btn')) {
                const productId = e.target.dataset.productId;
                this.deleteProduct(productId);
            }

            // User management
            if (e.target.classList.contains('add-user-btn')) {
                this.showAddUserModal();
            }

            if (e.target.classList.contains('toggle-user-btn')) {
                const userId = e.target.dataset.userId;
                this.toggleUser(userId);
            }

            // Modal actions
            if (e.target.classList.contains('modal-close')) {
                this.closeModal();
            }

            if (e.target.classList.contains('save-product-btn')) {
                this.saveProduct();
            }

            if (e.target.classList.contains('save-user-btn')) {
                this.saveUser();
            }

            // Analytics controls
            if (e.target.classList.contains('date-filter-btn')) {
                const period = e.target.dataset.period;
                this.updateAnalytics(period);
            }
        });

        // Form submissions
        document.addEventListener('submit', (e) => {
            if (e.target.id === 'product-form') {
                e.preventDefault();
                this.saveProduct();
            }
            if (e.target.id === 'user-form') {
                e.preventDefault();
                this.saveUser();
            }
        });

        // Search functionality
        const searchInputs = document.querySelectorAll('.search-input');
        searchInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                const searchTerm = e.target.value;
                const searchType = e.target.dataset.searchType;
                this.performSearch(searchTerm, searchType);
            });
        });
    }

    setupWebSocket() {
        ws.subscribe('admin', (data) => {
            switch (data.type) {
                case 'new_order':
                    this.updateDashboardStats();
                    break;
                case 'payment_completed':
                    this.updateRevenueStats();
                    break;
                case 'order_update':
                    this.updateOrderStats();
                    break;
            }
        });
    }

    switchView(view) {
        this.currentView = view;
        
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-view="${view}"]`).classList.add('active');

        // Load view content
        switch (view) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'products':
                this.loadProducts();
                break;
            case 'orders':
                this.loadOrders();
                break;
            case 'users':
                this.loadUsers();
                break;
            case 'analytics':
                this.loadAnalytics();
                break;
            case 'settings':
                this.loadSettings();
                break;
        }
    }

    loadDashboard() {
        const container = document.getElementById('main-content');
        if (!container) return;

        const stats = this.getDashboardStats();
        
        container.innerHTML = `
            <div class="dashboard-header">
                <h2>Panel de Control</h2>
                <div class="dashboard-filters">
                    <button class="date-filter-btn active" data-period="today">Hoy</button>
                    <button class="date-filter-btn" data-period="week">Esta Semana</button>
                    <button class="date-filter-btn" data-period="month">Este Mes</button>
                </div>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon revenue">
                        <i class="fas fa-dollar-sign"></i>
                    </div>
                    <div class="stat-info">
                        <h3>Ingresos</h3>
                        <span class="stat-value">$${stats.revenue.toFixed(2)}</span>
                        <span class="stat-change ${stats.revenueChange >= 0 ? 'positive' : 'negative'}">
                            ${stats.revenueChange >= 0 ? '+' : ''}${stats.revenueChange}%
                        </span>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon orders">
                        <i class="fas fa-receipt"></i>
                    </div>
                    <div class="stat-info">
                        <h3>Órdenes</h3>
                        <span class="stat-value">${stats.orders}</span>
                        <span class="stat-change ${stats.ordersChange >= 0 ? 'positive' : 'negative'}">
                            ${stats.ordersChange >= 0 ? '+' : ''}${stats.ordersChange}%
                        </span>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon customers">
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="stat-info">
                        <h3>Clientes</h3>
                        <span class="stat-value">${stats.customers}</span>
                        <span class="stat-change ${stats.customersChange >= 0 ? 'positive' : 'negative'}">
                            ${stats.customersChange >= 0 ? '+' : ''}${stats.customersChange}%
                        </span>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon tables">
                        <i class="fas fa-table"></i>
                    </div>
                    <div class="stat-info">
                        <h3>Mesas Ocupadas</h3>
                        <span class="stat-value">${stats.occupiedTables}/${stats.totalTables}</span>
                        <span class="stat-change ${stats.tablesChange >= 0 ? 'positive' : 'negative'}">
                            ${stats.tablesChange >= 0 ? '+' : ''}${stats.tablesChange}%
                        </span>
                    </div>
                </div>
            </div>
            
            <div class="dashboard-content">
                <div class="chart-section">
                    <h3>Ventas del Día</h3>
                    <div id="sales-chart"></div>
                </div>
                
                <div class="recent-orders">
                    <h3>Órdenes Recientes</h3>
                    <div class="orders-list">
                        ${this.renderRecentOrders()}
                    </div>
                </div>
            </div>
        `;

        this.initializeSalesChart();
    }

    getDashboardStats() {
        const orders = db.getOrders();
        const tables = db.getTables();
        const today = new Date().toDateString();
        
        const todayOrders = orders.filter(order => 
            new Date(order.createdAt).toDateString() === today
        );

        return {
            revenue: todayOrders.reduce((sum, order) => sum + order.total, 0),
            orders: todayOrders.length,
            customers: todayOrders.length, // Assuming 1 order per customer
            occupiedTables: tables.filter(t => t.status === 'occupied').length,
            totalTables: tables.length,
            revenueChange: 12.5, // Mock data
            ordersChange: 8.3,
            customersChange: -2.1,
            tablesChange: 5.0
        };
    }

    renderRecentOrders() {
        const orders = db.getOrders()
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);

        if (orders.length === 0) {
            return '<p class="no-orders">No hay órdenes recientes</p>';
        }

        return orders.map(order => `
            <div class="order-item">
                <div class="order-info">
                    <span class="order-id">#${order.id.slice(-6)}</span>
                    <span class="order-table">Mesa ${order.tableNumber}</span>
                    <span class="order-time">${new Date(order.createdAt).toLocaleTimeString()}</span>
                </div>
                <div class="order-status">
                    <span class="status-badge status-${order.status}">${order.status}</span>
                    <span class="order-total">$${order.total.toFixed(2)}</span>
                </div>
            </div>
        `).join('');
    }

    initializeSalesChart() {
        const chartContainer = document.getElementById('sales-chart');
        if (!chartContainer) return;

        // Mock sales data for the day
        const hours = Array.from({length: 24}, (_, i) => i);
        const salesData = hours.map(hour => {
            if (hour < 8 || hour > 23) return 0;
            return Math.floor(Math.random() * 1000) + 200;
        });

        const trace = {
            x: hours.map(h => `${h}:00`),
            y: salesData,
            type: 'scatter',
            mode: 'lines+markers',
            line: { color: '#3B82F6', width: 3 },
            marker: { color: '#3B82F6', size: 6 },
            fill: 'tonexty',
            fillcolor: 'rgba(59, 130, 246, 0.1)'
        };

        const layout = {
            title: '',
            xaxis: { 
                title: 'Hora',
                showgrid: false,
                zeroline: false
            },
            yaxis: { 
                title: 'Ventas ($)',
                showgrid: true,
                gridcolor: '#E5E7EB',
                zeroline: false
            },
            plot_bgcolor: 'transparent',
            paper_bgcolor: 'transparent',
            font: { family: 'Inter, sans-serif', size: 12 },
            margin: { l: 60, r: 20, t: 20, b: 60 },
            height: 300
        };

        Plotly.newPlot(chartContainer, [trace], layout, {
            responsive: true,
            displayModeBar: false
        });
    }

    loadProducts() {
        const container = document.getElementById('main-content');
        if (!container) return;

        const products = db.getProducts();
        const categories = [...new Set(products.map(p => p.category))];

        container.innerHTML = `
            <div class="products-header">
                <h2>Gestión de Productos</h2>
                <button class="btn btn-primary add-product-btn">
                    <i class="fas fa-plus"></i> Agregar Producto
                </button>
            </div>
            
            <div class="products-controls">
                <div class="search-box">
                    <i class="fas fa-search"></i>
                    <input type="text" class="search-input" data-search-type="products" placeholder="Buscar productos...">
                </div>
                
                <div class="category-filter">
                    <select id="category-filter">
                        <option value="">Todas las categorías</option>
                        ${categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                    </select>
                </div>
            </div>
            
            <div class="products-grid">
                ${products.map(product => this.renderProductCard(product)).join('')}
            </div>
        `;

        // Add category filter event listener
        document.getElementById('category-filter').addEventListener('change', (e) => {
            this.filterProductsByCategory(e.target.value);
        });
    }

    renderProductCard(product) {
        return `
            <div class="product-card" data-category="${product.category}">
                <div class="product-image">
                    <img src="${product.image}" alt="${product.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='">
                </div>
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <p class="product-description">${product.description}</p>
                    <div class="product-meta">
                        <span class="product-category">${product.category}</span>
                        <span class="product-price">$${product.price.toFixed(2)}</span>
                    </div>
                    <div class="product-actions">
                        <button class="btn btn-secondary edit-product-btn" data-product-id="${product.id}">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn btn-danger delete-product-btn" data-product-id="${product.id}">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    loadOrders() {
        const container = document.getElementById('main-content');
        if (!container) return;

        const orders = db.getOrders()
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        container.innerHTML = `
            <div class="orders-header">
                <h2>Gestión de Órdenes</h2>
                <div class="orders-filters">
                    <select id="status-filter">
                        <option value="">Todos los estados</option>
                        <option value="pending">Pendiente</option>
                        <option value="preparing">En preparación</option>
                        <option value="ready">Listo</option>
                        <option value="delivered">Entregado</option>
                        <option value="paid">Pagado</option>
                    </select>
                    
                    <input type="date" id="date-filter" class="search-input">
                </div>
            </div>
            
            <div class="orders-list">
                ${orders.map(order => this.renderOrderRow(order)).join('')}
            </div>
        `;

        // Add filter event listeners
        document.getElementById('status-filter').addEventListener('change', this.filterOrders.bind(this));
        document.getElementById('date-filter').addEventListener('change', this.filterOrders.bind(this));
    }

    renderOrderRow(order) {
        return `
            <div class="order-row">
                <div class="order-info">
                    <span class="order-id">#${order.id.slice(-6)}</span>
                    <span class="order-table">Mesa ${order.tableNumber}</span>
                    <span class="order-time">${new Date(order.createdAt).toLocaleString()}</span>
                </div>
                <div class="order-items-preview">
                    ${order.items.slice(0, 2).map(item => item.name).join(', ')}
                    ${order.items.length > 2 ? '...' : ''}
                </div>
                <div class="order-status">
                    <span class="status-badge status-${order.status}">${order.status}</span>
                    <span class="order-total">$${order.total.toFixed(2)}</span>
                </div>
                <div class="order-actions">
                    <button class="btn btn-secondary view-order-btn" data-order-id="${order.id}">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                </div>
            </div>
        `;
    }

    loadUsers() {
        const container = document.getElementById('main-content');
        if (!container) return;

        const users = db.getUsers();

        container.innerHTML = `
            <div class="users-header">
                <h2>Gestión de Usuarios</h2>
                <button class="btn btn-primary add-user-btn">
                    <i class="fas fa-plus"></i> Agregar Usuario
                </button>
            </div>
            
            <div class="users-table">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nombre</th>
                            <th>Email</th>
                            <th>Rol</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users.map(user => this.renderUserRow(user)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderUserRow(user) {
        return `
            <tr>
                <td>${user.id.slice(-6)}</td>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td><span class="role-badge role-${user.role}">${user.role}</span></td>
                <td>
                    <span class="status-indicator ${user.active ? 'active' : 'inactive'}">
                        ${user.active ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-secondary toggle-user-btn" data-user-id="${user.id}">
                        ${user.active ? 'Desactivar' : 'Activar'}
                    </button>
                </td>
            </tr>
        `;
    }

    loadAnalytics() {
        const container = document.getElementById('main-content');
        if (!container) return;

        container.innerHTML = `
            <div class="analytics-header">
                <h2>Análisis y Reportes</h2>
                <div class="analytics-filters">
                    <button class="date-filter-btn active" data-period="week">Esta Semana</button>
                    <button class="date-filter-btn" data-period="month">Este Mes</button>
                    <button class="date-filter-btn" data-period="year">Este Año</button>
                </div>
            </div>
            
            <div class="analytics-grid">
                <div class="chart-container">
                    <h3>Ventas por Categoría</h3>
                    <div id="category-chart"></div>
                </div>
                
                <div class="chart-container">
                    <h3>Horarios de Mayor Venta</h3>
                    <div id="hourly-chart"></div>
                </div>
                
                <div class="chart-container">
                    <h3>Productos Más Vendidos</h3>
                    <div id="products-chart"></div>
                </div>
                
                <div class="metrics-panel">
                    <h3>Métricas Clave</h3>
                    <div class="metric-item">
                        <span class="metric-label">Ticket Promedio</span>
                        <span class="metric-value">$${this.getAverageTicket().toFixed(2)}</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Tiempo de Espera Promedio</span>
                        <span class="metric-value">${this.getAverageWaitTime()} min</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Tasa de Ocupación</span>
                        <span class="metric-value">${this.getOccupationRate()}%</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Satisfacción del Cliente</span>
                        <span class="metric-value">4.2/5.0</span>
                    </div>
                </div>
            </div>
        `;

        this.initializeAnalyticsCharts();
    }

    initializeAnalyticsCharts() {
        // Category Chart
        const categoryData = this.getCategorySalesData();
        Plotly.newPlot('category-chart', [{
            labels: categoryData.labels,
            values: categoryData.values,
            type: 'pie',
            marker: { colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'] }
        }], {
            height: 300,
            margin: { l: 20, r: 20, t: 20, b: 20 },
            showlegend: true
        }, { responsive: true, displayModeBar: false });

        // Hourly Chart
        const hourlyData = this.getHourlySalesData();
        Plotly.newPlot('hourly-chart', [{
            x: hourlyData.hours,
            y: hourlyData.sales,
            type: 'bar',
            marker: { color: '#3B82F6' }
        }], {
            height: 300,
            margin: { l: 40, r: 20, t: 20, b: 40 },
            xaxis: { title: 'Hora' },
            yaxis: { title: 'Ventas' }
        }, { responsive: true, displayModeBar: false });

        // Top Products Chart
        const productsData = this.getTopProductsData();
        Plotly.newPlot('products-chart', [{
            x: productsData.sales,
            y: productsData.names,
            type: 'bar',
            orientation: 'h',
            marker: { color: '#10B981' }
        }], {
            height: 300,
            margin: { l: 120, r: 20, t: 20, b: 40 },
            xaxis: { title: 'Unidades Vendidas' },
            yaxis: { title: '' }
        }, { responsive: true, displayModeBar: false });
    }

    loadSettings() {
        const container = document.getElementById('main-content');
        if (!container) return;

        container.innerHTML = `
            <div class="settings-header">
                <h2>Configuración del Sistema</h2>
            </div>
            
            <div class="settings-grid">
                <div class="settings-section">
                    <h3>Información del Restaurante</h3>
                    <div class="setting-group">
                        <label>Nombre del Restaurante</label>
                        <input type="text" value="PRODUCTO NACIONAL" class="setting-input">
                    </div>
                    <div class="setting-group">
                        <label>Dirección</label>
                        <input type="text" value="Av. Principal 123" class="setting-input">
                    </div>
                    <div class="setting-group">
                        <label>Teléfono</label>
                        <input type="text" value="+52 555 123 4567" class="setting-input">
                    </div>
                </div>
                
                <div class="settings-section">
                    <h3>Configuración de Mesas</h3>
                    <div class="setting-group">
                        <label>Número de Mesas</label>
                        <input type="number" value="20" class="setting-input">
                    </div>
                    <div class="setting-group">
                        <label>Capacidad Máxima por Mesa</label>
                        <input type="number" value="8" class="setting-input">
                    </div>
                </div>
                
                <div class="settings-section">
                    <h3>Impuestos y Tarifas</h3>
                    <div class="setting-group">
                        <label>IVA (%)</label>
                        <input type="number" value="16" class="setting-input">
                    </div>
                    <div class="setting-group">
                        <label>Propuesta de Propina (%)</label>
                        <input type="number" value="15" class="setting-input">
                    </div>
                </div>
                
                <div class="settings-section">
                    <h3>Notificaciones</h3>
                    <div class="setting-group checkbox">
                        <label>
                            <input type="checkbox" checked>
                            Notificaciones de nuevos pedidos
                        </label>
                    </div>
                    <div class="setting-group checkbox">
                        <label>
                            <input type="checkbox" checked>
                            Notificaciones de pagos
                        </label>
                    </div>
                    <div class="setting-group checkbox">
                        <label>
                            <input type="checkbox">
                            Reportes diarios por email
                        </label>
                    </div>
                </div>
            </div>
            
            <div class="settings-actions">
                <button class="btn btn-primary save-settings-btn">Guardar Cambios</button>
                <button class="btn btn-secondary reset-settings-btn">Restablecer</button>
            </div>
        `;
    }

    // Utility methods
    showAddProductModal() {
        this.showProductModal();
    }

    showEditProductModal(productId) {
        const product = db.getProducts().find(p => p.id === productId);
        if (product) {
            this.showProductModal(product);
        }
    }

    showProductModal(product = null) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${product ? 'Editar' : 'Agregar'} Producto</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <form id="product-form">
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Nombre</label>
                            <input type="text" id="product-name" value="${product?.name || ''}" required>
                        </div>
                        <div class="form-group">
                            <label>Descripción</label>
                            <textarea id="product-description" rows="3">${product?.description || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Categoría</label>
                            <select id="product-category" required>
                                <option value="">Selecciona categoría</option>
                                <option value="Entradas" ${product?.category === 'Entradas' ? 'selected' : ''}>Entradas</option>
                                <option value="Platos Principales" ${product?.category === 'Platos Principales' ? 'selected' : ''}>Platos Principales</option>
                                <option value="Postres" ${product?.category === 'Postres' ? 'selected' : ''}>Postres</option>
                                <option value="Bebidas" ${product?.category === 'Bebidas' ? 'selected' : ''}>Bebidas</option>
                                <option value="Cócteles" ${product?.category === 'Cócteles' ? 'selected' : ''}>Cócteles</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Precio</label>
                            <input type="number" id="product-price" step="0.01" value="${product?.price || ''}" required>
                        </div>
                        <div class="form-group">
                            <label>URL de Imagen</label>
                            <input type="url" id="product-image" value="${product?.image || ''}">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary modal-close">Cancelar</button>
                        <button type="submit" class="btn btn-primary save-product-btn">Guardar</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
        this.currentModal = modal;

        // Store product ID for editing
        if (product) {
            modal.dataset.productId = product.id;
        }
    }

    saveProduct() {
        const modal = this.currentModal;
        const productId = modal.dataset.productId;
        
        const productData = {
            name: document.getElementById('product-name').value,
            description: document.getElementById('product-description').value,
            category: document.getElementById('product-category').value,
            price: parseFloat(document.getElementById('product-price').value),
            image: document.getElementById('product-image').value
        };

        if (productId) {
            // Update existing product
            db.updateProduct(productId, productData);
        } else {
            // Add new product
            db.addProduct({
                id: 'product_' + Date.now(),
                ...productData
            });
        }

        this.closeModal();
        this.showNotification('Producto guardado', 'El producto ha sido guardado exitosamente', 'success');
        this.loadProducts();
    }

    deleteProduct(productId) {
        if (confirm('¿Estás seguro de eliminar este producto?')) {
            db.deleteProduct(productId);
            this.showNotification('Producto eliminado', 'El producto ha sido eliminado', 'success');
            this.loadProducts();
        }
    }

    showAddUserModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Agregar Usuario</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <form id="user-form">
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Nombre</label>
                            <input type="text" id="user-name" required>
                        </div>
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" id="user-email" required>
                        </div>
                        <div class="form-group">
                            <label>Rol</label>
                            <select id="user-role" required>
                                <option value="">Selecciona rol</option>
                                <option value="admin">Administrador</option>
                                <option value="cashier">Cajero</option>
                                <option value="kitchen">Cocina</option>
                                <option value="bar">Bar</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Contraseña</label>
                            <input type="password" id="user-password" required>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary modal-close">Cancelar</button>
                        <button type="submit" class="btn btn-primary save-user-btn">Guardar</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
        this.currentModal = modal;
    }

    saveUser() {
        const userData = {
            name: document.getElementById('user-name').value,
            email: document.getElementById('user-email').value,
            role: document.getElementById('user-role').value,
            password: document.getElementById('user-password').value,
            active: true
        };

        db.addUser({
            id: 'user_' + Date.now(),
            ...userData
        });

        this.closeModal();
        this.showNotification('Usuario creado', 'El usuario ha sido creado exitosamente', 'success');
        this.loadUsers();
    }

    toggleUser(userId) {
        const user = db.getUsers().find(u => u.id === userId);
        if (user) {
            user.active = !user.active;
            db.updateUser(userId, user);
            this.showNotification('Usuario actualizado', `El usuario ha sido ${user.active ? 'activado' : 'desactivado'}`, 'success');
            this.loadUsers();
        }
    }

    closeModal() {
        if (this.currentModal) {
            this.currentModal.remove();
            this.currentModal = null;
        }
    }

    performSearch(searchTerm, searchType) {
        const elements = document.querySelectorAll(`[data-search-type="${searchType}"]`);
        // Implementation depends on specific search requirements
        console.log(`Searching for "${searchTerm}" in ${searchType}`);
    }

    filterProductsByCategory(category) {
        const cards = document.querySelectorAll('.product-card');
        cards.forEach(card => {
            if (!category || card.dataset.category === category) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }

    filterOrders() {
        const statusFilter = document.getElementById('status-filter').value;
        const dateFilter = document.getElementById('date-filter').value;
        
        // Implementation for filtering orders
        console.log(`Filtering orders: status=${statusFilter}, date=${dateFilter}`);
    }

    updateDashboardStats() {
        if (this.currentView === 'dashboard') {
            this.loadDashboard();
        }
    }

    updateRevenueStats() {
        this.updateDashboardStats();
    }

    updateOrderStats() {
        this.updateDashboardStats();
    }

    startRealTimeUpdates() {
        setInterval(() => {
            if (this.currentView === 'dashboard') {
                this.updateDashboardStats();
            }
        }, 30000); // Update every 30 seconds
    }

    // Analytics helper methods
    getCategorySalesData() {
        const orders = db.getOrders();
        const categoryTotals = {};
        
        orders.forEach(order => {
            order.items.forEach(item => {
                const category = item.category || 'Otros';
                categoryTotals[category] = (categoryTotals[category] || 0) + item.price * item.quantity;
            });
        });

        return {
            labels: Object.keys(categoryTotals),
            values: Object.values(categoryTotals)
        };
    }

    getHourlySalesData() {
        const orders = db.getOrders();
        const hourlySales = new Array(24).fill(0);
        
        orders.forEach(order => {
            const hour = new Date(order.createdAt).getHours();
            hourlySales[hour] += order.total;
        });

        return {
            hours: Array.from({length: 24}, (_, i) => i),
            sales: hourlySales
        };
    }

    getTopProductsData() {
        const orders = db.getOrders();
        const productSales = {};
        
        orders.forEach(order => {
            order.items.forEach(item => {
                productSales[item.name] = (productSales[item.name] || 0) + item.quantity;
            });
        });

        const sorted = Object.entries(productSales)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10);

        return {
            names: sorted.map(([name]) => name),
            sales: sorted.map(([, sales]) => sales)
        };
    }

    getAverageTicket() {
        const orders = db.getOrders();
        const total = orders.reduce((sum, order) => sum + order.total, 0);
        return orders.length > 0 ? total / orders.length : 0;
    }

    getAverageWaitTime() {
        // Mock data - in real implementation would calculate from order timestamps
        return 12;
    }

    getOccupationRate() {
        const tables = db.getTables();
        const occupied = tables.filter(t => t.status === 'occupied').length;
        return tables.length > 0 ? (occupied / tables.length) * 100 : 0;
    }

    showNotification(title, message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <h4>${title}</h4>
                <p>${message}</p>
            </div>
        `;

        document.body.appendChild(notification);

        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Initialize the admin panel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminPanel = new AdminPanel();
});

// Export for use in other modules
export default AdminPanel;