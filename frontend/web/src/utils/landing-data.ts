export interface NavItem {
  id: string;
  label: string;
}

export interface ApplicationStep {
  step: number;
  phase: string;
  title: string;
  bg: string;
  badge: string;
  details: string[];
}

export interface Programme {
  code: string;
  name: string;
  school?: string;
}

export interface EligibilityRow {
  prog: string;
  criteria: string;
}

export interface DocumentItem {
  doc: string;
  desc: string;
}

export interface DateRow {
  label: string;
  date: string;
}

export interface RefundRow {
  sl: number;
  pct: string;
  condition: string;
}

export interface PrivacyItem {
  title: string;
  body: string;
}

/* ------------------------------------------------------------------ */
/* Navigation                                                          */
/* ------------------------------------------------------------------ */

export const navItems: NavItem[] = [
  { id: "home", label: "Steps to Apply" },
  { id: "admission", label: "Admission" },
  { id: "notification", label: "Notifications" },
  { id: "faq", label: "FAQ" },
  { id: "contact", label: "Contact Us" },
];

export const footerQuickLinks: NavItem[] = [
  { id: "home", label: "Steps to Apply" },
  { id: "admission", label: "Admission" },
  { id: "notification", label: "Notifications" },
  { id: "terms", label: "Terms & Conditions" },
  { id: "privacy", label: "Privacy Policy" },
  { id: "faq", label: "FAQ" },
];

/* ------------------------------------------------------------------ */
/* Steps to Apply                                                       */
/* ------------------------------------------------------------------ */

