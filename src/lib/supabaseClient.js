import { createClient } from '@supabase/supabase-js';

// Configuração do cliente Supabase com as credenciais do ambiente
const supabaseUrl = 'https://quuiorlupuvrtkdewygi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1dWlvcmx1cHV2cnRrZGV3eWdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0NzE3MDIsImV4cCI6MjA2NDA0NzcwMn0.p3koJog3VurHXDZvyiND0BiVFG96gLZ35nwZgNy42Yo';

// Criação do cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
