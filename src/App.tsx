/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  TrendingUp, 
  Package, 
  Calendar, 
  ChevronRight,
  X,
  Check,
  Filter,
  ArrowLeft,
  User,
  Phone,
  FileText,
  Clock,
  CheckCircle2,
  CreditCard,
  Banknote,
  QrCode,
  Tag,
  ShoppingBag,
  Vault,
  Users,
  Search,
  MessageCircle,
  LogOut,
  ShieldCheck,
  Mail,
  Lock,
  UserPlus,
  LogIn,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Eye,
  EyeOff
} from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO, isSameDay, subDays, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import confetti from 'canvas-confetti';

import { supabase, isSupabaseConfigured } from './lib/supabase';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Logo = ({ className }: { className?: string }) => (
  <div className={cn("relative flex items-center justify-center", className)}>
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Checklist Background */}
      <rect x="45" y="10" width="35" height="40" rx="4" fill="white" stroke="#1e293b" strokeWidth="2"/>
      <path d="M50 25L53 28L58 22" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M50 35L53 38L58 32" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="62" y1="25" x2="75" y2="25" stroke="#1e293b" strokeWidth="2" strokeLinecap="round"/>
      <line x1="62" y1="35" x2="75" y2="35" stroke="#1e293b" strokeWidth="2" strokeLinecap="round"/>
      
      {/* Money Bills */}
      <rect x="25" y="20" width="25" height="40" rx="2" fill="#15803d" transform="rotate(-15 25 20)"/>
      <rect x="30" y="15" width="25" height="40" rx="2" fill="#22c55e" transform="rotate(-5 30 15)"/>
      <circle cx="42" cy="35" r="5" fill="#15803d" opacity="0.5"/>
      <text x="39" y="39" fill="white" fontSize="10" fontWeight="bold" fontFamily="sans-serif">$</text>
      
      {/* Cash Box */}
      <path d="M20 50H80V75C80 80.5228 75.5228 85 70 85H30C24.4772 85 20 80.5228 20 75V50Z" fill="#0f172a"/>
      <path d="M20 50H80V58H20V50Z" fill="#1e293b"/>
      <circle cx="50" cy="70" r="4" fill="white"/>
      <rect x="48.5" y="72" width="3" height="5" rx="1" fill="white"/>
      
      {/* Gold Coin */}
      <circle cx="75" cy="55" r="12" fill="#f59e0b" stroke="white" strokeWidth="2"/>
      <text x="70" y="60" fill="white" fontSize="14" fontWeight="bold" fontFamily="sans-serif">$</text>
    </svg>
  </div>
);

// Types
interface Product {
  id: string;
  name: string;
  price: number;
  user_email?: string;
  created_at?: string;
}

type PaymentMethod = 'pix' | 'cash' | 'card';

interface Sale {
  id: string;
  nome: string;
  descricao: string;
  quantidade: number;
  valor: number;
  status: 'pago' | 'pendente';
  metodo_pagamento?: 'pix' | 'dinheiro' | 'cartao';
  cliente_nome?: string;
  cliente_whatsapp?: string;
  user_email?: string;
  data: string; // ISO string
  created_at?: string;
}

interface Access {
  id: string;
  nome: string;
  email: string;
  senha: string;
  data_validade: string;
  valor_pago: number;
  created_at: string;
}

// Local Storage Keys
const STORAGE_KEYS = {
  SALES: 'meucaixa_sales',
  PRODUCTS: 'meucaixa_products',
  AUTH: 'meucaixa_auth',
  ACCESSES: 'meucaixa_accesses'
};

type ViewType = 'sales' | 'products' | 'customers' | 'accesses';
type FilterType = 'today' | 'week' | 'month' | 'all';

