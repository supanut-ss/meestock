using BCrypt.Net;
using MeeStock.Api.Data;
using MeeStock.Api.DTOs;
using MeeStock.Api.Models;
using MeeStock.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MeeStock.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(MeeStockDbContext dbContext, ITokenService tokenService, ICurrentUserContext currentUser, IConfiguration configuration) : ControllerBase
{
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest request)
    {
        var user = await dbContext.Users
            .Include(x => x.UserRoles).ThenInclude(x => x.Role)
            .Include(x => x.Merchant)
            .FirstOrDefaultAsync(x => x.Username == request.Username && x.IsActive);

        if (user is null || user.Merchant is null || !user.Merchant.IsActive || !BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return Unauthorized("Invalid username or password");
        }

        var roles = user.UserRoles.Select(x => x.Role!.Name).ToArray();
        var (accessToken, expiresAt) = tokenService.CreateAccessToken(user, roles);
        var refreshToken = tokenService.CreateRefreshToken();

        dbContext.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = tokenService.HashRefreshToken(refreshToken),
            ExpiresAt = DateTime.UtcNow.AddDays(configuration.GetValue<int>("Jwt:RefreshTokenDays", 7))
        });

        await dbContext.SaveChangesAsync();

        return Ok(new AuthResponse(accessToken, refreshToken, expiresAt, user.DisplayName, roles));
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> Refresh([FromBody] RefreshRequest request)
    {
        var tokenHash = tokenService.HashRefreshToken(request.RefreshToken);
        var currentToken = await dbContext.RefreshTokens
            .Include(x => x.User).ThenInclude(x => x!.UserRoles).ThenInclude(x => x.Role)
            .FirstOrDefaultAsync(x => x.TokenHash == tokenHash && x.RevokedAt == null);

        if (currentToken is null || currentToken.ExpiresAt <= DateTime.UtcNow || currentToken.User is null)
        {
            return Unauthorized("Invalid refresh token");
        }

        currentToken.RevokedAt = DateTime.UtcNow;

        var roles = currentToken.User.UserRoles.Select(x => x.Role!.Name).ToArray();
        var (accessToken, expiresAt) = tokenService.CreateAccessToken(currentToken.User, roles);
        var newRefreshToken = tokenService.CreateRefreshToken();

        dbContext.RefreshTokens.Add(new RefreshToken
        {
            UserId = currentToken.User.Id,
            TokenHash = tokenService.HashRefreshToken(newRefreshToken),
            ExpiresAt = DateTime.UtcNow.AddDays(configuration.GetValue<int>("Jwt:RefreshTokenDays", 7))
        });

        await dbContext.SaveChangesAsync();

        return Ok(new AuthResponse(accessToken, newRefreshToken, expiresAt, currentToken.User.DisplayName, roles));
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout([FromBody] RefreshRequest request)
    {
        var tokenHash = tokenService.HashRefreshToken(request.RefreshToken);
        var currentToken = await dbContext.RefreshTokens.FirstOrDefaultAsync(x => x.TokenHash == tokenHash && x.UserId == currentUser.UserId && x.RevokedAt == null);
        if (currentToken is not null)
        {
            currentToken.RevokedAt = DateTime.UtcNow;
            await dbContext.SaveChangesAsync();
        }

        return NoContent();
    }

    [HttpGet("me")]
    [Authorize]
    public IActionResult Me()
    {
        return Ok(new
        {
            user_id = currentUser.UserId,
            merchant_id = currentUser.MerchantId,
            roles = currentUser.Roles
        });
    }
}
