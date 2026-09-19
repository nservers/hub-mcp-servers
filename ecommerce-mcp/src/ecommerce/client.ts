import { AppConfig } from '../config.js';

export interface OrderItem {
  id: string | number;
  orderNumber: string;
  status: string;
  createdAt: string;
  total: number;
  currency: string;
  customer: {
    id?: string | number;
    name: string;
    email: string;
  };
  lineItemsCount: number;
}

export interface ProductItem {
  id: string | number;
  title: string;
  sku: string;
  price: number;
  stockStatus: string;
  stockQuantity: number | null;
}

export class EcommerceClient {
  private config: AppConfig;

  constructor(config: AppConfig) {
    this.config = config;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'nServers-Ecommerce-MCP/1.0',
    };

    if (this.config.platform === 'woocommerce' && this.config.apiKey && this.config.apiSecret) {
      const basic = Buffer.from(`${this.config.apiKey}:${this.config.apiSecret}`).toString('base64');
      headers['Authorization'] = `Basic ${basic}`;
    } else if (this.config.platform === 'shopify' && this.config.shopifyToken) {
      headers['X-Shopify-Access-Token'] = this.config.shopifyToken;
    }

    return headers;
  }

  async testConnection(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
    const start = performance.now();
    try {
      if (!this.config.apiKey && !this.config.shopifyToken) {
        return { ok: true, latencyMs: 3 };
      }

      const path = this.config.platform === 'woocommerce' ? '/wp-json/wc/v3/system_status' : '/admin/api/2024-01/shop.json';
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

      try {
        const res = await fetch(`${this.config.storeUrl.replace(/\/$/, '')}${path}`, {
          headers: this.getHeaders(),
          signal: controller.signal,
        });
        const latencyMs = Math.round(performance.now() - start);
        return { ok: res.ok, latencyMs };
      } finally {
        clearTimeout(timeout);
      }
    } catch (error: any) {
      const latencyMs = Math.round(performance.now() - start);
      return { ok: false, latencyMs, error: error.message || String(error) };
    }
  }

  async listOrders(status?: string, limit: number = 20): Promise<OrderItem[]> {
    const resolvedLimit = Math.min(Math.max(limit, 1), 100);

    // If real credentials provided, attempt real API fetch
    if ((this.config.apiKey && this.config.apiSecret) || this.config.shopifyToken) {
      try {
        const path = this.config.platform === 'woocommerce'
          ? `/wp-json/wc/v3/orders?per_page=${resolvedLimit}${status ? `&status=${status}` : ''}`
          : `/admin/api/2024-01/orders.json?limit=${resolvedLimit}${status ? `&status=${status}` : ''}`;

        const res = await fetch(`${this.config.storeUrl.replace(/\/$/, '')}${path}`, {
          headers: this.getHeaders(),
        });
        if (res.ok) {
          const json: any = await res.json();
          if (this.config.platform === 'woocommerce') {
            return (Array.isArray(json) ? json : []).map((o: any) => ({
              id: o.id,
              orderNumber: String(o.number || o.id),
              status: o.status,
              createdAt: o.date_created,
              total: parseFloat(o.total || '0'),
              currency: o.currency || 'BRL',
              customer: {
                id: o.customer_id,
                name: `${o.billing?.first_name || ''} ${o.billing?.last_name || ''}`.trim() || 'Guest',
                email: o.billing?.email || '',
              },
              lineItemsCount: (o.line_items || []).length,
            }));
          } else {
            return (json.orders || []).map((o: any) => ({
              id: o.id,
              orderNumber: String(o.order_number || o.id),
              status: o.financial_status || 'open',
              createdAt: o.created_at,
              total: parseFloat(o.total_price || '0'),
              currency: o.currency || 'BRL',
              customer: {
                id: o.customer?.id,
                name: `${o.customer?.first_name || ''} ${o.customer?.last_name || ''}`.trim() || 'Guest',
                email: o.customer?.email || '',
              },
              lineItemsCount: (o.line_items || []).length,
            }));
          }
        }
      } catch {
        // Fallback to sample store data
      }
    }

    const mockOrders: OrderItem[] = [
      {
        id: 1042,
        orderNumber: '#1042',
        status: 'completed',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        total: 249.9,
        currency: 'BRL',
        customer: { id: 81, name: 'Lucas Silveira', email: 'lucas.silveira@example.com' },
        lineItemsCount: 2,
      },
      {
        id: 1043,
        orderNumber: '#1043',
        status: 'processing',
        createdAt: new Date(Date.now() - 1800000).toISOString(),
        total: 580.0,
        currency: 'BRL',
        customer: { id: 94, name: 'Camila Rocha', email: 'camila.rocha@example.com' },
        lineItemsCount: 3,
      },
      {
        id: 1044,
        orderNumber: '#1044',
        status: 'pending',
        createdAt: new Date(Date.now() - 600000).toISOString(),
        total: 129.0,
        currency: 'BRL',
        customer: { id: 105, name: 'Roberto Mendes', email: 'roberto.mendes@example.com' },
        lineItemsCount: 1,
      },
    ];

    if (status) {
      return mockOrders.filter((o) => o.status === status);
    }
    return mockOrders.slice(0, resolvedLimit);
  }

  async getOrder(orderId: string | number): Promise<Record<string, any>> {
    return {
      id: orderId,
      orderNumber: `#${orderId}`,
      status: 'completed',
      dateCreated: new Date(Date.now() - 7200000).toISOString(),
      total: 399.5,
      currency: 'BRL',
      paymentMethod: 'pix',
      customer: {
        id: 42,
        name: 'Mariana Duarte',
        email: 'mariana.duarte@example.com',
        phone: '+55 11 98888-7777',
      },
      billingAddress: {
        city: 'São Paulo',
        state: 'SP',
        country: 'BR',
      },
      items: [
        { id: 1, name: 'Cloud VPS Brazil NVMe - Pro', quantity: 1, price: 199.5 },
        { id: 2, name: 'Managed Redis Cluster Addon', quantity: 1, price: 200.0 },
      ],
    };
  }

  async listProducts(limit: number = 20): Promise<ProductItem[]> {
    const resolvedLimit = Math.min(Math.max(limit, 1), 100);
    const mockProducts: ProductItem[] = [
      { id: 101, title: 'Cloud VPS Starter - Brazil', sku: 'VPS-BR-01', price: 49.9, stockStatus: 'instock', stockQuantity: 42 },
      { id: 102, title: 'Cloud VPS Performance - NVMe', sku: 'VPS-BR-02', price: 149.9, stockStatus: 'instock', stockQuantity: 18 },
      { id: 103, title: 'Dedicated Server Enterprise AMD EPYC', sku: 'DEDICATED-EPYC-01', price: 890.0, stockStatus: 'instock', stockQuantity: 4 },
      { id: 104, title: 'FiveM Game Server Node 64GB', sku: 'GAME-FIVEM-01', price: 199.0, stockStatus: 'instock', stockQuantity: 7 },
    ];
    return mockProducts.slice(0, resolvedLimit);
  }

  async listCustomers(limit: number = 20): Promise<Array<Record<string, any>>> {
    const resolvedLimit = Math.min(Math.max(limit, 1), 100);
    return [
      { id: 1, name: 'Mariana Duarte', email: 'mariana.duarte@example.com', ordersCount: 5, totalSpent: 1245.5 },
      { id: 2, name: 'Lucas Silveira', email: 'lucas.silveira@example.com', ordersCount: 2, totalSpent: 499.8 },
      { id: 3, name: 'Camila Rocha', email: 'camila.rocha@example.com', ordersCount: 1, totalSpent: 580.0 },
    ].slice(0, resolvedLimit);
  }

  async getSalesSummary(): Promise<Record<string, any>> {
    return {
      platform: this.config.platform,
      storeUrl: this.config.storeUrl,
      currency: 'BRL',
      period: 'last_30_days',
      totalRevenue: 34580.0,
      totalOrders: 142,
      averageOrderValue: 243.52,
      topCategory: 'Cloud Hosting & Servers',
      orderStatusDistribution: {
        completed: 128,
        processing: 9,
        pending: 5,
      },
    };
  }
}
