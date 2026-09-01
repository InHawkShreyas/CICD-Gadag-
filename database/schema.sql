--
-- PostgreSQL database dump
--

\restrict SyqzoEn8CwWYiY5v4YstD1EBctCMhgGsVKL0l0z9T5tjBz0lLiXwD3R3SAVoPFU

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: academic; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA academic;


--
-- Name: admission; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA admission;


--
-- Name: audit; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA audit;


--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA auth;


--
-- Name: examination; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA examination;


--
-- Name: fees; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA fees;


--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: support; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA support;


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA fees;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: set_cc_batch_type_id(); Type: FUNCTION; Schema: admission; Owner: -
--

CREATE FUNCTION admission.set_cc_batch_type_id() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.degree_id = (
        SELECT id
        FROM public.degrees
        WHERE degree_name = 'Certificate Course'
        LIMIT 1
    ) THEN

        SELECT l.id
        INTO NEW.cc_batch_type_id
        FROM public.lookup l
        WHERE l.type = 'Batch'
          AND CURRENT_DATE BETWEEN l.start_date AND l.end_date
        ORDER BY l.start_date DESC
        LIMIT 1;

    END IF;

    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admitted_students; Type: TABLE; Schema: academic; Owner: -
--

CREATE TABLE academic.admitted_students (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid,
    application_no character varying(50) NOT NULL,
    name character varying(150),
    admit_yn boolean DEFAULT false,
    insert_by character varying(100),
    update_by character varying(100),
    insert_on timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    update_on timestamp without time zone,
    remark character varying(255)
);


--
-- Name: course_subjects; Type: TABLE; Schema: academic; Owner: -
--

CREATE TABLE academic.course_subjects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    degree_id uuid NOT NULL,
    course_id uuid NOT NULL,
    sem_id uuid NOT NULL,
    subject_id uuid NOT NULL,
    insert_by character varying(100),
    update_by character varying(100),
    insert_on timestamp without time zone DEFAULT now() NOT NULL,
    update_on timestamp without time zone,
    status boolean DEFAULT true NOT NULL
);


--
-- Name: students; Type: TABLE; Schema: academic; Owner: -
--

CREATE TABLE academic.students (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_name character varying(150) NOT NULL,
    registration_number character varying(50) NOT NULL,
    degree_id uuid NOT NULL,
    course_id uuid NOT NULL,
    insert_by character varying(100),
    update_by character varying(100),
    insert_on timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    update_on timestamp without time zone,
    status boolean DEFAULT true,
    academic_year uuid
);


--
-- Name: application_course_details; Type: TABLE; Schema: admission; Owner: -
--

CREATE TABLE admission.application_course_details (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    application_no character varying(50),
    hostel_facility_yn boolean,
    insert_by character varying(100),
    update_by character varying(100),
    insert_on timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    update_on timestamp without time zone,
    status boolean DEFAULT true,
    transport_facility_yn boolean DEFAULT false,
    course_id uuid,
    degree_id uuid,
    previous_registration_no character varying(100),
    batch_id uuid,
    inservice_yn boolean,
    department character varying(150),
    designation character varying(150),
    office_address character varying(250),
    date_of_join date,
    service_years integer,
    preference character varying,
    cc_batch_type_id uuid,
    accepted_yn boolean
);


--
-- Name: application_documents; Type: TABLE; Schema: admission; Owner: -
--

CREATE TABLE admission.application_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    application_no character varying(50),
    document_name character varying(100) NOT NULL,
    file_name character varying(255),
    file_url text,
    insert_by character varying(100),
    update_by character varying(100),
    insert_on timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    update_on timestamp without time zone,
    status boolean DEFAULT true
);


--
-- Name: application_photo; Type: TABLE; Schema: admission; Owner: -
--

CREATE TABLE admission.application_photo (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    app_no character varying(50) NOT NULL,
    photo_url text,
    signature_url text,
    insert_by character varying(100),
    insert_on timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    update_by character varying(100),
    update_on timestamp without time zone,
    status boolean DEFAULT true,
    parent_sign_url character varying(100)
);


--
-- Name: application_verification; Type: TABLE; Schema: admission; Owner: -
--

CREATE TABLE admission.application_verification (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    app_no character varying(50),
    verification_status character varying(20) NOT NULL,
    remark text,
    insert_by character varying(100),
    update_by character varying(100),
    insert_on timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    update_on timestamp without time zone,
    status boolean DEFAULT true,
    installment integer,
    fees_enabled boolean,
    post_payment_edit boolean DEFAULT false
);


--
-- Name: applications; Type: TABLE; Schema: admission; Owner: -
--

CREATE TABLE admission.applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    app_no character varying(50) NOT NULL,
    name character varying(150) NOT NULL,
    phone character varying(15),
    email character varying(150),
    dob date,
    aadhar_no character varying(20),
    passport_no character varying(20),
    father_name character varying(150),
    mother_name character varying(150),
    guardian_name character varying(150),
    father_no character varying(15),
    mother_no character varying(15),
    guardian_no character varying(15),
    caste character varying(50),
    rd_number character varying(50),
    annual_income numeric(12,2),
    place_of_birth character varying(150),
    karnataka_yn boolean,
    permanent_address text,
    communication_address text,
    insert_by character varying(100),
    update_by character varying(100),
    insert_on timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    update_on timestamp without time zone,
    status boolean DEFAULT true,
    category_id uuid,
    nationality_id uuid,
    apaar_id character varying(100),
    stats_id character varying(100),
    father_occupation character varying(150),
    mother_occupation character varying(150),
    gender_id uuid,
    religion_id uuid,
    academic_year_id uuid,
    caste_rd_number character varying(100),
    visa_no character varying(30),
    passport_expiry_date date,
    visa_expiry_date date
);


