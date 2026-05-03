import {
  PrismaClient,
  PurchaseOrderStatus,
  SalesOrderStatus,
  StockMovementType,
  UserRole,
} from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

const now = new Date();
const adminSeedPassword = process.env.ADMIN_SEED_PASSWORD ?? "ChangeMe123!";
const adminPasswordHash = hashSync(adminSeedPassword, 12);
const brands = ["Northstar", "Apex", "Cedar", "Orbit", "Summit", "BluePeak"];
const dayMs = 24 * 60 * 60 * 1000;

const money = (value: number) => value.toFixed(2);
const qty = (value: number) => value.toFixed(3);

const categories = [
  { code: "ELEC", name: "Electronics", items: ["Bluetooth Speaker", "Wireless Keyboard", "USB-C Dock", "Smart Plug", "Webcam HD"] },
  { code: "OFFC", name: "Office", items: ["Ergonomic Chair", "Standing Desk", "Desk Lamp", "File Cabinet", "Whiteboard"] },
  { code: "HOME", name: "Home", items: ["Air Purifier", "Water Filter", "Storage Bin", "Vacuum Cleaner", "Floor Fan"] },
  { code: "APRL", name: "Apparel", items: ["Safety Jacket", "Work Gloves", "Polo Shirt", "Hoodie", "Baseball Cap"] },
  { code: "TOOL", name: "Tools", items: ["Cordless Drill", "Laser Measure", "Socket Set", "Utility Knife", "Step Ladder"] },
  { code: "FOOD", name: "Food", items: ["Ground Coffee", "Green Tea", "Trail Mix", "Protein Bars", "Bottled Water"] },
] as const;

const warehouseSeeds = [
  { code: "WH-NYC", name: "New York Fulfillment", location: "Brooklyn, NY" },
  { code: "WH-DAL", name: "Dallas Distribution", location: "Dallas, TX" },
  { code: "WH-SFO", name: "San Francisco Hub", location: "San Francisco, CA" },
] as const;

const supplierSeeds = [
  { code: "SUP-001", name: "Nova Trade Co", email: "sales@novatrade.example", phone: "+1-212-555-0101" },
  { code: "SUP-002", name: "Harbor Source Ltd", email: "ops@harborsource.example", phone: "+1-469-555-0102" },
  { code: "SUP-003", name: "BluePeak Supply", email: "contact@bluepeak.example", phone: "+1-415-555-0103" },
  { code: "SUP-004", name: "Summit Wholesale", email: "support@summitwholesale.example", phone: "+1-720-555-0104" },
  { code: "SUP-005", name: "Atlas Industrial", email: "hello@atlasindustrial.example", phone: "+1-303-555-0105" },
  { code: "SUP-006", name: "Prime Goods Network", email: "orders@primegoods.example", phone: "+1-646-555-0106" },
  { code: "SUP-007", name: "Eastline Merchants", email: "sales@eastline.example", phone: "+1-617-555-0107" },
  { code: "SUP-008", name: "Cedar Bridge Imports", email: "team@cedarbridge.example", phone: "+1-206-555-0108" },
] as const;

const purchaseOrderSeeds = [
  {
    orderNumber: "PO-2026-0001",
    supplierCode: "SUP-001",
    warehouseCode: "WH-NYC",
    status: PurchaseOrderStatus.RECEIVED,
    expectedDaysOffset: 5,
    lines: [
      { sku: "ELEC-0001", quantityOrdered: 80, quantityReceived: 80 },
      { sku: "ELEC-0003", quantityOrdered: 60, quantityReceived: 60 },
      { sku: "TOOL-0023", quantityOrdered: 30, quantityReceived: 30 },
    ],
  },
  {
    orderNumber: "PO-2026-0002",
    supplierCode: "SUP-003",
    warehouseCode: "WH-DAL",
    status: PurchaseOrderStatus.PARTIALLY_RECEIVED,
    expectedDaysOffset: 7,
    lines: [
      { sku: "OFFC-0007", quantityOrdered: 25, quantityReceived: 20 },
      { sku: "HOME-0013", quantityOrdered: 50, quantityReceived: 40 },
      { sku: "APRL-0016", quantityOrdered: 120, quantityReceived: 90 },
    ],
  },
  {
    orderNumber: "PO-2026-0003",
    supplierCode: "SUP-006",
    warehouseCode: "WH-SFO",
    status: PurchaseOrderStatus.APPROVED,
    expectedDaysOffset: 10,
    lines: [
      { sku: "FOOD-0028", quantityOrdered: 200, quantityReceived: 0 },
      { sku: "FOOD-0030", quantityOrdered: 180, quantityReceived: 0 },
      { sku: "HOME-0014", quantityOrdered: 40, quantityReceived: 0 },
    ],
  },
] as const;

