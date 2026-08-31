using Microsoft.Playwright;
using NUnit.Framework;
using PlaywrightTests.Utilities;
namespace PlaywrightTests.Pages;

public class ApplicationPage(IPage page)
{
    private readonly IPage _page = page;

    // ============================================================
    // SIDEBAR NAVIGATION
    // ============================================================
    public ILocator ApplicationMenu =>
        _page.Locator("button")
            .Filter(new() { HasText = "Application" })
            .First;

    public async Task ClickApplicationMenuAsync()
    {
        await ApplicationMenu.ClickAsync();
    }

    // ============================================================
    // PERSONAL DETAILS
    // ============================================================
    public ILocator GenderMale => _page.Locator("input[name='gender']").Nth(0);
    public ILocator GenderFemale => _page.Locator("input[name='gender']").Nth(1);
    public ILocator KarnatakaYes => _page.Locator("input[name='karnatakaYn'][value='true']");
    public ILocator KarnatakaNo => _page.Locator("input[name='karnatakaYn'][value='false']");
    public ILocator Religion => _page.Locator("select[name='religion']");
    public ILocator Category => _page.Locator("select[name='category']");
    public ILocator Caste => _page.Locator("input[name='caste']");
    public ILocator AnnualIncome => _page.Locator("input[name='annualIncome']");
    public ILocator FatherName => _page.Locator("input[name='fatherName']");
    public ILocator FatherOccupation => _page.Locator("input[name='fatherOccupation']");
    public ILocator FatherMobile => _page.Locator("input[name='fatherMobile']");
    public ILocator MotherName => _page.Locator("input[name='motherName']");
    public ILocator MotherOccupation => _page.Locator("input[name='motherOccupation']");
    public ILocator MotherMobile => _page.Locator("input[name='motherMobile']");
    public ILocator PermanentAddressLine1 => _page.Locator("input[name='permanentAddressLine1']");
    public ILocator PermanentAddressLine2 => _page.Locator("input[name='permanentAddressLine2']");
    public ILocator PermanentCity => _page.Locator("input[name='permanentCity']");
    public ILocator PermanentState => _page.Locator("input[name='permanentState']");
    public ILocator PermanentCountry => _page.Locator("input[name='permanentCountry']");
    public ILocator PermanentPostalCode => _page.Locator("input[name='permanentPostalCode']");
    public ILocator SameAddressCheckbox => _page.Locator("input[type='checkbox']").First;
    public ILocator PersonalNextButton => _page.Locator("button:has-text('Next')").Last;

    public async Task SelectGenderAsync(string gender)
    {
        ILocator target = gender switch
        {
            "Male" => GenderMale,
            "Female" => GenderFemale,
            _ => throw new ArgumentException($"Unsupported gender: {gender}")
        };
        await target.CheckAsync(new() { Force = true });
    }

    public async Task SelectKarnatakaAsync(bool isFromKarnataka)
    {
        ILocator target = isFromKarnataka ? KarnatakaYes : KarnatakaNo;
        await target.CheckAsync(new() { Force = true });
    }

    public async Task FillParentsAsync(
        string fatherName, string fatherOccupation, string fatherMobile,
        string motherName, string motherOccupation, string motherMobile)
    {
        await FatherName.FillAsync(fatherName);
        await FatherOccupation.FillAsync(fatherOccupation);
        await FatherMobile.FillAsync(fatherMobile);
        await MotherName.FillAsync(motherName);
        await MotherOccupation.FillAsync(motherOccupation);
        await MotherMobile.FillAsync(motherMobile);
    }

    public async Task FillPermanentAddressAsync(
        string line1, string line2, string city,
        string state, string country, string postalCode)
    {
        await PermanentAddressLine1.FillAsync(line1);
        await PermanentAddressLine2.FillAsync(line2);
        await PermanentCity.FillAsync(city);
        await PermanentState.FillAsync(state);
        await PermanentCountry.FillAsync(country);
        await PermanentPostalCode.FillAsync(postalCode);
    }

    public async Task ClickPersonalNextAsync()
    {
        await PersonalNextButton.ClickAsync();
    }

    // ============================================================
    // EDUCATION DETAILS
    // ============================================================
    public ILocator TenthCardHeader =>
        _page.GetByText("10th", new() { Exact = true }).First;

    public ILocator TwelfthCardHeader =>
        _page.GetByText("12th", new() { Exact = true }).First;