--
-- Name: education_details; Type: TABLE; Schema: admission; Owner: -
--

CREATE TABLE admission.education_details (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    app_no character varying(50),
    exam_name character varying(100) NOT NULL,
    max_marks numeric(8,2),
    obtained_marks numeric(8,2),
    registration_number character varying(50),
    percentage numeric(5,2),
    cgpa numeric(5,2),
    insert_by character varying(100),
    update_by character varying(100),
    insert_on timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    update_on timestamp without time zone,
    status boolean DEFAULT true,
    year integer
);


--
-- Name: pg_education_details; Type: TABLE; Schema: admission; Owner: -
--

CREATE TABLE admission.pg_education_details (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    app_no character varying(50),
    exam_level character varying(30) NOT NULL,
    institute_name character varying(150),
    registration_number character varying(50),
    year integer,
    max_marks numeric(8,2),
    obtained_marks numeric(8,2),
    percentage numeric(5,2),
    cgpa numeric(5,2),
    same_institution boolean,
    entry_mode character varying(10),
    ug_subject character varying(100),
    overall_percentage numeric(5,2),
    insert_by character varying(100),
    update_by character varying(100),
    insert_on timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    update_on timestamp without time zone,
    status boolean DEFAULT true
);


--
-- Name: pg_education_period; Type: TABLE; Schema: admission; Owner: -
--

CREATE TABLE admission.pg_education_period (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pg_education_detail_id uuid NOT NULL,
    period_type character varying(10) NOT NULL,
    period_index integer NOT NULL,
    institute_name character varying(150),
    registration_number character varying(50),
    sgpa numeric(5,2),
    percentage numeric(5,2),
    cgpa numeric(5,2),
    insert_by character varying(100),
    update_by character varying(100),
    insert_on timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    update_on timestamp without time zone,
    status boolean DEFAULT true,
    max_marks numeric(8,2),
    obtained_marks numeric(8,2)
);


--
-- Name: seat_type; Type: TABLE; Schema: admission; Owner: -
--

CREATE TABLE admission.seat_type (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    application_no character varying(50),
    seat_type_name character varying(100) NOT NULL,
    insert_by character varying(100),
    insert_on timestamp with time zone DEFAULT now(),
    update_by character varying(100),
    update_on timestamp with time zone,
    status boolean DEFAULT true,
    seat_type_id uuid
);


--
-- Name: audit_logs; Type: TABLE; Schema: audit; Owner: -
--

CREATE TABLE audit.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    table_name character varying(100),
    record_id uuid,
    action character varying(20),
    old_data jsonb,
    new_data jsonb,
    performed_by character varying(100),
    performed_on timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ip_address character varying(50)
);


--
-- Name: customer_support; Type: TABLE; Schema: audit; Owner: -
--

CREATE TABLE audit.customer_support (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username character varying(100) NOT NULL,
    ticket_id character varying(50) NOT NULL,
    issue character varying(200),
    description text,
    status character varying(20) DEFAULT 'Open'::character varying,
    solution text,
    solved_by character varying(100),
    insert_by character varying(100),
    update_by character varying(100),
    insert_on timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    update_on timestamp without time zone
);


--
-- Name: document_coordinator_mapping; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.document_coordinator_mapping (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    login_id uuid NOT NULL,
    degree_id uuid NOT NULL,
    course_id uuid NOT NULL,
    status boolean DEFAULT true,
    insert_by character varying(100),
    insert_on timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    update_by character varying(100),
    update_on timestamp without time zone,
    degree_type_id uuid
);


--
-- Name: login; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.login (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username character varying(100) NOT NULL,
    password_hash text NOT NULL,
    last_password_change timestamp without time zone,
    ip_address character varying(50),
    insert_by character varying(100),
    update_by character varying(100),
    insert_on timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    update_on timestamp without time zone,
    status boolean DEFAULT true,
    registration_id uuid,
    role_id uuid
);


--
-- Name: otp_logs; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.otp_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username character varying(100),
    mobile character varying(15),
    otp character varying(10) NOT NULL,
    is_used boolean DEFAULT false,
    expiry_time timestamp without time zone,
    insert_on timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status boolean DEFAULT true
);


--
-- Name: registration; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.registration (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username character varying(100) NOT NULL,
    name character varying(150),
    mobile character varying(15),
    email character varying(150),
    aadhar_no character varying(20),
    passport_no character varying(20),
    dob date,
    insert_by character varying(100),
    update_by character varying(100),
    insert_on timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    update_on timestamp without time zone,
    status boolean DEFAULT true,
    nationality_id uuid,
    usn_no character varying(50),
    exam_registration boolean DEFAULT false,
    degree_type_id uuid
);


--
-- Name: exam_application; Type: TABLE; Schema: examination; Owner: -
--

