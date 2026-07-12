/**
 * NOVSMM i18n translations.
 * Each language has a set of translation keys for common UI strings.
 * Missing keys fall back to English.
 *
 * Languages: en, es, pt, fr
 *
 * ADMIN-FIX-BATCH-2: German ("de") was removed because no translation pack
 * exists for it. Re-add only when a complete `de` translation object ships.
 */

export type TranslationKey =
  // Landing — Navbar
  | "landing.nav.platform"
  | "landing.nav.services"
  | "landing.nav.marketplace"
  | "landing.nav.payments"
  | "landing.nav.security"
  | "landing.nav.pricing"
  | "landing.nav.signIn"
  | "landing.nav.startFree"
  | "landing.nav.dashboard"
  // Landing — Hero
  | "landing.hero.badge"
  | "landing.hero.title"
  | "landing.hero.titleHighlight"
  | "landing.hero.titleEnd"
  | "landing.hero.subtitle"
  | "landing.hero.startFree"
  | "landing.hero.viewPricing"
  | "landing.hero.signIn"
  | "landing.hero.noCardRequired"
  | "landing.hero.uptimeSLA"
  | "landing.hero.soc2"
  // Landing — Footer
  | "landing.footer.tagline"
  | "landing.footer.startFree"
  | "landing.footer.signIn"
  | "landing.footer.availableIn"
  | "landing.footer.copyright"
  | "landing.footer.privacyFirst"
  | "landing.footer.platform"
  | "landing.footer.solutions"
  | "landing.footer.company"
  | "landing.footer.resources"
  | "landing.footer.resellers"
  | "landing.footer.agencies"
  | "landing.footer.enterprises"
  | "landing.footer.creators"
  | "landing.footer.wholesale"
  | "landing.footer.affiliates"
  | "landing.footer.about"
  | "landing.footer.careers"
  | "landing.footer.press"
  | "landing.footer.partners"
  | "landing.footer.contact"
  | "landing.footer.status"
  | "landing.footer.docs"
  | "landing.footer.apiRef"
  | "landing.footer.changelog"
  | "landing.footer.security"
  | "landing.footer.legal"
  | "landing.footer.dashboard"
  | "landing.footer.payments"
  | "landing.footer.analytics"
  | "landing.footer.api"
  | "landing.footer.terms"
  | "landing.footer.privacy"
  | "landing.footer.cookies"
  // Dashboard (existing)
  | "dashboard.welcome"
  | "dashboard.balance"
  | "dashboard.activeOrders"
  | "dashboard.completedOrders"
  | "dashboard.revenue"
  | "marketplace.title"
  | "marketplace.buy"
  | "marketplace.sell"
  | "marketplace.history"
  | "marketplace.search"
  | "marketplace.perThousand"
  | "marketplace.placeOrder"
  | "marketplace.viewDetails"
  | "wallet.title"
  | "wallet.topUp"
  | "wallet.withdraw"
  | "wallet.available"
  | "wallet.held"
  | "wallet.transactions"
  | "orders.title"
  | "orders.all"
  | "orders.processing"
  | "orders.completed"
  | "orders.repeat"
  | "orders.export"
  | "tickets.title"
  | "tickets.new"
  | "tickets.subject"
  | "tickets.message"
  | "tickets.send"
  | "notifications.title"
  | "notifications.markAllRead"
  | "notifications.live"
  | "profile.title"
  | "profile.currency"
  | "profile.language"
  | "profile.save"
  | "auth.signIn"
  | "auth.signUp"
  | "auth.signOut"
  | "auth.email"
  | "auth.password"
  | "auth.forgotPassword"
  | "common.loading"
  | "common.save"
  | "common.cancel"
  | "common.delete"
  | "common.search"
  | "common.actions"
  | "common.status";

type Translations = Record<TranslationKey, string>;

