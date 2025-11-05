import db from '../../api/database.js';
import ws from '../../api/websocket.js';

class CashierPanel {
    constructor() {
        this.orders = [];
        this.tables = [];
        this.currentTab = null;
        this.init();
    }

    init() {
        this.loadData();
        this.setupWebSocket();
        this.setupEventListeners();
        this.renderTabs();
        this.updateStats();
        this.startClock();
    }

    loadData() {
        this.orders = db.getOrders();
        this.tables = db.getTables();
    }

    setupWebSocket() {
        ws.subscribe('cashier', (data) => {
            switch (data.type) {
                case 'new_order':
                    this.handleNewOrder(data.order);
                    break;
                case 'order_update':
                    this.handleOrderUpdate(data.order);
                    break;
                case 'payment_request':
                    this.handlePaymentRequest(data);
                    break;
            }
        });
    }

    setupEventListeners() {
        // Tab selection
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab-item')) {
                const tableId = e.target.dataset.tableId;
                this.selectTab(tableId);
            }

            // Payment actions
            if (e.target.classList.contains('process-payment-btn')) {
                this.processPayment();
            }

            if (e.target.classList.contains('split-bill-btn')) {
                this.showSplitOptions();
            }

            if (e.target.classList.contains('add-item-btn')) {
                this.showAddItemModal();
            }

            // Payment method selection
            if (e.target.classList.contains('payment-method')) {
                this.selectPaymentMethod(e.target.dataset.method);
            }

            // Modal actions
            if (e.target.classList.contains('modal-close')) {
                this.closeModal();
            }

