'use strict';

const API = {

  base: (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  )
    ? 'http://localhost:3000/api'
    : 'https://mawegobookbackend.onrender.com/api',

  getToken() {
    return localStorage.getItem('mb_token');
  },

  setAuth(token, user) {
    localStorage.setItem('mb_token', token);
    localStorage.setItem('mb_user', JSON.stringify(user));
  },

  clearAuth() {
    localStorage.removeItem('mb_token');
    localStorage.removeItem('mb_user');
  },

  getUser() {
    try {
      return JSON.parse(
        localStorage.getItem('mb_user') || 'null'
      );
    } catch {
      return null;
    }
  },

  async request(path, options = {}) {
    const headers = { ...(options.headers || {}) };

    const isFormData =
      typeof FormData !== 'undefined' &&
      options.body instanceof FormData;

    if (!isFormData && options.body !== undefined) {
      headers['Content-Type'] =
        headers['Content-Type'] || 'application/json';
    }

    const token = this.getToken();

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    let response;

    try {
      response = await fetch(this.base + path, {
        ...options,
        headers,
        body: isFormData
          ? options.body
          : options.body !== undefined
            ? (
                typeof options.body === 'string'
                  ? options.body
                  : JSON.stringify(options.body)
              )
            : undefined
      });
    } catch (networkError) {
      const error = new Error(
        'Unable to connect to Mawego Bookshop server. Check that the backend is running.'
      );

      error.cause = networkError;
      throw error;
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(
        data.error ||
        data.message ||
        `Request failed (${response.status})`
      );

      error.status = response.status;
      error.data = data;

      throw error;
    }

    return data;
  },

  get(path) {
    return this.request(path);
  },

  post(path, body = {}) {
    return this.request(path, {
      method: 'POST',
      body
    });
  },

  put(path, body = {}) {
    return this.request(path, {
      method: 'PUT',
      body
    });
  },

  patch(path, body = {}) {
    return this.request(path, {
      method: 'PATCH',
      body
    });
  },

  del(path) {
    return this.request(path, {
      method: 'DELETE'
    });
  },

  categories() {
    return this.get('/categories');
  },

  products(params = {}) {
    const q = new URLSearchParams(params).toString();

    return this.get(
      '/products' + (q ? '?' + q : '')
    );
  },

  product(slug) {
    return this.get(
      '/products/' + encodeURIComponent(slug)
    );
  },

  settings() {
    return this.get('/settings');
  },

  login(email, password) {
    return this.post('/auth/login', {
      email,
      password
    });
  },

  register(payload) {
    return this.post('/auth/register', payload);
  },

  me() {
    return this.get('/auth/me');
  },

  myOrders() {
    return this.get('/auth/my-orders');
  },

  forgotPassword(email) {
    return this.post('/auth/forgot-password', {
      email
    });
  },

  resetPassword(token, password) {
    return this.post('/auth/reset-password', {
      token,
      password
    });
  },

  adminStaff() {
    return this.get('/auth/staff');
  },

  adminCreateStaff(body) {
    return this.post('/auth/staff', body);
  },

  adminUpdateStaff(id, body) {
    return this.patch(
      '/auth/staff/' + encodeURIComponent(id),
      body
    );
  },

  createOrder(payload) {
    return this.post('/orders', payload);
  },

  trackOrder(orderNumber, phone) {
    const q = phone
      ? '?phone=' + encodeURIComponent(phone)
      : '';

    return this.get(
      '/orders/track/' +
      encodeURIComponent(orderNumber) + q
    );
  },

  orderStatus(id) {
    return this.get(
      '/orders/' +
      encodeURIComponent(id) +
      '/status'
    );
  },

  cancelOrder(id) {
    return this.post(
      '/orders/' +
      encodeURIComponent(id) +
      '/cancel',
      {}
    );
  },

  mpesaStk(orderId, phone) {
    return this.post('/payments/mpesa/stk', {
      order_id: orderId,
      phone
    });
  },

  cardInitiate(orderId) {
    return this.post('/payments/card/initiate', {
      order_id: orderId
    });
  },

  receiptByOrderId(orderId) {
    return this.get(
      '/receipts/order/' +
      encodeURIComponent(orderId)
    );
  },

  receiptByNumber(orderNumber, phone) {
    const q = phone
      ? '?phone=' + encodeURIComponent(phone)
      : '';

    return this.get(
      '/receipts/number/' +
      encodeURIComponent(orderNumber) + q
    );
  },

  validatePromo(code, subtotal) {
    return this.post('/promos/validate', {
      code,
      subtotal
    });
  },

  adminPromos() {
    return this.get('/admin/promos');
  },

  adminCreatePromo(body) {
    return this.post('/admin/promos', body);
  },

  notifications(params = {}) {
    const q = new URLSearchParams(params).toString();

    return this.get(
      '/notifications' + (q ? '?' + q : '')
    );
  },

  notificationUnreadCount() {
    return this.get('/notifications/unread-count');
  },

  notificationMarkRead(id) {
    return this.patch(
      '/notifications/' +
      encodeURIComponent(id) +
      '/read',
      {}
    );
  },

  notificationMarkAllRead() {
    return this.post('/notifications/read-all', {});
  },

  notificationClearRead() {
    return this.del('/notifications/clear-read');
  },

  notificationClearAll() {
    return this.del('/notifications/clear-all');
  },

  adminDashboard() {
    return this.get('/admin/dashboard');
  },

  adminProducts(params = {}) {
    const q = new URLSearchParams(params).toString();

    return this.get(
      '/admin/products' + (q ? '?' + q : '')
    );
  },

  adminCreateProduct(formData) {
    return this.request('/admin/products', {
      method: 'POST',
      body: formData
    });
  },

  adminUpdateProduct(id, formData) {
    return this.request(
      '/admin/products/' + encodeURIComponent(id),
      {
        method: 'PUT',
        body: formData
      }
    );
  },

  adminDeleteProduct(id) {
    return this.del(
      '/admin/products/' + encodeURIComponent(id)
    );
  },

  adminAdjustStock(id, body) {
    return this.post(
      '/admin/products/' +
      encodeURIComponent(id) +
      '/stock',
      body
    );
  },

  adminImportProducts(products) {
    return this.post('/admin/products/import', {
      products
    });
  },

  adminOrders(params = {}) {
    const q = new URLSearchParams(params).toString();

    return this.get(
      '/admin/orders' + (q ? '?' + q : '')
    );
  },

  adminOrder(id) {
    return this.get(
      '/admin/orders/' + encodeURIComponent(id)
    );
  },

  adminUpdateOrder(id, body) {
    return this.patch(
      '/admin/orders/' + encodeURIComponent(id),
      body
    );
  },

  adminMarkPaid(id, body = {}) {
    return this.post(
      '/admin/orders/' +
      encodeURIComponent(id) +
      '/mark-paid',
      body
    );
  },

  adminSalesReport(from, to) {
    return this.get(
      `/admin/reports/sales?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
    );
  },

  adminInventory() {
    return this.get('/admin/reports/inventory');
  },

  adminProfitLoss(from, to) {
    return this.get(
      `/admin/reports/profit-loss?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
    );
  },

  adminSuppliers() {
    return this.get('/admin/suppliers');
  },

  adminCreateSupplier(body) {
    return this.post('/admin/suppliers', body);
  },

  adminUpdateSupplier(id, body) {
    return this.put(
      '/admin/suppliers/' + encodeURIComponent(id),
      body
    );
  },

  adminPurchaseOrders() {
    return this.get('/admin/purchase-orders');
  },

  adminCreatePO(body) {
    return this.post('/admin/purchase-orders', body);
  },

  adminReceivePO(id) {
    return this.post(
      '/admin/purchase-orders/' +
      encodeURIComponent(id) +
      '/receive',
      {}
    );
  },

  adminExpenses(params = {}) {
    const q = new URLSearchParams(params).toString();

    return this.get(
      '/admin/expenses' + (q ? '?' + q : '')
    );
  },

  adminExpenseCategories() {
    return this.get('/admin/expenses/categories');
  },

  adminCreateExpense(body) {
    return this.post('/admin/expenses', body);
  },

  adminUpdateExpense(id, body) {
    return this.put(
      '/admin/expenses/' + encodeURIComponent(id),
      body
    );
  },

  adminDeleteExpense(id) {
    return this.del(
      '/admin/expenses/' + encodeURIComponent(id)
    );
  },

  pointsBalance() {
    return this.get('/points/balance');
  },

  pointsHistory() {
    return this.get('/points/history');
  }
};

