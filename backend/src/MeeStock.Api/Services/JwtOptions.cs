namespace MeeStock.Api.Services;

public class JwtOptions
{
    public const string SectionName = "Jwt";
    public string Issuer { get; set; } = "MeeStock";
    public string Audience { get; set; } = "MeeStock.Client";
    public string SecretKey { get; set; } = "replace-this-with-strong-key-at-least-32-characters";
    public int AccessTokenMinutes { get; set; } = 30;
    public int RefreshTokenDays { get; set; } = 7;
}