const en: Translations = {
  // Landing — Navbar
  "landing.nav.platform": "Platform",
  "landing.nav.services": "Services",
  "landing.nav.marketplace": "Marketplace",
  "landing.nav.payments": "Payments",
  "landing.nav.security": "Security",
  "landing.nav.pricing": "Pricing",
  "landing.nav.signIn": "Sign in",
  "landing.nav.startFree": "Start free",
  "landing.nav.dashboard": "Dashboard",
  // Landing — Hero
  "landing.hero.badge": "Now processing",
  "landing.hero.title": "The infrastructure for",
  "landing.hero.titleHighlight": "social media marketing",
  "landing.hero.titleEnd": "at scale.",
  "landing.hero.subtitle": "NOVSMM unifies order automation, a reseller marketplace, and payments into one platform — engineered for teams that ship at the speed of attention.",
  "landing.hero.startFree": "Start free",
  "landing.hero.viewPricing": "View pricing",
  "landing.hero.signIn": "Sign in",
  "landing.hero.noCardRequired": "No credit card required",
  "landing.hero.uptimeSLA": "99.99% uptime SLA",
  "landing.hero.soc2": "SOC 2 controls",
  // Landing — Footer
  "landing.footer.tagline": "Ship at the speed of attention.",
  "landing.footer.startFree": "Start free",
  "landing.footer.signIn": "Sign in",
  "landing.footer.availableIn": "Available in 60+ countries · 12 currencies · 24/7 support",
  "landing.footer.copyright": "NOVSMM",
  "landing.footer.privacyFirst": "Privacy-first · Secure by design",
  "landing.footer.platform": "Platform",
  "landing.footer.solutions": "Solutions",
  "landing.footer.company": "Company",
  "landing.footer.resources": "Resources",
  "landing.footer.resellers": "Resellers",
  "landing.footer.agencies": "Agencies",
  "landing.footer.enterprises": "Enterprises",
  "landing.footer.creators": "Creators",
  "landing.footer.wholesale": "Wholesale",
  "landing.footer.affiliates": "Affiliates",
  "landing.footer.about": "About",
  "landing.footer.careers": "Careers",
  "landing.footer.press": "Press",
  "landing.footer.partners": "Partners",
  "landing.footer.contact": "Contact",
  "landing.footer.status": "Status",
  "landing.footer.docs": "Docs",
  "landing.footer.apiRef": "API reference",
  "landing.footer.changelog": "Changelog",
  "landing.footer.security": "Security",
  "landing.footer.legal": "Legal",
  "landing.footer.dashboard": "Dashboard",
  "landing.footer.payments": "Payments",
  "landing.footer.analytics": "Analytics",
  "landing.footer.api": "API",
  "landing.footer.terms": "Terms",
  "landing.footer.privacy": "Privacy",
  "landing.footer.cookies": "Cookies",
  // Dashboard
  "dashboard.welcome": "Welcome back",
  "dashboard.balance": "Available balance",
  "dashboard.activeOrders": "Active orders",
  "dashboard.completedOrders": "Completed",
  "dashboard.revenue": "Revenue today",
  "marketplace.title": "Buy · Sell · History",
  "marketplace.buy": "Services",
  "marketplace.sell": "Sell",
  "marketplace.history": "Purchase history",
  "marketplace.search": "Search services",
  "marketplace.perThousand": "Per 1000",
  "marketplace.placeOrder": "Place order",
  "marketplace.viewDetails": "View details",
  "wallet.title": "Balance & activity",
  "wallet.topUp": "Top up",
  "wallet.withdraw": "Withdraw",
  "wallet.available": "Available",
  "wallet.held": "Held",
  "wallet.transactions": "Transaction history",
  "orders.title": "All orders",
  "orders.all": "All",
  "orders.processing": "Processing",
  "orders.completed": "Completed",
  "orders.repeat": "Repeat",
  "orders.export": "Export CSV",
  "tickets.title": "Tickets",
  "tickets.new": "New ticket",
  "tickets.subject": "Subject",
  "tickets.message": "Message",
  "tickets.send": "Type your message…",
  "notifications.title": "Notifications",
  "notifications.markAllRead": "Mark all read",
  "notifications.live": "Live · connected",
  "profile.title": "Profile settings",
  "profile.currency": "Preferred currency",
  "profile.language": "Preferred language",
  "profile.save": "Save changes",
  "auth.signIn": "Sign in",
  "auth.signUp": "Sign up",
  "auth.signOut": "Sign out",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.forgotPassword": "Forgot password?",
  "common.loading": "Loading…",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.delete": "Delete",
  "common.search": "Search",
  "common.actions": "Actions",
  "common.status": "Status",
};

