using Microsoft.AspNetCore.Http;

namespace UniversitySystem.Infrastructure.Services;

public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public string Username =>
        _httpContextAccessor.HttpContext?.User?.FindFirst("username")?.Value
        ?? "system"; // 🔥 fallback if no token
}