CREATE TABLE examination.exam_application (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_no character varying(50) NOT NULL,
    sem_id uuid NOT NULL,
    academic_year_id uuid NOT NULL,
    academic_approval boolean DEFAULT false NOT NULL,
    attendance_approval boolean DEFAULT false NOT NULL,
    other_approval boolean DEFAULT false NOT NULL,
    insert_by character varying(100),
    update_by character varying(100),
    insert_on timestamp without time zone DEFAULT now() NOT NULL,
    update_on timestamp without time zone,
    status boolean DEFAULT true NOT NULL,
    name character varying(150),
    regis_number character varying(100),
    degree_id uuid,
    course_id uuid,
    mobile character varying(15),
    email character varying(200),
    declaration_yn boolean
);


--
-- Name: exam_application_details; Type: TABLE; Schema: examination; Owner: -
--

CREATE TABLE examination.exam_application_details (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    exam_application_id uuid NOT NULL,
    subject_id uuid NOT NULL,
    attendance_percentage numeric(5,2),
    ia_marks numeric(5,2),
    insert_by character varying(100),
    update_by character varying(100),
    insert_on timestamp without time zone DEFAULT now() NOT NULL,
    update_on timestamp without time zone,
    status boolean DEFAULT true NOT NULL,
    CONSTRAINT chk_attendance_percentage CHECK (((attendance_percentage IS NULL) OR ((attendance_percentage >= (0)::numeric) AND (attendance_percentage <= (100)::numeric)))),
    CONSTRAINT chk_ia_marks CHECK (((ia_marks IS NULL) OR (ia_marks >= (0)::numeric)))
);


--
-- Name: admission_fee_conditional_charge; Type: TABLE; Schema: fees; Owner: -
--

CREATE TABLE fees.admission_fee_conditional_charge (
    id uuid NOT NULL,
    condition_id uuid NOT NULL,
    particular_name character varying(200) NOT NULL,
    amount numeric(12,2) NOT NULL,
    description text,
    insert_by character varying(100),
    update_by character varying(100),
    insert_on timestamp without time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
    update_on timestamp without time zone,
    status boolean DEFAULT true NOT NULL,
    CONSTRAINT chk_admission_fee_conditional_charge_amount CHECK ((amount >= (0)::numeric))
);


--
-- Name: admission_fee_structure; Type: TABLE; Schema: fees; Owner: -
--

CREATE TABLE fees.admission_fee_structure (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    fee_name character varying(255) NOT NULL,
    total_amount numeric(12,2) NOT NULL,
    course_id uuid,
    degree_id uuid,
    category_id uuid,
    academic_year_id uuid,
    deduction_yn boolean DEFAULT false,
    insert_by character varying(100),
    insert_on timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    update_by character varying(100),
    update_on timestamp without time zone,
    status boolean DEFAULT true,
    annual_income uuid,
    fine_amount numeric(12,2),
    start_date date,
    end_date date,
    fine_end_date date,
    deduction_amount numeric(12,2),
    pay_amount numeric(12,2),
    fee_id uuid,
    degree_type_id uuid
);


--
-- Name: admission_fee_structure_details; Type: TABLE; Schema: fees; Owner: -
--

CREATE TABLE fees.admission_fee_structure_details (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    header_id uuid NOT NULL,
    particular_name character varying(255) NOT NULL,
    amount numeric(12,2) NOT NULL,
    insert_by character varying(100),
    insert_on timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    update_by character varying(100),
    update_on timestamp without time zone,
    status boolean DEFAULT true,
    installment_1 boolean DEFAULT false,
    installment_2 boolean DEFAULT false,
    installment1_amt numeric(12,2),
    installment2_amt numeric(12,2)
);


--
-- Name: application_fee; Type: TABLE; Schema: fees; Owner: -
--

CREATE TABLE fees.application_fee (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    degree_id uuid,
    course_id uuid,
    academic_year_id uuid,
    category_id uuid,
    amount numeric(12,2) NOT NULL,
    platform_charges numeric(12,2) DEFAULT 90 NOT NULL,
    total_amount numeric(12,2),
    insert_by character varying(100),
    insert_on timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    update_by character varying(100),
    update_on timestamp without time zone,
    status boolean DEFAULT true,
    batch_type_id uuid,
    degree_type_id uuid,
    start_date date,
    end_date date
);


--
-- Name: exam_fee; Type: TABLE; Schema: fees; Owner: -
--

CREATE TABLE fees.exam_fee (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    degree_id uuid,
    course_id uuid,
    academic_year_id uuid,
    start_date date,
    end_date date,
    fine_end_date date,
    fine_amount numeric(12,2),
    insert_by character varying(100),
    insert_on timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    update_by character varying(100),
    update_on timestamp without time zone,
    status boolean,
    exam_fee_amount numeric(12,2),
    platform_charges numeric(12,2),
    total_amount numeric(12,2)
);


--
-- Name: fee_collection_manual; Type: TABLE; Schema: fees; Owner: -
--

CREATE TABLE fees.fee_collection_manual (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    receipt_no character varying(50) NOT NULL,
    fee_name character varying(200) NOT NULL,
    fee_amount numeric(12,2) DEFAULT 0 NOT NULL,
    transaction_id character varying(150),
    order_id character varying(150),
    payment_mode character varying(50),
    payment_date timestamp without time zone,
    insert_by character varying(100),
    update_by character varying(100),
    insert_on timestamp without time zone DEFAULT now() NOT NULL,
    update_on timestamp without time zone,
    status boolean DEFAULT true,
    app_no character varying(50),
    app_id uuid,
    degree_id uuid,
    course_id uuid
);


