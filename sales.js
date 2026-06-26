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
  const lead = getLeadContext();
  const checkoutUrl = config.checkoutUrl || "index.html";
  const bookingUrl =
    config.bookingUrl ||
    (hasRealEmail
      ? `mailto:${contactEmail}?subject=${encodeURIComponent(mailSubject(productName, lead))}&body=${encodeURIComponent(mailBody(lead))}`
      : "#next-step");
  const invoiceUrl = hasRealEmail
    ? `mailto:${contactEmail}?subject=${encodeURIComponent(invoiceSubject(productName, lead))}&body=${encodeURIComponent(invoiceBody(setupPrice, lead))}`
    : "#next-step";

  document.title = `${productName} - Contractor Proposal Recovery System`;
  setText("[data-product-name]", productName);
  setText("[data-product-subtitle]", subtitle);
  setText("[data-setup-price]", setupPrice);
  setText("[data-monthly-price]", monthlyPrice);
  setText("[data-offer-name]", config.offerName || "Contractor proposal recovery system");
  setText("[data-checkout-label]", hasCheckout ? `Start the ${setupPrice} setup` : "View demo");
  setText("[data-booking-label]", hasBooking || hasRealEmail ? "Book 10 minutes" : "Reply to sender");
  setText("[data-invoice-label]", "Request invoice");
  setText(
    "[data-next-step-copy]",
    hasCheckout
      ? "Use the setup link to start, then send recent proposal and change-order examples during intake."
      : hasRealEmail
        ? `Email ${contactEmail}, book a 10-minute workflow review, or request the ${setupPrice} setup invoice.`
        : "Reply to the message that sent you this page and ask for the 10-minute workflow review."
  );
  setHref("[data-checkout-link]", checkoutUrl);
  setHref("[data-booking-link]", bookingUrl);
  setHref("[data-invoice-link]", invoiceUrl);

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

  function getLeadContext() {
    const params = new URLSearchParams(window.location.search);
    const company = params.get("company") || "";
    const leadId = params.get("lead") || "";
    return { company, leadId };
  }

  function mailSubject(name, context) {
    return context.company ? `${name} workflow review - ${context.company}` : `${name} workflow review`;
  }

  function mailBody(context) {
    const lines = ["Hi Filip,", "", "I would like to take a quick look at the ScopePilot workflow."];
    if (context.company) lines.push("", `Company: ${context.company}`);
    if (context.leadId) lines.push(`Lead: ${context.leadId}`);
    lines.push("", "Thanks,");
    return lines.join("\n");
  }

  function invoiceSubject(name, context) {
    return context.company ? `${name} setup invoice - ${context.company}` : `${name} setup invoice`;
  }

  function invoiceBody(price, context) {
    const lines = ["Hi Filip,", "", `Please send the ${price} ScopePilot setup invoice.`];
    if (context.company) lines.push("", `Company: ${context.company}`);
    if (context.leadId) lines.push(`Lead: ${context.leadId}`);
    lines.push("", "Thanks,");
    return lines.join("\n");
  }
})();