const es: Partial<Translations> = {
  // Landing — Navbar
  "landing.nav.platform": "Plataforma",
  "landing.nav.services": "Servicios",
  "landing.nav.marketplace": "Marketplace",
  "landing.nav.payments": "Pagos",
  "landing.nav.security": "Seguridad",
  "landing.nav.pricing": "Precios",
  "landing.nav.signIn": "Iniciar sesión",
  "landing.nav.startFree": "Empezar gratis",
  "landing.nav.dashboard": "Panel",
  // Landing — Hero
  "landing.hero.badge": "Procesando ahora",
  "landing.hero.title": "La infraestructura para",
  "landing.hero.titleHighlight": "marketing en redes sociales",
  "landing.hero.titleEnd": "a escala.",
  "landing.hero.subtitle": "NOVSMM unifica automatización de pedidos, un marketplace de revendedores y pagos en una sola plataforma — diseñada para equipos que lanzan a la velocidad de la atención.",
  "landing.hero.startFree": "Empezar gratis",
  "landing.hero.viewPricing": "Ver precios",
  "landing.hero.signIn": "Iniciar sesión",
  "landing.hero.noCardRequired": "Sin tarjeta de crédito",
  "landing.hero.uptimeSLA": "99.99% uptime SLA",
  "landing.hero.soc2": "Controles SOC 2",
  // Landing — Footer
  "landing.footer.tagline": "Lanza a la velocidad de la atención.",
  "landing.footer.startFree": "Empezar gratis",
  "landing.footer.signIn": "Iniciar sesión",
  "landing.footer.availableIn": "Disponible en 60+ países · 12 monedas · soporte 24/7",
  "landing.footer.copyright": "NOVSMM",
  "landing.footer.privacyFirst": "Privacidad primero · Seguro por diseño",
  "landing.footer.platform": "Plataforma",
  "landing.footer.solutions": "Soluciones",
  "landing.footer.company": "Empresa",
  "landing.footer.resources": "Recursos",
  "landing.footer.resellers": "Revendedores",
  "landing.footer.agencies": "Agencias",
  "landing.footer.enterprises": "Empresas",
  "landing.footer.creators": "Creadores",
  "landing.footer.wholesale": "Mayorista",
  "landing.footer.affiliates": "Afiliados",
  "landing.footer.about": "Acerca de",
  "landing.footer.careers": "Empleo",
  "landing.footer.press": "Prensa",
  "landing.footer.partners": "Socios",
  "landing.footer.contact": "Contacto",
  "landing.footer.status": "Estado",
  "landing.footer.docs": "Docs",
  "landing.footer.apiRef": "Referencia API",
  "landing.footer.changelog": "Cambios",
  "landing.footer.security": "Seguridad",
  "landing.footer.legal": "Legal",
  "landing.footer.dashboard": "Panel",
  "landing.footer.payments": "Pagos",
  "landing.footer.analytics": "Analíticas",
  "landing.footer.api": "API",
  "landing.footer.terms": "Términos",
  "landing.footer.privacy": "Privacidad",
  "landing.footer.cookies": "Cookies",
  // Dashboard
  "dashboard.welcome": "Bienvenido de nuevo",
  "dashboard.balance": "Saldo disponible",
  "dashboard.activeOrders": "Pedidos activos",
  "dashboard.completedOrders": "Completados",
  "dashboard.revenue": "Ingresos hoy",
  "marketplace.title": "Comprar · Vender · Historial",
  "marketplace.buy": "Servicios",
  "marketplace.sell": "Vender",
  "marketplace.history": "Historial de compras",
  "marketplace.search": "Buscar servicios",
  "marketplace.perThousand": "Por 1000",
  "marketplace.placeOrder": "Realizar pedido",
  "marketplace.viewDetails": "Ver detalles",
  "wallet.title": "Saldo y actividad",
  "wallet.topUp": "Recargar",
  "wallet.withdraw": "Retirar",
  "wallet.available": "Disponible",
  "wallet.held": "Retenido",
  "wallet.transactions": "Historial de transacciones",
  "orders.title": "Todos los pedidos",
  "orders.all": "Todos",
  "orders.processing": "Procesando",
  "orders.completed": "Completados",
  "orders.repeat": "Repetir",
  "orders.export": "Exportar CSV",
  "tickets.title": "Tickets",
  "tickets.new": "Nuevo ticket",
  "tickets.subject": "Asunto",
  "tickets.message": "Mensaje",
  "tickets.send": "Escribe tu mensaje…",
  "notifications.title": "Notificaciones",
  "notifications.markAllRead": "Marcar todo como leído",
  "notifications.live": "En vivo · conectado",
  "profile.title": "Configuración de perfil",
  "profile.currency": "Moneda preferida",
  "profile.language": "Idioma preferido",
  "profile.save": "Guardar cambios",
  "auth.signIn": "Iniciar sesión",
  "auth.signUp": "Registrarse",
  "auth.signOut": "Cerrar sesión",
  "auth.email": "Correo",
  "auth.password": "Contraseña",
  "auth.forgotPassword": "¿Olvidaste tu contraseña?",
  "common.loading": "Cargando…",
  "common.save": "Guardar",
  "common.cancel": "Cancelar",
  "common.delete": "Eliminar",
  "common.search": "Buscar",
  "common.actions": "Acciones",
  "common.status": "Estado",
};

