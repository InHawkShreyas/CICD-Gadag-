using System.Text.RegularExpressions;

public class ApplicationService : IApplicationService
{
    private readonly IApplicationRepository _repo;
    private readonly IAcademicYearService _academicYearService;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditLogService _auditLog;

    public ApplicationService(
        IApplicationRepository repo,
        IAcademicYearService academicYearService,
        ICurrentUserService currentUser,
        IAuditLogService auditLog)
    {
        _repo = repo;
        _academicYearService = academicYearService;
        _currentUser = currentUser;
        _auditLog = auditLog;
    }

    public async Task<Applications> CreateAsync(CreateApplicationFullDto dto)
    {
        if (dto.AcademicYearId == null)
            throw new Exception("AcademicYearId is required");

        if (dto.KarnatakaYn == true && dto.CategoryId == null)
            throw new Exception("CategoryId is required for Karnataka residents");

        if (dto.KarnatakaYn == true && dto.Religion == null)
            throw new Exception("Religion is required for Karnataka residents");

        var academicYear = await _academicYearService.GetByIdAsync(dto.AcademicYearId.Value);

        if (academicYear == null)
            throw new Exception("Invalid Academic Year");

        var yearDesc = academicYear.Description ?? "AY";

        var yearParts = yearDesc.Split('-');
        var shortYear = $"{yearParts[0].Substring(2)}{yearParts[1].Substring(2)}";

        var all = await _repo.GetAllAsync();

        var yearApps = all
            .Where(x => x.AppNo != null && x.AppNo.StartsWith(shortYear))
            .ToList();

        int nextNumber = 1;

        if (yearApps.Any())
        {
            var last = yearApps
                .Select(x =>
                {
                    var match = Regex.Match(x.AppNo!, @"(\d+)$");
                    return match.Success ? int.Parse(match.Value) : 0;
                })
                .Max();

            nextNumber = last + 1;
        }

        string appNo = $"{shortYear}MGRDPR{nextNumber:D5}";
        // 🔥 Address builder
        string BuildAddress(string? l1, string? l2, string? city,
            string? state, string? country, string? pin)
        {
            return string.Join(", ",
                new[] { l1, l2, city, state, country, pin }
                .Where(x => !string.IsNullOrWhiteSpace(x)));
        }

        var entity = new Applications
        {
            Id = Guid.NewGuid(),

            AppNo = appNo,
            AcademicYearId = dto.AcademicYearId,
            Name = dto.Name,
            Dob = dto.Dob,
            Phone = dto.Phone,
            Email = dto.Email,
            PlaceOfBirth = dto.PlaceOfBirth,

            Gender = dto.Gender,
            NationalityId = dto.NationalityId,
            KarnatakaYn = dto.KarnatakaYn,

            AadharNo = dto.AadharNo,
            PassportNo = dto.PassportNo,
            VisaNo = dto.VisaNo,
            PassportExpiryDate = dto.PassportExpiryDate,
            VisaExpiryDate = dto.VisaExpiryDate,

            Religion = dto.Religion,
            CategoryId = dto.CategoryId,

            Caste = dto.Caste,

            AnnualIncome = dto.AnnualIncome ?? 0,
            RdNumber = dto.RdNumber,
            CasteRdNumber = dto.CasteRdNumber,

            ApaarId = dto.ApaarId,
            StatsId = dto.StatsId,

            FatherName = dto.FatherName,
            FatherNo = dto.FatherNo,
            FatherOccupation = dto.FatherOccupation,

            MotherName = dto.MotherName,
            MotherNo = dto.MotherNo,
            MotherOccupation = dto.MotherOccupation,

            GuardianName = dto.GuardianName,
            GuardianNo = dto.GuardianNo,

            PermanentAddress = BuildAddress(
                dto.PermanentAddressLine1,
                dto.PermanentAddressLine2,
                dto.PermanentCity,
                dto.PermanentState,
                dto.PermanentCountry,
                dto.PermanentPostalCode
            ),

            CommunicationAddress = dto.SameAsPermanet
                ? BuildAddress(
                    dto.PermanentAddressLine1,
                    dto.PermanentAddressLine2,
                    dto.PermanentCity,
                    dto.PermanentState,
                    dto.PermanentCountry,
                    dto.PermanentPostalCode
                )
                : BuildAddress(
                    dto.PresentAddressLine1,
                    dto.PresentAddressLine2,
                    dto.PresentCity,
                    dto.PresentState,
                    dto.PresentCountry,
                    dto.PresentPostalCode
                ),

            InsertBy = _currentUser.Username,
            InsertOn = DateTime.UtcNow,
            Status = true
        };

        return await _repo.CreateAsync(entity);
    }

