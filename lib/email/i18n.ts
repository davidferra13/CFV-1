// Email i18n - Simple lookup for email template strings
// Emails render outside Next.js request context, so we use a plain lookup
// instead of next-intl. Add strings as needed when internationalizing templates.

type EmailStrings = {
  greeting: string
  thankYou: string
  viewDetails: string
  viewInvoice: string
  payNow: string
  quoteReady: string
  eventConfirmed: string
  eventProposed: string
  paymentReceived: string
  paymentReminder: string
  followUp: string
  unsubscribe: string
  poweredBy: string
  regards: string
  dueDate: string
  amount: string
  eventDate: string
  guestCount: string
  status: string
  total: string
  deposit: string
  balanceDue: string
  loyaltyPoints: string
  tierStatus: string
}

const strings: Record<string, EmailStrings> = {
  en: {
    greeting: 'Hi',
    thankYou: 'Thank you for your business',
    viewDetails: 'View Details',
    viewInvoice: 'View Invoice',
    payNow: 'Pay Now',
    quoteReady: 'Your quote is ready',
    eventConfirmed: 'Your event is confirmed',
    eventProposed: 'New event proposal',
    paymentReceived: 'Payment received',
    paymentReminder: 'Payment reminder',
    followUp: 'Following up',
    unsubscribe: 'Unsubscribe',
    poweredBy: 'Powered by ChefFlow',
    regards: 'Best regards',
    dueDate: 'Due date',
    amount: 'Amount',
    eventDate: 'Event date',
    guestCount: 'Guest count',
    status: 'Status',
    total: 'Total',
    deposit: 'Deposit',
    balanceDue: 'Balance due',
    loyaltyPoints: 'Loyalty points earned',
    tierStatus: 'Tier status',
  },
  es: {
    greeting: 'Hola',
    thankYou: 'Gracias por su confianza',
    viewDetails: 'Ver detalles',
    viewInvoice: 'Ver factura',
    payNow: 'Pagar ahora',
    quoteReady: 'Su cotizacion esta lista',
    eventConfirmed: 'Su evento esta confirmado',
    eventProposed: 'Nueva propuesta de evento',
    paymentReceived: 'Pago recibido',
    paymentReminder: 'Recordatorio de pago',
    followUp: 'Seguimiento',
    unsubscribe: 'Cancelar suscripcion',
    poweredBy: 'Impulsado por ChefFlow',
    regards: 'Saludos cordiales',
    dueDate: 'Fecha de vencimiento',
    amount: 'Monto',
    eventDate: 'Fecha del evento',
    guestCount: 'Numero de invitados',
    status: 'Estado',
    total: 'Total',
    deposit: 'Deposito',
    balanceDue: 'Saldo pendiente',
    loyaltyPoints: 'Puntos de lealtad ganados',
    tierStatus: 'Estado de nivel',
  },
  fr: {
    greeting: 'Bonjour',
    thankYou: 'Merci pour votre confiance',
    viewDetails: 'Voir les details',
    viewInvoice: 'Voir la facture',
    payNow: 'Payer maintenant',
    quoteReady: 'Votre devis est pret',
    eventConfirmed: 'Votre evenement est confirme',
    eventProposed: 'Nouvelle proposition',
    paymentReceived: 'Paiement recu',
    paymentReminder: 'Rappel de paiement',
    followUp: 'Suivi',
    unsubscribe: 'Se desabonner',
    poweredBy: 'Propulse par ChefFlow',
    regards: 'Cordialement',
    dueDate: 'Date limite',
    amount: 'Montant',
    eventDate: "Date de l'evenement",
    guestCount: "Nombre d'invites",
    status: 'Statut',
    total: 'Total',
    deposit: 'Acompte',
    balanceDue: 'Solde du',
    loyaltyPoints: 'Points de fidelite gagnes',
    tierStatus: 'Statut du niveau',
  },
  pt: {
    greeting: 'Ola',
    thankYou: 'Obrigado pela sua confianca',
    viewDetails: 'Ver detalhes',
    viewInvoice: 'Ver fatura',
    payNow: 'Pagar agora',
    quoteReady: 'Seu orcamento esta pronto',
    eventConfirmed: 'Seu evento esta confirmado',
    eventProposed: 'Nova proposta de evento',
    paymentReceived: 'Pagamento recebido',
    paymentReminder: 'Lembrete de pagamento',
    followUp: 'Acompanhamento',
    unsubscribe: 'Cancelar inscricao',
    poweredBy: 'Desenvolvido por ChefFlow',
    regards: 'Atenciosamente',
    dueDate: 'Data de vencimento',
    amount: 'Valor',
    eventDate: 'Data do evento',
    guestCount: 'Numero de convidados',
    status: 'Status',
    total: 'Total',
    deposit: 'Deposito',
    balanceDue: 'Saldo devedor',
    loyaltyPoints: 'Pontos de fidelidade ganhos',
    tierStatus: 'Status do nivel',
  },
  de: {
    greeting: 'Hallo',
    thankYou: 'Vielen Dank fur Ihr Vertrauen',
    viewDetails: 'Details anzeigen',
    viewInvoice: 'Rechnung anzeigen',
    payNow: 'Jetzt bezahlen',
    quoteReady: 'Ihr Angebot ist fertig',
    eventConfirmed: 'Ihr Event ist bestatigt',
    eventProposed: 'Neuer Eventvorschlag',
    paymentReceived: 'Zahlung erhalten',
    paymentReminder: 'Zahlungserinnerung',
    followUp: 'Nachfassen',
    unsubscribe: 'Abbestellen',
    poweredBy: 'Betrieben von ChefFlow',
    regards: 'Mit freundlichen Grussen',
    dueDate: 'Falligkeitsdatum',
    amount: 'Betrag',
    eventDate: 'Eventdatum',
    guestCount: 'Gastezahl',
    status: 'Status',
    total: 'Gesamt',
    deposit: 'Anzahlung',
    balanceDue: 'Offener Betrag',
    loyaltyPoints: 'Gesammelte Treuepunkte',
    tierStatus: 'Stufenstatus',
  },
  it: {
    greeting: 'Ciao',
    thankYou: 'Grazie per la fiducia',
    viewDetails: 'Vedi dettagli',
    viewInvoice: 'Vedi fattura',
    payNow: 'Paga ora',
    quoteReady: 'Il preventivo e pronto',
    eventConfirmed: 'Il tuo evento e confermato',
    eventProposed: 'Nuova proposta evento',
    paymentReceived: 'Pagamento ricevuto',
    paymentReminder: 'Promemoria di pagamento',
    followUp: 'Follow-up',
    unsubscribe: 'Annulla iscrizione',
    poweredBy: 'Creato con ChefFlow',
    regards: 'Cordiali saluti',
    dueDate: 'Data di scadenza',
    amount: 'Importo',
    eventDate: "Data dell'evento",
    guestCount: 'Numero ospiti',
    status: 'Stato',
    total: 'Totale',
    deposit: 'Acconto',
    balanceDue: 'Saldo dovuto',
    loyaltyPoints: 'Punti fedelta guadagnati',
    tierStatus: 'Stato del livello',
  },
  ja: {
    greeting: 'こんにちは',
    thankYou: 'ご利用ありがとうございます',
    viewDetails: '詳細を見る',
    viewInvoice: '請求書を見る',
    payNow: '今すぐ支払う',
    quoteReady: 'お見積もりの準備ができました',
    eventConfirmed: 'イベントが確定しました',
    eventProposed: '新しいイベント提案',
    paymentReceived: 'お支払いを受け取りました',
    paymentReminder: 'お支払いのリマインダー',
    followUp: 'フォローアップ',
    unsubscribe: '配信停止',
    poweredBy: 'Powered by ChefFlow',
    regards: 'よろしくお願いいたします',
    dueDate: '支払期限',
    amount: '金額',
    eventDate: 'イベント日',
    guestCount: 'ゲスト数',
    status: 'ステータス',
    total: '合計',
    deposit: 'デポジット',
    balanceDue: '残高',
    loyaltyPoints: '獲得ロイヤルティポイント',
    tierStatus: 'ティアステータス',
  },
}

/**
 * Get email template strings for a given locale.
 * Falls back to English if the locale is not supported.
 *
 * @param locale - Locale code (e.g. 'en', 'es', 'fr', 'en-US', 'es-MX')
 */
export function getEmailStrings(locale: string): EmailStrings {
  const shortLocale = locale.split('-')[0]
  return strings[shortLocale] ?? strings.en
}
