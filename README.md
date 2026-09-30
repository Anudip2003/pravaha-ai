# Pravaha — Personal Finance App

## Quick Start

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt

# Open .env and paste your SUPABASE_SERVICE_ROLE_KEY
uvicorn app.main:app --reload
```

### Frontend (new terminal)
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## One-time Supabase setup
1. Create free project at supabase.com
2. SQL Editor → paste supabase_schema.sql → Run
3. Authentication → Providers → Email → turn OFF "Confirm email"
4. Settings → API Keys → copy service_role key → paste in backend/.env

### Cash-flow planning
Run `backend/supabase_finance_settings.sql` once in the Supabase SQL Editor to save monthly income, category budgets, and confirmed recurring expenses per user.
