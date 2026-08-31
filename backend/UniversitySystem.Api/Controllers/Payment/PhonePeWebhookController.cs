using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/phonepe/webhook")]
public class PhonePeWebhookController : ControllerBase
{
    private readonly IFeeCollectionService _feeService;
    private readonly IConfiguration _config;

    public PhonePeWebhookController(IFeeCollectionService feeService, IConfiguration config)
    {
        _feeService = feeService;
        _config = config;
    }

    [HttpPost]
   [HttpPost]
public async Task<IActionResult> ReceiveWebhook([FromBody] JsonElement root)
{
    try
    {
        // =============================
        // 🔐 AUTH VALIDATION
        // =============================
        var authHeader = Request.Headers["Authorization"].ToString();

        var expected = GenerateAuthHeader(
            _config["PhonePe:WebhookUsername"],
            _config["PhonePe:WebhookPassword"]
        );

        var cleanedAuth = authHeader.Replace("SHA256 ", "", StringComparison.OrdinalIgnoreCase).Trim();
        var cleanedExpected = expected.Replace("SHA256 ", "", StringComparison.OrdinalIgnoreCase).Trim();

        if (string.IsNullOrEmpty(authHeader) ||
            !cleanedAuth.Equals(cleanedExpected, StringComparison.OrdinalIgnoreCase))
        {
            Console.WriteLine("❌ AUTH FAILED");
            return Unauthorized();
        }

        // =============================
        // 🧠 HANDLE EMPTY BODY SAFELY
        // =============================
        if (root.ValueKind == JsonValueKind.Undefined ||
            root.ValueKind == JsonValueKind.Null)
        {
            Console.WriteLine("⚠️ EMPTY / INVALID BODY");
            return Ok();
        }

        // =============================
        // 📌 EVENT
        // =============================
        string? eventType = null;

        if (root.TryGetProperty("event", out var ev))
            eventType = ev.GetString();
        else if (root.TryGetProperty("type", out var tp))
            eventType = tp.GetString();

        if (string.IsNullOrEmpty(eventType))
            return Ok();

        eventType = eventType.ToLower();

        if (!eventType.Contains("completed") && !eventType.Contains("failed"))
            return Ok();

        // =============================
        // 📦 PAYLOAD SAFE READ
        // =============================
        if (!root.TryGetProperty("payload", out var payload))
        {
            Console.WriteLine("⚠️ NO PAYLOAD");
            return Ok();
        }

        var merchantOrderId = payload.TryGetProperty("merchantOrderId", out var mo)
            ? mo.GetString()
            : null;

        var phonePeOrderId = payload.TryGetProperty("orderId", out var oid)
            ? oid.GetString()
            : null;

        var state = payload.TryGetProperty("state", out var st)
            ? st.GetString()
            : null;

        if (string.IsNullOrEmpty(merchantOrderId) || string.IsNullOrEmpty(state))
        {
            Console.WriteLine("⚠️ INVALID DATA");
            return Ok();
        }

        var status = state switch
        {
            "COMPLETED" => "SUCCESS",
            "FAILED" => "FAILED",
            _ => "PENDING"
        };

        double amount = payload.TryGetProperty("amount", out var amt)
            ? amt.GetInt64() / 100.0
            : 0;

        string? txnId = null;

        if (payload.TryGetProperty("paymentDetails", out var pd) &&
            pd.ValueKind == JsonValueKind.Array &&
            pd.GetArrayLength() > 0)
        {
            var first = pd[0];

            if (first.TryGetProperty("transactionId", out var t))
                txnId = t.GetString();
        }

        Console.WriteLine($"✅ WEBHOOK OK → {merchantOrderId} | {status}");

        await _feeService.UpdatePaymentAsync(new UpdatePaymentDto
        {
            ReceiptNumber = merchantOrderId,
            OrderId = phonePeOrderId,
            TransactionId = txnId,
            PaidAmount = (decimal)amount,
            Status = status,
            PaymentDate = DateTime.UtcNow
        });

        return Ok();
    }
    catch (Exception ex)
    {
        Console.WriteLine("🔥 WEBHOOK ERROR: " + ex.Message);
        return Ok(); // never fail webhook
    }
}

    // =============================
    // 🔐 HASH GENERATOR
    // =============================
    private string GenerateAuthHeader(string username, string password)
    {
        var raw = $"{username}:{password}";
        using var sha = SHA256.Create();
        var hash = sha.ComputeHash(Encoding.UTF8.GetBytes(raw));

        return "SHA256 " + BitConverter.ToString(hash).Replace("-", "").ToLower();
    }
}