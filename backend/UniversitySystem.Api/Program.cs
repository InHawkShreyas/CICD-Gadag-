using System.Text;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

using UniversitySystem.Infrastructure.Data;
using UniversitySystem.Infrastructure.Services;
using Microsoft.OpenApi.Models;
using KVFSU.Application.Common.Settings;
using KVFSU.Application.Interfaces.Common;
using KVFSU.Application.Services.Common;
using Microsoft.Extensions.FileProviders;
using QuestPDF.Infrastructure;
using Microsoft.Extensions.Options;

AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

// ================= 🔥 DATABASE =================
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        npgsqlOptions =>
        {
            npgsqlOptions.CommandTimeout(30); // prevent hanging queries
        }
    )
    .EnableSensitiveDataLogging() // debug
    .LogTo(Console.WriteLine) // log DB queries
);
builder.Services.AddScoped<IApplicationRepository, ApplicationRepository>();

QuestPDF.Settings.License = LicenseType.Community;

// ================= 🔥 JWT SETTINGS =================
var jwtSettings = new JwtSettings();
builder.Configuration.GetSection("Jwt").Bind(jwtSettings);
builder.Services.AddSingleton(jwtSettings);
builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection("Jwt"));

var key = Encoding.UTF8.GetBytes(jwtSettings.Key);

// ================= 🔐 AUTHENTICATION =================
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    var jwt = builder.Configuration.GetSection("Jwt").Get<JwtSettings>()
        ?? throw new InvalidOperationException("Jwt configuration is missing.");

    options.RequireHttpsMetadata = false;
    options.SaveToken = true;

    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,

        ValidIssuer = jwt.Issuer,
        ValidAudience = jwt.Audience,
        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(jwt.Key)
        ),
        ClockSkew = TimeSpan.Zero
    };
});
// ================= 🔐 AUTHORIZATION =================
builder.Services.AddAuthorization();

// ================= 🌐 CORS (🔥 FIX HERE) =================
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy
            .WithOrigins("http://localhost:5174","https://mgrdpradmissions.inhawk.com", "http://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod()
             .WithExposedHeaders("Content-Disposition");
    });
});

// ================= 👤 CURRENT USER =================
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();

builder.Services.Configure<SmsSettings>(
    builder.Configuration.GetSection("SmsSettings"));

// 🔥 HttpClient registration (keep this BEFORE scan)
builder.Services.AddHttpClient<ISmsService, SmsService>();
builder.Services.AddScoped<IFileService, FileService>();

builder.Services.Configure<PhonePeSettings>(
    builder.Configuration.GetSection("PhonePe"));

// HttpClient + Singleton combo (correct way)
builder.Services.AddHttpClient<IPhonePeService, PhonePeService>();

builder.Services.AddSingleton<IPhonePeService>(sp =>
{
    var factory = sp.GetRequiredService<IHttpClientFactory>();
    var client = factory.CreateClient(typeof(IPhonePeService).Name);
    var options = sp.GetRequiredService<IOptions<PhonePeSettings>>();

    return new PhonePeService(client, options);
});
// ================= 🔥 SCRUTOR =================
builder.Services.Scan(scan => scan
    .FromAssemblies(
        typeof(ILookupRepository).Assembly,   // Infrastructure
        typeof(LookupRepository).Assembly,    // Infrastructure
        typeof(ILookupService).Assembly       // 🔥 Application (FIX)
    )
    .AddClasses(c => c.Where(type =>
        (type.Name.EndsWith("Service") || type.Name.EndsWith("Repository")) &&
        !type.IsAbstract &&
        !type.IsGenericType &&
        type.Name != "SmsService" // 🔥 avoid conflict with HttpClient
    ))
    .AsImplementedInterfaces()
    .WithScopedLifetime()
);

// ================= 🔥 CONTROLLERS =================
builder.Services.AddControllers().AddJsonOptions(x =>
    x.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles);

// ================= 🔥 SWAGGER =================
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "UniversitySystem API",
        Version = "v1"
    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter: Bearer {your JWT token}"
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] {}
        }
    });
});

// ================= 🔥 BUILD APP =================
var app = builder.Build();

// ================= 🔥 MIDDLEWARE =================
app.UseRouting();

// ✅ Serve frontend (wwwroot)
app.UseStaticFiles();

// ================= 📁 ATTACHMENTS =================
var attachmentsPath = builder.Configuration["FileStorage:AttachmentsPath"];

if (string.IsNullOrWhiteSpace(attachmentsPath))

{

    attachmentsPath = Path.Combine(builder.Environment.ContentRootPath, "Attachments");

}

else if (!Path.IsPathRooted(attachmentsPath))

{

    // 🔥 convert relative → absolute

    attachmentsPath = Path.Combine(builder.Environment.ContentRootPath, attachmentsPath);

}

// Ensure folder exists
Directory.CreateDirectory(attachmentsPath);

// Serve files from mounted folder
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(attachmentsPath),
    RequestPath = "/Attachments"
});

// 🔥 CORS MUST BE HERE
app.UseCors("AllowFrontend");

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// 🔥 IMPORTANT for React routing
app.MapFallbackToFile("index.html");

app.Run();