const pt: Partial<Translations> = {
  // Landing — Navbar
  "landing.nav.platform": "Plataforma",
  "landing.nav.services": "Serviços",
  "landing.nav.marketplace": "Marketplace",
  "landing.nav.payments": "Pagamentos",
  "landing.nav.security": "Segurança",
  "landing.nav.pricing": "Preços",
  "landing.nav.signIn": "Entrar",
  "landing.nav.startFree": "Começar grátis",
  "landing.nav.dashboard": "Painel",
  // Landing — Hero
  "landing.hero.badge": "Processando agora",
  "landing.hero.title": "A infraestrutura para",
  "landing.hero.titleHighlight": "marketing em redes sociais",
  "landing.hero.titleEnd": "em escala.",
  "landing.hero.subtitle": "NOVSMM unifica automação de pedidos, um marketplace de revendedores e pagamentos em uma só plataforma — projetada para equipes que lançam na velocidade da atenção.",
  "landing.hero.startFree": "Começar grátis",
  "landing.hero.viewPricing": "Ver preços",
  "landing.hero.signIn": "Entrar",
  "landing.hero.noCardRequired": "Sem cartão de crédito",
  "landing.hero.uptimeSLA": "99.99% uptime SLA",
  "landing.hero.soc2": "Controles SOC 2",
  // Landing — Footer
  "landing.footer.tagline": "Lance na velocidade da atenção.",
  "landing.footer.startFree": "Começar grátis",
  "landing.footer.signIn": "Entrar",
  "landing.footer.availableIn": "Disponível em 60+ países · 12 moedas · suporte 24/7",
  "landing.footer.copyright": "NOVSMM",
  "landing.footer.privacyFirst": "Privacidade primeiro · Seguro por design",
  "landing.footer.platform": "Plataforma",
  "landing.footer.solutions": "Soluções",
  "landing.footer.company": "Empresa",
  "landing.footer.resources": "Recursos",
  "landing.footer.resellers": "Revendedores",
  "landing.footer.agencies": "Agências",
  "landing.footer.enterprises": "Empresas",
  "landing.footer.creators": "Criadores",
  "landing.footer.wholesale": "Atacado",
  "landing.footer.affiliates": "Afiliados",
  "landing.footer.about": "Sobre",
  "landing.footer.careers": "Carreiras",
  "landing.footer.press": "Imprensa",
  "landing.footer.partners": "Parceiros",
  "landing.footer.contact": "Contato",
  "landing.footer.status": "Status",
  "landing.footer.docs": "Docs",
  "landing.footer.apiRef": "Referência API",
  "landing.footer.changelog": "Mudanças",
  "landing.footer.security": "Segurança",
  "landing.footer.legal": "Legal",
  "landing.footer.dashboard": "Painel",
  "landing.footer.payments": "Pagamentos",
  "landing.footer.analytics": "Análises",
  "landing.footer.api": "API",
  "landing.footer.terms": "Termos",
  "landing.footer.privacy": "Privacidade",
  "landing.footer.cookies": "Cookies",
  // Dashboard
  "dashboard.welcome": "Bem-vindo de volta",
  "dashboard.balance": "Saldo disponível",
  "dashboard.activeOrders": "Pedidos ativos",
  "dashboard.completedOrders": "Concluídos",
  "dashboard.revenue": "Receita hoje",
  "marketplace.title": "Comprar · Vender · Histórico",
  "marketplace.buy": "Serviços",
  "marketplace.sell": "Vender",
  "marketplace.history": "Histórico de compras",
  "marketplace.search": "Pesquisar serviços",
  "marketplace.perThousand": "Por 1000",
  "marketplace.placeOrder": "Fazer pedido",
  "marketplace.viewDetails": "Ver detalhes",
  "wallet.title": "Saldo e atividade",
  "wallet.topUp": "Recarregar",
  "wallet.withdraw": "Sacar",
  "wallet.available": "Disponível",
  "wallet.held": "Retido",
  "wallet.transactions": "Histórico de transações",
  "orders.title": "Todos os pedidos",
  "orders.all": "Todos",
  "orders.processing": "Processando",
  "orders.completed": "Concluídos",
  "orders.repeat": "Repetir",
  "orders.export": "Exportar CSV",
  "tickets.title": "Tickets",
  "tickets.new": "Novo ticket",
  "tickets.subject": "Assunto",
  "tickets.message": "Mensagem",
  "tickets.send": "Digite sua mensagem…",
  "notifications.title": "Notificações",
  "notifications.markAllRead": "Marcar tudo como lido",
  "notifications.live": "Ao vivo · conectado",
  "profile.title": "Configurações de perfil",
  "profile.currency": "Moeda preferida",
  "profile.language": "Idioma preferido",
  "profile.save": "Salvar alterações",
  "auth.signIn": "Entrar",
  "auth.signUp": "Cadastrar",
  "auth.signOut": "Sair",
  "auth.email": "E-mail",
  "auth.password": "Senha",
  "auth.forgotPassword": "Esqueceu a senha?",
  "common.loading": "Carregando…",
  "common.save": "Salvar",
  "common.cancel": "Cancelar",
  "common.delete": "Excluir",
  "common.search": "Pesquisar",
  "common.actions": "Ações",
  "common.status": "Status",
};

