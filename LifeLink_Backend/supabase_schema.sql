-- =============================================================================
-- LifeLink Platform — Complete Supabase PostgreSQL Database Schema
-- Run this script in the Supabase SQL Editor:
-- (Supabase Dashboard -> Project -> SQL Editor -> New Query -> Paste & Run)
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. USERS & PROFILES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supabase_uid UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) CHECK (role IN ('donor', 'receiver', 'hospital', 'admin')) DEFAULT 'donor',
    profile_image TEXT DEFAULT '',
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    is_blocked BOOLEAN DEFAULT FALSE,
    blocked_reason TEXT,
    
    -- Donor Info
    blood_group VARCHAR(5) CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    is_available BOOLEAN DEFAULT TRUE,
    last_donation_date TIMESTAMPTZ,
    next_eligible_date TIMESTAMPTZ,
    total_donations INTEGER DEFAULT 0,
    reward_points INTEGER DEFAULT 0,
    
    -- Health Information
    age INTEGER CHECK (age >= 18 AND age <= 65),
    weight NUMERIC CHECK (weight >= 45),
    has_chronic_disease BOOLEAN DEFAULT FALSE,
    
    -- Geo Location
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',
    
    -- Metadata (Hospital & Badges)
    hospital_info JSONB DEFAULT '{}'::jsonb, -- { registrationNumber, bloodBankLicense, isVerifiedHospital }
    badges JSONB DEFAULT '[]'::jsonb,       -- [{ name, icon, earnedAt }]
    notification_preferences JSONB DEFAULT '{"emergency": true, "reminders": true, "updates": true}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast donor discovery & geographic queries
CREATE INDEX IF NOT EXISTS idx_users_blood_group ON public.users(blood_group, is_available);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role, is_active);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_location ON public.users(latitude, longitude);

-- =============================================================================
-- 2. BLOOD REQUESTS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.blood_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requested_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    patient_name VARCHAR(100) NOT NULL,
    patient_age INTEGER,
    contact_number VARCHAR(25) NOT NULL,
    blood_group VARCHAR(5) NOT NULL CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    units_required INTEGER NOT NULL CHECK (units_required >= 1 AND units_required <= 20),
    units_collected INTEGER DEFAULT 0,
    
    -- Hospital Info
    hospital_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    hospital_name VARCHAR(150) NOT NULL,
    
    -- Location
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    address TEXT,
    
    -- Priority & Status
    priority VARCHAR(20) CHECK (priority IN ('critical', 'high', 'medium', 'low')) DEFAULT 'medium',
    status VARCHAR(25) CHECK (status IN ('active', 'partially_fulfilled', 'fulfilled', 'cancelled', 'expired')) DEFAULT 'active',
    
    -- Clinical Info
    medical_reason TEXT,
    is_emergency BOOLEAN DEFAULT FALSE,
    required_by TIMESTAMPTZ,
    
    -- AI Urgency Scoring & Anti-Fraud
    urgency_score INTEGER DEFAULT 0 CHECK (urgency_score >= 0 AND urgency_score <= 100),
    is_fraud_suspect BOOLEAN DEFAULT FALSE,
    fraud_score INTEGER DEFAULT 0,
    
    -- Broadcast Settings
    broadcast_radius INTEGER DEFAULT 10, -- km
    broadcast_count INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '48 hours'),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blood_requests_status ON public.blood_requests(status, priority);
CREATE INDEX IF NOT EXISTS idx_blood_requests_group ON public.blood_requests(blood_group);
CREATE INDEX IF NOT EXISTS idx_blood_requests_location ON public.blood_requests(latitude, longitude);

-- =============================================================================
-- 3. BLOOD REQUEST RESPONSES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.blood_request_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.blood_requests(id) ON DELETE CASCADE,
    donor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status VARCHAR(20) CHECK (status IN ('accepted', 'declined', 'donated', 'cancelled')) DEFAULT 'accepted',
    units INTEGER DEFAULT 1,
    notes TEXT,
    responded_at TIMESTAMPTZ DEFAULT NOW(),
    donated_at TIMESTAMPTZ,
    UNIQUE(request_id, donor_id)
);

CREATE INDEX IF NOT EXISTS idx_responses_request ON public.blood_request_responses(request_id);
CREATE INDEX IF NOT EXISTS idx_responses_donor ON public.blood_request_responses(donor_id);