window.API = API;

const Cart = {

  key: 'mb_cart',

  getProductId(product) {
    if (!product) return '';

    const id =
      product.product_id ??
      product.id ??
      product._id;

    if (id && typeof id === 'object') {
      return String(id._id ?? id.id ?? '');
    }

    return id == null ? '' : String(id);
  },

  get() {
    try {
      const stored = JSON.parse(
        localStorage.getItem(this.key) || '[]'
      );

      if (!Array.isArray(stored)) return [];

      return stored
        .map(item => {
          const productId = this.getProductId(item);

          return {
            ...item,

            product_id: productId,

            name:
              item.name ||
              item.product_name ||
              item.title ||
              'Unnamed product',

            price_kes: Number(
              item.price_kes ?? item.price ?? 0
            ),

            quantity: Math.max(
              1,
              Math.floor(Number(item.quantity) || 1)
            ),

            stock_qty: Number(
              item.stock_qty ?? item.stock ?? 99
            )
          };
        })
        .filter(item => item.product_id);

    } catch (error) {
      console.error('Cart storage error:', error);
      return [];
    }
  },

  save(items) {
    try {
      localStorage.setItem(
        this.key,
        JSON.stringify(items)
      );

      this.updateBadge();

      window.dispatchEvent(
        new CustomEvent('cart:updated', {
          detail: { items }
        })
      );

      return true;

    } catch (error) {
      console.error('Unable to save basket:', error);
      return false;
    }
  },

  add(product, qty = 1) {
    if (!product || typeof product !== 'object') {
      throw new Error('Invalid product.');
    }

    const productId = this.getProductId(product);

    if (!productId) {
      throw new Error('Product ID is missing.');
    }

    const price = Number(
      product.price_kes ?? product.price ?? 0
    );

    if (!Number.isFinite(price) || price < 0) {
      throw new Error('Invalid product price.');
    }

    const rawStock =
      product.stock_qty ??
      product.stock ??
      99;

    const stock = Math.max(
      0,
      Number(rawStock) || 0
    );

    if (stock < 1) {
      throw new Error(
        'This product is currently out of stock.'
      );
    }

    const quantity = Math.max(
      1,
      Math.floor(Number(qty) || 1)
    );

    const items = this.get();

    const existing = items.find(
      item => String(item.product_id) === productId
    );

    if (existing) {
      existing.quantity = Math.min(
        existing.quantity + quantity,
        stock
      );

      existing.stock_qty = stock;

    } else {
      items.push({
        product_id: productId,

        name:
          product.name ||
          product.product_name ||
          product.title ||
          'Unnamed product',

        price_kes: price,

        original_price_kes: Number(
          product.original_price_kes ??
          product.original_price ??
          price
        ),

        sale_active: !!product.sale_active,

        discount_percent: Number(
          product.discount_percent || 0
        ),

        image_url: product.image_url || '',
        slug: product.slug || '',
        stock_qty: stock,

        quantity: Math.min(quantity, stock)
      });
    }

    if (!this.save(items)) {
      throw new Error(
        'Unable to save this product to your basket.'
      );
    }

    return items;
  },

  updateQty(productId, quantity) {
    const id = String(productId);

    const items = this.get().map(item => {
      if (String(item.product_id) !== id) {
        return item;
      }

      const requested = Math.max(
        1,
        Math.floor(Number(quantity) || 1)
      );

      const stock = Math.max(
        1,
        Number(item.stock_qty) || 99
      );

      item.quantity = Math.min(
        requested,
        stock
      );

      return item;
    });

    return this.save(items);
  },

  remove(productId) {
    const id = String(productId);

    return this.save(
      this.get().filter(
        item => String(item.product_id) !== id
      )
    );
  },

  clear() {
    return this.save([]);
  },

  count() {
    return this.get().reduce(
      (sum, item) =>
        sum + Number(item.quantity || 0),
      0
    );
  },

  subtotal() {
    return this.get().reduce(
      (sum, item) =>
        sum +
        Number(item.price_kes || 0) *
        Number(item.quantity || 0),
      0
    );
  },

  updateBadge() {
    const count = this.count();

    document.querySelectorAll('.cart-count').forEach(el => {
      el.textContent = count;

      el.style.display = count
        ? 'inline-flex'
        : 'none';
    });
  }
};

window.Cart = Cart;

function formatKes(amount) {
  return 'KES ' + Number(amount).toLocaleString(
    'en-KE',
    {
      maximumFractionDigits: 0
    }
  );
}

function escapeHtml(value) {
  if (value == null) return '';

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

window.formatKes = formatKes;
window.escapeHtml = escapeHtml;

function initializeMawegoCart() {
  Cart.updateBadge();
}

if (document.readyState === 'loading') {
  document.addEventListener(
    'DOMContentLoaded',
    initializeMawegoCart
  );
} else {
  initializeMawegoCart();
}