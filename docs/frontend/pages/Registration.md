# Registration Page

- Route: `/registration`
- Source: `frontend/web/src/features/auth/registration.tsx`

Purpose:
- Multi-step user registration for applicants: admission type → basic info → OTP verification → password setup.

Key behaviors:
- Creates registration via `registrationService.createRegistration()`.
- Sends OTP with `otpService.sendOtp()` and verifies with `otpService.verifyOtp()`.
- Finalizes account by calling `loginService.setPassword()` and assigning student role.

Form fields & validation:
- Basic info: `username`, `name`, `email`, `mobile`, `dob`, `nationality`, `aadhar` or `passport` depending on nationality. Validations: name alphabet-only, email regex, Indian mobile pattern, Aadhar 12 digits.
- Password rules: min 8 chars, uppercase, number, confirm match.

Notes:
- Supports checking previous registration numbers for 2nd-year intake via `studentService.getStudents()`.
