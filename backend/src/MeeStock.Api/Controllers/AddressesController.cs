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
[Route("api/addresses")]
public class AddressesController(MeeStockDbContext dbContext, ICurrentUserContext currentUser) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetByCustomer([FromQuery] Guid customerId)
    {
        var addresses = await dbContext.Addresses
            .Where(x => x.MerchantId == currentUser.MerchantId && x.CustomerId == customerId)
            .OrderByDescending(x => x.IsDefault)
            .ThenByDescending(x => x.CreatedAt)
            .ToListAsync();

        return Ok(addresses);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAddressRequest request)
    {
        var customerExists = await dbContext.Customers.AnyAsync(x => x.Id == request.CustomerId && x.MerchantId == currentUser.MerchantId);
        if (!customerExists)
        {
            return BadRequest("Customer not found");
        }

        if (request.IsDefault)
        {
            await dbContext.Addresses
                .Where(x => x.MerchantId == currentUser.MerchantId && x.CustomerId == request.CustomerId && x.IsDefault)
                .ExecuteUpdateAsync(setters => setters.SetProperty(x => x.IsDefault, false));
        }

        var address = new Address
        {
            MerchantId = currentUser.MerchantId,
            CustomerId = request.CustomerId,
            Label = request.Label.Trim(),
            ReceiverName = request.ReceiverName.Trim(),
            ReceiverPhone = request.ReceiverPhone.Trim(),
            HouseNo = request.HouseNo.Trim(),
            Village = request.Village?.Trim(),
            Road = request.Road?.Trim(),
            SubDistrict = request.SubDistrict?.Trim(),
            District = request.District?.Trim(),
            Province = request.Province?.Trim(),
            PostalCode = request.PostalCode?.Trim(),
            FullAddress = request.FullAddress.Trim(),
            IsDefault = request.IsDefault
        };

        dbContext.Addresses.Add(address);
        await dbContext.SaveChangesAsync();
        return Ok(address);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateAddressRequest request)
    {
        var address = await dbContext.Addresses.FirstOrDefaultAsync(x => x.Id == id && x.MerchantId == currentUser.MerchantId);
        if (address is null) return NotFound();

        if (request.IsDefault)
        {
            await dbContext.Addresses
                .Where(x => x.MerchantId == currentUser.MerchantId && x.CustomerId == address.CustomerId && x.IsDefault)
                .ExecuteUpdateAsync(setters => setters.SetProperty(x => x.IsDefault, false));
        }

        address.Label = request.Label.Trim();
        address.ReceiverName = request.ReceiverName.Trim();
        address.ReceiverPhone = request.ReceiverPhone.Trim();
        address.HouseNo = request.HouseNo.Trim();
        address.Village = request.Village?.Trim();
        address.Road = request.Road?.Trim();
        address.SubDistrict = request.SubDistrict?.Trim();
        address.District = request.District?.Trim();
        address.Province = request.Province?.Trim();
        address.PostalCode = request.PostalCode?.Trim();
        address.FullAddress = request.FullAddress.Trim();
        address.IsDefault = request.IsDefault;

        await dbContext.SaveChangesAsync();
        return Ok(address);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "OwnerOnly")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var address = await dbContext.Addresses.FirstOrDefaultAsync(x => x.Id == id && x.MerchantId == currentUser.MerchantId);
        if (address is null) return NotFound();

        dbContext.Addresses.Remove(address);
        await dbContext.SaveChangesAsync();
        return NoContent();
    }
}
