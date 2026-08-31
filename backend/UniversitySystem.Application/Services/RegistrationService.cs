public class RegistrationService : IRegistrationService
{
    private readonly IRegistrationRepository _repo;
    private readonly ILoginRepository _loginRepo;
    private readonly IAuditLogService _auditLog;
    private readonly ILookupRepository _lookupRepo;
    private readonly IStudentRepository _studentRepo;
    private readonly IAcademicYearRepository _academicYearRepo;

    public RegistrationService(
        IRegistrationRepository repo,
        ILoginRepository loginRepo,
        IAuditLogService auditLog,
        ILookupRepository lookupRepo,
        IStudentRepository studentRepo,
        IAcademicYearRepository academicYearRepo)
    {
        _repo = repo;
        _loginRepo = loginRepo;
        _auditLog = auditLog;
        _lookupRepo = lookupRepo;
        _studentRepo = studentRepo;
        _academicYearRepo = academicYearRepo;
    }

    private async Task<RegistrationResponseDto> MapToDto(Registration entity)
    {
        var degreeType = entity.DegreeTypeId.HasValue
            ? await _lookupRepo.GetByIdAsync(entity.DegreeTypeId.Value)
            : null;

        // Existing students (has a USN) carry their students-table academic
        // year here — used alongside the application's own selected degree
        // for the application-fee exemption rule (hasUsn + B.Sc + this year).
        string? academicYearDescription = null;
        if (!string.IsNullOrWhiteSpace(entity.UsnNo))
        {
            var student = await _studentRepo.GetByRegistrationNumberAsync(entity.UsnNo);
            if (student != null)
            {
                var academicYear = await _academicYearRepo.GetByIdAsync(student.AcademicYearId);
                academicYearDescription = academicYear?.Description;
            }
        }

        return new RegistrationResponseDto
        {
            Id = entity.Id,
            Username = entity.Username,
            Name = entity.Name,
            UsnNo = entity.UsnNo,
            ExamRegistration = entity.ExamRegistration,
            NationalityId = entity.NationalityId,
            DegreeTypeId = entity.DegreeTypeId,
            DegreeTypeName = degreeType?.Name,
            AcademicYearDescription = academicYearDescription,
            Mobile = entity.Mobile,
            Email = entity.Email,
            Dob = entity.Dob,
            AadharNo = entity.AadharNo,
            PassportNo = entity.PassportNo,
        };
    }

    public async Task<RegistrationResponseDto> CreateAsync(RegistrationRequestDto request)
    {
        var entity = new Registration
        {
            Username = request.Username,
            Name = request.Name,
            NationalityId = request.NationalityId,
            DegreeTypeId = request.DegreeTypeId,
            Mobile = request.Mobile,
            Email = request.Email,
            AadharNo = request.AadharNo,
            PassportNo = request.PassportNo,
            Dob = request.Dob,
            UsnNo = request.UsnNo,
            ExamRegistration = request.ExamRegistration,
            Status = true,
            InsertOn = DateTime.UtcNow
        };
        var result = await _repo.CreateAsync(entity);
        await _auditLog.LogAsync("registrations", result.Id, "INSERT", null, new
        {
            result.Username,
            result.Name,
            result.Email,
            result.Mobile,
        });
        return await MapToDto(result);
    }

    public async Task<RegistrationResponseDto?> GetByUsernameAsync(string username)
    {
        var user = await _repo.GetByUsernameAsync(username);
        return user == null ? null : await MapToDto(user);
    }

    public async Task<List<RegistrationResponseDto>> GetAllAsync()
    {
        var users = await _repo.GetAllAsync();
        var result = new List<RegistrationResponseDto>();
        foreach (var u in users)
            result.Add(await MapToDto(u));
        return result;
    }

    public async Task SoftDeleteAsync(string username)
    {
        var user = await _repo.GetByUsernameAsync(username);
        await _repo.SoftDeleteByUsernameAsync(username);
        if (user != null)
            await _auditLog.LogAsync("registrations", user.Id, "DELETE", new { user.Username, user.Name }, null);
    }

    public async Task UpdateExamRegistrationAsync(string username, bool examRegistration)
    {
        await _repo.UpdateExamRegistrationAsync(username, examRegistration);
    }

    public async Task<IdentityCheckResultDto> CheckIdentityStatusAsync(string documentType, string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return new IdentityCheckResultDto { Exists = false, Completed = false };

        var registrations = documentType.ToLowerInvariant() switch
        {
            "aadhar" => await _repo.GetAllByAadharAsync(value.Trim()),
            "passport" => await _repo.GetAllByPassportAsync(value.Trim()),
            _ => throw new ArgumentException("Invalid document type", nameof(documentType))
        };

        if (registrations == null || registrations.Count == 0)
            return new IdentityCheckResultDto { Exists = false, Completed = false };

        // Preserve existing single-result semantics for Completed/Username
        // (used for the "resume incomplete registration" flow, and now also
        // for prefill) by taking the most recently created matching row.
        var latest = registrations.OrderByDescending(r => r.InsertOn).First();
        var completed = await _loginRepo.ExistsByRegistrationIdAsync(latest.Id);

        var allowedDegreeTypeIds = await ComputeAllowedDegreeTypesAsync(registrations);

        return new IdentityCheckResultDto
        {
            Exists = true,
            Completed = completed,
            Username = latest.Username,
            AllowedDegreeTypeIds = allowedDegreeTypeIds,
            Prefill = await MapToDto(latest)
        };
    }

    // Degree-type visibility rule for an identity (Aadhaar/Passport) that
    // already has one or more registrations:
    //   already has UG          -> only PG and Certificate remain allowed
    //   already has PG          -> only Certificate remains allowed
    //   already has Certificate -> only UG and PG remain allowed
    // If the identity has multiple existing registrations across buckets,
    // the allowed set is the intersection of each bucket's rule above (so a
    // degree type already used is always excluded, and a degree type
    // excluded by ANY of the rules stays excluded).
    // Bucket is read from the DegreeType lookup's Type2 field ("UG" / "PG" /
    // "CertificateCourse") rather than matching against Name — Name text
    // ("Certification Courses" etc.) isn't a reliable/stable discriminator.
    private async Task<List<Guid>> ComputeAllowedDegreeTypesAsync(List<Registration> existingRegistrations)
    {
        var allDegreeTypes = await _lookupRepo.GetByTypeAndType("DegreeType", null);

        var usedBuckets = new HashSet<string>();
        foreach (var reg in existingRegistrations)
        {
            if (!reg.DegreeTypeId.HasValue) continue;
            var dt = allDegreeTypes.FirstOrDefault(d => d.Id == reg.DegreeTypeId.Value);
            var bucket = ClassifyDegreeBucket(dt);
            if (bucket != null) usedBuckets.Add(bucket);
        }

        // No prior registration in any recognizable bucket -> no restriction.
        if (usedBuckets.Count == 0)
            return allDegreeTypes.Select(d => d.Id).ToList();

        HashSet<string>? allowedBuckets = null;
        foreach (var used in usedBuckets)
        {
            var thisRuleAllows = AllowedBucketsFor(used);
            allowedBuckets = allowedBuckets == null
                ? thisRuleAllows
                : new HashSet<string>(allowedBuckets.Intersect(thisRuleAllows));
        }
        allowedBuckets ??= new HashSet<string>();

        return allDegreeTypes
            .Where(d => allowedBuckets.Contains(ClassifyDegreeBucket(d) ?? ""))
            .Select(d => d.Id)
            .ToList();
    }

    private static HashSet<string> AllowedBucketsFor(string usedBucket) => usedBucket switch
    {
        "UG" => new HashSet<string> { "PG", "CERTIFICATE" },
        "PG" => new HashSet<string> { "CERTIFICATE" },
        "CERTIFICATE" => new HashSet<string> { "UG", "PG" },
        _ => new HashSet<string>()
    };

    // Classifies a DegreeType lookup via its Type2 discriminator. Returns
    // null if it doesn't match a known bucket (e.g. some other program
    // type) — unrecognized types are left out of the used/allowed
    // computation entirely rather than guessed at.
    private static string? ClassifyDegreeBucket(Lookup? lookup)
    {
        return lookup?.Type2?.Trim().ToUpperInvariant() switch
        {
            "UG" => "UG",
            "PG" => "PG",
            "CERTIFICATECOURSE" => "CERTIFICATE",
            _ => null
        };
    }

    // 🔎 FORGOT USERNAME — verify Aadhaar/Passport + Mobile belong to the same registration,
    // and report whether a login (username/password) has actually been created for it.
    // NOTE: add this signature to IRegistrationService too (replacing FindByAadharAndMobileAsync):
    //   Task<(bool Exists, bool LoginCompleted, string? Username)> FindByIdentityAndMobileAsync(string idType, string idNumber, string mobile);
    public async Task<(bool Exists, bool LoginCompleted, string? Username)> FindByIdentityAndMobileAsync(
        string idType, string idNumber, string mobile)
    {
        if (string.IsNullOrWhiteSpace(idNumber) || string.IsNullOrWhiteSpace(mobile))
            return (false, false, null);

        // Accept both "aadhaar" (frontend/DTO spelling) and "aadhar" (repo method spelling).
        var registration = idType?.Trim().ToLowerInvariant() switch
        {
            "passport" => await _repo.GetByPassportAsync(idNumber.Trim()),
            "aadhaar" or "aadhar" or null or "" => await _repo.GetByAadharAsync(idNumber.Trim()),
            _ => throw new ArgumentException("Invalid document type", nameof(idType))
        };

        if (registration == null || registration.Mobile?.Trim() != mobile.Trim())
            return (false, false, null);

        var loginCompleted = await _loginRepo.ExistsByRegistrationIdAsync(registration.Id);
        return (true, loginCompleted, registration.Username);
    }

    public async Task<RegistrationResponseDto> ResumeIncompleteAsync(string existingUsername, RegistrationRequestDto request)
    {
        var existing = await _repo.GetByUsernameAsync(existingUsername);
        if (existing == null)
            throw new InvalidOperationException($"No registration found for username '{existingUsername}'");

        existing.Name = request.Name;
        existing.Mobile = request.Mobile;
        existing.Email = request.Email;
        existing.Dob = request.Dob;
        existing.ExamRegistration = request.ExamRegistration;

        if (!string.IsNullOrWhiteSpace(request.UsnNo))
        {
            existing.UsnNo = request.UsnNo;
            existing.DegreeTypeId = null;
        }
        else if (request.DegreeTypeId != null)
        {
            existing.DegreeTypeId = request.DegreeTypeId;
            existing.UsnNo = null;
        }

        await _repo.UpdateAsync(existing);

        await _auditLog.LogAsync("registrations", existing.Id, "UPDATE", null, new
        {
            existing.Username,
            existing.Name,
            existing.Email,
            existing.Mobile,
        });

        return await MapToDto(existing);
    }
}