--
-- Name: fee_collection_manual_details; Type: TABLE; Schema: fees; Owner: -
--

CREATE TABLE fees.fee_collection_manual_details (
    id uuid NOT NULL,
    header_id uuid NOT NULL,
    particular_name character varying(200) NOT NULL,
    particular_amt numeric(12,2) DEFAULT 0 NOT NULL,
    insert_by character varying(100),
    update_by character varying(100),
    insert_on timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    update_on timestamp without time zone,
    status boolean DEFAULT true NOT NULL
);


--
-- Name: fee_collections; Type: TABLE; Schema: fees; Owner: -
--

CREATE TABLE fees.fee_collections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    application_no character varying(50),
    name character varying(150),
    fee_type character varying(50),
    amount numeric(10,2),
    paid_amount numeric(10,2),
    payment_date timestamp without time zone,
    status character varying(20),
    transaction_id character varying(100),
    order_id character varying(100),
    receipt_number character varying(100),
    insert_by character varying(100),
    update_by character varying(100),
    insert_on timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    update_on timestamp without time zone,
    platform_charges numeric(5,2),
    email character varying(100),
    mobile character varying(15),
    settlement_date date,
    settlement_id character varying(200),
    refund_id character varying(250),
    refund_date date,
    degree_id uuid,
    course_id uuid
);


--
-- Name: academic_dates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.academic_dates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(150),
    description text,
    start_date date,
    end_date date,
    insert_by character varying(100),
    update_by character varying(100),
    insert_on timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    update_on timestamp without time zone,
    status boolean DEFAULT true
);


--
-- Name: academic_year; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.academic_year (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    description character varying(150),
    start_date date,
    end_date date,
    insert_by character varying(100),
    update_by character varying(100),
    insert_on timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    update_on timestamp without time zone,
    status boolean DEFAULT true,
    batch_year character varying
);


--
-- Name: courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.courses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    degree_id uuid NOT NULL,
    name character varying(150) NOT NULL,
    code character varying(50),
    total_seats integer,
    insert_by character varying(100),
    update_by character varying(100),
    insert_on timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    update_on timestamp without time zone,
    status boolean DEFAULT true
);


--
-- Name: degrees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.degrees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    university_id uuid NOT NULL,
    degree_name character varying(150) NOT NULL,
    duration character varying(50),
    description text,
    insert_by character varying(100),
    update_by character varying(100),
    insert_on timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    update_on timestamp without time zone,
    status boolean DEFAULT true,
    degree_type_id uuid
);


--
-- Name: lookup; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(50),
    name character varying(150),
    description text,
    type character varying(50),
    type2 character varying(50),
    extra_int1 integer,
    extra_int2 integer,
    start_date date,
    end_date date,
    extra_description text,
    insert_by character varying(100),
    update_by character varying(100),
    insert_on timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    update_on timestamp with time zone,
    status boolean DEFAULT true,
    debug_no integer NOT NULL
);


--
-- Name: lookup_debug_no_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lookup_debug_no_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lookup_debug_no_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lookup_debug_no_seq OWNED BY public.lookup.debug_no;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    file_name character varying(255),
    file_url text,
    date date,
    insert_by character varying(100),
    update_by character varying(100),
    insert_on timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    update_on timestamp without time zone,
    status boolean DEFAULT true
);


--
-- Name: receipt_sequence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.receipt_sequence (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    prefix character varying(20) NOT NULL,
    year character varying(10) NOT NULL,
    last_number integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true,
    insert_by character varying(100),
    insert_on timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    update_by character varying(100),
    update_on timestamp without time zone
);


--
-- Name: subjects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subjects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(100) NOT NULL,
    max_marks numeric(5,2) NOT NULL,
    min_marks numeric(5,2) NOT NULL,
    insert_by character varying(100),
    update_by character varying(100),
    insert_on timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    update_on timestamp without time zone,
    status boolean DEFAULT true NOT NULL,
    academic_year_id uuid
);


--
-- Name: universities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.universities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(200) NOT NULL,
    address text,
    phone_no character varying(15),
    email character varying(150),
    insert_by character varying(100),
    update_by character varying(100),
    insert_on timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    update_on timestamp without time zone,
    status boolean DEFAULT true
);


--
-- Name: faqs; Type: TABLE; Schema: support; Owner: -
--

CREATE TABLE support.faqs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category character varying(100) NOT NULL,
    question text NOT NULL,
    answer text NOT NULL,
    insert_by character varying(100),
    insert_on timestamp without time zone DEFAULT now() NOT NULL,
    update_by character varying(100),
    update_on timestamp without time zone,
    status boolean DEFAULT true NOT NULL
);


--
-- Name: support_ticket_messages; Type: TABLE; Schema: support; Owner: -
--

CREATE TABLE support.support_ticket_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    sender_type character varying(100) NOT NULL,
    sender_name character varying(100),
    message text NOT NULL,
    insert_by character varying(100),
    insert_on timestamp without time zone DEFAULT now() NOT NULL,
    update_by character varying(100),
    update_on timestamp without time zone,
    status boolean DEFAULT true NOT NULL
);


