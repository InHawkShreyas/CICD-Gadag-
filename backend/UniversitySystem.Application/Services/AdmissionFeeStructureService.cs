using KVFSU.Application.Interfaces.Common;

public class AdmissionFeeStructureService : IAdmissionFeeStructureService
{
    private readonly IAdmissionFeeStructureRepository _repo;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditLogService _auditLog;

    public AdmissionFeeStructureService(
        IAdmissionFeeStructureRepository repo,
        ICurrentUserService currentUser,
        IAuditLogService auditLog)
    {
        _repo = repo;
        _currentUser = currentUser;
        _auditLog = auditLog;
    }

    /* =========================================================
       CREATE
    ========================================================= */

    public async Task<AdmissionFeeStructure> CreateAsync(
           AdmissionFeeStructure entity)
    {
        var username = _currentUser.Username ?? "system";

        entity.Id = Guid.NewGuid();

        entity.InsertBy = username;
        entity.InsertOn = DateTime.UtcNow;
        entity.Status = true;

        if (entity.Details != null && entity.Details.Any())
        {
            foreach (var d in entity.Details)
            {
                d.Id = Guid.NewGuid();
                d.HeaderId = entity.Id;

                d.InsertBy = username;
                d.InsertOn = DateTime.UtcNow;
                d.Status = true;

                d.Installment1Amount ??= 0;
                d.Installment2Amount ??= 0;
            }

            entity.TotalAmount =
                entity.Details.Sum(x => x.Amount);
        }
        else
        {
            entity.TotalAmount = 0;
        }

        var result = await _repo.CreateAsync(entity);

        await _auditLog.LogAsync(
            "admission_fee_structures",
            result.Id,
            "INSERT",
            null,
            new
            {
                result.TotalAmount,
                result.InsertBy
            });

        return result;
    }

    /* =========================================================
       GET ALL
    ========================================================= */

    public async Task<List<AdmissionFeeStructure>> GetAllAsync()
    {
        return await _repo.GetAllAsync();
    }

    /* =========================================================
       GET BY ID
    ========================================================= */

    public async Task<AdmissionFeeStructure?> GetByIdAsync(Guid id)
    {
        return await _repo.GetByIdAsync(id);
    }

    /* =========================================================
       UPDATE
    ========================================================= */
    public async Task<bool> UpdateAsync(
        AdmissionFeeStructure entity)
    {
        var username = _currentUser.Username ?? "system";

        var existing = await _repo.GetByIdAsync(entity.Id);

        if (existing == null)
            return false;

        /* =====================================================
           UPDATE MASTER
        ===================================================== */

        existing.FeeName = entity.FeeName;
        existing.FeeId = entity.FeeId;
        existing.DegreeTypeId = entity.DegreeTypeId;
        existing.DegreeId = entity.DegreeId;
        existing.CourseId = entity.CourseId;
        existing.CategoryId = entity.CategoryId;
        existing.AcademicYearId = entity.AcademicYearId;
        existing.AnnualIncomeId = entity.AnnualIncomeId;
        existing.DeductionYn = entity.DeductionYn;

        existing.FineAmount = entity.FineAmount;
        existing.StartDate = entity.StartDate;
        existing.EndDate = entity.EndDate;
        existing.FineEndDate = entity.FineEndDate;

        existing.DeductionAmount = entity.DeductionAmount;
        existing.PayAmount = entity.PayAmount;

        existing.UpdateBy = username;
        existing.UpdateOn = DateTime.UtcNow;

        /* =====================================================
           UPDATE DETAILS
        ===================================================== */

        if (entity.Details != null && existing.Details != null)
        {
            foreach (var incoming in entity.Details)
            {
                AdmissionFeeStructureDetail? existingDetail = null;

                // match by ID if present
                if (incoming.Id != Guid.Empty)
                {
                    existingDetail = existing.Details
                        .FirstOrDefault(x => x.Id == incoming.Id);
                }

                // fallback match by particular name
                if (existingDetail == null)
                {
                    existingDetail = existing.Details
                        .FirstOrDefault(x =>
                            x.ParticularName == incoming.ParticularName);
                }

                if (existingDetail != null)
                {
                    // ✅ UPDATE EXISTING
                    existingDetail.ParticularName = incoming.ParticularName;

                    existingDetail.Amount = incoming.Amount;

                    existingDetail.Installment1 = incoming.Installment1;

                    existingDetail.Installment2 = incoming.Installment2;

                    existingDetail.Installment1Amount =
                        incoming.Installment1Amount ?? 0;

                    existingDetail.Installment2Amount =
                        incoming.Installment2Amount ?? 0;

                    existingDetail.UpdateBy = username;
                    existingDetail.UpdateOn = DateTime.UtcNow;
                }
                else
                {
                    // ✅ ADD NEW
                    existing.Details.Add(new AdmissionFeeStructureDetail
                    {
                        Id = Guid.NewGuid(),

                        HeaderId = existing.Id,

                        ParticularName = incoming.ParticularName,

                        Amount = incoming.Amount,

                        Installment1 = incoming.Installment1,

                        Installment2 = incoming.Installment2,

                        Installment1Amount =
                            incoming.Installment1Amount ?? 0,

                        Installment2Amount =
                            incoming.Installment2Amount ?? 0,

                        InsertBy = username,
                        InsertOn = DateTime.UtcNow,
                        Status = true
                    });
                }
            }
        }

        /* =====================================================
           TOTAL
        ===================================================== */

        existing.TotalAmount =
            existing.Details?.Sum(x => x.Amount) ?? 0;

        /* =====================================================
           SAVE
        ===================================================== */

        return await _repo.UpdateAsync(existing);
    }
    /* =========================================================
       DELETE
    ========================================================= */

    public async Task<bool> DeleteAsync(Guid id)
    {
        var result = await _repo.DeleteAsync(id);

        if (result)
        {
            await _auditLog.LogAsync(
                "admission_fee_structures",
                id,
                "DELETE",
                null,
                null);
        }

        return result;
    }

    /* =========================================================
       GET BY FILTERS
    ========================================================= */

    public async Task<AdmissionFeeStructure?> GetByFiltersAsync(
        Guid degreeId,
        Guid courseId,
        Guid? categoryId = null,
        Guid? academicYearId = null)
    {
        return await _repo.GetByFiltersAsync(
            degreeId,
            courseId,
            categoryId,
            academicYearId);
    }
}