/**
 * NOVSMM i18n translations.
 * Each language has a set of translation keys for common UI strings.
 * Missing keys fall back to English.
 *
 * Languages: en, es, pt, fr, de
 */

export type TranslationKey =
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
