using MeeStock.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace MeeStock.Api.Data;

public class MeeStockDbContext(DbContextOptions<MeeStockDbContext> options) : DbContext(options)
{
    public DbSet<Merchant> Merchants => Set<Merchant>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Address> Addresses => Set<Address>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<StockMovement> StockMovements => Set<StockMovement>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<LowStockAlert> LowStockAlerts => Set<LowStockAlert>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Merchant>().ToTable("merchants");
        modelBuilder.Entity<User>().ToTable("users");
        modelBuilder.Entity<Role>().ToTable("roles");
        modelBuilder.Entity<UserRole>().ToTable("user_roles");
        modelBuilder.Entity<RefreshToken>().ToTable("refresh_tokens");
        modelBuilder.Entity<Customer>().ToTable("customers");
        modelBuilder.Entity<Address>().ToTable("addresses");
        modelBuilder.Entity<Product>().ToTable("products");
        modelBuilder.Entity<StockMovement>().ToTable("stock_movements");
        modelBuilder.Entity<Order>().ToTable("orders");
        modelBuilder.Entity<OrderItem>().ToTable("order_items");
        modelBuilder.Entity<LowStockAlert>().ToTable("low_stock_alerts");

        modelBuilder.Entity<User>().HasIndex(x => new { x.MerchantId, x.Username }).IsUnique();
        modelBuilder.Entity<Role>().HasIndex(x => x.Name).IsUnique();
        modelBuilder.Entity<Product>().HasIndex(x => new { x.MerchantId, x.Sku }).IsUnique();
        modelBuilder.Entity<Product>().HasIndex(x => new { x.MerchantId, x.Barcode }).IsUnique();
        modelBuilder.Entity<Order>().HasIndex(x => new { x.MerchantId, x.CreatedAt });
        modelBuilder.Entity<StockMovement>().HasIndex(x => new { x.ProductId, x.CreatedAt });

        modelBuilder.Entity<UserRole>().HasKey(x => new { x.UserId, x.RoleId });

        modelBuilder.Entity<User>()
            .HasOne(x => x.Merchant)
            .WithMany(x => x.Users)
            .HasForeignKey(x => x.MerchantId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<UserRole>()
            .HasOne(x => x.User)
            .WithMany(x => x.UserRoles)
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<UserRole>()
            .HasOne(x => x.Role)
            .WithMany(x => x.UserRoles)
            .HasForeignKey(x => x.RoleId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<RefreshToken>()
            .HasOne(x => x.User)
            .WithMany(x => x.RefreshTokens)
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Customer>()
            .HasOne(x => x.Merchant)
            .WithMany(x => x.Customers)
            .HasForeignKey(x => x.MerchantId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Address>()
            .HasOne(x => x.Customer)
            .WithMany(x => x.Addresses)
            .HasForeignKey(x => x.CustomerId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Product>()
            .HasOne(x => x.Merchant)
            .WithMany(x => x.Products)
            .HasForeignKey(x => x.MerchantId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<StockMovement>()
            .HasOne(x => x.Product)
            .WithMany(x => x.StockMovements)
            .HasForeignKey(x => x.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Order>()
            .HasOne(x => x.Merchant)
            .WithMany(x => x.Orders)
            .HasForeignKey(x => x.MerchantId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Order>()
            .HasOne(x => x.Customer)
            .WithMany(x => x.Orders)
            .HasForeignKey(x => x.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<OrderItem>()
            .HasOne(x => x.Order)
            .WithMany(x => x.Items)
            .HasForeignKey(x => x.OrderId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<OrderItem>()
            .HasOne(x => x.Product)
            .WithMany(x => x.OrderItems)
            .HasForeignKey(x => x.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<LowStockAlert>()
            .HasOne(x => x.Product)
            .WithMany()
            .HasForeignKey(x => x.ProductId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
