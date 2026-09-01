using Npgsql;

namespace PlaywrightTests.Utilities;

public static class DbHelper
{
    private static readonly string ConnectionString =
        $"Host={ConfigReader.DbHost};" +
        $"Port={ConfigReader.DbPort};" +
        $"Database={ConfigReader.DbName};" +
        $"Username={ConfigReader.DbUsername};" +
        $"Password={ConfigReader.DbPassword};";

    public static async Task MarkApplicationFeePaidAsync(string username)
    {
        await using var conn = new NpgsqlConnection(ConnectionString);
        await conn.OpenAsync();

        await using var cmd = new NpgsqlCommand(@"
            UPDATE admission.application_fees af
            SET payment_status = 'Paid',
                updated_at = NOW()
            FROM admission.applications a
            JOIN auth.registration r ON a.registration_id = r.id
            WHERE af.application_id = a.id
              AND r.username = @username
              AND af.payment_status != 'Paid'", conn);

        cmd.Parameters.AddWithValue("username", username);
        await cmd.ExecuteNonQueryAsync();
    }

    public static async Task<string?> GetUsernameAsync(string email)
    {
        await using var conn = new NpgsqlConnection(ConnectionString);
        await conn.OpenAsync();

        await using var cmd = new NpgsqlCommand(
            "SELECT username FROM auth.registration WHERE email = @email LIMIT 1", conn);

        cmd.Parameters.AddWithValue("email", email);
        return (string?)await cmd.ExecuteScalarAsync();
    }

    public static async Task<string> GetLatestOtpAsync(string mobile, int timeoutMs = 15000, int intervalMs = 500)
    {
        var deadline = DateTime.UtcNow.AddMilliseconds(timeoutMs);

        while (DateTime.UtcNow < deadline)
        {
            await using var conn = new NpgsqlConnection(ConnectionString);
            await conn.OpenAsync();

            await using var cmd = new NpgsqlCommand(@"
                SELECT otp FROM auth.otp_logs
                WHERE mobile = @mobile
                ORDER BY insert_on DESC
                LIMIT 1", conn);

            cmd.Parameters.AddWithValue("mobile", mobile);
            var result = await cmd.ExecuteScalarAsync();

            if (result is not null)
                return result.ToString()!;

            await Task.Delay(intervalMs);
        }

        throw new TimeoutException(
            $"OTP for mobile {mobile} not found in DB within {timeoutMs}ms.");
    }

    public static string GenerateMobile()
    {
        var random = new Random();
        return "9" + string.Concat(
            Guid.NewGuid().ToString("N").Take(9).Select(c =>
                char.IsDigit(c) ? c : (char)('0' + random.Next(0, 10))));
    }

    public static string GenerateAadhaar()
    {
        var random = new Random();
        return "7" + string.Concat(
            Guid.NewGuid().ToString("N").Take(11).Select(c =>
                char.IsDigit(c) ? c : (char)('0' + random.Next(0, 10))));
    }
}