namespace MeeStock.Api.DTOs;

public record CreateProductRequest(string Sku, string Barcode, string Name, decimal UnitPrice, int StockQty, int LowStockThreshold);
public record UpdateProductRequest(string Name, decimal UnitPrice, int LowStockThreshold, bool IsActive);
public record AdjustStockRequest(Guid ProductId, int Qty, string Reason);
