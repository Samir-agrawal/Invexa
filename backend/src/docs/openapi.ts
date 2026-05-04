export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "InveXa API",
    version: "1.0.0",
    description: "Inventory, suppliers, purchase/sales orders, analytics, and auth API.",
  },
  servers: [{ url: "/api", description: "API base" }],
  tags: [
    { name: "Health" },
    { name: "Auth" },
    { name: "Products" },
    { name: "Inventory" },
    { name: "Suppliers" },
    { name: "Purchase Orders" },
    { name: "Sales Orders" },
    { name: "Analytics" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    responses: {
      Unauthorized: {
        description: "Unauthorized",
      },
      ValidationFailed: {
        description: "Validation failed",
      },
    },
  },
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        responses: {
          200: { description: "Healthy" },
        },
      },
    },
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register account",
        responses: {
          201: { description: "Registered" },
          409: { description: "Already exists" },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login",
        responses: {
          200: { description: "Authenticated" },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/auth/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Refresh access token",
        responses: {
          200: { description: "Tokens refreshed" },
        },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Logout and invalidate refresh version",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Logged out" },
        },
      },
    },
    "/auth/forgot-password": {
      post: {
        tags: ["Auth"],
        summary: "Request password reset link",
        responses: {
          200: { description: "Reset request accepted" },
        },
      },
    },
    "/auth/reset-password": {
      post: {
        tags: ["Auth"],
        summary: "Reset password with token",
        responses: {
          200: { description: "Password reset complete" },
          400: { description: "Invalid or expired token" },
        },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Current user",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "User profile" },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/products": {
      get: {
        tags: ["Products"],
        summary: "List products",
        responses: {
          200: { description: "Product list" },
        },
      },
      post: {
        tags: ["Products"],
        summary: "Create product",
        security: [{ bearerAuth: [] }],
        responses: {
          201: { description: "Created" },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/products/{id}": {
      get: {
        tags: ["Products"],
        summary: "Get product by id",
        responses: {
          200: { description: "Product" },
          404: { description: "Not found" },
        },
      },
      put: {
        tags: ["Products"],
        summary: "Update product",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Updated" },
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { description: "Not found" },
        },
      },
      delete: {
        tags: ["Products"],
        summary: "Soft delete product",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Deleted" },
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/inventory/levels": {
      get: {
        tags: ["Inventory"],
        summary: "List inventory levels",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Inventory levels" },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/inventory/adjust": {
      post: {
        tags: ["Inventory"],
        summary: "Adjust inventory in/out",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Adjusted" },
          409: { description: "Insufficient stock" },
        },
      },
    },
    "/inventory/transfer": {
      post: {
        tags: ["Inventory"],
        summary: "Transfer inventory across warehouses",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Transferred" },
          409: { description: "Insufficient stock" },
        },
      },
    },
    "/inventory/movements": {
      get: {
        tags: ["Inventory"],
        summary: "List stock movements",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Movement list" },
        },
      },
    },
    "/suppliers": {
      get: {
        tags: ["Suppliers"],
        summary: "List suppliers",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Supplier list" },
        },
      },
      post: {
        tags: ["Suppliers"],
        summary: "Create supplier",
        security: [{ bearerAuth: [] }],
        responses: {
          201: { description: "Created" },
        },
      },
    },
    "/purchase-orders": {
      get: {
        tags: ["Purchase Orders"],
        summary: "List purchase orders",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Purchase order list" } },
      },
      post: {
        tags: ["Purchase Orders"],
        summary: "Create purchase order",
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: "Created" } },
      },
    },
    "/purchase-orders/{id}/receive": {
      post: {
        tags: ["Purchase Orders"],
        summary: "Receive purchase order",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Received" } },
      },
    },
    "/sales-orders": {
      get: {
        tags: ["Sales Orders"],
        summary: "List sales orders",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Sales order list" } },
      },
      post: {
        tags: ["Sales Orders"],
        summary: "Create sales order",
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: "Created" } },
      },
    },
    "/sales-orders/{id}/fulfill": {
      post: {
        tags: ["Sales Orders"],
        summary: "Fulfill sales order",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Fulfilled" } },
      },
    },
    "/alerts/reorder-soon": {
      get: {
        tags: ["Analytics"],
        summary: "Reorder alerts",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Reorder list" } },
      },
    },
    "/analytics/summary": {
      get: {
        tags: ["Analytics"],
        summary: "Dashboard summary",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Summary" } },
      },
    },
    "/analytics/monthly-sales": {
      get: {
        tags: ["Analytics"],
        summary: "Monthly sales series",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Series" } },
      },
    },
    "/analytics/recent-orders": {
      get: {
        tags: ["Analytics"],
        summary: "Recent orders table data",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Recent orders" } },
      },
    },
    "/analytics/stock-risk": {
      get: {
        tags: ["Analytics"],
        summary: "Stock risk analysis",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Risk data" } },
      },
    },
    "/analytics/query-insights": {
      post: {
        tags: ["Analytics"],
        summary: "Query-based demand insights",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Insights" } },
      },
    },
  },
} as const;
