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
[Route("api/products")]
public class ProductsController(MeeStockDbContext dbContext, ICurrentUserContext currentUser) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? q)
    {
        var query = dbContext.Products
            .Where(x => x.MerchantId == currentUser.MerchantId)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(q))
        {
            query = query.Where(x => x.Sku.Contains(q) || x.Barcode.Contains(q) || x.Name.Contains(q));
        }

        var products = await query
            .OrderByDescending(x => x.CreatedAt)
            .Take(200)
            .Select(x => new
            {
                x.Id,
                x.Sku,
                x.Barcode,
                x.Name,
                x.UnitPrice,
                x.StockQty,
                x.LowStockThreshold,
                x.IsActive
            })
            .ToListAsync();

        return Ok(products);
    }

    [HttpGet("barcode/{barcode}")]
    public async Task<IActionResult> GetByBarcode(string barcode)
    {
        var product = await dbContext.Products.FirstOrDefaultAsync(x => x.MerchantId == currentUser.MerchantId && x.Barcode == barcode);
        return product is null ? NotFound() : Ok(product);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateProductRequest request)
    {
        var product = new Product
        {
            MerchantId = currentUser.MerchantId,
            Sku = request.Sku.Trim(),
            Barcode = request.Barcode.Trim(),
            Name = request.Name.Trim(),
            UnitPrice = request.UnitPrice,
            StockQty = request.StockQty,
            LowStockThreshold = request.LowStockThreshold
        };

        dbContext.Products.Add(product);
        await dbContext.SaveChangesAsync();

        return CreatedAtAction(nameof(GetByBarcode), new { barcode = product.Barcode }, product);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateProductRequest request)
    {
        var product = await dbContext.Products.FirstOrDefaultAsync(x => x.Id == id && x.MerchantId == currentUser.MerchantId);
        if (product is null) return NotFound();

        product.Name = request.Name.Trim();
        product.UnitPrice = request.UnitPrice;
        product.LowStockThreshold = request.LowStockThreshold;
        product.IsActive = request.IsActive;

        await dbContext.SaveChangesAsync();
        return Ok(product);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "OwnerOnly")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var product = await dbContext.Products.FirstOrDefaultAsync(x => x.Id == id && x.MerchantId == currentUser.MerchantId);
        if (product is null) return NotFound();

        dbContext.Products.Remove(product);
        await dbContext.SaveChangesAsync();
        return NoContent();
    }
}
