import { useState, useEffect, useRef, useMemo } from "react";
import {
  Mail,
  Phone,
  MapPin,
  Globe,
  Download,
  FileText,
  MoreVertical,
  HelpCircle,
  ChevronDown,
  Loader2,
  Search,
} from "lucide-react";
import Card from "../../components/ui/Card";
import Toast from "../../components/ui/Toast";
import { useNavigate } from "react-router-dom";
import { getNotifications, downloadNotificationFile, type Notification as ApiNotification } from "../../services/notificationService";
import { getFaqs, type FaqResponse } from "../../services/faqService";
import {
  navItems,
  footerQuickLinks,
  applicationSteps,
  ugProgrammes,
  ugEligibility,
  ugDocuments,
  ugSpecialSeats,
  pgProgrammes,
  pgEligibility,
  pgSpecialSeats,
  pgDocuments,
  pgImportantDates,
  reservationCategories,
  refundTable,
  cancellationDocuments,
  miscellaneousTerms,
  privacyPolicyItems,
} from "../../utils/landing-data";

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const [apiNotifications, setApiNotifications] = useState<ApiNotification[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [admissionTab, setAdmissionTab] = useState<"ug" | "pg">("ug");
  const [faqs, setFaqs] = useState<FaqResponse[]>([]);
  const [faqsLoading, setFaqsLoading] = useState(true);
  const [faqCategory, setFaqCategory] = useState<string>("All");
  const [faqSearch, setFaqSearch] = useState("");
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);
  const [showAllFaqs, setShowAllFaqs] = useState(false);

  const seenIdsRef = useRef<Set<string>>(new Set());
  const navigate = useNavigate();

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const fetchAndDiff = async () => {
      try {
        const data = await getNotifications();
        const newOnes = data.filter((n) => !seenIdsRef.current.has(n.id));
        if (seenIdsRef.current.size > 0 && newOnes.length > 0) {
          showToast(`New notification: ${newOnes[0].title}`);
        }
        newOnes.forEach((n) => seenIdsRef.current.add(n.id));
        setApiNotifications(data);
      } catch {
        // silently fail on public page
      }
    };

    fetchAndDiff();
    const interval = setInterval(fetchAndDiff, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    getFaqs(false) // active FAQs only — same public-safe call used on the student Support page
      .then(setFaqs)
      .finally(() => setFaqsLoading(false));
  }, []);

  const FAQ_INITIAL_LIMIT = 6;

  const faqCategories = useMemo(() => [...new Set(faqs.map((f) => f.category))], [faqs]);
  const faqCategoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    faqs.forEach((f) => {
      counts[f.category] = (counts[f.category] ?? 0) + 1;
    });
    return counts;
  }, [faqs]);
  const filteredFaqs = useMemo(() => {
    const term = faqSearch.trim().toLowerCase();
    return faqs.filter((f) => {
      const matchesCategory = faqCategory === "All" || f.category === faqCategory;
      const matchesSearch =
        term === "" ||
        f.question.toLowerCase().includes(term) ||
        f.answer.toLowerCase().includes(term) ||
        f.category.toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [faqs, faqCategory, faqSearch]);

  // Once the person has narrowed things down (category or search), show every match —
  // the cap only applies to the default "All, no search" view so the section doesn't
  // balloon in height when there are a lot of FAQs.
  const isFaqFiltering = faqCategory !== "All" || faqSearch.trim() !== "";
  const visibleFaqs =
    isFaqFiltering || showAllFaqs ? filteredFaqs : filteredFaqs.slice(0, FAQ_INITIAL_LIMIT);
  const hiddenFaqCount = filteredFaqs.length - visibleFaqs.length;

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    setIsMenuOpen(false);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };


  return (
    <div className="min-h-screen bg-background text-text">
      {/* Toast */}
      {toast && (
        <div className="fixed z-50 -translate-x-1/2 top-6 left-1/2">
          <Toast message={toast} type="success" />
        </div>
      )}
      {/* Header Navigation */}
      <header className="sticky top-0 z-50 shadow-md bg-secondary">
        <div className="max-w-6xl px-4 mx-auto 2xl:max-w-7xl sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo + Title */}
            <div className="flex items-center gap-3">
              <img
                src="/logo2.png" // 👈 put in public folder
                alt="University Logo"
                className="object-contain w-10 h-10"
              />

              <div className="text-sm font-bold leading-snug md:text-base text-accent">
                Mahatma Gandhi Rural Development <br />
                and Panchayat Raj University
              </div>
            </div>

            {/* Desktop Menu */}
            <nav className="items-center hidden space-x-8 md:flex">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`font-medium transition-colors duration-200 ${activeSection === item.id
                      ? "text-accent border-b-2 border-primary pb-1"
                      : "text-background hover:text-accent"
                    }`}
                >
                  {item.label}
                </button>
              ))}
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 font-semibold transition-all duration-200 rounded-lg bg-accent text-text hover:bg-primary hover:text-white"
              >
                Login
              </button>
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 transition rounded-full md:hidden bg-accent text-text hover:bg-primary hover:text-white"
            >
              <MoreVertical size={20} />
            </button>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <nav className="pb-4 space-y-2 md:hidden">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="block w-full px-4 py-2 text-left rounded text-text hover:bg-accent hover:text-black"
                >
                  {item.label}
                </button>
              ))}
              <button
                onClick={() => navigate('/login')}
                className="block w-full px-4 py-2 font-semibold text-left transition-colors rounded bg-accent text-text hover:bg-primary hover:text-white"
              >
                Login
              </button>
            </nav>
          )}
        </div>
      </header>

      {/* Steps to Apply — Hero */}
      <section id="home" className="px-4 py-12 bg-gradient-to-br from-secondary via-secondary/90 to-primary sm:px-6 sm:py-16 lg:px-8">
        <div className="max-w-6xl mx-auto 2xl:max-w-7xl">
          {/* Header */}
          <div className="mb-12 text-center">
            <div className="inline-flex items-center gap-3 mb-4">
              <img src="/logo2.png" alt="University Logo" className="object-contain w-14 h-14" />
              <div className="text-left">
                <p className="text-xs font-semibold tracking-widest uppercase text-accent">MGRDPR University, Gadag</p>
                <h1 className="text-3xl font-bold leading-tight text-white md:text-4xl">Steps to Apply</h1>
              </div>
            </div>
            <p className="max-w-xl mx-auto text-sm text-white/70">
              Complete your admission to MGRDPR University by following these steps in order.
            </p>
          </div>

          {/* Steps grid — two columns on md+ */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {applicationSteps.map((item) => (
              <div
                key={item.step}
                className={`rounded-xl border ${item.bg} p-4 flex gap-4 backdrop-blur-sm`}
              >
                <div className="flex flex-col items-center flex-shrink-0 gap-1 pt-1">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${item.badge}`}>
                    {item.step}
                  </span>
                  <span className="text-[10px] text-white/50 font-medium text-center leading-tight max-w-[52px]">{item.phase}</span>
                </div>
                <div>
                  <h3 className="mb-1 text-sm font-semibold text-white">{item.title}</h3>
                  <ul className="space-y-0.5">
                    {item.details.map((d, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-white/70">
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-accent flex-shrink-0" />
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <button
              onClick={() => navigate("/login")}
              className="inline-flex items-center gap-2 px-8 py-3 text-sm font-bold transition-all rounded-full shadow-lg bg-accent text-secondary hover:bg-accent/90"
            >
              Start Your Application
            </button>
          </div>
        </div>
      </section>

      {/* Admission Section */}
      <section id="admission" className="px-4 py-12 bg-white sm:px-6 sm:py-16 lg:px-8">
        <div className="max-w-6xl mx-auto 2xl:max-w-7xl">
          <h2 className="mb-2 text-2xl font-bold text-center text-primary sm:text-3xl">Admission 2026–27</h2>
          <p className="mb-6 text-sm text-center text-gray-500">
            {admissionTab === "ug"
              ? "Under Graduate Degree Programmes — As per UGC Guidelines"
              : "Post Graduate Degree Programmes — As per UGC Guidelines"}
          </p>

          {/* UG / PG Toggle */}
          <div className="flex justify-center gap-3 mb-10">
            <button
              onClick={() => setAdmissionTab("ug")}
              className={`px-6 py-2 text-sm font-semibold rounded-full border transition-colors ${admissionTab === "ug"
                  ? "bg-secondary text-white border-secondary"
                  : "bg-white text-secondary border-secondary/30 hover:bg-secondary/5"
                }`}
            >
              Under Graduate
            </button>
            <button
              onClick={() => setAdmissionTab("pg")}
              className={`px-6 py-2 text-sm font-semibold rounded-full border transition-colors ${admissionTab === "pg"
                  ? "bg-secondary text-white border-secondary"
                  : "bg-white text-secondary border-secondary/30 hover:bg-secondary/5"
                }`}
            >
              Post Graduate
            </button>
          </div>

          {admissionTab === "ug" && (
            <>
              {/* Programmes offered */}
              <div className="mb-12">
                <h3 className="flex items-center gap-2 mb-4 text-lg font-bold text-secondary">
                  <span className="inline-block w-1 h-5 rounded bg-secondary" />
                  Programmes Offered
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {ugProgrammes.map((p, i) => (
                    <div key={i} className="p-3 transition border rounded-lg border-secondary/20 bg-secondary/5 hover:bg-secondary/10">
                      <span className="inline-block text-xs font-bold text-white bg-secondary rounded px-2 py-0.5 mb-1">{p.code}</span>
                      <p className="text-sm font-semibold leading-tight text-secondary">{p.name}</p>
                      <p className="mt-1 text-xs leading-tight text-gray-500">{p.school}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-gray-500">Intake: 60 seats per programme. Academic year 2026–27.</p>
              </div>

              {/* Eligibility Criteria */}
              <div className="mb-12">
                <h3 className="flex items-center gap-2 mb-4 text-lg font-bold text-secondary">
                  <span className="inline-block w-1 h-5 rounded bg-secondary" />
                  Eligibility Criteria
                </h3>
                <p className="mb-1.5 text-[10px] text-gray-400 sm:hidden">Swipe table sideways to see more →</p>
                <div className="overflow-x-auto border border-gray-200 shadow-sm rounded-xl">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-white bg-secondary">
                        <th className="w-24 px-4 py-3 font-semibold text-left">Programme</th>
                        <th className="px-4 py-3 font-semibold text-left">Eligibility Criteria</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ugEligibility.map((row, i) => (
                        <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="px-4 py-3 text-xs font-semibold align-top text-secondary">{row.prog}</td>
                          <td className="px-4 py-3 text-xs leading-relaxed text-gray-700">{row.criteria}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Seat Reservation */}
              <div className="mb-12">
                <h3 className="flex items-center gap-2 mb-4 text-lg font-bold text-secondary">
                  <span className="inline-block w-1 h-5 rounded bg-secondary" />
                  Intake &amp; Seat Reservation
                </h3>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {/* Category-wise reservation */}
                  <div className="overflow-hidden border border-gray-200 shadow-sm rounded-xl">
                    <div className="bg-secondary text-white px-4 py-2.5 text-sm font-semibold">Category-wise Reservation</div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-gray-600 bg-gray-50">
                          <th className="px-4 py-2 text-left">Category</th>
                          <th className="px-4 py-2 text-right">Reservation %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reservationCategories.map(([cat, pct], i) => (
                          <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                            <td className="px-4 py-2 text-gray-700">{cat}</td>
                            <td className="px-4 py-2 font-semibold text-right text-secondary">{pct}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="px-4 py-2 text-xs text-gray-500 border-t bg-gray-50">As per Karnataka Govt. reservation order.</p>
                  </div>

                  {/* Special seats */}
                  <div className="overflow-hidden border border-gray-200 shadow-sm rounded-xl">
                    <div className="bg-secondary text-white px-4 py-2.5 text-sm font-semibold">Special / Supernumerary Seats</div>
                    <div className="divide-y divide-gray-100">
                      {ugSpecialSeats.map(([label, val], i) => (
                        <div key={i} className="flex items-center justify-between px-4 py-2 text-xs">
                          <span className="text-gray-700">{label}</span>
                          <span className="font-semibold text-right text-secondary">{val}</span>
                        </div>
                      ))}
                    </div>
                    <p className="px-4 py-2 text-xs text-gray-500 border-t bg-gray-50">Supernumerary seats are in addition to regular intake. Unfilled seats will be frozen.</p>
                  </div>
                </div>
              </div>

              {/* Documents required */}
              <div>
                <h3 className="flex items-center gap-2 mb-4 text-lg font-bold text-secondary">
                  <span className="inline-block w-1 h-5 rounded bg-secondary" />
                  Documents Required at Counseling
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {ugDocuments.map((d, i) => (
                    <div key={i} className="flex gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex-shrink-0 w-2 h-2 rounded-full bg-secondary mt-1.5" />
                      <div>
                        <p className="text-xs font-semibold text-secondary">{d.doc}</p>
                        <p className="text-xs text-gray-600 mt-0.5">{d.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {admissionTab === "pg" && (
            <>
              {/* PG Programmes offered */}
              <div className="mb-12">
                <h3 className="flex items-center gap-2 mb-4 text-lg font-bold text-secondary">
                  <span className="inline-block w-1 h-5 rounded bg-secondary" />
                  Programmes Offered
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {pgProgrammes.map((p, i) => (
                    <div key={i} className="p-3 transition border rounded-lg border-secondary/20 bg-secondary/5 hover:bg-secondary/10">
                      <span className="inline-block text-xs font-bold text-white bg-secondary rounded px-2 py-0.5 mb-1">{p.code}</span>
                      <p className="text-sm font-semibold leading-tight text-secondary">{p.name}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-gray-500">Two-Year Post Graduate Programmes. Academic year 2026–27. Separate application &amp; fees required for each programme applied for.</p>
              </div>

              {/* PG Eligibility Criteria */}
              <div className="mb-12">
                <h3 className="flex items-center gap-2 mb-4 text-lg font-bold text-secondary">
                  <span className="inline-block w-1 h-5 rounded bg-secondary" />
                  Eligibility Criteria
                </h3>
                <p className="mb-1.5 text-[10px] text-gray-400 sm:hidden">Swipe table sideways to see more →</p>
                <div className="overflow-x-auto border border-gray-200 shadow-sm rounded-xl">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-white bg-secondary">
                        <th className="w-32 px-4 py-3 font-semibold text-left">Programme</th>
                        <th className="px-4 py-3 font-semibold text-left">Eligibility Criteria</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pgEligibility.map((row, i) => (
                        <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="px-4 py-3 text-xs font-semibold align-top text-secondary">{row.prog}</td>
                          <td className="px-4 py-3 text-xs leading-relaxed text-gray-700">{row.criteria}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-xs text-gray-500">A relaxation of 5% in minimum marks is provided for SC/ST/Category-I/Differently Abled students who are "Karnataka Students".</p>
              </div>

              {/* PG Seat Reservation */}
              <div className="mb-12">
                <h3 className="flex items-center gap-2 mb-4 text-lg font-bold text-secondary">
                  <span className="inline-block w-1 h-5 rounded bg-secondary" />
                  Intake &amp; Seat Reservation
                </h3>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="overflow-hidden border border-gray-200 shadow-sm rounded-xl">
                    <div className="bg-secondary text-white px-4 py-2.5 text-sm font-semibold">Category-wise Reservation</div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-gray-600 bg-gray-50">
                          <th className="px-4 py-2 text-left">Category</th>
                          <th className="px-4 py-2 text-right">Reservation %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reservationCategories.map(([cat, pct], i) => (
                          <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                            <td className="px-4 py-2 text-gray-700">{cat}</td>
                            <td className="px-4 py-2 font-semibold text-right text-secondary">{pct}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="px-4 py-2 text-xs text-gray-500 border-t bg-gray-50">As per Karnataka Govt. reservation order.</p>
                  </div>

                  <div className="overflow-hidden border border-gray-200 shadow-sm rounded-xl">
                    <div className="bg-secondary text-white px-4 py-2.5 text-sm font-semibold">Special / Supernumerary Seats</div>
                    <div className="divide-y divide-gray-100">
                      {pgSpecialSeats.map(([label, val], i) => (
                        <div key={i} className="flex items-center justify-between px-4 py-2 text-xs">
                          <span className="text-gray-700">{label}</span>
                          <span className="font-semibold text-right text-secondary">{val}</span>
                        </div>
                      ))}
                    </div>
                    <p className="px-4 py-2 text-xs text-gray-500 border-t bg-gray-50">Supernumerary seats are in addition to regular intake. Unfilled seats will be frozen.</p>
                  </div>
                </div>
              </div>

              {/* PG Documents required */}
              <div className="mb-12">
                <h3 className="flex items-center gap-2 mb-4 text-lg font-bold text-secondary">
                  <span className="inline-block w-1 h-5 rounded bg-secondary" />
                  Documents Required at Counseling
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {pgDocuments.map((d, i) => (
                    <div key={i} className="flex gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex-shrink-0 w-2 h-2 rounded-full bg-secondary mt-1.5" />
                      <div>
                        <p className="text-xs font-semibold text-secondary">{d.doc}</p>
                        <p className="text-xs text-gray-600 mt-0.5">{d.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* PG Important Dates */}
              <div>
                <h3 className="flex items-center gap-2 mb-4 text-lg font-bold text-secondary">
                  <span className="inline-block w-1 h-5 rounded bg-secondary" />
                  Important Dates
                </h3>
                <div className="overflow-hidden border border-gray-200 shadow-sm rounded-xl">
                  <table className="w-full text-sm">
                    <tbody>
                      {pgImportantDates.map((row, i) => (
                        <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="px-4 py-2.5 text-xs text-gray-700">{row.label}</td>
                          <td className="px-4 py-2.5 text-xs font-semibold text-right text-secondary whitespace-nowrap">{row.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-xs text-gray-500">
                  PG Application Fee: Rs. 300/- (General/OBC), Rs. 150/- (SC/ST/Cat-I/Disabled). Candidates applying for more than one programme must apply and pay fees separately for each. Applications submitted online must be downloaded along with photocopies of documents and sent to the Registrar, MGRDPR University, on or before the last date. Candidates qualified in KEA MBA/MCA PGCET will be considered for MBA and M.C.A admissions; remaining vacancies filled via University Entrance Test.
                </p>
              </div>
            </>
          )}

          {/* Link to Terms section */}
          <div className="flex items-center justify-end mt-6">
            <button
              onClick={() => scrollToSection("terms")}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors border rounded-lg text-secondary border-secondary hover:bg-secondary hover:text-white"
            >
              View Terms &amp; Conditions
              <span className="text-base leading-none">→</span>
            </button>
          </div>
        </div>
      </section>

      {/* Notifications Section */}
      <section
        id="notification"
        className="px-4 py-12 bg-white sm:px-6 sm:py-16 lg:px-8"
      >
        <div className="max-w-6xl mx-auto 2xl:max-w-7xl">
          {/* Heading */}
          <h2 className="mb-8 text-2xl font-bold text-center text-primary sm:text-3xl">
            Latest Updates
          </h2>

          {/* Scrollable Container */}
          <div className="max-h-[400px] overflow-y-auto space-y-4 pr-2">
            {apiNotifications.length === 0 ? (
              <p className="py-6 text-sm text-center text-gray-400">No notifications yet.</p>
            ) : (
              apiNotifications.map((notif: ApiNotification) => (
                <Card
                  key={notif.id}
                  className="p-4 transition border-l-4 border-secondary hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      {/* Date */}
                      {notif.date && (
                        <p className="mb-1 text-xs font-semibold text-secondary">
                          {new Date(notif.date).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      )}

                      {/* Title */}
                      <h4 className="mb-1 text-sm font-semibold text-secondary">
                        {notif.title}
                      </h4>

                      {/* Description */}
                      {notif.description && (
                        <p className="text-xs text-text line-clamp-2">
                          {notif.description}
                        </p>
                      )}

                      {/* File download */}
                      {notif.fileName && (
                        <button
                          onClick={() => downloadNotificationFile(notif.id)}
                          className="mt-2 flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                        >
                          <Download size={13} />
                          <FileText size={13} />
                          {notif.fileName}
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Terms & Conditions Section */}
      <section id="terms" className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8 bg-gray-50">
        <div className="max-w-6xl mx-auto 2xl:max-w-7xl">
          <h2 className="mb-2 text-2xl font-bold text-center text-primary sm:text-3xl">Terms &amp; Conditions</h2>
          <p className="mb-10 text-sm text-center text-gray-500">Admission guidelines, fees, and refund policy — Academic Year 2026–27</p>

          <div className="space-y-6">
            {/* Programme Transfer Fees */}
            <div className="overflow-hidden bg-white border border-gray-200 shadow-sm rounded-xl">
              <div className="px-5 py-3 bg-secondary">
                <h3 className="text-sm font-bold tracking-wide text-white uppercase">Programme Transfer Fees</h3>
              </div>
              <div className="px-5 py-4 text-sm leading-relaxed text-gray-700">
                Programme Transfer Processing Fees of <span className="font-semibold">Rs. 1,000/-</span> (one thousand only) from one programme to another programme, as per eligibility and seat availability.
              </div>
            </div>

            {/* Admission Cancellation Fees */}
            <div className="overflow-hidden bg-white border border-gray-200 shadow-sm rounded-xl">
              <div className="px-5 py-3 bg-secondary">
                <h3 className="text-sm font-bold tracking-wide text-white uppercase">Admission Cancellation Fees</h3>
              </div>
              <div className="px-5 py-4 text-sm leading-relaxed text-gray-700">
                The Candidate shall pay <span className="font-semibold">Rs. 500/-</span> towards cancellation of admission at any stage of the programme.
              </div>
            </div>

            {/* Miscellaneous */}
            <div className="overflow-hidden bg-white border border-gray-200 shadow-sm rounded-xl">
              <div className="px-5 py-3 bg-secondary">
                <h3 className="text-sm font-bold tracking-wide text-white uppercase">Miscellaneous</h3>
              </div>
              <ul className="px-5 py-4 space-y-2">
                {miscellaneousTerms.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-secondary flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Refund & Forfeiture */}
            <div className="overflow-hidden bg-white border border-gray-200 shadow-sm rounded-xl">
              <div className="px-5 py-3 bg-secondary">
                <h3 className="text-sm font-bold tracking-wide text-white uppercase">Refund and Forfeiture of Fees</h3>
              </div>
              <div className="px-5 py-4">
                <p className="mb-1.5 text-[10px] text-gray-400 sm:hidden">Swipe table sideways to see more →</p>
                <div className="mb-4 overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-600 bg-gray-100">
                        <th className="px-4 py-2.5 text-center font-semibold w-16">Sl. No.</th>
                        <th className="px-4 py-2.5 text-center font-semibold w-28">Refund %</th>
                        <th className="px-4 py-2.5 text-left font-semibold">Point of time when notice of withdrawal is received</th>
                      </tr>
                    </thead>
                    <tbody>
                      {refundTable.map((row, i) => (
                        <tr key={row.sl} className={`align-top ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                          <td className="px-4 py-3 text-center text-gray-600">{row.sl}</td>
                          <td className="px-4 py-3 font-bold text-center text-secondary">{row.pct}</td>
                          <td className="px-4 py-3 text-xs leading-relaxed text-gray-700">{row.condition}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mb-3 text-sm text-gray-700">
                  Candidate who has selected a seat and wishes to discontinue for any reason may cancel his/her seat by submitting the following documents:
                </p>
                <ol className="space-y-1 text-sm text-gray-700">
                  {cancellationDocuments.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-secondary/10 text-secondary text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                      {item}
                    </li>
                  ))}
                </ol>
                <p className="mt-3 text-xs text-gray-500">
                  On receipt of all the above documents, the admission fee paid will be refunded as per the applicable conditions in the table above.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy Policy Section */}
      <section id="privacy" className="px-4 py-12 bg-white sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto 2xl:max-w-7xl">
          <h2 className="mb-1 text-2xl font-bold text-center text-primary">Privacy Policy</h2>
          <p className="mb-8 text-xs text-center text-gray-500">Effective for Academic Year 2026–27 admissions</p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {privacyPolicyItems.map((item, i) => (
              <div key={i} className="p-4 border border-gray-200 rounded-xl bg-gray-50">
                <p className="text-xs font-bold text-secondary uppercase tracking-wide mb-1.5">{item.title}</p>
                <p className="text-xs leading-relaxed text-gray-600">{item.body}</p>
              </div>
            ))}
          </div>

          <p className="mt-6 text-xs text-center text-gray-400">
            By submitting an application, you consent to the collection and use of your information as described above.
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="px-4 py-12 bg-gray-50 sm:px-6 sm:py-16 lg:px-8">
        <div className="max-w-6xl mx-auto 2xl:max-w-7xl">
          <div className="flex flex-col items-center gap-3 mb-3 text-center sm:flex-row sm:justify-center">
            <div className="flex items-center justify-center flex-shrink-0 rounded-full w-11 h-11 bg-primary/10">
              <HelpCircle size={20} className="text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-primary sm:text-3xl">Frequently Asked Questions</h2>
          </div>
          <p className="mb-8 text-sm text-center text-gray-500">
            Quick answers to common admission queries — no login required.
          </p>

          <div className="relative max-w-md mx-auto mb-6">
            <Search size={15} className="absolute text-gray-400 -translate-y-1/2 left-3 top-1/2" />
            <input
              type="text"
              value={faqSearch}
              onChange={(e) => setFaqSearch(e.target.value)}
              placeholder="Search FAQs…"
              data-testid="landing-faq-search"
              className="w-full py-2.5 pr-3 text-sm transition-all bg-white border border-gray-200 rounded-lg pl-9 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {faqCategories.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              <button
                onClick={() => setFaqCategory("All")}
                data-testid="landing-faq-category-all"
                className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-full border transition-colors ${faqCategory === "All"
                    ? "bg-secondary text-white border-secondary"
                    : "bg-white text-secondary border-secondary/30 hover:bg-secondary/5"
                  }`}
              >
                All
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${faqCategory === "All" ? "bg-white/20" : "bg-secondary/10"
                    }`}
                >
                  {faqs.length}
                </span>
              </button>
              {faqCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFaqCategory(cat)}
                  data-testid={`landing-faq-category-${cat}`}
                  className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-full border transition-colors ${faqCategory === cat
                      ? "bg-secondary text-white border-secondary"
                      : "bg-white text-secondary border-secondary/30 hover:bg-secondary/5"
                    }`}
                >
                  {cat}
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${faqCategory === cat ? "bg-white/20" : "bg-secondary/10"
                      }`}
                  >
                    {faqCategoryCounts[cat] ?? 0}
                  </span>
                </button>
              ))}
            </div>
          )}

          {faqsLoading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <Loader2 size={22} className="animate-spin" />
            </div>
          ) : filteredFaqs.length === 0 ? (
            <p className="py-10 text-sm text-center text-gray-400">
              No FAQs match your search.
            </p>
          ) : (
            <div className="gap-4 columns-1 lg:columns-2 2xl:columns-3">
              {visibleFaqs.map((faq) => {
                const isOpen = openFaqId === faq.id;
                return (
                  <div
                    key={faq.id}
                    className={`mb-4 break-inside-avoid overflow-hidden bg-white border rounded-xl shadow-sm transition-shadow hover:shadow-md ${isOpen ? "border-primary/30" : "border-gray-200"
                      }`}
                  >
                    <button
                      onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                      aria-expanded={isOpen}
                      data-testid={`landing-faq-item-${faq.id}`}
                      className="flex items-center justify-between w-full gap-3 px-5 py-4 text-left"
                    >
                      <div className="min-w-0">
                        <p className="mb-1 text-xs font-semibold text-secondary">{faq.category}</p>
                        <p className="text-sm font-semibold text-gray-800">{faq.question}</p>
                      </div>
                      <div
                        className={`flex items-center justify-center flex-shrink-0 rounded-full w-7 h-7 transition-colors ${isOpen ? "bg-primary/10" : "bg-gray-50"
                          }`}
                      >
                        <ChevronDown
                          size={16}
                          className={`text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180 text-primary" : ""
                            }`}
                        />
                      </div>
                    </button>
                    <div
                      className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                        }`}
                      aria-hidden={!isOpen}
                    >
                      <div className="overflow-hidden">
                        <div className="px-5 pt-1 pb-4 mt-0 border-t border-gray-100">
                          <p className="pt-3 text-sm leading-relaxed text-gray-600 whitespace-pre-wrap">
                            {faq.answer}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!isFaqFiltering && hiddenFaqCount > 0 && (
            <div className="flex justify-center mt-2">
              <button
                onClick={() => setShowAllFaqs(true)}
                data-testid="landing-faq-show-more"
                className="px-5 py-2 text-xs font-semibold transition-colors border rounded-lg text-secondary border-secondary/30 hover:bg-secondary/5"
              >
                Show {hiddenFaqCount} more FAQ{hiddenFaqCount !== 1 ? "s" : ""}
              </button>
            </div>
          )}
          {!isFaqFiltering && showAllFaqs && filteredFaqs.length > FAQ_INITIAL_LIMIT && (
            <div className="flex justify-center mt-2">
              <button
                onClick={() => setShowAllFaqs(false)}
                data-testid="landing-faq-show-less"
                className="px-5 py-2 text-xs font-semibold transition-colors border rounded-lg text-secondary border-secondary/30 hover:bg-secondary/5"
              >
                Show less
              </button>
            </div>
          )}

          <p className="mt-8 text-xs text-center text-gray-400">
            Can&apos;t find your answer? Reach out via the contact details below, or sign in to raise a support ticket.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer
        id="contact"
        className="px-4 py-12 text-white bg-secondary sm:px-6 sm:py-16 lg:px-8"
      >
        <div className="max-w-6xl mx-auto 2xl:max-w-7xl">
          <div className="grid grid-cols-1 gap-12 mb-12 md:grid-cols-3">
            {/* About Footer */}
            <div>
              <h3 className="mb-4 text-2xl font-bold">MGRDPR University</h3>
              <p className="mb-4 leading-relaxed text-accent">
                Committed to excellence in education and innovation, shaping
                leaders for a better tomorrow.
              </p>
            </div>


            {/* Contact Info */}
            <div>
              <h4 className="mb-4 text-lg font-semibold">Contact Us</h4>

              <div className="space-y-4">
                {/* Address */}
                <div className="flex items-start gap-3">
                  <MapPin
                    size={20}
                    className="flex-shrink-0 mt-1 text-accent"
                  />
                  <div>
                    <p className="text-sm">Raitha Bhavan,</p>
                    <p className="text-sm">General Cariappa Circle,</p>
                    <p className="text-sm">Gadag-582101,</p>
                    <p className="text-sm">Karnataka, India</p>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-center gap-3">
                  <Mail size={20} className="text-accent" />
                  <a
                    href="mailto:enquiry.ksrdpru@gmail.com"
                    className="text-sm transition-colors hover:text-accent"
                  >
                    enquiry.ksrdpru@gmail.com
                  </a>
                </div>

                {/* Phone */}
                <div className="flex items-center gap-3">
                  <Phone size={20} className="text-accent" />
                  <a
                    href="tel:+918372230338"
                    className="text-sm transition-colors hover:text-accent"
                  >
                    08372-230338
                  </a>
                </div>

                {/* Website ✅ NEW */}
                <div className="flex items-center gap-3">
                  <Globe size={20} className="text-accent" />
                  <a
                    href="https://ksrdpru.ac.in/en/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm transition-colors hover:text-accent"
                  >
                    ksrdpru.ac.in
                  </a>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="mb-4 text-lg font-semibold">Quick Links</h4>
              <ul className="space-y-2">
                {footerQuickLinks.map((link) => (
                  <li key={link.id}>
                    <button
                      onClick={() => scrollToSection(link.id)}
                      className="text-sm transition-colors hover:text-accent"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Divider */}
          <div className="pt-8 border-t border-accent/30">
            <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
              <p className="mb-4 text-sm text-accent md:mb-0">
                © {new Date().getFullYear()} MGRDPR University. All rights reserved.
              </p>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-accent">Powered by:</span>
                <span className="font-semibold">
                  Inhawk IT Solutions Pvt Ltd
                </span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}