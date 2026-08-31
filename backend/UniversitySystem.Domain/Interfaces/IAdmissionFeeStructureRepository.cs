public interface IAdmissionFeeStructureRepository
{
    Task<AdmissionFeeStructure> CreateAsync(AdmissionFeeStructure entity);

    Task<List<AdmissionFeeStructure>> GetAllAsync();

    Task<AdmissionFeeStructure?> GetByIdAsync(Guid id);

    Task<bool> UpdateAsync(AdmissionFeeStructure entity);

    Task<bool> DeleteAsync(Guid id);

    // ✅ NEW — Get by Degree + Course + Category
    Task<AdmissionFeeStructure?> GetByFiltersAsync(
        Guid degreeId,
        Guid courseId,
        Guid? categoryId = null,
        Guid? academicYearId = null
    );
}