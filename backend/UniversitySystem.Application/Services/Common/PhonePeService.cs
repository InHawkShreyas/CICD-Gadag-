using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;

public class PhonePeService : IPhonePeService
{
    private readonly HttpClient _http;
    private readonly PhonePeSettings _settings;

    private string? _cachedToken;
    private DateTime _tokenExpiry = DateTime.MinValue;

  public PhonePeService(HttpClient http, IOptions<PhonePeSettings> options)

        {

            _http = http;

            _settings = options.Value;

        }

    private readonly SemaphoreSlim _tokenLock = new SemaphoreSlim(1, 1);
    // =============================
    // 🔐 TOKEN (CACHED PROPERLY)
    // =============================
    public async Task<string> GetAccessTokenAsync()
    {
        if (!string.IsNullOrEmpty(_cachedToken) && DateTime.UtcNow < _tokenExpiry)
            return _cachedToken;

        await _tokenLock.WaitAsync();

        try
        {
            if (!string.IsNullOrEmpty(_cachedToken) && DateTime.UtcNow < _tokenExpiry)
                return _cachedToken;

            Console.WriteLine("🔄 GENERATING NEW TOKEN");

            var url = $"{_settings.BaseUrl}/pg-sandbox/v1/oauth/token";

            var request = new HttpRequestMessage(HttpMethod.Post, url);

            request.Content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            { "client_id", _settings.ClientId },
            { "client_secret", _settings.ClientSecret },
            { "client_version", _settings.ClientVersion.ToString() },
            { "grant_type", "client_credentials" }
        });

            var response = await _http.SendAsync(request);
            var content = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
                throw new Exception("Auth Failed: " + content);

            var json = JsonDocument.Parse(content);

            var token = json.RootElement.GetProperty("access_token").GetString();
            var expiresIn = json.RootElement.GetProperty("expires_in").GetInt32();

            _tokenExpiry = DateTime.UtcNow.AddSeconds(expiresIn - 300);
            _cachedToken = token;

            return token!;
        }
        finally
        {
            _tokenLock.Release();
        }
    }
    // =============================
    // 🔥 COMMON HEADERS (FIXED)
    // =============================
    private void AddTspHeaders(HttpRequestMessage request)
    {
        request.Headers.Add("X-MERCHANT-ID", _settings.MerchantId);

        request.Headers.Add("X-SOURCE", "API"); // ✅ FIXED
        request.Headers.Add("X-SOURCE-CHANNEL", "WEB");

        request.Headers.Add("X-BROWSER-FINGERPRINT", "STATIC-FINGERPRINT-001");

        request.Headers.Add("X-MERCHANT-DOMAIN", "mgrdpradmissions.inhawk.com");

        request.Headers.Add("X-MERCHANT-IP", "127.0.0.1");

        request.Headers.Add("X-SOURCE-REDIRECTION-TYPE", "MERCHANT_REDIRECTION"); // ✅ FIXED

        request.Headers.Add("USER-AGENT", "Mozilla/5.0"); // ✅ YOU WERE MISSING THIS
    }
    // =============================
    // 💰 CREATE PAYMENT
    // =============================
    public async Task<PhonePeCreateResponse> CreatePaymentAsync(PhonePeCreateRequest req)
    {
        var token = await GetAccessTokenAsync();

        var url = $"{_settings.BaseUrl}/pg-sandbox/checkout/v2/pay";

        var request = new HttpRequestMessage(HttpMethod.Post, url);

        request.Headers.Authorization =
            new AuthenticationHeaderValue("O-Bearer", token);

        AddTspHeaders(request);

        var payload = new
        {
            merchantOrderId = req.ReceiptNumber,
            amount = (long)(req.Amount * 100),
            expireAfter = 1200,

            paymentFlow = new
            {
                type = "PG_CHECKOUT",
                message = $"Fee payment for {req.ApplicationNo}",
                merchantUrls = new
                {
                    redirectUrl = $"{_settings.RedirectUrl}?receipt={req.ReceiptNumber}"
                }
            },

            disablePaymentRetry = true,

            metaInfo = new
            {
                udf1 = req.ApplicationNo,
                udf2 = req.Name,
                udf3 = req.ReceiptNumber,
                udf4 = req.Email,
                udf5 = req.Phone
            }
        };

        request.Content = new StringContent(
            JsonSerializer.Serialize(payload),
            Encoding.UTF8,
            "application/json"
        );

        var response = await _http.SendAsync(request);
        var content = await response.Content.ReadAsStringAsync();

        Console.WriteLine("CREATE RESPONSE: " + content);

        if (!response.IsSuccessStatusCode)
            throw new Exception("Create Payment Failed: " + content);

        var json = JsonDocument.Parse(content);

        return new PhonePeCreateResponse
        {
            RedirectUrl = json.RootElement.GetProperty("redirectUrl").GetString()!,
            ReceiptNumber = req.ReceiptNumber
        };
    }

  
    // =============================
    // 🔍 VERIFY PAYMENT
    // =============================
    public async Task<PhonePeVerifyResponse> VerifyPaymentAsync(string merchantOrderId)
    {
        var token = await GetAccessTokenAsync();

        var url = $"{_settings.BaseUrl}/pg-sandbox/checkout/v2/order/{merchantOrderId}/status";

        var request = new HttpRequestMessage(HttpMethod.Get, url);

        request.Headers.Authorization =
            new AuthenticationHeaderValue("O-Bearer", token);

        AddTspHeaders(request);

        var response = await _http.SendAsync(request);
        var content = await response.Content.ReadAsStringAsync();

        Console.WriteLine("VERIFY RESPONSE: " + content);

        if (!response.IsSuccessStatusCode)
            throw new Exception("Verify Failed: " + content);

        var json = JsonDocument.Parse(content);
        var root = json.RootElement;

        var phonePeOrderId = root.TryGetProperty("orderId", out var oid)
            ? oid.GetString()
            : null;

        var rawState = root.TryGetProperty("state", out var s)
            ? s.GetString()
            : "UNKNOWN";

        var status = rawState switch
        {
            "COMPLETED" => "SUCCESS",
            "FAILED" => "FAILED",
            _ => "PENDING"
        };

        double amount = root.TryGetProperty("amount", out var amt)
            ? amt.GetInt64() / 100.0
            : 0;

        string? txnId = null;

        if (root.TryGetProperty("paymentDetails", out var pd) &&
            pd.ValueKind == JsonValueKind.Array &&
            pd.GetArrayLength() > 0)
        {
            var first = pd[0];

            if (first.TryGetProperty("transactionId", out var t))
                txnId = t.GetString();
            else if (first.TryGetProperty("paymentTransactionId", out var pt))
                txnId = pt.GetString();
        }

        return new PhonePeVerifyResponse
        {
            Status = status,
            TransactionId = txnId,
            Amount = amount,
            OrderId = phonePeOrderId
        };
    }

    public async Task StartOrderPolling(string merchantOrderId)
    {
        for (int i = 0; i < 20; i++) // ~20 mins max
        {
            var result = await VerifyPaymentAsync(merchantOrderId);

            Console.WriteLine($"Polling → {merchantOrderId} = {result.Status}");

            if (result.Status == "SUCCESS" || result.Status == "FAILED")
            {
                // stop polling
                return;
            }

            await Task.Delay(5000); // 5 sec interval (acceptable for UAT)
        }
    }
}