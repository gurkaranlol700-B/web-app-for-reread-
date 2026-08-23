/**
 * Razorpay's checkout is loaded from their CDN at runtime, so it arrives as a
 * global rather than an import. Declared once here instead of in each
 * component that opens a checkout.
 */
interface RazorpayInstance {
  open: () => void;
}

interface Window {
  Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
}
