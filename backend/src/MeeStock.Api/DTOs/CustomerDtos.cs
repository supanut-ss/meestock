namespace MeeStock.Api.DTOs;

public record CreateCustomerRequest(string Name, string Phone, string FullTextAddress);
public record UpdateCustomerRequest(string Name, string Phone, string FullTextAddress);
public record CreateAddressRequest(Guid CustomerId, string Label, string ReceiverName, string ReceiverPhone, string HouseNo, string? Village, string? Road, string? SubDistrict, string? District, string? Province, string? PostalCode, string FullAddress, bool IsDefault);
public record UpdateAddressRequest(string Label, string ReceiverName, string ReceiverPhone, string HouseNo, string? Village, string? Road, string? SubDistrict, string? District, string? Province, string? PostalCode, string FullAddress, bool IsDefault);
