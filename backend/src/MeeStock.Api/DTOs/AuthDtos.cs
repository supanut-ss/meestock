namespace MeeStock.Api.DTOs;

public record LoginRequest(string Username, string Password);
public record RefreshRequest(string RefreshToken);
public record AuthResponse(string AccessToken, string RefreshToken, DateTime ExpiresAt, string DisplayName, string[] Roles);