type SalesOrderSeed = {
  orderNumber: string;
  warehouseCode: string;
  customerName: string;
  status: SalesOrderStatus;
  orderDate?: Date;
  lines: Array<{ sku: string; quantity: number }>;
};

const salesOrderSeeds: SalesOrderSeed[] = [
  {
    orderNumber: "SO-2026-0001",
    warehouseCode: "WH-NYC",
    customerName: "Bright Retail LLC",
    status: SalesOrderStatus.FULFILLED,
    lines: [
      { sku: "ELEC-0002", quantity: 8 },
      { sku: "OFFC-0008", quantity: 5 },
      { sku: "APRL-0018", quantity: 12 },
    ],
  },
  {
    orderNumber: "SO-2026-0002",
    warehouseCode: "WH-DAL",
    customerName: "Peak Field Services",
    status: SalesOrderStatus.CONFIRMED,
    lines: [
      { sku: "TOOL-0021", quantity: 4 },
      { sku: "TOOL-0024", quantity: 14 },
      { sku: "HOME-0011", quantity: 6 },
    ],
  },
  {
    orderNumber: "SO-2026-0003",
    warehouseCode: "WH-SFO",
    customerName: "Cedar Grocers",
    status: SalesOrderStatus.DRAFT,
    lines: [
      { sku: "FOOD-0026", quantity: 30 },
      { sku: "FOOD-0029", quantity: 24 },
      { sku: "ELEC-0004", quantity: 10 },
    ],
  },
] as const;

const demoCustomerSeeds = [
  "Bright Retail LLC",
  "Peak Field Services",
  "Cedar Grocers",
  "Atlas Market Co",
  "Harbor Home Goods",
  "Summit Industrial",
  "Nova Hospitality",
  "BluePeak Outfitters",
  "Eastline Logistics",
  "Orbit Tech Supply",
  "Crown Valley Stores",
  "Urban Pantry",
  "Northstar Medical",
  "Lakeside Office",
  "Redwood Sports",
] as const;

function buildMonthlySalesSeeds(params: {
  now: Date;
  warehouseSeeds: typeof warehouseSeeds;
  productSeeds: ReturnType<typeof buildProductSeeds>;
}): SalesOrderSeed[] {
  const months = 12;
  const ordersPerMonth = 2;
  const seeds: SalesOrderSeed[] = [];

  for (let monthOffset = months - 1; monthOffset >= 0; monthOffset -= 1) {
    const monthDate = new Date(params.now.getFullYear(), params.now.getMonth() - monthOffset, 1);

    for (let orderIndex = 0; orderIndex < ordersPerMonth; orderIndex += 1) {
      const orderDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), 5 + orderIndex * 10);
      const year = orderDate.getFullYear();
      const month = String(orderDate.getMonth() + 1).padStart(2, "0");
      const sequence = String(orderIndex + 1).padStart(2, "0");
      const status = monthOffset <= 1 ? SalesOrderStatus.CONFIRMED : SalesOrderStatus.FULFILLED;
      const warehouse = params.warehouseSeeds[(monthOffset + orderIndex) % params.warehouseSeeds.length];
      const customerName =
        demoCustomerSeeds[(monthOffset * ordersPerMonth + orderIndex) % demoCustomerSeeds.length];

      const lineCount = 2 + ((monthOffset + orderIndex) % 3);
      const lines = Array.from({ length: lineCount }, (_value, lineIndex) => {
        const product =
          params.productSeeds[(monthOffset * 3 + orderIndex * 2 + lineIndex) % params.productSeeds.length];
        const quantity = 2 + ((monthOffset + lineIndex) % 6);

        return {
          sku: product.sku,
          quantity,
        };
      });

      seeds.push({
        orderNumber: `SO-${year}-${month}-${sequence}`,
        warehouseCode: warehouse.code,
        customerName,
        status,
        orderDate,
        lines,
      });
    }
  }

  return seeds;
}

