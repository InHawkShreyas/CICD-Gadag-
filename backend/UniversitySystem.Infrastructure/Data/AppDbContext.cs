using Microsoft.EntityFrameworkCore;
using UniversitySystem.Domain.Entities;

namespace UniversitySystem.Infrastructure.Data
{
    public class AppDbContext : DbContext
    {
        private readonly ICurrentUserService _currentUser;

        public AppDbContext(
            DbContextOptions<AppDbContext> options,
            ICurrentUserService currentUser
        ) : base(options)
        {
            _currentUser = currentUser;
        }

        public DbSet<Registration> Registrations { get; set; }
        public DbSet<Lookup> Lookups { get; set; }
        public DbSet<OtpLog> OtpLogs { get; set; }
        public DbSet<Login> Logins { get; set; }
        public DbSet<DocumentCoordinatorMapping> DocumentCoordinatorMappings { get; set; }
        public DbSet<University> Universities { get; set; }
        public DbSet<AdmissionFeeConditionalCharge> AdmissionFeeConditionalCharges { get; set; }
        public DbSet<Degree> Degrees { get; set; }
        public DbSet<Course> Courses { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<AcademicDate> AcademicDates { get; set; }
        public DbSet<AcademicYear> AcademicYears { get; set; }
        public DbSet<ExamFee> ExamFees { get; set; }
        public DbSet<ApplicationFee> ApplicationFees { get; set; }
        public DbSet<AdmissionFeeStructure> AdmissionFeeStructures { get; set; }
        public DbSet<AdmissionFeeStructureDetail> AdmissionFeeStructureDetails { get; set; }
        public DbSet<PgEducationDetail> PgEducationDetails {  get; set; }
        public DbSet<PgEducationPeriod> PgEducationPeriods {  get; set; }
        public DbSet<SupportTicket> SupportTickets { get; set; }
        public DbSet<SupportTicketMessage> SupportTicketMessages { get; set; }
        public DbSet<Faq> Faqs { get; set; }
        public DbSet<AuditLog> AuditLogs { get; set; }
        public DbSet<EducationDetail> EducationDetails { get; set; }
        public DbSet<Applications> Applications { get; set; }
        public DbSet<ApplicationCourseDetail> ApplicationCourseDetails { get; set; }
        public DbSet<SeatType> SeatTypes { get; set; }
        public DbSet<application_photo> application_Photos { get; set; }
        public DbSet<ReceiptSequence> ReceiptSequences { get; set; }
        public DbSet<FeeCollection> FeeCollections { get; set; }
        public DbSet<FeeCollectionManual> FeeCollectionManuals { get; set; }
        public DbSet<CustomerSupport> customerSupports { get; set; }
        public DbSet<ApplicationVerification> ApplicationVerifications { get; set; }
        public DbSet<AdmittedStudent> AdmittedStudents { get; set; }
        public DbSet<Student> Students { get; set; }
        public DbSet<ApplicationDocument> ApplicationDocuments { get; set; }
        public DbSet<FeeCollectionManualDetail> FeeCollectionManualDetails { get; set; }
        public DbSet<Subject> Subjects { get; set; }
        public DbSet<CourseSubject> CourseSubjects { get; set; }
        public DbSet<ExamApplication> ExamApplications { get; set; }
        public DbSet<ExamApplicationDetail> ExamApplicationDetails { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // EducationDetail → Applications
            modelBuilder.Entity<EducationDetail>()
                .HasOne(e => e.Application)
                .WithMany(a => a.EducationDetails)
                .HasForeignKey(e => e.ApplicationId);

            // ApplicationCourseDetail → Applications
            modelBuilder.Entity<ApplicationCourseDetail>()
                .HasOne<Applications>()
                .WithMany(a => a.CourseDetails)
                .HasForeignKey(c => c.ApplicationId);

            modelBuilder.Entity<application_photo>()
                .HasIndex(x => x.ApplicationId)
                .IsUnique();

            // ApplicationDocument → Applications
            modelBuilder.Entity<ApplicationDocument>()
                .HasOne<Applications>()
                .WithMany(a => a.Documents)
                .HasForeignKey(d => d.ApplicationId);

            // SeatType → Applications
            modelBuilder.Entity<SeatType>()
                .HasOne<Applications>()
                .WithMany(a => a.SeatTypes)
                .HasForeignKey(s => s.ApplicationId);

            // ApplicationVerification → Applications (1-to-1)
            modelBuilder.Entity<ApplicationVerification>()
                .HasOne(v => v.Application)
                .WithOne(a => a.Verification)
                .HasForeignKey<ApplicationVerification>(v => v.ApplicationId);
        }

        public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            var entries = ChangeTracker.Entries<AuditBase>();

            foreach (var entry in entries)
            {
                if (entry.State == EntityState.Added)
                {
                    entry.Entity.InsertOn = DateTime.UtcNow;
                    entry.Entity.InsertBy = _currentUser.Username ?? "system";
                }

                if (entry.State == EntityState.Modified)
                {
                    entry.Entity.UpdateOn = DateTime.UtcNow;
                    entry.Entity.UpdateBy = _currentUser.Username ?? "system";
                }
            }

            foreach (var entry in ChangeTracker.Entries())
            {
                foreach (var property in entry.Properties)
                {
                    if (property.Metadata.ClrType == typeof(DateTime) && property.CurrentValue != null)
                    {
                        var dt = (DateTime)property.CurrentValue;
                        if (dt.Kind == DateTimeKind.Unspecified)
                            property.CurrentValue = DateTime.SpecifyKind(dt, DateTimeKind.Utc);
                    }

                    if (property.Metadata.ClrType == typeof(DateTime?) && property.CurrentValue != null)
                    {
                        var dt = (DateTime)property.CurrentValue;
                        if (dt.Kind == DateTimeKind.Unspecified)
                            property.CurrentValue = DateTime.SpecifyKind(dt, DateTimeKind.Utc);
                    }
                }
            }

            return await base.SaveChangesAsync(cancellationToken);
        }
    }
}