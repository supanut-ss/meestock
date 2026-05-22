# MeeStock API Endpoints

## Auth
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

## Products
- `GET /api/products?q=`
- `GET /api/products/barcode/{barcode}`
- `POST /api/products`
- `PUT /api/products/{id}`
- `DELETE /api/products/{id}`

## Stock
- `POST /api/stocks/receive`
- `POST /api/stocks/deduct`
- `POST /api/stocks/adjust`
- `GET /api/stocks/movements?productId=`

## Orders
- `GET /api/orders`
- `GET /api/orders/{id}`
- `POST /api/orders`
- `PATCH /api/orders/{id}/status`

## Customers / Addresses
- `GET /api/customers?q=`
- `GET /api/customers/{id}`
- `POST /api/customers`
- `PUT /api/customers/{id}`
- `DELETE /api/customers/{id}`
- `GET /api/addresses?customerId=`
- `POST /api/addresses`
- `PUT /api/addresses/{id}`
- `DELETE /api/addresses/{id}`

## Dashboard / Reports
- `GET /api/dashboard/stock-snapshot`
- `GET /api/dashboard/sales-summary`
- `GET /api/dashboard/best-sellers`
