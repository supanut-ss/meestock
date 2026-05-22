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
[Route("api/orders")]
public class OrdersController(MeeStockDbContext dbContext, ICurrentUserContext currentUser) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var orders = await dbContext.Orders
            .Where(x => x.MerchantId == currentUser.MerchantId)
            .OrderByDescending(x => x.CreatedAt)
            .Take(200)
            .Select(x => new
            {
                x.Id,
                x.OrderNo,
                x.CustomerId,
                x.Status,
                x.TotalAmount,
                x.CreatedAt
            })
            .ToListAsync();

        return Ok(orders);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var order = await dbContext.Orders
            .Include(x => x.Items)
            .ThenInclude(x => x.Product)
            .FirstOrDefaultAsync(x => x.Id == id && x.MerchantId == currentUser.MerchantId);

        return order is null ? NotFound() : Ok(order);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateOrderRequest request)
    {
        var customerExists = await dbContext.Customers.AnyAsync(x => x.Id == request.CustomerId && x.MerchantId == currentUser.MerchantId);
        if (!customerExists)
        {
            return BadRequest("Customer not found");
        }

        if (request.Items.Count == 0)
        {
            return BadRequest("Order items required");
        }

        await using var transaction = await dbContext.Database.BeginTransactionAsync();

        var productIds = request.Items.Select(x => x.ProductId).Distinct().ToList();
        var products = await dbContext.Products
            .Where(x => x.MerchantId == currentUser.MerchantId && productIds.Contains(x.Id))
            .ToDictionaryAsync(x => x.Id);

        if (products.Count != productIds.Count)
        {
            return BadRequest("Invalid product in order items");
        }

        foreach (var item in request.Items)
        {
            var product = products[item.ProductId];
            if (item.Qty <= 0 || product.StockQty < item.Qty)
            {
                return BadRequest($"Insufficient stock for product {product.Name}");
            }
        }

        var order = new Order
        {
            MerchantId = currentUser.MerchantId,
            CustomerId = request.CustomerId,
            OrderNo = $"MS-{DateTime.UtcNow:yyyyMMddHHmmssfff}",
            Status = OrderStatus.Confirmed
        };

        dbContext.Orders.Add(order);

        decimal total = 0;
        foreach (var item in request.Items)
        {
            var product = products[item.ProductId];
            product.StockQty -= item.Qty;

            var lineAmount = product.UnitPrice * item.Qty;
            total += lineAmount;

            dbContext.OrderItems.Add(new OrderItem
            {
                MerchantId = currentUser.MerchantId,
                Order = order,
                ProductId = product.Id,
                Qty = item.Qty,
                UnitPrice = product.UnitPrice,
                LineAmount = lineAmount
            });

            dbContext.StockMovements.Add(new StockMovement
            {
                MerchantId = currentUser.MerchantId,
                ProductId = product.Id,
                MovementType = MovementType.Out,
                Qty = -item.Qty,
                Reason = "order_create",
                RefType = "order",
                RefId = order.Id
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
        }

        order.TotalAmount = total;

        await dbContext.SaveChangesAsync();
        await transaction.CommitAsync();

        return CreatedAtAction(nameof(GetById), new { id = order.Id }, order);
    }

    [HttpPatch("{id:guid}/status")]
    [Authorize(Policy = "OwnerOnly")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateOrderStatusRequest request)
    {
        var order = await dbContext.Orders.FirstOrDefaultAsync(x => x.Id == id && x.MerchantId == currentUser.MerchantId);
        if (order is null) return NotFound();

        if (!Enum.TryParse<OrderStatus>(request.Status, true, out var status))
        {
            return BadRequest("Invalid status");
        }

        order.Status = status;
        await dbContext.SaveChangesAsync();

        return Ok(order);
    }
}