    public ILocator InstituteName => _page.Locator("input[name='instituteName']");
    public ILocator YearOfPassing => _page.Locator("input[name='yearOfPassing']");
    public ILocator RegistrationNumber => _page.Locator("input[name='registrationNumber']");
    public ILocator MaxMarks => _page.Locator("input[name='maxMarks']");
    public ILocator ObtainedMarks => _page.Locator("input[name='obtainedMarks']");
    public ILocator Gpa => _page.Locator("input[name='gpa']");
    public ILocator EducationProceedButton =>
        _page.GetByRole(AriaRole.Button, new() { Name = "Proceed →" });

    public async Task FillEducationCardAsync(
        string instituteName, string yearOfPassing, string registrationNumber,
        string maxMarks, string obtainedMarks, string gpa)
    {
        await InstituteName.FillAsync(instituteName);
        await YearOfPassing.FillAsync(yearOfPassing);
        await RegistrationNumber.FillAsync(registrationNumber);
        await MaxMarks.FillAsync(maxMarks);
        await ObtainedMarks.FillAsync(obtainedMarks);
        await Gpa.FillAsync(gpa);
    }

    public async Task ClickEducationProceedAsync()
    {
        await EducationProceedButton.ClickAsync();
    }

    // ============================================================
    // DEGREE & COURSE
    // ============================================================
    public ILocator Degree => _page.Locator("select[name='degree']");
    public ILocator Course => _page.Locator("select[name='course']");
    public ILocator Step3NextButton => _page.Locator("button:has-text('Next')").Last;

    // ============================================================
    // SEAT & DEGREE
    // ============================================================
    public ILocator RuralCandidate => _page.GetByLabel("Rural Candidate");
    public ILocator NotApplicable => _page.GetByLabel("Not Applicable");
    public ILocator HostelYes => _page.Locator("input[name='hostel'][value='true']");
    public ILocator HostelNo => _page.Locator("input[name='hostel'][value='false']");
    public ILocator TransportYes => _page.Locator("input[name='transport'][value='true']");
    public ILocator TransportNo => _page.Locator("input[name='transport'][value='false']");

    public async Task SetHostelRequiredAsync(bool required)
    {
        ILocator target = required ? HostelYes : HostelNo;
        await target.CheckAsync(new() { Force = true });
    }

    public async Task SetTransportRequiredAsync(bool required)
    {
        ILocator target = required ? TransportYes : TransportNo;
        await target.CheckAsync(new() { Force = true });
    }

    // ============================================================
    // APPLICATION FEE
    // ============================================================
    public ILocator ApplicationFeeMenu =>
        _page.GetByRole(AriaRole.Button, new() { Name = "Application Fee", Exact = true });

    private ILocator AppFeePage => _page.GetByTestId("app-fee-page");

    private ILocator LoadingPaymentDetails =>
        _page.GetByText("Loading payment details");

    public async Task NavigateToApplicationFeeAsync()
    {
        await ApplicationFeeMenu.ClickAsync();
        await _page.WaitForURLAsync("**/student/application-fee");
        await Assertions.Expect(LoadingPaymentDetails)
            .ToBeHiddenAsync(new() { Timeout = 30000 });
    }

    public async Task ReloadApplicationFeePageAsync()
    {
        await _page.GotoAsync($"{ConfigReader.BaseUrl}/student/application-fee");
        await Assertions.Expect(LoadingPaymentDetails)
            .ToBeHiddenAsync(new() { Timeout = 30000 });
    }

    public async Task PayFeeCardAsync(int index)
    {
        await AppFeePage
            .Locator("div.flex.flex-col.gap-4 > div")
            .Nth(index)
            .GetByRole(AriaRole.Button, new() { Name = "Pay Now", Exact = true })
            .ClickAsync();

        await _page.WaitForTimeoutAsync(1500);
    }

    public async Task VerifyCardPaidAsync(int index)
    {
        ILocator card = AppFeePage.Locator("div.flex.flex-col.gap-4 > div").Nth(index);
        await Assertions.Expect(card.GetByText("Paid", new() { Exact = true }))
            .ToBeVisibleAsync(new() { Timeout = 15000 });
    }

    private ILocator AllApplicationFeesPaidBanner =>
        AppFeePage.GetByText("All application fees paid");

    public async Task VerifyAllFeesPaidAsync()
    {
        await Assertions.Expect(AllApplicationFeesPaidBanner)
            .ToBeVisibleAsync(new() { Timeout = 15000 });
    }
}