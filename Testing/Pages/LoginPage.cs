using Microsoft.Playwright;
using NUnit.Framework;
using PlaywrightTests.Utilities;
namespace PlaywrightTests.Pages;

public class LoginPage(IPage page)
{
    private readonly IPage _page = page;

    private ILocator UsernameInput => _page.GetByTestId("login-username-input");
    private ILocator PasswordInput => _page.GetByTestId("login-password-input");
    private ILocator LoginButton => _page.GetByTestId("login-sign-in-button");
    private ILocator InvalidCredentialMsg => _page.GetByText("Invalid credentials");
    private ILocator WelcomeBackMsg => _page.GetByText("Welcome Back");

    public async Task GoToAsync()
    {
        await _page.GotoAsync("/login");
    }

    public async Task LoginAsync(string username, string password)
    {
        await UsernameInput.FillAsync(username);
        await PasswordInput.FillAsync(password);
        await LoginButton.ClickAsync();
    }

    public async Task LoginAsStudentAsync()
    {
        await GoToAsync();
        await LoginAsync(ConfigReader.StudentUsername, ConfigReader.StudentPassword);
    }

    public async Task LoginAsAdminAsync()
    {
        await GoToAsync();
        await LoginAsync(ConfigReader.AdminUsername, ConfigReader.AdminPassword);
    }

    public async Task VerifyInvalidCredentialsMsgAsync()
    {
        await Assertions.Expect(InvalidCredentialMsg).ToBeVisibleAsync();
    }

    public async Task VerifyWelcomeBackMsgAsync()
    {
        await Assertions.Expect(WelcomeBackMsg).ToBeVisibleAsync();
    }
}