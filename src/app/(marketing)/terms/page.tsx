import { LegalDocument } from "@/components/layout/legal-document";

export const metadata = { title: "Terms of service" };

export default function TermsPage() {
  return (
    <LegalDocument
      eyebrow="Legal · Terms of service"
      title="Terms of service"
      lastUpdated="20 July 2026"
    >
      <h2>1. What ReRead is</h2>
      <p>
        ReRead is a marketplace that lets students at participating schools
        list, discover, and arrange the sale of second-hand textbooks and
        other academic materials with each other. ReRead provides the
        listings, search, and in-app messaging. We are not a party to any
        sale between a buyer and a seller, we do not inspect books before
        they change hands, and — in this version of ReRead — we do not
        process payment for the sale itself. Buyers and sellers deal with
        each other directly and are responsible for their own transaction.
      </p>

      <h2>2. Creating an account</h2>
      <p>You need an account to list a book, message a seller, or save a wishlist. To create one, you confirm that:</p>
      <ul>
        <li>The information you provide (name, school, class/grade, contact details) is accurate.</li>
        <li>You are a student, guardian, or staff member at a participating school, or otherwise authorized to use ReRead.</li>
        <li>If you are under the age of majority where you live, a parent or guardian is aware of and consents to your use of ReRead.</li>
        <li>You are responsible for activity on your account and for keeping your password confidential.</li>
      </ul>
      <p>
        We may ask you to verify your school affiliation and may limit
        features until that verification is complete.
      </p>

      <h2>3. Listing and buying books</h2>
      <p>If you list a book for sale, you confirm that:</p>
      <ul>
        <li>You own the book and have the right to sell it.</li>
        <li>The photos, price, condition, subject, class, board, and publication you enter are accurate and not misleading.</li>
        <li>You will honor the listing at the price and condition described once a buyer agrees to it.</li>
      </ul>
      <p>
        If you are buying a book, you are responsible for reviewing the
        listing and asking the seller questions before agreeing to a sale.
        ReRead does not guarantee the condition, authenticity, or edition of
        any book listed by another user.
      </p>

      <h2>4. Meeting up and paying</h2>
      <p>
        In this version of ReRead, buyers and sellers agree on a price,
        arrange to meet (typically at school), and exchange the book and
        payment directly between themselves. ReRead is not responsible for
        payments made outside the app, for a buyer or seller who does not
        show up, or for the condition of a book once it has been handed
        over. Use common sense: meet in a public or supervised place at
        school, and don&rsquo;t share personal contact details with someone you
        don&rsquo;t yet trust.
      </p>

      <h2>5. Fees</h2>
      <p>
        Some listings may be subject to a brokerage or transaction fee, and
        sellers may optionally pay to have a listing featured as a Premium
        Listing. Any fee will be clearly disclosed to you before you&rsquo;re
        charged for it. We will never change what you owe on a listing after
        the fact without telling you first.
      </p>

      <h2>6. Messaging and conduct</h2>
      <p>You agree not to use ReRead to:</p>
      <ul>
        <li>List counterfeit, pirated, stolen, or unsafe items, or anything unrelated to academic materials.</li>
        <li>Harass, threaten, or impersonate another student or staff member.</li>
        <li>Ask another user to move a legitimate sale off-platform in order to scam them, or to circumvent fees.</li>
        <li>Send spam, phishing links, or malware through listings or messages.</li>
        <li>Scrape, resell, or misuse listing data or other users&rsquo; information.</li>
      </ul>
      <p>
        We can remove a listing, restrict messaging, or suspend an account
        that breaks these rules, with or without notice, to keep ReRead safe
        for everyone else using it.
      </p>

      <h2>7. Content you post</h2>
      <p>
        You keep ownership of the photos, descriptions, and messages you
        post. By posting them, you give ReRead a license to host, display,
        and distribute that content within the app so the marketplace can
        function — for example, showing your listing photo in search
        results. You&rsquo;re responsible for making sure you have the right to
        post what you upload.
      </p>

      <h2>8. Disclaimers and limitation of liability</h2>
      <p>
        ReRead is provided &ldquo;as is.&rdquo; We do our best to keep listings accurate
        and the platform reliable, but we don&rsquo;t guarantee that every listing
        is truthful, that every user is who they say they are, or that the
        service will be uninterrupted or error-free. To the fullest extent
        the law allows, ReRead is not liable for disputes between buyers and
        sellers, losses from a transaction gone wrong, or indirect damages
        arising from your use of the app.
      </p>

      <h2>9. Suspending or ending an account</h2>
      <p>
        You can stop using ReRead and request account deletion at any time.
        We may suspend or terminate an account that violates these terms or
        puts other users at risk.
      </p>

      <h2>10. Changes to these terms</h2>
      <p>
        We may update these terms as ReRead grows — for example, when
        payments or delivery are introduced in a later phase. We&rsquo;ll post the
        updated date at the top of this page, and for material changes we&rsquo;ll
        make a reasonable effort to notify you before they take effect.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions about these terms can be sent to{" "}
        <a href="mailto:hello@reread.app" className="text-brand underline underline-offset-4">
          hello@reread.app
        </a>
        .
      </p>
    </LegalDocument>
  );
}
