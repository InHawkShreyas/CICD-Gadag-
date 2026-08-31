using System;
using System.Collections.Generic;
using System.Threading.Tasks;

public interface ISeatTypeService
{
    Task<SeatType> CreateAsync(CreateSeatTypeDto dto);

    Task<List<SeatType>> GetAllAsync();

    Task<List<SeatType>> GetByApplicationIdAsync(Guid applicationId);

    Task<SeatType?> GetByIdAsync(Guid id);

    Task<bool> UpdateAsync(UpdateSeatTypeDto dto);

    Task<bool> DeleteAsync(Guid id);
}