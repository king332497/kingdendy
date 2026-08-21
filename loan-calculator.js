(()=>{
  "use strict";

  const DEFAULT_ANNUAL_INTEREST_RATE = 0.12; // 12%/tahun flat; estimasi, bukan suku bunga resmi produk bank.
  const STORAGE_KEYS = Object.freeze({
    amount: "kbPrototypeLimit",
    tenorMonths: "kbLoanTenorMonths",
    annualInterestRate: "kbLoanAnnualInterestRate",
    installment: "kbLoanInstallment",
    totalInterest: "kbLoanTotalInterest"
  });

  const finiteNumber = (value, fallback = 0) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  };

  function calculate(amount, tenorMonths, annualInterestRate = DEFAULT_ANNUAL_INTEREST_RATE) {
    const principal = Math.max(0, finiteNumber(amount));
    const months = Math.max(1, Math.round(finiteNumber(tenorMonths, 36)));
    const annualRate = Math.max(0, finiteNumber(annualInterestRate, DEFAULT_ANNUAL_INTEREST_RATE));
    const totalInterest = Math.round(principal * annualRate * (months / 12));
    const totalRepayment = principal + totalInterest;
    const installment = Math.ceil(totalRepayment / months);

    return Object.freeze({
      amount: principal,
      tenorMonths: months,
      annualInterestRate: annualRate,
      totalInterest,
      totalRepayment,
      installment
    });
  }

  function save(amount, tenorMonths, annualInterestRate = DEFAULT_ANNUAL_INTEREST_RATE) {
    const result = calculate(amount, tenorMonths, annualInterestRate);
    sessionStorage.setItem(STORAGE_KEYS.amount, String(result.amount));
    sessionStorage.setItem(STORAGE_KEYS.tenorMonths, String(result.tenorMonths));
    sessionStorage.setItem(STORAGE_KEYS.annualInterestRate, String(result.annualInterestRate));
    sessionStorage.setItem(STORAGE_KEYS.installment, String(result.installment));
    sessionStorage.setItem(STORAGE_KEYS.totalInterest, String(result.totalInterest));
    return result;
  }

  function load(fallbackAmount = 50000000, fallbackTenorMonths = 36) {
    const amount = finiteNumber(sessionStorage.getItem(STORAGE_KEYS.amount), fallbackAmount) || fallbackAmount;
    const tenorMonths = finiteNumber(sessionStorage.getItem(STORAGE_KEYS.tenorMonths), fallbackTenorMonths) || fallbackTenorMonths;
    const annualInterestRate = finiteNumber(sessionStorage.getItem(STORAGE_KEYS.annualInterestRate), DEFAULT_ANNUAL_INTEREST_RATE);
    const calculated = calculate(amount, tenorMonths, annualInterestRate);

    // Recalculate instead of trusting stale stored installment/interest values.
    // This guarantees amount + tenor + rate always produce the displayed values.
    return calculated;
  }

  window.KBLoanCalculator = Object.freeze({
    DEFAULT_ANNUAL_INTEREST_RATE,
    STORAGE_KEYS,
    calculate,
    save,
    load
  });
})();
