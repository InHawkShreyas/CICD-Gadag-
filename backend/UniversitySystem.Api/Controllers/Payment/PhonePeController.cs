using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
public class PhonePeController : ControllerBase
{
    private readonly IPhonePeService _phonePeService;

    public PhonePeController(IPhonePeService phonePeService)
    {
        _phonePeService = phonePeService;
    }

    // =============================
    // ✅ CREATE PAYMENT
    // =============================
   [HttpPost("create")]
public async Task<IActionResult> CreatePayment([FromBody] PhonePeCreateRequest request)
{
    try
    {
        if (request == null)
            return BadRequest(new { message = "Invalid request" });

        if (string.IsNullOrWhiteSpace(request.ReceiptNumber))
            return BadRequest(new { message = "Receipt number is required" });

        if (request.Amount <= 0)
            return BadRequest(new { message = "Amount must be greater than 0" });

        var result = await _phonePeService.CreatePaymentAsync(request);

        // 🔥 START ORDER STATUS POLLING (background, don't block API)
        _ = Task.Run(async () =>
        {
            try
            {
                await _phonePeService.StartOrderPolling(request.ReceiptNumber);
            }
            catch (Exception ex)
            {
                Console.WriteLine("Polling Error: " + ex.Message);
            }
        });

        return Ok(new
        {
            success = true,
            redirectUrl = result.RedirectUrl,
            receiptNumber = result.ReceiptNumber
        });
    }
    catch (Exception ex)
    {
        return StatusCode(500, new
        {
            message = "Failed to create PhonePe payment",
            error = ex.Message
        });
    }
}

    // =============================
    // ✅ VERIFY PAYMENT
    // =============================
    [HttpGet("verify/{receiptNo}")]
    public async Task<IActionResult> VerifyPayment(string receiptNo)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(receiptNo))
                return BadRequest(new { message = "Receipt number is required" });

            var result = await _phonePeService.VerifyPaymentAsync(receiptNo);

            return Ok(new
            {
                success = true,
                status = result.Status
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                message = "Verification failed",
                error = ex.Message
            });
        }
    }

    // =============================
    // ✅ REFUND (optional)
    // =============================
    [HttpPost("refund")]
    public IActionResult Refund()
    {
        // Not implemented yet
        return Ok(new
        {
            success = false,
            message = "Refund not implemented"
        });
    }

    // =============================
    // ✅ SETTLEMENT (optional)
    // =============================
    [HttpGet("settlement/{receiptNo}")]
    public IActionResult Settlement(string receiptNo)
    {
        return Ok(new
        {
            success = false,
            message = "Settlement not implemented"
        });
    }
}