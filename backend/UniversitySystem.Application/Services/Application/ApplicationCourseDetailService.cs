using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

public class ApplicationCourseDetailService : IApplicationCourseDetailService
{
    private readonly IApplicationCourseDetailRepository _repo;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditLogService _auditLog;

    public ApplicationCourseDetailService(
        IApplicationCourseDetailRepository repo,
        ICurrentUserService currentUser,
        IAuditLogService auditLog)
    {
        _repo = repo;
        _currentUser = currentUser;
        _auditLog = auditLog;
    }

    public async Task<ApplicationCourseDetail> CreateAsync(CreateApplicationCourseDetailDto dto)
    {
        var entity = new ApplicationCourseDetail
        {
            Id = Guid.NewGuid(),
            ApplicationId = dto.ApplicationId,
            ApplicationNo = dto.ApplicationNo,
            HostelFacilityYn = dto.HostelFacilityYn,
            TransportFacilityYn = dto.TransportFacilityYn,
            DegreeId = dto.DegreeId,
            CourseId = dto.CourseId,
            PreviousRegistrationNo = dto.PreviousRegistrationNo,
            BatchId = dto.BatchId,
            BatchTypeId = dto.BatchTypeId,
            InserviceYn = dto.InserviceYn,
            Department = dto.Department,
            Designation = dto.Designation,
            OfficeAddress = dto.OfficeAddress,
            DateOfJoin = dto.DateOfJoin,
            ServiceYears = dto.ServiceYears,
            InsertBy = _currentUser.Username,
            Status = true
        };

        var result = await _repo.CreateAsync(entity);

        await _auditLog.LogAsync("application_course_details", result.Id, "INSERT", null, new
        {
            result.ApplicationId,
            result.DegreeId,
            result.CourseId
        });

        return result;
    }

    public async Task<List<ApplicationCourseDetail>> CreateBulkAsync(CreateBulkApplicationCourseDetailDto dto)
    {
        if (dto.Selections == null || dto.Selections.Count == 0)
            throw new ArgumentException("At least one degree/course selection is required.", nameof(dto.Selections));

      
        var uniquePairs = dto.Selections
            .GroupBy(s => (s.DegreeId, s.CourseId))
            .Select(g => g.First())
            .ToList();

        var submittedByPair = uniquePairs
            .ToDictionary(p => (p.DegreeId, p.CourseId), p => p.Preference);

        var existing = await _repo.GetByApplicationIdAsync(dto.ApplicationId);
        var existingByPair = existing
            .Where(e => e.DegreeId.HasValue && e.CourseId.HasValue)
            .ToDictionary(e => (DegreeId: e.DegreeId!.Value, CourseId: e.CourseId!.Value), e => e);

        // 2) Pairs submitted but not yet saved — insert.
        var toInsert = uniquePairs
            .Where(p => !existingByPair.ContainsKey((p.DegreeId, p.CourseId)))
            .ToList();

        var results = new List<ApplicationCourseDetail>();

        if (toInsert.Count > 0)
        {
            var entities = toInsert.Select(p => new ApplicationCourseDetail
            {
                Id = Guid.NewGuid(),
                ApplicationId = dto.ApplicationId,
                ApplicationNo = dto.ApplicationNo,
                HostelFacilityYn = dto.HostelFacilityYn,
                TransportFacilityYn = dto.TransportFacilityYn,
                DegreeId = p.DegreeId,
                CourseId = p.CourseId,
                Preference = p.Preference,
                PreviousRegistrationNo = dto.PreviousRegistrationNo,
                BatchId = dto.BatchId,
                BatchTypeId = dto.BatchTypeId,
                InserviceYn = dto.InserviceYn,
                Department = dto.Department,
                Designation = dto.Designation,
                OfficeAddress = dto.OfficeAddress,
                DateOfJoin = dto.DateOfJoin,
                ServiceYears = dto.ServiceYears,
                InsertBy = _currentUser.Username,
                Status = true
            }).ToList();

            results = await _repo.CreateBulkAsync(entities);
        }

        // 3) Pairs that still exist on both sides but whose preference
        // label shifted — relabel the existing row instead of touching
        // Status, so AcceptedYn / audit history stays attached to the
        // same physical row rather than being lost on a delete+reinsert.
        var toRelabel = existingByPair
            .Where(kv => submittedByPair.TryGetValue(kv.Key, out var newPref)
                      && newPref != kv.Value.Preference)
            .Select(kv => (Row: kv.Value, NewPreference: submittedByPair[kv.Key]))
            .ToList();

        foreach (var (row, newPreference) in toRelabel)
        {
            var old = new { row.Preference };
            row.Preference = newPreference;
            row.UpdateBy = _currentUser.Username;
            row.UpdateOn = DateTime.UtcNow;
            await _repo.UpdateAsync(row);

            await _auditLog.LogAsync("application_course_details", row.Id, "UPDATE", old, new
            {
                row.Preference
            });
        }

        if (results.Count > 0 || toRelabel.Count > 0)
        {
            await _auditLog.LogAsync("application_course_details", dto.ApplicationId, "BULK_SYNC", null, new
            {
                dto.ApplicationId,
                Inserted = results.Select(r => new { r.DegreeId, r.CourseId, r.Preference }),
                Relabelled = toRelabel.Select(t => new { t.Row.DegreeId, t.Row.CourseId, t.NewPreference })
            });
        }

        return results;
    }

