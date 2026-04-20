using System.Text.Json;
using System.Threading.RateLimiting;
using ChopsticksServer.Hubs;
using ChopsticksServer.Services;
using Microsoft.AspNetCore.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

var corsOrigins = GetCorsOrigins(builder);

builder.Services.AddSignalR(options =>
{
    options.MaximumReceiveMessageSize = 4096;
})
    .AddJsonProtocol(options =>
    {
        options.PayloadSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    });

builder.Services.AddSingleton<RoomManager>();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        if (corsOrigins.Length == 0)
        {
            policy.SetIsOriginAllowed(_ => false);
            return;
        }

        policy.WithOrigins(corsOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddFixedWindowLimiter("signalr", limiterOptions =>
    {
        limiterOptions.PermitLimit = 120;
        limiterOptions.Window = TimeSpan.FromMinutes(1);
        limiterOptions.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        limiterOptions.QueueLimit = 0;
    });
});

var app = builder.Build();

app.UseCors();
app.UseRateLimiter();
app.MapHub<GameHub>("/gamehub").RequireRateLimiting("signalr");

app.Run();

static string[] GetCorsOrigins(WebApplicationBuilder builder)
{
    var configuredOrigins = builder.Configuration.GetSection("CorsOrigins").Get<string[]>()
        ?? Array.Empty<string>();

    if (configuredOrigins.Length == 0 && builder.Environment.IsDevelopment())
    {
        configuredOrigins = new[] { "http://localhost:3000", "https://localhost:3000" };
    }

    return configuredOrigins
        .Select(NormalizeOrigin)
        .Where(origin => origin != null)
        .Cast<string>()
        .Distinct(StringComparer.OrdinalIgnoreCase)
        .ToArray();
}

static string? NormalizeOrigin(string? origin)
{
    var trimmed = origin?.Trim().TrimEnd('/');
    if (string.IsNullOrWhiteSpace(trimmed)) return null;

    if (!Uri.TryCreate(trimmed, UriKind.Absolute, out var uri)) return null;
    if (uri.Scheme is not ("http" or "https")) return null;

    return uri.GetLeftPart(UriPartial.Authority);
}