--
-- Name: support_tickets; Type: TABLE; Schema: support; Owner: -
--

CREATE TABLE support.support_tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_no character varying(255) NOT NULL,
    username character varying(100) NOT NULL,
    issue_id uuid NOT NULL,
    status_id uuid NOT NULL,
    solved_by character varying(100),
    insert_by character varying(100),
    insert_on timestamp without time zone DEFAULT now() NOT NULL,
    update_by character varying(100),
    update_on timestamp without time zone,
    status boolean DEFAULT true NOT NULL
);


--
-- Name: lookup debug_no; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup ALTER COLUMN debug_no SET DEFAULT nextval('public.lookup_debug_no_seq'::regclass);


--
-- Name: admitted_students admitted_students_pkey; Type: CONSTRAINT; Schema: academic; Owner: -
--

ALTER TABLE ONLY academic.admitted_students
    ADD CONSTRAINT admitted_students_pkey PRIMARY KEY (id);


--
-- Name: course_subjects course_subjects_pkey; Type: CONSTRAINT; Schema: academic; Owner: -
--

ALTER TABLE ONLY academic.course_subjects
    ADD CONSTRAINT course_subjects_pkey PRIMARY KEY (id);


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: academic; Owner: -
--

ALTER TABLE ONLY academic.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (id);


--
-- Name: students students_registration_number_key; Type: CONSTRAINT; Schema: academic; Owner: -
--

ALTER TABLE ONLY academic.students
    ADD CONSTRAINT students_registration_number_key UNIQUE (registration_number);


--
-- Name: course_subjects uq_course_subjects; Type: CONSTRAINT; Schema: academic; Owner: -
--

ALTER TABLE ONLY academic.course_subjects
    ADD CONSTRAINT uq_course_subjects UNIQUE (degree_id, course_id, sem_id, subject_id);


--
-- Name: application_course_details application_course_details_pkey; Type: CONSTRAINT; Schema: admission; Owner: -
--

ALTER TABLE ONLY admission.application_course_details
    ADD CONSTRAINT application_course_details_pkey PRIMARY KEY (id);


--
-- Name: application_documents application_documents_pkey; Type: CONSTRAINT; Schema: admission; Owner: -
--

ALTER TABLE ONLY admission.application_documents
    ADD CONSTRAINT application_documents_pkey PRIMARY KEY (id);


--
-- Name: application_photo application_photo_pkey; Type: CONSTRAINT; Schema: admission; Owner: -
--

ALTER TABLE ONLY admission.application_photo
    ADD CONSTRAINT application_photo_pkey PRIMARY KEY (id);


--
-- Name: application_verification application_verification_pkey; Type: CONSTRAINT; Schema: admission; Owner: -
--

ALTER TABLE ONLY admission.application_verification
    ADD CONSTRAINT application_verification_pkey PRIMARY KEY (id);


--
-- Name: applications applications_app_no_key; Type: CONSTRAINT; Schema: admission; Owner: -
--

ALTER TABLE ONLY admission.applications
    ADD CONSTRAINT applications_app_no_key UNIQUE (app_no);


--
-- Name: applications applications_pkey; Type: CONSTRAINT; Schema: admission; Owner: -
--

ALTER TABLE ONLY admission.applications
    ADD CONSTRAINT applications_pkey PRIMARY KEY (id);


--
-- Name: education_details education_details_pkey; Type: CONSTRAINT; Schema: admission; Owner: -
--

ALTER TABLE ONLY admission.education_details
    ADD CONSTRAINT education_details_pkey PRIMARY KEY (id);


--
-- Name: pg_education_details pg_education_details_pkey; Type: CONSTRAINT; Schema: admission; Owner: -
--

ALTER TABLE ONLY admission.pg_education_details
    ADD CONSTRAINT pg_education_details_pkey PRIMARY KEY (id);


--
-- Name: pg_education_period pg_education_period_pkey; Type: CONSTRAINT; Schema: admission; Owner: -
--

ALTER TABLE ONLY admission.pg_education_period
    ADD CONSTRAINT pg_education_period_pkey PRIMARY KEY (id);


--
-- Name: seat_type seat_type_pkey; Type: CONSTRAINT; Schema: admission; Owner: -
--

ALTER TABLE ONLY admission.seat_type
    ADD CONSTRAINT seat_type_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: audit; Owner: -
--

ALTER TABLE ONLY audit.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: customer_support customer_support_pkey; Type: CONSTRAINT; Schema: audit; Owner: -
--

ALTER TABLE ONLY audit.customer_support
    ADD CONSTRAINT customer_support_pkey PRIMARY KEY (id);


--
-- Name: customer_support customer_support_ticket_id_key; Type: CONSTRAINT; Schema: audit; Owner: -
--

ALTER TABLE ONLY audit.customer_support
    ADD CONSTRAINT customer_support_ticket_id_key UNIQUE (ticket_id);


--
-- Name: document_coordinator_mapping document_coordinator_mapping_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.document_coordinator_mapping
    ADD CONSTRAINT document_coordinator_mapping_pkey PRIMARY KEY (id);


--
-- Name: login login_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.login
    ADD CONSTRAINT login_pkey PRIMARY KEY (id);


--
-- Name: login login_username_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.login
    ADD CONSTRAINT login_username_key UNIQUE (username);