const fr: Partial<Translations> = {
  // Landing — Navbar
  "landing.nav.platform": "Plateforme",
  "landing.nav.services": "Services",
  "landing.nav.marketplace": "Marketplace",
  "landing.nav.payments": "Paiements",
  "landing.nav.security": "Sécurité",
  "landing.nav.pricing": "Tarifs",
  "landing.nav.signIn": "Se connecter",
  "landing.nav.startFree": "Commencer gratuitement",
  "landing.nav.dashboard": "Tableau de bord",
  // Landing — Hero
  "landing.hero.badge": "Traitement en cours",
  "landing.hero.title": "L'infrastructure pour le",
  "landing.hero.titleHighlight": "marketing sur réseaux sociaux",
  "landing.hero.titleEnd": "à grande échelle.",
  "landing.hero.subtitle": "NOVSMM unifie l'automatisation des commandes, un marketplace de revendeurs et les paiements en une seule plateforme — conçue pour les équipes qui lancent à la vitesse de l'attention.",
  "landing.hero.startFree": "Commencer gratuitement",
  "landing.hero.viewPricing": "Voir les tarifs",
  "landing.hero.signIn": "Se connecter",
  "landing.hero.noCardRequired": "Sans carte de crédit",
  "landing.hero.uptimeSLA": "99.99% uptime SLA",
  "landing.hero.soc2": "Contrôles SOC 2",
  // Landing — Footer
  "landing.footer.tagline": "Lancez à la vitesse de l'attention.",
  "landing.footer.startFree": "Commencer gratuitement",
  "landing.footer.signIn": "Se connecter",
  "landing.footer.availableIn": "Disponible dans 60+ pays · 12 devises · support 24/7",
  "landing.footer.copyright": "NOVSMM",
  "landing.footer.privacyFirst": "Confidentialité d'abord · Sécurisé par design",
  "landing.footer.platform": "Plateforme",
  "landing.footer.solutions": "Solutions",
  "landing.footer.company": "Entreprise",
  "landing.footer.resources": "Ressources",
  "landing.footer.resellers": "Revendeurs",
  "landing.footer.agencies": "Agences",
  "landing.footer.enterprises": "Entreprises",
  "landing.footer.creators": "Créateurs",
  "landing.footer.wholesale": "Gros",
  "landing.footer.affiliates": "Affiliés",
  "landing.footer.about": "À propos",
  "landing.footer.careers": "Carrières",
  "landing.footer.press": "Presse",
  "landing.footer.partners": "Partenaires",
  "landing.footer.contact": "Contact",
  "landing.footer.status": "Statut",
  "landing.footer.docs": "Docs",
  "landing.footer.apiRef": "Référence API",
  "landing.footer.changelog": "Changements",
  "landing.footer.security": "Sécurité",
  "landing.footer.legal": "Légal",
  "landing.footer.dashboard": "Tableau de bord",
  "landing.footer.payments": "Paiements",
  "landing.footer.analytics": "Analyses",
  "landing.footer.api": "API",
  "landing.footer.terms": "Conditions",
  "landing.footer.privacy": "Confidentialité",
  "landing.footer.cookies": "Cookies",
  // Dashboard
  "dashboard.welcome": "Bon retour",
  "dashboard.balance": "Solde disponible",
  "dashboard.activeOrders": "Commandes actives",
  "dashboard.completedOrders": "Terminées",
  "dashboard.revenue": "Revenus du jour",
  "marketplace.title": "Acheter · Vendre · Historique",
  "marketplace.buy": "Services",
  "marketplace.sell": "Vendre",
  "marketplace.history": "Historique d'achats",
  "marketplace.search": "Rechercher des services",
  "marketplace.perThousand": "Par 1000",
  "marketplace.placeOrder": "Passer commande",
  "marketplace.viewDetails": "Voir les détails",
  "wallet.title": "Solde et activité",
  "wallet.topUp": "Recharger",
  "wallet.withdraw": "Retirer",
  "wallet.available": "Disponible",
  "wallet.held": "Bloqué",
  "wallet.transactions": "Historique des transactions",
  "orders.title": "Toutes les commandes",
  "orders.all": "Toutes",
  "orders.processing": "En cours",
  "orders.completed": "Terminées",
  "orders.repeat": "Répéter",
  "orders.export": "Exporter CSV",
  "tickets.title": "Tickets",
  "tickets.new": "Nouveau ticket",
  "tickets.subject": "Sujet",
  "tickets.message": "Message",
  "tickets.send": "Tapez votre message…",
  "notifications.title": "Notifications",
  "notifications.markAllRead": "Tout marquer comme lu",
  "notifications.live": "En direct · connecté",
  "profile.title": "Paramètres du profil",
  "profile.currency": "Devise préférée",
  "profile.language": "Langue préférée",
  "profile.save": "Enregistrer",
  "auth.signIn": "Se connecter",
  "auth.signUp": "S'inscrire",
  "auth.signOut": "Se déconnecter",
  "auth.email": "E-mail",
  "auth.password": "Mot de passe",
  "auth.forgotPassword": "Mot de passe oublié ?",
  "common.loading": "Chargement…",
  "common.save": "Enregistrer",
  "common.cancel": "Annuler",
  "common.delete": "Supprimer",
  "common.search": "Rechercher",
  "common.actions": "Actions",
  "common.status": "Statut",
};

const allTranslations: Record<string, Partial<Translations>> = { en, es, pt, fr };

/**
 * Get translations for a language, with English fallback.
 */
export function getTranslations(lang: string): Translations {
  const t = allTranslations[lang] ?? allTranslations["en"];
  return { ...en, ...t } as Translations;
}

/**
 * Translate a single key.
 */
export function t(lang: string, key: TranslationKey, fallback?: string): string {
  const translations = getTranslations(lang);
  return translations[key] ?? fallback ?? key;
}
