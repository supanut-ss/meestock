namespace MeeStock.Api.DTOs;

public record CreateOrderItemRequest(Guid ProductId, int Qty);
public record CreateOrderRequest(Guid CustomerId, List<CreateOrderItemRequest> Items);
public record UpdateOrderStatusRequest(string Status);