            if (e.target.classList.contains('confirm-payment-btn')) {
                this.confirmPayment();
            }
        });

        // Search functionality
        const searchInput = document.getElementById('tab-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterTabs(e.target.value);
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
            if (e.ctrlKey && e.key === 'p') {
                e.preventDefault();
                this.processPayment();
            }
        });
    }

    handleNewOrder(order) {
        // Check if order belongs to an active table
        const table = this.tables.find(t => t.id === order.tableId);
        if (table && table.status === 'occupied') {
            this.playNotificationSound();
            this.showNotification('Nuevo pedido', `Mesa ${order.tableNumber}`);
            this.loadData();
            this.renderTabs();
            this.updateStats();
        }
    }

    handleOrderUpdate(updatedOrder) {
        const orderIndex = this.orders.findIndex(o => o.id === updatedOrder.id);
        if (orderIndex !== -1) {
            this.orders[orderIndex] = updatedOrder;
            if (this.currentTab && this.currentTab.id === updatedOrder.tableId) {
                this.renderCurrentTab();
            }
        }
    }

    handlePaymentRequest(data) {
        this.showNotification('Solicitud de pago', `Mesa ${data.tableNumber} - $${data.amount}`);
        this.selectTab(data.tableId);
    }

    renderTabs() {
        const container = document.getElementById('tabs-container');
        if (!container) return;

        const occupiedTables = this.tables.filter(table => table.status === 'occupied');

        if (occupiedTables.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-receipt text-6xl text-gray-400 mb-4"></i>
                    <h3 class="text-xl font-semibold text-gray-700 mb-2">No hay cuentas abiertas</h3>
                    <p class="text-gray-500">Las mesas ocupadas aparecerán aquí automáticamente</p>
                </div>
            `;
            return;
        }

        container.innerHTML = occupiedTables.map(table => this.renderTabItem(table)).join('');
    }

    renderTabItem(table) {
        const tableOrders = this.orders.filter(order => 
            order.tableId === table.id && 
            (order.status === 'ready' || order.status === 'delivered' || order.status === 'paid')
        );

        const total = tableOrders.reduce((sum, order) => sum + order.total, 0);
        const itemCount = tableOrders.reduce((sum, order) => sum + order.items.length, 0);
        const timeOpen = this.getTimeElapsed(table.occupiedAt);

        return `
            <div class="tab-item" data-table-id="${table.id}">
                <div class="tab-header">
                    <div class="tab-info">
                        <span class="table-number">Mesa ${table.number}</span>
                        <span class="time-open">${timeOpen}</span>
                    </div>
                    <div class="tab-status">
                        <span class="item-count">${itemCount} items</span>
                    </div>
                </div>
                <div class="tab-total">
                    <span class="total-amount">$${total.toFixed(2)}</span>
                </div>
                <div class="tab-actions">
                    <button class="btn btn-primary process-payment-btn" data-table-id="${table.id}">
                        <i class="fas fa-credit-card"></i> Cobrar
                    </button>
                    <button class="btn btn-secondary split-bill-btn" data-table-id="${table.id}">
                        <i class="fas fa-divide"></i> Dividir
                    </button>
                </div>
            </div>
        `;
    }

    selectTab(tableId) {
        // Update active tab
        document.querySelectorAll('.tab-item').forEach(tab => {
            tab.classList.remove('active');
        });
        
        const selectedTab = document.querySelector(`[data-table-id="${tableId}"]`);
        if (selectedTab) {
            selectedTab.classList.add('active');
        }

        // Load tab data
        this.currentTab = this.tables.find(t => t.id === tableId);
        this.renderCurrentTab();
    }

    renderCurrentTab() {
        const container = document.getElementById('current-tab-container');
        if (!container || !this.currentTab) return;

        const tableOrders = this.orders.filter(order => 
            order.tableId === this.currentTab.id && 
            (order.status === 'ready' || order.status === 'delivered' || order.status === 'paid')
        );

        const subtotal = tableOrders.reduce((sum, order) => sum + order.total, 0);
        const tax = subtotal * 0.16; // 16% IVA
        const total = subtotal + tax;

        container.innerHTML = `
            <div class="tab-detail-header">
                <h3>Mesa ${this.currentTab.number}</h3>
                <span class="tab-status-badge">Abierta desde ${this.getTimeElapsed(this.currentTab.occupiedAt)}</span>
            </div>
            
            <div class="order-summary">
                ${tableOrders.map(order => this.renderOrderDetail(order)).join('')}
            </div>
            
            <div class="tab-totals">
                <div class="total-row">
                    <span>Subtotal:</span>
                    <span>$${subtotal.toFixed(2)}</span>
                </div>
                <div class="total-row">
                    <span>IVA (16%):</span>
                    <span>$${tax.toFixed(2)}</span>
                </div>
                <div class="total-row total-final">
                    <span>Total:</span>
                    <span>$${total.toFixed(2)}</span>
                </div>
            </div>
            
            <div class="tab-actions-detailed">
                <button class="btn btn-success process-payment-btn">
                    <i class="fas fa-credit-card"></i> Procesar Pago
                </button>
                <button class="btn btn-secondary split-bill-btn">
                    <i class="fas fa-divide"></i> Dividir Cuenta
                </button>
                <button class="btn btn-info add-item-btn">
                    <i class="fas fa-plus"></i> Agregar Item
                </button>
            </div>
        `;
    }

    renderOrderDetail(order) {
        return `
            <div class="order-detail-item">
                <div class="order-time">${new Date(order.createdAt).toLocaleTimeString()}</div>
                <div class="order-items">
                    ${order.items.map(item => `
                        <div class="item-row">
                            <span class="item-name">${item.name}</span>
                            <span class="item-quantity">x${item.quantity}</span>
                            <span class="item-price">$${item.price}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="order-total">Total: $${order.total}</div>
            </div>
        `;
    }

    processPayment() {
        if (!this.currentTab) {
            this.showNotification('Error', 'Selecciona una mesa primero', 'error');
            return;
        }

        this.showPaymentModal();
    }

    showPaymentModal() {
        const tableOrders = this.orders.filter(order => 
            order.tableId === this.currentTab.id && 
            (order.status === 'ready' || order.status === 'delivered')
        );

        const subtotal = tableOrders.reduce((sum, order) => sum + order.total, 0);
        const tax = subtotal * 0.16;
        const total = subtotal + tax;

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content payment-modal">
                <div class="modal-header">
                    <h3>Procesar Pago - Mesa ${this.currentTab.number}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                
                <div class="modal-body">
                    <div class="payment-amount">
                        <div class="amount-display">
                            <span class="amount-label">Total a pagar:</span>
                            <span class="amount-value">$${total.toFixed(2)}</span>
                        </div>
                    </div>
                    
                    <div class="payment-methods">
                        <h4>Método de Pago</h4>
                        <div class="method-grid">
                            <div class="payment-method" data-method="cash">
                                <i class="fas fa-money-bill"></i>
                                <span>Efectivo</span>
                            </div>
                            <div class="payment-method" data-method="card">
                                <i class="fas fa-credit-card"></i>
                                <span>Tarjeta</span>
                            </div>
                            <div class="payment-method" data-method="transfer">
                                <i class="fas fa-mobile-alt"></i>
                                <span>Transferencia</span>
                            </div>
                            <div class="payment-method" data-method="split">
                                <i class="fas fa-divide"></i>
                                <span>Dividir</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="payment-details" id="payment-details" style="display: none;">
                        <!-- Dynamic payment details will be inserted here -->
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn btn-secondary modal-close">Cancelar</button>
                    <button class="btn btn-success confirm-payment-btn" disabled>
                        Confirmar Pago
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.currentModal = modal;
    }

    selectPaymentMethod(method) {
        // Update selected method
        document.querySelectorAll('.payment-method').forEach(m => {
            m.classList.remove('selected');
        });
        document.querySelector(`[data-method="${method}"]`).classList.add('selected');

        // Show payment details
        const detailsContainer = document.getElementById('payment-details');
        detailsContainer.style.display = 'block';

        let detailsHTML = '';
        switch (method) {
            case 'cash':
                detailsHTML = `
                    <div class="cash-details">
                        <label>Monto recibido:</label>
                        <input type="number" id="cash-received" step="0.01" placeholder="0.00">
                        <div class="change-display">
                            <span>Cambio:</span>
                            <span id="change-amount">$0.00</span>
                        </div>
                    </div>
                `;
                break;
            case 'card':
                detailsHTML = `
                    <div class="card-details">
                        <label>Tipo de tarjeta:</label>
                        <select id="card-type">
                            <option value="visa">Visa</option>
                            <option value="mastercard">Mastercard</option>
                            <option value="amex">American Express</option>
                        </select>
                        <label>Últimos 4 dígitos:</label>
                        <input type="text" id="card-last4" maxlength="4" placeholder="1234">
                    </div>
                `;
                break;
            case 'transfer':
                detailsHTML = `
                    <div class="transfer-details">
                        <label>Referencia de transferencia:</label>
                        <input type="text" id="transfer-ref" placeholder="Ingresa la referencia">
                        <label>Banco:</label>
                        <select id="bank-name">
                            <option value="bbva">BBVA</option>
                            <option value="santander">Santander</option>
                            <option value="banorte">Banorte</option>
                            <option value="hsbc">HSBC</option>
                        </select>
                    </div>
                `;
                break;
            case 'split':
                detailsHTML = this.renderSplitDetails();
                break;
        }

        detailsContainer.innerHTML = detailsHTML;

        // Enable confirm button
        document.querySelector('.confirm-payment-btn').disabled = false;

        // Add event listeners for cash calculation
        if (method === 'cash') {
            const cashInput = document.getElementById('cash-received');
            cashInput.addEventListener('input', this.calculateChange.bind(this));
        }
    }

    renderSplitDetails() {
        const tableOrders = this.orders.filter(order => 
            order.tableId === this.currentTab.id && 
            (order.status === 'ready' || order.status === 'delivered')
        );

        return `
            <div class="split-details">
                <h5>Dividir cuenta en:</h5>
                <div class="split-options">
                    <label>
                        <input type="radio" name="split-type" value="equal" checked>
                        Partes iguales
                    </label>
                    <label>
                        <input type="radio" name="split-type" value="custom">
                        Monto personalizado
                    </label>
                </div>
                <div class="split-count">
                    <label>Número de personas:</label>
                    <input type="number" id="split-count" min="2" max="10" value="2">
                </div>
                <div id="custom-split" style="display: none;">
                    ${tableOrders.map((order, index) => `
                        <div class="custom-split-item">
                            <span>Pedido ${index + 1}: $${order.total}</span>
                            <input type="number" class="split-amount" data-order="${order.id}" placeholder="Monto">
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    calculateChange() {
        const received = parseFloat(document.getElementById('cash-received').value) || 0;
        const tableOrders = this.orders.filter(order => 
            order.tableId === this.currentTab.id && 
            (order.status === 'ready' || order.status === 'delivered')
        );
        const total = tableOrders.reduce((sum, order) => sum + order.total, 0) * 1.16;
        const change = received - total;
        
        document.getElementById('change-amount').textContent = `$${change.toFixed(2)}`;
    }

    confirmPayment() {
        const selectedMethod = document.querySelector('.payment-method.selected');
        if (!selectedMethod) {
            this.showNotification('Error', 'Selecciona un método de pago', 'error');
            return;
        }

        const method = selectedMethod.dataset.method;
        const tableOrders = this.orders.filter(order => 
            order.tableId === this.currentTab.id && 
            (order.status === 'ready' || order.status === 'delivered')
        );

        // Process payment
        const payment = {
            id: 'payment_' + Date.now(),
            tableId: this.currentTab.id,
            orders: tableOrders.map(o => o.id),
            method: method,
            amount: tableOrders.reduce((sum, order) => sum + order.total, 0) * 1.16,
            timestamp: new Date().toISOString(),
            cashier: 'Cashier Staff'
        };

        // Save payment
        db.savePayment(payment);

        // Update orders status
        tableOrders.forEach(order => {
            order.status = 'paid';
            order.paidAt = payment.timestamp;
            db.updateOrder(order);
        });

        // Update table status
        this.currentTab.status = 'available';
        this.currentTab.occupiedAt = null;
        db.updateTable(this.currentTab);

        // Broadcast updates
        ws.broadcast('payment_completed', { 
            payment, 
            table: this.currentTab 
        });

        // Close modal
        this.closeModal();

        // Show success message
        this.showNotification('Pago procesado', `Mesa ${this.currentTab.number} - $${payment.amount.toFixed(2)}`, 'success');

        // Reload data and refresh UI
        this.loadData();
        this.currentTab = null;
        this.renderTabs();
        this.updateStats();
        
        // Clear current tab display
        const container = document.getElementById('current-tab-container');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-hand-pointer text-6xl text-gray-400 mb-4"></i>
                    <h3 class="text-xl font-semibold text-gray-700 mb-2">Selecciona una mesa</h3>
                    <p class="text-gray-500">Haz clic en una mesa ocupada para ver su cuenta</p>
                </div>
            `;
        }
    }

    closeModal() {
        if (this.currentModal) {
            this.currentModal.remove();
            this.currentModal = null;
        }
    }

    filterTabs(searchTerm) {
        const tabs = document.querySelectorAll('.tab-item');
        tabs.forEach(tab => {
            const tableNumber = tab.querySelector('.table-number').textContent;
            if (tableNumber.toLowerCase().includes(searchTerm.toLowerCase())) {
                tab.style.display = 'block';
            } else {
                tab.style.display = 'none';
            }
        });
    }

    updateStats() {
        const occupiedTables = this.tables.filter(t => t.status === 'occupied').length;
        const totalRevenue = this.orders
            .filter(o => o.status === 'paid')
            .reduce((sum, order) => sum + order.total, 0);
        const pendingPayments = this.orders
            .filter(o => o.status === 'ready' || o.status === 'delivered')
            .reduce((sum, order) => sum + order.total, 0);

        const occupiedEl = document.getElementById('occupied-tables');
        const revenueEl = document.getElementById('daily-revenue');
        const pendingEl = document.getElementById('pending-payments');

        if (occupiedEl) occupiedEl.textContent = occupiedTables;
        if (revenueEl) revenueEl.textContent = `$${totalRevenue.toFixed(2)}`;
        if (pendingEl) pendingEl.textContent = `$${pendingPayments.toFixed(2)}`;
    }

    startClock() {
        const updateClock = () => {
            const now = new Date();
            const timeEl = document.getElementById('current-time');
            if (timeEl) {
                timeEl.textContent = now.toLocaleTimeString();
            }
        };

        updateClock();
        setInterval(updateClock, 1000);
    }

    getTimeElapsed(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diff = Math.floor((now - time) / 1000 / 60); // minutes

        if (diff < 1) return 'Ahora';
        if (diff < 60) return `${diff}m`;
        return `${Math.floor(diff / 60)}h ${diff % 60}m`;
    }

    playNotificationSound() {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmFgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
        audio.play().catch(e => console.log('Could not play notification sound'));
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

// Initialize the cashier panel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.cashierPanel = new CashierPanel();
});

// Export for use in other modules
export default CashierPanel;