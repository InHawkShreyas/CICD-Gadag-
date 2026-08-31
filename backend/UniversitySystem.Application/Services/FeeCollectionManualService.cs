using UniversitySystem.Application.DTOs.FeeCollectionManualDtos;
using UniversitySystem.Domain.Entities;
using UniversitySystem.Domain.Interfaces;

public class FeeCollectionManualService : IFeeCollectionManualService
{
    private readonly IFeeCollectionManualRepository _repository;

    public FeeCollectionManualService(
        IFeeCollectionManualRepository repository
    )
    {
        _repository = repository;
    }

    // ✅ CREATE
    public async Task<FeeCollectionManualResponseDto> CreateAsync(
        CreateFeeCollectionManualDto dto
    )
    {
        var entity = new FeeCollectionManual
        {
            ReceiptNo = dto.ReceiptNo,
            FeeName = dto.FeeName,
            FeeAmount = dto.FeeAmount,
            TransactionId = dto.TransactionId,
            OrderId = dto.OrderId,
            PaymentMode = dto.PaymentMode,
            PaymentDate = dto.PaymentDate,
            AppNo = dto.AppNo,
            AppId = dto.AppId,
            DegreeId = dto.DegreeId,
            CourseId = dto.CourseId,

            InsertOn = DateTime.UtcNow,
            Status = true,

            // ✅ SAVE PARTICULAR DETAILS
            Details = dto.Details?.Select(x => new FeeCollectionManualDetail
            {
                Id = Guid.NewGuid(),
                ParticularName = x.ParticularName,
                ParticularAmt = x.ParticularAmt,

                InsertOn = DateTime.UtcNow,
                Status = true
            }).ToList() ?? new List<FeeCollectionManualDetail>()
        };

        var result = await _repository.CreateAsync(entity);

        return Map(result);
    }

    // ✅ GET ALL
    public async Task<List<FeeCollectionManualResponseDto>> GetAllAsync()
    {
        var data = await _repository.GetAllAsync();

        return data.Select(Map).ToList();
    }

    // ✅ GET PAGED
    public async Task<PagedFeeCollectionManualResult> GetPagedAsync(int page, int pageSize)
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize is < 1 or > 100 ? 10 : pageSize;

        var (items, totalCount) = await _repository.GetPagedAsync(page, pageSize);

        return new PagedFeeCollectionManualResult
        {
            Items = items.Select(Map).ToList(),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    // ✅ GET BY ID
    public async Task<FeeCollectionManualResponseDto?> GetByIdAsync(Guid id)
    {
        var data = await _repository.GetByIdAsync(id);

        if (data == null)
            return null;

        return Map(data);
    }

    // ✅ GET BY APP NO
    public async Task<List<FeeCollectionManualResponseDto>> GetByAppNoAsync(
        string appNo
    )
    {
        var data = await _repository.GetByAppNoAsync(appNo);

        return data.Select(Map).ToList();
    }

    // ✅ UPDATE
    public async Task UpdateAsync(
        Guid id,
        UpdateFeeCollectionManualDto dto
    )
    {
        var existing = await _repository.GetByIdAsync(id);

        if (existing == null)
            throw new Exception("Fee collection manual not found.");

        existing.ReceiptNo = dto.ReceiptNo;
        existing.FeeName = dto.FeeName;
        existing.FeeAmount = dto.FeeAmount;
        existing.TransactionId = dto.TransactionId;
        existing.OrderId = dto.OrderId;
        existing.PaymentMode = dto.PaymentMode;
        existing.PaymentDate = dto.PaymentDate;
        existing.AppNo = dto.AppNo;
        existing.AppId = dto.AppId;
        existing.DegreeId = dto.DegreeId;
        existing.CourseId = dto.CourseId;

        existing.UpdateOn = DateTime.UtcNow;

        // ✅ UPDATE PARTICULAR DETAILS
        existing.Details = dto.Details?.Select(x => new FeeCollectionManualDetail
        {
            Id = x.Id == Guid.Empty
                ? Guid.NewGuid()
                : x.Id,

            HeaderId = existing.Id,

            ParticularName = x.ParticularName,
            ParticularAmt = x.ParticularAmt,

            InsertOn = DateTime.UtcNow,
            Status = true
        }).ToList() ?? new List<FeeCollectionManualDetail>();

        await _repository.UpdateAsync(existing);
    }

    // ✅ MAPPER
    private static FeeCollectionManualResponseDto Map(
        FeeCollectionManual entity
    )
    {
        return new FeeCollectionManualResponseDto
        {
            Id = entity.Id,
            ReceiptNo = entity.ReceiptNo,
            FeeName = entity.FeeName,
            FeeAmount = entity.FeeAmount,
            TransactionId = entity.TransactionId,
            OrderId = entity.OrderId,
            PaymentMode = entity.PaymentMode,
            PaymentDate = entity.PaymentDate,
            AppNo = entity.AppNo,
            AppId = entity.AppId,
            DegreeId = entity.DegreeId,
            CourseId = entity.CourseId,

            // ✅ DETAILS
          Details = entity.Details?.Select(x => new FeeCollectionManualDetailDto
            {
                Id = x.Id,
                ParticularName = x.ParticularName,
                ParticularAmt = x.ParticularAmt
            }).ToList() ?? new List<FeeCollectionManualDetailDto>()
        };
    }
}