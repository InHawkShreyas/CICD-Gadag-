using NUnit.Framework;
using PlaywrightTests.Pages;
using PlaywrightTests.Utilities;

namespace PlaywrightTests.Tests;

[TestFixture]
[Parallelizable(ParallelScope.None)]
public class LoginTests : BaseTest
{
    private LoginPage _loginPage = null!;

    [SetUp]
    public void SetUpPages()
    {
        _loginPage = new LoginPage(Page);
    }

    [Test]
    public async Task ValidStudentLogin_ShouldSucceed()
    {
        await _loginPage.LoginAsStudentAsync();
        await _loginPage.VerifyWelcomeBackMsgAsync();
    }

    [Test]
    public async Task InvalidCredentials_ShouldShowError()
    {
        await _loginPage.GoToAsync();
        await _loginPage.LoginAsync("invaliduser", "wrongpassword");
        await _loginPage.VerifyInvalidCredentialsMsgAsync();
    }
}