export const applicationSteps: ApplicationStep[] = [
  {
    step: 1,
    phase: "Online Application",
    title: "Register",
    bg: "bg-white/10 border-white/20",
    badge: "bg-accent text-secondary",
    details: [
      "Create your account using Aadhaar number, mobile number & email.",
      "An OTP will be sent to your mobile/email for verification.",
      "Each Aadhaar / mobile number can be used only once.",
    ],
  },
  {
    step: 2,
    phase: "Online Application",
    title: "Personal & Address Details",
    bg: "bg-white/10 border-white/20",
    badge: "bg-accent text-secondary",
    details: [
      "Log in and fill in your personal details (name, DOB, category, etc.).",
      "Provide your current and permanent address.",
    ],
  },
  {
    step: 3,
    phase: "Online Application",
    title: "Select Programme & Seat Type",
    bg: "bg-white/10 border-white/20",
    badge: "bg-accent text-secondary",
    details: [
      "Choose the degree programme you wish to apply for.",
      "Select the seat type / reservation category you are eligible for.",
    ],
  },
  {
    step: 4,
    phase: "Online Application",
    title: "Upload Photo & Signature",
    bg: "bg-white/10 border-white/20",
    badge: "bg-accent text-secondary",
    details: [
      "Upload a recent passport-size photograph.",
      "Upload a scanned copy of your signature.",
    ],
  },
  {
    step: 5,
    phase: "Online Application",
    title: "Upload Required Documents",
    bg: "bg-white/10 border-white/20",
    badge: "bg-accent text-secondary",
    details: [
      "Upload scanned copies of all supporting documents (mark sheets, caste certificate, study certificate, etc.).",
    ],
  },
  {
    step: 6,
    phase: "Online Application",
    title: "Pay Application Fee",
    bg: "bg-white/10 border-white/20",
    badge: "bg-accent text-secondary",
    details: [
      "Pay the application fee online.",
      "Download and save the payment receipt.",
    ],
  },
  {
    step: 7,
    phase: "Verification",
    title: "Document Verification",
    bg: "bg-white/10 border-white/20",
    badge: "bg-yellow-400 text-gray-900",
    details: [
      "University officials will verify your uploaded documents.",
      "You will be notified of the verification outcome via the portal.",
    ],
  },
  {
    step: 8,
    phase: "Verification",
    title: "Physical Document Submission",
    bg: "bg-white/10 border-white/20",
    badge: "bg-yellow-400 text-gray-900",
    details: [
      "Bring physical originals + self-attested copies of all uploaded documents.",
      "Report to the university on the scheduled counseling/verification date.",
    ],
  },
  {
    step: 9,
    phase: "Admission",
    title: "Admission Fee Payment",
    bg: "bg-white/10 border-white/20",
    badge: "bg-green-400 text-gray-900",
    details: [
      "Pay the admission fee as per your programme fee structure.",
      "Keep the fee receipt — it is required during final admission.",
    ],
  },
  {
    step: 10,
    phase: "Admission",
    title: "Provisional Admit Card",
    bg: "bg-white/10 border-white/20",
    badge: "bg-green-400 text-gray-900",
    details: [
      "A Provisional Admit Card will be issued after successful fee payment.",
      "Download and print the Provisional Admit Card from the portal.",
    ],
  },
  {
    step: 11,
    phase: "Admission",
    title: "Final Admission",
    bg: "bg-white/10 border-white/20",
    badge: "bg-green-400 text-gray-900",
    details: [
      "Submit the Provisional Admit Card along with the fee payment receipt at the time of admission.",
      "Carry all original documents for final verification.",
      "Admission is confirmed only after this step.",
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Under Graduate                                                       */
/* ------------------------------------------------------------------ */

export const ugProgrammes: Programme[] = [
  { code: "B.Sc", name: "Agri-business and Food Processing", school: "School of Agri-business Management & Rural Development" },
  { code: "B.B.A", name: "Bachelor of Business Administration", school: "School of Agri-business Management & Rural Development" },
  { code: "B.A", name: "Rural Development and Political Science", school: "School of Rural Development and Panchayat Raj" },
  { code: "B.Sc", name: "Geoinformatics and Computer Science", school: "School of Environmental Science, Public Health & Sanitation Management" },
  { code: "B.P.H", name: "Bachelor of Public Health", school: "School of Social Science and Rural Reconstruction" },
  { code: "B.Com", name: "Innovation and Start-ups", school: "School of Skill and Entrepreneurship Development" },
  { code: "B.C.A", name: "Bachelor of Computer Application", school: "School of Skill and Entrepreneurship Development" },
];

export const ugEligibility: EligibilityRow[] = [
  {
    prog: "B.A",
    criteria: "PUC / 10+2 (any board) OR 3-year Diploma (any subject) OR 3-year Diploma in Allied Health Sciences after 10th / SSLC OR 2-year Diploma in Allied Health Sciences after PUC OR 2 years in JOC / JODC / JLDC / ITI (any subject).",
  },
  {
    prog: "B.Com",
    criteria: "PUC / 10+2 (any board) OR 3-year Diploma (10+2) / PUC OR 2 years in JOC / JODC / JLDC / ITI — with Commerce.",
  },
  {
    prog: "B.Sc (Agri-Business & Food Processing)",
    criteria: "PUC / 10+2 (any board) OR 3-year Diploma (any subject) OR 3-year (10+2) / PUC OR 2-year Diploma from Farm / Agriculture / Veterinary Universities. 10% seats reserved for 2-year Diploma from Farm/Agriculture/Veterinary Universities.",
  },
  {
    prog: "B.Sc (Geoinformatics & Computer Science)",
    criteria: "PUC / 10+2 (any board) OR 3-year Diploma (any subject) OR 3-year (10+2) / PUC OR 2 years in JOC / JODC / JLDC / ITI.",
  },
  {
    prog: "B.B.A",
    criteria: "PUC / 10+2 from any stream (Arts, Science, Commerce) OR 3-year Diploma (10+2) / PUC OR 2 years in JOC / JODC / JLDC / ITI.",
  },
  {
    prog: "B.P.H",
    criteria: "PUC / 10+2 (any board) OR 3-year Diploma (any subject) OR 3-year Diploma in Allied Health Sciences after 10th / SSLC OR 2-year Diploma in Allied Health Sciences after PUC OR 2 years in JOC / JODC / JLDC / ITI (any subject).",
  },
  {
    prog: "B.C.A",
    criteria: "PUC / 10+2 with Science or Commerce with Mathematics / Business Mathematics / Accountancy / Computer Science OR 3-year Diploma with Computer Science / Information Science OR 2-year JOC / ITI with Computer Science.",
  },
];

export const ugDocuments: DocumentItem[] = [
  { doc: "SSLC Marks Card", desc: "10th Std. or equivalent examination marks card." },
  { doc: "PUC II Marks Card", desc: "PUC II year or equivalent examination marks card." },
  { doc: "Caste / Income Certificate", desc: "Form D (SC/ST), Form E (Cat-I), Form F (OBC 2A/2B/3A/3B) issued by Jurisdictional Tahasildar." },
  { doc: "Study Certificate", desc: "Certificate showing 7 years of study in Karnataka (1st–12th Std.), countersigned by BEO / DDPI." },
  { doc: "Rural Study Certificate", desc: "Required for Rural quota claimants; issued by school Head and countersigned by BEO." },
  { doc: "Hyderabad-Karnataka Certificate", desc: "Certificate issued by a Competent Authority for HK region candidates." },
  { doc: "Transfer / Migration Certificate", desc: "Must be submitted within 3 months from the date of admission." },
];

export const ugSpecialSeats: [string, string][] = [
  ["Non-Karnataka Candidates", "15% of total seats"],
  ["Hyderabad-Karnataka", "8% of total seats"],
  ["Differently Abled (DA)", "5% of total seats"],
  ["NSS Quota", "1 seat per programme"],
  ["NCC Quota (min. NCC 'C' cert.)", "1 seat per programme"],
  ["Cultural Quota", "1 seat per programme"],
  ["Sports Quota", "1 seat per programme"],
  ["Defence Quota", "1 seat per programme"],
  ["Transgender", "1 seat per programme"],
  ["Kashmiri Migrant", "1 seat per programme"],
  ["Jammu & Kashmir Students", "2 seats per programme"],
  ["Foreign National", "2 seats per programme"],
];

/* ------------------------------------------------------------------ */
/* Post Graduate                                                        */
/* ------------------------------------------------------------------ */

export const pgProgrammes: Programme[] = [
  { code: "M.A.", name: "Rural Development (Panchayat Raj / Co-operative Management)" },
  { code: "M.A.", name: "Public Administration" },
  { code: "M.A.", name: "Economics (Development Economics)" },
  { code: "M.A.", name: "Political Science (Panchayat Raj / Rural Development)" },
  { code: "M.S.W.", name: "Community Development / Community Health / Human Resource Management" },
  { code: "M.Com.", name: "Entrepreneurship / Co-operative Management" },
  { code: "M.Sc.", name: "Geoinformatics" },
  { code: "M.Sc.", name: "Food Science & Technology" },
  { code: "M.C.A.", name: "Master of Computer Applications (Artificial Intelligence)" },
  { code: "M.P.H.", name: "Master of Public Health" },
  { code: "M.B.A.", name: "Rural Management (Agribusiness Management / Rural Development Management / Financial Management / Human Resource Management)" },
];

export const pgEligibility: EligibilityRow[] = [
  {
    prog: "M.A. RD (PR/CM), M.A. (PA), M.S.W., M.B.A. Rural Management",
    criteria: "Any Graduate with a minimum of 50% (45% for SC/ST/Cat-I/Differently Abled candidates) of marks in the aggregate of all subjects at Bachelor's Degree level. M.B.A. eligibility is as recommended by the Government of Karnataka from time to time.",
  },
  {
    prog: "M.A. Economics (Development Economics)",
    criteria: "Any Graduate with Economics as major or optional subject / Agricultural Marketing subject, with a minimum of 50% (45% for SC/ST/Cat-I/DA) of marks in the subjects at degree level.",
  },
  {
    prog: "M.A. Political Science (PR & RD)",
    criteria: "Any Graduate with Political Science as major or optional subject, with a minimum of 50% (45% for SC/ST/Cat-I/DA) of marks in the subjects at degree level.",
  },
  {
    prog: "M.Com. (Entrepreneurship / Co-operative Management)",
    criteria: "B.Com / B.B.A / B.B.M Graduates with 50% (45% for SC/ST/Cat-I/DA) of marks in the aggregate of Commerce subjects.",
  },
  {
    prog: "M.Sc. (Geoinformatics)",
    criteria: "Any Science (incl. Farm Sciences) or Engineering Graduate with min. 50% (45% for SC/ST/Cat-I/DA) aggregate. Preference order: (1) Science/Engineering graduate with Mathematics at Degree or PUC, (2) M.Sc. Geography Post-Graduates, (3) Graduate with Geography as optional/major subject. 15% of seats earmarked for M.Sc. PGs in Geography, Geology & Environmental Science.",
  },
  {
    prog: "M.C.A. (Master of Computer Applications)",
    criteria: "B.C.A / Bachelor's in Computer Science Engineering or equivalent, OR B.Sc / B.Com / B.B.A / B.A with Mathematics at PUC or Graduation level (with bridge courses as per University norms), with min. aggregate 50% across all years of the Degree. 45% for SC/ST/Cat-I Karnataka candidates.",
  },
  {
    prog: "M.Sc. (Food Science & Technology)",
    criteria: "Any Science (incl. Farm Sciences) or Engineering Graduate with min. 50% (45% for SC/ST/Cat-I/DA) aggregate of optional subjects, provided the candidate has studied Chemistry/Bio-chemistry and one Life Science subject either at degree or PUC level.",
  },
  {
    prog: "M.P.H. (Master of Public Health)",
    criteria: "Any graduate with min. 50% (45% for SC/ST/Cat-I/DA) aggregate marks. Preference given to candidates with experience in the Health field.",
  },
];

export const pgSpecialSeats: [string, string][] = [
  ["Non-Karnataka Candidates", "15% of total seats"],
  ["Hyderabad-Karnataka", "8% of total seats"],
  ["Differently Abled (DA)", "5% of total seats"],
  ["RDPR Dept. Employees", "2 seats per programme (over & above intake)"],
  ["NSS Quota", "1 seat per programme"],
  ["NCC Quota (min. NCC 'C' cert.)", "1 seat per programme"],
  ["Cultural Quota", "1 seat per programme"],
  ["Sports Quota", "1 seat per programme"],
  ["Defence Quota", "1 seat per programme"],
  ["Transgender", "1 seat per programme"],
  ["Kashmiri Migrant", "1 seat per programme"],
  ["Jammu & Kashmir Students", "2 seats per programme"],
  ["Foreign National", "2 seats per programme"],
];

export const pgDocuments: DocumentItem[] = [
  { doc: "SSLC Marks Card", desc: "10th Std. or equivalent examination marks card." },
  { doc: "Qualifying Degree Marks Card", desc: "Marks cards for all three or four years of the qualifying Bachelor's degree." },
  { doc: "Caste / Income Certificate", desc: "Form D (SC/ST), Form E (Cat-I), Form F (OBC 2A/2B/3A/3B) issued by Jurisdictional Tahasildar." },
  { doc: "Study Certificate", desc: "Certificate showing 7 years of study in Karnataka (1st–12th Std.), countersigned by BEO / DDPI." },
  { doc: "Rural Study Certificate", desc: "Required for Rural quota claimants; issued by school Head and countersigned by BEO." },
  { doc: "Hyderabad-Karnataka Certificate", desc: "Certificate issued by a Competent Authority for HK region candidates." },
  { doc: "Transfer / Migration Certificate", desc: "Must be submitted within 3 months from the date of admission." },
  { doc: "Aadhaar Card", desc: "Photocopy required along with the application." },
];

export const pgImportantDates: DateRow[] = [
  { label: "Last date for submission of application", date: "31-07-2026" },
  { label: "Notification of Provisional Merit cum Selection List", date: "04-08-2026" },
  { label: "Last date to file objections to Provisional Merit list", date: "05-08-2026" },
  { label: "Final Merit cum Selection List, Counselling & Admission", date: "06-08-2026 to 11-08-2026" },
  { label: "Counselling & Admission — Wait List", date: "12-08-2026 to 14-08-2026" },
  { label: "Commencement of 1st Semester Classes", date: "To be intimated later" },
];

/* ------------------------------------------------------------------ */
/* Shared (UG + PG)                                                     */
/* ------------------------------------------------------------------ */

export const reservationCategories: [string, string][] = [
  ["Scheduled Caste (SC)", "17%"],
  ["Scheduled Tribe (ST)", "7%"],
  ["Category I", "4%"],
  ["Category II A", "15%"],
  ["Category II B", "4%"],
  ["Category III A", "4%"],
  ["Category III B", "5%"],
  ["General Merit (GM)", "44%"],
];

/* ------------------------------------------------------------------ */
/* Terms & Conditions                                                   */
/* ------------------------------------------------------------------ */

export const refundTable: RefundRow[] = [
  { sl: 1, pct: "100%", condition: "15 days or more before the formally notified last date of admission. (Max. 5% of fees or Rs. 5,000/- deducted as processing charges.)" },
  { sl: 2, pct: "90%", condition: "Less than 15 days before the formally notified last date of admission." },
  { sl: 3, pct: "80%", condition: "15 days or less after the formally notified last date of admission." },
  { sl: 4, pct: "50%", condition: "30 days or less, but more than 15 days, after the formally notified last date of admission." },
  { sl: 5, pct: "NIL", condition: "More than 30 days after formally notified last date of admission." },
];

export const cancellationDocuments: string[] = [
  "Original Provisional Admission Card",
  "Original Fee Receipt",
  "Application for cancellation of seat and refund of fee paid with clear and complete correspondence address.",
];

export const miscellaneousTerms: string[] = [
  "No individual communication will be sent to the candidates.",
  "All Admissions made are Provisional. The University reserves the right to approve or cancel the admission.",
];


export const privacyPolicyItems: PrivacyItem[] = [
  {
    title: "Information We Collect",
    body: "We collect personal details (name, date of birth, contact information), identity documents (Aadhaar, passport), academic records, category certificates, and address details solely for processing your admission application.",
  },
  {
    title: "How We Use Your Information",
    body: "Your information is used exclusively for admission processing, verification of eligibility, generation of your application number, communication regarding your application status, and maintenance of university records.",
  },
  {
    title: "Data Security",
    body: "All data submitted through this portal is stored securely. Access is restricted to authorised university personnel only. We take reasonable technical and administrative measures to protect your information from unauthorised access.",
  },
  {
    title: "Sharing of Information",
    body: "We do not sell or share your personal information with third parties. Information may be disclosed to government authorities or regulatory bodies only when required by law or for verification purposes.",
  },
  {
    title: "Data Retention",
    body: "Your application data is retained for the duration required by university regulations and applicable law. Unsuccessful applicants' data may be retained for audit purposes for a limited period.",
  },
  {
    title: "Your Rights & Contact",
    body: "You have the right to access or request correction of your personal data. For privacy-related concerns, contact us at enquiry.ksrdpru@gmail.com or reach the university office at 08372-230338.",
  },
];