export default function App() {
  const [view, setView] = useState<ViewType>('sales');
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [accesses, setAccesses] = useState<Access[]>([]);
  const [customers, setCustomers] = useState<{ 
    nome: string, 
    whatsapp: string, 
    servico: string, 
    data: string, 
    status: 'pago' | 'pendente',
    totalValor: number,
    totalVendas: number,
    isAtivo: boolean
  }[]>([]);
  
  const siteName = 'MEU CAIXA';
  const primaryColor = '#22c55e'; // green-500
  
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<string | null>(null);
  const [isProductDeleteModalOpen, setIsProductDeleteModalOpen] = useState<string | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isCustomerEditModalOpen, setIsCustomerEditModalOpen] = useState<{ oldNome: string, oldWhatsapp: string } | null>(null);
  
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAccessFormOpen, setIsAccessFormOpen] = useState(false);
  const [editingAccess, setEditingAccess] = useState<Access | null>(null);
  const [customerFormData, setCustomerFormData] = useState({ nome: '', whatsapp: '' });
  const [filter, setFilter] = useState<FilterType>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerSort, setCustomerSort] = useState<'date' | 'value' | 'name'>('date');
  const [customerStatusFilter, setCustomerStatusFilter] = useState<'all' | 'active' | 'pending'>('all');
  
  // Auth states
  const [authEmail, setAuthEmail] = useState('reydersonp50@gmail.com');
  const [authPassword, setAuthPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    quantidade: 1,
    valor: 0,
    status: 'pago' as 'pago' | 'pendente',
    metodo_pagamento: 'pix' as 'pix' | 'dinheiro' | 'cartao',
    cliente_nome: '',
    cliente_whatsapp: '',
    date: format(new Date(), 'yyyy-MM-dd')
  });

  const [productFormData, setProductFormData] = useState({
    name: '',
    price: 0
  });

  const [accessFormData, setAccessFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    data_validade: format(subDays(new Date(), -30), 'yyyy-MM-dd'),
    valor_pago: 0
  });

  const syncProfile = async (session: any) => {
    if (!session?.user) return;
    
    const userEmail = session.user.email?.toLowerCase() || '';
    const isHardcodedAdmin = userEmail === 'reydersonp50@gmail.com' || userEmail === 'admin@gmail.com';
    
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
        
      if (!profile) {
        // Create profile if it doesn't exist
        await supabase.from('profiles').insert({
          id: session.user.id,
          email: session.user.email,
          is_admin: isHardcodedAdmin
        });
      } else if (isHardcodedAdmin && !profile.is_admin) {
        // Ensure admin status is set for the main admin emails
        await supabase.from('profiles').update({ is_admin: true }).eq('id', session.user.id);
      }
    } catch (error) {
      console.error('Error syncing profile:', error);
    }
  };

  // Load initial data
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsAuthReady(true);
      setIsLoading(false);
      return;
    }

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await syncProfile(session);
          const userEmail = session.user.email?.toLowerCase() || '';
          setUser({ email: userEmail });
          
          // Check if admin
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', session.user.id)
            .single();
          
          if (profileError && profileError.code !== 'PGRST116') {
            console.error('Error fetching profile:', profileError);
          }
          
          const isUserAdmin = profile?.is_admin || userEmail === 'reydersonp50@gmail.com' || userEmail === 'admin@gmail.com';
          setIsAdmin(isUserAdmin);
          fetchData();
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setIsAuthReady(true);
        setIsLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        if (event === 'SIGNED_IN') {
          await syncProfile(session);
        }
        const userEmail = session.user.email?.toLowerCase() || '';
        setUser({ email: userEmail });
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', session.user.id)
          .single();
          
        const isUserAdmin = profile?.is_admin || userEmail === 'reydersonp50@gmail.com' || userEmail === 'admin@gmail.com';
        setIsAdmin(isUserAdmin);
        fetchData();
      } else {
        setUser(null);
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchData = async () => {
    if (!isSupabaseConfigured) return;
    setIsLoading(true);
    try {
      const [salesRes, productsRes, accessesRes] = await Promise.all([
        supabase.from('sales').select('*').order('data', { ascending: false }),
        supabase.from('products').select('*').order('name'),
        supabase.from('accesses').select('*').order('created_at', { ascending: false })
      ]);

      if (salesRes.data) setSales(salesRes.data);
      if (productsRes.data) setProducts(productsRes.data);
      if (accessesRes.data) setAccesses(accessesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsAuthLoading(true);
    
    const userEmail = authEmail.toLowerCase();
    const isAdminEmail = userEmail === 'reydersonp50@gmail.com' || userEmail === 'admin@gmail.com';
    
    // Master password logic for admins
    if (isAdminEmail && authPassword === 'admin123') {
      setUser({ email: userEmail });
      setIsAdmin(true);
      fetchData();
      setIsAuthLoading(false);
      return;
    }
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      });

      if (error) {
        // Fallback to custom accesses check if Supabase Auth fails
        const { data: accessData, error: accessError } = await supabase
          .from('accesses')
          .select('*')
          .eq('email', authEmail)
          .eq('senha', authPassword)
          .maybeSingle();

        if (accessData) {
          setUser({ email: userEmail });
          // Acessos gerados pelo painel NUNCA são admin, 
          // a menos que o e-mail seja um dos e-mails mestres.
          setIsAdmin(isAdminEmail);
          fetchData();
        } else {
          if (error.message.includes('Email not confirmed')) {
            setAuthError('E-mail ainda não confirmado no Supabase. Verifique sua caixa de entrada.');
          } else {
            setAuthError('E-mail ou senha incorretos.');
          }
          console.error('Auth error:', error.message);
        }
      }
    } catch (error) {
      setAuthError('Erro ao realizar login.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
    setView('sales');
  };

  // Update customers list whenever sales change
  useEffect(() => {
    const customerMap = new Map<string, { 
      nome: string, 
      whatsapp: string, 
      servico: string, 
      data: string, 
      status: 'pago' | 'pendente',
      totalValor: number,
      totalVendas: number,
      isAtivo: boolean
    }>();
    
    const now = new Date();
    const thirtyDaysAgo = subDays(now, 30);

    // Process sales from oldest to newest to keep the latest info but accumulate totals
    [...sales].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()).forEach(sale => {
      const customerName = sale.cliente_nome || sale.nome;
      const customerWhatsapp = sale.cliente_whatsapp || 'N/A';
      
      if (customerName) {
        const key = `${customerName}-${customerWhatsapp}`;
        const existing = customerMap.get(key);
        const saleDate = parseISO(sale.data);
        
        if (existing) {
          customerMap.set(key, {
            ...existing,
            servico: sale.cliente_nome ? sale.nome : existing.servico,
            data: sale.data,
            status: sale.status,
            totalValor: existing.totalValor + (sale.valor * sale.quantidade),
            totalVendas: existing.totalVendas + 1,
            isAtivo: saleDate >= thirtyDaysAgo || existing.isAtivo
          });
        } else {
          customerMap.set(key, {
            nome: customerName,
            whatsapp: customerWhatsapp,
            servico: sale.cliente_nome ? sale.nome : 'Venda Direta',
            data: sale.data,
            status: sale.status,
            totalValor: sale.valor * sale.quantidade,
            totalVendas: 1,
            isAtivo: saleDate >= thirtyDaysAgo
          });
        }
      }
    });
    
    const sortedCustomers = Array.from(customerMap.values()).sort((a, b) => 
      new Date(b.data).getTime() - new Date(a.data).getTime()
    );
    
    setCustomers(sortedCustomers);
  }, [sales]);

  useEffect(() => {
    document.documentElement.style.setProperty('--primary-color', primaryColor);
  }, [primaryColor]);

  // Calculations
  const filteredSales = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    
    // For filtering, we want to be inclusive of the whole month/week
    const monthEnd = endOfMonth(now);
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    return sales.filter(sale => {
      const saleDate = parseISO(sale.data);
      if (filter === 'today') return isSameDay(saleDate, today);
      if (filter === 'week') return isWithinInterval(saleDate, { start: weekStart, end: weekEnd });
      if (filter === 'month') return isWithinInterval(saleDate, { start: monthStart, end: monthEnd });
      return true;
    }).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [sales, filter]);

  const groupedSales = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = startOfDay(subDays(now, 7));
    const thisMonthStart = startOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    const last7Days = sales.filter(s => {
      const d = parseISO(s.data);
      return d >= sevenDaysAgo;
    }).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

    const thisMonth = sales.filter(s => {
      const d = parseISO(s.data);
      return d >= thisMonthStart && d < sevenDaysAgo;
    }).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

    const lastMonth = sales.filter(s => {
      const d = parseISO(s.data);
      return d >= lastMonthStart && d <= lastMonthEnd;
    }).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

    return { last7Days, thisMonth, lastMonth };
  }, [sales]);

  const filteredCustomers = useMemo(() => {
    let result = [...customers];
    
    if (customerSearch) {
      const search = customerSearch.toLowerCase();
      result = result.filter(c => 
        c.nome.toLowerCase().includes(search) || 
        c.whatsapp.includes(search)
      );
    }

    if (customerStatusFilter !== 'all') {
      result = result.filter(c => 
        customerStatusFilter === 'active' ? c.isAtivo : c.status === 'pendente'
      );
    }

    return result.sort((a, b) => {
      if (customerSort === 'value') return b.totalValor - a.totalValor;
      if (customerSort === 'name') return a.nome.localeCompare(b.nome);
      return new Date(b.data).getTime() - new Date(a.data).getTime();
    });
  }, [customers, customerSearch, customerSort, customerStatusFilter]);

  const customerStats = useMemo(() => {
    if (customers.length === 0) return { total: 0, top: null, active: 0, pending: 0, avgTicket: 0 };
    const top = [...customers].sort((a, b) => b.totalValor - a.totalValor)[0];
    const active = customers.filter(c => c.isAtivo).length;
    const pending = customers.filter(c => c.status === 'pendente').length;
    const totalValue = customers.reduce((acc, c) => acc + c.totalValor, 0);
    const avgTicket = totalValue / customers.length;
    return {
      total: customers.length,
      top,
      active,
      pending,
      avgTicket
    };
  }, [customers]);

  const stats = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    
    const monthEnd = endOfMonth(now);
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    const lastMonthStart = startOfMonth(subMonths(now, 1));

    const getStatsForRange = (rangeStart: Date, rangeEnd: Date) => {
      const rangeSales = sales.filter(s => {
        const saleDate = parseISO(s.data);
        return saleDate >= rangeStart && saleDate <= rangeEnd;
      });
      return {
        total: rangeSales.reduce((acc, s) => acc + s.valor, 0),
        paid: rangeSales.filter(s => s.status === 'pago').reduce((acc, s) => acc + s.valor, 0),
        pending: rangeSales.filter(s => s.status === 'pendente').reduce((acc, s) => acc + s.valor, 0),
        count: rangeSales.length,
        items: rangeSales.reduce((acc, s) => acc + s.quantidade, 0)
      };
    };

    const twoMonthsSales = sales.filter(s => {
      const saleDate = parseISO(s.data);
      return saleDate >= lastMonthStart && saleDate <= monthEnd && s.status === 'pago';
    });

    return {
      today: getStatsForRange(today, endOfDay(now)),
      week: getStatsForRange(weekStart, weekEnd),
      month: getStatsForRange(monthStart, monthEnd),
      twoMonthsTotal: twoMonthsSales.reduce((acc, s) => acc + s.valor, 0)
    };
  }, [sales]);

  // Handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'productId') {
      const selectedProduct = products.find(p => p.id === value);
      if (selectedProduct) {
        setFormData(prev => ({
          ...prev,
          nome: selectedProduct.name,
          valor: selectedProduct.price
        }));
        return;
      }
    }

    // Logic to clear 0 when typing in numeric fields
    let finalValue: any = value;
    if (name === 'quantidade' || name === 'valor') {
      // If the current value is 0 and the user types something, we might want to replace it.
      // But standard input type="number" handles some of this.
      // However, the user specifically asked to "apaga o 0 que tem".
      finalValue = value === '' ? 0 : Number(value);
    }

    setFormData(prev => ({
      ...prev,
      [name]: finalValue
    }));
  };

  const handleProductInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProductFormData(prev => ({
      ...prev,
      [name]: name === 'price' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showNotification('Você precisa estar logado para salvar.', 'error');
      return;
    }
    
    setIsSaving(true);
    const saleData = {
      user_email: user.email,
      nome: formData.nome,
      descricao: formData.descricao,
      quantidade: formData.quantidade,
      valor: formData.valor,
      status: formData.status,
      metodo_pagamento: formData.metodo_pagamento,
      cliente_nome: formData.cliente_nome,
      cliente_whatsapp: formData.cliente_whatsapp,
      data: new Date(formData.date + 'T12:00:00').toISOString()
    };

    console.log('Saving sale:', saleData);

    try {
      if (editingSale) {
        const { error } = await supabase
          .from('sales')
          .update(saleData)
          .eq('id', editingSale.id);
        if (error) throw error;
        showNotification('Venda atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('sales')
          .insert([saleData]);
        if (error) throw error;
        
        showNotification('Venda cadastrada com sucesso!');
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: [primaryColor, '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
        });
      }
      await fetchData();
      closeForm();
    } catch (error: any) {
      console.error('Error saving sale:', error);
      showNotification(`Erro ao salvar venda: ${error.message || 'Erro desconhecido'}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showNotification('Você precisa estar logado para salvar.', 'error');
      return;
    }

    setIsSaving(true);
    const productData = {
      user_email: user.email,
      name: productFormData.name,
      price: productFormData.price
    };

    console.log('Saving product:', productData);

    try {
      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);
        if (error) throw error;
        showNotification('Produto atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('products')
          .insert([productData]);
        if (error) throw error;
        showNotification('Produto cadastrado com sucesso!');
      }
      await fetchData();
      closeProductForm();
    } catch (error: any) {
      console.error('Error saving product:', error);
      showNotification(`Erro ao salvar produto: ${error.message || 'Erro desconhecido'}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteSale = async (id: string) => {
    try {
      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchData();
      setIsDeleteModalOpen(null);
    } catch (error) {
      console.error('Error deleting sale:', error);
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchData();
      setIsProductDeleteModalOpen(null);
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const openForm = (sale?: Sale) => {
    if (sale) {
      setEditingSale(sale);
      setFormData({
        nome: sale.nome,
        descricao: sale.descricao || '',
        quantidade: sale.quantidade,
        valor: sale.valor / sale.quantidade, // Store unit price in form
        status: sale.status || 'pago',
        metodo_pagamento: sale.metodo_pagamento || 'pix',
        cliente_nome: sale.cliente_nome || '',
        cliente_whatsapp: sale.cliente_whatsapp || '',
        date: format(parseISO(sale.data), 'yyyy-MM-dd')
      });
    } else {
      setEditingSale(null);
      setFormData({
        nome: '',
        descricao: '',
        quantidade: 1,
        valor: 0,
        status: 'pago',
        metodo_pagamento: 'pix',
        cliente_nome: '',
        cliente_whatsapp: '',
        date: format(new Date(), 'yyyy-MM-dd')
      });
    }
    setIsFormOpen(true);
  };

  const openProductForm = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setProductFormData({
        name: product.name,
        price: product.price
      });
    } else {
      setEditingProduct(null);
      setProductFormData({
        name: '',
        price: 0
      });
    }
    setIsProductFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingSale(null);
  };

  const closeProductForm = () => {
    setIsProductFormOpen(false);
    setEditingProduct(null);
  };

  const openAccessForm = (access?: Access) => {
    if (access) {
      setEditingAccess(access);
      setAccessFormData({
        nome: access.nome,
        email: access.email,
        senha: access.senha,
        data_validade: format(parseISO(access.data_validade), 'yyyy-MM-dd'),
        valor_pago: access.valor_pago
      });
    } else {
      setEditingAccess(null);
      setAccessFormData({
        nome: '',
        email: '',
        senha: '',
        data_validade: format(subDays(new Date(), -30), 'yyyy-MM-dd'),
        valor_pago: 0
      });
    }
    setIsAccessFormOpen(true);
  };

  const closeAccessForm = () => {
    setIsAccessFormOpen(false);
    setEditingAccess(null);
  };

  const handleAccessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showNotification('Apenas administradores podem gerenciar acessos.', 'error');
      return;
    }

    setIsSaving(true);
    const accessData = {
      nome: accessFormData.nome,
      email: accessFormData.email,
      senha: accessFormData.senha,
      data_validade: new Date(accessFormData.data_validade + 'T12:00:00').toISOString(),
      valor_pago: accessFormData.valor_pago
    };

    console.log('Saving access:', accessData);

    try {
      if (editingAccess) {
        const { error } = await supabase
          .from('accesses')
          .update(accessData)
          .eq('id', editingAccess.id);
        if (error) throw error;
        showNotification('Acesso atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('accesses')
          .insert([accessData]);
        if (error) throw error;
        showNotification('Acesso gerado com sucesso!');
      }
      await fetchData();
      closeAccessForm();
    } catch (error: any) {
      console.error('Error saving access:', error);
      showNotification(`Erro ao salvar acesso: ${error.message || 'Erro desconhecido'}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const testSupabaseConnection = async () => {
    if (!isSupabaseConfigured) {
      showNotification('Supabase não configurado.', 'error');
      return;
    }
    
    setIsSaving(true);
    try {
      // Try to fetch a single record from each table to verify they exist
      const results = await Promise.allSettled([
        supabase.from('sales').select('id').limit(1),
        supabase.from('products').select('id').limit(1),
        supabase.from('accesses').select('id').limit(1),
        supabase.from('profiles').select('id').limit(1)
      ]);

      const errors = results
        .map(r => {
          if (r.status === 'rejected') return r.reason;
          if (r.status === 'fulfilled' && r.value.error) return r.value.error;
          return null;
        })
        .filter(Boolean);

      if (errors.length > 0) {
        console.error('Connection test errors:', errors);
        showNotification(`Erro em algumas tabelas. Verifique o console.`, 'error');
      } else {
        showNotification('Conexão com Supabase OK! Todas as tabelas encontradas.');
      }
    } catch (error: any) {
      console.error('Connection test failed:', error);
      showNotification(`Erro de conexão: ${error.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteAccess = async (id: string) => {
    try {
      const { error } = await supabase
        .from('accesses')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error deleting access:', error);
    }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerFormData.nome || !customerFormData.whatsapp || !user) return;

    const newSale = {
      user_email: user.email,
      nome: 'Cadastro Inicial',
      descricao: 'Cliente cadastrado manualmente',
      quantidade: 0,
      valor: 0,
      status: 'pago',
      cliente_nome: customerFormData.nome,
      cliente_whatsapp: customerFormData.whatsapp,
      data: new Date().toISOString()
    };

    try {
      const { error } = await supabase
        .from('sales')
        .insert([newSale]);
      if (error) throw error;
      fetchData();
      setIsCustomerModalOpen(false);
      setCustomerFormData({ nome: '', whatsapp: '' });
    } catch (error) {
      console.error('Error adding customer:', error);
    }
  };

  const handleCustomerEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCustomerEditModalOpen || !user) return;

    const { oldNome, oldWhatsapp } = isCustomerEditModalOpen;
    const { nome, whatsapp } = customerFormData;

    setSales(prev => prev.map(sale => {
      const isMatch = (sale.cliente_nome === oldNome || sale.nome === oldNome) && 
                      sale.cliente_whatsapp === oldWhatsapp;
      
      if (isMatch) {
        return {
          ...sale,
          cliente_nome: sale.cliente_nome ? nome : sale.cliente_nome,
          nome: !sale.cliente_nome ? nome : sale.nome,
          cliente_whatsapp: whatsapp
        };
      }
      return sale;
    }));

    setIsCustomerEditModalOpen(null);
  };

  const openCustomerEdit = (customer: any) => {
    setIsCustomerEditModalOpen({ oldNome: customer.nome, oldWhatsapp: customer.whatsapp });
    setCustomerFormData({ nome: customer.nome, whatsapp: customer.whatsapp });
  };

  const copyToClipboard = (text: string) => {
    const doCopy = (t: string) => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        doCopy(text);
      }).catch(err => {
        console.error('Failed to copy: ', err);
        fallbackCopy(text, doCopy);
      });
    } else {
      fallbackCopy(text, doCopy);
    }
  };

  const fallbackCopy = (text: string, callback: (t: string) => void) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    // Ensure the textarea is not visible but still part of the DOM
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      const successful = document.execCommand('copy');
      if (successful) callback(text);
    } catch (err) {
      console.error('Fallback copy failed', err);
    }
    document.body.removeChild(textArea);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 rounded-3xl p-8 shadow-2xl border border-slate-700 text-center space-y-6">
          <div className="bg-amber-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-10 h-10 text-amber-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white">Configuração Pendente</h2>
            <p className="text-slate-400">
              O Supabase ainda não foi configurado. Por favor, adicione as variáveis de ambiente 
              <code className="bg-slate-900 px-2 py-1 rounded text-primary mx-1">VITE_SUPABASE_URL</code> e 
              <code className="bg-slate-900 px-2 py-1 rounded text-primary mx-1">VITE_SUPABASE_ANON_KEY</code> 
              no menu de configurações.
            </p>
          </div>
          <div className="bg-slate-900/50 p-4 rounded-2xl text-left text-xs space-y-2 font-mono text-slate-500">
            <p>1. Vá em Settings (ícone de engrenagem)</p>
            <p>2. Adicione as chaves do Supabase</p>
            <p>3. Reinicie o servidor se necessário</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden"
        >
          <div className="p-8 text-center bg-primary/5 border-b border-slate-100">
            <div className="w-32 h-32 flex items-center justify-center mx-auto mb-6 p-2">
              <Logo className="w-full h-full" />
            </div>
            <div className="flex flex-col items-center mb-2">
              <div className="relative">
                {/* Decorative rays */}
                <div className="absolute -left-8 top-0 flex flex-col gap-1">
                  <div className="w-4 h-1 bg-green-500 rounded-full rotate-[30deg]" />
                  <div className="w-4 h-1 bg-green-500 rounded-full" />
                  <div className="w-4 h-1 bg-green-500 rounded-full -rotate-[30deg]" />
                </div>
                <div className="absolute -right-8 top-0 flex flex-col gap-1">
                  <div className="w-4 h-1 bg-green-500 rounded-full -rotate-[30deg]" />
                  <div className="w-4 h-1 bg-green-500 rounded-full" />
                  <div className="w-4 h-1 bg-green-500 rounded-full rotate-[30deg]" />
                </div>
                
                <span className="text-4xl font-black text-[#1e3a8a] uppercase tracking-tight leading-none">MEU</span>
              </div>
              <span className="text-6xl font-black text-[#22c55e] uppercase tracking-tighter leading-none mt-1">CAIXA</span>
              
              <div className="w-full h-1 bg-green-500 rounded-full mt-2 opacity-50" />
              <p className="text-[#1e3a8a] font-bold text-[10px] uppercase tracking-[0.2em] mt-2">Simples, Rápido e no seu dia a dia</p>
            </div>
            <p className="text-slate-400 font-medium text-xs mt-6">Entre com suas credenciais para gerenciar o sistema</p>
          </div>

          <div className="p-8">
            <form onSubmit={handleAuth} className="space-y-4">
              {authError && (
                <div className="bg-rose-50 text-rose-600 p-3 rounded-xl text-xs font-bold flex items-center gap-2 border border-rose-100">
                  <AlertCircle className="w-4 h-4" /> {authError}
                </div>
              )}
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">E-mail do Administrador</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="email" 
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="admin@exemplo.com"
                    className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all text-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-12 py-3 rounded-2xl border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <button 
                type="submit"
                disabled={isAuthLoading}
                className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
              >
                {isAuthLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <LogIn className="w-5 h-5" />
                )}
                Acessar Painel
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20 relative overflow-hidden">
      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 20 }}
            exit={{ opacity: 0, y: -50 }}
            className={cn(
              "fixed top-0 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl font-bold flex items-center gap-3 border",
              notification.type === 'success' 
                ? "bg-emerald-500 text-white border-emerald-400" 
                : "bg-rose-500 text-white border-rose-400"
            )}
          >
            {notification.type === 'success' ? <Check className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 20 }}
            exit={{ opacity: 0, y: -50 }}
            className={cn(
              "fixed top-0 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl font-bold flex items-center gap-3 border",
              notification.type === 'success' 
                ? "bg-emerald-500 text-white border-emerald-400" 
                : "bg-rose-500 text-white border-rose-400"
            )}
          >
            {notification.type === 'success' ? <Check className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>
      <div 
        className="fixed inset-0 pointer-events-none opacity-10"
        style={{ 
          background: `radial-gradient(circle at 50% -20%, ${primaryColor}40, transparent 70%)` 
        }} 
      />
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --primary-color: ${primaryColor};
        }
        .text-primary { color: var(--primary-color); }
        .bg-primary { background-color: var(--primary-color); }
        .border-primary { border-color: var(--primary-color); }
        .ring-primary { --tw-ring-color: var(--primary-color); }
        .focus-primary:focus { border-color: var(--primary-color); ring-color: var(--primary-color); }
      `}} />
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-3 sm:py-4 shadow-sm">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight flex items-center gap-2">
                <div className="w-10 h-10 flex items-center justify-center p-1">
                  <Logo className="w-full h-full" />
                </div>
                <div className="flex flex-col -space-y-1">
                  <span className="text-[10px] font-black text-[#1e3a8a] uppercase tracking-tighter leading-none">MEU</span>
                  <span className="text-lg sm:text-xl font-black text-[#22c55e] uppercase tracking-tighter leading-none">CAIXA</span>
                </div>
              </h1>
              {isAdmin && (
                <div className="bg-amber-50 text-amber-600 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase flex items-center gap-1 border border-amber-100">
                  <ShieldCheck className="w-3 h-3" /> Admin
                </div>
              )}
            </div>
            
            <nav className="hidden sm:flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button 
                onClick={() => setView('sales')}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                  view === 'sales' ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                <ShoppingBag className="w-4 h-4" /> Vendas
              </button>
              <button 
                onClick={() => setView('products')}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                  view === 'products' ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                <Tag className="w-4 h-4" /> Catálogo
              </button>
              <button 
                onClick={() => setView('customers')}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                  view === 'customers' ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                <Users className="w-4 h-4" /> Clientes
              </button>
              {isAdmin && (
                <button 
                  onClick={() => setView('accesses')}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                    view === 'accesses' ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <ShieldCheck className="w-4 h-4" /> Painel Admin
                </button>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
              title="Sair"
            >
              <LogOut className="w-5 h-5" />
            </button>
            <button 
              onClick={() => {
                if (view === 'sales') openForm();
                else if (view === 'products') openProductForm();
                else if (view === 'accesses') openAccessForm();
              }}
              className="bg-primary text-white px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition-all active:scale-95 shadow-lg"
              style={{ boxShadow: `0 10px 15px -3px ${primaryColor}40` }}
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">
                {view === 'sales' ? 'Nova Venda' : view === 'products' ? 'Novo Produto' : 'Novo Acesso'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Nav */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-lg border-t border-slate-200 px-6 py-3 flex justify-between items-center shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
        <button 
          onClick={() => setView('sales')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            view === 'sales' ? "text-primary scale-110" : "text-slate-400"
          )}
          style={view === 'sales' ? { color: primaryColor } : {}}
        >
          <ShoppingBag className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase tracking-tighter">Vendas</span>
        </button>
        <button 
          onClick={() => setView('products')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            view === 'products' ? "text-primary scale-110" : "text-slate-400"
          )}
          style={view === 'products' ? { color: primaryColor } : {}}
        >
          <Tag className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase tracking-tighter">Catálogo</span>
        </button>
        <button 
          onClick={() => setView('customers')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            view === 'customers' ? "text-primary scale-110" : "text-slate-400"
          )}
          style={view === 'customers' ? { color: primaryColor } : {}}
        >
          <Users className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase tracking-tighter">Clientes</span>
        </button>
        {isAdmin && (
          <button 
            onClick={() => setView('accesses')}
            className={cn(
              "flex flex-col items-center gap-1 transition-all",
              view === 'accesses' ? "text-primary scale-110" : "text-slate-400"
            )}
            style={view === 'accesses' ? { color: primaryColor } : {}}
          >
            <ShieldCheck className="w-6 h-6" />
            <span className="text-[10px] font-black uppercase tracking-tighter">Admin</span>
          </button>
        )}
      </div>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-8">
        {view === 'sales' ? (
          <>
            {/* Dashboard Stats */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 relative overflow-hidden shadow-sm">
              <div 
                className="absolute inset-0 opacity-5 pointer-events-none"
                style={{ background: `radial-gradient(circle at 0% 0%, ${primaryColor}, transparent 50%)` }}
              />
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
                <StatCard 
                  title="Total Hoje" 
                  value={formatCurrency(stats.today.total)} 
                  subtitle={`${stats.today.count} vendas hoje`}
                  icon={<Calendar className="w-5 h-5" style={{ color: primaryColor }} />}
                  color="indigo"
                  primaryColor={primaryColor}
                />
                <StatCard 
                  title="Pago esse Mês" 
                  value={formatCurrency(stats.month.paid)} 
                  subtitle="Recebido este mês"
                  icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                  color="indigo"
                  primaryColor={primaryColor}
                />
                <StatCard 
                  title="Total Pendente" 
                  value={formatCurrency(stats.month.pending)} 
                  subtitle="A receber este mês"
                  icon={<Clock className="w-5 h-5 text-amber-500" />}
                  color="indigo"
                  primaryColor={primaryColor}
                />
                <StatCard 
                  title="Total Pago" 
                  value={formatCurrency(stats.twoMonthsTotal)} 
                  subtitle="Mês atual + Mês passado"
                  icon={<TrendingUp className="w-5 h-5" style={{ color: primaryColor }} />}
                  color="indigo"
                  primaryColor={primaryColor}
                />
              </section>
            </div>

        {/* Filters & List */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              Vendas Recentes
              <span className="text-xs font-normal bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                {sales.length}
              </span>
            </h2>
          </div>

          <div className="space-y-8">
            {/* Últimos 7 Dias */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" style={{ backgroundColor: primaryColor }} />
                Últimos 7 Dias
                <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                  {groupedSales.last7Days.length}
                </span>
              </h3>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {groupedSales.last7Days.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {groupedSales.last7Days.map((sale) => (
                      <SaleItem 
                        key={sale.id} 
                        sale={sale} 
                        onEdit={() => openForm(sale)} 
                        onDelete={() => setIsDeleteModalOpen(sale.id)}
                        formatCurrency={formatCurrency}
                        isAdmin={isAdmin}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-400 text-sm italic">
                    Nenhuma venda nos últimos 7 dias
                  </div>
                )}
              </div>
            </div>

            {/* Este Mês */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                Este Mês ({format(new Date(), 'MMMM', { locale: ptBR })})
                <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                  {groupedSales.thisMonth.length}
                </span>
              </h3>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {groupedSales.thisMonth.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {groupedSales.thisMonth.map((sale) => (
                      <SaleItem 
                        key={sale.id} 
                        sale={sale} 
                        onEdit={() => openForm(sale)} 
                        onDelete={() => setIsDeleteModalOpen(sale.id)}
                        formatCurrency={formatCurrency}
                        isAdmin={isAdmin}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-400 text-sm italic">
                    Nenhuma outra venda este mês
                  </div>
                )}
              </div>
            </div>

            {/* Mês Passado */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                Mês Passado ({format(subMonths(new Date(), 1), 'MMMM', { locale: ptBR })})
                <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                  {groupedSales.lastMonth.length}
                </span>
              </h3>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {groupedSales.lastMonth.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {groupedSales.lastMonth.map((sale) => (
                      <SaleItem 
                        key={sale.id} 
                        sale={sale} 
                        onEdit={() => openForm(sale)} 
                        onDelete={() => setIsDeleteModalOpen(sale.id)}
                        formatCurrency={formatCurrency}
                        isAdmin={isAdmin}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-400 text-sm italic">
                    Nenhuma venda no mês passado
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
          </>
        ) : view === 'products' ? (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-800">Catálogo de Produtos</h2>
              <p className="text-sm text-slate-500">{products.length} itens cadastrados</p>
            </div>

            <div className="flex flex-col gap-3">
              {products.map(product => (
                <div key={product.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm group hover:border-primary/30 transition-all flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center text-primary font-black text-xl" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}>
                      {product.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">{product.name}</h3>
                      <div className="flex items-center gap-2">
                        <p className="text-primary font-black text-lg" style={{ color: primaryColor }}>{formatCurrency(product.price)}</p>
                        {isAdmin && product.userEmail && (
                          <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-100 uppercase tracking-tighter">
                            {product.userEmail}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openProductForm(product)} className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-lg">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setIsProductDeleteModalOpen(product.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded-lg transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              
              <button 
                onClick={() => openProductForm()}
                className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-primary/50 hover:text-primary transition-all group bg-white/50"
              >
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="font-bold text-sm">Novo Produto</span>
              </button>
            </div>
          </section>
        ) : view === 'accesses' && isAdmin ? (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-slate-800">Gerenciar Acessos</h2>
                <p className="text-sm text-slate-500">{accesses.length} acessos gerados</p>
              </div>
              <button 
                onClick={testSupabaseConnection}
                disabled={isSaving}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-slate-200 transition-all disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                Testar Banco
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {accesses.map(access => (
                <div key={access.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm group hover:border-primary/30 transition-all flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center text-primary font-black text-xl" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}>
                      {access.nome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">{access.nome}</h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-tight flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {access.email}
                        </span>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-tight flex items-center gap-1">
                          <Lock className="w-3 h-3" /> {access.senha}
                        </span>
                        <span className="text-xs font-bold text-emerald-600 uppercase tracking-tight flex items-center gap-1">
                          <Banknote className="w-3 h-3" /> {formatCurrency(access.valor_pago)}
                        </span>
                        <span className="text-xs font-bold text-amber-600 uppercase tracking-tight flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Validade: {format(parseISO(access.data_validade), 'dd/MM/yyyy')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openAccessForm(access)} className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-lg">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteAccess(access.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded-lg transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              
              <button 
                onClick={() => openAccessForm()}
                className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-primary/50 hover:text-primary transition-all group bg-white/50"
              >
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="font-bold text-sm">Gerar Novo Acesso</span>
              </button>
            </div>
          </section>
        ) : (
          <section className="space-y-6 pb-10">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-800">Meus Clientes</h2>
              <button 
                onClick={() => {
                  setCustomerFormData({ nome: '', whatsapp: '' });
                  setIsCustomerModalOpen(true);
                }}
                className="bg-primary text-white px-4 py-2 rounded-2xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-all"
                style={{ backgroundColor: primaryColor }}
              >
                <Plus className="w-4 h-4" /> Novo Cliente
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xl font-black text-slate-800">{customerStats.active}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Clientes Ativos</div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-600">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xl font-black text-slate-800">{customerStats.pending}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Clientes Pendentes</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                <input 
                  type="text"
                  placeholder="Buscar por nome ou zap..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-100 focus-primary outline-none bg-slate-50 transition-all"
                />
              </div>
              
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ordenar:</span>
                  <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button 
                      onClick={() => setCustomerSort('date')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all",
                        customerSort === 'date' ? "bg-white text-primary shadow-sm" : "text-slate-500"
                      )}
                    >Recentes</button>
                    <button 
                      onClick={() => setCustomerSort('value')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all",
                        customerSort === 'value' ? "bg-white text-primary shadow-sm" : "text-slate-500"
                      )}
                    >Valor</button>
                    <button 
                      onClick={() => setCustomerSort('name')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all",
                        customerSort === 'name' ? "bg-white text-primary shadow-sm" : "text-slate-500"
                      )}
                    >Nome</button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status:</span>
                  <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button 
                      onClick={() => setCustomerStatusFilter('all')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all",
                        customerStatusFilter === 'all' ? "bg-white text-primary shadow-sm" : "text-slate-500"
                      )}
                    >Todos</button>
                    <button 
                      onClick={() => setCustomerStatusFilter('active')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all",
                        customerStatusFilter === 'active' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500"
                      )}
                    >Ativos</button>
                    <button 
                      onClick={() => setCustomerStatusFilter('pending')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all",
                        customerStatusFilter === 'pending' ? "bg-white text-amber-600 shadow-sm" : "text-slate-500"
                      )}
                    >Pendentes</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer, idx) => (
                  <div key={idx} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:border-primary/30 transition-all group relative overflow-hidden flex flex-col">
                    {/* Header: Identity & Date */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-lg shadow-inner" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}>
                          {customer.nome.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-800 leading-tight truncate max-w-[140px] sm:max-w-none">{customer.nome}</h4>
                          <div className="flex items-center gap-1.5 text-slate-500 text-xs mt-0.5">
                            <Phone className="w-3 h-3" />
                            <span className="font-medium">{customer.whatsapp}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1 whitespace-nowrap bg-slate-50 px-2 py-1 rounded-lg">
                        <Calendar className="w-3 h-3" /> {format(parseISO(customer.data), "dd/MM/yyyy")}
                      </div>
                    </div>

                    {/* Status Badges & Last Service */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className={cn(
                        "text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider",
                        customer.status === 'pago' ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                      )}>
                        {customer.status === 'pago' ? 'Pago' : 'Pendente'}
                      </span>
                      <span className={cn(
                        "text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider",
                        customer.isAtivo ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400"
                      )}>
                        {customer.isAtivo ? 'Ativo' : 'Inativo'}
                      </span>
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider bg-slate-50 text-slate-500 flex items-center gap-1 border border-slate-100">
                        <Package className="w-2.5 h-2.5" /> {customer.servico}
                      </span>
                    </div>

                    {/* Stats Grid - Bento Style */}
                    <div className="grid grid-cols-2 gap-2 mb-4 flex-1">
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Gasto</div>
                        <div className="text-base font-black text-slate-800">{formatCurrency(customer.totalValor)}</div>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Frequência</div>
                        <div className="text-base font-black text-slate-800">{customer.totalVendas} {customer.totalVendas === 1 ? 'venda' : 'vendas'}</div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-auto">
                      <a 
                        href={`https://wa.me/55${customer.whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 bg-emerald-500 text-white py-2 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 hover:bg-emerald-600 transition-all active:scale-95 shadow-sm"
                      >
                        <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                      </a>
                      <button 
                        onClick={() => copyToClipboard(`${customer.nome} - ${customer.whatsapp}`)}
                        className={cn(
                          "flex-1 py-2 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm",
                          isCopied ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        )}
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                        {isCopied ? "Copiado!" : "Copiar"}
                      </button>
                      <button 
                        onClick={() => openCustomerEdit(customer)}
                        className="p-2 bg-slate-100 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all active:scale-95"
                        title="Editar Cliente"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-20 text-center space-y-4 bg-white rounded-3xl border border-slate-200">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                    <Search className="w-8 h-8 text-slate-300" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-800 font-bold">Nenhum cliente encontrado</p>
                    <p className="text-slate-500 text-sm">Tente buscar por outro nome ou número.</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {/* Modal Form */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeForm}
              className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border-t sm:border border-slate-200"
            >
              <div className="px-6 py-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-800">
                  {editingSale ? 'Editar Venda' : 'Nova Venda'}
                </h3>
                <button onClick={closeForm} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-600 flex items-center gap-2">
                      <Package className="w-4 h-4 text-primary" style={{ color: primaryColor }} /> Selecionar Produto
                    </label>
                    <select 
                      required
                      name="productId"
                      value={products.find(p => p.name === formData.nome)?.id || ''}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus-primary outline-none transition-all bg-slate-50 text-slate-900"
                    >
                      <option value="">Selecione um item...</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} - {formatCurrency(p.price)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-600 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" style={{ color: primaryColor }} /> Data
                    </label>
                    <input 
                      required
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus-primary outline-none transition-all bg-slate-50 text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-600 flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" style={{ color: primaryColor }} /> Nome do Cliente
                    </label>
                    <input 
                      required
                      type="text"
                      name="cliente_nome"
                      value={formData.cliente_nome}
                      onChange={handleInputChange}
                      placeholder="Ex: João Silva"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus-primary outline-none transition-all bg-slate-50 text-slate-900"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-600 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-primary" style={{ color: primaryColor }} /> WhatsApp
                    </label>
                    <input 
                      required
                      type="tel"
                      name="cliente_whatsapp"
                      value={formData.cliente_whatsapp}
                      onChange={handleInputChange}
                      placeholder="(00) 00000-0000"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus-primary outline-none transition-all bg-slate-50 text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-600">Quantidade</label>
                    <input 
                      required
                      type="number"
                      min="1"
                      name="quantidade"
                      value={formData.quantidade}
                      onChange={handleInputChange}
                      onFocus={(e) => e.target.select()}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus-primary outline-none transition-all bg-slate-50 text-slate-900"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-600">Valor Unitário (R$)</label>
                    <input 
                      required
                      type="number"
                      step="0.01"
                      min="0"
                      name="valor"
                      value={formData.valor}
                      onChange={handleInputChange}
                      onFocus={(e) => e.target.select()}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus-primary outline-none transition-all bg-slate-50 text-slate-900"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-600">Forma de Pagamento</label>
                  <div className="grid grid-cols-3 gap-2">
                    <PaymentMethodButton 
                      active={formData.metodo_pagamento === 'pix'} 
                      onClick={() => setFormData(prev => ({ ...prev, metodo_pagamento: 'pix' }))}
                      icon={<QrCode className="w-5 h-5" />}
                      label="PIX"
                      primaryColor={primaryColor}
                    />
                    <PaymentMethodButton 
                      active={formData.metodo_pagamento === 'dinheiro'} 
                      onClick={() => setFormData(prev => ({ ...prev, metodo_pagamento: 'dinheiro' }))}
                      icon={<Banknote className="w-5 h-5" />}
                      label="Dinheiro"
                      primaryColor={primaryColor}
                    />
                    <PaymentMethodButton 
                      active={formData.metodo_pagamento === 'cartao'} 
                      onClick={() => setFormData(prev => ({ ...prev, metodo_pagamento: 'cartao' }))}
                      icon={<CreditCard className="w-5 h-5" />}
                      label="Cartão"
                      primaryColor={primaryColor}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-600 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" style={{ color: primaryColor }} /> Observação
                  </label>
                  <textarea 
                    name="descricao"
                    value={formData.descricao}
                    onChange={handleInputChange}
                    placeholder="Alguma observação sobre esta venda..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus-primary outline-none transition-all bg-slate-50 text-slate-900 min-h-[100px] resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-600">Status</label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, status: 'pago' }))}
                      className={cn(
                        "flex-1 py-3 rounded-xl font-bold border transition-all flex items-center justify-center gap-2",
                        formData.status === 'pago' 
                          ? "bg-emerald-50 border-emerald-200 text-emerald-600 ring-2 ring-emerald-500/10" 
                          : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                      )}
                    >
                      <CheckCircle2 className="w-5 h-5" /> Pago
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, status: 'pendente' }))}
                      className={cn(
                        "flex-1 py-3 rounded-xl font-bold border transition-all flex items-center justify-center gap-2",
                        formData.status === 'pendente' 
                          ? "bg-amber-50 border-amber-200 text-amber-600 ring-2 ring-amber-500/10" 
                          : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                      )}
                    >
                      <Clock className="w-5 h-5" /> Pendente
                    </button>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center sticky bottom-0 border border-slate-200 shadow-sm">
                  <span className="text-slate-500 font-bold text-sm">Total</span>
                  <span className="text-primary font-black text-xl">
                    {formatCurrency(formData.quantidade * formData.valor)}
                  </span>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={closeForm}
                    className="flex-1 px-4 py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="flex-[2] bg-primary text-white px-4 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg disabled:opacity-70"
                    style={{ boxShadow: `0 10px 15px -3px ${primaryColor}40`, backgroundColor: primaryColor }}
                  >
                    {isSaving ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        Salvar Venda
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Product Form Modal */}
      <AnimatePresence>
        {isProductFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeProductForm} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-md bg-slate-800 rounded-3xl shadow-2xl overflow-hidden border border-slate-700">
              <div className="px-6 py-6 border-b border-slate-700 flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-100">{editingProduct ? 'Editar Item' : 'Novo Item no Catálogo'}</h3>
                <button onClick={closeProductForm} className="p-2 hover:bg-slate-700 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
              </div>
              <form onSubmit={handleProductSubmit} className="p-6 space-y-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-300">Nome do Produto/Serviço</label>
                  <input required type="text" name="name" value={productFormData.name} onChange={handleProductInputChange} placeholder="Ex: Corte de Cabelo, Pizza..." className="w-full px-4 py-3 rounded-xl border border-slate-700 outline-none focus-primary bg-slate-800 text-slate-100" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-300">Preço Padrão (R$)</label>
                  <input required type="number" step="0.01" min="0" name="price" value={productFormData.price} onChange={handleProductInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-700 outline-none focus-primary bg-slate-800 text-slate-100" />
                </div>
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="w-full bg-primary text-white py-4 rounded-xl font-bold shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:scale-100" 
                  style={{ boxShadow: `0 10px 15px -3px ${primaryColor}40`, backgroundColor: primaryColor }}
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingProduct ? 'Atualizar Item' : 'Cadastrar Item')}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteModalOpen(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm bg-slate-800 rounded-3xl shadow-2xl p-6 text-center space-y-6 border border-slate-700"
            >
              <div className="bg-rose-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                <Trash2 className="w-8 h-8 text-rose-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-100">Excluir Venda?</h3>
                <p className="text-slate-400">Esta ação não pode ser desfeita. Você tem certeza que deseja apagar este registro?</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsDeleteModalOpen(null)}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-400 hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => deleteSale(isDeleteModalOpen)}
                  className="flex-1 bg-rose-500 hover:bg-rose-600 text-white px-4 py-3 rounded-xl font-bold shadow-lg shadow-rose-900/20 transition-all active:scale-95"
                >
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Product Delete Confirmation Modal */}
      <AnimatePresence>
        {isProductDeleteModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsProductDeleteModalOpen(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-sm bg-slate-800 rounded-3xl shadow-2xl p-6 text-center space-y-6 border border-slate-700">
              <div className="bg-rose-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto"><Trash2 className="w-8 h-8 text-rose-500" /></div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-100">Excluir do Catálogo?</h3>
                <p className="text-slate-400">Isso não afetará as vendas já registradas, mas o item não aparecerá mais para novas vendas.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setIsProductDeleteModalOpen(null)} className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-400 hover:bg-slate-700 transition-colors">Cancelar</button>
                <button onClick={() => deleteProduct(isProductDeleteModalOpen)} className="flex-1 bg-rose-500 text-white px-4 py-3 rounded-xl font-bold shadow-lg shadow-rose-900/20">Excluir</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Access Modal */}
      <AnimatePresence>
        {isAccessFormOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeAccessForm}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 bg-primary text-white flex justify-between items-center" style={{ backgroundColor: primaryColor }}>
                <h3 className="text-xl font-bold text-slate-100">{editingAccess ? 'Editar Acesso' : 'Gerar Novo Acesso'}</h3>
                <button onClick={closeAccessForm} className="p-2 hover:bg-white/20 rounded-xl transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleAccessSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        required
                        value={accessFormData.nome}
                        onChange={(e) => setAccessFormData({...accessFormData, nome: e.target.value})}
                        className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 focus:border-primary outline-none transition-all text-slate-900"
                        placeholder="Nome do usuário"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">E-mail de Acesso</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="email" 
                        required
                        value={accessFormData.email}
                        onChange={(e) => setAccessFormData({...accessFormData, email: e.target.value})}
                        className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 focus:border-primary outline-none transition-all text-slate-900"
                        placeholder="email@exemplo.com"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Senha</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        required
                        value={accessFormData.senha}
                        onChange={(e) => setAccessFormData({...accessFormData, senha: e.target.value})}
                        className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 focus:border-primary outline-none transition-all text-slate-900"
                        placeholder="Senha de acesso"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Data de Validade</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="date" 
                        required
                        value={accessFormData.data_validade}
                        onChange={(e) => setAccessFormData({...accessFormData, data_validade: e.target.value})}
                        className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 focus:border-primary outline-none transition-all text-slate-900"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Valor Pago (R$)</label>
                  <div className="relative">
                    <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="number" 
                      required
                      step="0.01"
                      value={accessFormData.valor_pago}
                      onChange={(e) => setAccessFormData({...accessFormData, valor_pago: parseFloat(e.target.value)})}
                      className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 focus:border-primary outline-none transition-all text-slate-900"
                      placeholder="0,00"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isSaving}
                  className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:scale-100"
                  style={{ backgroundColor: primaryColor }}
                >
                  {isSaving ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    editingAccess ? 'Salvar Alterações' : 'Gerar Acesso'
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Customer Modal */}
      <AnimatePresence>
        {isCustomerModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCustomerModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
              <div className="px-6 py-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-800">Novo Cliente</h3>
                <button onClick={() => setIsCustomerModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
              </div>
              <form onSubmit={handleAddCustomer} className="p-6 space-y-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-600">Nome do Cliente</label>
                  <input required type="text" placeholder="Ex: João Silva" value={customerFormData.nome} onChange={(e) => setCustomerFormData(prev => ({ ...prev, nome: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus-primary bg-slate-50 text-slate-900" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-600">WhatsApp</label>
                  <input required type="tel" placeholder="Ex: 11999999999" value={customerFormData.whatsapp} onChange={(e) => setCustomerFormData(prev => ({ ...prev, whatsapp: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus-primary bg-slate-50 text-slate-900" />
                </div>
                <button type="submit" className="w-full bg-primary text-white py-4 rounded-xl font-bold shadow-lg active:scale-95 transition-all" style={{ boxShadow: `0 10px 15px -3px ${primaryColor}40` }}>
                  Cadastrar Cliente
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Customer Edit Modal */}
      <AnimatePresence>
        {isCustomerEditModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCustomerEditModalOpen(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
              <div className="px-6 py-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-800">Editar Cliente</h3>
                <button onClick={() => setIsCustomerEditModalOpen(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
              </div>
              <form onSubmit={handleCustomerEdit} className="p-6 space-y-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-600">Nome do Cliente</label>
                  <input required type="text" value={customerFormData.nome} onChange={(e) => setCustomerFormData(prev => ({ ...prev, nome: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus-primary bg-slate-50 text-slate-900" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-600">WhatsApp</label>
                  <input required type="tel" value={customerFormData.whatsapp} onChange={(e) => setCustomerFormData(prev => ({ ...prev, whatsapp: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus-primary bg-slate-50 text-slate-900" />
                </div>
                <div className="flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => copyToClipboard(`${customerFormData.nome}\n${customerFormData.whatsapp}`)} 
                    className={cn(
                      "flex-1 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                      isCopied ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-600"
                    )}
                  >
                    {isCopied ? <Check className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                    {isCopied ? "Copiado!" : "Copiar"}
                  </button>
                  <button type="submit" className="flex-[2] bg-primary text-white py-4 rounded-xl font-bold shadow-lg active:scale-95 transition-all" style={{ boxShadow: `0 10px 15px -3px ${primaryColor}40` }}>
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Sub-components
function PaymentMethodButton({ active, onClick, icon, label, primaryColor }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, primaryColor: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 p-3 rounded-xl border transition-all",
        active 
          ? "bg-primary/10 border-primary text-primary ring-2 ring-primary/20" 
          : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100"
      )}
      style={active ? { borderColor: primaryColor, color: primaryColor, backgroundColor: `${primaryColor}15` } : {}}
    >
      {icon}
      <span className="text-[10px] font-bold uppercase">{label}</span>
    </button>
  );
}
function StatCard({ title, value, subtitle, icon, color, primaryColor }: { title: string, value: string, subtitle: string, icon: React.ReactNode, color: 'indigo' | 'emerald' | 'amber' | 'slate', primaryColor?: string }) {
  const colors = {
    indigo: 'border-primary/20 bg-white shadow-sm',
    emerald: 'bg-emerald-50 border-emerald-100 shadow-sm',
    amber: 'bg-amber-50 border-amber-100 shadow-sm',
    slate: 'bg-slate-50 border-slate-200 shadow-sm'
  };

  return (
    <div 
      className={cn("p-4 sm:p-5 rounded-2xl border transition-all hover:scale-[1.02] relative overflow-hidden group", colors[color])}
    >
      <div 
        className="absolute -right-4 -top-4 w-24 h-24 blur-3xl opacity-10 transition-all group-hover:opacity-20"
        style={{ backgroundColor: color === 'indigo' ? primaryColor : undefined }}
      />
      <div className="flex justify-between items-start mb-2 sm:mb-3">
        <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</span>
        <div className="bg-white p-1.5 sm:p-2 rounded-xl shadow-sm border border-slate-100">
          {icon}
        </div>
      </div>
      <div className="space-y-0.5 sm:space-y-1">
        <div className="text-xl sm:text-2xl font-black text-slate-800">{value}</div>
        <div className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-tight">{subtitle}</div>
      </div>
    </div>
  );
}

function FilterButton({ children, active, onClick }: { children: React.ReactNode, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "px-4 py-1.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap",
        active 
          ? "bg-primary text-white shadow-sm" 
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
      )}
    >
      {children}
    </button>
  );
}

interface SaleItemProps {
  sale: Sale;
  onEdit: () => void;
  onDelete: () => void;
  formatCurrency: (v: number) => string;
  isAdmin?: boolean;
  key?: string;
}

function SaleItem({ sale, onEdit, onDelete, formatCurrency, isAdmin }: SaleItemProps) {
  const getPaymentIcon = (method?: string) => {
    switch (method) {
      case 'pix': return <QrCode className="w-3 h-3" />;
      case 'dinheiro': return <Banknote className="w-3 h-3" />;
      case 'cartao': return <CreditCard className="w-3 h-3" />;
      default: return null;
    }
  };

  return (
    <div className="group flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
      <div className="flex items-center gap-4 min-w-0">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0",
          sale.status === 'pago' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
        )}>
          {sale.nome.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-slate-800 leading-tight truncate">{sale.nome}</h4>
            <span className={cn(
              "text-[10px] font-black uppercase px-1.5 py-0.5 rounded-md",
              sale.status === 'pago' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
            )}>
              {sale.status === 'pago' ? 'Pago' : 'Pendente'}
            </span>
            {sale.metodo_pagamento && (
              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase">
                {getPaymentIcon(sale.metodo_pagamento)}
                {sale.metodo_pagamento}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-medium text-slate-500 mt-0.5">
            <span className="flex items-center gap-1">
              <Package className="w-3 h-3 opacity-50" /> {sale.quantidade}x {formatCurrency(sale.valor)}
            </span>
            {sale.cliente_nome && (
              <span className="flex items-center gap-1 text-primary font-bold">
                <User className="w-3 h-3" /> {sale.cliente_nome}
              </span>
            )}
            {isAdmin && sale.user_email && (
              <span className="flex items-center gap-1 text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-100">
                <Mail className="w-3 h-3" /> {sale.user_email}
              </span>
            )}
            {sale.descricao && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 italic text-slate-400 truncate max-w-[150px]">
                  <FileText className="w-3 h-3" /> {sale.descricao}
                </span>
              </>
            )}
            <span>•</span>
            <span>{format(parseISO(sale.data), "dd 'de' MMM", { locale: ptBR })}</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="font-black text-slate-900">{formatCurrency(sale.valor * sale.quantidade)}</div>
        </div>
        
        <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <button 
            onClick={onEdit}
            className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-lg transition-all"
            title="Editar"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button 
            onClick={onDelete}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
            title="Excluir"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        
        <ChevronRight className="w-5 h-5 text-slate-300 sm:group-hover:hidden hidden sm:block" />
      </div>
    </div>
  );
}
