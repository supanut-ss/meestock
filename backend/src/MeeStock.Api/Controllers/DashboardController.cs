using MeeStock.Api.Data;
using MeeStock.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MeeStock.Api.Controllers;

[ApiController]
[Authorize(Policy = "OwnerOrStaff")]
[Route("api/dashboard")]
public class DashboardController(MeeStockDbContext dbContext, ICurrentUserContext currentUser) : ControllerBase
{
    [HttpGet("stock-snapshot")]
    public async Task<IActionResult> StockSnapshot()
    {
        var totalProducts = await dbContext.Products.CountAsync(x => x.MerchantId == currentUser.MerchantId && x.IsActive);
        var totalStockQty = await dbContext.Products.Where(x => x.MerchantId == currentUser.MerchantId && x.IsActive).SumAsync(x => (int?)x.StockQty) ?? 0;

        var lowStockItems = await dbContext.Products
            .Where(x => x.MerchantId == currentUser.MerchantId && x.IsActive && x.StockQty <= x.LowStockThreshold)
            .OrderBy(x => x.StockQty)
            .Take(20)
            .Select(x => new { x.Id, x.Sku, x.Barcode, x.Name, x.StockQty, x.LowStockThreshold })
            .ToListAsync();

        return Ok(new
        {
            total_products = totalProducts,
            total_stock_qty = totalStockQty,
            low_stock_count = lowStockItems.Count,
            low_stock_items = lowStockItems
        });
    }

    [HttpGet("sales-summary")]
    public async Task<IActionResult> SalesSummary()
    {
        var startDaily = DateTime.UtcNow.Date.AddDays(-29);
        var startMonthly = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1).AddMonths(-11);

        var daily = await dbContext.Orders
            .Where(x => x.MerchantId == currentUser.MerchantId && x.CreatedAt >= startDaily)
            .GroupBy(x => x.CreatedAt.Date)
            .Select(g => new { date = g.Key, total_amount = g.Sum(x => x.TotalAmount), order_count = g.Count() })
            .OrderBy(x => x.date)
            .ToListAsync();

        var monthly = dbContext.Orders
            .Where(x => x.MerchantId == currentUser.MerchantId && x.CreatedAt >= startMonthly)
            .AsEnumerable()
            .GroupBy(x => new { x.CreatedAt.Year, x.CreatedAt.Month })
            .Select(g => new { month = $"{g.Key.Year:D4}-{g.Key.Month:D2}", total_amount = g.Sum(x => x.TotalAmount), order_count = g.Count() })
            .OrderBy(x => x.month)
            .ToList();

        return Ok(new { daily, monthly });
    }

    [HttpGet("best-sellers")]
    public async Task<IActionResult> BestSellers()
    {
        var topItems = await dbContext.OrderItems
            .Include(x => x.Product)
            .Where(x => x.MerchantId == currentUser.MerchantId)
            .GroupBy(x => new { x.ProductId, x.Product!.Name, x.Product.Sku })
            .Select(g => new
            {
                product_id = g.Key.ProductId,
                product_name = g.Key.Name,
                sku = g.Key.Sku,
                total_qty = g.Sum(x => x.Qty),
                total_revenue = g.Sum(x => x.LineAmount)
            })
            .OrderByDescending(x => x.total_qty)
            .Take(5)
            .ToListAsync();

        return Ok(topItems);
    }
}
