using System.Security.Claims;

namespace MeeStock.Api.Services;

public interface ICurrentUserContext
{
    Guid UserId { get; }
    Guid MerchantId { get; }
    string[] Roles { get; }
}

public class CurrentUserContext(IHttpContextAccessor accessor) : ICurrentUserContext
{
    private ClaimsPrincipal Principal => accessor.HttpContext?.User ?? throw new UnauthorizedAccessException("Missing user context");

    public Guid UserId => Guid.Parse(Principal.FindFirstValue(ClaimTypes.NameIdentifier) ?? throw new UnauthorizedAccessException("Missing user id"));
    public Guid MerchantId => Guid.Parse(Principal.FindFirstValue("merchant_id") ?? throw new UnauthorizedAccessException("Missing merchant id"));
    public string[] Roles => Principal.FindAll(ClaimTypes.Role).Select(x => x.Value).ToArray();
}
