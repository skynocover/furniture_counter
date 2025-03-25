# Furniture Counter

## Supabase Setup with TypeScript

This project uses Supabase as the database with TypeScript for type safety. Follow these steps to set up your Supabase project:

1. Create a Supabase account at [supabase.com](https://supabase.com) if you don't have one already
2. Create a new project in the Supabase dashboard
3. Once your project is created, go to the project settings to find your API credentials
4. Copy your project URL and anon/public key
5. Update the `.env.local` file with your credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```
6. Install the dependencies:
   ```
   npm install
   ```

## TypeScript Type Definitions

The project includes TypeScript definitions for your Supabase database in the `types/supabase.ts` file. These types ensure that your database operations are type-safe.

## Database Schema

Create the following tables in your Supabase project:

### furniture
- id: uuid (primary key, auto-generated)
- created_at: timestamp with time zone (default: now())
- name: text
- type: text
- description: text (optional)
- quantity: integer
- price: numeric (optional)
- location: text (optional)

You can create this table using the following SQL in the Supabase SQL editor:

```sql
CREATE TABLE public.furniture (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    quantity INTEGER NOT NULL,
    price NUMERIC,
    location TEXT
);
```

## Starting the development server

```
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your application. 