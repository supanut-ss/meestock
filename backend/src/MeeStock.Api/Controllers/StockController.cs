using MeeStock.Api.Data;
using MeeStock.Api.DTOs;
using MeeStock.Api.Models;
using MeeStock.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MeeStock.Api.Controllers;

[ApiController]
[Authorize(Policy = "OwnerOrStaff")]
[Route("api/stocks")]
public class StockController(MeeStockDbContext dbContext, ICurrentUserContext currentUser) : ControllerBase
{
    [HttpPost("receive")]
    public async Task<IActionResult> Receive([FromBody] AdjustStockRequest request)
    {
        return await ApplyStock(request.ProductId, Math.Abs(request.Qty), MovementType.In, request.Reason, "manual");
    }

    [HttpPost("deduct")]
    public async Task<IActionResult> Deduct([FromBody] AdjustStockRequest request)
    {
        return await ApplyStock(request.ProductId, -Math.Abs(request.Qty), MovementType.Out, request.Reason, "manual");
    }

    [HttpPost("adjust")]
    [Authorize(Policy = "OwnerOnly")]
    public async Task<IActionResult> Adjust([FromBody] AdjustStockRequest request)
    {
        return await ApplyStock(request.ProductId, request.Qty, MovementType.Adjust, request.Reason, "manual");
    }

    [HttpGet("movements")]
    public async Task<IActionResult> MovementHistory([FromQuery] Guid? productId)
    {
        var query = dbContext.StockMovements
            .Include(x => x.Product)
            .Where(x => x.MerchantId == currentUser.MerchantId)
            .AsQueryable();

        if (productId.HasValue)
        {
            query = query.Where(x => x.ProductId == productId);
        }

        var result = await query
            .OrderByDescending(x => x.CreatedAt)
            .Take(200)
            .Select(x => new
            {
                x.Id,
                x.ProductId,
                product_name = x.Product!.Name,
                x.MovementType,
                x.Qty,
                x.Reason,
                x.RefType,
                x.RefId,
                x.CreatedAt
            })
            .ToListAsync();

        return Ok(result);
    }

    private async Task<IActionResult> ApplyStock(Guid productId, int qtyDelta, MovementType movementType, string reason, string refType)
    {
        var product = await dbContext.Products.FirstOrDefaultAsync(x => x.Id == productId && x.MerchantId == currentUser.MerchantId);
        if (product is null) return NotFound("Product not found");

        var newQty = product.StockQty + qtyDelta;
        if (newQty < 0)
        {
            return BadRequest("Insufficient stock");
        }

        product.StockQty = newQty;

        dbContext.StockMovements.Add(new StockMovement
        {
            MerchantId = currentUser.MerchantId,
            ProductId = product.Id,
            MovementType = movementType,
            Qty = qtyDelta,
            Reason = reason.Trim(),
            RefType = refType
        });

        if (product.StockQty <= product.LowStockThreshold)
        {
            dbContext.LowStockAlerts.Add(new LowStockAlert
            {
                MerchantId = currentUser.MerchantId,
                ProductId = product.Id,
                StockQty = product.StockQty,
                LowStockThreshold = product.LowStockThreshold
            });
        }

        await dbContext.SaveChangesAsync();
        return Ok(product);
    }
}
