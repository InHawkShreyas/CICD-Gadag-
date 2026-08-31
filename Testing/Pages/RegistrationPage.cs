using Microsoft.Playwright;
using NUnit.Framework;

namespace PlaywrightTests.Pages;

public class RegistrationPage(IPage page)
{
    private readonly IPage _page = page;

    private ILocator SignUpBtn => _page.GetByText("Sign up");
    private ILocator NoBtn => _page.GetByText("No", new() { Exact = true }).First;
    private ILocator ContinueBtn => _page.GetByTestId("registration-admission-type-continue");
    private ILocator FullName => _page.GetByTestId("registration-name-input");
    private ILocator Username => _page.GetByTestId("registration-username-input");
    public ILocator UsernameField => Username;
    private ILocator Email => _page.GetByTestId("registration-email-input");
    private ILocator Mobile => _page.GetByTestId("registration-mobile-input");
    private ILocator Aadhar => _page.GetByTestId("registration-aadhar-input");
    private ILocator Dob => _page.GetByTestId("registration-dob-input");
    private ILocator SendOtpBtn => _page.GetByTestId("registration-send-otp-button");
    private ILocator OtpDigit(int index) => _page.GetByTestId($"registration-otp-digit-{index}");
    private ILocator VerifyOtpBtn => _page.GetByTestId("registration-verify-otp-button");
    private ILocator NewPassword => _page.GetByTestId("registration-new-password-input");
    private ILocator ConfirmPassword => _page.GetByTestId("registration-confirm-password-input");
    private ILocator CompleteRegistrationBtn => _page.GetByTestId("registration-complete-registration-button");
    private ILocator GoToLoginBtn => _page.GetByTestId("registration-success-go-to-login-button");
    private ILocator YesApplyBtn => _page.GetByTestId("registration-degree-type-confirm-yes");
    private ILocator DegreeTypeConfirmModal => _page.GetByTestId("registration-degree-type-confirm-modal");
    private ILocator ProgramOptionLabel(string programName) =>
        _page.Locator("label[data-testid^='registration-degree-type-option-']",
            new() { HasTextString = programName }).First;

    public async Task GoToAsync()
    {
        await _page.GotoAsync("/login");
    }

    public async Task ClickSignUpAsync() => await SignUpBtn.ClickAsync();
    public async Task ClickNoAsync() => await NoBtn.ClickAsync();
    public async Task ClickContinueAsync() => await ContinueBtn.ClickAsync();

    public async Task FillFormAsync(string name, string username, string email, string mobile)
    {
        await FullName.FillAsync(name);
        await Username.FillAsync(username);
        await Email.FillAsync(email);
        await Mobile.FillAsync(mobile);
        await _page.WaitForTimeoutAsync(500);
    }

    public async Task SelectDateOfBirthAsync(string date) => await Dob.FillAsync(date);

    public async Task SelectNationalityAsync(string value)
    {
        if (value == "Indian")
            await _page.GetByTestId("registration-nationality-option-001").ClickAsync();
        else if (value == "Non-Indian")
            await _page.GetByTestId("registration-nationality-option-002").ClickAsync();
        else
            throw new ArgumentException($"Unsupported nationality '{value}'.");
    }

    public async Task EnterAadharAsync(string aadhar)
    {
        await Aadhar.WaitForAsync();
        await Aadhar.FillAsync(aadhar);
    }

    public async Task SelectProgramAsync(string programType)
    {
        await _page.EvaluateAsync("document.activeElement && document.activeElement.blur()");
        await _page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        ILocator program = ProgramOptionLabel(programType);
        await program.WaitForAsync();
        await program.ClickAsync();

        await YesApplyBtn.WaitForAsync();
        await YesApplyBtn.ClickAsync();
        await DegreeTypeConfirmModal.WaitForAsync(new() { State = WaitForSelectorState.Hidden });

        string? selectedClass = await program.GetAttributeAsync("class");
        bool isSelected = selectedClass != null && selectedClass.Contains("bg-secondary");
        Assert.That(isSelected, Is.True,
            $"Program '{programType}' was not selected after confirming.");
    }

    public async Task ClickSendOtpAsync() => await SendOtpBtn.ClickAsync();

    public async Task WaitForOtpScreenAsync()
    {
        await OtpDigit(0).WaitForAsync(new() { Timeout = 60000 });
    }

    public async Task EnterOtpAsync(string otp)
    {
        await OtpDigit(0).WaitForAsync(new() { Timeout = 60000 });
        for (int i = 0; i < otp.Length && i < 6; i++)
            await OtpDigit(i).FillAsync(otp[i].ToString());
    }

    public async Task VerifyOtpAsync(string otp)
    {
        await EnterOtpAsync(otp);
        await VerifyOtpBtn.ClickAsync();
    }

    public async Task SetPasswordAndCompleteAsync(string password)
    {
        await NewPassword.WaitForAsync(new() { Timeout = 60000 });
        await NewPassword.FillAsync(password);
        await ConfirmPassword.FillAsync(password);
        await CompleteRegistrationBtn.ClickAsync();
    }

    public async Task ClickGoToLoginAsync() => await GoToLoginBtn.ClickAsync();
}