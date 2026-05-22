using System.ComponentModel.DataAnnotations;

namespace MeeStock.Api.Models;

public class Merchant
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [MaxLength(150)] public required string Name { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<User> Users { get; set; } = [];
    public ICollection<Product> Products { get; set; } = [];
    public ICollection<Customer> Customers { get; set; } = [];
    public ICollection<Order> Orders { get; set; } = [];
}

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid MerchantId { get; set; }
    [MaxLength(50)] public required string Username { get; set; }
    [MaxLength(255)] public required string PasswordHash { get; set; }
    [MaxLength(120)] public required string DisplayName { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Merchant? Merchant { get; set; }
    public ICollection<UserRole> UserRoles { get; set; } = [];
    public ICollection<RefreshToken> RefreshTokens { get; set; } = [];
}

public class Role
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [MaxLength(50)] public required string Name { get; set; }
    public ICollection<UserRole> UserRoles { get; set; } = [];
}

public class UserRole
{
    public Guid UserId { get; set; }
    public Guid RoleId { get; set; }
    public User? User { get; set; }
    public Role? Role { get; set; }
}

public class RefreshToken
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    [MaxLength(255)] public required string TokenHash { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? RevokedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User? User { get; set; }
}

public class Customer
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid MerchantId { get; set; }
    [MaxLength(150)] public required string Name { get; set; }
    [MaxLength(20)] public required string Phone { get; set; }
    [MaxLength(500)] public required string FullTextAddress { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Merchant? Merchant { get; set; }
    public ICollection<Address> Addresses { get; set; } = [];
    public ICollection<Order> Orders { get; set; } = [];
}

public class Address
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid MerchantId { get; set; }
    public Guid CustomerId { get; set; }
    [MaxLength(50)] public required string Label { get; set; }
    [MaxLength(150)] public required string ReceiverName { get; set; }
    [MaxLength(20)] public required string ReceiverPhone { get; set; }
    [MaxLength(50)] public required string HouseNo { get; set; }
    [MaxLength(100)] public string? Village { get; set; }
    [MaxLength(100)] public string? Road { get; set; }
    [MaxLength(100)] public string? SubDistrict { get; set; }
    [MaxLength(100)] public string? District { get; set; }
    [MaxLength(100)] public string? Province { get; set; }
    [MaxLength(10)] public string? PostalCode { get; set; }
    [MaxLength(500)] public required string FullAddress { get; set; }
    public bool IsDefault { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Customer? Customer { get; set; }
}

public class Product
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid MerchantId { get; set; }
    [MaxLength(50)] public required string Sku { get; set; }
    [MaxLength(50)] public required string Barcode { get; set; }
    [MaxLength(150)] public required string Name { get; set; }
    public decimal UnitPrice { get; set; }
    public int StockQty { get; set; }
    public int LowStockThreshold { get; set; } = 5;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Merchant? Merchant { get; set; }
    public ICollection<StockMovement> StockMovements { get; set; } = [];
    public ICollection<OrderItem> OrderItems { get; set; } = [];
}

public enum MovementType
{
    In,
    Out,
    Adjust
}

public class StockMovement
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid MerchantId { get; set; }
    public Guid ProductId { get; set; }
    public MovementType MovementType { get; set; }
    public int Qty { get; set; }
    [MaxLength(50)] public required string Reason { get; set; }
    [MaxLength(50)] public required string RefType { get; set; }
    public Guid? RefId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Product? Product { get; set; }
}

public enum OrderStatus
{
    Draft,
    Confirmed,
    Shipped,
    Cancelled
}

public class Order
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid MerchantId { get; set; }
    [MaxLength(50)] public required string OrderNo { get; set; }
    public Guid CustomerId { get; set; }
    public OrderStatus Status { get; set; } = OrderStatus.Confirmed;
    public decimal TotalAmount { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Merchant? Merchant { get; set; }
    public Customer? Customer { get; set; }
    public ICollection<OrderItem> Items { get; set; } = [];
}

public class OrderItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid MerchantId { get; set; }
    public Guid OrderId { get; set; }
    public Guid ProductId { get; set; }
    public int Qty { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal LineAmount { get; set; }

    public Order? Order { get; set; }
    public Product? Product { get; set; }
}

public class LowStockAlert
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid MerchantId { get; set; }
    public Guid ProductId { get; set; }
    public int StockQty { get; set; }
    public int LowStockThreshold { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Product? Product { get; set; }
}
