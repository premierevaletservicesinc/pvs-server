# pvs-server

Backend for the Premiere Valet Services website. It receives the site's quote request and job application forms and sends them out as email through [Resend](https://resend.com).

For each submission it sends two emails:

1. A notification to the business (`QUOTE_EMAIL_TO` or `JOB_EMAIL_TO`), with Reply-To set to the person who submitted the form.
2. A confirmation copy to the submitter, with Reply-To set to the business address.

There is no database. Sent emails can be reviewed in the Resend dashboard (logs are kept for a limited time) and in the recipients' inboxes.

## Requirements

- Node.js 24 (see `.nvmrc`; run `nvm use`)
- A Resend API key with sending access for `premierevaletparking.com`

## Local setup

```sh
nvm use
npm install
cp .env.example .env   # then fill in RESEND_API_KEY
npm run dev            # starts on http://localhost:3001 and restarts on changes
```

Submitting a form locally sends real email, so point `QUOTE_EMAIL_TO` and `JOB_EMAIL_TO` at your own address while testing.

## Environment variables

| Variable         | Description                                                            |
| ---------------- | ---------------------------------------------------------------------- |
| `RESEND_API_KEY` | Resend API key used to send all email.                                 |
| `QUOTE_EMAIL_TO` | Recipient(s) of quote requests. Comma-separate multiple addresses.     |
| `JOB_EMAIL_TO`   | Recipient(s) of job applications. Comma-separate multiple addresses.   |
| `PORT`           | Port to listen on. Defaults to `3001`; Heroku sets this automatically. |

## API

All endpoints accept and return JSON. Each visitor (by IP) can submit at most 5 forms per hour across both endpoints.

### `POST /email/quote`

Quote request form. Fields: `name`, `email`, `phone`, `address`, `city`, `zipcode`, `eventDate`, `eventType`, `guests`, `cars`, `arrival`, `departure`, `comments`, `reference`.

### `POST /email/work`

Job application form. Fields: `firstName`, `lastName`, `email`, `phone`, `reference`, `education`, `skills`, `about`, `location`, `resume`.

Empty fields are left out of the emails. All submitted values are HTML-escaped.

### Spam filtering

Before anything is sent, [middleware/spamFilter.js](middleware/spamFilter.js) screens each submission:

- **Dropped silently** (returns 200 so bots get no signal; logged as `Dropped spam submission`): the hidden honeypot field `website` is filled in, or two or more fields look like random strings (letters only, with several capitals mixed in, e.g. `kMrOQjdptTtBiiHMD`).
- **Rejected with 400** (`message` can be shown to the user): missing name, invalid email, a phone number without at least 7 digits, non-text values, or any field over 5000 characters.

For the honeypot to work, the site's forms should include a visually hidden `website` input (with `tabindex="-1"` and `autocomplete="off"`) and send it with the rest of the fields.

### Responses

| Status | Body                                                                                 | Meaning                                                       |
| ------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| 200    | `{ "success": true, "message": "Quote received." }`                                  | The business notification was sent.                           |
| 500    | `{ "success": false, "message": "Your quote request could not be sent. Please..." }` | The business notification failed. Show `message` to the user. |
| 400    | `{ "success": false, "message": "Please enter a valid email address." }`             | Failed validation. Show `message` to the user.                |
| 429    | `{ "success": false, "message": "Too many submissions. Please try again later." }`   | Rate limit hit.                                               |

The confirmation email to the submitter is sent in the background. If it fails, the error is logged but the request still succeeds, because the business already has the submission.

## Scripts

| Command                | Description                           |
| ---------------------- | ------------------------------------- |
| `npm run dev`          | Start with nodemon (auto-restart).    |
| `npm start`            | Start with node (used in production). |
| `npm run lint`         | Lint with ESLint.                     |
| `npm run format`       | Format everything with Prettier.      |
| `npm run format:check` | Check formatting without writing.     |

## Deployment

The app runs on Heroku as `pvs-server` and deploys with a git push:

```sh
heroku git:remote -a pvs-server   # one time, adds the "heroku" remote
git push heroku master
```

Environment variables are managed in Heroku (dashboard: Settings → Config Vars, or `heroku config:set`). Changing one restarts the app automatically; no redeploy is needed.

Check logs, including any email send errors, with:

```sh
heroku logs --tail -a pvs-server
```

## Email sending (Resend)

Email is sent from `noreply@premierevaletparking.com` through Resend's SMTP server. The domain is verified in Resend with DNS records managed at Network Solutions (`resend._domainkey`, `send`, `rsend`). Don't remove those records, or sending will stop.
