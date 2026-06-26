(function () {
  const config = window.SCOPEPILOT_CONFIG || {};
  const productName = config.productName || "ScopePilot";
  const subtitle = config.subtitle || "Change-order pack generator";
  const setupPrice = formatMoney(config.setupPrice || 3000).replace(".00", "");
  const monthlyPrice = formatMoney(config.monthlyPrice || 79).replace(".00", "");
  const contactEmail = config.contactEmail || "sales@example.com";
  const hasCheckout = Boolean(config.checkoutUrl);
  const hasBooking = Boolean(config.bookingUrl);
  const hasRealEmail = Boolean(config.contactEmail && !/example\.com/i.test(config.contactEmail));
  const checkoutUrl = config.checkoutUrl || "index.html";
  const bookingUrl = config.bookingUrl || (hasRealEmail ? `mailto:${contactEmail}?subject=${encodeURIComponent(`${productName} workflow review`)}` : "#next-step");

  document.title = `${productName} - Contractor Proposal Recovery System`;
  setText("[data-product-name]", productName);
  setText("[data-product-subtitle]", subtitle);
  setText("[data-setup-price]", setupPrice);
  setText("[data-monthly-price]", monthlyPrice);
  setText("[data-offer-name]", config.offerName || "Contractor proposal recovery system");
  setText("[data-checkout-label]", hasCheckout ? `Start the ${setupPrice} setup` : "View demo");
  setText("[data-booking-label]", hasBooking || hasRealEmail ? "Book 10 minutes" : "Reply to sender");
  setText(
    "[data-next-step-copy]",
    hasCheckout
      ? "Use the setup link to start, then send recent proposal and change-order examples during intake."
      : hasRealEmail
        ? `Email ${contactEmail} or reply to the message that sent you this page and ask for the 10-minute workflow review.`
        : "Reply to the message that sent you this page and ask for the 10-minute workflow review."
  );
  setHref("[data-checkout-link]", checkoutUrl);
  setHref("[data-booking-link]", bookingUrl);

  const root = document.documentElement;
  if (config.theme && config.theme.primary) root.style.setProperty("--teal", config.theme.primary);
  if (config.theme && config.theme.primaryDark) root.style.setProperty("--teal-dark", config.theme.primaryDark);

  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }

  function setText(selector, value) {
    document.querySelectorAll(selector).forEach((node) => {
      node.textContent = value;
    });
  }

  function setHref(selector, value) {
    document.querySelectorAll(selector).forEach((node) => {
      node.setAttribute("href", value);
    });
  }

  function formatMoney(value) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value) || 0);
  }
})();
