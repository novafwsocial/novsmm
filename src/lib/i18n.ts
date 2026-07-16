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
  | "marketplace.buySellHistory"
  | "marketplace.subtitle"
  | "marketplace.massOrder"
  | "marketplace.sections"
  | "marketplace.searchPlaceholder"
  | "marketplace.clearSearch"
  | "marketplace.sortServices"
  | "marketplace.sort.popular"
  | "marketplace.sort.price-asc"
  | "marketplace.sort.price-desc"
  | "marketplace.sort.fastest"
  | "marketplace.sort.name-asc"
  | "marketplace.viewMode"
  | "marketplace.gridView"
  | "marketplace.listView"
  | "marketplace.favoritesOnly"
  | "marketplace.favorites"
  | "marketplace.min"
  | "marketplace.max"
  | "marketplace.minimumPrice"
  | "marketplace.maximumPrice"
  | "marketplace.apply"
  | "marketplace.price"
  | "marketplace.all"
  | "marketplace.showing"
  | "marketplace.of"
  | "marketplace.services"
  | "marketplace.noServices"
  | "marketplace.adjustFilters"
  | "marketplace.clearFilters"
  | "marketplace.service"
  | "marketplace.pricePer1k"
  | "marketplace.minMax"
  | "marketplace.delivery"
  | "marketplace.action"
  | "marketplace.loadMore"
  | "marketplace.endCatalog"
  | "marketplace.showMore"
  | "marketplace.moreIn"
  | "marketplace.hidden"
  | "marketplace.unavailable"
  | "marketplace.pressEnterOrder"
  | "marketplace.new"
  | "marketplace.remove"
  | "marketplace.fromFavorites"
  | "marketplace.add"
  | "marketplace.toFavorites"
  | "marketplace.fromComparison"
  | "marketplace.toComparison"
  | "marketplace.details"
  | "marketplace.order"
  | "marketplace.now"
  | "marketplace.trending"
  | "marketplace.trendingSubtitle"
  | "marketplace.comparisonTray"
  | "marketplace.compare"
  | "marketplace.maxReached"
  | "marketplace.pickAnother"
  | "marketplace.clearComparison"
  | "marketplace.clear"
  | "marketplace.compareNow"
  | "marketplace.pricePerThousand"
  | "marketplace.deliveryTime"
  | "marketplace.minMaxQty"
  | "marketplace.quality"
  | "marketplace.compareServices"
  | "marketplace.closeComparison"
  | "marketplace.sideBySide"
  | "marketplace.clickRemove"
  | "marketplace.attribute"
  | "marketplace.compareTip"
  | "marketplace.servicesForComparison"
  | "marketplace.ratingThanks"
  | "marketplace.youRated"
  | "marketplace.stars"
  | "marketplace.orderPlaced"
  | "marketplace.orderProcessing"
  | "marketplace.serviceDetails"
  | "marketplace.speed"
  | "marketplace.minQuantity"
  | "marketplace.maxQuantity"
  | "marketplace.yourRating"
  | "marketplace.reviews"
  | "marketplace.noRatings"
  | "marketplace.rateService"
  | "marketplace.rateStars"
  | "marketplace.clickSubmit"
  | "marketplace.hoverRate"
  | "marketplace.yourBalance"
  | "marketplace.quantity"
  | "marketplace.linkOptional"
  | "marketplace.linkPlaceholder"
  | "marketplace.dripFeed"
  | "marketplace.dripFeedDescription"
  | "marketplace.daysChunks"
  | "marketplace.delayMinutes"
  | "marketplace.preview"
  | "marketplace.totalCost"
  | "marketplace.placingOrder"
  | "marketplace.insufficientBalance"
  | "marketplace.placeDripOrder"
  | "wallet.title"
  | "wallet.topUp"
  | "wallet.withdraw"
  | "wallet.available"
  | "wallet.held"
  | "wallet.transactions"
  | "wallet.eyebrow"
  | "wallet.balanceActivity"
  | "wallet.subtitle"
  | "wallet.export"
  | "wallet.live"
  | "wallet.pendingCompletion"
  | "wallet.lifetimeEarnings"
  | "wallet.allTimeRevenue"
  | "wallet.cashFlow30"
  | "wallet.liveFromTransactions"
  | "wallet.revenue"
  | "wallet.transactionHistory"
  | "wallet.encrypted"
  | "wallet.txn"
  | "wallet.description"
  | "wallet.type"
  | "wallet.amount"
  | "wallet.status"
  | "wallet.time"
  | "wallet.noTransactions"
  | "wallet.topUpMethods"
  | "wallet.railsAvailable"
  | "wallet.noPaymentMethods"
  | "wallet.type.sale"
  | "wallet.type.topup"
  | "wallet.type.withdrawal"
  | "wallet.type.fee"
  | "wallet.type.referral"
  | "wallet.type.held"
  | "wallet.type.release"
  | "wallet.redirectingNowPayments"
  | "wallet.completeCryptoPayment"
  | "wallet.contactWhatsApp"
  | "wallet.manualCredit"
  | "wallet.redirecting"
  | "wallet.completePayment"
  | "wallet.sandboxSuccess"
  | "wallet.sandboxCredited"
  | "wallet.topUpProcessed"
  | "wallet.done"
  | "wallet.topUpFailed"
  | "wallet.tryAgainSupport"
  | "wallet.topUpDialog"
  | "wallet.topUpWallet"
  | "wallet.addFunds"
  | "wallet.amountUsd"
  | "wallet.paymentMethod"
  | "wallet.processingPayment"
  | "wallet.topUpAmount"
  | "wallet.sandboxNotice"
  | "wallet.withdrawalRequested"
  | "wallet.withdrawalPending"
  | "wallet.withdrawalFailed"
  | "wallet.withdrawDialog"
  | "wallet.withdrawFunds"
  | "wallet.withdrawFromWallet"
  | "wallet.availablePending"
  | "wallet.insufficientBalance"
  | "wallet.method"
  | "wallet.destination"
  | "wallet.destinationPlaceholder"
  | "wallet.processing"
  | "wallet.withdrawNotice"
  | "childPanels.eyebrow"
  | "childPanels.title"
  | "childPanels.subtitle"
  | "childPanels.purchase"
  | "childPanels.activePanels"
  | "childPanels.monthlyFees"
  | "childPanels.markupEarned"
  | "childPanels.emptyTitle"
  | "childPanels.emptyDescription"
  | "childPanels.confirmCancel"
  | "childPanels.status.active"
  | "childPanels.status.suspended"
  | "childPanels.status.expired"
  | "childPanels.status.cancelled"
  | "childPanels.subdomain"
  | "childPanels.plan"
  | "childPanels.plan.reseller"
  | "childPanels.plan.agency"
  | "childPanels.plan.enterprise"
  | "childPanels.markup"
  | "childPanels.monthlyFee"
  | "childPanels.paidUntil"
  | "childPanels.expired"
  | "childPanels.edit"
  | "childPanels.suspend"
  | "childPanels.resume"
  | "childPanels.cancel"
  | "childPanels.cancelled"
  | "childPanels.provisioned"
  | "childPanels.saveApiKey"
  | "childPanels.copied"
  | "childPanels.copy"
  | "childPanels.dismiss"
  | "childPanels.createDialog"
  | "childPanels.newTitle"
  | "childPanels.newSubtitle"
  | "childPanels.panelName"
  | "childPanels.markupOver"
  | "childPanels.atCost"
  | "childPanels.doubleCost"
  | "childPanels.duration"
  | "childPanels.30Days"
  | "childPanels.90Days"
  | "childPanels.year365"
  | "childPanels.monthlyFeeFor"
  | "childPanels.days"
  | "childPanels.yourBalance"
  | "childPanels.insufficientBalance"
  | "childPanels.provisioning"
  | "childPanels.purchaseProvision"
  | "childPanels.tagline.reseller"
  | "childPanels.tagline.agency"
  | "childPanels.tagline.enterprise"
  | "childPanels.editDialog"
  | "childPanels.editTitle"
  | "childPanels.markupLabel"
  | "childPanels.saving"
  | "childPanels.saveChanges"
  | "analytics.referralCopied"
  | "analytics.couldNotCopy"
  | "analytics.clipboardBlocked"
  | "analytics.eyebrow"
  | "analytics.title"
  | "analytics.subtitle"
  | "analytics.orders30d"
  | "analytics.revenue30d"
  | "analytics.live"
  | "analytics.conversion"
  | "analytics.activeOrders"
  | "analytics.revenueOrders"
  | "analytics.last30Days"
  | "analytics.byPlatform"
  | "analytics.marketplaceShare"
  | "analytics.noCompletedOrders"
  | "analytics.hourlyOrders"
  | "analytics.peak"
  | "analytics.referrals"
  | "analytics.earnedLifetime"
  | "analytics.shareReferral"
  | "analytics.revenue"
  | "analytics.orders"
  | "analytics.aiInsights"
  | "analytics.autoAnalysis"
  | "analytics.regenerate"
  | "analytics.availableAfter"
  | "analytics.generating"
  | "analytics.refresh"
  | "analytics.noInsights"
  | "analytics.unlockInsights"
  | "analytics.fresh"
  | "analytics.generatedCached"
  | "analytics.hourTooltip"
  | "orders.title"
  | "orders.all"
  | "orders.processing"
  | "orders.completed"
  | "orders.repeat"
  | "orders.export"
  | "orders.allOrders"
  | "orders.shown"
  | "orders.clickRow"
  | "orders.searchPlaceholder"
  | "orders.search"
  | "orders.filter.all"
  | "orders.filter.processing"
  | "orders.filter.in_progress"
  | "orders.filter.completed"
  | "orders.filter.partial"
  | "orders.filter.pending"
  | "orders.order"
  | "orders.service"
  | "orders.qty"
  | "orders.cost"
  | "orders.price"
  | "orders.status"
  | "orders.progress"
  | "orders.fulfilledBy"
  | "orders.actions"
  | "orders.requestRefill"
  | "orders.noMatch"
  | "orders.refillRequest"
  | "orders.processRefill"
  | "orders.link"
  | "orders.details"
  | "orders.priority"
  | "orders.dripFeed"
  | "orders.timeline"
  | "orders.cancelledRefund"
  | "orders.dripConfig"
  | "orders.totalQuantity"
  | "orders.chunks"
  | "orders.perChunk"
  | "orders.delay"
  | "orders.startDate"
  | "orders.serviceTarget"
  | "orders.orderId"
  | "orders.platform"
  | "orders.open"
  | "orders.quantityPricing"
  | "orders.quantity"
  | "orders.unitPrice"
  | "orders.unitCost"
  | "orders.totalPrice"
  | "orders.dates"
  | "orders.created"
  | "orders.updated"
  | "orders.completedAt"
  | "orders.cancelOrder"
  | "orders.left"
  | "orders.orderCancelled"
  | "orders.completedNoCancel"
  | "orders.cancelExpired"
  | "tickets.title"
  | "tickets.new"
  | "tickets.subject"
  | "tickets.message"
  | "tickets.send"
  | "tickets.eyebrow"
  | "tickets.count"
  | "tickets.open"
  | "tickets.conversation"
  | "tickets.noMatch"
  | "tickets.empty"
  | "tickets.searchPlaceholder"
  | "tickets.clearSearch"
  | "tickets.noMessages"
  | "tickets.backToList"
  | "tickets.waitingReply"
  | "tickets.respondShortly"
  | "tickets.uploadFailed"
  | "tickets.tryAgain"
  | "tickets.tryAgainSupport"
  | "tickets.uploading"
  | "tickets.messagePlaceholder"
  | "tickets.enterHint"
  | "tickets.shiftEnterHint"
  | "tickets.cannedReplies"
  | "tickets.noCannedReplies"
  | "tickets.createDialog"
  | "tickets.createTitle"
  | "tickets.subjectPlaceholder"
  | "tickets.priority"
  | "tickets.priorityLow"
  | "tickets.priorityMedium"
  | "tickets.priorityHigh"
  | "tickets.messageCreatePlaceholder"
  | "tickets.creating"
  | "tickets.create"
  | "tickets.priority.low"
  | "tickets.priority.medium"
  | "tickets.priority.high"
  | "tickets.status.open"
  | "tickets.status.waiting"
  | "tickets.status.resolved"
  | "subscriptions.eyebrow"
  | "subscriptions.title"
  | "subscriptions.subtitle"
  | "subscriptions.create"
  | "subscriptions.active"
  | "subscriptions.postsDelivered"
  | "subscriptions.totalSubscriptions"
  | "subscriptions.totalSpent"
  | "subscriptions.emptyTitle"
  | "subscriptions.emptyDescription"
  | "subscriptions.target"
  | "subscriptions.perPostQty"
  | "subscriptions.expiry"
  | "subscriptions.postsCovered"
  | "subscriptions.lastCheck"
  | "subscriptions.pendingFirstCheck"
  | "subscriptions.lastPost"
  | "subscriptions.pause"
  | "subscriptions.resume"
  | "subscriptions.cancel"
  | "subscriptions.allPostsDelivered"
  | "subscriptions.expiredBeforeCompletion"
  | "subscriptions.cancelled"
  | "subscriptions.status.active"
  | "subscriptions.status.paused"
  | "subscriptions.status.completed"
  | "subscriptions.status.expired"
  | "subscriptions.status.cancelled"
  | "subscriptions.createDialog"
  | "subscriptions.newTitle"
  | "subscriptions.newSubtitle"
  | "subscriptions.service"
  | "subscriptions.loadingServices"
  | "subscriptions.selectService"
  | "subscriptions.min"
  | "subscriptions.max"
  | "subscriptions.per1000"
  | "subscriptions.username"
  | "subscriptions.profileLink"
  | "subscriptions.minQtyPost"
  | "subscriptions.maxQtyPost"
  | "subscriptions.postsRange"
  | "subscriptions.delayMin"
  | "subscriptions.expiryDays"
  | "subscriptions.perPostCost"
  | "subscriptions.posts"
  | "subscriptions.yourBalance"
  | "subscriptions.insufficientBalance"
  | "subscriptions.creating"
  | "notifications.title"
  | "notifications.markAllRead"
  | "notifications.live"
  | "notifications.eyebrow"
  | "notifications.subtitle"
  | "notifications.liveConnected"
  | "notifications.connecting"
  | "notifications.empty"
  | "notifications.justNow"
  | "notifications.minutesAgo"
  | "notifications.hoursAgo"
  | "notifications.daysAgo"
  | "notifications.filter.all"
  | "notifications.filter.order"
  | "notifications.filter.sale"
  | "notifications.filter.marketplace"
  | "notifications.filter.ticket"
  | "notifications.filter.recharge"
  | "notifications.filter.withdrawal"
  | "notifications.filter.referral"
  | "notifications.filter.system"
  | "profile.title"
  | "profile.currency"
  | "profile.language"
  | "profile.save"
  | "profile.personalize"
  | "profile.subtitle"
  | "profile.tabProfile"
  | "profile.tabSecurity"
  | "profile.tabAchievements"
  | "profile.tabReferrals"
  | "profile.tabNotifications"
  | "profile.tabSessions"
  | "profile.personalInfo"
  | "profile.fullName"
  | "profile.country"
  | "profile.currencyDescription"
  | "profile.preview"
  | "profile.previewText"
  | "profile.inCurrency"
  | "profile.saving"
  | "profile.dangerZone"
  | "profile.dangerDescription"
  | "profile.deleteAccount"
  | "profile.accountDeleted"
  | "profile.accountDeletedDescription"
  | "profile.deleteWarning"
  | "profile.confirmPassword"
  | "profile.reenterPassword"
  | "profile.hidePassword"
  | "profile.showPassword"
  | "profile.acknowledgeDelete"
  | "profile.deleting"
  | "profile.deleteMyAccount"
  | "profile.passwordChanged"
  | "profile.passwordUpdated"
  | "profile.failed"
  | "profile.2faSetupFailed"
  | "profile.2faEnabled"
  | "profile.2faActive"
  | "profile.verificationFailed"
  | "profile.2faDisabled"
  | "profile.changePassword"
  | "profile.currentPassword"
  | "profile.newPassword"
  | "profile.updatePassword"
  | "profile.twoFactor"
  | "profile.enabled"
  | "profile.twoFactorDescription"
  | "profile.setup2fa"
  | "profile.enterCodeManually"
  | "profile.backupCodes"
  | "profile.enter6Code"
  | "profile.verifyEnable"
  | "profile.enter6Disable"
  | "profile.disable2fa"
  | "profile.preferencesSaved"
  | "profile.prefOrders"
  | "profile.prefOrdersDesc"
  | "profile.prefSales"
  | "profile.prefSalesDesc"
  | "profile.prefTickets"
  | "profile.prefTicketsDesc"
  | "profile.prefRecharges"
  | "profile.prefRechargesDesc"
  | "profile.prefWithdrawals"
  | "profile.prefWithdrawalsDesc"
  | "profile.prefMarketplace"
  | "profile.prefMarketplaceDesc"
  | "profile.prefReferrals"
  | "profile.prefReferralsDesc"
  | "profile.prefSystem"
  | "profile.prefSystemDesc"
  | "profile.prefEmailOrders"
  | "profile.prefEmailOrdersDesc"
  | "profile.prefEmailTickets"
  | "profile.prefEmailTicketsDesc"
  | "profile.prefEmailMarketing"
  | "profile.prefEmailMarketingDesc"
  | "profile.notificationPreferences"
  | "profile.notificationDescription"
  | "profile.savePreferences"
  | "profile.sessionsRevoked"
  | "profile.activeSessions"
  | "profile.revokeAll"
  | "profile.sessionsDescription"
  | "profile.current"
  | "profile.noSessions"
  | "profile.referralCopied"
  | "profile.couldNotCopy"
  | "profile.clipboardBlocked"
  | "profile.referEarn"
  | "profile.earnCommission"
  | "profile.lifetimeCommission"
  | "profile.copyReferralLink"
  | "profile.totalReferrals"
  | "profile.active"
  | "profile.totalEarned"
  | "profile.commission"
  | "profile.yourTier"
  | "profile.rank"
  | "profile.inMore"
  | "profile.unlockTier"
  | "profile.tierUnlocked"
  | "profile.maximumCommission"
  | "profile.tier"
  | "profile.referrals"
  | "profile.status"
  | "profile.currentTier"
  | "profile.unlocked"
  | "profile.locked"
  | "profile.recentPayouts"
  | "profile.referralCommission"
  | "profile.noPayouts"
  | "profile.topReferrers"
  | "profile.emptyLeaderboard"
  | "profile.referredUsers"
  | "profile.pendingSignup"
  | "profile.noReferrals"
  | "profile.loyaltyLoading"
  | "profile.loyaltyProgram"
  | "profile.pointsToNext"
  | "profile.maximumRewards"
  | "profile.achievements"
  | "profile.totalSpent"
  | "profile.completedOrders"
  | "profile.achievementDescription"
  | "profile.pointsOnUnlock"
  | "profile.pointsHistory"
  | "profile.pointsDescription"
  | "profile.linkedOrder"
  | "profile.noPoints"
  | "profile.reasonOrderCompleted"
  | "profile.reasonReferral"
  | "profile.reasonDailyLogin"
  | "profile.reasonAchievement"
  | "auth.signIn"
  | "auth.signUp"
  | "auth.signOut"
  | "auth.email"
  | "auth.password"
  | "auth.forgotPassword"
  | "auth.backHome"
  | "auth.welcomeBack"
  | "auth.workspace"
  | "auth.orEmail"
  | "auth.emailOrUsername"
  | "auth.rememberMe"
  | "auth.signingIn"
  | "auth.verifyAndSignIn"
  | "auth.noAccount"
  | "auth.createOne"
  | "auth.twoFactorRequired"
  | "auth.twoFactorInstructions"
  | "auth.twoFactorCode"
  | "auth.layeredSecurity"
  | "auth.encryption"
  | "auth.liveMonitoring"
  | "auth.forgotPasswordTitle"
  | "auth.forgotPasswordDescription"
  | "auth.resetLinkSent"
  | "auth.resetLinkNotice"
  | "auth.checkInbox"
  | "auth.sendingLink"
  | "auth.sendResetLink"
  | "auth.backToLogin"
  | "auth.close"
  | "auth.loginTimedOut"
  | "auth.invalidTwoFactor"
  | "auth.invalidCredentials"
  | "auth.loginFailed"
  | "auth.requestFailed"
  | "auth.tryAgain"
  | "auth.redirecting"
  | "auth.continueWith"
  | "auth.createWorkspace"
  | "auth.createWorkspaceSubtitle"
  | "auth.orSignUpEmail"
  | "auth.fullName"
  | "auth.username"
  | "auth.usernameHint"
  | "auth.validEmail"
  | "auth.createStrongPassword"
  | "auth.confirmPassword"
  | "auth.reenterPassword"
  | "auth.passwordMismatch"
  | "auth.country"
  | "auth.currency"
  | "auth.language"
  | "auth.creatingAccount"
  | "auth.createAccount"
  | "auth.agreeTerms"
  | "auth.terms"
  | "auth.and"
  | "auth.privacyPolicy"
  | "auth.alreadyAccount"
  | "auth.freeTrial"
  | "auth.noCreditCard"
  | "auth.cancelAnytime"
  | "auth.passwordWeak"
  | "auth.passwordFair"
  | "auth.passwordGood"
  | "auth.passwordStrong"
  | "auth.passwordTipLength"
  | "auth.passwordTipCase"
  | "auth.passwordTipNumber"
  | "auth.passwordTipSymbol"
  | "auth.accountCreated"
  | "auth.registrationFailed"
  | "onboarding.step"
  | "onboarding.back"
  | "onboarding.previous"
  | "onboarding.enterDashboard"
  | "onboarding.continue"
  | "onboarding.skip"
  | "onboarding.welcome.title"
  | "onboarding.welcome.subtitle"
  | "onboarding.role.reseller"
  | "onboarding.role.resellerDesc"
  | "onboarding.role.agency"
  | "onboarding.role.agencyDesc"
  | "onboarding.role.creator"
  | "onboarding.role.creatorDesc"
  | "onboarding.role.enterprise"
  | "onboarding.role.enterpriseDesc"
  | "onboarding.profile.title"
  | "onboarding.profile.subtitle"
  | "onboarding.profile.displayName"
  | "onboarding.profile.yourName"
  | "onboarding.profile.verifiedEmail"
  | "onboarding.currency.title"
  | "onboarding.currency.subtitle"
  | "onboarding.currency.usd"
  | "onboarding.currency.eur"
  | "onboarding.currency.mxn"
  | "onboarding.currency.brl"
  | "onboarding.currency.gbp"
  | "onboarding.currency.inr"
  | "onboarding.language.title"
  | "onboarding.language.subtitle"
  | "onboarding.notifications.title"
  | "onboarding.notifications.subtitle"
  | "onboarding.notifications.orders"
  | "onboarding.notifications.ordersDesc"
  | "onboarding.notifications.sales"
  | "onboarding.notifications.salesDesc"
  | "onboarding.notifications.tickets"
  | "onboarding.notifications.ticketsDesc"
  | "onboarding.notifications.system"
  | "onboarding.notifications.systemDesc"
  | "onboarding.tour.title"
  | "onboarding.tour.subtitle"
  | "onboarding.tour.dashboard"
  | "onboarding.tour.dashboardDesc"
  | "onboarding.tour.marketplace"
  | "onboarding.tour.marketplaceDesc"
  | "onboarding.tour.notifications"
  | "onboarding.tour.notificationsDesc"
  | "onboarding.tour.security"
  | "onboarding.tour.securityDesc"
  | "dashboard.nav.dashboard"
  | "dashboard.nav.analytics"
  | "dashboard.nav.services"
  | "dashboard.nav.orders"
  | "dashboard.nav.subscriptions"
  | "dashboard.nav.childPanels"
  | "dashboard.nav.marketplace"
  | "dashboard.nav.wallet"
  | "dashboard.nav.clients"
  | "dashboard.nav.tickets"
  | "dashboard.nav.notifications"
  | "dashboard.nav.profile"
  | "dashboard.nav.settings"
  | "dashboard.workspace"
  | "dashboard.admin"
  | "dashboard.adminPanel"
  | "dashboard.availableBalance"
  | "dashboard.live"
  | "dashboard.returnToAdmin"
  | "dashboard.exit"
  | "dashboard.impersonating"
  | "dashboard.asAdminAudited"
  | "dashboard.failedReturn"
  | "dashboard.contactSupport"
  | "dashboard.goHome"
  | "dashboard.backHome"
  | "dashboard.closeMenu"
  | "dashboard.openMenu"
  | "dashboard.openCommandPalette"
  | "dashboard.operational"
  | "dashboard.degraded"
  | "dashboard.account"
  | "dashboard.user"
  | "dashboard.viewProfile"
  | "dashboard.overview"
  | "dashboard.welcomeName"
  | "dashboard.there"
  | "dashboard.todaySummary"
  | "dashboard.inProgress"
  | "dashboard.completedAll"
  | "dashboard.total"
  | "dashboard.7d"
  | "dashboard.30d"
  | "dashboard.90d"
  | "dashboard.wallet"
  | "dashboard.quickStats"
  | "dashboard.lifetimeEarnings"
  | "dashboard.openTickets"
  | "dashboard.recentOrders"
  | "dashboard.liveActivity"
  | "dashboard.viewAll"
  | "dashboard.noOrders"
  | "dashboard.favoriteServices"
  | "dashboard.browse"
  | "dashboard.noFavorites"
  | "dashboard.recentTickets"
  | "dashboard.noTickets"
  | "dashboard.referEarn"
  | "dashboard.referralProgram"
  | "dashboard.commission"
  | "dashboard.earned"
  | "dashboard.referralsTo"
  | "dashboard.toGo"
  | "dashboard.maxTier"
  | "dashboard.copyReferral"
  | "dashboard.referralCopied"
  | "dashboard.couldNotCopy"
  | "dashboard.clipboardBlocked"
  | "dashboard.viewReferralDashboard"
  | "dashboard.loyaltyRewards"
  | "dashboard.loyaltyLoading"
  | "dashboard.loyaltyProgram"
  | "dashboard.pointsTo"
  | "dashboard.maxRewards"
  | "dashboard.recentAchievements"
  | "dashboard.placeOrderAchievement"
  | "dashboard.viewAchievements"
  | "dashboard.search"
  | "dashboard.searchShort"
  | "dashboard.allSystemsOperational"
  | "dashboard.ordersToday"
  | "dashboard.activeServices"
  | "dashboard.conversion"
  | "dashboard.revenueLastDays"
  | "dashboard.liveOrders"
  | "dashboard.streaming"
  | "dashboard.justNow"
  | "common.loading"
  | "common.save"
  | "common.cancel"
  | "common.delete"
  | "common.search"
  | "common.actions"
  | "common.status"
  | "common.close"
  // Landing — Services
  | "landing.services.eyebrow"
  | "landing.services.titleLine1"
  | "landing.services.titleLine2"
  | "landing.services.description"
  | "landing.services.moreLabel"
  | "landing.services.totalServices"
  | "landing.services.svcUnit"
  // Landing — Marketplace
  | "landing.marketplace.eyebrow"
  | "landing.marketplace.titleLine1"
  | "landing.marketplace.titleLine2"
  | "landing.marketplace.description"
  | "landing.marketplace.flow.label"
  | "landing.marketplace.flow.title"
  | "landing.marketplace.flow.supply.title"
  | "landing.marketplace.flow.supply.desc"
  | "landing.marketplace.flow.supply.chip"
  | "landing.marketplace.flow.markup.title"
  | "landing.marketplace.flow.markup.desc"
  | "landing.marketplace.flow.markup.chip"
  | "landing.marketplace.flow.checkout.title"
  | "landing.marketplace.flow.checkout.desc"
  | "landing.marketplace.flow.checkout.chip"
  | "landing.marketplace.flow.settlement.title"
  | "landing.marketplace.flow.settlement.desc"
  | "landing.marketplace.flow.settlement.chip"
  | "landing.marketplace.flow.loopback"
  | "landing.marketplace.offers.label"
  | "landing.marketplace.offers.title"
  | "landing.marketplace.offers.statusLive"
  | "landing.marketplace.offers.statusSample"
  | "landing.marketplace.offers.sampleNotice"
  | "landing.marketplace.offers.cost"
  | "landing.marketplace.offers.retail"
  | "landing.marketplace.offers.sold"
  | "landing.marketplace.offers.walletLabel"
  | "landing.marketplace.offers.withdraw"
  // Landing — Payments
  | "landing.payments.eyebrow"
  | "landing.payments.titleLine1"
  | "landing.payments.titleLine2"
  | "landing.payments.description"
  | "landing.payments.metaCurrencies"
  | "landing.payments.metaSettlement"
  | "landing.payments.metaSecurity"
  | "landing.payments.statGateways"
  | "landing.payments.statCurrencies"
  | "landing.payments.statFailure"
  | "landing.payments.statSettlement"
  | "landing.payments.coinFieldLabel"
  | "landing.payments.provider.paypal.note"
  | "landing.payments.provider.paypal.coverage"
  | "landing.payments.provider.mercadopago.note"
  | "landing.payments.provider.mercadopago.coverage"
  | "landing.payments.provider.nowpayments.note"
  | "landing.payments.provider.nowpayments.coverage"
  | "landing.payments.provider.manual.note"
  | "landing.payments.provider.manual.coverage"
  | "landing.payments.settlement.instant"
  | "landing.payments.settlement.onchain"
  | "landing.payments.settlement.hours"
  | "landing.payments.security.pciL1"
  | "landing.payments.security.decentralized"
  | "landing.payments.security.verified"
  // Landing — Stats
  | "landing.stats.eyebrow"
  | "landing.stats.titleLine1"
  | "landing.stats.titleLine2"
  | "landing.stats.description"
  | "landing.stats.orders.label"
  | "landing.stats.orders.sub"
  | "landing.stats.users.label"
  | "landing.stats.users.sub"
  | "landing.stats.revenue.label"
  | "landing.stats.revenue.sub"
  | "landing.stats.enterprise.label"
  | "landing.stats.enterprise.sub"
  | "landing.stats.chart.label"
  | "landing.stats.chart.dod"
  | "landing.stats.status.label"
  | "landing.stats.status.state"
  | "landing.stats.status.uptimeLabel"
  | "landing.stats.status.60daysAgo"
  | "landing.stats.status.today"
  | "landing.stats.status.avgStart"
  | "landing.stats.status.throughput"
  | "landing.stats.status.perMin"
  // Landing — Testimonials
  | "landing.testimonials.eyebrow"
  | "landing.testimonials.titleLine1"
  | "landing.testimonials.titleLine2"
  | "landing.testimonials.description"
  | "landing.testimonials.verifiedBy"
  | "landing.testimonials.proof.avgRating"
  | "landing.testimonials.proof.nps"
  | "landing.testimonials.proof.switchedFrom"
  | "landing.testimonials.proof.countries"
  // Landing — Security
  | "landing.security.eyebrow"
  | "landing.security.titleLine1"
  | "landing.security.titleLine2"
  | "landing.security.description"
  | "landing.security.statusActive"
  | "landing.security.layer.ddos.title"
  | "landing.security.layer.ddos.desc"
  | "landing.security.layer.ddos.metric"
  | "landing.security.layer.tls.title"
  | "landing.security.layer.tls.desc"
  | "landing.security.layer.tls.metric"
  | "landing.security.layer.aes.title"
  | "landing.security.layer.aes.desc"
  | "landing.security.layer.aes.metric"
  | "landing.security.layer.backups.title"
  | "landing.security.layer.backups.desc"
  | "landing.security.layer.backups.metric"
  | "landing.security.layer.ha.title"
  | "landing.security.layer.ha.desc"
  | "landing.security.layer.ha.metric"
  | "landing.security.layer.api.title"
  | "landing.security.layer.api.desc"
  | "landing.security.layer.api.metric"
  | "landing.security.layer.audit.title"
  | "landing.security.layer.audit.desc"
  | "landing.security.layer.audit.metric"
  | "landing.security.layer.auth.title"
  | "landing.security.layer.auth.desc"
  | "landing.security.layer.auth.metric"
  | "landing.security.shield.edge"
  | "landing.security.shield.app"
  | "landing.security.shield.data"
  | "landing.security.shield.keys"
  | "landing.security.metric.threats"
  | "landing.security.metric.mttr"
  | "landing.security.metric.regions"
  // Landing — API Docs
  | "landing.apiDocs.eyebrow"
  | "landing.apiDocs.titleLine1"
  | "landing.apiDocs.titleLine2"
  | "landing.apiDocs.description"
  | "landing.apiDocs.compatNote"
  | "landing.apiDocs.whatYouGet"
  | "landing.apiDocs.everythingYouNeed"
  | "landing.apiDocs.feature.endpoints.title"
  | "landing.apiDocs.feature.endpoints.desc"
  | "landing.apiDocs.feature.batching.title"
  | "landing.apiDocs.feature.batching.desc"
  | "landing.apiDocs.feature.dripFeed.title"
  | "landing.apiDocs.feature.dripFeed.desc"
  | "landing.apiDocs.feature.refill.title"
  | "landing.apiDocs.feature.refill.desc"
  | "landing.apiDocs.feature.webhooks.title"
  | "landing.apiDocs.feature.webhooks.desc"
  | "landing.apiDocs.feature.keys.title"
  | "landing.apiDocs.feature.keys.desc"
  | "landing.apiDocs.viewDocs"
  | "landing.apiDocs.versionNote"
  // Landing — Affiliates
  | "landing.affiliates.eyebrow"
  | "landing.affiliates.titleLine1"
  | "landing.affiliates.titleLine2"
  | "landing.affiliates.description"
  | "landing.affiliates.stats.affiliates"
  | "landing.affiliates.stats.paidOut"
  | "landing.affiliates.stats.commission"
  | "landing.affiliates.commission.label"
  | "landing.affiliates.commission.title"
  | "landing.affiliates.commission.yourShare"
  | "landing.affiliates.commission.theirOrder"
  | "landing.affiliates.commission.customerOrder"
  | "landing.affiliates.commission.example"
  | "landing.affiliates.payout.label"
  | "landing.affiliates.payout.wallet.label"
  | "landing.affiliates.payout.wallet.note"
  | "landing.affiliates.payout.paypal.note"
  | "landing.affiliates.payout.usdt.note"
  | "landing.affiliates.howItWorks.label"
  | "landing.affiliates.howItWorks.title"
  | "landing.affiliates.step1.title"
  | "landing.affiliates.step1.desc"
  | "landing.affiliates.step2.title"
  | "landing.affiliates.step2.desc"
  | "landing.affiliates.step3.title"
  | "landing.affiliates.step3.desc"
  | "landing.affiliates.cta.become"
  | "landing.affiliates.cta.openDashboard"
  | "landing.affiliates.cta.note"
  // Landing — FAQ
  | "landing.faq.eyebrow"
  | "landing.faq.title"
  | "landing.faq.description"
  | "landing.faq.stillHaveQuestions"
  | "landing.faq.supportReplies"
  | "landing.faq.chatWithUs"
  // Landing — Sticky CTA
  | "landing.stickyCta.title"
  | "landing.stickyCta.subtitle"
  | "landing.stickyCta.getStarted"
  | "landing.stickyCta.viewPricing"
  | "landing.stickyCta.startFree"
  // Landing — Social Proof
  | "landing.socialProof.demo"
  | "landing.socialProof.action.signedUp"
  | "landing.socialProof.action.placedOrder"
  | "landing.socialProof.action.toppedUp"
  | "landing.socialProof.ariaLabel"
  | "landing.socialProof.dismiss";

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
  // Landing — Services
  "landing.services.eyebrow": "Services",
  "landing.services.titleLine1": "Every platform. Every metric.",
  "landing.services.titleLine2": "One control surface.",
  "landing.services.description": "From follower growth to watch-time, NOVSMM orchestrates 6,300+ services across the platforms your audience actually lives on — powered by HuntSMM.",
  "landing.services.moreLabel": "+ more",
  "landing.services.totalServices": "total active services",
  "landing.services.svcUnit": "svc",
  // Landing — Marketplace
  "landing.marketplace.eyebrow": "Marketplace",
  "landing.marketplace.titleLine1": "Buy wholesale. Resell at your price.",
  "landing.marketplace.titleLine2": "Keep the margin.",
  "landing.marketplace.description": "An open marketplace where resellers compete on price, publish their own offers, and watch profit settle in real time — without touching infrastructure.",
  "landing.marketplace.flow.label": "The flow",
  "landing.marketplace.flow.title": "From supply to settled profit in one continuous loop",
  "landing.marketplace.flow.supply.title": "Provider supply",
  "landing.marketplace.flow.supply.desc": "Approved providers list services at wholesale rates.",
  "landing.marketplace.flow.supply.chip": "wholesale",
  "landing.marketplace.flow.markup.title": "Reseller markup",
  "landing.marketplace.flow.markup.desc": "Set margins per service, per client tier, per currency.",
  "landing.marketplace.flow.markup.chip": "your margin",
  "landing.marketplace.flow.checkout.title": "Buyer checkout",
  "landing.marketplace.flow.checkout.desc": "Customers buy at your retail price across 5 gateways.",
  "landing.marketplace.flow.checkout.chip": "retail",
  "landing.marketplace.flow.settlement.title": "Instant settlement",
  "landing.marketplace.flow.settlement.desc": "Profit settles to your wallet the moment an order starts.",
  "landing.marketplace.flow.settlement.chip": "profit",
  "landing.marketplace.flow.loopback": "Profit recycles into balance — fund the next order instantly.",
  "landing.marketplace.offers.label": "Live offers board",
  "landing.marketplace.offers.title": "Compete on price. Win the order.",
  "landing.marketplace.offers.statusLive": "live",
  "landing.marketplace.offers.statusSample": "sample",
  "landing.marketplace.offers.sampleNotice": "Showing sample offers — publish your own from the dashboard to populate the live board.",
  "landing.marketplace.offers.cost": "cost",
  "landing.marketplace.offers.retail": "retail",
  "landing.marketplace.offers.sold": "sold",
  "landing.marketplace.offers.walletLabel": "Wallet balance",
  "landing.marketplace.offers.withdraw": "Withdraw",
  // Landing — Payments
  "landing.payments.eyebrow": "Payments",
  "landing.payments.titleLine1": "One balance. Every currency.",
  "landing.payments.titleLine2": "Settled in minutes.",
  "landing.payments.description": "NOVSMM routes every transaction through PayPal, Mercado Pago, NowPayments (crypto), or manual settlement — with FX conversion at mid-market rates and 100+ cryptocurrencies accepted.",
  "landing.payments.metaCurrencies": "Cur.",
  "landing.payments.metaSettlement": "Settle",
  "landing.payments.metaSecurity": "Sec.",
  "landing.payments.statGateways": "Payment gateways",
  "landing.payments.statCurrencies": "Currencies",
  "landing.payments.statFailure": "Failure rate",
  "landing.payments.statSettlement": "Avg. settlement",
  "landing.payments.coinFieldLabel": "Reactive to scroll & cursor · GPU accelerated",
  "landing.payments.provider.paypal.note": "Buyer protection & vaulted wallets. Trusted globally.",
  "landing.payments.provider.paypal.coverage": "200+ countries",
  "landing.payments.provider.mercadopago.note": "Leading payment platform in Latin America. Local rails.",
  "landing.payments.provider.mercadopago.coverage": "LATAM region",
  "landing.payments.provider.nowpayments.note": "Accept 100+ cryptocurrencies. Auto-conversion to fiat. Zero chargebacks.",
  "landing.payments.provider.nowpayments.coverage": "Global",
  "landing.payments.provider.manual.note": "Contact our team via WhatsApp for manual credits. Zero fees.",
  "landing.payments.provider.manual.coverage": "Global",
  "landing.payments.settlement.instant": "Instant",
  "landing.payments.settlement.onchain": "~5 min (on-chain)",
  "landing.payments.settlement.hours": "1-24h",
  "landing.payments.security.pciL1": "PCI DSS L1 (via provider)",
  "landing.payments.security.decentralized": "Decentralized",
  "landing.payments.security.verified": "Verified",
  // Landing — Stats
  "landing.stats.eyebrow": "Statistics",
  "landing.stats.titleLine1": "Numbers that move",
  "landing.stats.titleLine2": "at the speed of attention.",
  "landing.stats.description": "Every counter below is wired to the same telemetry that powers operator dashboards — updated continuously, never cached for vanity.",
  "landing.stats.orders.label": "Orders fulfilled",
  "landing.stats.orders.sub": "all-time, across {count} services",
  "landing.stats.users.label": "Active users",
  "landing.stats.users.sub": "resellers & agencies, 30d",
  "landing.stats.revenue.label": "Revenue routed",
  "landing.stats.revenue.sub": "through the marketplace",
  "landing.stats.enterprise.label": "Enterprise clients",
  "landing.stats.enterprise.sub": "with dedicated infra",
  "landing.stats.chart.label": "Daily sales · last 14 days",
  "landing.stats.chart.dod": "DoD",
  "landing.stats.status.label": "System status",
  "landing.stats.status.state": "operational",
  "landing.stats.status.uptimeLabel": "uptime, trailing 90d",
  "landing.stats.status.60daysAgo": "60 days ago",
  "landing.stats.status.today": "today",
  "landing.stats.status.avgStart": "Avg. start",
  "landing.stats.status.throughput": "Throughput",
  "landing.stats.status.perMin": "/min",
  // Landing — Testimonials
  "landing.testimonials.eyebrow": "Testimonials",
  "landing.testimonials.titleLine1": "Operators who switched.",
  "landing.testimonials.titleLine2": "Results that stayed.",
  "landing.testimonials.description": "Representative experiences from platform users. Results may vary.",
  "landing.testimonials.verifiedBy": "Verified by NOVSMM operators",
  "landing.testimonials.proof.avgRating": "Average rating",
  "landing.testimonials.proof.nps": "Net promoter score",
  "landing.testimonials.proof.switchedFrom": "Switched from",
  "landing.testimonials.proof.countries": "Countries served",
  // Landing — Security
  "landing.security.eyebrow": "Security",
  "landing.security.titleLine1": "Security you can see —",
  "landing.security.titleLine2": "not just a checklist.",
  "landing.security.description": "Every layer below is instrumented, monitored, and surfaced live to operators. This is the posture enterprise teams require.",
  "landing.security.statusActive": "active",
  "landing.security.layer.ddos.title": "DDoS shielding",
  "landing.security.layer.ddos.desc": "Always-on L3/L4/L7 mitigation at the edge. 2.4 Tbps capacity.",
  "landing.security.layer.ddos.metric": "0 attacks breached",
  "landing.security.layer.tls.title": "TLS 1.3 everywhere",
  "landing.security.layer.tls.desc": "End-to-end encryption in transit. HSTS preload, OCSP stapling.",
  "landing.security.layer.tls.metric": "A+ rating · SSL Labs",
  "landing.security.layer.aes.title": "AES-256 at rest",
  "landing.security.layer.aes.desc": "All wallets, keys, and PII encrypted with per-tenant DEKs.",
  "landing.security.layer.aes.metric": "FIPS 140-2 modules",
  "landing.security.layer.backups.title": "Continuous backups",
  "landing.security.layer.backups.desc": "PITR every 60s, cross-region replicas, 30-day retention.",
  "landing.security.layer.backups.metric": "RPO 60s · RTO 5m",
  "landing.security.layer.ha.title": "High availability",
  "landing.security.layer.ha.desc": "Active-active across 3 regions. Auto-failover under 30s.",
  "landing.security.layer.ha.metric": "99.99% uptime SLA",
  "landing.security.layer.api.title": "API protection",
  "landing.security.layer.api.desc": "Per-key rate limits, anomaly detection, signed webhooks.",
  "landing.security.layer.api.metric": "<0.01% bad requests",
  "landing.security.layer.audit.title": "Audit logs",
  "landing.security.layer.audit.desc": "Immutable, exportable logs for every privileged action.",
  "landing.security.layer.audit.metric": "12-month retention",
  "landing.security.layer.auth.title": "Secure auth",
  "landing.security.layer.auth.desc": "SSO, 2FA, passkeys, hardware keys. SCIM provisioning.",
  "landing.security.layer.auth.metric": "Passkey + WebAuthn",
  "landing.security.shield.edge": "Edge",
  "landing.security.shield.app": "App",
  "landing.security.shield.data": "Data",
  "landing.security.shield.keys": "Keys",
  "landing.security.metric.threats": "Threats blocked",
  "landing.security.metric.mttr": "MTTR",
  "landing.security.metric.regions": "Regions",
  // Landing — API Docs
  "landing.apiDocs.eyebrow": "Developer API",
  "landing.apiDocs.titleLine1": "Build with the",
  "landing.apiDocs.titleLine2": "NOVSMM API.",
  "landing.apiDocs.description": "A PerfectPanel / JAP-compatible REST contract — drop-in compatible with your existing bots, panels, and automation tooling. Bearer auth, scoped keys, signed webhooks.",
  "landing.apiDocs.compatNote": "Compatible with existing SMM panel tooling — no SDK install required.",
  "landing.apiDocs.whatYouGet": "What you get",
  "landing.apiDocs.everythingYouNeed": "Everything a reseller integration needs",
  "landing.apiDocs.feature.endpoints.title": "7 REST endpoints",
  "landing.apiDocs.feature.endpoints.desc": "Services, orders, status, cancel, refill, refill_status, balance — full coverage.",
  "landing.apiDocs.feature.batching.title": "Multi-order batching",
  "landing.apiDocs.feature.batching.desc": "Submit up to 100 orders in a single request. Atomic failure, partial success.",
  "landing.apiDocs.feature.dripFeed.title": "Drip-feed scheduling",
  "landing.apiDocs.feature.dripFeed.desc": "Split delivery into chunks with configurable runs and intervals.",
  "landing.apiDocs.feature.refill.title": "Refill requests",
  "landing.apiDocs.feature.refill.desc": "Trigger re-delivery on completed orders when counts drop within 30 days.",
  "landing.apiDocs.feature.webhooks.title": "Signed webhooks",
  "landing.apiDocs.feature.webhooks.desc": "HMAC-signed events for order status changes — replay-safe and idempotent.",
  "landing.apiDocs.feature.keys.title": "Scoped API keys",
  "landing.apiDocs.feature.keys.desc": "Per-key permissions: read, order, wallet, marketplace. Rotate without downtime.",
  "landing.apiDocs.viewDocs": "View full API docs",
  "landing.apiDocs.versionNote": "v1.0.0 · 60 req/min per key",
  // Landing — Affiliates
  "landing.affiliates.eyebrow": "Affiliates",
  "landing.affiliates.titleLine1": "Earn 10% commission",
  "landing.affiliates.titleLine2": "on every referral.",
  "landing.affiliates.description": "Lifetime attribution, real-time payouts, no caps. The NOVSMM affiliate program is the highest-paying referral system in the SMM ecosystem.",
  "landing.affiliates.stats.affiliates": "affiliates earning today",
  "landing.affiliates.stats.paidOut": "paid out to affiliates",
  "landing.affiliates.stats.commission": "lifetime commission",
  "landing.affiliates.commission.label": "Commission structure",
  "landing.affiliates.commission.title": "10% lifetime · $50 minimum payout",
  "landing.affiliates.commission.yourShare": "Your share",
  "landing.affiliates.commission.theirOrder": "Their order",
  "landing.affiliates.commission.customerOrder": "customer order",
  "landing.affiliates.commission.example": "Example: a $100 order credits you {amount} — instantly, every time, forever.",
  "landing.affiliates.payout.label": "Payout methods",
  "landing.affiliates.payout.wallet.label": "Wallet balance",
  "landing.affiliates.payout.wallet.note": "Instant · no fees",
  "landing.affiliates.payout.paypal.note": "$50 minimum",
  "landing.affiliates.payout.usdt.note": "$50 minimum",
  "landing.affiliates.howItWorks.label": "How it works",
  "landing.affiliates.howItWorks.title": "Three steps to forever income",
  "landing.affiliates.step1.title": "Share your link",
  "landing.affiliates.step1.desc": "Get a unique referral link from your dashboard. Post it anywhere — Twitter, Telegram, your panel footer.",
  "landing.affiliates.step2.title": "They sign up & order",
  "landing.affiliates.step2.desc": "Anyone who registers through your link is tagged as your referral — for life. No attribution windows.",
  "landing.affiliates.step3.title": "You earn 10% forever",
  "landing.affiliates.step3.desc": "Every order they place earns you 10% commission — credited to your wallet in real time, withdrawable any time.",
  "landing.affiliates.cta.become": "Become an affiliate",
  "landing.affiliates.cta.openDashboard": "Open your referral dashboard",
  "landing.affiliates.cta.note": "No approval process · Instant activation · Withdraw anytime",
  // Landing — FAQ
  "landing.faq.eyebrow": "FAQ",
  "landing.faq.title": "Frequently asked questions",
  "landing.faq.description": "Answers to the most common questions about NOVSMM. Can't find what you're looking for? Our support team is one click away.",
  "landing.faq.stillHaveQuestions": "Still have questions?",
  "landing.faq.supportReplies": "Our support team replies in minutes, 24/7.",
  "landing.faq.chatWithUs": "Chat with us",
  // Landing — Sticky CTA
  "landing.stickyCta.title": "Start free today",
  "landing.stickyCta.subtitle": "No credit card required",
  "landing.stickyCta.getStarted": "Get started",
  "landing.stickyCta.viewPricing": "View pricing",
  "landing.stickyCta.startFree": "Start free",
  // Landing — Social Proof
  "landing.socialProof.demo": "Illustrative",
  "landing.socialProof.action.signedUp": "just signed up",
  "landing.socialProof.action.placedOrder": "placed an order",
  "landing.socialProof.action.toppedUp": "topped up",
  "landing.socialProof.ariaLabel": "Platform activity",
  "landing.socialProof.dismiss": "Dismiss",
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
  "marketplace.buySellHistory": "Buy · Sell · History",
  "marketplace.subtitle": "Browse services, place orders, and repeat past purchases.",
  "marketplace.massOrder": "Mass order",
  "marketplace.sections": "Marketplace sections",
  "marketplace.searchPlaceholder": "Search services — Instagram, TikTok, followers, views…",
  "marketplace.clearSearch": "Clear search",
  "marketplace.sortServices": "Sort services",
  "marketplace.sort.popular": "Popular",
  "marketplace.sort.price-asc": "Price: Low to High",
  "marketplace.sort.price-desc": "Price: High to Low",
  "marketplace.sort.fastest": "Fastest delivery",
  "marketplace.sort.name-asc": "Name: A-Z",
  "marketplace.viewMode": "View mode",
  "marketplace.gridView": "Grid view",
  "marketplace.listView": "List view",
  "marketplace.favoritesOnly": "Show only favorited services",
  "marketplace.favorites": "Favorites",
  "marketplace.min": "Min",
  "marketplace.max": "Max",
  "marketplace.minimumPrice": "Minimum price",
  "marketplace.maximumPrice": "Maximum price",
  "marketplace.apply": "Apply",
  "marketplace.price": "Price",
  "marketplace.all": "All",
  "marketplace.showing": "Showing",
  "marketplace.of": "of",
  "marketplace.services": "services",
  "marketplace.noServices": "No services found",
  "marketplace.adjustFilters": "Try adjusting your search or filters",
  "marketplace.clearFilters": "Clear filters",
  "marketplace.service": "Service",
  "marketplace.pricePer1k": "Price/1k",
  "marketplace.minMax": "Min/Max",
  "marketplace.delivery": "Delivery",
  "marketplace.action": "Action",
  "marketplace.loadMore": "Load more",
  "marketplace.endCatalog": "End of catalog",
  "marketplace.showMore": "Show",
  "marketplace.moreIn": "more in",
  "marketplace.hidden": "hidden",
  "marketplace.unavailable": "Unavailable",
  "marketplace.pressEnterOrder": "Press Enter to view details and place an order.",
  "marketplace.new": "New",
  "marketplace.remove": "Remove",
  "marketplace.fromFavorites": "from favorites",
  "marketplace.add": "Add",
  "marketplace.toFavorites": "to favorites",
  "marketplace.fromComparison": "from comparison",
  "marketplace.toComparison": "to comparison",
  "marketplace.details": "Details",
  "marketplace.order": "Order",
  "marketplace.now": "now",
  "marketplace.trending": "Trending services",
  "marketplace.trendingSubtitle": "Most established services on NOVSMM — chosen by catalog age.",
  "marketplace.comparisonTray": "Comparison tray",
  "marketplace.compare": "Compare",
  "marketplace.maxReached": "max reached",
  "marketplace.pickAnother": "pick another to add",
  "marketplace.clearComparison": "Clear comparison list",
  "marketplace.clear": "Clear",
  "marketplace.compareNow": "Compare now",
  "marketplace.pricePerThousand": "Price per 1000",
  "marketplace.deliveryTime": "Delivery time",
  "marketplace.minMaxQty": "Min / Max qty",
  "marketplace.quality": "Quality",
  "marketplace.compareServices": "Compare services",
  "marketplace.closeComparison": "Close comparison",
  "marketplace.sideBySide": "Side-by-side view of",
  "marketplace.clickRemove": "Click ✕ to remove.",
  "marketplace.attribute": "Attribute",
  "marketplace.compareTip": "Tip: pick up to",
  "marketplace.servicesForComparison": "services for an at-a-glance comparison.",
  "marketplace.ratingThanks": "Thanks for rating!",
  "marketplace.youRated": "You rated",
  "marketplace.stars": "stars",
  "marketplace.orderPlaced": "Order placed",
  "marketplace.orderProcessing": "Your order is now processing",
  "marketplace.serviceDetails": "Service details",
  "marketplace.speed": "Speed",
  "marketplace.minQuantity": "Min quantity",
  "marketplace.maxQuantity": "Max quantity",
  "marketplace.yourRating": "Your rating",
  "marketplace.reviews": "reviews",
  "marketplace.noRatings": "No ratings yet — be the first to review.",
  "marketplace.rateService": "Rate this service",
  "marketplace.rateStars": "Rate this service from 1 to 5 stars",
  "marketplace.clickSubmit": "Click to submit",
  "marketplace.hoverRate": "Hover and click to rate",
  "marketplace.yourBalance": "Your balance",
  "marketplace.quantity": "Quantity",
  "marketplace.linkOptional": "Link (optional — for services that need a target URL)",
  "marketplace.linkPlaceholder": "https://instagram.com/yourpost",
  "marketplace.dripFeed": "Drip-feed delivery",
  "marketplace.dripFeedDescription": "Split your order into smaller chunks delivered over time for a natural growth pattern.",
  "marketplace.daysChunks": "Days (chunks)",
  "marketplace.delayMinutes": "Delay (minutes)",
  "marketplace.preview": "Preview",
  "marketplace.totalCost": "Total cost",
  "marketplace.placingOrder": "Placing order…",
  "marketplace.insufficientBalance": "Insufficient balance — top up your wallet",
  "marketplace.placeDripOrder": "Place drip-feed order",
  "wallet.title": "Balance & activity",
  "wallet.topUp": "Top up",
  "wallet.withdraw": "Withdraw",
  "wallet.available": "Available",
  "wallet.held": "Held",
  "wallet.transactions": "Transaction history",
  "wallet.eyebrow": "Wallet",
  "wallet.balanceActivity": "Balance & activity",
  "wallet.subtitle": "Real-time balance, top up, withdraw, and export statements.",
  "wallet.export": "Export",
  "wallet.live": "live",
  "wallet.pendingCompletion": "Pending order completion",
  "wallet.lifetimeEarnings": "Lifetime earnings",
  "wallet.allTimeRevenue": "All-time revenue",
  "wallet.cashFlow30": "Cash flow · 30 days",
  "wallet.liveFromTransactions": "Live from transactions",
  "wallet.revenue": "Revenue",
  "wallet.transactionHistory": "Transaction history",
  "wallet.encrypted": "Encrypted",
  "wallet.txn": "Txn",
  "wallet.description": "Description",
  "wallet.type": "Type",
  "wallet.amount": "Amount",
  "wallet.status": "Status",
  "wallet.time": "Time",
  "wallet.noTransactions": "No transactions yet.",
  "wallet.topUpMethods": "Top-up methods",
  "wallet.railsAvailable": "rails available",
  "wallet.noPaymentMethods": "No payment methods configured yet.",
  "wallet.type.sale": "Sale",
  "wallet.type.topup": "Top-up",
  "wallet.type.withdrawal": "Withdrawal",
  "wallet.type.fee": "Fee",
  "wallet.type.referral": "Referral",
  "wallet.type.held": "Held",
  "wallet.type.release": "Release",
  "wallet.redirectingNowPayments": "Redirecting to NowPayments…",
  "wallet.completeCryptoPayment": "Complete your crypto payment on NowPayments. Your balance will update after confirmation.",
  "wallet.contactWhatsApp": "Contact us on WhatsApp",
  "wallet.manualCredit": "We'll credit your balance manually after confirming your payment.",
  "wallet.redirecting": "Redirecting to",
  "wallet.completePayment": "Complete your payment. Your balance will update after payment.",
  "wallet.sandboxSuccess": "Top-up successful (sandbox)",
  "wallet.sandboxCredited": "{amount} credited to your wallet via {method}. Configure real credentials in Admin → Payments for live payments.",
  "wallet.topUpProcessed": "Top-up processed",
  "wallet.done": "Done.",
  "wallet.topUpFailed": "Top-up failed",
  "wallet.tryAgainSupport": "Please try again or contact support.",
  "wallet.topUpDialog": "Top up wallet",
  "wallet.topUpWallet": "Top up wallet",
  "wallet.addFunds": "Add funds",
  "wallet.amountUsd": "Amount (USD)",
  "wallet.paymentMethod": "Payment method",
  "wallet.processingPayment": "Processing payment…",
  "wallet.topUpAmount": "Top up",
  "wallet.sandboxNotice": "Sandbox mode · no real charge · processes in ~2s",
  "wallet.withdrawalRequested": "Withdrawal requested",
  "wallet.withdrawalPending": "{amount} withdrawal via {method} is pending admin approval.",
  "wallet.withdrawalFailed": "Withdrawal failed",
  "wallet.withdrawDialog": "Withdraw funds",
  "wallet.withdrawFunds": "Withdraw funds",
  "wallet.withdrawFromWallet": "Withdraw from wallet",
  "wallet.availablePending": "Available: {balance} · Pending admin approval",
  "wallet.insufficientBalance": "Insufficient balance",
  "wallet.method": "Method",
  "wallet.destination": "Destination (account / address / email)",
  "wallet.destinationPlaceholder": "e.g. IBAN, USDT wallet address, PayPal email",
  "wallet.processing": "Processing…",
  "wallet.withdrawNotice": "Withdrawals are reviewed by admin before processing · 1% fee applies",
  "childPanels.eyebrow": "Reseller",
  "childPanels.title": "Child Panels",
  "childPanels.subtitle": "White-label sub-panels for your reseller business.",
  "childPanels.purchase": "Purchase child panel",
  "childPanels.activePanels": "Active panels",
  "childPanels.monthlyFees": "Monthly fees",
  "childPanels.markupEarned": "Markup earned (est.)",
  "childPanels.emptyTitle": "No child panels yet",
  "childPanels.emptyDescription": "Purchase one to start your white-label reseller business. You'll get a subdomain + API key auto-provisioned — your customers see your brand, we do the fulfilment.",
  "childPanels.confirmCancel": "Cancel {name}? The subdomain will be released.",
  "childPanels.status.active": "Active",
  "childPanels.status.suspended": "Suspended",
  "childPanels.status.expired": "Expired",
  "childPanels.status.cancelled": "Cancelled",
  "childPanels.subdomain": "Subdomain",
  "childPanels.plan": "Plan",
  "childPanels.plan.reseller": "Reseller",
  "childPanels.plan.agency": "Agency",
  "childPanels.plan.enterprise": "Enterprise",
  "childPanels.markup": "Markup",
  "childPanels.monthlyFee": "Monthly fee",
  "childPanels.paidUntil": "Paid until",
  "childPanels.expired": "expired",
  "childPanels.edit": "Edit",
  "childPanels.suspend": "Suspend",
  "childPanels.resume": "Resume",
  "childPanels.cancel": "Cancel",
  "childPanels.cancelled": "Cancelled",
  "childPanels.provisioned": "Child panel {id} provisioned",
  "childPanels.saveApiKey": "Save this API key now — it won't be shown again. Your panel is live at",
  "childPanels.copied": "Copied",
  "childPanels.copy": "Copy",
  "childPanels.dismiss": "Dismiss",
  "childPanels.createDialog": "Create child panel",
  "childPanels.newTitle": "New child panel",
  "childPanels.newSubtitle": "Auto-provisioned subdomain + API key · billed upfront for {days} days.",
  "childPanels.panelName": "Panel name",
  "childPanels.markupOver": "Markup over parent prices:",
  "childPanels.atCost": "0% (at cost)",
  "childPanels.doubleCost": "100% (2× cost)",
  "childPanels.duration": "Duration (days, 1-365)",
  "childPanels.30Days": "30 days",
  "childPanels.90Days": "90 days",
  "childPanels.year365": "1 year (365d)",
  "childPanels.monthlyFeeFor": "Monthly fee ({plan})",
  "childPanels.days": "days",
  "childPanels.yourBalance": "Your balance",
  "childPanels.insufficientBalance": "Insufficient balance — top up your wallet first.",
  "childPanels.provisioning": "Provisioning…",
  "childPanels.purchaseProvision": "Purchase & provision",
  "childPanels.tagline.reseller": "Solo resellers · 1 sub-panel · 20% default markup",
  "childPanels.tagline.agency": "Small agencies · up to 5 admins · priority support",
  "childPanels.tagline.enterprise": "High-volume · white-glove onboarding · dedicated IP",
  "childPanels.editDialog": "Edit child panel",
  "childPanels.editTitle": "Edit {id}",
  "childPanels.markupLabel": "Markup:",
  "childPanels.saving": "Saving…",
  "childPanels.saveChanges": "Save changes",
  "analytics.referralCopied": "Referral link copied!",
  "analytics.couldNotCopy": "Couldn't copy",
  "analytics.clipboardBlocked": "Your browser blocked clipboard access.",
  "analytics.eyebrow": "Analytics",
  "analytics.title": "Performance",
  "analytics.subtitle": "Real-time metrics from your transaction history.",
  "analytics.orders30d": "Orders (30d)",
  "analytics.revenue30d": "Revenue (30d)",
  "analytics.live": "live",
  "analytics.conversion": "Conversion",
  "analytics.activeOrders": "Active orders",
  "analytics.revenueOrders": "Revenue & orders",
  "analytics.last30Days": "Last 30 days",
  "analytics.byPlatform": "By platform",
  "analytics.marketplaceShare": "Marketplace share",
  "analytics.noCompletedOrders": "No completed orders yet",
  "analytics.hourlyOrders": "Hourly orders · today",
  "analytics.peak": "Peak: {count} orders/hour",
  "analytics.referrals": "Referrals",
  "analytics.earnedLifetime": "earned · 5% lifetime",
  "analytics.shareReferral": "Share referral link",
  "analytics.revenue": "Revenue",
  "analytics.orders": "Orders",
  "analytics.aiInsights": "AI Insights",
  "analytics.autoAnalysis": "Automatic analysis of your activity",
  "analytics.regenerate": "Regenerate insights",
  "analytics.availableAfter": "Available after 5 orders",
  "analytics.generating": "Generating…",
  "analytics.refresh": "Refresh",
  "analytics.noInsights": "No insights available yet. Click refresh to generate.",
  "analytics.unlockInsights": "Place at least 6 orders to unlock AI-powered spending insights and growth recommendations.",
  "analytics.fresh": "Fresh",
  "analytics.generatedCached": "Generated {date} · cached 1h",
  "analytics.hourTooltip": "{hour}:00 — {count} orders",
  "orders.title": "All orders",
  "orders.all": "All",
  "orders.processing": "Processing",
  "orders.completed": "Completed",
  "orders.repeat": "Repeat",
  "orders.export": "Export CSV",
  "orders.allOrders": "All orders",
  "orders.shown": "shown",
  "orders.clickRow": "click any row for full details.",
  "orders.searchPlaceholder": "Search by ID, platform, service…",
  "orders.search": "Search orders",
  "orders.filter.all": "All",
  "orders.filter.processing": "Processing",
  "orders.filter.in_progress": "In progress",
  "orders.filter.completed": "Completed",
  "orders.filter.partial": "Partial",
  "orders.filter.pending": "Pending",
  "orders.order": "Order",
  "orders.service": "Service",
  "orders.qty": "Qty",
  "orders.cost": "Cost",
  "orders.price": "Price",
  "orders.status": "Status",
  "orders.progress": "Progress",
  "orders.fulfilledBy": "Fulfilled by",
  "orders.actions": "Actions",
  "orders.requestRefill": "Request refill",
  "orders.noMatch": "No orders match your filters.",
  "orders.refillRequest": "Refill request",
  "orders.processRefill": "Please process a refill for order",
  "orders.link": "Link",
  "orders.details": "Order details",
  "orders.priority": "priority",
  "orders.dripFeed": "Drip-feed",
  "orders.timeline": "Timeline",
  "orders.cancelledRefund": "Order was cancelled — refund issued",
  "orders.dripConfig": "Drip-feed configuration",
  "orders.totalQuantity": "Total quantity",
  "orders.chunks": "Chunks",
  "orders.perChunk": "Per chunk",
  "orders.delay": "Delay",
  "orders.startDate": "Start date",
  "orders.serviceTarget": "Service & target",
  "orders.orderId": "Order ID",
  "orders.platform": "Platform",
  "orders.open": "Open",
  "orders.quantityPricing": "Quantity & pricing",
  "orders.quantity": "Quantity",
  "orders.unitPrice": "Unit price",
  "orders.unitCost": "Unit cost",
  "orders.totalPrice": "Total price",
  "orders.dates": "Dates",
  "orders.created": "Created",
  "orders.updated": "Updated",
  "orders.completedAt": "Completed",
  "orders.cancelOrder": "Cancel order",
  "orders.left": "left",
  "orders.orderCancelled": "Order cancelled",
  "orders.completedNoCancel": "Order completed — no cancellation possible",
  "orders.cancelExpired": "Cancel window expired (60s after placement)",
  "tickets.title": "Tickets",
  "tickets.new": "New ticket",
  "tickets.subject": "Subject",
  "tickets.message": "Message",
  "tickets.send": "Type your message…",
  "tickets.eyebrow": "Support",
  "tickets.count": "tickets",
  "tickets.open": "open",
  "tickets.conversation": "Conversation",
  "tickets.noMatch": "No tickets match",
  "tickets.empty": "No tickets yet. Create one to get help from our support team.",
  "tickets.searchPlaceholder": "Search tickets…",
  "tickets.clearSearch": "Clear search",
  "tickets.noMessages": "No messages",
  "tickets.backToList": "Back to ticket list",
  "tickets.waitingReply": "Waiting for support reply",
  "tickets.respondShortly": "Support will respond shortly",
  "tickets.uploadFailed": "Upload failed",
  "tickets.tryAgain": "Please try again.",
  "tickets.tryAgainSupport": "Please try again or contact support.",
  "tickets.uploading": "Uploading…",
  "tickets.messagePlaceholder": "Type your message…",
  "tickets.enterHint": "Press Enter to send",
  "tickets.shiftEnterHint": "Shift+Enter for newline",
  "tickets.cannedReplies": "Canned replies",
  "tickets.noCannedReplies": "No canned replies yet.",
  "tickets.createDialog": "Create ticket",
  "tickets.createTitle": "Create new ticket",
  "tickets.subjectPlaceholder": "Brief description of your issue",
  "tickets.priority": "Priority",
  "tickets.priorityLow": "Low",
  "tickets.priorityMedium": "Medium",
  "tickets.priorityHigh": "High",
  "tickets.messageCreatePlaceholder": "Describe your issue in detail…",
  "tickets.creating": "Creating…",
  "tickets.create": "Create ticket",
  "tickets.priority.low": "Low",
  "tickets.priority.medium": "Medium",
  "tickets.priority.high": "High",
  "tickets.status.open": "Open",
  "tickets.status.waiting": "Waiting",
  "tickets.status.resolved": "Resolved",
  "subscriptions.eyebrow": "Subscriptions",
  "subscriptions.title": "SMM Subscriptions",
  "subscriptions.subtitle": "Auto-deliver likes/followers to every new post.",
  "subscriptions.create": "Create subscription",
  "subscriptions.active": "Active",
  "subscriptions.postsDelivered": "Posts delivered",
  "subscriptions.totalSubscriptions": "Total subscriptions",
  "subscriptions.totalSpent": "Total spent",
  "subscriptions.emptyTitle": "No subscriptions yet",
  "subscriptions.emptyDescription": "Create one to auto-deliver to every new post. Pick a service, target @username, and per-post quantity range — we'll handle the rest.",
  "subscriptions.target": "Target",
  "subscriptions.perPostQty": "Per-post qty",
  "subscriptions.expiry": "Expiry",
  "subscriptions.postsCovered": "Posts covered",
  "subscriptions.lastCheck": "Last check",
  "subscriptions.pendingFirstCheck": "Pending first check",
  "subscriptions.lastPost": "Last post",
  "subscriptions.pause": "Pause",
  "subscriptions.resume": "Resume",
  "subscriptions.cancel": "Cancel",
  "subscriptions.allPostsDelivered": "All posts delivered",
  "subscriptions.expiredBeforeCompletion": "Expired before completion",
  "subscriptions.cancelled": "Cancelled",
  "subscriptions.status.active": "Active",
  "subscriptions.status.paused": "Paused",
  "subscriptions.status.completed": "Completed",
  "subscriptions.status.expired": "Expired",
  "subscriptions.status.cancelled": "Cancelled",
  "subscriptions.createDialog": "Create subscription",
  "subscriptions.newTitle": "New SMM subscription",
  "subscriptions.newSubtitle": "Auto-deliver to every new post for {days} days (or until {posts} posts covered).",
  "subscriptions.service": "Service",
  "subscriptions.loadingServices": "Loading services…",
  "subscriptions.selectService": "Select a service…",
  "subscriptions.min": "Min",
  "subscriptions.max": "Max",
  "subscriptions.per1000": "per 1000 units",
  "subscriptions.username": "Username",
  "subscriptions.profileLink": "Profile link (optional)",
  "subscriptions.minQtyPost": "Min qty / post",
  "subscriptions.maxQtyPost": "Max qty / post",
  "subscriptions.postsRange": "Posts (1-365)",
  "subscriptions.delayMin": "Delay (min)",
  "subscriptions.expiryDays": "Expiry (days)",
  "subscriptions.perPostCost": "Per-post cost (max)",
  "subscriptions.posts": "posts",
  "subscriptions.yourBalance": "Your balance",
  "subscriptions.insufficientBalance": "Insufficient balance. Top up your wallet to cover the estimated cost.",
  "subscriptions.creating": "Creating…",
  "notifications.title": "Notifications",
  "notifications.markAllRead": "Mark all read",
  "notifications.live": "Live · connected",
  "notifications.eyebrow": "Real-time feed",
  "notifications.subtitle": "Live, WebSocket-delivered from the database. No refresh required.",
  "notifications.liveConnected": "Live · connected",
  "notifications.connecting": "Connecting…",
  "notifications.empty": "No notifications of this type yet.",
  "notifications.justNow": "just now",
  "notifications.minutesAgo": "{count}m ago",
  "notifications.hoursAgo": "{count}h ago",
  "notifications.daysAgo": "{count}d ago",
  "notifications.filter.all": "All",
  "notifications.filter.order": "Order",
  "notifications.filter.sale": "Sale",
  "notifications.filter.marketplace": "Marketplace",
  "notifications.filter.ticket": "Ticket",
  "notifications.filter.recharge": "Recharge",
  "notifications.filter.withdrawal": "Withdrawal",
  "notifications.filter.referral": "Referral",
  "notifications.filter.system": "System",
  "profile.title": "Profile settings",
  "profile.currency": "Preferred currency",
  "profile.language": "Preferred language",
  "profile.save": "Save changes",
  "profile.personalize": "Personalize your workspace",
  "profile.subtitle": "Manage your profile, security, notifications, and sessions.",
  "profile.tabProfile": "Profile",
  "profile.tabSecurity": "Security",
  "profile.tabAchievements": "Achievements",
  "profile.tabReferrals": "Referrals",
  "profile.tabNotifications": "Notifications",
  "profile.tabSessions": "Sessions",
  "profile.personalInfo": "Personal information",
  "profile.fullName": "Full name",
  "profile.country": "Country",
  "profile.currencyDescription": "All prices will be displayed in this currency with real-time conversion.",
  "profile.preview": "Preview:",
  "profile.previewText": "A $2.40 USD service costs",
  "profile.inCurrency": "in",
  "profile.saving": "Saving…",
  "profile.dangerZone": "Danger Zone",
  "profile.dangerDescription": "Permanently delete your account and anonymize your personal data. This action is irreversible. Orders and transactions are retained for financial audit.",
  "profile.deleteAccount": "Delete account",
  "profile.accountDeleted": "Account deleted",
  "profile.accountDeletedDescription": "Your personal data has been anonymized. Redirecting…",
  "profile.deleteWarning": "This will permanently delete your account. Your orders and transactions are retained for financial audit but your personal data will be anonymized. This action CANNOT be undone.",
  "profile.confirmPassword": "Confirm your password",
  "profile.reenterPassword": "Re-enter your password",
  "profile.hidePassword": "Hide password",
  "profile.showPassword": "Show password",
  "profile.acknowledgeDelete": "I understand this action is irreversible and that my personal data will be anonymized.",
  "profile.deleting": "Deleting…",
  "profile.deleteMyAccount": "Delete my account",
  "profile.passwordChanged": "Password changed",
  "profile.passwordUpdated": "Your password has been updated.",
  "profile.failed": "Failed",
  "profile.2faSetupFailed": "2FA setup failed",
  "profile.2faEnabled": "2FA enabled",
  "profile.2faActive": "Two-factor authentication is now active.",
  "profile.verificationFailed": "Verification failed",
  "profile.2faDisabled": "2FA disabled",
  "profile.changePassword": "Change password",
  "profile.currentPassword": "Current password",
  "profile.newPassword": "New password (min 8 characters)",
  "profile.updatePassword": "Update password",
  "profile.twoFactor": "Two-factor authentication (2FA)",
  "profile.enabled": "Enabled",
  "profile.twoFactorDescription": "Protect your account with an authenticator app (Google Authenticator, Authy, etc.).",
  "profile.setup2fa": "Set up 2FA",
  "profile.enterCodeManually": "Or enter this code manually:",
  "profile.backupCodes": "Backup codes — save these now!",
  "profile.enter6Code": "Enter the 6-digit code from your authenticator app",
  "profile.verifyEnable": "Verify and enable",
  "profile.enter6Disable": "Enter a 6-digit code to disable 2FA",
  "profile.disable2fa": "Disable 2FA",
  "profile.preferencesSaved": "Preferences saved",
  "profile.prefOrders": "Order updates",
  "profile.prefOrdersDesc": "Start, progress, completion",
  "profile.prefSales": "Sales & revenue",
  "profile.prefSalesDesc": "New sales, payouts",
  "profile.prefTickets": "Support tickets",
  "profile.prefTicketsDesc": "Replies, status changes",
  "profile.prefRecharges": "Wallet top-ups",
  "profile.prefRechargesDesc": "Payment confirmations",
  "profile.prefWithdrawals": "Withdrawals",
  "profile.prefWithdrawalsDesc": "Approval status changes",
  "profile.prefMarketplace": "Marketplace",
  "profile.prefMarketplaceDesc": "New offers, sales",
  "profile.prefReferrals": "Referrals",
  "profile.prefReferralsDesc": "New referrals, earnings",
  "profile.prefSystem": "System & security",
  "profile.prefSystemDesc": "Maintenance, alerts",
  "profile.prefEmailOrders": "Email: Orders",
  "profile.prefEmailOrdersDesc": "Receive order emails",
  "profile.prefEmailTickets": "Email: Tickets",
  "profile.prefEmailTicketsDesc": "Receive ticket emails",
  "profile.prefEmailMarketing": "Email: Marketing",
  "profile.prefEmailMarketingDesc": "Promotions, newsletters",
  "profile.notificationPreferences": "Notification preferences",
  "profile.notificationDescription": "Choose which notifications you receive in-app and via email.",
  "profile.savePreferences": "Save preferences",
  "profile.sessionsRevoked": "All sessions revoked",
  "profile.activeSessions": "Active sessions",
  "profile.revokeAll": "Revoke all",
  "profile.sessionsDescription": "Recent login activity on your account.",
  "profile.current": "CURRENT",
  "profile.noSessions": "No recent sessions found.",
  "profile.referralCopied": "Referral link copied!",
  "profile.couldNotCopy": "Couldn't copy",
  "profile.clipboardBlocked": "Your browser blocked clipboard access.",
  "profile.referEarn": "Refer & earn",
  "profile.earnCommission": "Earn",
  "profile.lifetimeCommission": "lifetime commission on every order from users you refer. Scale your network to unlock higher tiers.",
  "profile.copyReferralLink": "Copy referral link",
  "profile.totalReferrals": "Total referrals",
  "profile.active": "Active",
  "profile.totalEarned": "Total earned",
  "profile.commission": "Commission",
  "profile.yourTier": "Your tier",
  "profile.rank": "Rank",
  "profile.inMore": "in {count} more",
  "profile.unlockTier": "{current} / {target} successful referrals to unlock {tier}",
  "profile.tierUnlocked": "tier unlocked.",
  "profile.maximumCommission": "You're earning the maximum {rate}% commission on every referral.",
  "profile.tier": "Tier",
  "profile.referrals": "Referrals",
  "profile.status": "Status",
  "profile.currentTier": "Current",
  "profile.unlocked": "Unlocked",
  "profile.locked": "Locked",
  "profile.recentPayouts": "Recent payouts",
  "profile.referralCommission": "Referral commission",
  "profile.noPayouts": "No payouts yet. Share your link to start earning.",
  "profile.topReferrers": "Top referrers",
  "profile.emptyLeaderboard": "Leaderboard is empty — be the first to refer someone!",
  "profile.referredUsers": "Referred users",
  "profile.pendingSignup": "Pending signup",
  "profile.noReferrals": "No referrals yet. Share your link above!",
  "profile.loyaltyLoading": "Loyalty data is loading. Place an order to start earning points.",
  "profile.loyaltyProgram": "NOVSMM Loyalty Program",
  "profile.pointsToNext": "in {count} pts",
  "profile.maximumRewards": "You're earning the maximum rewards.",
  "profile.achievements": "Achievements",
  "profile.totalSpent": "Total spent",
  "profile.completedOrders": "Completed orders",
  "profile.achievementDescription": "Unlock milestones to earn bonus loyalty points. Each tier-up unlocks bigger rewards.",
  "profile.pointsOnUnlock": "pts on unlock",
  "profile.pointsHistory": "Points history",
  "profile.pointsDescription": "Last 20 loyalty point entries.",
  "profile.linkedOrder": "linked to order",
  "profile.noPoints": "No points yet. Place your first order to start earning.",
  "profile.reasonOrderCompleted": "Order completed",
  "profile.reasonReferral": "Referral bonus",
  "profile.reasonDailyLogin": "Daily login",
  "profile.reasonAchievement": "Achievement unlocked",
  "auth.signIn": "Sign in",
  "auth.signUp": "Sign up",
  "auth.signOut": "Sign out",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.forgotPassword": "Forgot password?",
  "auth.backHome": "Back to home",
  "auth.welcomeBack": "Welcome back",
  "auth.workspace": "Sign in to your NOVSMM workspace",
  "auth.orEmail": "or continue with email",
  "auth.emailOrUsername": "Email or username",
  "auth.rememberMe": "Remember me",
  "auth.signingIn": "Signing in…",
  "auth.verifyAndSignIn": "Verify & sign in",
  "auth.noAccount": "Don't have an account?",
  "auth.createOne": "Create one",
  "auth.twoFactorRequired": "Two-factor authentication required",
  "auth.twoFactorInstructions": "Enter the 6-digit code from your authenticator app.",
  "auth.twoFactorCode": "2FA code",
  "auth.layeredSecurity": "Layered security controls",
  "auth.encryption": "256-bit encryption",
  "auth.liveMonitoring": "Live monitoring",
  "auth.forgotPasswordTitle": "Reset your password",
  "auth.forgotPasswordDescription": "Enter your account email and we'll send you a secure link to reset your password.",
  "auth.resetLinkSent": "Reset link sent",
  "auth.resetLinkNotice": "If that email exists, a reset link has been sent.",
  "auth.checkInbox": "Check your inbox",
  "auth.sendingLink": "Sending link…",
  "auth.sendResetLink": "Send reset link",
  "auth.backToLogin": "Back to login",
  "auth.close": "Close",
  "auth.loginTimedOut": "Login timed out. Please check your connection and try again.",
  "auth.invalidTwoFactor": "Invalid 2FA code. Please try again.",
  "auth.invalidCredentials": "Invalid email or password. Please try again.",
  "auth.loginFailed": "Login failed. Please check your connection and try again.",
  "auth.requestFailed": "Request failed",
  "auth.tryAgain": "Please try again in a moment.",
  "auth.redirecting": "Redirecting…",
  "auth.continueWith": "Continue with {provider}",
  "auth.createWorkspace": "Create your workspace",
  "auth.createWorkspaceSubtitle": "Start automating in minutes. No credit card required.",
  "auth.orSignUpEmail": "or sign up with email",
  "auth.fullName": "Full name",
  "auth.username": "Username",
  "auth.usernameHint": "3+ chars, letters/numbers/_",
  "auth.validEmail": "Enter a valid email address",
  "auth.createStrongPassword": "Create a strong password",
  "auth.confirmPassword": "Confirm password",
  "auth.reenterPassword": "Re-enter password",
  "auth.passwordMismatch": "Passwords don't match",
  "auth.country": "Country",
  "auth.currency": "Currency",
  "auth.language": "Language",
  "auth.creatingAccount": "Creating account…",
  "auth.createAccount": "Create account",
  "auth.agreeTerms": "By creating an account you agree to our",
  "auth.terms": "Terms",
  "auth.and": "and",
  "auth.privacyPolicy": "Privacy Policy",
  "auth.alreadyAccount": "Already have an account?",
  "auth.freeTrial": "Free 14-day trial",
  "auth.noCreditCard": "No credit card",
  "auth.cancelAnytime": "Cancel anytime",
  "auth.passwordWeak": "Weak",
  "auth.passwordFair": "Fair",
  "auth.passwordGood": "Good",
  "auth.passwordStrong": "Strong",
  "auth.passwordTipLength": "Use at least 8 characters",
  "auth.passwordTipCase": "Mix uppercase and lowercase",
  "auth.passwordTipNumber": "Add a number",
  "auth.passwordTipSymbol": "Add a symbol",
  "auth.accountCreated": "Account created! Please sign in with your credentials.",
  "auth.registrationFailed": "Registration failed. Please try again.",
  "onboarding.step": "Step {current} of {total}",
  "onboarding.back": "Back",
  "onboarding.previous": "Previous",
  "onboarding.enterDashboard": "Enter dashboard",
  "onboarding.continue": "Continue",
  "onboarding.skip": "Skip onboarding →",
  "onboarding.welcome.title": "Welcome to NOVSMM",
  "onboarding.welcome.subtitle": "Tell us how you'll use the platform so we can tailor your workspace.",
  "onboarding.role.reseller": "Reseller",
  "onboarding.role.resellerDesc": "Buy wholesale, resell at your price.",
  "onboarding.role.agency": "Agency",
  "onboarding.role.agencyDesc": "Manage multiple creators & brands.",
  "onboarding.role.creator": "Creator",
  "onboarding.role.creatorDesc": "Grow your own audience.",
  "onboarding.role.enterprise": "Enterprise",
  "onboarding.role.enterpriseDesc": "Dedicated infrastructure and controls.",
  "onboarding.profile.title": "Set up your profile",
  "onboarding.profile.subtitle": "Add a few details so collaborators can recognize you.",
  "onboarding.profile.displayName": "Display name",
  "onboarding.profile.yourName": "Your name",
  "onboarding.profile.verifiedEmail": "Verified email",
  "onboarding.currency.title": "Choose your currency",
  "onboarding.currency.subtitle": "This sets your default wallet, pricing, and payouts. Changeable anytime.",
  "onboarding.currency.usd": "US Dollar",
  "onboarding.currency.eur": "Euro",
  "onboarding.currency.mxn": "Mexican Peso",
  "onboarding.currency.brl": "Brazilian Real",
  "onboarding.currency.gbp": "British Pound",
  "onboarding.currency.inr": "Indian Rupee",
  "onboarding.language.title": "Pick your language",
  "onboarding.language.subtitle": "We'll localize your dashboard, receipts, and notifications.",
  "onboarding.notifications.title": "Notification preferences",
  "onboarding.notifications.subtitle": "Choose what lands in your real-time feed. Adjust anytime in Settings.",
  "onboarding.notifications.orders": "Order updates",
  "onboarding.notifications.ordersDesc": "Start, progress, completion",
  "onboarding.notifications.sales": "Sales & revenue",
  "onboarding.notifications.salesDesc": "New sales, payouts",
  "onboarding.notifications.tickets": "Support tickets",
  "onboarding.notifications.ticketsDesc": "Replies, status changes",
  "onboarding.notifications.system": "System & security",
  "onboarding.notifications.systemDesc": "Maintenance, alerts",
  "onboarding.tour.title": "Take the tour",
  "onboarding.tour.subtitle": "Here's what you'll find inside. You can replay this tour anytime from Settings.",
  "onboarding.tour.dashboard": "Dashboard",
  "onboarding.tour.dashboardDesc": "Your live ops cockpit.",
  "onboarding.tour.marketplace": "Marketplace",
  "onboarding.tour.marketplaceDesc": "Buy, sell, set your margins.",
  "onboarding.tour.notifications": "Notifications",
  "onboarding.tour.notificationsDesc": "Real-time, WebSocket-powered.",
  "onboarding.tour.security": "Security",
  "onboarding.tour.securityDesc": "2FA, sessions, audit logs.",
  "dashboard.nav.dashboard": "Dashboard",
  "dashboard.nav.analytics": "Analytics",
  "dashboard.nav.services": "Services",
  "dashboard.nav.orders": "Orders",
  "dashboard.nav.subscriptions": "Subscriptions",
  "dashboard.nav.childPanels": "Child Panels",
  "dashboard.nav.marketplace": "Marketplace",
  "dashboard.nav.wallet": "Wallet",
  "dashboard.nav.clients": "Clients",
  "dashboard.nav.tickets": "Tickets",
  "dashboard.nav.notifications": "Notifications",
  "dashboard.nav.profile": "Profile",
  "dashboard.nav.settings": "Settings",
  "dashboard.workspace": "Workspace",
  "dashboard.admin": "Admin",
  "dashboard.adminPanel": "Admin Panel",
  "dashboard.availableBalance": "Available balance",
  "dashboard.live": "live",
  "dashboard.returnToAdmin": "Return to admin",
  "dashboard.exit": "Exit",
  "dashboard.impersonating": "You are impersonating",
  "dashboard.asAdminAudited": "as admin. All actions are audited.",
  "dashboard.failedReturn": "Failed to return to admin",
  "dashboard.contactSupport": "Please try again or contact support.",
  "dashboard.goHome": "Go to NOVSMM home",
  "dashboard.backHome": "Back to NOVSMM home — your session stays active",
  "dashboard.closeMenu": "Close menu",
  "dashboard.openMenu": "Open menu",
  "dashboard.openCommandPalette": "Open command palette",
  "dashboard.operational": "Operational",
  "dashboard.degraded": "Degraded",
  "dashboard.account": "Account",
  "dashboard.user": "User",
  "dashboard.viewProfile": "View profile",
  "dashboard.overview": "Workspace overview",
  "dashboard.welcomeName": "Welcome back, {name} 👋",
  "dashboard.there": "there",
  "dashboard.todaySummary": "Here's what's happening across your workspace today.",
  "dashboard.inProgress": "in progress",
  "dashboard.completedAll": "Completed (all)",
  "dashboard.total": "total",
  "dashboard.7d": "last 7 days",
  "dashboard.30d": "last 30 days",
  "dashboard.90d": "last 90 days",
  "dashboard.wallet": "NOVSMM Wallet",
  "dashboard.quickStats": "Quick stats",
  "dashboard.lifetimeEarnings": "Lifetime earnings",
  "dashboard.openTickets": "Open tickets",
  "dashboard.recentOrders": "Recent orders",
  "dashboard.liveActivity": "Live activity",
  "dashboard.viewAll": "View all",
  "dashboard.noOrders": "No orders yet. Browse the marketplace to place your first order.",
  "dashboard.favoriteServices": "Favorite services",
  "dashboard.browse": "Browse",
  "dashboard.noFavorites": "No favorites yet. Star a service to pin it here.",
  "dashboard.recentTickets": "Recent tickets",
  "dashboard.noTickets": "No tickets yet.",
  "dashboard.referEarn": "Refer & earn",
  "dashboard.referralProgram": "NOVSMM Referral Program",
  "dashboard.commission": "commission",
  "dashboard.earned": "earned",
  "dashboard.referralsTo": "referrals to",
  "dashboard.toGo": "to go",
  "dashboard.maxTier": "Maximum tier reached — you're earning top commission.",
  "dashboard.copyReferral": "Copy referral link",
  "dashboard.referralCopied": "Referral link copied!",
  "dashboard.couldNotCopy": "Couldn't copy",
  "dashboard.clipboardBlocked": "Your browser blocked clipboard access.",
  "dashboard.viewReferralDashboard": "View full referral dashboard",
  "dashboard.loyaltyRewards": "Loyalty rewards",
  "dashboard.loyaltyLoading": "Loyalty data is loading. Place an order to start earning points.",
  "dashboard.loyaltyProgram": "NOVSMM Loyalty Program",
  "dashboard.pointsTo": "pts to",
  "dashboard.maxRewards": "Maximum tier reached — you're earning top rewards.",
  "dashboard.recentAchievements": "Recent achievements",
  "dashboard.placeOrderAchievement": "Place an order to unlock your first achievement.",
  "dashboard.viewAchievements": "View all achievements",
  "dashboard.search": "Search orders, services…",
  "dashboard.searchShort": "Search…",
  "dashboard.allSystemsOperational": "All systems operational",
  "dashboard.ordersToday": "Orders today",
  "dashboard.activeServices": "Active services",
  "dashboard.conversion": "Conversion",
  "dashboard.revenueLastDays": "Revenue · last 32 days",
  "dashboard.liveOrders": "Live orders",
  "dashboard.streaming": "streaming",
  "dashboard.justNow": "just now",
  "common.loading": "Loading…",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.delete": "Delete",
  "common.search": "Search",
  "common.actions": "Actions",
  "common.status": "Status",
  "common.close": "Close",
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
  // Landing — Services
  "landing.services.eyebrow": "Servicios",
  "landing.services.titleLine1": "Cada plataforma. Cada métrica.",
  "landing.services.titleLine2": "Una sola superficie de control.",
  "landing.services.description": "De crecimiento de seguidores a tiempo de visualización, NOVSMM orquesta más de 6.300 servicios en las plataformas donde tu audiencia realmente vive — impulsado por HuntSMM.",
  "landing.services.moreLabel": "+ más",
  "landing.services.totalServices": "servicios activos en total",
  "landing.services.svcUnit": "srv",
  // Landing — Marketplace
  "landing.marketplace.eyebrow": "Marketplace",
  "landing.marketplace.titleLine1": "Compra al por mayor. Revende a tu precio.",
  "landing.marketplace.titleLine2": "Quédate con el margen.",
  "landing.marketplace.description": "Un marketplace abierto donde los revendedores compiten en precio, publican sus propias ofertas y ven el beneficio liquidarse en tiempo real — sin tocar la infraestructura.",
  "landing.marketplace.flow.label": "El flujo",
  "landing.marketplace.flow.title": "Del suministro al beneficio liquidado en un ciclo continuo",
  "landing.marketplace.flow.supply.title": "Suministro de proveedores",
  "landing.marketplace.flow.supply.desc": "Proveedores aprobados publican servicios a precios mayoristas.",
  "landing.marketplace.flow.supply.chip": "mayorista",
  "landing.marketplace.flow.markup.title": "Margen de revendedor",
  "landing.marketplace.flow.markup.desc": "Define márgenes por servicio, por nivel de cliente, por moneda.",
  "landing.marketplace.flow.markup.chip": "tu margen",
  "landing.marketplace.flow.checkout.title": "Checkout del comprador",
  "landing.marketplace.flow.checkout.desc": "Los clientes compran a tu precio de venta en 5 pasarelas.",
  "landing.marketplace.flow.checkout.chip": "venta",
  "landing.marketplace.flow.settlement.title": "Liquidación instantánea",
  "landing.marketplace.flow.settlement.desc": "El beneficio se acredita en tu wallet en el momento en que empieza el pedido.",
  "landing.marketplace.flow.settlement.chip": "beneficio",
  "landing.marketplace.flow.loopback": "El beneficio se recicla en saldo — financia el siguiente pedido al instante.",
  "landing.marketplace.offers.label": "Tablón de ofertas en vivo",
  "landing.marketplace.offers.title": "Compite en precio. Gana el pedido.",
  "landing.marketplace.offers.statusLive": "en vivo",
  "landing.marketplace.offers.statusSample": "muestra",
  "landing.marketplace.offers.sampleNotice": "Mostrando ofertas de muestra — publica las tuyas desde el panel para llenar el tablón en vivo.",
  "landing.marketplace.offers.cost": "costo",
  "landing.marketplace.offers.retail": "venta",
  "landing.marketplace.offers.sold": "vendidos",
  "landing.marketplace.offers.walletLabel": "Saldo de wallet",
  "landing.marketplace.offers.withdraw": "Retirar",
  // Landing — Payments
  "landing.payments.eyebrow": "Pagos",
  "landing.payments.titleLine1": "Un saldo. Cada moneda.",
  "landing.payments.titleLine2": "Liquidado en minutos.",
  "landing.payments.description": "NOVSMM enruta cada transacción a través de PayPal, Mercado Pago, NowPayments (cripto) o liquidación manual — con conversión FX a tipos de mercado medio y más de 100 criptomonedas aceptadas.",
  "landing.payments.metaCurrencies": "Mon.",
  "landing.payments.metaSettlement": "Liq.",
  "landing.payments.metaSecurity": "Seg.",
  "landing.payments.statGateways": "Pasarelas de pago",
  "landing.payments.statCurrencies": "Monedas",
  "landing.payments.statFailure": "Tasa de fallo",
  "landing.payments.statSettlement": "Liquidación media",
  "landing.payments.coinFieldLabel": "Reacciona al scroll y al cursor · acelerado por GPU",
  "landing.payments.provider.paypal.note": "Protección al comprador y wallets guardadas. Confianza global.",
  "landing.payments.provider.paypal.coverage": "200+ países",
  "landing.payments.provider.mercadopago.note": "Plataforma de pagos líder en Latinoamérica. Carriles locales.",
  "landing.payments.provider.mercadopago.coverage": "Región LATAM",
  "landing.payments.provider.nowpayments.note": "Acepta más de 100 criptomonedas. Conversión automática a fiat. Cero contracargos.",
  "landing.payments.provider.nowpayments.coverage": "Global",
  "landing.payments.provider.manual.note": "Contacta a nuestro equipo por WhatsApp para créditos manuales. Sin comisiones.",
  "landing.payments.provider.manual.coverage": "Global",
  "landing.payments.settlement.instant": "Instantáneo",
  "landing.payments.settlement.onchain": "~5 min (on-chain)",
  "landing.payments.settlement.hours": "1-24h",
  "landing.payments.security.pciL1": "PCI DSS L1 (vía proveedor)",
  "landing.payments.security.decentralized": "Descentralizado",
  "landing.payments.security.verified": "Verificado",
  // Landing — Stats
  "landing.stats.eyebrow": "Estadísticas",
  "landing.stats.titleLine1": "Números que se mueven",
  "landing.stats.titleLine2": "a la velocidad de la atención.",
  "landing.stats.description": "Cada contador de abajo está conectado a la misma telemetría que alimenta los paneles de operadores — actualizada continuamente, nunca cacheada para vanidad.",
  "landing.stats.orders.label": "Pedidos completados",
  "landing.stats.orders.sub": "histórico, en {count} servicios",
  "landing.stats.users.label": "Usuarios activos",
  "landing.stats.users.sub": "revendedores y agencias, 30d",
  "landing.stats.revenue.label": "Ingresos enrutados",
  "landing.stats.revenue.sub": "a través del marketplace",
  "landing.stats.enterprise.label": "Clientes enterprise",
  "landing.stats.enterprise.sub": "con infra dedicada",
  "landing.stats.chart.label": "Ventas diarias · últimos 14 días",
  "landing.stats.chart.dod": "DoD",
  "landing.stats.status.label": "Estado del sistema",
  "landing.stats.status.state": "operativo",
  "landing.stats.status.uptimeLabel": "uptime, últimos 90d",
  "landing.stats.status.60daysAgo": "hace 60 días",
  "landing.stats.status.today": "hoy",
  "landing.stats.status.avgStart": "Inicio medio",
  "landing.stats.status.throughput": "Throughput",
  "landing.stats.status.perMin": "/min",
  // Landing — Testimonials
  "landing.testimonials.eyebrow": "Testimonios",
  "landing.testimonials.titleLine1": "Operadores que cambiaron.",
  "landing.testimonials.titleLine2": "Resultados que se quedaron.",
  "landing.testimonials.description": "Experiencias representativas de usuarios de la plataforma. Los resultados pueden variar.",
  "landing.testimonials.verifiedBy": "Verificado por operadores de NOVSMM",
  "landing.testimonials.proof.avgRating": "Valoración media",
  "landing.testimonials.proof.nps": "Net promoter score",
  "landing.testimonials.proof.switchedFrom": "Cambiaron desde",
  "landing.testimonials.proof.countries": "Países atendidos",
  // Landing — Security
  "landing.security.eyebrow": "Seguridad",
  "landing.security.titleLine1": "Seguridad que puedes ver —",
  "landing.security.titleLine2": "no solo una lista.",
  "landing.security.description": "Cada capa de abajo está instrumentada, monitorizada y visible en vivo para los operadores. Esta es la postura que exigen los equipos enterprise.",
  "landing.security.statusActive": "activo",
  "landing.security.layer.ddos.title": "Protección DDoS",
  "landing.security.layer.ddos.desc": "Mitigación L3/L4/L7 siempre activa en el edge. Capacidad de 2.4 Tbps.",
  "landing.security.layer.ddos.metric": "0 ataques brechas",
  "landing.security.layer.tls.title": "TLS 1.3 en todo",
  "landing.security.layer.tls.desc": "Cifrado de extremo a extremo en tránsito. HSTS preload, OCSP stapling.",
  "landing.security.layer.tls.metric": "Calificación A+ · SSL Labs",
  "landing.security.layer.aes.title": "AES-256 en reposo",
  "landing.security.layer.aes.desc": "Todas las wallets, claves y PII cifradas con DEK por inquilino.",
  "landing.security.layer.aes.metric": "Módulos FIPS 140-2",
  "landing.security.layer.backups.title": "Backups continuos",
  "landing.security.layer.backups.desc": "PITR cada 60s, réplicas entre regiones, retención de 30 días.",
  "landing.security.layer.backups.metric": "RPO 60s · RTO 5m",
  "landing.security.layer.ha.title": "Alta disponibilidad",
  "landing.security.layer.ha.desc": "Activo-activo en 3 regiones. Failover automático en menos de 30s.",
  "landing.security.layer.ha.metric": "99.99% uptime SLA",
  "landing.security.layer.api.title": "Protección de API",
  "landing.security.layer.api.desc": "Límites por clave, detección de anomalías, webhooks firmados.",
  "landing.security.layer.api.metric": "<0.01% peticiones malas",
  "landing.security.layer.audit.title": "Logs de auditoría",
  "landing.security.layer.audit.desc": "Logs inmutables y exportables para cada acción privilegiada.",
  "landing.security.layer.audit.metric": "Retención de 12 meses",
  "landing.security.layer.auth.title": "Auth segura",
  "landing.security.layer.auth.desc": "SSO, 2FA, passkeys, claves de hardware. Provisioning SCIM.",
  "landing.security.layer.auth.metric": "Passkey + WebAuthn",
  "landing.security.shield.edge": "Edge",
  "landing.security.shield.app": "App",
  "landing.security.shield.data": "Datos",
  "landing.security.shield.keys": "Claves",
  "landing.security.metric.threats": "Amenazas bloqueadas",
  "landing.security.metric.mttr": "MTTR",
  "landing.security.metric.regions": "Regiones",
  // Landing — API Docs
  "landing.apiDocs.eyebrow": "API para desarrolladores",
  "landing.apiDocs.titleLine1": "Construye con la",
  "landing.apiDocs.titleLine2": "API de NOVSMM.",
  "landing.apiDocs.description": "Un contrato REST compatible con PerfectPanel / JAP — drop-in compatible con tus bots, paneles y herramientas de automatización existentes. Auth bearer, claves con permisos, webhooks firmados.",
  "landing.apiDocs.compatNote": "Compatible con el tooling de paneles SMM existente — sin instalar SDK.",
  "landing.apiDocs.whatYouGet": "Lo que obtienes",
  "landing.apiDocs.everythingYouNeed": "Todo lo que una integración de revendedor necesita",
  "landing.apiDocs.feature.endpoints.title": "7 endpoints REST",
  "landing.apiDocs.feature.endpoints.desc": "Services, orders, status, cancel, refill, refill_status, balance — cobertura total.",
  "landing.apiDocs.feature.batching.title": "Batch multi-pedido",
  "landing.apiDocs.feature.batching.desc": "Envía hasta 100 pedidos en una sola petición. Fallo atómico, éxito parcial.",
  "landing.apiDocs.feature.dripFeed.title": "Programación drip-feed",
  "landing.apiDocs.feature.dripFeed.desc": "Divide la entrega en fragmentos con ejecuciones e intervalos configurables.",
  "landing.apiDocs.feature.refill.title": "Peticiones de refill",
  "landing.apiDocs.feature.refill.desc": "Dispara la re-entrega en pedidos completados cuando las cuentas bajan dentro de 30 días.",
  "landing.apiDocs.feature.webhooks.title": "Webhooks firmados",
  "landing.apiDocs.feature.webhooks.desc": "Eventos firmados con HMAC para cambios de estado de pedido — replay-safe e idempotentes.",
  "landing.apiDocs.feature.keys.title": "Claves API con permisos",
  "landing.apiDocs.feature.keys.desc": "Permisos por clave: read, order, wallet, marketplace. Rotación sin downtime.",
  "landing.apiDocs.viewDocs": "Ver docs completos de la API",
  "landing.apiDocs.versionNote": "v1.0.0 · 60 req/min por clave",
  // Landing — Affiliates
  "landing.affiliates.eyebrow": "Afiliados",
  "landing.affiliates.titleLine1": "Gana un 10% de comisión",
  "landing.affiliates.titleLine2": "en cada referencia.",
  "landing.affiliates.description": "Atribución de por vida, pagos en tiempo real, sin límites. El programa de afiliados de NOVSMM es el sistema de referencias mejor pagado del ecosistema SMM.",
  "landing.affiliates.stats.affiliates": "afiliados ganando hoy",
  "landing.affiliates.stats.paidOut": "pagado a afiliados",
  "landing.affiliates.stats.commission": "comisión de por vida",
  "landing.affiliates.commission.label": "Estructura de comisión",
  "landing.affiliates.commission.title": "10% de por vida · pago mínimo $50",
  "landing.affiliates.commission.yourShare": "Tu parte",
  "landing.affiliates.commission.theirOrder": "Su pedido",
  "landing.affiliates.commission.customerOrder": "pedido del cliente",
  "landing.affiliates.commission.example": "Ejemplo: un pedido de $100 te acredita {amount} — al instante, cada vez, para siempre.",
  "landing.affiliates.payout.label": "Métodos de pago",
  "landing.affiliates.payout.wallet.label": "Saldo de wallet",
  "landing.affiliates.payout.wallet.note": "Instantáneo · sin comisiones",
  "landing.affiliates.payout.paypal.note": "mínimo $50",
  "landing.affiliates.payout.usdt.note": "mínimo $50",
  "landing.affiliates.howItWorks.label": "Cómo funciona",
  "landing.affiliates.howItWorks.title": "Tres pasos hacia ingresos para siempre",
  "landing.affiliates.step1.title": "Comparte tu enlace",
  "landing.affiliates.step1.desc": "Consigue un enlace de referencia único desde tu panel. Publica donde quieras — Twitter, Telegram, el footer de tu panel.",
  "landing.affiliates.step2.title": "Se registran y piden",
  "landing.affiliates.step2.desc": "Cualquiera que se registre con tu enlace queda etiquetado como tu referencia — para siempre. Sin ventanas de atribución.",
  "landing.affiliates.step3.title": "Ganas un 10% para siempre",
  "landing.affiliates.step3.desc": "Cada pedido que hagan te genera un 10% de comisión — acreditado en tu wallet en tiempo real, retirable cuando quieras.",
  "landing.affiliates.cta.become": "Hazte afiliado",
  "landing.affiliates.cta.openDashboard": "Abre tu panel de referencias",
  "landing.affiliates.cta.note": "Sin proceso de aprobación · Activación instantánea · Retira cuando quieras",
  // Landing — FAQ
  "landing.faq.eyebrow": "FAQ",
  "landing.faq.title": "Preguntas frecuentes",
  "landing.faq.description": "Respuestas a las preguntas más comunes sobre NOVSMM. ¿No encuentras lo que buscas? Nuestro equipo de soporte está a un clic.",
  "landing.faq.stillHaveQuestions": "¿Aún tienes preguntas?",
  "landing.faq.supportReplies": "Nuestro equipo de soporte responde en minutos, 24/7.",
  "landing.faq.chatWithUs": "Chatea con nosotros",
  // Landing — Sticky CTA
  "landing.stickyCta.title": "Empieza gratis hoy",
  "landing.stickyCta.subtitle": "Sin tarjeta de crédito",
  "landing.stickyCta.getStarted": "Empezar",
  "landing.stickyCta.viewPricing": "Ver precios",
  "landing.stickyCta.startFree": "Empezar gratis",
  // Landing — Social Proof
  "landing.socialProof.demo": "Ilustrativo",
  "landing.socialProof.action.signedUp": "se acaba de registrar",
  "landing.socialProof.action.placedOrder": "hizo un pedido",
  "landing.socialProof.action.toppedUp": "recargó saldo",
  "landing.socialProof.ariaLabel": "Actividad de la plataforma",
  "landing.socialProof.dismiss": "Cerrar",
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
  "marketplace.buySellHistory": "Comprar · Vender · Historial",
  "marketplace.subtitle": "Explora servicios, haz pedidos y repite compras anteriores.",
  "marketplace.massOrder": "Pedido masivo",
  "marketplace.sections": "Secciones del marketplace",
  "marketplace.searchPlaceholder": "Buscar servicios — Instagram, TikTok, seguidores, vistas…",
  "marketplace.clearSearch": "Limpiar búsqueda",
  "marketplace.sortServices": "Ordenar servicios",
  "marketplace.sort.popular": "Populares",
  "marketplace.sort.price-asc": "Precio: menor a mayor",
  "marketplace.sort.price-desc": "Precio: mayor a menor",
  "marketplace.sort.fastest": "Entrega más rápida",
  "marketplace.sort.name-asc": "Nombre: A-Z",
  "marketplace.viewMode": "Modo de vista",
  "marketplace.gridView": "Vista de cuadrícula",
  "marketplace.listView": "Vista de lista",
  "marketplace.favoritesOnly": "Mostrar solo servicios favoritos",
  "marketplace.favorites": "Favoritos",
  "marketplace.min": "Mín",
  "marketplace.max": "Máx",
  "marketplace.minimumPrice": "Precio mínimo",
  "marketplace.maximumPrice": "Precio máximo",
  "marketplace.apply": "Aplicar",
  "marketplace.price": "Precio",
  "marketplace.all": "Todos",
  "marketplace.showing": "Mostrando",
  "marketplace.of": "de",
  "marketplace.services": "servicios",
  "marketplace.noServices": "No se encontraron servicios",
  "marketplace.adjustFilters": "Prueba a ajustar la búsqueda o los filtros",
  "marketplace.clearFilters": "Limpiar filtros",
  "marketplace.service": "Servicio",
  "marketplace.pricePer1k": "Precio/1k",
  "marketplace.minMax": "Mín/Máx",
  "marketplace.delivery": "Entrega",
  "marketplace.action": "Acción",
  "marketplace.loadMore": "Cargar más",
  "marketplace.endCatalog": "Fin del catálogo",
  "marketplace.showMore": "Mostrar",
  "marketplace.moreIn": "más en",
  "marketplace.hidden": "ocultos",
  "marketplace.unavailable": "No disponible",
  "marketplace.pressEnterOrder": "Pulsa Enter para ver detalles y hacer un pedido.",
  "marketplace.new": "Nuevo",
  "marketplace.remove": "Quitar",
  "marketplace.fromFavorites": "de favoritos",
  "marketplace.add": "Añadir",
  "marketplace.toFavorites": "a favoritos",
  "marketplace.fromComparison": "de la comparación",
  "marketplace.toComparison": "a la comparación",
  "marketplace.details": "Detalles",
  "marketplace.order": "Pedir",
  "marketplace.now": "ahora",
  "marketplace.trending": "Servicios destacados",
  "marketplace.trendingSubtitle": "Los servicios más consolidados de NOVSMM, elegidos por antigüedad del catálogo.",
  "marketplace.comparisonTray": "Bandeja de comparación",
  "marketplace.compare": "Comparar",
  "marketplace.maxReached": "máximo alcanzado",
  "marketplace.pickAnother": "elige otro para añadir",
  "marketplace.clearComparison": "Limpiar comparación",
  "marketplace.clear": "Limpiar",
  "marketplace.compareNow": "Comparar ahora",
  "marketplace.pricePerThousand": "Precio por 1000",
  "marketplace.deliveryTime": "Tiempo de entrega",
  "marketplace.minMaxQty": "Cantidad mín/máx",
  "marketplace.quality": "Calidad",
  "marketplace.compareServices": "Comparar servicios",
  "marketplace.closeComparison": "Cerrar comparación",
  "marketplace.sideBySide": "Vista lado a lado de",
  "marketplace.clickRemove": "Pulsa ✕ para quitar.",
  "marketplace.attribute": "Atributo",
  "marketplace.compareTip": "Consejo: compara hasta",
  "marketplace.servicesForComparison": "servicios para verlos de un vistazo.",
  "marketplace.ratingThanks": "¡Gracias por valorar!",
  "marketplace.youRated": "Has valorado",
  "marketplace.stars": "estrellas",
  "marketplace.orderPlaced": "Pedido realizado",
  "marketplace.orderProcessing": "Tu pedido está procesándose",
  "marketplace.serviceDetails": "Detalles del servicio",
  "marketplace.speed": "Velocidad",
  "marketplace.minQuantity": "Cantidad mínima",
  "marketplace.maxQuantity": "Cantidad máxima",
  "marketplace.yourRating": "Tu valoración",
  "marketplace.reviews": "reseñas",
  "marketplace.noRatings": "Aún no hay valoraciones; sé el primero en opinar.",
  "marketplace.rateService": "Valora este servicio",
  "marketplace.rateStars": "Valora este servicio de 1 a 5 estrellas",
  "marketplace.clickSubmit": "Pulsa para enviar",
  "marketplace.hoverRate": "Pasa el cursor y pulsa para valorar",
  "marketplace.yourBalance": "Tu saldo",
  "marketplace.quantity": "Cantidad",
  "marketplace.linkOptional": "Enlace (opcional; para servicios que necesitan una URL objetivo)",
  "marketplace.linkPlaceholder": "https://instagram.com/tu-publicacion",
  "marketplace.dripFeed": "Entrega gradual",
  "marketplace.dripFeedDescription": "Divide el pedido en partes pequeñas entregadas con el tiempo para un crecimiento natural.",
  "marketplace.daysChunks": "Días (partes)",
  "marketplace.delayMinutes": "Retraso (minutos)",
  "marketplace.preview": "Vista previa",
  "marketplace.totalCost": "Costo total",
  "marketplace.placingOrder": "Realizando pedido…",
  "marketplace.insufficientBalance": "Saldo insuficiente; recarga tu billetera",
  "marketplace.placeDripOrder": "Hacer pedido gradual",
  "wallet.title": "Saldo y actividad",
  "wallet.topUp": "Recargar",
  "wallet.withdraw": "Retirar",
  "wallet.available": "Disponible",
  "wallet.held": "Retenido",
  "wallet.transactions": "Historial de transacciones",
  "wallet.eyebrow": "Billetera",
  "wallet.balanceActivity": "Saldo y actividad",
  "wallet.subtitle": "Saldo en tiempo real, recargas, retiros y exportación de estados.",
  "wallet.export": "Exportar",
  "wallet.live": "en vivo",
  "wallet.pendingCompletion": "Pedido pendiente de completar",
  "wallet.lifetimeEarnings": "Ganancias acumuladas",
  "wallet.allTimeRevenue": "Ingresos históricos",
  "wallet.cashFlow30": "Flujo de caja · 30 días",
  "wallet.liveFromTransactions": "En vivo desde transacciones",
  "wallet.revenue": "Ingresos",
  "wallet.transactionHistory": "Historial de transacciones",
  "wallet.encrypted": "Cifrado",
  "wallet.txn": "Transacción",
  "wallet.description": "Descripción",
  "wallet.type": "Tipo",
  "wallet.amount": "Importe",
  "wallet.status": "Estado",
  "wallet.time": "Hora",
  "wallet.noTransactions": "Aún no hay transacciones.",
  "wallet.topUpMethods": "Métodos de recarga",
  "wallet.railsAvailable": "métodos disponibles",
  "wallet.noPaymentMethods": "Aún no hay métodos de pago configurados.",
  "wallet.type.sale": "Venta",
  "wallet.type.topup": "Recarga",
  "wallet.type.withdrawal": "Retiro",
  "wallet.type.fee": "Comisión",
  "wallet.type.referral": "Referido",
  "wallet.type.held": "Retenido",
  "wallet.type.release": "Liberación",
  "wallet.redirectingNowPayments": "Redirigiendo a NowPayments…",
  "wallet.completeCryptoPayment": "Completa tu pago cripto en NowPayments. Tu saldo se actualizará tras la confirmación.",
  "wallet.contactWhatsApp": "Contáctanos por WhatsApp",
  "wallet.manualCredit": "Acreditaremos tu saldo manualmente tras confirmar el pago.",
  "wallet.redirecting": "Redirigiendo a",
  "wallet.completePayment": "Completa tu pago. Tu saldo se actualizará después.",
  "wallet.sandboxSuccess": "Recarga exitosa (sandbox)",
  "wallet.sandboxCredited": "Se acreditaron {amount} en tu billetera mediante {method}. Configura credenciales reales en Admin → Pagos para pagos en vivo.",
  "wallet.topUpProcessed": "Recarga procesada",
  "wallet.done": "Listo.",
  "wallet.topUpFailed": "Error en la recarga",
  "wallet.tryAgainSupport": "Inténtalo de nuevo o contacta a soporte.",
  "wallet.topUpDialog": "Recargar billetera",
  "wallet.topUpWallet": "Recargar billetera",
  "wallet.addFunds": "Agregar fondos",
  "wallet.amountUsd": "Importe (USD)",
  "wallet.paymentMethod": "Método de pago",
  "wallet.processingPayment": "Procesando pago…",
  "wallet.topUpAmount": "Recargar",
  "wallet.sandboxNotice": "Modo sandbox · sin cargo real · procesa en ~2 s",
  "wallet.withdrawalRequested": "Retiro solicitado",
  "wallet.withdrawalPending": "El retiro de {amount} mediante {method} está pendiente de aprobación administrativa.",
  "wallet.withdrawalFailed": "Error en el retiro",
  "wallet.withdrawDialog": "Retirar fondos",
  "wallet.withdrawFunds": "Retirar fondos",
  "wallet.withdrawFromWallet": "Retirar de la billetera",
  "wallet.availablePending": "Disponible: {balance} · Pendiente de aprobación administrativa",
  "wallet.insufficientBalance": "Saldo insuficiente",
  "wallet.method": "Método",
  "wallet.destination": "Destino (cuenta / dirección / correo)",
  "wallet.destinationPlaceholder": "p. ej., IBAN, dirección de wallet USDT, correo de PayPal",
  "wallet.processing": "Procesando…",
  "wallet.withdrawNotice": "Los retiros son revisados por administración · se aplica una comisión del 1%",
  "childPanels.eyebrow": "Revendedor",
  "childPanels.title": "Paneles hijos",
  "childPanels.subtitle": "Subpaneles de marca blanca para tu negocio de reventa.",
  "childPanels.purchase": "Comprar panel hijo",
  "childPanels.activePanels": "Paneles activos",
  "childPanels.monthlyFees": "Cuotas mensuales",
  "childPanels.markupEarned": "Margen ganado (est.)",
  "childPanels.emptyTitle": "Aún no tienes paneles hijos",
  "childPanels.emptyDescription": "Compra uno para iniciar tu negocio de reventa de marca blanca. Obtendrás un subdominio y una clave API aprovisionados automáticamente; tus clientes verán tu marca y nosotros gestionaremos el cumplimiento.",
  "childPanels.confirmCancel": "¿Cancelar {name}? Se liberará el subdominio.",
  "childPanels.status.active": "Activo",
  "childPanels.status.suspended": "Suspendido",
  "childPanels.status.expired": "Vencido",
  "childPanels.status.cancelled": "Cancelado",
  "childPanels.subdomain": "Subdominio",
  "childPanels.plan": "Plan",
  "childPanels.plan.reseller": "Revendedor",
  "childPanels.plan.agency": "Agencia",
  "childPanels.plan.enterprise": "Empresarial",
  "childPanels.markup": "Margen",
  "childPanels.monthlyFee": "Cuota mensual",
  "childPanels.paidUntil": "Pagado hasta",
  "childPanels.expired": "vencido",
  "childPanels.edit": "Editar",
  "childPanels.suspend": "Suspender",
  "childPanels.resume": "Reanudar",
  "childPanels.cancel": "Cancelar",
  "childPanels.cancelled": "Cancelado",
  "childPanels.provisioned": "Panel hijo {id} aprovisionado",
  "childPanels.saveApiKey": "Guarda esta clave API ahora; no volverá a mostrarse. Tu panel está activo en",
  "childPanels.copied": "Copiada",
  "childPanels.copy": "Copiar",
  "childPanels.dismiss": "Descartar",
  "childPanels.createDialog": "Crear panel hijo",
  "childPanels.newTitle": "Nuevo panel hijo",
  "childPanels.newSubtitle": "Subdominio y clave API aprovisionados automáticamente · cobro anticipado por {days} días.",
  "childPanels.panelName": "Nombre del panel",
  "childPanels.markupOver": "Margen sobre precios del panel principal:",
  "childPanels.atCost": "0% (a costo)",
  "childPanels.doubleCost": "100% (2× costo)",
  "childPanels.duration": "Duración (días, 1-365)",
  "childPanels.30Days": "30 días",
  "childPanels.90Days": "90 días",
  "childPanels.year365": "1 año (365 días)",
  "childPanels.monthlyFeeFor": "Cuota mensual ({plan})",
  "childPanels.days": "días",
  "childPanels.yourBalance": "Tu saldo",
  "childPanels.insufficientBalance": "Saldo insuficiente; recarga tu billetera primero.",
  "childPanels.provisioning": "Aprovisionando…",
  "childPanels.purchaseProvision": "Comprar y aprovisionar",
  "childPanels.tagline.reseller": "Revendedores individuales · 1 subpanel · margen predeterminado del 20%",
  "childPanels.tagline.agency": "Agencias pequeñas · hasta 5 administradores · soporte prioritario",
  "childPanels.tagline.enterprise": "Alto volumen · onboarding personalizado · IP dedicada",
  "childPanels.editDialog": "Editar panel hijo",
  "childPanels.editTitle": "Editar {id}",
  "childPanels.markupLabel": "Margen:",
  "childPanels.saving": "Guardando…",
  "childPanels.saveChanges": "Guardar cambios",
  "analytics.referralCopied": "¡Enlace de referido copiado!",
  "analytics.couldNotCopy": "No se pudo copiar",
  "analytics.clipboardBlocked": "Tu navegador bloqueó el acceso al portapapeles.",
  "analytics.eyebrow": "Analítica",
  "analytics.title": "Rendimiento",
  "analytics.subtitle": "Métricas en tiempo real de tu historial de transacciones.",
  "analytics.orders30d": "Pedidos (30 d)",
  "analytics.revenue30d": "Ingresos (30 d)",
  "analytics.live": "en vivo",
  "analytics.conversion": "Conversión",
  "analytics.activeOrders": "Pedidos activos",
  "analytics.revenueOrders": "Ingresos y pedidos",
  "analytics.last30Days": "Últimos 30 días",
  "analytics.byPlatform": "Por plataforma",
  "analytics.marketplaceShare": "Distribución del marketplace",
  "analytics.noCompletedOrders": "Aún no hay pedidos completados",
  "analytics.hourlyOrders": "Pedidos por hora · hoy",
  "analytics.peak": "Pico: {count} pedidos/hora",
  "analytics.referrals": "Referidos",
  "analytics.earnedLifetime": "ganado · 5% de por vida",
  "analytics.shareReferral": "Compartir enlace de referido",
  "analytics.revenue": "Ingresos",
  "analytics.orders": "Pedidos",
  "analytics.aiInsights": "Insights de IA",
  "analytics.autoAnalysis": "Análisis automático de tu actividad",
  "analytics.regenerate": "Regenerar insights",
  "analytics.availableAfter": "Disponible después de 5 pedidos",
  "analytics.generating": "Generando…",
  "analytics.refresh": "Actualizar",
  "analytics.noInsights": "Aún no hay insights. Pulsa actualizar para generarlos.",
  "analytics.unlockInsights": "Realiza al menos 6 pedidos para desbloquear insights de gasto y recomendaciones de crecimiento con IA.",
  "analytics.fresh": "Reciente",
  "analytics.generatedCached": "Generado {date} · en caché 1 h",
  "analytics.hourTooltip": "{hour}:00 — {count} pedidos",
  "orders.title": "Todos los pedidos",
  "orders.all": "Todos",
  "orders.processing": "Procesando",
  "orders.completed": "Completados",
  "orders.repeat": "Repetir",
  "orders.export": "Exportar CSV",
  "orders.allOrders": "Todos los pedidos",
  "orders.shown": "mostrados",
  "orders.clickRow": "pulsa una fila para ver los detalles.",
  "orders.searchPlaceholder": "Buscar por ID, plataforma o servicio…",
  "orders.search": "Buscar pedidos",
  "orders.filter.all": "Todos",
  "orders.filter.processing": "Procesando",
  "orders.filter.in_progress": "En progreso",
  "orders.filter.completed": "Completados",
  "orders.filter.partial": "Parciales",
  "orders.filter.pending": "Pendientes",
  "orders.order": "Pedido",
  "orders.service": "Servicio",
  "orders.qty": "Cant.",
  "orders.cost": "Costo",
  "orders.price": "Precio",
  "orders.status": "Estado",
  "orders.progress": "Progreso",
  "orders.fulfilledBy": "Gestionado por",
  "orders.actions": "Acciones",
  "orders.requestRefill": "Solicitar reposición",
  "orders.noMatch": "Ningún pedido coincide con tus filtros.",
  "orders.refillRequest": "Solicitud de reposición",
  "orders.processRefill": "Procesa una reposición para el pedido",
  "orders.link": "Enlace",
  "orders.details": "Detalles del pedido",
  "orders.priority": "prioridad",
  "orders.dripFeed": "Entrega gradual",
  "orders.timeline": "Cronología",
  "orders.cancelledRefund": "El pedido se canceló y se emitió el reembolso",
  "orders.dripConfig": "Configuración de entrega gradual",
  "orders.totalQuantity": "Cantidad total",
  "orders.chunks": "Partes",
  "orders.perChunk": "Por parte",
  "orders.delay": "Retraso",
  "orders.startDate": "Fecha de inicio",
  "orders.serviceTarget": "Servicio y objetivo",
  "orders.orderId": "ID del pedido",
  "orders.platform": "Plataforma",
  "orders.open": "Abrir",
  "orders.quantityPricing": "Cantidad y precios",
  "orders.quantity": "Cantidad",
  "orders.unitPrice": "Precio unitario",
  "orders.unitCost": "Costo unitario",
  "orders.totalPrice": "Precio total",
  "orders.dates": "Fechas",
  "orders.created": "Creado",
  "orders.updated": "Actualizado",
  "orders.completedAt": "Completado",
  "orders.cancelOrder": "Cancelar pedido",
  "orders.left": "restantes",
  "orders.orderCancelled": "Pedido cancelado",
  "orders.completedNoCancel": "Pedido completado; ya no se puede cancelar",
  "orders.cancelExpired": "La ventana de cancelación expiró (60 s después de crear el pedido)",
  "tickets.title": "Tickets",
  "tickets.new": "Nuevo ticket",
  "tickets.subject": "Asunto",
  "tickets.message": "Mensaje",
  "tickets.send": "Escribe tu mensaje…",
  "tickets.eyebrow": "Soporte",
  "tickets.count": "tickets",
  "tickets.open": "abiertos",
  "tickets.conversation": "Conversación",
  "tickets.noMatch": "No hay tickets que coincidan con",
  "tickets.empty": "Aún no tienes tickets. Crea uno para recibir ayuda de nuestro equipo de soporte.",
  "tickets.searchPlaceholder": "Buscar tickets…",
  "tickets.clearSearch": "Limpiar búsqueda",
  "tickets.noMessages": "Sin mensajes",
  "tickets.backToList": "Volver a la lista de tickets",
  "tickets.waitingReply": "Esperando respuesta de soporte",
  "tickets.respondShortly": "Soporte responderá pronto",
  "tickets.uploadFailed": "Error al subir",
  "tickets.tryAgain": "Inténtalo de nuevo.",
  "tickets.tryAgainSupport": "Inténtalo de nuevo o contacta a soporte.",
  "tickets.uploading": "Subiendo…",
  "tickets.messagePlaceholder": "Escribe tu mensaje…",
  "tickets.enterHint": "Pulsa Enter para enviar",
  "tickets.shiftEnterHint": "Shift+Enter para una nueva línea",
  "tickets.cannedReplies": "Respuestas guardadas",
  "tickets.noCannedReplies": "Aún no hay respuestas guardadas.",
  "tickets.createDialog": "Crear ticket",
  "tickets.createTitle": "Crear nuevo ticket",
  "tickets.subjectPlaceholder": "Descripción breve de tu problema",
  "tickets.priority": "Prioridad",
  "tickets.priorityLow": "Baja",
  "tickets.priorityMedium": "Media",
  "tickets.priorityHigh": "Alta",
  "tickets.messageCreatePlaceholder": "Describe tu problema en detalle…",
  "tickets.creating": "Creando…",
  "tickets.create": "Crear ticket",
  "tickets.priority.low": "Baja",
  "tickets.priority.medium": "Media",
  "tickets.priority.high": "Alta",
  "tickets.status.open": "Abierto",
  "tickets.status.waiting": "En espera",
  "tickets.status.resolved": "Resuelto",
  "subscriptions.eyebrow": "Suscripciones",
  "subscriptions.title": "Suscripciones SMM",
  "subscriptions.subtitle": "Entrega automática de likes/seguidores en cada publicación nueva.",
  "subscriptions.create": "Crear suscripción",
  "subscriptions.active": "Activas",
  "subscriptions.postsDelivered": "Publicaciones entregadas",
  "subscriptions.totalSubscriptions": "Suscripciones totales",
  "subscriptions.totalSpent": "Total gastado",
  "subscriptions.emptyTitle": "Aún no tienes suscripciones",
  "subscriptions.emptyDescription": "Crea una para entregar automáticamente en cada publicación nueva. Elige un servicio, el objetivo @usuario y un rango por publicación; nosotros nos encargamos.",
  "subscriptions.target": "Objetivo",
  "subscriptions.perPostQty": "Cantidad por publicación",
  "subscriptions.expiry": "Vencimiento",
  "subscriptions.postsCovered": "Publicaciones cubiertas",
  "subscriptions.lastCheck": "Última comprobación",
  "subscriptions.pendingFirstCheck": "Pendiente de la primera comprobación",
  "subscriptions.lastPost": "Última publicación",
  "subscriptions.pause": "Pausar",
  "subscriptions.resume": "Reanudar",
  "subscriptions.cancel": "Cancelar",
  "subscriptions.allPostsDelivered": "Todas las publicaciones entregadas",
  "subscriptions.expiredBeforeCompletion": "Venció antes de completarse",
  "subscriptions.cancelled": "Cancelada",
  "subscriptions.status.active": "Activa",
  "subscriptions.status.paused": "Pausada",
  "subscriptions.status.completed": "Completada",
  "subscriptions.status.expired": "Vencida",
  "subscriptions.status.cancelled": "Cancelada",
  "subscriptions.createDialog": "Crear suscripción",
  "subscriptions.newTitle": "Nueva suscripción SMM",
  "subscriptions.newSubtitle": "Entrega automática en cada publicación nueva durante {days} días (o hasta cubrir {posts} publicaciones).",
  "subscriptions.service": "Servicio",
  "subscriptions.loadingServices": "Cargando servicios…",
  "subscriptions.selectService": "Selecciona un servicio…",
  "subscriptions.min": "Mín",
  "subscriptions.max": "Máx",
  "subscriptions.per1000": "por cada 1000 unidades",
  "subscriptions.username": "Usuario",
  "subscriptions.profileLink": "Enlace del perfil (opcional)",
  "subscriptions.minQtyPost": "Cantidad mín. / publicación",
  "subscriptions.maxQtyPost": "Cantidad máx. / publicación",
  "subscriptions.postsRange": "Publicaciones (1-365)",
  "subscriptions.delayMin": "Retraso (min)",
  "subscriptions.expiryDays": "Vencimiento (días)",
  "subscriptions.perPostCost": "Costo por publicación (máx.)",
  "subscriptions.posts": "publicaciones",
  "subscriptions.yourBalance": "Tu saldo",
  "subscriptions.insufficientBalance": "Saldo insuficiente. Recarga tu billetera para cubrir el costo estimado.",
  "subscriptions.creating": "Creando…",
  "notifications.title": "Notificaciones",
  "notifications.markAllRead": "Marcar todo como leído",
  "notifications.live": "En vivo · conectado",
  "notifications.eyebrow": "Flujo en tiempo real",
  "notifications.subtitle": "En vivo, enviado por WebSocket desde la base de datos. No requiere actualizar.",
  "notifications.liveConnected": "En vivo · conectado",
  "notifications.connecting": "Conectando…",
  "notifications.empty": "Aún no hay notificaciones de este tipo.",
  "notifications.justNow": "justo ahora",
  "notifications.minutesAgo": "hace {count} min",
  "notifications.hoursAgo": "hace {count} h",
  "notifications.daysAgo": "hace {count} d",
  "notifications.filter.all": "Todas",
  "notifications.filter.order": "Pedido",
  "notifications.filter.sale": "Venta",
  "notifications.filter.marketplace": "Marketplace",
  "notifications.filter.ticket": "Ticket",
  "notifications.filter.recharge": "Recarga",
  "notifications.filter.withdrawal": "Retiro",
  "notifications.filter.referral": "Referido",
  "notifications.filter.system": "Sistema",
  "profile.title": "Configuración de perfil",
  "profile.currency": "Moneda preferida",
  "profile.language": "Idioma preferido",
  "profile.save": "Guardar cambios",
  "profile.personalize": "Personaliza tu espacio de trabajo",
  "profile.subtitle": "Gestiona tu perfil, seguridad, notificaciones y sesiones.",
  "profile.tabProfile": "Perfil",
  "profile.tabSecurity": "Seguridad",
  "profile.tabAchievements": "Logros",
  "profile.tabReferrals": "Referidos",
  "profile.tabNotifications": "Notificaciones",
  "profile.tabSessions": "Sesiones",
  "profile.personalInfo": "Información personal",
  "profile.fullName": "Nombre completo",
  "profile.country": "País",
  "profile.currencyDescription": "Todos los precios se mostrarán en esta moneda con conversión en tiempo real.",
  "profile.preview": "Vista previa:",
  "profile.previewText": "Un servicio de $2.40 USD cuesta",
  "profile.inCurrency": "en",
  "profile.saving": "Guardando…",
  "profile.dangerZone": "Zona peligrosa",
  "profile.dangerDescription": "Elimina permanentemente tu cuenta y anonimiza tus datos personales. Esta acción es irreversible. Los pedidos y transacciones se conservan para auditoría financiera.",
  "profile.deleteAccount": "Eliminar cuenta",
  "profile.accountDeleted": "Cuenta eliminada",
  "profile.accountDeletedDescription": "Tus datos personales fueron anonimizados. Redirigiendo…",
  "profile.deleteWarning": "Esto eliminará permanentemente tu cuenta. Tus pedidos y transacciones se conservan para auditoría financiera, pero tus datos personales serán anonimizados. Esta acción NO se puede deshacer.",
  "profile.confirmPassword": "Confirma tu contraseña",
  "profile.reenterPassword": "Vuelve a introducir tu contraseña",
  "profile.hidePassword": "Ocultar contraseña",
  "profile.showPassword": "Mostrar contraseña",
  "profile.acknowledgeDelete": "Entiendo que esta acción es irreversible y que mis datos personales serán anonimizados.",
  "profile.deleting": "Eliminando…",
  "profile.deleteMyAccount": "Eliminar mi cuenta",
  "profile.passwordChanged": "Contraseña cambiada",
  "profile.passwordUpdated": "Tu contraseña se actualizó.",
  "profile.failed": "Error",
  "profile.2faSetupFailed": "Error al configurar 2FA",
  "profile.2faEnabled": "2FA activado",
  "profile.2faActive": "La autenticación de dos factores ya está activa.",
  "profile.verificationFailed": "Error de verificación",
  "profile.2faDisabled": "2FA desactivado",
  "profile.changePassword": "Cambiar contraseña",
  "profile.currentPassword": "Contraseña actual",
  "profile.newPassword": "Nueva contraseña (mín. 8 caracteres)",
  "profile.updatePassword": "Actualizar contraseña",
  "profile.twoFactor": "Autenticación de dos factores (2FA)",
  "profile.enabled": "Activado",
  "profile.twoFactorDescription": "Protege tu cuenta con una app de autenticación (Google Authenticator, Authy, etc.).",
  "profile.setup2fa": "Configurar 2FA",
  "profile.enterCodeManually": "O introduce este código manualmente:",
  "profile.backupCodes": "Códigos de respaldo; ¡guárdalos ahora!",
  "profile.enter6Code": "Introduce el código de 6 dígitos de tu app de autenticación",
  "profile.verifyEnable": "Verificar y activar",
  "profile.enter6Disable": "Introduce un código de 6 dígitos para desactivar 2FA",
  "profile.disable2fa": "Desactivar 2FA",
  "profile.preferencesSaved": "Preferencias guardadas",
  "profile.prefOrders": "Actualizaciones de pedidos",
  "profile.prefOrdersDesc": "Inicio, progreso y finalización",
  "profile.prefSales": "Ventas e ingresos",
  "profile.prefSalesDesc": "Nuevas ventas y pagos",
  "profile.prefTickets": "Tickets de soporte",
  "profile.prefTicketsDesc": "Respuestas y cambios de estado",
  "profile.prefRecharges": "Recargas de billetera",
  "profile.prefRechargesDesc": "Confirmaciones de pago",
  "profile.prefWithdrawals": "Retiros",
  "profile.prefWithdrawalsDesc": "Cambios en el estado de aprobación",
  "profile.prefMarketplace": "Marketplace",
  "profile.prefMarketplaceDesc": "Nuevas ofertas y ventas",
  "profile.prefReferrals": "Referidos",
  "profile.prefReferralsDesc": "Nuevos referidos y ganancias",
  "profile.prefSystem": "Sistema y seguridad",
  "profile.prefSystemDesc": "Mantenimiento y alertas",
  "profile.prefEmailOrders": "Correo: pedidos",
  "profile.prefEmailOrdersDesc": "Recibir correos de pedidos",
  "profile.prefEmailTickets": "Correo: tickets",
  "profile.prefEmailTicketsDesc": "Recibir correos de tickets",
  "profile.prefEmailMarketing": "Correo: marketing",
  "profile.prefEmailMarketingDesc": "Promociones y boletines",
  "profile.notificationPreferences": "Preferencias de notificaciones",
  "profile.notificationDescription": "Elige qué notificaciones recibes en la app y por correo.",
  "profile.savePreferences": "Guardar preferencias",
  "profile.sessionsRevoked": "Todas las sesiones fueron revocadas",
  "profile.activeSessions": "Sesiones activas",
  "profile.revokeAll": "Revocar todas",
  "profile.sessionsDescription": "Actividad reciente de inicio de sesión en tu cuenta.",
  "profile.current": "ACTUAL",
  "profile.noSessions": "No se encontraron sesiones recientes.",
  "profile.referralCopied": "¡Enlace de referido copiado!",
  "profile.couldNotCopy": "No se pudo copiar",
  "profile.clipboardBlocked": "Tu navegador bloqueó el acceso al portapapeles.",
  "profile.referEarn": "Refiere y gana",
  "profile.earnCommission": "Gana",
  "profile.lifetimeCommission": "de comisión de por vida por cada pedido de usuarios que refieras. Haz crecer tu red para desbloquear niveles superiores.",
  "profile.copyReferralLink": "Copiar enlace de referido",
  "profile.totalReferrals": "Referidos totales",
  "profile.active": "Activos",
  "profile.totalEarned": "Total ganado",
  "profile.commission": "Comisión",
  "profile.yourTier": "Tu nivel",
  "profile.rank": "Puesto",
  "profile.inMore": "en {count} más",
  "profile.unlockTier": "{current} / {target} referidos exitosos para desbloquear {tier}",
  "profile.tierUnlocked": "nivel desbloqueado.",
  "profile.maximumCommission": "Ganas la comisión máxima del {rate}% por cada referido.",
  "profile.tier": "Nivel",
  "profile.referrals": "Referidos",
  "profile.status": "Estado",
  "profile.currentTier": "Actual",
  "profile.unlocked": "Desbloqueado",
  "profile.locked": "Bloqueado",
  "profile.recentPayouts": "Pagos recientes",
  "profile.referralCommission": "Comisión por referido",
  "profile.noPayouts": "Aún no hay pagos. Comparte tu enlace para empezar a ganar.",
  "profile.topReferrers": "Mejores referidores",
  "profile.emptyLeaderboard": "El ranking está vacío; ¡sé el primero en referir a alguien!",
  "profile.referredUsers": "Usuarios referidos",
  "profile.pendingSignup": "Registro pendiente",
  "profile.noReferrals": "Aún no hay referidos. ¡Comparte tu enlace de arriba!",
  "profile.loyaltyLoading": "Cargando datos de lealtad. Haz un pedido para comenzar a ganar puntos.",
  "profile.loyaltyProgram": "Programa de lealtad NOVSMM",
  "profile.pointsToNext": "en {count} puntos",
  "profile.maximumRewards": "Estás obteniendo las recompensas máximas.",
  "profile.achievements": "Logros",
  "profile.totalSpent": "Total gastado",
  "profile.completedOrders": "Pedidos completados",
  "profile.achievementDescription": "Desbloquea hitos para ganar puntos de lealtad extra. Cada subida de nivel desbloquea mejores recompensas.",
  "profile.pointsOnUnlock": "puntos al desbloquear",
  "profile.pointsHistory": "Historial de puntos",
  "profile.pointsDescription": "Últimas 20 entradas de puntos de lealtad.",
  "profile.linkedOrder": "vinculado al pedido",
  "profile.noPoints": "Aún no hay puntos. Haz tu primer pedido para comenzar a ganar.",
  "profile.reasonOrderCompleted": "Pedido completado",
  "profile.reasonReferral": "Bono por referido",
  "profile.reasonDailyLogin": "Inicio de sesión diario",
  "profile.reasonAchievement": "Logro desbloqueado",
  "auth.signIn": "Iniciar sesión",
  "auth.signUp": "Registrarse",
  "auth.signOut": "Cerrar sesión",
  "auth.email": "Correo",
  "auth.password": "Contraseña",
  "auth.forgotPassword": "¿Olvidaste tu contraseña?",
  "auth.backHome": "Volver al inicio",
  "auth.welcomeBack": "Bienvenido de nuevo",
  "auth.workspace": "Inicia sesión en tu espacio de trabajo de NOVSMM",
  "auth.orEmail": "o continúa con correo",
  "auth.emailOrUsername": "Correo o usuario",
  "auth.rememberMe": "Recordarme",
  "auth.signingIn": "Iniciando sesión…",
  "auth.verifyAndSignIn": "Verificar e iniciar sesión",
  "auth.noAccount": "¿No tienes una cuenta?",
  "auth.createOne": "Crea una",
  "auth.twoFactorRequired": "Se requiere autenticación de dos factores",
  "auth.twoFactorInstructions": "Ingresa el código de 6 dígitos de tu aplicación autenticadora.",
  "auth.twoFactorCode": "Código 2FA",
  "auth.layeredSecurity": "Controles de seguridad por capas",
  "auth.encryption": "Cifrado de 256 bits",
  "auth.liveMonitoring": "Monitoreo en vivo",
  "auth.forgotPasswordTitle": "Restablece tu contraseña",
  "auth.forgotPasswordDescription": "Ingresa el correo de tu cuenta y te enviaremos un enlace seguro para restablecer tu contraseña.",
  "auth.resetLinkSent": "Enlace de restablecimiento enviado",
  "auth.resetLinkNotice": "Si ese correo existe, se ha enviado un enlace de restablecimiento.",
  "auth.checkInbox": "Revisa tu bandeja de entrada",
  "auth.sendingLink": "Enviando enlace…",
  "auth.sendResetLink": "Enviar enlace de restablecimiento",
  "auth.backToLogin": "Volver al inicio de sesión",
  "auth.close": "Cerrar",
  "auth.loginTimedOut": "La sesión tardó demasiado. Revisa tu conexión e inténtalo de nuevo.",
  "auth.invalidTwoFactor": "Código 2FA no válido. Inténtalo de nuevo.",
  "auth.invalidCredentials": "Correo o contraseña no válidos. Inténtalo de nuevo.",
  "auth.loginFailed": "No se pudo iniciar sesión. Revisa tu conexión e inténtalo de nuevo.",
  "auth.requestFailed": "La solicitud falló",
  "auth.tryAgain": "Inténtalo de nuevo en un momento.",
  "auth.redirecting": "Redirigiendo…",
  "auth.continueWith": "Continuar con {provider}",
  "auth.createWorkspace": "Crea tu espacio de trabajo",
  "auth.createWorkspaceSubtitle": "Empieza a automatizar en minutos. Sin tarjeta de crédito.",
  "auth.orSignUpEmail": "o regístrate con correo",
  "auth.fullName": "Nombre completo",
  "auth.username": "Usuario",
  "auth.usernameHint": "3+ caracteres, letras/números/_",
  "auth.validEmail": "Ingresa un correo válido",
  "auth.createStrongPassword": "Crea una contraseña segura",
  "auth.confirmPassword": "Confirma la contraseña",
  "auth.reenterPassword": "Vuelve a ingresar la contraseña",
  "auth.passwordMismatch": "Las contraseñas no coinciden",
  "auth.country": "País",
  "auth.currency": "Moneda",
  "auth.language": "Idioma",
  "auth.creatingAccount": "Creando cuenta…",
  "auth.createAccount": "Crear cuenta",
  "auth.agreeTerms": "Al crear una cuenta aceptas nuestros",
  "auth.terms": "Términos",
  "auth.and": "y",
  "auth.privacyPolicy": "Política de privacidad",
  "auth.alreadyAccount": "¿Ya tienes una cuenta?",
  "auth.freeTrial": "Prueba gratuita de 14 días",
  "auth.noCreditCard": "Sin tarjeta de crédito",
  "auth.cancelAnytime": "Cancela cuando quieras",
  "auth.passwordWeak": "Débil",
  "auth.passwordFair": "Regular",
  "auth.passwordGood": "Buena",
  "auth.passwordStrong": "Fuerte",
  "auth.passwordTipLength": "Usa al menos 8 caracteres",
  "auth.passwordTipCase": "Combina mayúsculas y minúsculas",
  "auth.passwordTipNumber": "Agrega un número",
  "auth.passwordTipSymbol": "Agrega un símbolo",
  "auth.accountCreated": "¡Cuenta creada! Inicia sesión con tus credenciales.",
  "auth.registrationFailed": "No se pudo registrar la cuenta. Inténtalo de nuevo.",
  "onboarding.step": "Paso {current} de {total}",
  "onboarding.back": "Atrás",
  "onboarding.previous": "Anterior",
  "onboarding.enterDashboard": "Entrar al panel",
  "onboarding.continue": "Continuar",
  "onboarding.skip": "Omitir onboarding →",
  "onboarding.welcome.title": "Bienvenido a NOVSMM",
  "onboarding.welcome.subtitle": "Cuéntanos cómo usarás la plataforma para adaptar tu espacio de trabajo.",
  "onboarding.role.reseller": "Revendedor",
  "onboarding.role.resellerDesc": "Compra al por mayor y revende a tu precio.",
  "onboarding.role.agency": "Agencia",
  "onboarding.role.agencyDesc": "Administra varios creadores y marcas.",
  "onboarding.role.creator": "Creador",
  "onboarding.role.creatorDesc": "Haz crecer tu propia audiencia.",
  "onboarding.role.enterprise": "Empresa",
  "onboarding.role.enterpriseDesc": "Infraestructura y controles dedicados.",
  "onboarding.profile.title": "Configura tu perfil",
  "onboarding.profile.subtitle": "Agrega algunos datos para que tus colaboradores te reconozcan.",
  "onboarding.profile.displayName": "Nombre visible",
  "onboarding.profile.yourName": "Tu nombre",
  "onboarding.profile.verifiedEmail": "Correo verificado",
  "onboarding.currency.title": "Elige tu moneda",
  "onboarding.currency.subtitle": "Define tu saldo, precios y retiros predeterminados. Puedes cambiarlo cuando quieras.",
  "onboarding.currency.usd": "Dólar estadounidense",
  "onboarding.currency.eur": "Euro",
  "onboarding.currency.mxn": "Peso mexicano",
  "onboarding.currency.brl": "Real brasileño",
  "onboarding.currency.gbp": "Libra esterlina",
  "onboarding.currency.inr": "Rupia india",
  "onboarding.language.title": "Elige tu idioma",
  "onboarding.language.subtitle": "Traduciremos tu panel, recibos y notificaciones.",
  "onboarding.notifications.title": "Preferencias de notificaciones",
  "onboarding.notifications.subtitle": "Elige qué aparece en tu feed en tiempo real. Puedes ajustarlo en Configuración.",
  "onboarding.notifications.orders": "Actualizaciones de pedidos",
  "onboarding.notifications.ordersDesc": "Inicio, progreso y finalización",
  "onboarding.notifications.sales": "Ventas e ingresos",
  "onboarding.notifications.salesDesc": "Nuevas ventas y retiros",
  "onboarding.notifications.tickets": "Tickets de soporte",
  "onboarding.notifications.ticketsDesc": "Respuestas y cambios de estado",
  "onboarding.notifications.system": "Sistema y seguridad",
  "onboarding.notifications.systemDesc": "Mantenimiento y alertas",
  "onboarding.tour.title": "Conoce el panel",
  "onboarding.tour.subtitle": "Esto es lo que encontrarás dentro. Puedes repetir el recorrido desde Configuración.",
  "onboarding.tour.dashboard": "Panel",
  "onboarding.tour.dashboardDesc": "Tu centro de operaciones en vivo.",
  "onboarding.tour.marketplace": "Marketplace",
  "onboarding.tour.marketplaceDesc": "Compra, vende y define tus márgenes.",
  "onboarding.tour.notifications": "Notificaciones",
  "onboarding.tour.notificationsDesc": "En tiempo real, con WebSocket.",
  "onboarding.tour.security": "Seguridad",
  "onboarding.tour.securityDesc": "2FA, sesiones y registros de auditoría.",
  "dashboard.nav.dashboard": "Panel",
  "dashboard.nav.analytics": "Analítica",
  "dashboard.nav.services": "Servicios",
  "dashboard.nav.orders": "Pedidos",
  "dashboard.nav.subscriptions": "Suscripciones",
  "dashboard.nav.childPanels": "Paneles hijos",
  "dashboard.nav.marketplace": "Marketplace",
  "dashboard.nav.wallet": "Billetera",
  "dashboard.nav.clients": "Clientes",
  "dashboard.nav.tickets": "Tickets",
  "dashboard.nav.notifications": "Notificaciones",
  "dashboard.nav.profile": "Perfil",
  "dashboard.nav.settings": "Configuración",
  "dashboard.workspace": "Espacio de trabajo",
  "dashboard.admin": "Admin",
  "dashboard.adminPanel": "Panel de administración",
  "dashboard.availableBalance": "Saldo disponible",
  "dashboard.live": "en vivo",
  "dashboard.returnToAdmin": "Volver al panel admin",
  "dashboard.exit": "Salir",
  "dashboard.impersonating": "Estás suplantando a",
  "dashboard.asAdminAudited": "como admin. Todas las acciones se auditan.",
  "dashboard.failedReturn": "No se pudo volver al panel admin",
  "dashboard.contactSupport": "Inténtalo de nuevo o contacta con soporte.",
  "dashboard.goHome": "Ir al inicio de NOVSMM",
  "dashboard.backHome": "Volver al inicio de NOVSMM — tu sesión sigue activa",
  "dashboard.closeMenu": "Cerrar menú",
  "dashboard.openMenu": "Abrir menú",
  "dashboard.openCommandPalette": "Abrir paleta de comandos",
  "dashboard.operational": "Operativo",
  "dashboard.degraded": "Degradado",
  "dashboard.account": "Cuenta",
  "dashboard.user": "Usuario",
  "dashboard.viewProfile": "Ver perfil",
  "dashboard.overview": "Resumen del espacio de trabajo",
  "dashboard.welcomeName": "Bienvenido de nuevo, {name} 👋",
  "dashboard.there": "ahí",
  "dashboard.todaySummary": "Esto es lo que ocurre hoy en tu espacio de trabajo.",
  "dashboard.inProgress": "en progreso",
  "dashboard.completedAll": "Completados (todos)",
  "dashboard.total": "total",
  "dashboard.7d": "últimos 7 días",
  "dashboard.30d": "últimos 30 días",
  "dashboard.90d": "últimos 90 días",
  "dashboard.wallet": "Billetera NOVSMM",
  "dashboard.quickStats": "Estadísticas rápidas",
  "dashboard.lifetimeEarnings": "Ingresos históricos",
  "dashboard.openTickets": "Tickets abiertos",
  "dashboard.recentOrders": "Pedidos recientes",
  "dashboard.liveActivity": "Actividad en vivo",
  "dashboard.viewAll": "Ver todos",
  "dashboard.noOrders": "Aún no hay pedidos. Explora el marketplace para hacer tu primer pedido.",
  "dashboard.favoriteServices": "Servicios favoritos",
  "dashboard.browse": "Explorar",
  "dashboard.noFavorites": "Aún no tienes favoritos. Marca un servicio para fijarlo aquí.",
  "dashboard.recentTickets": "Tickets recientes",
  "dashboard.noTickets": "Aún no hay tickets.",
  "dashboard.referEarn": "Refiere y gana",
  "dashboard.referralProgram": "Programa de referidos NOVSMM",
  "dashboard.commission": "comisión",
  "dashboard.earned": "ganado",
  "dashboard.referralsTo": "referidos para",
  "dashboard.toGo": "restantes",
  "dashboard.maxTier": "Nivel máximo alcanzado: estás ganando la comisión más alta.",
  "dashboard.copyReferral": "Copiar enlace de referido",
  "dashboard.referralCopied": "¡Enlace de referido copiado!",
  "dashboard.couldNotCopy": "No se pudo copiar",
  "dashboard.clipboardBlocked": "Tu navegador bloqueó el acceso al portapapeles.",
  "dashboard.viewReferralDashboard": "Ver panel completo de referidos",
  "dashboard.loyaltyRewards": "Recompensas de lealtad",
  "dashboard.loyaltyLoading": "Cargando lealtad. Haz un pedido para empezar a ganar puntos.",
  "dashboard.loyaltyProgram": "Programa de lealtad NOVSMM",
  "dashboard.pointsTo": "puntos para",
  "dashboard.maxRewards": "Nivel máximo alcanzado: estás ganando las mejores recompensas.",
  "dashboard.recentAchievements": "Logros recientes",
  "dashboard.placeOrderAchievement": "Haz un pedido para desbloquear tu primer logro.",
  "dashboard.viewAchievements": "Ver todos los logros",
  "dashboard.search": "Buscar pedidos y servicios…",
  "dashboard.searchShort": "Buscar…",
  "dashboard.allSystemsOperational": "Todos los sistemas operativos",
  "dashboard.ordersToday": "Pedidos de hoy",
  "dashboard.activeServices": "Servicios activos",
  "dashboard.conversion": "Conversión",
  "dashboard.revenueLastDays": "Ingresos · últimos 32 días",
  "dashboard.liveOrders": "Pedidos en vivo",
  "dashboard.streaming": "transmitiendo",
  "dashboard.justNow": "ahora mismo",
  "common.loading": "Cargando…",
  "common.save": "Guardar",
  "common.cancel": "Cancelar",
  "common.delete": "Eliminar",
  "common.search": "Buscar",
  "common.actions": "Acciones",
  "common.status": "Estado",
  "common.close": "Cerrar",
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
  // Landing — Services
  "landing.services.eyebrow": "Serviços",
  "landing.services.titleLine1": "Cada plataforma. Cada métrica.",
  "landing.services.titleLine2": "Uma só superfície de controle.",
  "landing.services.description": "De crescimento de seguidores a tempo de visualização, NOVSMM orquestra mais de 6.300 serviços nas plataformas onde sua audiência realmente vive — com tecnologia HuntSMM.",
  "landing.services.moreLabel": "+ mais",
  "landing.services.totalServices": "serviços ativos no total",
  "landing.services.svcUnit": "srv",
  // Landing — Marketplace
  "landing.marketplace.eyebrow": "Marketplace",
  "landing.marketplace.titleLine1": "Compre no atacado. Revenda pelo seu preço.",
  "landing.marketplace.titleLine2": "Fique com a margem.",
  "landing.marketplace.description": "Um marketplace aberto onde revendedores competem em preço, publicam suas próprias ofertas e veem o lucro liquidar em tempo real — sem tocar na infraestrutura.",
  "landing.marketplace.flow.label": "O fluxo",
  "landing.marketplace.flow.title": "Do fornecimento ao lucro liquidado em um ciclo contínuo",
  "landing.marketplace.flow.supply.title": "Fornecimento de provedores",
  "landing.marketplace.flow.supply.desc": "Provedores aprovados publicam serviços com preços de atacado.",
  "landing.marketplace.flow.supply.chip": "atacado",
  "landing.marketplace.flow.markup.title": "Margem de revendedor",
  "landing.marketplace.flow.markup.desc": "Defina margens por serviço, por nível de cliente, por moeda.",
  "landing.marketplace.flow.markup.chip": "sua margem",
  "landing.marketplace.flow.checkout.title": "Checkout do comprador",
  "landing.marketplace.flow.checkout.desc": "Clientes compram pelo seu preço de varejo em 5 gateways.",
  "landing.marketplace.flow.checkout.chip": "varejo",
  "landing.marketplace.flow.settlement.title": "Liquidação instantânea",
  "landing.marketplace.flow.settlement.desc": "O lucro é creditado na sua wallet no momento em que o pedido começa.",
  "landing.marketplace.flow.settlement.chip": "lucro",
  "landing.marketplace.flow.loopback": "O lucro recicla em saldo — financie o próximo pedido instantaneamente.",
  "landing.marketplace.offers.label": "Painel de ofertas ao vivo",
  "landing.marketplace.offers.title": "Compita em preço. Vença o pedido.",
  "landing.marketplace.offers.statusLive": "ao vivo",
  "landing.marketplace.offers.statusSample": "amostra",
  "landing.marketplace.offers.sampleNotice": "Exibindo ofertas de amostra — publique as suas pelo painel para preencher o painel ao vivo.",
  "landing.marketplace.offers.cost": "custo",
  "landing.marketplace.offers.retail": "varejo",
  "landing.marketplace.offers.sold": "vendidos",
  "landing.marketplace.offers.walletLabel": "Saldo da wallet",
  "landing.marketplace.offers.withdraw": "Sacar",
  // Landing — Payments
  "landing.payments.eyebrow": "Pagamentos",
  "landing.payments.titleLine1": "Um saldo. Cada moeda.",
  "landing.payments.titleLine2": "Liquidado em minutos.",
  "landing.payments.description": "NOVSMM roteia cada transação via PayPal, Mercado Pago, NowPayments (cripto) ou liquidação manual — com conversão FX a taxas de mercado intermediárias e mais de 100 criptomoedas aceitas.",
  "landing.payments.metaCurrencies": "Mo.",
  "landing.payments.metaSettlement": "Liq.",
  "landing.payments.metaSecurity": "Seg.",
  "landing.payments.statGateways": "Gateways de pagamento",
  "landing.payments.statCurrencies": "Moedas",
  "landing.payments.statFailure": "Taxa de falha",
  "landing.payments.statSettlement": "Liquidação média",
  "landing.payments.coinFieldLabel": "Reativo ao scroll e ao cursor · acelerado por GPU",
  "landing.payments.provider.paypal.note": "Proteção ao comprador e wallets salvas. Confiança global.",
  "landing.payments.provider.paypal.coverage": "200+ países",
  "landing.payments.provider.mercadopago.note": "Plataforma de pagamentos líder na América Latina. Rails locais.",
  "landing.payments.provider.mercadopago.coverage": "Região LATAM",
  "landing.payments.provider.nowpayments.note": "Aceite mais de 100 criptomoedas. Conversão automática para fiat. Zero chargebacks.",
  "landing.payments.provider.nowpayments.coverage": "Global",
  "landing.payments.provider.manual.note": "Fale com nossa equipe via WhatsApp para créditos manuais. Sem taxas.",
  "landing.payments.provider.manual.coverage": "Global",
  "landing.payments.settlement.instant": "Instantâneo",
  "landing.payments.settlement.onchain": "~5 min (on-chain)",
  "landing.payments.settlement.hours": "1-24h",
  "landing.payments.security.pciL1": "PCI DSS L1 (via provedor)",
  "landing.payments.security.decentralized": "Descentralizado",
  "landing.payments.security.verified": "Verificado",
  // Landing — Stats
  "landing.stats.eyebrow": "Estatísticas",
  "landing.stats.titleLine1": "Números que se movem",
  "landing.stats.titleLine2": "na velocidade da atenção.",
  "landing.stats.description": "Cada contador abaixo está ligado à mesma telemetria que alimenta os painéis de operadores — atualizada continuamente, nunca cacheada para vaidade.",
  "landing.stats.orders.label": "Pedidos concluídos",
  "landing.stats.orders.sub": "histórico, em {count} serviços",
  "landing.stats.users.label": "Usuários ativos",
  "landing.stats.users.sub": "revendedores e agências, 30d",
  "landing.stats.revenue.label": "Receita roteada",
  "landing.stats.revenue.sub": "pelo marketplace",
  "landing.stats.enterprise.label": "Clientes enterprise",
  "landing.stats.enterprise.sub": "com infra dedicada",
  "landing.stats.chart.label": "Vendas diárias · últimos 14 dias",
  "landing.stats.chart.dod": "DoD",
  "landing.stats.status.label": "Status do sistema",
  "landing.stats.status.state": "operacional",
  "landing.stats.status.uptimeLabel": "uptime, últimos 90d",
  "landing.stats.status.60daysAgo": "há 60 dias",
  "landing.stats.status.today": "hoje",
  "landing.stats.status.avgStart": "Início médio",
  "landing.stats.status.throughput": "Throughput",
  "landing.stats.status.perMin": "/min",
  // Landing — Testimonials
  "landing.testimonials.eyebrow": "Depoimentos",
  "landing.testimonials.titleLine1": "Operadores que trocaram.",
  "landing.testimonials.titleLine2": "Resultados que ficaram.",
  "landing.testimonials.description": "Experiências representativas de usuários da plataforma. Resultados podem variar.",
  "landing.testimonials.verifiedBy": "Verificado por operadores do NOVSMM",
  "landing.testimonials.proof.avgRating": "Avaliação média",
  "landing.testimonials.proof.nps": "Net promoter score",
  "landing.testimonials.proof.switchedFrom": "Trocou de",
  "landing.testimonials.proof.countries": "Países atendidos",
  // Landing — Security
  "landing.security.eyebrow": "Segurança",
  "landing.security.titleLine1": "Segurança que você vê —",
  "landing.security.titleLine2": "não só uma checklist.",
  "landing.security.description": "Cada camada abaixo é instrumentada, monitorada e exibida ao vivo para operadores. Esta é a postura que times enterprise exigem.",
  "landing.security.statusActive": "ativo",
  "landing.security.layer.ddos.title": "Proteção DDoS",
  "landing.security.layer.ddos.desc": "Mitigação L3/L4/L7 sempre ativa no edge. Capacidade de 2.4 Tbps.",
  "landing.security.layer.ddos.metric": "0 ataques vazados",
  "landing.security.layer.tls.title": "TLS 1.3 em todo lugar",
  "landing.security.layer.tls.desc": "Criptografia ponta a ponta em trânsito. HSTS preload, OCSP stapling.",
  "landing.security.layer.tls.metric": "Nota A+ · SSL Labs",
  "landing.security.layer.aes.title": "AES-256 em repouso",
  "landing.security.layer.aes.desc": "Todas as wallets, chaves e PII criptografadas com DEK por inquilino.",
  "landing.security.layer.aes.metric": "Módulos FIPS 140-2",
  "landing.security.layer.backups.title": "Backups contínuos",
  "landing.security.layer.backups.desc": "PITR a cada 60s, réplicas entre regiões, retenção de 30 dias.",
  "landing.security.layer.backups.metric": "RPO 60s · RTO 5m",
  "landing.security.layer.ha.title": "Alta disponibilidade",
  "landing.security.layer.ha.desc": "Ativo-ativo em 3 regiões. Failover automático em menos de 30s.",
  "landing.security.layer.ha.metric": "99.99% uptime SLA",
  "landing.security.layer.api.title": "Proteção de API",
  "landing.security.layer.api.desc": "Limites por chave, detecção de anomalias, webhooks assinados.",
  "landing.security.layer.api.metric": "<0.01% requisições ruins",
  "landing.security.layer.audit.title": "Logs de auditoria",
  "landing.security.layer.audit.desc": "Logs imutáveis e exportáveis para cada ação privilegiada.",
  "landing.security.layer.audit.metric": "Retenção de 12 meses",
  "landing.security.layer.auth.title": "Auth segura",
  "landing.security.layer.auth.desc": "SSO, 2FA, passkeys, chaves de hardware. Provisioning SCIM.",
  "landing.security.layer.auth.metric": "Passkey + WebAuthn",
  "landing.security.shield.edge": "Edge",
  "landing.security.shield.app": "App",
  "landing.security.shield.data": "Dados",
  "landing.security.shield.keys": "Chaves",
  "landing.security.metric.threats": "Ameaças bloqueadas",
  "landing.security.metric.mttr": "MTTR",
  "landing.security.metric.regions": "Regiões",
  // Landing — API Docs
  "landing.apiDocs.eyebrow": "API para desenvolvedores",
  "landing.apiDocs.titleLine1": "Construa com a",
  "landing.apiDocs.titleLine2": "API da NOVSMM.",
  "landing.apiDocs.description": "Um contrato REST compatível com PerfectPanel / JAP — drop-in compatível com seus bots, painéis e ferramentas de automação existentes. Auth bearer, chaves com escopos, webhooks assinados.",
  "landing.apiDocs.compatNote": "Compatível com ferramentas de painel SMM existentes — sem instalar SDK.",
  "landing.apiDocs.whatYouGet": "O que você obtém",
  "landing.apiDocs.everythingYouNeed": "Tudo que uma integração de revendedor precisa",
  "landing.apiDocs.feature.endpoints.title": "7 endpoints REST",
  "landing.apiDocs.feature.endpoints.desc": "Services, orders, status, cancel, refill, refill_status, balance — cobertura total.",
  "landing.apiDocs.feature.batching.title": "Batch multi-pedido",
  "landing.apiDocs.feature.batching.desc": "Envie até 100 pedidos em uma única requisição. Falha atômica, sucesso parcial.",
  "landing.apiDocs.feature.dripFeed.title": "Agendamento drip-feed",
  "landing.apiDocs.feature.dripFeed.desc": "Divida a entrega em parcelas com execuções e intervalos configuráveis.",
  "landing.apiDocs.feature.refill.title": "Pedidos de refill",
  "landing.apiDocs.feature.refill.desc": "Dispare a re-entrega em pedidos concluídos quando as contas caírem em até 30 dias.",
  "landing.apiDocs.feature.webhooks.title": "Webhooks assinados",
  "landing.apiDocs.feature.webhooks.desc": "Eventos assinados com HMAC para mudanças de status — replay-safe e idempotentes.",
  "landing.apiDocs.feature.keys.title": "Chaves de API com escopos",
  "landing.apiDocs.feature.keys.desc": "Permissões por chave: read, order, wallet, marketplace. Rotação sem downtime.",
  "landing.apiDocs.viewDocs": "Ver docs completas da API",
  "landing.apiDocs.versionNote": "v1.0.0 · 60 req/min por chave",
  // Landing — Affiliates
  "landing.affiliates.eyebrow": "Afiliados",
  "landing.affiliates.titleLine1": "Ganhe 10% de comissão",
  "landing.affiliates.titleLine2": "em cada indicação.",
  "landing.affiliates.description": "Atribuição vitalícia, pagamentos em tempo real, sem limites. O programa de afiliados da NOVSMM é o sistema de indicações que mais paga no ecossistema SMM.",
  "landing.affiliates.stats.affiliates": "afiliados ganhando hoje",
  "landing.affiliates.stats.paidOut": "pago a afiliados",
  "landing.affiliates.stats.commission": "comissão vitalícia",
  "landing.affiliates.commission.label": "Estrutura de comissão",
  "landing.affiliates.commission.title": "10% vitalício · pagamento mínimo $50",
  "landing.affiliates.commission.yourShare": "Sua parte",
  "landing.affiliates.commission.theirOrder": "O pedido deles",
  "landing.affiliates.commission.customerOrder": "pedido do cliente",
  "landing.affiliates.commission.example": "Exemplo: um pedido de $100 credita {amount} pra você — instantaneamente, toda vez, para sempre.",
  "landing.affiliates.payout.label": "Métodos de pagamento",
  "landing.affiliates.payout.wallet.label": "Saldo da wallet",
  "landing.affiliates.payout.wallet.note": "Instantâneo · sem taxas",
  "landing.affiliates.payout.paypal.note": "mínimo $50",
  "landing.affiliates.payout.usdt.note": "mínimo $50",
  "landing.affiliates.howItWorks.label": "Como funciona",
  "landing.affiliates.howItWorks.title": "Três passos para renda para sempre",
  "landing.affiliates.step1.title": "Compartilhe seu link",
  "landing.affiliates.step1.desc": "Pegue um link de indicação único no seu painel. Publique onde quiser — Twitter, Telegram, o rodapé do seu painel.",
  "landing.affiliates.step2.title": "Eles se cadastram e pedem",
  "landing.affiliates.step2.desc": "Quem se cadastrar pelo seu link fica marcado como sua indicação — para a vida toda. Sem janelas de atribuição.",
  "landing.affiliates.step3.title": "Você ganha 10% para sempre",
  "landing.affiliates.step3.desc": "Cada pedido que fizerem rende 10% de comissão — creditado na sua wallet em tempo real, sacável quando quiser.",
  "landing.affiliates.cta.become": "Vire afiliado",
  "landing.affiliates.cta.openDashboard": "Abra seu painel de indicações",
  "landing.affiliates.cta.note": "Sem processo de aprovação · Ativação instantânea · Saque quando quiser",
  // Landing — FAQ
  "landing.faq.eyebrow": "FAQ",
  "landing.faq.title": "Perguntas frequentes",
  "landing.faq.description": "Respostas para as perguntas mais comuns sobre a NOVSMM. Não encontrou o que procura? Nosso time de suporte está a um clique.",
  "landing.faq.stillHaveQuestions": "Ainda tem dúvidas?",
  "landing.faq.supportReplies": "Nosso time de suporte responde em minutos, 24/7.",
  "landing.faq.chatWithUs": "Fale com a gente",
  // Landing — Sticky CTA
  "landing.stickyCta.title": "Comece grátis hoje",
  "landing.stickyCta.subtitle": "Sem cartão de crédito",
  "landing.stickyCta.getStarted": "Começar",
  "landing.stickyCta.viewPricing": "Ver preços",
  "landing.stickyCta.startFree": "Começar grátis",
  // Landing — Social Proof
  "landing.socialProof.demo": "Ilustrativo",
  "landing.socialProof.action.signedUp": "acabou de se cadastrar",
  "landing.socialProof.action.placedOrder": "fez um pedido",
  "landing.socialProof.action.toppedUp": "recarregou saldo",
  "landing.socialProof.ariaLabel": "Atividade da plataforma",
  "landing.socialProof.dismiss": "Dispensar",
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
  "auth.backHome": "Voltar ao início",
  "auth.welcomeBack": "Bem-vindo de volta",
  "auth.workspace": "Entre no seu espaço de trabalho NOVSMM",
  "auth.orEmail": "ou continue com e-mail",
  "auth.emailOrUsername": "E-mail ou usuário",
  "auth.rememberMe": "Lembrar de mim",
  "auth.signingIn": "Entrando…",
  "auth.verifyAndSignIn": "Verificar e entrar",
  "auth.noAccount": "Ainda não tem uma conta?",
  "auth.createOne": "Crie uma",
  "auth.twoFactorRequired": "Autenticação de dois fatores necessária",
  "auth.twoFactorInstructions": "Digite o código de 6 dígitos do seu aplicativo autenticador.",
  "auth.twoFactorCode": "Código 2FA",
  "auth.layeredSecurity": "Controles de segurança em camadas",
  "auth.encryption": "Criptografia de 256 bits",
  "auth.liveMonitoring": "Monitoramento ao vivo",
  "auth.forgotPasswordTitle": "Redefina sua senha",
  "auth.forgotPasswordDescription": "Digite o e-mail da sua conta e enviaremos um link seguro para redefinir sua senha.",
  "auth.resetLinkSent": "Link de redefinição enviado",
  "auth.resetLinkNotice": "Se esse e-mail existir, um link de redefinição foi enviado.",
  "auth.checkInbox": "Verifique sua caixa de entrada",
  "auth.sendingLink": "Enviando link…",
  "auth.sendResetLink": "Enviar link de redefinição",
  "auth.backToLogin": "Voltar ao login",
  "auth.close": "Fechar",
  "auth.loginTimedOut": "O login demorou demais. Verifique sua conexão e tente novamente.",
  "auth.invalidTwoFactor": "Código 2FA inválido. Tente novamente.",
  "auth.invalidCredentials": "E-mail ou senha inválidos. Tente novamente.",
  "auth.loginFailed": "Falha no login. Verifique sua conexão e tente novamente.",
  "auth.requestFailed": "Falha na solicitação",
  "auth.tryAgain": "Tente novamente em instantes.",
  "auth.redirecting": "Redirecionando…",
  "auth.continueWith": "Continuar com {provider}",
  "auth.createWorkspace": "Crie seu espaço de trabalho",
  "auth.createWorkspaceSubtitle": "Comece a automatizar em minutos. Sem cartão de crédito.",
  "auth.orSignUpEmail": "ou cadastre-se com e-mail",
  "auth.fullName": "Nome completo",
  "auth.username": "Nome de usuário",
  "auth.usernameHint": "3+ caracteres, letras/números/_",
  "auth.validEmail": "Digite um e-mail válido",
  "auth.createStrongPassword": "Crie uma senha forte",
  "auth.confirmPassword": "Confirme a senha",
  "auth.reenterPassword": "Digite a senha novamente",
  "auth.passwordMismatch": "As senhas não coincidem",
  "auth.country": "País",
  "auth.currency": "Moeda",
  "auth.language": "Idioma",
  "auth.creatingAccount": "Criando conta…",
  "auth.createAccount": "Criar conta",
  "auth.agreeTerms": "Ao criar uma conta, você concorda com nossos",
  "auth.terms": "Termos",
  "auth.and": "e",
  "auth.privacyPolicy": "Política de privacidade",
  "auth.alreadyAccount": "Já tem uma conta?",
  "auth.freeTrial": "Teste grátis de 14 dias",
  "auth.noCreditCard": "Sem cartão de crédito",
  "auth.cancelAnytime": "Cancele quando quiser",
  "auth.passwordWeak": "Fraca",
  "auth.passwordFair": "Regular",
  "auth.passwordGood": "Boa",
  "auth.passwordStrong": "Forte",
  "auth.passwordTipLength": "Use pelo menos 8 caracteres",
  "auth.passwordTipCase": "Misture maiúsculas e minúsculas",
  "auth.passwordTipNumber": "Adicione um número",
  "auth.passwordTipSymbol": "Adicione um símbolo",
  "auth.accountCreated": "Conta criada! Entre com suas credenciais.",
  "auth.registrationFailed": "Falha ao criar a conta. Tente novamente.",
  "onboarding.step": "Etapa {current} de {total}",
  "onboarding.back": "Voltar",
  "onboarding.previous": "Anterior",
  "onboarding.enterDashboard": "Entrar no painel",
  "onboarding.continue": "Continuar",
  "onboarding.skip": "Pular onboarding →",
  "onboarding.welcome.title": "Bem-vindo à NOVSMM",
  "onboarding.welcome.subtitle": "Conte como você usará a plataforma para personalizarmos seu espaço.",
  "onboarding.role.reseller": "Revendedor",
  "onboarding.role.resellerDesc": "Compre no atacado e revenda pelo seu preço.",
  "onboarding.role.agency": "Agência",
  "onboarding.role.agencyDesc": "Gerencie vários criadores e marcas.",
  "onboarding.role.creator": "Criador",
  "onboarding.role.creatorDesc": "Faça sua própria audiência crescer.",
  "onboarding.role.enterprise": "Empresa",
  "onboarding.role.enterpriseDesc": "Infraestrutura e controles dedicados.",
  "onboarding.profile.title": "Configure seu perfil",
  "onboarding.profile.subtitle": "Adicione alguns dados para que seus colaboradores reconheçam você.",
  "onboarding.profile.displayName": "Nome de exibição",
  "onboarding.profile.yourName": "Seu nome",
  "onboarding.profile.verifiedEmail": "E-mail verificado",
  "onboarding.currency.title": "Escolha sua moeda",
  "onboarding.currency.subtitle": "Define sua carteira, preços e saques padrão. Pode mudar quando quiser.",
  "onboarding.currency.usd": "Dólar americano",
  "onboarding.currency.eur": "Euro",
  "onboarding.currency.mxn": "Peso mexicano",
  "onboarding.currency.brl": "Real brasileiro",
  "onboarding.currency.gbp": "Libra esterlina",
  "onboarding.currency.inr": "Rupia indiana",
  "onboarding.language.title": "Escolha seu idioma",
  "onboarding.language.subtitle": "Vamos traduzir seu painel, recibos e notificações.",
  "onboarding.notifications.title": "Preferências de notificações",
  "onboarding.notifications.subtitle": "Escolha o que aparece no seu feed em tempo real. Ajuste em Configurações.",
  "onboarding.notifications.orders": "Atualizações de pedidos",
  "onboarding.notifications.ordersDesc": "Início, progresso e conclusão",
  "onboarding.notifications.sales": "Vendas e receita",
  "onboarding.notifications.salesDesc": "Novas vendas e pagamentos",
  "onboarding.notifications.tickets": "Tickets de suporte",
  "onboarding.notifications.ticketsDesc": "Respostas e mudanças de status",
  "onboarding.notifications.system": "Sistema e segurança",
  "onboarding.notifications.systemDesc": "Manutenção e alertas",
  "onboarding.tour.title": "Conheça o painel",
  "onboarding.tour.subtitle": "Veja o que você encontrará. Repita o tour a qualquer momento em Configurações.",
  "onboarding.tour.dashboard": "Painel",
  "onboarding.tour.dashboardDesc": "Seu centro de operações ao vivo.",
  "onboarding.tour.marketplace": "Marketplace",
  "onboarding.tour.marketplaceDesc": "Compre, venda e defina suas margens.",
  "onboarding.tour.notifications": "Notificações",
  "onboarding.tour.notificationsDesc": "Em tempo real, com WebSocket.",
  "onboarding.tour.security": "Segurança",
  "onboarding.tour.securityDesc": "2FA, sessões e registros de auditoria.",
  "dashboard.nav.dashboard": "Painel",
  "dashboard.nav.analytics": "Análises",
  "dashboard.nav.services": "Serviços",
  "dashboard.nav.orders": "Pedidos",
  "dashboard.nav.subscriptions": "Assinaturas",
  "dashboard.nav.childPanels": "Painéis filhos",
  "dashboard.nav.marketplace": "Marketplace",
  "dashboard.nav.wallet": "Carteira",
  "dashboard.nav.clients": "Clientes",
  "dashboard.nav.tickets": "Tickets",
  "dashboard.nav.notifications": "Notificações",
  "dashboard.nav.profile": "Perfil",
  "dashboard.nav.settings": "Configurações",
  "dashboard.workspace": "Espaço de trabalho",
  "dashboard.admin": "Admin",
  "dashboard.adminPanel": "Painel admin",
  "dashboard.availableBalance": "Saldo disponível",
  "dashboard.live": "ao vivo",
  "dashboard.returnToAdmin": "Voltar ao admin",
  "dashboard.exit": "Sair",
  "dashboard.impersonating": "Você está personificando",
  "dashboard.asAdminAudited": "como admin. Todas as ações são auditadas.",
  "dashboard.failedReturn": "Não foi possível voltar ao admin",
  "dashboard.contactSupport": "Tente novamente ou contate o suporte.",
  "dashboard.goHome": "Ir para o início da NOVSMM",
  "dashboard.backHome": "Voltar ao início da NOVSMM — sua sessão continua ativa",
  "dashboard.closeMenu": "Fechar menu",
  "dashboard.openMenu": "Abrir menu",
  "dashboard.openCommandPalette": "Abrir paleta de comandos",
  "dashboard.operational": "Operacional",
  "dashboard.degraded": "Degradado",
  "dashboard.account": "Conta",
  "dashboard.user": "Usuário",
  "dashboard.viewProfile": "Ver perfil",
  "dashboard.search": "Pesquisar pedidos e serviços…",
  "dashboard.searchShort": "Pesquisar…",
  "dashboard.allSystemsOperational": "Todos os sistemas operacionais",
  "dashboard.ordersToday": "Pedidos de hoje",
  "dashboard.activeServices": "Serviços ativos",
  "dashboard.conversion": "Conversão",
  "dashboard.revenueLastDays": "Receita · últimos 32 dias",
  "dashboard.liveOrders": "Pedidos ao vivo",
  "dashboard.streaming": "transmitindo",
  "dashboard.justNow": "agora mesmo",
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
  // Landing — Services
  "landing.services.eyebrow": "Services",
  "landing.services.titleLine1": "Chaque plateforme. Chaque métrique.",
  "landing.services.titleLine2": "Une seule surface de contrôle.",
  "landing.services.description": "De la croissance des abonnés au temps de visionnage, NOVSMM orchestre plus de 6 300 services sur les plateformes où votre audience vit réellement — propulsé par HuntSMM.",
  "landing.services.moreLabel": "+ plus",
  "landing.services.totalServices": "services actifs au total",
  "landing.services.svcUnit": "srv",
  // Landing — Marketplace
  "landing.marketplace.eyebrow": "Marketplace",
  "landing.marketplace.titleLine1": "Achetez en gros. Revendez à votre prix.",
  "landing.marketplace.titleLine2": "Gardez la marge.",
  "landing.marketplace.description": "Un marketplace ouvert où les revendeurs rivalisent sur les prix, publient leurs propres offres et voient le profit se régler en temps réel — sans toucher à l'infrastructure.",
  "landing.marketplace.flow.label": "Le flux",
  "landing.marketplace.flow.title": "De l'approvisionnement au profit réglé en un cycle continu",
  "landing.marketplace.flow.supply.title": "Approvisionnement fournisseurs",
  "landing.marketplace.flow.supply.desc": "Les fournisseurs approuvés publient des services à des prix de gros.",
  "landing.marketplace.flow.supply.chip": "gros",
  "landing.marketplace.flow.markup.title": "Marge revendeur",
  "landing.marketplace.flow.markup.desc": "Définissez les marges par service, par niveau de client, par devise.",
  "landing.marketplace.flow.markup.chip": "votre marge",
  "landing.marketplace.flow.checkout.title": "Checkout acheteur",
  "landing.marketplace.flow.checkout.desc": "Les clients achètent au prix de détail sur 5 passerelles.",
  "landing.marketplace.flow.checkout.chip": "détail",
  "landing.marketplace.flow.settlement.title": "Règlement instantané",
  "landing.marketplace.flow.settlement.desc": "Le profit est crédité sur votre wallet dès qu'une commande démarre.",
  "landing.marketplace.flow.settlement.chip": "profit",
  "landing.marketplace.flow.loopback": "Le profit se recycle en solde — financez la prochaine commande instantanément.",
  "landing.marketplace.offers.label": "Tableau des offres en direct",
  "landing.marketplace.offers.title": "Rivalisez sur les prix. Gagnez la commande.",
  "landing.marketplace.offers.statusLive": "en direct",
  "landing.marketplace.offers.statusSample": "échantillon",
  "landing.marketplace.offers.sampleNotice": "Affichage d'offres d'échantillon — publiez les vôtres depuis le tableau de bord pour remplir le tableau en direct.",
  "landing.marketplace.offers.cost": "coût",
  "landing.marketplace.offers.retail": "détail",
  "landing.marketplace.offers.sold": "vendus",
  "landing.marketplace.offers.walletLabel": "Solde du wallet",
  "landing.marketplace.offers.withdraw": "Retirer",
  // Landing — Payments
  "landing.payments.eyebrow": "Paiements",
  "landing.payments.titleLine1": "Un solde. Chaque devise.",
  "landing.payments.titleLine2": "Réglé en minutes.",
  "landing.payments.description": "NOVSMM achemine chaque transaction via PayPal, Mercado Pago, NowPayments (crypto) ou règlement manuel — avec conversion FX aux taux du marché moyen et plus de 100 cryptomonnaies acceptées.",
  "landing.payments.metaCurrencies": "Dev.",
  "landing.payments.metaSettlement": "Règl.",
  "landing.payments.metaSecurity": "Séc.",
  "landing.payments.statGateways": "Passerelles de paiement",
  "landing.payments.statCurrencies": "Devises",
  "landing.payments.statFailure": "Taux d'échec",
  "landing.payments.statSettlement": "Règlement moyen",
  "landing.payments.coinFieldLabel": "Réactif au défilement et au curseur · accélération GPU",
  "landing.payments.provider.paypal.note": "Protection acheteur et wallets sauvegardés. Confiance mondiale.",
  "landing.payments.provider.paypal.coverage": "200+ pays",
  "landing.payments.provider.mercadopago.note": "Plateforme de paiement leader en Amérique latine. Rails locaux.",
  "landing.payments.provider.mercadopago.coverage": "Région LATAM",
  "landing.payments.provider.nowpayments.note": "Acceptez plus de 100 cryptomonnaies. Conversion automatique en fiat. Zéro rétrofacturations.",
  "landing.payments.provider.nowpayments.coverage": "Mondial",
  "landing.payments.provider.manual.note": "Contactez notre équipe via WhatsApp pour des crédits manuels. Zéro frais.",
  "landing.payments.provider.manual.coverage": "Mondial",
  "landing.payments.settlement.instant": "Instantané",
  "landing.payments.settlement.onchain": "~5 min (on-chain)",
  "landing.payments.settlement.hours": "1-24h",
  "landing.payments.security.pciL1": "PCI DSS L1 (via fournisseur)",
  "landing.payments.security.decentralized": "Décentralisé",
  "landing.payments.security.verified": "Vérifié",
  // Landing — Stats
  "landing.stats.eyebrow": "Statistiques",
  "landing.stats.titleLine1": "Des chiffres qui bougent",
  "landing.stats.titleLine2": "à la vitesse de l'attention.",
  "landing.stats.description": "Chaque compteur ci-dessous est relié à la même télémétrie qui alimente les tableaux de bord des opérateurs — mis à jour en continu, jamais mis en cache pour la vanité.",
  "landing.stats.orders.label": "Commandes traitées",
  "landing.stats.orders.sub": "historique, sur {count} services",
  "landing.stats.users.label": "Utilisateurs actifs",
  "landing.stats.users.sub": "revendeurs et agences, 30j",
  "landing.stats.revenue.label": "Revenus acheminés",
  "landing.stats.revenue.sub": "via le marketplace",
  "landing.stats.enterprise.label": "Clients entreprise",
  "landing.stats.enterprise.sub": "avec infra dédiée",
  "landing.stats.chart.label": "Ventes quotidiennes · 14 derniers jours",
  "landing.stats.chart.dod": "DoD",
  "landing.stats.status.label": "État du système",
  "landing.stats.status.state": "opérationnel",
  "landing.stats.status.uptimeLabel": "uptime, 90j glissants",
  "landing.stats.status.60daysAgo": "il y a 60 jours",
  "landing.stats.status.today": "aujourd'hui",
  "landing.stats.status.avgStart": "Démarrage moyen",
  "landing.stats.status.throughput": "Throughput",
  "landing.stats.status.perMin": "/min",
  // Landing — Testimonials
  "landing.testimonials.eyebrow": "Témoignages",
  "landing.testimonials.titleLine1": "Opérateurs qui ont changé.",
  "landing.testimonials.titleLine2": "Résultats qui sont restés.",
  "landing.testimonials.description": "Expériences représentatives d'utilisateurs de la plateforme. Les résultats peuvent varier.",
  "landing.testimonials.verifiedBy": "Vérifié par les opérateurs NOVSMM",
  "landing.testimonials.proof.avgRating": "Note moyenne",
  "landing.testimonials.proof.nps": "Net promoter score",
  "landing.testimonials.proof.switchedFrom": "Arrivés de",
  "landing.testimonials.proof.countries": "Pays desservis",
  // Landing — Security
  "landing.security.eyebrow": "Sécurité",
  "landing.security.titleLine1": "Une sécurité visible —",
  "landing.security.titleLine2": "pas juste une checklist.",
  "landing.security.description": "Chaque couche ci-dessous est instrumentée, surveillée et affichée en direct aux opérateurs. C'est la posture qu'exigent les équipes entreprise.",
  "landing.security.statusActive": "actif",
  "landing.security.layer.ddos.title": "Protection DDoS",
  "landing.security.layer.ddos.desc": "Mitigation L3/L4/L7 toujours active en périphérie. Capacité 2.4 Tbps.",
  "landing.security.layer.ddos.metric": "0 attaques franchies",
  "landing.security.layer.tls.title": "TLS 1.3 partout",
  "landing.security.layer.tls.desc": "Chiffrement de bout en bout en transit. HSTS preload, OCSP stapling.",
  "landing.security.layer.tls.metric": "Note A+ · SSL Labs",
  "landing.security.layer.aes.title": "AES-256 au repos",
  "landing.security.layer.aes.desc": "Tous les wallets, clés et PII chiffrés avec DEK par locataire.",
  "landing.security.layer.aes.metric": "Modules FIPS 140-2",
  "landing.security.layer.backups.title": "Backups continus",
  "landing.security.layer.backups.desc": "PITR toutes les 60s, réplicas inter-régions, rétention 30 jours.",
  "landing.security.layer.backups.metric": "RPO 60s · RTO 5m",
  "landing.security.layer.ha.title": "Haute disponibilité",
  "landing.security.layer.ha.desc": "Actif-actif sur 3 régions. Bascule automatique en moins de 30s.",
  "landing.security.layer.ha.metric": "99.99% uptime SLA",
  "landing.security.layer.api.title": "Protection API",
  "landing.security.layer.api.desc": "Limites par clé, détection d'anomalies, webhooks signés.",
  "landing.security.layer.api.metric": "<0.01% mauvaises requêtes",
  "landing.security.layer.audit.title": "Logs d'audit",
  "landing.security.layer.audit.desc": "Logs immuables et exportables pour chaque action privilégiée.",
  "landing.security.layer.audit.metric": "Rétention 12 mois",
  "landing.security.layer.auth.title": "Auth sécurisée",
  "landing.security.layer.auth.desc": "SSO, 2FA, passkeys, clés matérielles. Provisioning SCIM.",
  "landing.security.layer.auth.metric": "Passkey + WebAuthn",
  "landing.security.shield.edge": "Edge",
  "landing.security.shield.app": "App",
  "landing.security.shield.data": "Données",
  "landing.security.shield.keys": "Clés",
  "landing.security.metric.threats": "Menaces bloquées",
  "landing.security.metric.mttr": "MTTR",
  "landing.security.metric.regions": "Régions",
  // Landing — API Docs
  "landing.apiDocs.eyebrow": "API développeur",
  "landing.apiDocs.titleLine1": "Construisez avec",
  "landing.apiDocs.titleLine2": "l'API NOVSMM.",
  "landing.apiDocs.description": "Un contrat REST compatible PerfectPanel / JAP — drop-in compatible avec vos bots, panneaux et outils d'automatisation existants. Auth bearer, clés à permissions, webhooks signés.",
  "landing.apiDocs.compatNote": "Compatible avec les outils de panneaux SMM existants — sans installation de SDK.",
  "landing.apiDocs.whatYouGet": "Ce que vous obtenez",
  "landing.apiDocs.everythingYouNeed": "Tout ce qu'une intégration revendeur nécessite",
  "landing.apiDocs.feature.endpoints.title": "7 endpoints REST",
  "landing.apiDocs.feature.endpoints.desc": "Services, orders, status, cancel, refill, refill_status, balance — couverture totale.",
  "landing.apiDocs.feature.batching.title": "Batch multi-commandes",
  "landing.apiDocs.feature.batching.desc": "Soumettez jusqu'à 100 commandes en une seule requête. Échec atomique, succès partiel.",
  "landing.apiDocs.feature.dripFeed.title": "Planification drip-feed",
  "landing.apiDocs.feature.dripFeed.desc": "Découpez la livraison en fragments avec exécutions et intervalles configurables.",
  "landing.apiDocs.feature.refill.title": "Demandes de refill",
  "landing.apiDocs.feature.refill.desc": "Déclenchez la re-livraison sur commandes terminées quand les comptes chutent sous 30 jours.",
  "landing.apiDocs.feature.webhooks.title": "Webhooks signés",
  "landing.apiDocs.feature.webhooks.desc": "Événements signés HMAC pour les changements de statut — replay-safe et idempotents.",
  "landing.apiDocs.feature.keys.title": "Clés API à permissions",
  "landing.apiDocs.feature.keys.desc": "Permissions par clé : read, order, wallet, marketplace. Rotation sans downtime.",
  "landing.apiDocs.viewDocs": "Voir la doc API complète",
  "landing.apiDocs.versionNote": "v1.0.0 · 60 req/min par clé",
  // Landing — Affiliates
  "landing.affiliates.eyebrow": "Affiliés",
  "landing.affiliates.titleLine1": "Gagnez 10% de commission",
  "landing.affiliates.titleLine2": "sur chaque parrainage.",
  "landing.affiliates.description": "Attribution à vie, paiements en temps réel, sans plafond. Le programme d'affiliation NOVSMM est le système de parrainage le mieux rémunéré de l'écosystème SMM.",
  "landing.affiliates.stats.affiliates": "affiliés gagnent aujourd'hui",
  "landing.affiliates.stats.paidOut": "versés aux affiliés",
  "landing.affiliates.stats.commission": "commission à vie",
  "landing.affiliates.commission.label": "Structure de commission",
  "landing.affiliates.commission.title": "10% à vie · paiement minimum 50 $",
  "landing.affiliates.commission.yourShare": "Votre part",
  "landing.affiliates.commission.theirOrder": "Leur commande",
  "landing.affiliates.commission.customerOrder": "commande client",
  "landing.affiliates.commission.example": "Exemple : une commande de 100 $ vous crédite {amount} — instantanément, à chaque fois, pour toujours.",
  "landing.affiliates.payout.label": "Méthodes de paiement",
  "landing.affiliates.payout.wallet.label": "Solde du wallet",
  "landing.affiliates.payout.wallet.note": "Instantané · sans frais",
  "landing.affiliates.payout.paypal.note": "minimum 50 $",
  "landing.affiliates.payout.usdt.note": "minimum 50 $",
  "landing.affiliates.howItWorks.label": "Comment ça marche",
  "landing.affiliates.howItWorks.title": "Trois étapes vers un revenu à vie",
  "landing.affiliates.step1.title": "Partagez votre lien",
  "landing.affiliates.step1.desc": "Obtenez un lien de parrainage unique depuis votre tableau de bord. Partagez-le où vous voulez — Twitter, Telegram, le pied de page de votre panneau.",
  "landing.affiliates.step2.title": "Ils s'inscrivent et commandent",
  "landing.affiliates.step2.desc": "Quiconque s'inscrit via votre lien est tagué comme votre filleul — à vie. Pas de fenêtres d'attribution.",
  "landing.affiliates.step3.title": "Vous gagnez 10% pour toujours",
  "landing.affiliates.step3.desc": "Chaque commande qu'ils passent vous rapporte 10% de commission — crédité sur votre wallet en temps réel, retirable à tout moment.",
  "landing.affiliates.cta.become": "Devenir affilié",
  "landing.affiliates.cta.openDashboard": "Ouvrir votre tableau de parrainage",
  "landing.affiliates.cta.note": "Sans processus d'approbation · Activation instantanée · Retrait à tout moment",
  // Landing — FAQ
  "landing.faq.eyebrow": "FAQ",
  "landing.faq.title": "Questions fréquentes",
  "landing.faq.description": "Réponses aux questions les plus courantes sur NOVSMM. Vous ne trouvez pas ce que vous cherchez ? Notre équipe support est à un clic.",
  "landing.faq.stillHaveQuestions": "D'autres questions ?",
  "landing.faq.supportReplies": "Notre équipe support répond en quelques minutes, 24/7.",
  "landing.faq.chatWithUs": "Discutez avec nous",
  // Landing — Sticky CTA
  "landing.stickyCta.title": "Commencez gratuitement aujourd'hui",
  "landing.stickyCta.subtitle": "Sans carte de crédit",
  "landing.stickyCta.getStarted": "Démarrer",
  "landing.stickyCta.viewPricing": "Voir les tarifs",
  "landing.stickyCta.startFree": "Commencer gratuitement",
  // Landing — Social Proof
  "landing.socialProof.demo": "Illustratif",
  "landing.socialProof.action.signedUp": "vient de s'inscrire",
  "landing.socialProof.action.placedOrder": "a passé une commande",
  "landing.socialProof.action.toppedUp": "a rechargé",
  "landing.socialProof.ariaLabel": "Activité de la plateforme",
  "landing.socialProof.dismiss": "Fermer",
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
  "auth.backHome": "Retour à l’accueil",
  "auth.welcomeBack": "Bon retour",
  "auth.workspace": "Connectez-vous à votre espace NOVSMM",
  "auth.orEmail": "ou continuer avec votre e-mail",
  "auth.emailOrUsername": "E-mail ou nom d’utilisateur",
  "auth.rememberMe": "Se souvenir de moi",
  "auth.signingIn": "Connexion…",
  "auth.verifyAndSignIn": "Vérifier et se connecter",
  "auth.noAccount": "Vous n’avez pas de compte ?",
  "auth.createOne": "Créez-en un",
  "auth.twoFactorRequired": "Authentification à deux facteurs requise",
  "auth.twoFactorInstructions": "Saisissez le code à 6 chiffres de votre application d’authentification.",
  "auth.twoFactorCode": "Code 2FA",
  "auth.layeredSecurity": "Contrôles de sécurité en couches",
  "auth.encryption": "Chiffrement 256 bits",
  "auth.liveMonitoring": "Surveillance en direct",
  "auth.forgotPasswordTitle": "Réinitialiser votre mot de passe",
  "auth.forgotPasswordDescription": "Saisissez l’e-mail de votre compte et nous vous enverrons un lien sécurisé pour réinitialiser votre mot de passe.",
  "auth.resetLinkSent": "Lien de réinitialisation envoyé",
  "auth.resetLinkNotice": "Si cette adresse existe, un lien de réinitialisation a été envoyé.",
  "auth.checkInbox": "Consultez votre boîte de réception",
  "auth.sendingLink": "Envoi du lien…",
  "auth.sendResetLink": "Envoyer le lien de réinitialisation",
  "auth.backToLogin": "Retour à la connexion",
  "auth.close": "Fermer",
  "auth.loginTimedOut": "La connexion a expiré. Vérifiez votre connexion et réessayez.",
  "auth.invalidTwoFactor": "Code 2FA invalide. Veuillez réessayer.",
  "auth.invalidCredentials": "E-mail ou mot de passe invalide. Veuillez réessayer.",
  "auth.loginFailed": "Échec de la connexion. Vérifiez votre connexion et réessayez.",
  "auth.requestFailed": "Échec de la demande",
  "auth.tryAgain": "Veuillez réessayer dans un instant.",
  "auth.redirecting": "Redirection…",
  "auth.continueWith": "Continuer avec {provider}",
  "auth.createWorkspace": "Créez votre espace",
  "auth.createWorkspaceSubtitle": "Commencez à automatiser en quelques minutes. Aucune carte bancaire requise.",
  "auth.orSignUpEmail": "ou s’inscrire avec un e-mail",
  "auth.fullName": "Nom complet",
  "auth.username": "Nom d’utilisateur",
  "auth.usernameHint": "3+ caractères, lettres/chiffres/_",
  "auth.validEmail": "Saisissez une adresse e-mail valide",
  "auth.createStrongPassword": "Créez un mot de passe robuste",
  "auth.confirmPassword": "Confirmer le mot de passe",
  "auth.reenterPassword": "Saisissez à nouveau le mot de passe",
  "auth.passwordMismatch": "Les mots de passe ne correspondent pas",
  "auth.country": "Pays",
  "auth.currency": "Devise",
  "auth.language": "Langue",
  "auth.creatingAccount": "Création du compte…",
  "auth.createAccount": "Créer un compte",
  "auth.agreeTerms": "En créant un compte, vous acceptez nos",
  "auth.terms": "Conditions",
  "auth.and": "et",
  "auth.privacyPolicy": "Politique de confidentialité",
  "auth.alreadyAccount": "Vous avez déjà un compte ?",
  "auth.freeTrial": "Essai gratuit de 14 jours",
  "auth.noCreditCard": "Aucune carte bancaire",
  "auth.cancelAnytime": "Annulez à tout moment",
  "auth.passwordWeak": "Faible",
  "auth.passwordFair": "Moyen",
  "auth.passwordGood": "Bon",
  "auth.passwordStrong": "Fort",
  "auth.passwordTipLength": "Utilisez au moins 8 caractères",
  "auth.passwordTipCase": "Mélangez majuscules et minuscules",
  "auth.passwordTipNumber": "Ajoutez un chiffre",
  "auth.passwordTipSymbol": "Ajoutez un symbole",
  "auth.accountCreated": "Compte créé ! Connectez-vous avec vos identifiants.",
  "auth.registrationFailed": "Échec de l’inscription. Veuillez réessayer.",
  "onboarding.step": "Étape {current} sur {total}",
  "onboarding.back": "Retour",
  "onboarding.previous": "Précédent",
  "onboarding.enterDashboard": "Accéder au tableau de bord",
  "onboarding.continue": "Continuer",
  "onboarding.skip": "Ignorer l’onboarding →",
  "onboarding.welcome.title": "Bienvenue sur NOVSMM",
  "onboarding.welcome.subtitle": "Dites-nous comment vous utiliserez la plateforme pour adapter votre espace.",
  "onboarding.role.reseller": "Revendeur",
  "onboarding.role.resellerDesc": "Achetez en gros et revendez à votre prix.",
  "onboarding.role.agency": "Agence",
  "onboarding.role.agencyDesc": "Gérez plusieurs créateurs et marques.",
  "onboarding.role.creator": "Créateur",
  "onboarding.role.creatorDesc": "Développez votre propre audience.",
  "onboarding.role.enterprise": "Entreprise",
  "onboarding.role.enterpriseDesc": "Infrastructure et contrôles dédiés.",
  "onboarding.profile.title": "Configurez votre profil",
  "onboarding.profile.subtitle": "Ajoutez quelques informations pour que vos collaborateurs vous reconnaissent.",
  "onboarding.profile.displayName": "Nom affiché",
  "onboarding.profile.yourName": "Votre nom",
  "onboarding.profile.verifiedEmail": "E-mail vérifié",
  "onboarding.currency.title": "Choisissez votre devise",
  "onboarding.currency.subtitle": "Définit votre portefeuille, vos prix et vos retraits par défaut. Modifiable à tout moment.",
  "onboarding.currency.usd": "Dollar américain",
  "onboarding.currency.eur": "Euro",
  "onboarding.currency.mxn": "Peso mexicain",
  "onboarding.currency.brl": "Réal brésilien",
  "onboarding.currency.gbp": "Livre sterling",
  "onboarding.currency.inr": "Roupie indienne",
  "onboarding.language.title": "Choisissez votre langue",
  "onboarding.language.subtitle": "Nous traduirons votre tableau de bord, vos reçus et vos notifications.",
  "onboarding.notifications.title": "Préférences de notifications",
  "onboarding.notifications.subtitle": "Choisissez ce qui apparaît dans votre flux en temps réel. Modifiez-le dans Paramètres.",
  "onboarding.notifications.orders": "Mises à jour des commandes",
  "onboarding.notifications.ordersDesc": "Début, progression et fin",
  "onboarding.notifications.sales": "Ventes et revenus",
  "onboarding.notifications.salesDesc": "Nouvelles ventes et paiements",
  "onboarding.notifications.tickets": "Tickets de support",
  "onboarding.notifications.ticketsDesc": "Réponses et changements de statut",
  "onboarding.notifications.system": "Système et sécurité",
  "onboarding.notifications.systemDesc": "Maintenance et alertes",
  "onboarding.tour.title": "Découvrez le tableau de bord",
  "onboarding.tour.subtitle": "Voici ce que vous trouverez. Vous pourrez revoir ce parcours depuis Paramètres.",
  "onboarding.tour.dashboard": "Tableau de bord",
  "onboarding.tour.dashboardDesc": "Votre centre d’opérations en direct.",
  "onboarding.tour.marketplace": "Marketplace",
  "onboarding.tour.marketplaceDesc": "Achetez, vendez et définissez vos marges.",
  "onboarding.tour.notifications": "Notifications",
  "onboarding.tour.notificationsDesc": "En temps réel, avec WebSocket.",
  "onboarding.tour.security": "Sécurité",
  "onboarding.tour.securityDesc": "2FA, sessions et journaux d’audit.",
  "dashboard.nav.dashboard": "Tableau de bord",
  "dashboard.nav.analytics": "Analytique",
  "dashboard.nav.services": "Services",
  "dashboard.nav.orders": "Commandes",
  "dashboard.nav.subscriptions": "Abonnements",
  "dashboard.nav.childPanels": "Panneaux enfants",
  "dashboard.nav.marketplace": "Marketplace",
  "dashboard.nav.wallet": "Portefeuille",
  "dashboard.nav.clients": "Clients",
  "dashboard.nav.tickets": "Tickets",
  "dashboard.nav.notifications": "Notifications",
  "dashboard.nav.profile": "Profil",
  "dashboard.nav.settings": "Paramètres",
  "dashboard.workspace": "Espace de travail",
  "dashboard.admin": "Admin",
  "dashboard.adminPanel": "Panneau d’administration",
  "dashboard.availableBalance": "Solde disponible",
  "dashboard.live": "en direct",
  "dashboard.returnToAdmin": "Retour à l’admin",
  "dashboard.exit": "Quitter",
  "dashboard.impersonating": "Vous usurpez l’identité de",
  "dashboard.asAdminAudited": "en tant qu’admin. Toutes les actions sont auditées.",
  "dashboard.failedReturn": "Impossible de revenir à l’admin",
  "dashboard.contactSupport": "Réessayez ou contactez le support.",
  "dashboard.goHome": "Aller à l’accueil NOVSMM",
  "dashboard.backHome": "Retour à l’accueil NOVSMM — votre session reste active",
  "dashboard.closeMenu": "Fermer le menu",
  "dashboard.openMenu": "Ouvrir le menu",
  "dashboard.openCommandPalette": "Ouvrir la palette de commandes",
  "dashboard.operational": "Opérationnel",
  "dashboard.degraded": "Dégradé",
  "dashboard.account": "Compte",
  "dashboard.user": "Utilisateur",
  "dashboard.viewProfile": "Voir le profil",
  "dashboard.search": "Rechercher des commandes et services…",
  "dashboard.searchShort": "Rechercher…",
  "dashboard.allSystemsOperational": "Tous les systèmes opérationnels",
  "dashboard.ordersToday": "Commandes aujourd’hui",
  "dashboard.activeServices": "Services actifs",
  "dashboard.conversion": "Conversion",
  "dashboard.revenueLastDays": "Revenus · 32 derniers jours",
  "dashboard.liveOrders": "Commandes en direct",
  "dashboard.streaming": "diffusion",
  "dashboard.justNow": "à l’instant",
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
