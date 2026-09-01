using NUnit.Framework;
using Microsoft.Playwright;
using PlaywrightTests.Pages;
using PlaywrightTests.Utilities;

namespace PlaywrightTests.Tests;

[TestFixture]
[Parallelizable(ParallelScope.None)]
public class ApplicationEnd2EndTests : BaseTest
{
    private LoginPage _loginPage = null!;
    private ApplicationPage _applicationPage = null!;
    private RegistrationPage _registrationPage = null!;

    private const string TestPassword = "Test@1234";

    [SetUp]
    public void SetUpPages()
    {
        _loginPage = new LoginPage(Page);
        _applicationPage = new ApplicationPage(Page);
        _registrationPage = new RegistrationPage(Page);
    }

    private async Task<string> RegisterNewStudentAsync(string programType)
    {
        string username = "ci_" + Guid.NewGuid().ToString("N")[..8];
        string mobile = DbHelper.GenerateMobile();
        string aadhaar = DbHelper.GenerateAadhaar();

        await _registrationPage.GoToAsync();
        await _registrationPage.ClickSignUpAsync();
        await _registrationPage.ClickNoAsync();
        await _registrationPage.ClickContinueAsync();
        await _registrationPage.FillFormAsync(
            "CI Test User", username, $"{username}@test.com", mobile);
        string actualUsername = await _registrationPage.UsernameField.InputValueAsync();
        await _registrationPage.SelectDateOfBirthAsync("2000-01-01");
        await _registrationPage.SelectNationalityAsync("Indian");
        await _registrationPage.EnterAadharAsync(aadhaar);
        await _registrationPage.SelectProgramAsync(programType);
        await _registrationPage.ClickSendOtpAsync();
        await _registrationPage.WaitForOtpScreenAsync();

        string otp = await DbHelper.GetLatestOtpAsync(mobile);
        await _registrationPage.VerifyOtpAsync(otp);
        await _registrationPage.SetPasswordAndCompleteAsync(TestPassword);
        await _registrationPage.ClickGoToLoginAsync();
        await Page.WaitForURLAsync("**/login");

        return actualUsername;
    }

    private async Task LoginAsync(string username)
    {
        await _loginPage.GoToAsync();
        await _loginPage.LoginAsync(username, TestPassword);
        await Page.WaitForURLAsync("**/student**");
    }

    [Test]
    public async Task UG_RegisterAndLogin_ShouldReachDashboard()
    {
        string username = await RegisterNewStudentAsync("Undergraduate (UG)");
        await LoginAsync(username);
        await _loginPage.VerifyWelcomeBackMsgAsync();
    }

    [Test]
    public async Task UG_RegisterAndLogin_ApplicationMenu_ShouldBeAccessible()
    {
        string username = await RegisterNewStudentAsync("Undergraduate (UG)");
        await LoginAsync(username);
        await _applicationPage.ClickApplicationMenuAsync();
        await Assertions.Expect(
            Page.GetByRole(AriaRole.Heading, new() { Name = "Application" }))
            .ToBeVisibleAsync();
    }


}