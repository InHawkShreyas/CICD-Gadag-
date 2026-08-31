public class ReceiptSequenceService : IReceiptSequenceService
{
    private readonly IReceiptSequenceRepository _repo;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditLogService _auditLog;

    public ReceiptSequenceService(
        IReceiptSequenceRepository repo,
        ICurrentUserService currentUser,
        IAuditLogService auditLog)
    {
        _repo = repo;
        _currentUser = currentUser;
        _auditLog = auditLog;
    }

    public async Task<string> GenerateReceiptNumberAsync()
    {
        var now = DateTime.UtcNow;

        // 👉 Year format → 2627
        var year = $"{now.Year % 100}{(now.Year + 1) % 100}";

        var entity = await _repo.GetByYearAsync(year);

        if (entity == null)
        {
            entity = new ReceiptSequence
            {
                Id = Guid.NewGuid(),
                Prefix = "MGRDPR",
                Year = year,
                LastNumber = 1,
                IsActive = true,
                InsertBy = _currentUser.Username,
                InsertOn = DateTime.UtcNow
            };

            await _repo.CreateAsync(entity);

            // 🔥 AUDIT LOG (INSERT)
            await _auditLog.LogAsync("receipt_sequence", entity.Id, "INSERT", null, new
            {
                entity.Prefix,
                entity.Year,
                entity.LastNumber,
                entity.IsActive,
                entity.InsertBy
            });
        }
        else
        {
            // 🔥 OLD VALUE (VERY IMPORTANT)
            var old = new
            {
                entity.LastNumber
            };

            entity.LastNumber += 1;
            entity.UpdateBy = _currentUser.Username;
            entity.UpdateOn = DateTime.UtcNow;

            await _repo.UpdateAsync(entity);

            // 🔥 AUDIT LOG (UPDATE)
            await _auditLog.LogAsync("receipt_sequence", entity.Id, "UPDATE", old, new
            {
                entity.LastNumber,
                entity.UpdateBy
            });
        }

        // 👉 Format: MGRDPR2627000001
        var receiptNo = $"{entity.Prefix}{entity.Year}{entity.LastNumber:D6}";

        return receiptNo;
    }
}