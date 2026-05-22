using MeeStock.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace MeeStock.Api.Data;

public static class SeedData
{
    public static async Task InitializeAsync(MeeStockDbContext dbContext)
    {
        if (await dbContext.Roles.AnyAsync())
        {
            return;
        }

        var ownerRole = new Role { Name = "owner" };
        var staffRole = new Role { Name = "staff" };
        dbContext.Roles.AddRange(ownerRole, staffRole);

        var merchant = new Merchant { Name = "Demo Merchant" };
        var user = new User
        {
            Merchant = merchant,
            Username = "owner",
            DisplayName = "Demo Owner",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("P@ssw0rd!")
        };

        dbContext.Users.Add(user);
        dbContext.UserRoles.Add(new UserRole { User = user, Role = ownerRole });

        await dbContext.SaveChangesAsync();
    }
}
