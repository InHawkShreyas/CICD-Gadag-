using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using UniversitySystem.Domain.Entities;

namespace UniversitySystem.Domain.Interfaces
{
    public interface IFaqRepository
    {
        Task<Faq?> GetByIdAsync(Guid id);
        Task<IEnumerable<Faq>> GetAllAsync(bool includeInactive);
        Task AddAsync(Faq faq);
        void Update(Faq faq);
        void Remove(Faq faq);
        Task<int> SaveChangesAsync();
    }
}