    // ✅ ACCEPT PREFERENCE
    // Called when the verifier checks one preference (P1/P2/...) and marks the
    // application Accepted. Sets AcceptedYn = true on that course-detail row
    // only; every other preference belonging to the same application is
    // cleared back to false, so exactly one preference is ever accepted at a
    // time for a given application.
    public async Task<bool> AcceptPreferenceAsync(Guid applicationId, Guid courseDetailId)
    {
        var siblings = await _repo.GetByApplicationIdAsync(applicationId);
        if (siblings == null || siblings.Count == 0)
            return false;

        var target = siblings.FirstOrDefault(s => s.Id == courseDetailId);
        if (target == null)
            return false;

        foreach (var sibling in siblings)
        {
            var shouldBeAccepted = sibling.Id == courseDetailId;
            if (sibling.AcceptedYn == shouldBeAccepted)
                continue; // already correct, skip the write

            var old = new { sibling.AcceptedYn };

            sibling.AcceptedYn = shouldBeAccepted;
            sibling.UpdateBy = _currentUser.Username;
            sibling.UpdateOn = DateTime.UtcNow;

            await _repo.UpdateAsync(sibling);

            await _auditLog.LogAsync("application_course_details", sibling.Id, "UPDATE", old, new
            {
                sibling.AcceptedYn
            });
        }

        return true;
    }

    // ✅ GET ALL
    public async Task<List<ApplicationCourseDetail>> GetAllAsync()
    {
        return await _repo.GetAllAsync();
    }

    // ✅ GET BY APPLICATION
    public async Task<List<ApplicationCourseDetail>> GetByApplicationIdAsync(Guid applicationId)
    {
        return await _repo.GetByApplicationIdAsync(applicationId);
    }

    // ✅ GET BY ID
    public async Task<ApplicationCourseDetail?> GetByIdAsync(Guid id)
    {
        return await _repo.GetByIdAsync(id);
    }

    // ✅ UPDATE
    public async Task<bool> UpdateAsync(UpdateApplicationCourseDetailDto dto)
    {
        var entity = await _repo.GetByIdAsync(dto.Id);

        if (entity == null)
            return false;

        var old = new
        {
            entity.ApplicationNo,
            entity.DegreeId,
            entity.CourseId,
            entity.HostelFacilityYn,
            entity.TransportFacilityYn,
            entity.InserviceYn,
            entity.Department,
            entity.Designation,
            entity.OfficeAddress,
            entity.DateOfJoin,
            entity.ServiceYears
        };

        if (dto.ApplicationNo != null) entity.ApplicationNo = dto.ApplicationNo;
        if (dto.DegreeId != Guid.Empty) entity.DegreeId = dto.DegreeId;
        if (dto.CourseId != Guid.Empty) entity.CourseId = dto.CourseId;
        if (dto.HostelFacilityYn.HasValue) entity.HostelFacilityYn = dto.HostelFacilityYn;
        if (dto.TransportFacilityYn.HasValue) entity.TransportFacilityYn = dto.TransportFacilityYn;
        if (dto.PreviousRegistrationNo != null) entity.PreviousRegistrationNo = dto.PreviousRegistrationNo;
        if (dto.BatchId.HasValue) entity.BatchId = dto.BatchId;
        if (dto.BatchTypeId.HasValue) entity.BatchTypeId = dto.BatchTypeId;
        if (dto.InserviceYn.HasValue) entity.InserviceYn = dto.InserviceYn;
        if (dto.Department != null) entity.Department = dto.Department;
        if (dto.Designation != null) entity.Designation = dto.Designation;
        if (dto.OfficeAddress != null) entity.OfficeAddress = dto.OfficeAddress;
        if (dto.DateOfJoin.HasValue) entity.DateOfJoin = dto.DateOfJoin;
        if (dto.ServiceYears.HasValue) entity.ServiceYears = dto.ServiceYears;
        entity.UpdateBy = _currentUser.Username;
        entity.UpdateOn = DateTime.UtcNow;

        await _repo.UpdateAsync(entity);

        await _auditLog.LogAsync("application_course_details", entity.Id, "UPDATE", old, new
        {
            entity.ApplicationNo,
            entity.DegreeId,
            entity.CourseId,
            entity.HostelFacilityYn,
            entity.TransportFacilityYn,
            entity.PreviousRegistrationNo,
            entity.InserviceYn,
            entity.Department,
            entity.Designation,
            entity.OfficeAddress,
            entity.DateOfJoin,
            entity.ServiceYears
        });

        return true;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var entity = await _repo.GetByIdAsync(id);

        if (entity == null)
            return false;

        var old = new { entity.Status, entity.DegreeId, entity.CourseId, entity.Preference };

        await _repo.DeleteAsync(entity);

        await _auditLog.LogAsync("application_course_details", id, "DELETE", old, null);

        return true;
    }
}