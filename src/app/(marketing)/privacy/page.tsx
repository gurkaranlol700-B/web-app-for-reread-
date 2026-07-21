import { LegalDocument } from "@/components/layout/legal-document";

export const metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <LegalDocument
      eyebrow="Legal · Privacy policy"
      title="Privacy policy"
      lastUpdated="20 July 2026"
    >
      <h2>1. What this policy covers</h2>
      <p>
        This policy explains what information ReRead collects when you use
        the marketplace, why we collect it, and the choices you have about
        it. Because most people using ReRead are school students — often
        minors — we try to collect the least amount of information needed to
        make the marketplace work, and no more.
      </p>

      <h2>2. Information we collect</h2>
      <p>
        <strong className="text-foreground">Account information</strong> you
        give us directly: your name, email address, school, and class/grade.
      </p>
      <p>
        <strong className="text-foreground">Content you create</strong>:
        book listings, photos you upload, messages you send to other users,
        and books you wishlist.
      </p>
      <p>
        <strong className="text-foreground">Usage information</strong>{" "}
        collected automatically: pages you visit, searches you run, device
        and browser type, and rough diagnostic/log data used to keep ReRead
        working and secure.
      </p>
      <p>
        We do not knowingly collect information from children beyond what is
        needed to operate a school account, and we do not use student data
        for third-party advertising.
      </p>

      <h2>3. Children&rsquo;s privacy</h2>
      <p>
        ReRead is built for a school-age audience, including users who are
        minors. We collect the minimum information needed to verify school
        affiliation and run the marketplace, we do not run targeted
        advertising to any user, and we encourage students under the age of
        majority to use ReRead with a parent or guardian&rsquo;s awareness. A
        parent or guardian who wants to review, correct, or delete their
        child&rsquo;s information can contact us using the details below.
      </p>

      <h2>4. How we use your information</h2>
      <ul>
        <li>To create and secure your account, and verify your school.</li>
        <li>To show your listings to other students and let buyers and sellers message each other.</li>
        <li>To keep the marketplace safe — detecting fraud, spam, and policy violations.</li>
        <li>To improve ReRead, for example understanding which filters or features are actually used.</li>
        <li>To contact you about your account, a transaction, or a policy change.</li>
      </ul>

      <h2>5. How we share your information</h2>
      <p>
        We do not sell your personal information. We share it only:
      </p>
      <ul>
        <li>With other users, limited to what a listing or profile is designed to show (e.g., your name and school on a listing you post).</li>
        <li>With service providers who host our infrastructure, store images, or help run the app, under agreements that restrict them to providing that service.</li>
        <li>When required by law, or to protect the safety of our users.</li>
      </ul>

      <h2>6. How long we keep it</h2>
      <p>
        We keep account and listing information for as long as your account
        is active. If you delete your account, we remove your listings and
        personal information from active use within a reasonable period,
        except where we need to retain limited records for legal, safety, or
        fraud-prevention reasons.
      </p>

      <h2>7. Security</h2>
      <p>
        We use industry-standard safeguards — encrypted connections,
        access-controlled databases, and authenticated APIs — to protect
        your information. No system is perfectly secure, and we&rsquo;ll notify
        affected users if a breach puts their information at meaningful
        risk.
      </p>

      <h2>8. Your choices</h2>
      <p>You can, at any time:</p>
      <ul>
        <li>Review and update your profile information.</li>
        <li>Delete individual listings or your wishlist.</li>
        <li>Request a copy of your data, or request that we delete your account.</li>
        <li>Opt out of non-essential email notifications.</li>
      </ul>

      <h2>9. Cookies and analytics</h2>
      <p>
        We use a small number of cookies and lightweight analytics to keep
        you signed in, remember your theme preference, and understand which
        parts of ReRead are actually useful. We don&rsquo;t use them to track you
        across other sites.
      </p>

      <h2>10. Changes to this policy</h2>
      <p>
        As ReRead adds features — delivery, verified payments, or
        advertising in later phases — this policy will be updated to
        reflect them, with the date at the top of this page updated
        accordingly.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions about this policy, or requests about your data, can be
        sent to{" "}
        <a href="mailto:privacy@reread.app" className="text-brand underline underline-offset-4">
          privacy@reread.app
        </a>
        .
      </p>
    </LegalDocument>
  );
}
