import test from 'node:test';
import assert from 'node:assert';
import { EcommerceClient } from '../dist/ecommerce/client.js';

test('EcommerceClient retrieves orders, products, and sales telemetry', async () => {
  const client = new EcommerceClient({
    platform: 'woocommerce',
    storeUrl: 'https://demo.store.nservers.io',
    portHttp: 3000,
    hostHttp: '0.0.0.0',
    timeoutMs: 5000,
  });

  const orders = await client.listOrders();
  assert.ok(Array.isArray(orders));
  assert.ok(orders.length >= 2);
  assert.ok(orders[0].total > 0);

  const order = await client.getOrder(1042);
  assert.strictEqual(order.id, 1042);
  assert.ok(Array.isArray(order.items));

  const products = await client.listProducts();
  assert.ok(Array.isArray(products));
  assert.ok(products[0].price > 0);

  const summary = await client.getSalesSummary();
  assert.strictEqual(summary.platform, 'woocommerce');
  assert.ok(summary.totalRevenue > 0);
});
