using System;
using System.Collections.Generic;
using System.Threading.Tasks;

public interface ISeatTypeRepository
{
    Task<SeatType> CreateAsync(SeatType entity);

    Task<List<SeatType>> GetAllAsync();

    Task<List<SeatType>> GetByApplicationIdAsync(Guid applicationId);

    Task<SeatType?> GetByIdAsync(Guid id);

    Task UpdateAsync(SeatType entity);
}