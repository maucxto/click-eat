import db from '../../api/database.js';
import ws from '../../api/websocket.js';

class BarPanel {
    constructor() {
        this.orders = [];
        this.currentOrder = null;
        this.init();
    }

    init() {
        this.loadOrders();
        this.setupWebSocket();
        this.setupEventListeners();
        this.renderOrders();
        this.updateStats();
    }

    loadOrders() {
        const allOrders = db.getOrders();
        this.orders = allOrders.filter(order => 
            order.status === 'pending' || order.status === 'preparing' || order.status === 'ready'
        );
    }

    setupWebSocket() {
        ws.subscribe('bar', (data) => {
            if (data.type === 'new_order') {
                this.handleNewOrder(data.order);
            } else if (data.type === 'order_update') {
                this.handleOrderUpdate(data.order);
            }
        });
    }

    setupEventListeners() {
        // Order action buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('accept-order-btn')) {
                const orderId = e.target.dataset.orderId;
                this.acceptOrder(orderId);
            }
            
            if (e.target.classList.contains('prepare-order-btn')) {
                const orderId = e.target.dataset.orderId;
                this.startPreparation(orderId);
            }
            
            if (e.target.classList.contains('complete-order-btn')) {
                const orderId = e.target.dataset.orderId;
                this.completeOrder(orderId);
            }
            