--
-- Name: otp_logs otp_logs_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.otp_logs
    ADD CONSTRAINT otp_logs_pkey PRIMARY KEY (id);


--
-- Name: registration registration_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.registration
    ADD CONSTRAINT registration_pkey PRIMARY KEY (id);


--
-- Name: registration registration_username_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.registration
    ADD CONSTRAINT registration_username_key UNIQUE (username);


--
-- Name: document_coordinator_mapping uq_document_coordinator_mapping; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.document_coordinator_mapping
    ADD CONSTRAINT uq_document_coordinator_mapping UNIQUE (login_id, degree_id, course_id);


--
-- Name: exam_application exam_application_application_no_key; Type: CONSTRAINT; Schema: examination; Owner: -
--

ALTER TABLE ONLY examination.exam_application
    ADD CONSTRAINT exam_application_application_no_key UNIQUE (application_no);


--
-- Name: exam_application_details exam_application_details_pkey; Type: CONSTRAINT; Schema: examination; Owner: -
--

ALTER TABLE ONLY examination.exam_application_details
    ADD CONSTRAINT exam_application_details_pkey PRIMARY KEY (id);


--
-- Name: exam_application exam_application_pkey; Type: CONSTRAINT; Schema: examination; Owner: -
--

ALTER TABLE ONLY examination.exam_application
    ADD CONSTRAINT exam_application_pkey PRIMARY KEY (id);


--
-- Name: exam_application_details uq_exam_application_subject; Type: CONSTRAINT; Schema: examination; Owner: -
--

ALTER TABLE ONLY examination.exam_application_details
    ADD CONSTRAINT uq_exam_application_subject UNIQUE (exam_application_id, subject_id);


--
-- Name: admission_fee_conditional_charge admission_fee_conditional_charge_pkey; Type: CONSTRAINT; Schema: fees; Owner: -
--

ALTER TABLE ONLY fees.admission_fee_conditional_charge
    ADD CONSTRAINT admission_fee_conditional_charge_pkey PRIMARY KEY (id);


--
-- Name: admission_fee_structure_details admission_fee_structure_details_pkey; Type: CONSTRAINT; Schema: fees; Owner: -
--

ALTER TABLE ONLY fees.admission_fee_structure_details
    ADD CONSTRAINT admission_fee_structure_details_pkey PRIMARY KEY (id);


--
-- Name: admission_fee_structure admission_fee_structure_pkey; Type: CONSTRAINT; Schema: fees; Owner: -
--

ALTER TABLE ONLY fees.admission_fee_structure
    ADD CONSTRAINT admission_fee_structure_pkey PRIMARY KEY (id);


--
-- Name: application_fee application_fee_pkey; Type: CONSTRAINT; Schema: fees; Owner: -
--

ALTER TABLE ONLY fees.application_fee
    ADD CONSTRAINT application_fee_pkey PRIMARY KEY (id);


--
-- Name: exam_fee exam_fee_pkey; Type: CONSTRAINT; Schema: fees; Owner: -
--

ALTER TABLE ONLY fees.exam_fee
    ADD CONSTRAINT exam_fee_pkey PRIMARY KEY (id);


--
-- Name: fee_collection_manual_details fee_collection_manual_details_pkey; Type: CONSTRAINT; Schema: fees; Owner: -
--

ALTER TABLE ONLY fees.fee_collection_manual_details
    ADD CONSTRAINT fee_collection_manual_details_pkey PRIMARY KEY (id);


--
-- Name: fee_collection_manual fee_collection_manual_pkey; Type: CONSTRAINT; Schema: fees; Owner: -
--

ALTER TABLE ONLY fees.fee_collection_manual
    ADD CONSTRAINT fee_collection_manual_pkey PRIMARY KEY (id);


--
-- Name: fee_collection_manual fee_collection_manual_receipt_no_key; Type: CONSTRAINT; Schema: fees; Owner: -
--

ALTER TABLE ONLY fees.fee_collection_manual
    ADD CONSTRAINT fee_collection_manual_receipt_no_key UNIQUE (receipt_no);


--
-- Name: fee_collections fee_collections_pkey; Type: CONSTRAINT; Schema: fees; Owner: -
--

ALTER TABLE ONLY fees.fee_collections
    ADD CONSTRAINT fee_collections_pkey PRIMARY KEY (id);


--
-- Name: academic_dates academic_dates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academic_dates
    ADD CONSTRAINT academic_dates_pkey PRIMARY KEY (id);


--
-- Name: academic_year academic_year_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academic_year
    ADD CONSTRAINT academic_year_pkey PRIMARY KEY (id);


--
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);


--
-- Name: degrees degrees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.degrees
    ADD CONSTRAINT degrees_pkey PRIMARY KEY (id);


--
-- Name: lookup lookup_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup
    ADD CONSTRAINT lookup_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: receipt_sequence receipt_sequence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipt_sequence
    ADD CONSTRAINT receipt_sequence_pkey PRIMARY KEY (id);


--
-- Name: subjects subjects_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_code_key UNIQUE (code);


--
-- Name: subjects subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_pkey PRIMARY KEY (id);


--
-- Name: universities universities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.universities
    ADD CONSTRAINT universities_pkey PRIMARY KEY (id);


--
-- Name: faqs faqs_pkey; Type: CONSTRAINT; Schema: support; Owner: -
--