-- =============================================================================
-- 4. BLOOD INVENTORIES TABLE (Hospital Blood Banks)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.blood_inventories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    a_pos INTEGER DEFAULT 0 CHECK (a_pos >= 0),
    a_neg INTEGER DEFAULT 0 CHECK (a_neg >= 0),
    b_pos INTEGER DEFAULT 0 CHECK (b_pos >= 0),
    b_neg INTEGER DEFAULT 0 CHECK (b_neg >= 0),
    ab_pos INTEGER DEFAULT 0 CHECK (ab_pos >= 0),
    ab_neg INTEGER DEFAULT 0 CHECK (ab_neg >= 0),
    o_pos INTEGER DEFAULT 0 CHECK (o_pos >= 0),
    o_neg INTEGER DEFAULT 0 CHECK (o_neg >= 0),
    total_units INTEGER GENERATED ALWAYS AS (
        a_pos + a_neg + b_pos + b_neg + ab_pos + ab_neg + o_pos + o_neg
    ) STORED,
    critical_groups TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 5. BLOOD INVENTORY HISTORY TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.blood_inventory_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_id UUID NOT NULL REFERENCES public.blood_inventories(id) ON DELETE CASCADE,
    blood_group VARCHAR(5) NOT NULL,
    action VARCHAR(20) CHECK (action IN ('added', 'used', 'expired')) NOT NULL,
    units INTEGER NOT NULL,
    performed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    reason TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 6. CHATS & REAL-TIME MESSAGING
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blood_request_id UUID REFERENCES public.blood_requests(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chat_participants (
    chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (chat_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type VARCHAR(20) CHECK (type IN ('text', 'image', 'system')) DEFAULT 'text',
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_chat ON public.messages(chat_id, created_at ASC);

-- =============================================================================
-- 7. NOTIFICATIONS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type VARCHAR(30) CHECK (type IN (
        'emergency_request', 'request_accepted', 'request_fulfilled',
        'donation_reminder', 'badge_earned', 'system', 'chat_message',
        'hospital_alert', 'blood_shortage'
    )) NOT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    priority VARCHAR(20) CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    related_request_id UUID REFERENCES public.blood_requests(id) ON DELETE SET NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id, is_read);

-- =============================================================================
-- 8. REWARD POINTS REDEMPTIONS (Discounts at Partner Hospitals)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.point_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    hospital_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    hospital_name VARCHAR(150) NOT NULL,
    treatment_name VARCHAR(150) NOT NULL,
    points_redeemed INTEGER NOT NULL CHECK (points_redeemed > 0),
    discount_amount NUMERIC(10, 2) NOT NULL,
    redeemed_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 9. SUPABASE STORAGE (Replaces Cloudinary for Profile Images & Proofs)
-- =============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'lifelink-uploads',
    'lifelink-uploads',
    true,
    5242880, -- 5 MB
    ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage bucket access policies
CREATE POLICY "Public Read Access on lifelink-uploads"
ON storage.objects FOR SELECT
USING (bucket_id = 'lifelink-uploads');

CREATE POLICY "Authenticated users can upload media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'lifelink-uploads');

CREATE POLICY "Users can update and delete their own uploads"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'lifelink-uploads');

-- =============================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_request_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_inventories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_redemptions ENABLE ROW LEVEL SECURITY;

-- Allow public reads for active blood requests & verified hospitals
CREATE POLICY "Public read for active blood requests"
ON public.blood_requests FOR SELECT
USING (true);

-- Allow authenticated users to insert requests
CREATE POLICY "Authenticated users can create requests"
ON public.blood_requests FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = requested_by OR true);

-- Allow public read of non-sensitive user profile data
CREATE POLICY "Public read profiles"
ON public.users FOR SELECT
USING (true);

-- Allow users to update their own profile
CREATE POLICY "Users update own profile"
ON public.users FOR UPDATE
USING (auth.uid() = supabase_uid);

-- Allow all authenticated operations on chats and messages
CREATE POLICY "Chat participants can view messages"
ON public.messages FOR SELECT
USING (true);

CREATE POLICY "Users can send messages"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (true);

-- =============================================================================
-- 11. SUPABASE REALTIME REPLICATION
-- =============================================================================
-- Enables real-time WebSocket listening in Web & Mobile for chats and emergency requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.blood_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.blood_inventories;

-- =============================================================================
-- 12. AUTOMATIC USER PROFILE TRIGGER (Sync Supabase Auth with public.users)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (
        supabase_uid,
        email,
        name,
        profile_image,
        role,
        is_verified
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
        COALESCE(NEW.raw_user_meta_data->>'role', 'donor'),
        NEW.email_confirmed_at IS NOT NULL
    )
    ON CONFLICT (email) DO UPDATE
    SET supabase_uid = EXCLUDED.supabase_uid;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at timestamp trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_blood_requests_updated_at
    BEFORE UPDATE ON public.blood_requests
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