            if (e.target.classList.contains('order-details-btn')) {
                const orderId = e.target.dataset.orderId;
                this.showOrderDetails(orderId);
            }
        });

        // Filter tabs
        const filterTabs = document.querySelectorAll('.filter-tab');
        filterTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.setActiveFilter(e.target.dataset.filter);
            });
        });
    }

    handleNewOrder(order) {
        // Add to orders array
        const existingIndex = this.orders.findIndex(o => o.id === order.id);
        if (existingIndex === -1) {
            this.orders.unshift(order);
        } else {
            this.orders[existingIndex] = order;
        }
        
        // Play notification sound
        this.playNotificationSound();
        
        // Show notification
        this.showNotification('Nuevo pedido recibido', `Mesa ${order.tableNumber}`);
        
        // Re-render
        this.renderOrders();
        this.updateStats();
    }

    handleOrderUpdate(updatedOrder) {
        const orderIndex = this.orders.findIndex(o => o.id === updatedOrder.id);
        if (orderIndex !== -1) {
            this.orders[orderIndex] = updatedOrder;
            this.renderOrders();
            this.updateStats();
        }
    }

    acceptOrder(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (order) {
            order.status = 'preparing';
            order.acceptedAt = new Date().toISOString();
            order.acceptedBy = 'Bar Staff';
            
            db.updateOrder(order);
            ws.broadcast('order_update', { order });
            
            this.renderOrders();
            this.updateStats();
        }
    }

    startPreparation(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (order) {
            order.status = 'preparing';
            order.preparationStart = new Date().toISOString();
            
            db.updateOrder(order);
            ws.broadcast('order_update', { order });
            
            this.renderOrders();
            this.updateStats();
        }
    }

    completeOrder(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (order) {
            order.status = 'ready';
            order.completedAt = new Date().toISOString();
            order.completedBy = 'Bar Staff';
            
            db.updateOrder(order);
            ws.broadcast('order_update', { order });
            ws.broadcast('kitchen', { type: 'order_ready', order });
            
            // Remove from active orders after 5 seconds
            setTimeout(() => {
                this.orders = this.orders.filter(o => o.id !== orderId);
                this.renderOrders();
                this.updateStats();
            }, 5000);
            
            this.renderOrders();
            this.updateStats();
        }
    }

    showOrderDetails(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (order) {
            this.showModal(order);
        }
    }

    renderOrders() {
        const container = document.getElementById('orders-container');
        if (!container) return;

        const activeFilter = this.getActiveFilter();
        let filteredOrders = this.orders;

        if (activeFilter !== 'all') {
            filteredOrders = this.orders.filter(order => order.status === activeFilter);
        }

        if (filteredOrders.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-cocktail text-6xl text-gray-400 mb-4"></i>
                    <h3 class="text-xl font-semibold text-gray-700 mb-2">Sin pedidos pendientes</h3>
                    <p class="text-gray-500">Los nuevos pedidos aparecerán aquí automáticamente</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filteredOrders.map(order => this.renderOrderCard(order)).join('');
    }

    renderOrderCard(order) {
        const items = order.items.map(item => `
            <div class="order-item">
                <span class="item-name">${item.name}</span>
                <span class="item-quantity">x${item.quantity}</span>
            </div>
        `).join('');

        const statusClass = this.getStatusClass(order.status);
        const timeElapsed = this.getTimeElapsed(order.createdAt);
        const priorityClass = this.getPriorityClass(timeElapsed);

        return `
            <div class="order-card ${priorityClass}" data-order-id="${order.id}">
                <div class="order-header">
                    <div class="order-info">
                        <span class="table-number">Mesa ${order.tableNumber}</span>
                        <span class="order-time">${timeElapsed}</span>
                    </div>
                    <span class="status-badge ${statusClass}">
                        ${this.getStatusText(order.status)}
                    </span>
                </div>
                
                <div class="order-items">
                    ${items}
                </div>
                
                <div class="order-actions">
                    ${this.renderActionButtons(order)}
                </div>
            </div>
        `;
    }

    renderActionButtons(order) {
        const buttons = [];
        
        switch (order.status) {
            case 'pending':
                buttons.push(`
                    <button class="btn btn-primary accept-order-btn" data-order-id="${order.id}">
                        <i class="fas fa-check"></i> Aceptar
                    </button>
                `);
                break;
                
            case 'preparing':
                buttons.push(`
                    <button class="btn btn-success complete-order-btn" data-order-id="${order.id}">
                        <i class="fas fa-check-circle"></i> Completar
                    </button>
                `);
                break;
                
            case 'ready':
                buttons.push(`
                    <span class="status-text">Listo para servir</span>
                `);
                break;
        }
        
        buttons.push(`
            <button class="btn btn-secondary order-details-btn" data-order-id="${order.id}">
                <i class="fas fa-eye"></i> Detalles
            </button>
        `);
        
        return buttons.join('');
    }

    getStatusClass(status) {
        const classes = {
            'pending': 'status-pending',
            'preparing': 'status-preparing',
            'ready': 'status-ready'
        };
        return classes[status] || 'status-pending';
    }

    getStatusText(status) {
        const texts = {
            'pending': 'Pendiente',
            'preparing': 'En preparación',
            'ready': 'Listo'
        };
        return texts[status] || status;
    }

    getTimeElapsed(createdAt) {
        const now = new Date();
        const created = new Date(createdAt);
        const diff = Math.floor((now - created) / 1000 / 60); // minutes
        
        if (diff < 1) return 'Ahora';
        if (diff < 60) return `${diff}m`;
        return `${Math.floor(diff / 60)}h ${diff % 60}m`;
    }

    getPriorityClass(minutes) {
        if (minutes > 15) return 'priority-high';
        if (minutes > 8) return 'priority-medium';
        return 'priority-low';
    }

    getActiveFilter() {
        const activeTab = document.querySelector('.filter-tab.active');
        return activeTab ? activeTab.dataset.filter : 'all';
    }

    setActiveFilter(filter) {
        // Update active tab
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
        
        // Re-render orders
        this.renderOrders();
    }

    updateStats() {
        const pending = this.orders.filter(o => o.status === 'pending').length;
        const preparing = this.orders.filter(o => o.status === 'preparing').length;
        const completed = this.orders.filter(o => o.status === 'ready').length;
        
        const pendingEl = document.getElementById('pending-count');
        const preparingEl = document.getElementById('preparing-count');
        const completedEl = document.getElementById('completed-count');
        
        if (pendingEl) pendingEl.textContent = pending;
        if (preparingEl) preparingEl.textContent = preparing;
        if (completedEl) completedEl.textContent = completed;
    }

    playNotificationSound() {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmFgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
        audio.play().catch(e => console.log('Could not play notification sound'));
    }

    showNotification(title, message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.innerHTML = `
            <div class="notification-content">
                <h4>${title}</h4>
                <p>${message}</p>
            </div>
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    showModal(order) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Pedido Mesa ${order.tableNumber}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="order-details">
                        <div class="detail-row">
                            <span>ID:</span>
                            <span>#${order.id.slice(-6)}</span>
                        </div>
                        <div class="detail-row">
                            <span>Hora:</span>
                            <span>${new Date(order.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <div class="detail-row">
                            <span>Estado:</span>
                            <span class="status-badge ${this.getStatusClass(order.status)}">
                                ${this.getStatusText(order.status)}
                            </span>
                        </div>
                        ${order.comments ? `
                            <div class="detail-row">
                                <span>Comentarios:</span>
                                <span class="order-comments">${order.comments}</span>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="order-items-detailed">
                        ${order.items.map(item => `
                            <div class="item-detail">
                                <div class="item-info">
                                    <span class="item-name">${item.name}</span>
                                    <span class="item-price">$${item.price}</span>
                                </div>
                                <span class="item-quantity">x${item.quantity}</span>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="order-total">
                        <span>Total:</span>
                        <span>$${order.total}</span>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close modal handlers
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
}

// Initialize the bar panel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.barPanel = new BarPanel();
});

// Export for use in other modules
export default BarPanel;