ALTER TABLE ONLY support.faqs
    ADD CONSTRAINT faqs_pkey PRIMARY KEY (id);


--
-- Name: support_ticket_messages support_ticket_messages_pkey; Type: CONSTRAINT; Schema: support; Owner: -
--

ALTER TABLE ONLY support.support_ticket_messages
    ADD CONSTRAINT support_ticket_messages_pkey PRIMARY KEY (id);


--
-- Name: support_tickets support_tickets_pkey; Type: CONSTRAINT; Schema: support; Owner: -
--

ALTER TABLE ONLY support.support_tickets
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);


--
-- Name: support_tickets support_tickets_ticket_no_key; Type: CONSTRAINT; Schema: support; Owner: -
--

ALTER TABLE ONLY support.support_tickets
    ADD CONSTRAINT support_tickets_ticket_no_key UNIQUE (ticket_no);


--
-- Name: idx_document_coordinator_mapping_course; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_document_coordinator_mapping_course ON auth.document_coordinator_mapping USING btree (course_id);


--
-- Name: idx_document_coordinator_mapping_degree; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_document_coordinator_mapping_degree ON auth.document_coordinator_mapping USING btree (degree_id);


--
-- Name: idx_document_coordinator_mapping_login; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_document_coordinator_mapping_login ON auth.document_coordinator_mapping USING btree (login_id);


--
-- Name: idx_exam_application_academic_year; Type: INDEX; Schema: examination; Owner: -
--

CREATE INDEX idx_exam_application_academic_year ON examination.exam_application USING btree (academic_year_id);


--
-- Name: idx_exam_application_sem; Type: INDEX; Schema: examination; Owner: -
--

CREATE INDEX idx_exam_application_sem ON examination.exam_application USING btree (sem_id);


--
-- Name: idx_admission_fee_conditional_charge_condition_id; Type: INDEX; Schema: fees; Owner: -
--

CREATE INDEX idx_admission_fee_conditional_charge_condition_id ON fees.admission_fee_conditional_charge USING btree (condition_id) WHERE (status = true);


--
-- Name: idx_faqs_category; Type: INDEX; Schema: support; Owner: -
--

CREATE INDEX idx_faqs_category ON support.faqs USING btree (category);


--
-- Name: idx_faqs_status; Type: INDEX; Schema: support; Owner: -
--

CREATE INDEX idx_faqs_status ON support.faqs USING btree (status);


--
-- Name: idx_support_tickets_issue_id; Type: INDEX; Schema: support; Owner: -
--

CREATE INDEX idx_support_tickets_issue_id ON support.support_tickets USING btree (issue_id);


--
-- Name: idx_support_tickets_status_id; Type: INDEX; Schema: support; Owner: -
--

CREATE INDEX idx_support_tickets_status_id ON support.support_tickets USING btree (status_id);


--
-- Name: idx_support_tickets_username; Type: INDEX; Schema: support; Owner: -
--

CREATE INDEX idx_support_tickets_username ON support.support_tickets USING btree (username);


--
-- Name: idx_ticket_messages_ticket; Type: INDEX; Schema: support; Owner: -
--

CREATE INDEX idx_ticket_messages_ticket ON support.support_ticket_messages USING btree (ticket_id, insert_on);


--
-- Name: application_course_details trg_set_cc_batch_type_id; Type: TRIGGER; Schema: admission; Owner: -
--

CREATE TRIGGER trg_set_cc_batch_type_id BEFORE INSERT ON admission.application_course_details FOR EACH ROW EXECUTE FUNCTION admission.set_cc_batch_type_id();


--
-- Name: course_subjects fk_course_subjects_course; Type: FK CONSTRAINT; Schema: academic; Owner: -
--

ALTER TABLE ONLY academic.course_subjects
    ADD CONSTRAINT fk_course_subjects_course FOREIGN KEY (course_id) REFERENCES public.courses(id);


--
-- Name: course_subjects fk_course_subjects_degree; Type: FK CONSTRAINT; Schema: academic; Owner: -
--

ALTER TABLE ONLY academic.course_subjects
    ADD CONSTRAINT fk_course_subjects_degree FOREIGN KEY (degree_id) REFERENCES public.degrees(id);


--
-- Name: course_subjects fk_course_subjects_subject; Type: FK CONSTRAINT; Schema: academic; Owner: -
--

ALTER TABLE ONLY academic.course_subjects
    ADD CONSTRAINT fk_course_subjects_subject FOREIGN KEY (subject_id) REFERENCES public.subjects(id);


--
-- Name: pg_education_period pg_education_period_detail_fkey; Type: FK CONSTRAINT; Schema: admission; Owner: -
--

ALTER TABLE ONLY admission.pg_education_period
    ADD CONSTRAINT pg_education_period_detail_fkey FOREIGN KEY (pg_education_detail_id) REFERENCES admission.pg_education_details(id);


--
-- Name: document_coordinator_mapping fk_document_coordinator_mapping_login; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.document_coordinator_mapping
    ADD CONSTRAINT fk_document_coordinator_mapping_login FOREIGN KEY (login_id) REFERENCES auth.login(id) ON DELETE CASCADE;


--
-- Name: exam_application fk_exam_application_academic_year; Type: FK CONSTRAINT; Schema: examination; Owner: -
--

ALTER TABLE ONLY examination.exam_application
    ADD CONSTRAINT fk_exam_application_academic_year FOREIGN KEY (academic_year_id) REFERENCES public.academic_year(id);


