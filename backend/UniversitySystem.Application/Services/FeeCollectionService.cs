public class FeeCollectionService : IFeeCollectionService
{
    private readonly IFeeCollectionRepository _repo;
    private readonly IAuditLogService _auditLog;
    private readonly ICurrentUserService _currentUser;

    public FeeCollectionService(
        IFeeCollectionRepository repo,
        IAuditLogService auditLog,
        ICurrentUserService currentUser)
    {
        _repo = repo;
        _auditLog = auditLog;
        _currentUser = currentUser;
    }

    // ✅ STEP 1 — CREATE (Before payment)
    public async Task<FeeCollectionResponseDto> CreateAsync(CreateFeeCollectionDto dto)
    {
        // 🔒 Rate limit: at most 3 payment attempts per fee type per application per hour
        var since = DateTime.UtcNow.AddHours(-1);
        var recentAttempts = await _repo.CountAttemptsSinceAsync(dto.ApplicationId, dto.FeeType, since);
        if (recentAttempts >= 3)
        {
            throw new Exception("You have reached the maximum of 3 payment attempts for this fee in the last hour. Please try again later.");
        }

        var entity = new FeeCollection
        {
            Id = Guid.NewGuid(),
            ApplicationId = dto.ApplicationId,
            ApplicationNo = dto.ApplicationNo,
            Name = dto.Name,
            Email = dto.Email,
            Mobile = dto.Mobile,

            // ✅ FROM FRONTEND
            FeeType = dto.FeeType,

            DegreeId = dto.DegreeId,
            CourseId = dto.CourseId,

            Amount = dto.Amount,
            PlatformCharges = dto.PlatformCharges,

            ReceiptNumber = dto.ReceiptNumber,
            Status = "PENDING",

            InsertBy = _currentUser.Username,
            InsertOn = DateTime.UtcNow
        };

        var result = await _repo.CreateAsync(entity);

        // 🔥 AUDIT LOG
        await _auditLog.LogAsync("fee_collections", result.Id, "INSERT", null, new
        {
            result.ApplicationId,
            result.ApplicationNo,
            result.Name,
            result.Email,
            result.Mobile,
            result.FeeType, // ✅ important
            result.DegreeId,
            result.CourseId,
            result.Amount,
            result.PlatformCharges,
            result.ReceiptNumber,
            result.Status,
            result.InsertBy
        });

        return MapToDto(result);
    }

    // ✅ STEP 2 — UPDATE (After payment)
    public async Task<bool> UpdatePaymentAsync(UpdatePaymentDto dto)
    {
        var entity = await _repo.GetByReceiptNumberAsync(dto.ReceiptNumber);

        if (entity == null)
            return false;

        if (entity.Status == "SUCCESS")
            throw new Exception("Payment already completed");

        // 🔥 OLD VALUES (IMPORTANT)
        var old = new
        {
            entity.Status,
            entity.PaidAmount,
            entity.TransactionId,
            entity.OrderId,
            entity.PaymentDate
        };

        entity.OrderId = dto.OrderId;
        entity.TransactionId = dto.TransactionId;
        entity.PaidAmount = dto.PaidAmount;
        entity.PaymentDate = dto.PaymentDate;
        entity.Status = dto.Status;

        entity.UpdateBy = _currentUser.Username;
        entity.UpdateOn = DateTime.UtcNow;

        await _repo.UpdateAsync(entity);

        // 🔥 AUDIT LOG (UPDATE)
        await _auditLog.LogAsync("fee_collections", entity.Id, "UPDATE", old, new
        {
            entity.Status,
            entity.PaidAmount,
            entity.TransactionId,
            entity.OrderId,
            entity.PaymentDate,
            entity.UpdateBy
        });

        return true;
    }

    // ✅ GET BY ID
    public async Task<FeeCollectionResponseDto?> GetByIdAsync(Guid id)
    {
        var data = await _repo.GetByIdAsync(id);
        return data == null ? null : MapToDto(data);
    }

    public async Task<List<FeeCollectionResponseDto>> GetAllAsync()
    {
        var list = await _repo.GetAllAsync();
        return list.Select(MapToDto).ToList();
    }

    // ✅ GET BY RECEIPT + USER
    public async Task<FeeCollectionResponseDto?> GetByReceiptAndUserAsync(string receiptNumber, string username)
    {
        var data = await _repo.GetByReceiptAndUserAsync(receiptNumber, username);
        return data == null ? null : MapToDto(data);
    }

    // ✅ GET BY RECEIPT (admin — no username filter)
    public async Task<FeeCollectionResponseDto?> GetByReceiptNumberAsync(string receiptNumber)
    {
        var data = await _repo.GetByReceiptNumberAsync(receiptNumber);
        return data == null ? null : MapToDto(data);
    }

    // ✅ GET BY APPLICATION ID
    public async Task<List<FeeCollectionResponseDto>> GetByApplicationIdAsync(Guid applicationId)
    {
        var list = await _repo.GetByApplicationIdAsync(applicationId);
        return list.Select(MapToDto).ToList();
    }

    // ── NEW: GET PAGED (grouped by application, filtered + aggregated in SQL) ──
    public async Task<PagedFeeCollectionResult> GetPagedAsync(
        string? search, List<string>? feeTypes, int page, int pageSize)
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize is < 1 or > 100 ? 10 : pageSize;

        var (applicationIds, totalGroups) = await _repo.GetPagedApplicationIdsAsync(search, feeTypes, page, pageSize);

        var records = applicationIds.Count > 0
            ? await _repo.GetByApplicationIdsAsync(applicationIds)
            : new List<FeeCollection>();

        var totals = await _repo.GetTotalsAsync(search, feeTypes);

        return new PagedFeeCollectionResult
        {
            Items = records.Select(MapToDto).ToList(),
            TotalGroups = totalGroups,
            Page = page,
            PageSize = pageSize,
            Totals = new FeeTotalsDto
            {
                Total = totals.Total,
                ApplicationFees = totals.ApplicationFees,
                AdmissionFees = totals.AdmissionFees
            }
        };
    }

    public async Task<List<string>> GetFeeTypesAsync()
    {
        return await _repo.GetDistinctFeeTypesAsync();
    }

    // 🔁 MAPPER
    private FeeCollectionResponseDto MapToDto(FeeCollection x)
    {
        return new FeeCollectionResponseDto
        {
            Id = x.Id,
            ApplicationId = x.ApplicationId,
            ApplicationNo = x.ApplicationNo,
            Name = x.Name,
            FeeType = x.FeeType,

            DegreeId = x.DegreeId,
            CourseId = x.CourseId,

            Email = x.Email,
            Mobile = x.Mobile,

            Amount = x.Amount ?? 0,
            PlatformCharges = x.PlatformCharges ?? 0,
            PaidAmount = x.PaidAmount ?? 0,

            PaymentDate = x.PaymentDate,
            Status = x.Status,

            TransactionId = x.TransactionId,
            OrderId = x.OrderId,
            ReceiptNumber = x.ReceiptNumber,

            SettlementDate = x.SettlementDate,
            SettlementId = x.SettlementId,
        };
    }

    public async Task<bool> UpdateRefundAsync(
    RefundPaymentDto dto)
    {
        var entity =
            await _repo.GetByReceiptNumberAsync(
                dto.ReceiptNumber);

        if (entity == null)
            return false;

        var old = new
        {
            entity.Status,
            entity.RefundId,
            entity.RefundDate
        };

        entity.RefundId = dto.RefundId;

        entity.RefundDate = dto.RefundDate;

        entity.Status = dto.Status;

        entity.UpdateBy =
            _currentUser.Username;

        entity.UpdateOn =
            DateTime.UtcNow;

        await _repo.UpdateAsync(entity);

        await _auditLog.LogAsync(
            "fee_collections",
            entity.Id,
            "REFUND",
            old,
            new
            {
                entity.Status,
                entity.RefundId,
                entity.RefundDate,
                entity.UpdateBy
            });

        return true;
    }
}