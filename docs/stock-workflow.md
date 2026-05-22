# Auto Stock Deduction Workflow

## Order Create Flow
1. Receive order payload with customer and item list.
2. Validate all products belong to merchant and stock is sufficient.
3. Open database transaction.
4. Create `orders` and `order_items`.
5. Deduct each `products.stock_qty`.
6. Insert `stock_movements` with `movement_type = out` and `ref_type = order`.
7. If stock reaches threshold, create row in `low_stock_alerts`.
8. Commit transaction.

## Manual Stock Flow
- Receive stock: `POST /api/stocks/receive`
- Deduct stock: `POST /api/stocks/deduct`
- Adjust stock: `POST /api/stocks/adjust`

All stock operations write to `stock_movements` as an immutable history log.
