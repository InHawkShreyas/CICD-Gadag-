using Microsoft.Extensions.Configuration;

namespace PlaywrightTests.Utilities;

public static class ConfigReader
{
    private static readonly IConfigurationRoot _config = new ConfigurationBuilder()
        .SetBasePath(AppContext.BaseDirectory)
        .AddJsonFile("Config/appsettings.json", optional: false)
        .AddJsonFile("Config/appsettings.local.json", optional: true)
        .AddEnvironmentVariables(prefix: "AUTOMATION_")
        .Build();

    public static string BaseUrl =>
        _config["BaseUrl"] ?? throw new InvalidOperationException("BaseUrl missing.");

    public static string BackendUrl =>
        _config["BackendUrl"] ?? throw new InvalidOperationException("BackendUrl missing.");

    public static bool Headless =>
        bool.TryParse(_config["Headless"], out var h) && h;

    public static string StudentUsername =>
        _config["Credentials:Student:Username"] ?? throw new InvalidOperationException("Student username missing.");

    public static string StudentPassword =>
        _config["Credentials:Student:Password"] ?? throw new InvalidOperationException("Student password missing.");

    public static string AdminUsername =>
        _config["Credentials:Admin:Username"] ?? throw new InvalidOperationException("Admin username missing.");

    public static string AdminPassword =>
        _config["Credentials:Admin:Password"] ?? throw new InvalidOperationException("Admin password missing.");

    public static string DbHost =>
        _config["Database:Host"] ?? "localhost";

    public static string DbPort =>
        _config["Database:Port"] ?? "5432";

    public static string DbName =>
        _config["Database:Name"] ?? throw new InvalidOperationException("DB name missing.");

    public static string DbUsername =>
        _config["Database:Username"] ?? throw new InvalidOperationException("DB username missing.");

    public static string DbPassword =>
        _config["Database:Password"] ?? throw new InvalidOperationException("DB password missing.");

    public static string Browser =>
    _config["Browser"] ?? "chromium";
}

