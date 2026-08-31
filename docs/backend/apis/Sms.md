# SMS API

- Base route: `api/sms`

Endpoints:
- `POST /api/sms/send` — Send custom SMS. Parameters: `mobile`, `message`.
- `POST /api/sms/send-otp` — Send OTP to mobile (testing endpoint returns generated OTP).

Notes:
- Intended for internal/testing; OTP value returned in response should be disabled in production.