--
-- Name: exam_application_details fk_exam_application_details_application; Type: FK CONSTRAINT; Schema: examination; Owner: -
--

ALTER TABLE ONLY examination.exam_application_details
    ADD CONSTRAINT fk_exam_application_details_application FOREIGN KEY (exam_application_id) REFERENCES examination.exam_application(id);


--
-- Name: exam_application_details fk_exam_application_details_subject; Type: FK CONSTRAINT; Schema: examination; Owner: -
--

ALTER TABLE ONLY examination.exam_application_details
    ADD CONSTRAINT fk_exam_application_details_subject FOREIGN KEY (subject_id) REFERENCES public.subjects(id);


--
-- Name: application_fee application_fee_academic_year_fkey; Type: FK CONSTRAINT; Schema: fees; Owner: -
--

ALTER TABLE ONLY fees.application_fee
    ADD CONSTRAINT application_fee_academic_year_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_year(id);


--
-- Name: application_fee application_fee_category_fkey; Type: FK CONSTRAINT; Schema: fees; Owner: -
--

ALTER TABLE ONLY fees.application_fee
    ADD CONSTRAINT application_fee_category_fkey FOREIGN KEY (category_id) REFERENCES public.lookup(id);


--
-- Name: application_fee application_fee_course_fkey; Type: FK CONSTRAINT; Schema: fees; Owner: -
--

ALTER TABLE ONLY fees.application_fee
    ADD CONSTRAINT application_fee_course_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id);


--
-- Name: application_fee application_fee_degree_fkey; Type: FK CONSTRAINT; Schema: fees; Owner: -
--

ALTER TABLE ONLY fees.application_fee
    ADD CONSTRAINT application_fee_degree_fkey FOREIGN KEY (degree_id) REFERENCES public.degrees(id);


--
-- Name: exam_fee exam_fee_academic_year_fkey; Type: FK CONSTRAINT; Schema: fees; Owner: -
--

ALTER TABLE ONLY fees.exam_fee
    ADD CONSTRAINT exam_fee_academic_year_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_year(id);


--
-- Name: exam_fee exam_fee_course_fkey; Type: FK CONSTRAINT; Schema: fees; Owner: -
--

ALTER TABLE ONLY fees.exam_fee
    ADD CONSTRAINT exam_fee_course_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id);


--
-- Name: exam_fee exam_fee_degree_fkey; Type: FK CONSTRAINT; Schema: fees; Owner: -
--

ALTER TABLE ONLY fees.exam_fee
    ADD CONSTRAINT exam_fee_degree_fkey FOREIGN KEY (degree_id) REFERENCES public.degrees(id);


--
-- Name: admission_fee_conditional_charge fk_admission_fee_conditional_charge_condition; Type: FK CONSTRAINT; Schema: fees; Owner: -
--

ALTER TABLE ONLY fees.admission_fee_conditional_charge
    ADD CONSTRAINT fk_admission_fee_conditional_charge_condition FOREIGN KEY (condition_id) REFERENCES public.lookup(id);


--
-- Name: fee_collection_manual_details fk_fee_collection_manual_details_header; Type: FK CONSTRAINT; Schema: fees; Owner: -
--

ALTER TABLE ONLY fees.fee_collection_manual_details
    ADD CONSTRAINT fk_fee_collection_manual_details_header FOREIGN KEY (header_id) REFERENCES fees.fee_collection_manual(id) ON DELETE CASCADE;


--
-- Name: admission_fee_structure_details fk_fee_details_header; Type: FK CONSTRAINT; Schema: fees; Owner: -
--

ALTER TABLE ONLY fees.admission_fee_structure_details
    ADD CONSTRAINT fk_fee_details_header FOREIGN KEY (header_id) REFERENCES fees.admission_fee_structure(id) ON DELETE CASCADE;


--
-- Name: courses fk_course_degree; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT fk_course_degree FOREIGN KEY (degree_id) REFERENCES public.degrees(id) ON DELETE CASCADE;


--
-- Name: degrees fk_degree_university; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.degrees
    ADD CONSTRAINT fk_degree_university FOREIGN KEY (university_id) REFERENCES public.universities(id) ON DELETE CASCADE;


--
-- Name: support_ticket_messages support_ticket_messages_ticket_id_fkey; Type: FK CONSTRAINT; Schema: support; Owner: -
--

ALTER TABLE ONLY support.support_ticket_messages
    ADD CONSTRAINT support_ticket_messages_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES support.support_tickets(id);


--
-- Name: support_tickets support_tickets_issue_id_fkey; Type: FK CONSTRAINT; Schema: support; Owner: -
--

ALTER TABLE ONLY support.support_tickets
    ADD CONSTRAINT support_tickets_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES public.lookup(id);


--
-- Name: support_tickets support_tickets_status_id_fkey; Type: FK CONSTRAINT; Schema: support; Owner: -
--

ALTER TABLE ONLY support.support_tickets
    ADD CONSTRAINT support_tickets_status_id_fkey FOREIGN KEY (status_id) REFERENCES public.lookup(id);


--
-- PostgreSQL database dump complete
--

\unrestrict SyqzoEn8CwWYiY5v4YstD1EBctCMhgGsVKL0l0z9T5tjBz0lLiXwD3R3SAVoPFU

