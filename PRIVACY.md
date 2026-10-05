# Privacy Policy — review copy

Working copy for review. The **published** version is `public/privacy.html`, served at
<https://trusttab.org/privacy>. Edit this file, hand the changes back, and they get applied
to the HTML — the two are not generated from each other, so they drift unless kept in step.

Headings below match the `<section>` blocks in the HTML one-for-one.

Not legal advice. The text describes what the code actually does; whether that is *sufficient*
for an Oregon nonprofit handling subscriber data is a question for a lawyer.

---

Last updated 4 October 2026

## Who we are

Trust Tab is an Oregon nonprofit organization. This policy covers **trusttab.org**,
our pre-launch website. It describes the information that site collects and who it is shared
with. Questions can go to info@trusttab.org.

## What we collect

The site collects only what the signup form needs in order to work:

- **Your email address** — only if you type it into the signup form and submit it.
- **Your IP address** — passed to Cloudflare as part of the bot check described below, so that
  Cloudflare can assess whether a submission is automated.
- **A confirmation token** — a signed value containing your email address and an expiry time,
  placed in the confirmation link we email you. It expires 48 hours after it is issued.

We do not use advertising trackers, and we do not sell or rent your information to anyone.

## How we use your email address

We use it to send you updates about Trust Tab's launch and local pilot programs, and nothing
else. Signup is double opt-in: when you submit the form we add your address in an unconfirmed
state and email you a confirmation link. You do not receive updates unless you click that link.
Every email we send includes a one-click unsubscribe link, and you can also ask us to remove you
at any time by writing to info@trusttab.org. We keep your address until you unsubscribe or ask us
to delete it.

## Bot protection — Cloudflare Turnstile

To stop automated signups, the form is protected by **Cloudflare Turnstile**. Turnstile runs in
your browser and checks whether the submission looks automated. It may operate invisibly, without
displaying a widget or any indication that a check is taking place. To perform this check,
Cloudflare receives your IP address and signals about your browser and device.

> Cloudflare's handling of that information is governed by the
> [Cloudflare Turnstile Privacy Addendum](https://www.cloudflare.com/turnstile-privacy-policy/),
> which we incorporate into this policy by reference.

**Do not delete the quoted sentence above.** Referencing the Addendum is a condition Cloudflare
imposes for running Turnstile in invisible mode. Rewording is fine; dropping the reference means
invisible mode is no longer permitted.

## Service providers

Operating this site means a few third parties necessarily receive some data:

- **Cloudflare** — hosts the site and provides Turnstile. As with any website, your IP address is
  visible to the host serving the page.
- **Mailgun** — stores our mailing list and delivers our email. Your address is held there once
  you sign up.
- **Google Fonts** — serves the typefaces this site uses, so loading a page discloses your IP
  address to Google even if you never use the form.

## Your choices

You can use this site without giving us anything — the signup form is entirely optional. If you
have signed up, you can unsubscribe from any email we send, or contact us to see, correct, or
delete the address we hold for you.

## Changes to this policy

Trust Tab has not launched yet. As the platform goes live this policy will be revised, and the
date at the top of this page will change to reflect that.

---

## Notes for your review

Points where I wrote from the code rather than from your intent — worth a decision:

1. **Retention.** I wrote "until you unsubscribe or ask us to delete it," which is accurate for
   how Mailgun is being used but is not a defined retention period. If you want a fixed window,
   say so and it goes in.
2. **Jurisdiction and rights.** Nothing is claimed about GDPR, CCPA, or state privacy law, and no
   legal bases for processing are asserted. If you expect EU or California subscribers, this
   likely needs more.
3. **Google Fonts.** Disclosed because the page genuinely contacts it. The Tailwind CDN was
   removed in the October 2026 redesign. If you self-host the fonts, that bullet can be deleted
   outright.
4. **Children's data.** No COPPA statement. Add one if under-13 signups are plausible.
5. **Contact address.** Uses `info@trusttab.org`, taken from the site footer. Change it if
   privacy requests should go somewhere else.
6. **No analytics claim.** I state there are no advertising trackers. That is true of the page as
   written today; revisit it if you ever add analytics.
