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
[Route("api/customers")]
public class CustomersController(MeeStockDbContext dbContext, ICurrentUserContext currentUser) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? q)
    {
        var query = dbContext.Customers.Where(x => x.MerchantId == currentUser.MerchantId).AsQueryable();

        if (!string.IsNullOrWhiteSpace(q))
        {
            query = query.Where(x => x.Name.Contains(q) || x.Phone.Contains(q) || x.FullTextAddress.Contains(q));
        }

        var customers = await query
            .OrderByDescending(x => x.CreatedAt)
            .Take(200)
            .Select(x => new
            {
                x.Id,
                x.Name,
                x.Phone,
                x.FullTextAddress,
                address_count = x.Addresses.Count
            })
            .ToListAsync();

        return Ok(customers);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var customer = await dbContext.Customers
            .Include(x => x.Addresses)
            .FirstOrDefaultAsync(x => x.Id == id && x.MerchantId == currentUser.MerchantId);

        return customer is null ? NotFound() : Ok(customer);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCustomerRequest request)
    {
        var customer = new Customer
        {
            MerchantId = currentUser.MerchantId,
            Name = request.Name.Trim(),
            Phone = request.Phone.Trim(),
            FullTextAddress = request.FullTextAddress.Trim()
        };

        dbContext.Customers.Add(customer);
        await dbContext.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = customer.Id }, customer);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateCustomerRequest request)
    {
        var customer = await dbContext.Customers.FirstOrDefaultAsync(x => x.Id == id && x.MerchantId == currentUser.MerchantId);
        if (customer is null) return NotFound();

        customer.Name = request.Name.Trim();
        customer.Phone = request.Phone.Trim();
        customer.FullTextAddress = request.FullTextAddress.Trim();

        await dbContext.SaveChangesAsync();
        return Ok(customer);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "OwnerOnly")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var customer = await dbContext.Customers.FirstOrDefaultAsync(x => x.Id == id && x.MerchantId == currentUser.MerchantId);
        if (customer is null) return NotFound();

        dbContext.Customers.Remove(customer);
        await dbContext.SaveChangesAsync();
        return NoContent();
    }
}
