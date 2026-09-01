using Microsoft.Playwright;
using NUnit.Framework;

namespace PlaywrightTests.Utilities;

public class BaseTest
{
    protected IPlaywright Playwright { get; private set; } = null!;
    protected IBrowser Browser { get; private set; } = null!;
    protected IBrowserContext Context { get; private set; } = null!;
    protected IPage Page { get; private set; } = null!;

    [SetUp]
    public async Task SetUp()
    {
        Playwright = await Microsoft.Playwright.Playwright.CreateAsync();

        var browserName = ConfigReader.Browser.ToLowerInvariant();
        Browser = browserName switch
        {
            "chromium" => await Playwright.Chromium.LaunchAsync(new BrowserTypeLaunchOptions
            {
                Headless = ConfigReader.Headless
            }),
            "firefox" => await Playwright.Firefox.LaunchAsync(new BrowserTypeLaunchOptions
            {
                Headless = ConfigReader.Headless
            }),
            "webkit" => await Playwright.Webkit.LaunchAsync(new BrowserTypeLaunchOptions
            {
                Headless = ConfigReader.Headless
            }),
            _ => throw new ArgumentException($"Unsupported browser: '{browserName}'")
        };

        Context = await Browser.NewContextAsync(new BrowserNewContextOptions
        {
            BaseURL = ConfigReader.BaseUrl,
            ViewportSize = new ViewportSize { Width = 1280, Height = 720 }
        });

        Page = await Context.NewPageAsync();
    }

    [TearDown]
    public async Task TearDown()
    {
        await Context.CloseAsync();
        await Browser.CloseAsync();
        Playwright.Dispose();
    }
}