function buildProductSeeds() {
  let index = 1;

  return categories.flatMap((category) => {
    return category.items.map((itemName, categoryIndex) => {
      const sku = `${category.code}-${String(index).padStart(4, "0")}`;
      const unitPriceValue = 12 + index * 3.45 + categoryIndex * 1.1;
      const costPriceValue = unitPriceValue * 0.62;

      index += 1;

      return {
        sku,
        category: category.name,
        brand: brands[(index + categoryIndex) % brands.length],
        name: itemName,
        description: `${category.name} / ${itemName}`,
        unitPrice: money(unitPriceValue),
        costPrice: money(costPriceValue),
      };
    });
  });
}

async function main() {
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {
      fullName: "Initial Admin",
      role: UserRole.ADMIN,
      isActive: true,
      passwordHash: adminPasswordHash,
      passwordChangedAt: now,
      refreshTokenVersion: 0,
      deletedAt: null,
    },
    create: {
      email: "admin@example.com",
      passwordHash: adminPasswordHash,
      fullName: "Initial Admin",
      role: UserRole.ADMIN,
      passwordChangedAt: now,
      refreshTokenVersion: 0,
    },
  });

  const warehouses = await Promise.all(
    warehouseSeeds.map((warehouse) =>
      prisma.warehouse.upsert({
        where: { code: warehouse.code },
        update: {
          name: warehouse.name,
          location: warehouse.location,
          deletedAt: null,
        },
        create: warehouse,
      }),
    ),
  );

  const suppliers = await Promise.all(
    supplierSeeds.map((supplier) =>
      prisma.supplier.upsert({
        where: { code: supplier.code },
        update: {
          name: supplier.name,
          email: supplier.email,
          phone: supplier.phone,
          deletedAt: null,
        },
        create: supplier,
      }),
    ),
  );

  const supplierByCode = new Map(suppliers.map((supplier) => [supplier.code, supplier]));

  const productSeeds = buildProductSeeds();

  const products = await Promise.all(
    productSeeds.map((product) =>
      prisma.product.upsert({
        where: { sku: product.sku },
        update: {
          name: product.name,
          category: product.category,
          brand: product.brand,
          description: product.description,
          unitPrice: product.unitPrice,
          costPrice: product.costPrice,
          deletedAt: null,
        },
        create: {
          sku: product.sku,
          name: product.name,
          category: product.category,
          brand: product.brand,
          description: product.description,
          unitPrice: product.unitPrice,
          costPrice: product.costPrice,
        },
      }),
    ),
  );

  const productBySku = new Map(products.map((product) => [product.sku, product]));

  const supplierMappings = new Map<string, { primary: string; secondary: string }>();

  for (let productIndex = 0; productIndex < products.length; productIndex += 1) {
    const product = products[productIndex];
    const primarySupplier = suppliers[productIndex % suppliers.length];
    const secondarySupplier = suppliers[(productIndex + 3) % suppliers.length];

    supplierMappings.set(product.id, {
      primary: primarySupplier.id,
      secondary: secondarySupplier.id,
    });

    const mappingSuppliers = [primarySupplier, secondarySupplier];

    for (const [mappingIndex, supplier] of mappingSuppliers.entries()) {
      const supplierSku = `${supplier.code}-${product.sku}`;
      const supplierUnitCost = Number(product.costPrice ?? 0) * (1 + mappingIndex * 0.04);
      const minimumOrderQty = 5 + ((productIndex + mappingIndex) % 6) * 5;
      const leadTimeDays = 4 + ((productIndex + mappingIndex) % 10);

      await prisma.supplierProduct.upsert({
        where: {
          supplierId_productId: {
            supplierId: supplier.id,
            productId: product.id,
          },
        },
        update: {
          supplierSku,
          supplierUnitCost: money(supplierUnitCost),
          leadTimeDays,
          minimumOrderQty: qty(minimumOrderQty),
        },
        create: {
          supplierId: supplier.id,
          productId: product.id,
          supplierSku,
          supplierUnitCost: money(supplierUnitCost),
          leadTimeDays,
          minimumOrderQty: qty(minimumOrderQty),
        },
      });
    }
  }

  for (let warehouseIndex = 0; warehouseIndex < warehouses.length; warehouseIndex += 1) {
    const warehouse = warehouses[warehouseIndex];

    for (let productIndex = 0; productIndex < products.length; productIndex += 1) {
      const product = products[productIndex];
      const onHand = 25 + ((productIndex * 7 + warehouseIndex * 9) % 140);
      const reserved = (productIndex + warehouseIndex) % 8;
      const available = Math.max(onHand - reserved, 0);

      await prisma.inventoryLevel.upsert({
        where: {
          productId_warehouseId: {
            productId: product.id,
            warehouseId: warehouse.id,
          },
        },
        update: {
          quantityOnHand: qty(onHand),
          quantityReserved: qty(reserved),
          quantityAvailable: qty(available),
        },
        create: {
          productId: product.id,
          warehouseId: warehouse.id,
          quantityOnHand: qty(onHand),
          quantityReserved: qty(reserved),
          quantityAvailable: qty(available),
        },
      });

      const supplierMapping = supplierMappings.get(product.id);
      const minLevel = 8 + ((productIndex + warehouseIndex) % 9) * 4;
      const reorderQty = 16 + ((productIndex * 2 + warehouseIndex) % 10) * 6;
      const targetLevel = minLevel + reorderQty * 2;

      await prisma.reorderRule.upsert({
        where: {
          productId_warehouseId: {
            productId: product.id,
            warehouseId: warehouse.id,
          },
        },
        update: {
          supplierId: supplierMapping?.primary ?? null,
          minLevel: qty(minLevel),
          reorderQty: qty(reorderQty),
          targetLevel: qty(targetLevel),
          isActive: true,
          deletedAt: null,
        },
        create: {
          productId: product.id,
          warehouseId: warehouse.id,
          supplierId: supplierMapping?.primary ?? null,
          minLevel: qty(minLevel),
          reorderQty: qty(reorderQty),
          targetLevel: qty(targetLevel),
          isActive: true,
        },
      });
    }
  }

  for (let orderIndex = 0; orderIndex < purchaseOrderSeeds.length; orderIndex += 1) {
    const orderSeed = purchaseOrderSeeds[orderIndex];
    const supplier = supplierByCode.get(orderSeed.supplierCode);
    const warehouse = warehouses.find((entry) => entry.code === orderSeed.warehouseCode);

    if (!supplier || !warehouse) {
      throw new Error(`Missing supplier or warehouse for ${orderSeed.orderNumber}`);
    }

    const lineInputs = orderSeed.lines.map((line) => {
      const product = productBySku.get(line.sku);

      if (!product) {
        throw new Error(`Missing product for SKU ${line.sku}`);
      }

      const unitCost = Number(product.costPrice ?? 0);
      const lineTotal = unitCost * line.quantityOrdered;

      return {
        product,
        quantityOrdered: line.quantityOrdered,
        quantityReceived: line.quantityReceived,
        unitCost,
        lineTotal,
      };
    });

    const subtotal = lineInputs.reduce((sum, line) => sum + line.lineTotal, 0);
    const taxAmount = subtotal * 0.08;
    const totalAmount = subtotal + taxAmount;

    const purchaseOrder = await prisma.purchaseOrder.upsert({
      where: { orderNumber: orderSeed.orderNumber },
      update: {
        supplierId: supplier.id,
        warehouseId: warehouse.id,
        status: orderSeed.status,
        orderDate: new Date(now.getTime() - (20 - orderIndex * 4) * 24 * 60 * 60 * 1000),
        expectedAt: new Date(now.getTime() + orderSeed.expectedDaysOffset * 24 * 60 * 60 * 1000),
        receivedAt:
          orderSeed.status === PurchaseOrderStatus.RECEIVED ||
          orderSeed.status === PurchaseOrderStatus.PARTIALLY_RECEIVED
            ? new Date(now.getTime() - (2 - orderIndex) * 24 * 60 * 60 * 1000)
            : null,
        subtotal: money(subtotal),
        taxAmount: money(taxAmount),
        totalAmount: money(totalAmount),
        createdById: adminUser.id,
        deletedAt: null,
      },
      create: {
        orderNumber: orderSeed.orderNumber,
        supplierId: supplier.id,
        warehouseId: warehouse.id,
        status: orderSeed.status,
        orderDate: new Date(now.getTime() - (20 - orderIndex * 4) * 24 * 60 * 60 * 1000),
        expectedAt: new Date(now.getTime() + orderSeed.expectedDaysOffset * 24 * 60 * 60 * 1000),
        receivedAt:
          orderSeed.status === PurchaseOrderStatus.RECEIVED ||
          orderSeed.status === PurchaseOrderStatus.PARTIALLY_RECEIVED
            ? new Date(now.getTime() - (2 - orderIndex) * 24 * 60 * 60 * 1000)
            : null,
        subtotal: money(subtotal),
        taxAmount: money(taxAmount),
        totalAmount: money(totalAmount),
        createdById: adminUser.id,
      },
    });

    for (const line of lineInputs) {
      await prisma.purchaseOrderItem.upsert({
        where: {
          purchaseOrderId_productId: {
            purchaseOrderId: purchaseOrder.id,
            productId: line.product.id,
          },
        },
        update: {
          quantityOrdered: qty(line.quantityOrdered),
          quantityReceived: qty(line.quantityReceived),
          unitCost: money(line.unitCost),
          lineTotal: money(line.lineTotal),
        },
        create: {
          purchaseOrderId: purchaseOrder.id,
          productId: line.product.id,
          quantityOrdered: qty(line.quantityOrdered),
          quantityReceived: qty(line.quantityReceived),
          unitCost: money(line.unitCost),
          lineTotal: money(line.lineTotal),
        },
      });

      const movementId = `sm-po-${orderSeed.orderNumber}-${line.product.sku}`.toLowerCase();

      await prisma.stockMovement.upsert({
        where: { id: movementId },
        update: {
          productId: line.product.id,
          warehouseId: warehouse.id,
          movementType: StockMovementType.IN,
          quantity: qty(line.quantityReceived),
          unitCost: money(line.unitCost),
          referenceDocument: orderSeed.orderNumber,
          note: "Seeded receiving movement",
          createdById: adminUser.id,
        },
        create: {
          id: movementId,
          productId: line.product.id,
          warehouseId: warehouse.id,
          movementType: StockMovementType.IN,
          quantity: qty(line.quantityReceived),
          unitCost: money(line.unitCost),
          referenceDocument: orderSeed.orderNumber,
          note: "Seeded receiving movement",
          createdById: adminUser.id,
        },
      });
    }
  }

  const monthlySalesSeeds = buildMonthlySalesSeeds({
    now,
    warehouseSeeds,
    productSeeds,
  });

  const allSalesOrders = [...salesOrderSeeds, ...monthlySalesSeeds];

  for (let orderIndex = 0; orderIndex < allSalesOrders.length; orderIndex += 1) {
    const orderSeed = allSalesOrders[orderIndex];
    const warehouse = warehouses.find((entry) => entry.code === orderSeed.warehouseCode);

    if (!warehouse) {
      throw new Error(`Missing warehouse for ${orderSeed.orderNumber}`);
    }

    const lineInputs = orderSeed.lines.map((line) => {
      const product = productBySku.get(line.sku);

      if (!product) {
        throw new Error(`Missing product for SKU ${line.sku}`);
      }

      const unitPrice = Number(product.unitPrice);
      const lineTotal = unitPrice * line.quantity;

      return {
        product,
        quantity: line.quantity,
        unitPrice,
        lineTotal,
      };
    });

    const subtotal = lineInputs.reduce((sum, line) => sum + line.lineTotal, 0);
    const taxAmount = subtotal * 0.08;
    const totalAmount = subtotal + taxAmount;

    const orderDate =
      orderSeed.orderDate ?? new Date(now.getTime() - (8 - orderIndex * 2) * dayMs);

    const salesOrder = await prisma.salesOrder.upsert({
      where: { orderNumber: orderSeed.orderNumber },
      update: {
        warehouseId: warehouse.id,
        status: orderSeed.status,
        customerName: orderSeed.customerName,
        orderDate,
        fulfilledAt:
          orderSeed.status === SalesOrderStatus.FULFILLED
            ? new Date(orderDate.getTime() + dayMs)
            : null,
        subtotal: money(subtotal),
        taxAmount: money(taxAmount),
        totalAmount: money(totalAmount),
        createdById: adminUser.id,
        deletedAt: null,
      },
      create: {
        orderNumber: orderSeed.orderNumber,
        warehouseId: warehouse.id,
        status: orderSeed.status,
        customerName: orderSeed.customerName,
        orderDate,
        fulfilledAt:
          orderSeed.status === SalesOrderStatus.FULFILLED
            ? new Date(orderDate.getTime() + dayMs)
            : null,
        subtotal: money(subtotal),
        taxAmount: money(taxAmount),
        totalAmount: money(totalAmount),
        createdById: adminUser.id,
      },
    });

    for (const line of lineInputs) {
      await prisma.salesOrderItem.upsert({
        where: {
          salesOrderId_productId: {
            salesOrderId: salesOrder.id,
            productId: line.product.id,
          },
        },
        update: {
          quantity: qty(line.quantity),
          unitPrice: money(line.unitPrice),
          lineTotal: money(line.lineTotal),
        },
        create: {
          salesOrderId: salesOrder.id,
          productId: line.product.id,
          quantity: qty(line.quantity),
          unitPrice: money(line.unitPrice),
          lineTotal: money(line.lineTotal),
        },
      });

      const movementId = `sm-so-${orderSeed.orderNumber}-${line.product.sku}`.toLowerCase();

      await prisma.stockMovement.upsert({
        where: { id: movementId },
        update: {
          productId: line.product.id,
          warehouseId: warehouse.id,
          movementType: StockMovementType.OUT,
          quantity: qty(line.quantity),
          unitCost: money(Number(line.product.costPrice ?? 0)),
          referenceDocument: orderSeed.orderNumber,
          note: "Seeded fulfillment movement",
          createdById: adminUser.id,
        },
        create: {
          id: movementId,
          productId: line.product.id,
          warehouseId: warehouse.id,
          movementType: StockMovementType.OUT,
          quantity: qty(line.quantity),
          unitCost: money(Number(line.product.costPrice ?? 0)),
          referenceDocument: orderSeed.orderNumber,
          note: "Seeded fulfillment movement",
          createdById: adminUser.id,
        },
      });
    }
  }

  // Seed a handful of low-stock, high-outflow scenarios for Demand Insights.
  const riskWarehouse = warehouses[0];
  const riskProducts = products.slice(0, 6);

  for (const [index, product] of riskProducts.entries()) {
    const available = 2 + (index % 3);
    const onHand = available + 3;
    const reserved = 1;
    const minLevel = 8 + index * 3;
    const reorderQty = 18 + index * 2;
    const targetLevel = minLevel + reorderQty * 2;

    await prisma.inventoryLevel.update({
      where: {
        productId_warehouseId: {
          productId: product.id,
          warehouseId: riskWarehouse.id,
        },
      },
      data: {
        quantityOnHand: qty(onHand),
        quantityAvailable: qty(available),
        quantityReserved: qty(reserved),
      },
    });

    await prisma.reorderRule.update({
      where: {
        productId_warehouseId: {
          productId: product.id,
          warehouseId: riskWarehouse.id,
        },
      },
      data: {
        minLevel: qty(minLevel),
        reorderQty: qty(reorderQty),
        targetLevel: qty(targetLevel),
        isActive: true,
        deletedAt: null,
      },
    });

    const movementId = `sm-risk-${riskWarehouse.code}-${product.sku}`.toLowerCase();

    await prisma.stockMovement.upsert({
      where: { id: movementId },
      update: {
        productId: product.id,
        warehouseId: riskWarehouse.id,
        movementType: StockMovementType.OUT,
        quantity: qty(30 + index * 5),
        unitCost: money(Number(product.costPrice ?? 0)),
        referenceDocument: "DEMO-RISK",
        note: "Seeded demand spike for risk signals",
        createdById: adminUser.id,
        createdAt: new Date(now.getTime() - (7 + index) * dayMs),
      },
      create: {
        id: movementId,
        productId: product.id,
        warehouseId: riskWarehouse.id,
        movementType: StockMovementType.OUT,
        quantity: qty(30 + index * 5),
        unitCost: money(Number(product.costPrice ?? 0)),
        referenceDocument: "DEMO-RISK",
        note: "Seeded demand spike for risk signals",
        createdById: adminUser.id,
        createdAt: new Date(now.getTime() - (7 + index) * dayMs),
      },
    });
  }

  // Add deterministic adjustments as stock history snapshots.
  for (let warehouseIndex = 0; warehouseIndex < warehouses.length; warehouseIndex += 1) {
    const warehouse = warehouses[warehouseIndex];
    const sampleProducts = products.slice(warehouseIndex * 3, warehouseIndex * 3 + 3);

    for (let productIndex = 0; productIndex < sampleProducts.length; productIndex += 1) {
      const product = sampleProducts[productIndex];
      const adjustmentQty = 1 + ((warehouseIndex + productIndex) % 3);
      const movementId = `sm-adj-${warehouse.code}-${product.sku}`.toLowerCase();

      await prisma.stockMovement.upsert({
        where: { id: movementId },
        update: {
          productId: product.id,
          warehouseId: warehouse.id,
          movementType: StockMovementType.ADJUSTMENT,
          quantity: qty(adjustmentQty),
          unitCost: money(Number(product.costPrice ?? 0)),
          referenceDocument: "CYCLE-COUNT-2026",
          note: "Seeded cycle count adjustment",
          createdById: adminUser.id,
        },
        create: {
          id: movementId,
          productId: product.id,
          warehouseId: warehouse.id,
          movementType: StockMovementType.ADJUSTMENT,
          quantity: qty(adjustmentQty),
          unitCost: money(Number(product.costPrice ?? 0)),
          referenceDocument: "CYCLE-COUNT-2026",
          note: "Seeded cycle count adjustment",
          createdById: adminUser.id,
        },
      });
    }
  }

  const summary = {
    users: await prisma.user.count(),
    warehouses: await prisma.warehouse.count(),
    products: await prisma.product.count(),
    inventoryLevels: await prisma.inventoryLevel.count(),
    suppliers: await prisma.supplier.count(),
    supplierProducts: await prisma.supplierProduct.count(),
    reorderRules: await prisma.reorderRule.count(),
    purchaseOrders: await prisma.purchaseOrder.count(),
    purchaseOrderItems: await prisma.purchaseOrderItem.count(),
    salesOrders: await prisma.salesOrder.count(),
    salesOrderItems: await prisma.salesOrderItem.count(),
    stockMovements: await prisma.stockMovement.count(),
  };

  console.log("Seed summary", JSON.stringify(summary, null, 2));
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