    public async Task<List<Applications>> GetAllAsync()
        => await _repo.GetAllAsync();

    public async Task<Applications?> GetByIdAsync(Guid id)
        => await _repo.GetByIdAsync(id);

    public async Task<bool> UpdateAsync(string appNo, CreateApplicationFullDto dto)
    {
        if (string.IsNullOrWhiteSpace(_currentUser.Username)) throw new Exception("User not authenticated");
        var entity = await _repo.GetByAppNoAndUserAsync(appNo, _currentUser.Username);

        if (entity == null)
            return false;

        if (entity.InsertBy != _currentUser.Username)
            throw new UnauthorizedAccessException("You cannot update this application");

        var old = new
        {
            entity.Name,
            entity.Phone,
            entity.Email,
            entity.CategoryId,
            entity.NationalityId,
            entity.PassportNo,
            entity.VisaNo,
            entity.PassportExpiryDate,
            entity.VisaExpiryDate,
            entity.Status
        };

        entity.Name = dto.Name;
        entity.Dob = dto.Dob;
        entity.Phone = dto.Phone;
        entity.Email = dto.Email;
        entity.PlaceOfBirth = dto.PlaceOfBirth;

        entity.Gender = dto.Gender;
        entity.NationalityId = dto.NationalityId;
        entity.KarnatakaYn = dto.KarnatakaYn;

        entity.AadharNo = dto.AadharNo;
        entity.PassportNo = dto.PassportNo;
        entity.VisaNo = dto.VisaNo;
        entity.PassportExpiryDate = dto.PassportExpiryDate;
        entity.VisaExpiryDate = dto.VisaExpiryDate;

        entity.Religion = dto.Religion;
        entity.CategoryId = dto.CategoryId;
        entity.Caste = dto.Caste;

        entity.AnnualIncome = dto.AnnualIncome;
        entity.RdNumber = dto.RdNumber;
        entity.CasteRdNumber = dto.CasteRdNumber;

        entity.ApaarId = dto.ApaarId;
        entity.StatsId = dto.StatsId;

        entity.FatherName = dto.FatherName;
        entity.FatherNo = dto.FatherNo;
        entity.FatherOccupation = dto.FatherOccupation;

        entity.MotherName = dto.MotherName;
        entity.MotherNo = dto.MotherNo;
        entity.MotherOccupation = dto.MotherOccupation;

        entity.GuardianName = dto.GuardianName;
        entity.GuardianNo = dto.GuardianNo;

        string BuildAddress(string? l1, string? l2, string? city,
            string? state, string? country, string? pin)
        {
            return string.Join(", ",
                new[] { l1, l2, city, state, country, pin }
                .Where(x => !string.IsNullOrWhiteSpace(x)));
        }

        entity.PermanentAddress = BuildAddress(
            dto.PermanentAddressLine1,
            dto.PermanentAddressLine2,
            dto.PermanentCity,
            dto.PermanentState,
            dto.PermanentCountry,
            dto.PermanentPostalCode
        );

        entity.CommunicationAddress = dto.SameAsPermanet
            ? entity.PermanentAddress
            : BuildAddress(
                dto.PresentAddressLine1,
                dto.PresentAddressLine2,
                dto.PresentCity,
                dto.PresentState,
                dto.PresentCountry,
                dto.PresentPostalCode
            );

        entity.UpdateBy = _currentUser.Username;
        entity.UpdateOn = DateTime.UtcNow;

        await _repo.UpdateAsync(entity);

        await _auditLog.LogAsync("applications", entity.Id, "UPDATE", old, new
        {
            entity.Name,
            entity.Phone,
            entity.Email,
            entity.CategoryId,
            entity.NationalityId,
            entity.PassportNo,
            entity.VisaNo,
            entity.PassportExpiryDate,
            entity.VisaExpiryDate,
            entity.UpdateBy
        });

        return true;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var entity = await _repo.GetByIdAsync(id);
        if (entity == null) return false;

        await _repo.UpdateAsync(entity);

        return true;
    }
}