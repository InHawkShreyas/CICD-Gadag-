using OfficeOpenXml;
using KVFSU.Application.Interfaces.Common;

public class StudentService : IStudentService
{
    private readonly IStudentRepository _repo;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditLogService _auditLog;

    public StudentService(
        IStudentRepository repo,
        ICurrentUserService currentUser,
        IAuditLogService auditLog)
    {
        _repo = repo;
        _currentUser = currentUser;
        _auditLog = auditLog;
    }

    // ✅ UPLOAD EXCEL
    public async Task<List<Student>> UploadAsync(StudentUploadDto dto)
    {
        var username = _currentUser.Username ?? "system";
        var savedStudents = new List<Student>();

        using var stream = new MemoryStream();
        await dto.File.CopyToAsync(stream);
        stream.Position = 0;

        ExcelPackage.LicenseContext = LicenseContext.NonCommercial;

        using var package = new ExcelPackage(stream);
        var sheet = package.Workbook.Worksheets.FirstOrDefault();

        if (sheet == null)
            throw new Exception("Excel file is empty");

        int rowCount = sheet.Dimension?.Rows ?? 0;
        int colCount = sheet.Dimension?.Columns ?? 0;

        // FIND HEADER ROW
        int headerRow = -1;

        for (int row = 1; row <= rowCount; row++)
        {
            for (int col = 1; col <= colCount; col++)
            {
                var cell = sheet.Cells[row, col].Text?.Trim().ToLower();

                if (cell == "name of the student")
                {
                    headerRow = row;
                    break;
                }
            }
            if (headerRow != -1) break;
        }

        if (headerRow == -1)
            throw new Exception("Header row not found");

        // FIND COLUMNS
        int nameCol = -1;
        int regCol = -1;

        for (int col = 1; col <= colCount; col++)
        {
            var header = sheet.Cells[headerRow, col].Text?.Trim().ToLower();

            if (string.IsNullOrWhiteSpace(header))
                continue;

            if (header.Contains("name"))
                nameCol = col;

            if (header.Contains("registration"))
                regCol = col;
        }

        if (nameCol == -1 || regCol == -1)
            throw new Exception("Required columns not found");

        // READ ROWS — insert one at a time, log and skip failures
        for (int row = headerRow + 1; row <= rowCount; row++)
        {
            try
            {
                var name = sheet.Cells[row, nameCol].Text?.Trim();
                var regNo = sheet.Cells[row, regCol].Text?.Trim();

                if (string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(regNo))
                    continue;

                if (name.Contains("name", StringComparison.OrdinalIgnoreCase) ||
                    regNo.Contains("registration", StringComparison.OrdinalIgnoreCase))
                    continue;

                if (name.Length > 150)
                    name = name[..150];

                if (regNo.Length > 50)
                    regNo = regNo[..50];

                var student = new Student
                {
                    Id = Guid.NewGuid(),
                    StudentName = name,
                    RegistrationNumber = regNo,
                    DegreeId = dto.DegreeId,
                    CourseId = dto.CourseId,
                    AcademicYearId = dto.AcademicYearId,
                    InsertBy = username,
                    InsertOn = DateTime.UtcNow,
                    Status = true
                };

                var inserted = await _repo.CreateBulkAsync([student]);
                savedStudents.AddRange(inserted);

                Console.WriteLine($"SUCCESS ROW {row}: {name}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"FAILED ROW: {row}");
                Console.WriteLine(ex.ToString());
                continue;
            }
        }

        if (savedStudents.Count == 0)
            throw new Exception("No valid student records imported");

        await _auditLog.LogAsync("students", Guid.NewGuid(), "BULK_INSERT", null, new
        {
            savedStudents.Count,
            InsertBy = username
        });

        return savedStudents;
    }
    // ✅ GET ALL
    public async Task<List<Student>> GetAllAsync()
        => await _repo.GetAllAsync();

    // ✅ GET BY ID
    public async Task<Student?> GetByIdAsync(Guid id)
        => await _repo.GetByIdAsync(id);

    // ✅ UPDATE
    public async Task<bool> UpdateAsync(Student entity)
    {
        var username = _currentUser.Username ?? "system";

        var old = new { entity.StudentName };

        entity.UpdateBy = username;
        entity.UpdateOn = DateTime.UtcNow;

        var result = await _repo.UpdateAsync(entity);

        await _auditLog.LogAsync("students", entity.Id, "UPDATE", old, new
        {
            entity.StudentName,
            entity.UpdateBy
        });

        return result;
    }

    // ✅ DELETE
    public async Task<bool> DeleteAsync(Guid id)
    {
        var result = await _repo.DeleteAsync(id);

        if (result)
            await _auditLog.LogAsync("students", id, "DELETE", null, null);

        return result;
    }
}